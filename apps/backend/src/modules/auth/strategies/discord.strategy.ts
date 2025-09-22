import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-discord';
import { UsersService } from '../../users/users.service';
import { OAuthConfigService } from '../config/oauth.config';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  private isEnabled: boolean;

  constructor(
    private readonly oauthConfig: OAuthConfigService,
    private readonly usersService: UsersService,
  ) {
    const config = oauthConfig.getDiscordConfig();

    super({
      clientID: config.clientId || 'placeholder',
      clientSecret: config.clientSecret || 'placeholder',
      callbackURL:
        config.callbackUrl || 'http://localhost:3000/api/auth/discord/callback',
      scope: ['identify', 'email', 'guilds', 'guilds.members.read'],
    });

    this.isEnabled = config.enabled;
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    if (!this.isEnabled) {
      throw new Error('Discord OAuth is not enabled');
    }

    const email = profile.email;
    const displayName = profile.username || 'Unknown';
    const avatar = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
      : undefined;

    if (!email) {
      throw new Error('No email found in Discord profile');
    }

    const user = await this.usersService.findOrCreateOAuthUser(
      email,
      displayName,
      'discord',
      profile.id,
      avatar,
      accessToken,
      refreshToken,
    );

    return user;
  }
}
