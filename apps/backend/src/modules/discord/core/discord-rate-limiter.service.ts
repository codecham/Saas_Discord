import { Injectable, Logger } from '@nestjs/common';
import { RateLimitBucket } from '../common/interfaces/rate-limit-bucket.interface';

@Injectable()
export class DiscordRateLimiterService {
  private readonly logger = new Logger(DiscordRateLimiterService.name);
  private readonly buckets = new Map<string, RateLimitBucket>();
  private globalRateLimit: RateLimitBucket | null = null;

  /**
   * Attend que le rate limit soit levé avant de faire une requête
   */
  async waitForRateLimit(key: string): Promise<void> {
    // Vérifier le rate limit global
    if (this.globalRateLimit) {
      const waitTime = this.globalRateLimit.resetAt - Date.now();
      if (waitTime > 0) {
        this.logger.warn(`Global rate limit active. Waiting ${waitTime}ms`);
        await this.sleep(waitTime);
        this.globalRateLimit = null;
      }
    }

    // Vérifier le rate limit spécifique
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return;
    }

    // Si le bucket est expiré, le supprimer
    if (bucket.resetAt < Date.now()) {
      this.buckets.delete(key);
      return;
    }

    // Si plus de requêtes disponibles, attendre
    if (bucket.remaining === 0) {
      const waitTime = bucket.resetAt - Date.now();
      if (waitTime > 0) {
        this.logger.warn(
          `Rate limit reached for ${key}. Waiting ${waitTime}ms (${bucket.remaining}/${bucket.limit})`,
        );
        await this.sleep(waitTime);
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Met à jour les informations de rate limiting depuis les headers Discord
   */
  updateBucket(key: string, headers: Record<string, string>): void {
    const limit = this.parseHeader(headers['x-ratelimit-limit']);
    const remaining = this.parseHeader(headers['x-ratelimit-remaining']);
    const reset = this.parseHeader(headers['x-ratelimit-reset']);
    const resetAfter = this.parseHeader(headers['x-ratelimit-reset-after']);
    const bucket = headers['x-ratelimit-bucket'];
    const global = headers['x-ratelimit-global'] === 'true';
    const retryAfter = this.parseHeader(headers['retry-after']);

    // Si c'est un rate limit global
    if (global && retryAfter) {
      this.globalRateLimit = {
        remaining: 0,
        limit: 0,
        resetAt: Date.now() + retryAfter * 1000,
        resetAfter: retryAfter,
        global: true,
      };
      this.logger.warn(`Global rate limit set. Reset in ${retryAfter}s`);
      return;
    }

    // Si on a pas les informations nécessaires, on ne fait rien
    if (limit === null || remaining === null || reset === null) {
      return;
    }

    const rateLimitBucket: RateLimitBucket = {
      limit,
      remaining,
      resetAt: reset * 1000, // Discord envoie en secondes, on convertit en ms
      resetAfter: resetAfter || 0,
      bucket,
    };

    // Utiliser le bucket hash si disponible, sinon la clé fournie
    const bucketKey = bucket || key;
    this.buckets.set(bucketKey, rateLimitBucket);

    // Log uniquement si on commence à approcher de la limite
    if (remaining <= 5) {
      this.logger.debug(
        `Rate limit for ${bucketKey}: ${remaining}/${limit} remaining. Reset in ${resetAfter}s`,
      );
    }
  }

  /**
   * Vérifie si une clé a atteint son rate limit
   */
  isRateLimited(key: string): boolean {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return false;
    }

    if (bucket.resetAt < Date.now()) {
      this.buckets.delete(key);
      return false;
    }

    return bucket.remaining === 0;
  }

  /**
   * Retourne le temps d'attente nécessaire avant la prochaine requête
   */
  getWaitTime(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.remaining > 0) {
      return 0;
    }

    const waitTime = bucket.resetAt - Date.now();
    return waitTime > 0 ? waitTime : 0;
  }

  /**
   * Récupère les informations d'un bucket
   */
  getBucket(key: string): RateLimitBucket | null {
    return this.buckets.get(key) || null;
  }

  /**
   * Nettoie les buckets expirés (à appeler périodiquement)
   */
  cleanupExpiredBuckets(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt < now) {
        this.buckets.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired rate limit buckets`);
    }
  }

  /**
   * Récupère tous les buckets actifs (pour debug)
   */
  getAllBuckets(): Map<string, RateLimitBucket> {
    return new Map(this.buckets);
  }

  /**
   * Réinitialise tous les buckets (pour les tests)
   */
  reset(): void {
    this.buckets.clear();
    this.globalRateLimit = null;
  }

  /**
   * Parse un header en nombre
   */
  private parseHeader(value: string | undefined): number | null {
    if (!value) {
      return null;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Helper pour attendre
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
