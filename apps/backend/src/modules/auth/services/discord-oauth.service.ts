import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { EncryptionService } from './encryption.service';
import { OAuthStateService } from './oauth-state.service'; // 👈 NOUVEAU

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
    private readonly oauthState: OAuthStateService, // 👈 NOUVEAU
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
   * 🔒 MODIFIÉ: Génère l'URL de connexion Discord avec state CSRF
   */
  async getAuthorizationUrl(): Promise<string> {
    // Générer un state pour la protection CSRF
    const state = await this.oauthState.generateState();

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      scope: this.scopes,
      state, // 👈 NOUVEAU: Ajouter le state
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
        const errorData = await response.text();
        this.logger.error(`Discord token exchange failed: ${errorData}`);
        throw new UnauthorizedException('Failed to exchange Discord code');
      }

      const tokens: DiscordTokenResponse = await response.json();
      return tokens;
    } catch (error) {
      this.logger.error('Error exchanging Discord code', error);
      throw new UnauthorizedException('Failed to authenticate with Discord');
    }
  }

  /**
   * Récupère les infos utilisateur Discord
   */
  async getDiscordUser(accessToken: string): Promise<DiscordUser> {
    try {
      const response = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`Failed to fetch Discord user: ${errorData}`);
        throw new UnauthorizedException('Failed to fetch Discord user info');
      }

      const user: DiscordUser = await response.json();
      return user;
    } catch (error) {
      this.logger.error('Error fetching Discord user', error);
      throw new UnauthorizedException('Failed to fetch Discord user info');
    }
  }

  /**
   * Crée ou met à jour l'utilisateur en base de données
   */
  async upsertUser(discordUser: DiscordUser, tokens: DiscordTokenResponse) {
    try {
      // Chiffrer les tokens Discord
      const encryptedAccessToken = this.encryption.encrypt(tokens.access_token);
      const encryptedRefreshToken = this.encryption.encrypt(
        tokens.refresh_token,
      );

      // Calculer la date d'expiration
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      // Créer ou mettre à jour l'utilisateur
      const user = await this.prisma.user.upsert({
        where: { discordId: discordUser.id },
        update: {
          username: discordUser.username,
          discriminator: discordUser.discriminator,
          globalName: discordUser.global_name,
          avatar: discordUser.avatar,
          email: discordUser.email,
          lastLoginAt: new Date(),
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: expiresAt,
          tokenScope: tokens.scope,
        },
        create: {
          discordId: discordUser.id,
          username: discordUser.username,
          discriminator: discordUser.discriminator,
          globalName: discordUser.global_name,
          avatar: discordUser.avatar,
          email: discordUser.email,
          role: 'USER',
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: expiresAt,
          tokenScope: tokens.scope,
        },
      });

      this.logger.log(`User upserted: ${user.username} (${user.id})`);
      return user;
    } catch (error) {
      this.logger.error('Error upserting user', error);
      throw new Error('Failed to save user data');
    }
  }
  /**
   * 🔒 NOUVEAU: Refresh le token Discord d'un utilisateur
   * Utilisé par DiscordTokenService quand le token est expiré
   */
  async refreshDiscordToken(userId: string): Promise<string> {
    try {
      // Récupérer le refresh token de l'utilisateur
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { refreshToken: true, discordId: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Déchiffrer le refresh token
      const decryptedRefreshToken = this.encryption.decrypt(user.refreshToken);

      // Échanger le refresh token contre un nouveau access token
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
        const errorData = await response.text();
        this.logger.error(`Discord token refresh failed: ${errorData}`);
        throw new UnauthorizedException('Failed to refresh Discord token');
      }

      const tokens: DiscordTokenResponse = await response.json();

      // Chiffrer les nouveaux tokens
      const encryptedAccessToken = this.encryption.encrypt(tokens.access_token);
      const encryptedRefreshToken = this.encryption.encrypt(
        tokens.refresh_token,
      );

      // Calculer la nouvelle date d'expiration
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      // Mettre à jour en base de données
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: expiresAt,
          tokenScope: tokens.scope,
        },
      });

      this.logger.log(`Discord token refreshed for user ${user.discordId}`);

      return tokens.access_token;
    } catch (error) {
      this.logger.error('Error refreshing Discord token', error);
      throw new UnauthorizedException('Failed to refresh Discord token');
    }
  }
}
