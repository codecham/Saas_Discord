/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { EncryptionService } from './encryption.service';

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
  email?: string | null;
  verified?: boolean;
}

/**
 * Service pour gérer l'OAuth Discord
 */
@Injectable()
export class DiscordOAuthService {
  private readonly logger = new Logger(DiscordOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;
  private readonly scopes: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {
    this.clientId = this.configService.getOrThrow<string>('DISCORD_CLIENT_ID');
    this.clientSecret = this.configService.getOrThrow<string>(
      'DISCORD_CLIENT_SECRET',
    );
    this.callbackUrl = this.configService.getOrThrow<string>(
      'DISCORD_CALLBACK_URL',
    );
    this.scopes =
      this.configService.get<string>('DISCORD_OAUTH_SCOPES') ||
      'identify guilds';
  }

  /**
   * Génère l'URL de connexion Discord
   */
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      scope: this.scopes,
    });

    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Échange le code OAuth contre des tokens
   */
  async exchangeCode(code: string): Promise<DiscordTokenResponse> {
    try {
      const response = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.callbackUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Failed to exchange code: ${error}`);
        throw new UnauthorizedException('Failed to exchange Discord code');
      }

      return response.json();
    } catch (error) {
      this.logger.error('Error exchanging Discord code', error);
      throw new UnauthorizedException('Discord authentication failed');
    }
  }

  /**
   * Récupère les informations de l'utilisateur Discord
   */
  async getDiscordUser(accessToken: string): Promise<DiscordUser> {
    try {
      const response = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new UnauthorizedException('Failed to fetch Discord user');
      }

      return response.json();
    } catch (error) {
      this.logger.error('Error fetching Discord user', error);
      throw new UnauthorizedException('Failed to get Discord user info');
    }
  }

  /**
   * Crée ou met à jour un utilisateur dans la DB
   */
  async upsertUser(
    discordUser: DiscordUser,
    tokens: DiscordTokenResponse,
  ): Promise<any> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Chiffrer les tokens
    const encryptedAccessToken = this.encryption.encrypt(tokens.access_token);
    const encryptedRefreshToken = this.encryption.encrypt(tokens.refresh_token);

    const user = await this.prisma.user.upsert({
      where: {
        discordId: discordUser.id,
      },
      update: {
        username: discordUser.username,
        discriminator: discordUser.discriminator || null,
        globalName: discordUser.global_name,
        avatar: discordUser.avatar,
        email: discordUser.email || null,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: expiresAt,
        tokenScope: tokens.scope,
        lastLoginAt: new Date(),
      },
      create: {
        discordId: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator || null,
        globalName: discordUser.global_name,
        avatar: discordUser.avatar,
        email: discordUser.email || null,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: expiresAt,
        tokenScope: tokens.scope,
        role: 'USER',
      },
    });

    this.logger.log(`User ${user.username} (${user.discordId}) authenticated`);

    return user;
  }

  /**
   * Refresh le token Discord d'un utilisateur
   */
  async refreshDiscordToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { refreshToken: true, discordId: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    try {
      // Déchiffrer le refresh token
      const decryptedRefreshToken = this.encryption.decrypt(user.refreshToken);

      // Échanger le refresh token
      const response = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: decryptedRefreshToken,
        }),
      });

      if (!response.ok) {
        throw new UnauthorizedException('Failed to refresh Discord token');
      }

      const tokens: DiscordTokenResponse = await response.json();
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      // Chiffrer les nouveaux tokens
      const encryptedAccessToken = this.encryption.encrypt(tokens.access_token);
      const encryptedRefreshToken = this.encryption.encrypt(
        tokens.refresh_token,
      );

      // Mettre à jour en DB
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: expiresAt,
        },
      });

      this.logger.log(`Refreshed Discord token for user ${user.discordId}`);

      return tokens.access_token;
    } catch (error) {
      this.logger.error('Error refreshing Discord token', error);
      throw new UnauthorizedException('Failed to refresh Discord token');
    }
  }
}
