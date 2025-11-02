import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Service de nettoyage automatique des données expirées
 *
 * Responsabilités:
 * - Suppression des refresh tokens JWT expirés
 * - Nettoyage des sessions OAuth expirées (Redis)
 * - Nettoyage des state tokens OAuth expirés (Redis)
 *
 * @see docs/security_roadmap.md #10 - Cleanup automatique des tokens
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Nettoie les refresh tokens JWT expirés
   *
   * Exécution: Tous les jours à 2h du matin (UTC)
   * Cible: Table `refresh_tokens` où `expiresAt < now()`
   *
   * @returns Nombre de tokens supprimés
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'cleanup-expired-refresh-tokens',
    timeZone: 'UTC',
  })
  async cleanupExpiredRefreshTokens(): Promise<number> {
    try {
      this.logger.log('Starting cleanup of expired refresh tokens...');

      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `✅ Cleaned up ${result.count} expired refresh token(s)`,
        );
      } else {
        this.logger.debug('No expired refresh tokens to clean');
      }

      return result.count;
    } catch (error) {
      this.logger.error('Error cleaning up expired refresh tokens', error);
      throw error;
    }
  }

  /**
   * Compte le nombre de refresh tokens expirés
   * Utile pour monitoring/stats
   *
   * @returns Nombre de tokens expirés
   */
  async countExpiredRefreshTokens(): Promise<number> {
    return await this.prisma.refreshToken.count({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  /**
   * Nettoie les refresh tokens d'un utilisateur spécifique
   * Utile lors de la suppression d'un compte
   *
   * @param userId ID de l'utilisateur
   * @returns Nombre de tokens supprimés
   */
  async cleanupUserRefreshTokens(userId: string): Promise<number> {
    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });

      this.logger.log(
        `Cleaned up ${result.count} refresh token(s) for user ${userId}`,
      );

      return result.count;
    } catch (error) {
      this.logger.error(
        `Error cleaning up refresh tokens for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Obtient des statistiques sur les refresh tokens
   * Utile pour le monitoring
   *
   * @returns Statistiques
   */
  async getRefreshTokenStats(): Promise<{
    total: number;
    expired: number;
    active: number;
  }> {
    const [total, expired] = await Promise.all([
      this.prisma.refreshToken.count(),
      this.prisma.refreshToken.count({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      }),
    ]);

    return {
      total,
      expired,
      active: total - expired,
    };
  }
}
