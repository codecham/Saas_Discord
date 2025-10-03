import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { UsersService } from '../../users/users.service';
import { OAuthConfigService } from '../config/oauth.config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private isEnabled: boolean;

  constructor(
    private readonly oauthConfig: OAuthConfigService,
    private readonly usersService: UsersService,
  ) {
    const config = oauthConfig.getGoogleConfig();

    super({
      clientID: config.clientId || 'placeholder',
      clientSecret: config.clientSecret || 'placeholder',
      callbackURL:
        config.callbackUrl || 'http://localhost:3000/api/auth/google/callback',
      scope: ['email', 'profile'],
    });

    this.isEnabled = config.enabled;
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    if (!this.isEnabled) {
      return done(new Error('Google OAuth is not enabled'), undefined);
    }

    const email = profile.emails?.[0]?.value;
    const displayName =
      profile.displayName || profile.name?.givenName || 'Unknown';
    const avatar = profile.photos?.[0]?.value;

    if (!email) {
      return done(new Error('No email found in Google profile'), undefined);
    }

    try {
      const user = await this.usersService.findOrCreateOAuthUser(
        email,
        displayName,
        'google',
        profile.id,
        avatar,
      );

      done(null, user);
    } catch (error) {
      done(error, undefined);
    }
  }
}
