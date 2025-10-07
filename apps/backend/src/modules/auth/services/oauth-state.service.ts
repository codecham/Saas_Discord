import {
  Injectable,
  Inject,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import Redis from 'ioredis';
import * as crypto from 'crypto';

/**
 * Service de gestion des states OAuth pour la protection CSRF
 *
 * Le state est un token aléatoire généré avant la redirection vers Discord
 * qui est vérifié au retour pour s'assurer que la requête OAuth est légitime
 */
@Injectable()
export class OAuthStateService {
  private readonly logger = new Logger(OAuthStateService.name);
  private readonly STATE_PREFIX = 'oauth:state:';
  private readonly STATE_TTL = 600; // 10 minutes en secondes

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /**
   * Génère un state CSRF et le stocke dans Redis
   *
   * @returns state token à inclure dans l'URL Discord OAuth
   */
  async generateState(): Promise<string> {
    try {
      // Générer un state cryptographiquement sûr (32 bytes = 64 chars hex)
      const state = crypto.randomBytes(32).toString('hex');

      const key = this.STATE_PREFIX + state;

      // Stocker dans Redis avec expiration (10 minutes)
      await this.redis.set(
        key,
        JSON.stringify({
          createdAt: Date.now(),
          used: false,
        }),
        'EX',
        this.STATE_TTL,
      );

      this.logger.log(
        `OAuth state generated: ${state.substring(0, 8)}... (expires in ${this.STATE_TTL}s)`,
      );
      return state;
    } catch (error) {
      this.logger.error('Failed to generate OAuth state', error);
      throw new Error('Failed to generate authentication state');
    }
  }

  /**
   * Valide un state OAuth et le marque comme utilisé
   *
   * @param state State reçu du callback Discord
   * @returns true si le state est valide
   * @throws UnauthorizedException si le state est invalide/expiré/déjà utilisé
   */
  async validateState(state: string): Promise<boolean> {
    if (!state || state.length !== 64) {
      this.logger.warn('Invalid state format');
      throw new UnauthorizedException('Invalid authentication state');
    }

    try {
      const key = this.STATE_PREFIX + state;

      // Récupérer le state
      const stateDataStr = await this.redis.get(key);

      if (!stateDataStr) {
        this.logger.warn(
          `State not found or expired: ${state.substring(0, 8)}...`,
        );
        throw new UnauthorizedException(
          'Invalid or expired authentication state',
        );
      }

      const stateData = JSON.parse(stateDataStr);

      // Vérifier si déjà utilisé (protection contre replay attacks)
      if (stateData.used) {
        this.logger.warn(`State already used: ${state.substring(0, 8)}...`);
        throw new UnauthorizedException('Authentication state already used');
      }

      // Vérifier l'âge du state (double sécurité avec TTL)
      const age = Date.now() - stateData.createdAt;
      if (age > this.STATE_TTL * 1000) {
        this.logger.warn(
          `State expired (age: ${age}ms): ${state.substring(0, 8)}...`,
        );
        await this.redis.del(key);
        throw new UnauthorizedException('Authentication state expired');
      }

      // Marquer comme utilisé et supprimer immédiatement
      // (on ne peut pas réutiliser un state)
      await this.redis.del(key);

      this.logger.log(
        `State validated successfully: ${state.substring(0, 8)}...`,
      );
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Failed to validate OAuth state', error);
      throw new UnauthorizedException(
        'Failed to validate authentication state',
      );
    }
  }

  /**
   * Supprime manuellement un state (en cas d'annulation)
   */
  async deleteState(state: string): Promise<void> {
    try {
      const key = this.STATE_PREFIX + state;
      await this.redis.del(key);
      this.logger.log(`State deleted: ${state.substring(0, 8)}...`);
    } catch (error) {
      this.logger.error('Failed to delete state', error);
    }
  }

  /**
   * Récupère le nombre de states actifs (monitoring)
   */
  async getActiveStateCount(): Promise<number> {
    try {
      const keys = await this.redis.keys(this.STATE_PREFIX + '*');
      return keys.length;
    } catch (error) {
      this.logger.error('Failed to count active states', error);
      return 0;
    }
  }

  /**
   * Nettoie tous les states expirés (appelé par un CRON si nécessaire)
   */
  async cleanupExpiredStates(): Promise<number> {
    try {
      const keys = await this.redis.keys(this.STATE_PREFIX + '*');
      let deleted = 0;

      for (const key of keys) {
        const stateDataStr = await this.redis.get(key);
        if (!stateDataStr) continue;

        const stateData = JSON.parse(stateDataStr);
        const age = Date.now() - stateData.createdAt;

        if (age > this.STATE_TTL * 1000) {
          await this.redis.del(key);
          deleted++;
        }
      }

      if (deleted > 0) {
        this.logger.log(`Cleaned up ${deleted} expired states`);
      }

      return deleted;
    } catch (error) {
      this.logger.error('Failed to cleanup expired states', error);
      return 0;
    }
  }
}
