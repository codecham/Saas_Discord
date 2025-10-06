// discord-rate-limiter.service.ts
import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RateLimitBucket } from '../common/interfaces/rate-limit-bucket.interface';

@Injectable()
export class DiscordRateLimiterService {
  private readonly logger = new Logger(DiscordRateLimiterService.name);
  private readonly buckets = new Map<string, RateLimitBucket>();
  private globalRateLimit: RateLimitBucket | null = null;

  // Configuration
  private readonly USE_CACHE = true; // Active le cache Redis/mémoire
  private readonly CACHE_PREFIX = 'ratelimit:';
  private readonly GLOBAL_CACHE_KEY = 'ratelimit:global';

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Attend que le rate limit soit levé avant de faire une requête
   */
  async waitForRateLimit(key: string): Promise<void> {
    // Vérifier le rate limit global (d'abord en cache si activé)
    if (this.USE_CACHE) {
      const cachedGlobal = await this.cacheManager.get<RateLimitBucket>(
        this.GLOBAL_CACHE_KEY,
      );
      if (cachedGlobal) {
        this.globalRateLimit = cachedGlobal;
      }
    }

    if (this.globalRateLimit) {
      const waitTime = this.globalRateLimit.resetAt - Date.now();
      if (waitTime > 0) {
        this.logger.warn(`Global rate limit active. Waiting ${waitTime}ms`);
        await this.sleep(waitTime);
        this.globalRateLimit = null;
        if (this.USE_CACHE) {
          await this.cacheManager.del(this.GLOBAL_CACHE_KEY);
        }
      }
    }

    // Vérifier le rate limit spécifique
    let bucket = this.buckets.get(key);

    // Si pas en mémoire locale, vérifier le cache
    if (!bucket && this.USE_CACHE) {
      bucket = await this.cacheManager.get<RateLimitBucket>(
        this.CACHE_PREFIX + key,
      );
      if (bucket) {
        this.buckets.set(key, bucket);
      }
    }

    if (!bucket) {
      return;
    }

    // Si le bucket est expiré, le supprimer
    if (bucket.resetAt < Date.now()) {
      this.buckets.delete(key);
      if (this.USE_CACHE) {
        await this.cacheManager.del(this.CACHE_PREFIX + key);
      }
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
        if (this.USE_CACHE) {
          await this.cacheManager.del(this.CACHE_PREFIX + key);
        }
      }
    }
  }

  /**
   * Met à jour les informations de rate limiting depuis les headers Discord
   */
  async updateBucket(
    key: string,
    headers: Record<string, string>,
  ): Promise<void> {
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

      // Sauvegarder en cache
      if (this.USE_CACHE) {
        const ttl = retryAfter * 1000;
        await this.cacheManager.set(
          this.GLOBAL_CACHE_KEY,
          this.globalRateLimit,
          ttl,
        );
      }

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

    // Sauvegarder en cache avec TTL approprié
    if (this.USE_CACHE) {
      const ttl = rateLimitBucket.resetAt - Date.now();
      if (ttl > 0) {
        await this.cacheManager.set(
          this.CACHE_PREFIX + bucketKey,
          rateLimitBucket,
          ttl,
        );
      }
    }

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
  async isRateLimited(key: string): Promise<boolean> {
    let bucket = this.buckets.get(key);

    // Vérifier le cache si pas en mémoire locale
    if (!bucket && this.USE_CACHE) {
      bucket = await this.cacheManager.get<RateLimitBucket>(
        this.CACHE_PREFIX + key,
      );
      if (bucket) {
        this.buckets.set(key, bucket);
      }
    }

    if (!bucket) {
      return false;
    }

    if (bucket.resetAt < Date.now()) {
      this.buckets.delete(key);
      if (this.USE_CACHE) {
        await this.cacheManager.del(this.CACHE_PREFIX + key);
      }
      return false;
    }

    return bucket.remaining === 0;
  }

  /**
   * Retourne le temps d'attente nécessaire avant la prochaine requête
   */
  async getWaitTime(key: string): Promise<number> {
    let bucket = this.buckets.get(key);

    // Vérifier le cache si pas en mémoire locale
    if (!bucket && this.USE_CACHE) {
      bucket = await this.cacheManager.get<RateLimitBucket>(
        this.CACHE_PREFIX + key,
      );
    }

    if (!bucket || bucket.remaining > 0) {
      return 0;
    }

    const waitTime = bucket.resetAt - Date.now();
    return waitTime > 0 ? waitTime : 0;
  }

  /**
   * Récupère les informations d'un bucket
   */
  async getBucket(key: string): Promise<RateLimitBucket | null> {
    let bucket = this.buckets.get(key);

    // Vérifier le cache si pas en mémoire locale
    if (!bucket && this.USE_CACHE) {
      bucket = await this.cacheManager.get<RateLimitBucket>(
        this.CACHE_PREFIX + key,
      );
      if (bucket) {
        this.buckets.set(key, bucket);
      }
    }

    return bucket || null;
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

    // Note: Le cache Redis/mémoire expire automatiquement grâce au TTL
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
  async reset(): Promise<void> {
    this.buckets.clear();
    this.globalRateLimit = null;

    // Nettoyer le cache si activé
    if (this.USE_CACHE) {
      // Note: cache-manager n'a pas de méthode "clear by pattern"
      // On supprime juste le global, les autres expireront naturellement
      await this.cacheManager.del(this.GLOBAL_CACHE_KEY);
    }
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
