/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { EncryptionService } from './encryption.service';
import { DiscordOAuthService } from './discord-oauth.service';

interface CachedToken {
  token: string;
  expiresAt: number;
}

/**
 * Service pour récupérer et gérer les tokens Discord des utilisateurs
 * Gère le cache et le refresh automatique
 */
@Injectable()
export class DiscordTokenService {
  private readonly logger = new Logger(DiscordTokenService.name);
  private readonly tokenCache = new Map<string, CachedToken>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly discordOAuth: DiscordOAuthService,
  ) {}

  /**
   * Récupère le token Discord d'un utilisateur
   * Gère automatiquement le cache et le refresh si expiré
   */
  async getDiscordAccessToken(userId: string): Promise<string> {
    // 1. Vérifier le cache
    const cached = this.tokenCache.get(userId);
    if (cached && this.isTokenValid(cached.expiresAt)) {
      this.logger.debug(`Token cache hit for user ${userId}`);
      return cached.token;
    }

    // 2. Récupérer depuis la DB
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true,
        discordId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 3. Vérifier si le token est expiré
    if (!this.isTokenValid(user.tokenExpiresAt.getTime())) {
      this.logger.log(
        `Token expired for user ${user.discordId}, refreshing...`,
      );
      return await this.discordOAuth.refreshDiscordToken(userId);
    }

    // 4. Déchiffrer le token
    const decryptedToken = this.encryption.decrypt(user.accessToken);

    // 5. Mettre en cache
    this.cacheToken(userId, decryptedToken, user.tokenExpiresAt.getTime());

    return decryptedToken;
  }

  /**
   * Vérifie si un token est encore valide
   * Ajoute une marge de 5 minutes pour éviter les expirations pendant l'utilisation
   */
  private isTokenValid(expiresAt: number): boolean {
    const marginMs = 5 * 60 * 1000; // 5 minutes
    return Date.now() < expiresAt - marginMs;
  }

  /**
   * Met un token en cache
   */
  private cacheToken(userId: string, token: string, expiresAt: number): void {
    this.tokenCache.set(userId, {
      token,
      expiresAt,
    });

    this.logger.debug(`Token cached for user ${userId}`);
  }

  /**
   * Invalide le cache d'un utilisateur
   * Utile après un refresh ou une déconnexion
   */
  invalidateCache(userId: string): void {
    this.tokenCache.delete(userId);
    this.logger.debug(`Token cache invalidated for user ${userId}`);
  }

  /**
   * Nettoie les tokens expirés du cache
   * À appeler périodiquement (via un cron ou interval)
   */
  cleanExpiredCache(): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const now = Date.now();
    let cleaned = 0;

    for (const [userId, cached] of this.tokenCache.entries()) {
      if (!this.isTokenValid(cached.expiresAt)) {
        this.tokenCache.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired tokens from cache`);
    }
  }

  /**
   * Récupère les informations d'un utilisateur avec son token
   */
  async getUserWithToken(userId: string): Promise<{
    token: string;
    expiresAt: Date;
    scopes: string[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        accessToken: true,
        tokenExpiresAt: true,
        tokenScope: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Vérifier si expiré et refresh si nécessaire
    if (!this.isTokenValid(user.tokenExpiresAt.getTime())) {
      const newToken = await this.discordOAuth.refreshDiscordToken(userId);

      // Récupérer les nouvelles infos
      const updatedUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          tokenExpiresAt: true,
          tokenScope: true,
        },
      });

      return {
        token: newToken,
        expiresAt: updatedUser!.tokenExpiresAt,
        scopes: updatedUser!.tokenScope.split(' '),
      };
    }

    return {
      token: this.encryption.decrypt(user.accessToken),
      expiresAt: user.tokenExpiresAt,
      scopes: user.tokenScope.split(' '),
    };
  }

  /**
   * Vérifie si un utilisateur a un scope spécifique
   */
  async hasScope(userId: string, scope: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tokenScope: true },
    });

    if (!user) {
      return false;
    }

    const scopes = user.tokenScope.split(' ');
    return scopes.includes(scope);
  }
}
