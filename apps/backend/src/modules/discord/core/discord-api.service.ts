import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { firstValueFrom, catchError, timeout, throwError, timer } from 'rxjs';
import { retryWhen, mergeMap } from 'rxjs/operators';
import {
  DiscordApiException,
  DiscordRateLimitException,
  DiscordApiTimeoutException,
  DiscordApiNetworkException,
  DiscordApiErrorResponse,
} from '../common/exceptions/discord-api.exception';
import { DiscordRateLimiterService } from './discord-rate-limiter.service';
import {
  DiscordApiRequestOptions,
  DiscordApiResponse,
} from '../common/interfaces/rate-limit-bucket.interface';

@Injectable()
export class DiscordApiService implements OnModuleInit {
  private readonly logger = new Logger(DiscordApiService.name);
  private readonly baseUrl: string;
  private readonly botToken: string;
  private readonly defaultTimeout = 15000; // 15 secondes
  private readonly defaultRetries = 3;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly rateLimiter: DiscordRateLimiterService,
  ) {
    const apiBaseUrl =
      this.configService.getOrThrow<string>('discord.apiBaseUrl');
    const apiVersion =
      this.configService.getOrThrow<string>('discord.apiVersion');
    this.baseUrl = `${apiBaseUrl}/${apiVersion}`;
    this.botToken = this.configService.getOrThrow<string>('discord.botToken');
  }

  onModuleInit() {
    this.logger.log('Discord API Service initialized');
    this.logger.log(`Base URL: ${this.baseUrl}`);

    // Nettoyer les buckets expirés toutes les 5 minutes
    setInterval(
      () => {
        this.rateLimiter.cleanupExpiredBuckets();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Effectue une requête GET vers l'API Discord
   */
  async get<T>(
    endpoint: string,
    options?: DiscordApiRequestOptions,
  ): Promise<T> {
    return this.request<T>('GET', endpoint, options);
  }

  /**
   * Effectue une requête POST vers l'API Discord
   */
  async post<T>(
    endpoint: string,
    data?: any,
    options?: DiscordApiRequestOptions,
  ): Promise<T> {
    return this.request<T>('POST', endpoint, { ...options, data });
  }

  /**
   * Effectue une requête PATCH vers l'API Discord
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    options?: DiscordApiRequestOptions,
  ): Promise<T> {
    return this.request<T>('PATCH', endpoint, { ...options, data });
  }

  /**
   * Effectue une requête PUT vers l'API Discord
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options?: DiscordApiRequestOptions,
  ): Promise<T> {
    return this.request<T>('PUT', endpoint, { ...options, data });
  }

  /**
   * Effectue une requête DELETE vers l'API Discord
   */
  async delete<T>(
    endpoint: string,
    options?: DiscordApiRequestOptions,
  ): Promise<T> {
    return this.request<T>('DELETE', endpoint, options);
  }

  /**
   * Méthode principale pour effectuer une requête vers l'API Discord
   */
  private async request<T>(
    method: string,
    endpoint: string,
    options: DiscordApiRequestOptions = {},
  ): Promise<T> {
    const {
      data,
      headers = {},
      rateLimitKey = endpoint,
      params,
      timeout: requestTimeout = this.defaultTimeout,
      retries = this.defaultRetries,
      useAuth = true,
      customToken,
    } = options;

    const url = `${this.baseUrl}${endpoint}`;

    // Attendre que le rate limit soit levé
    await this.rateLimiter.waitForRateLimit(rateLimitKey);

    // Préparer les headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Ajouter l'authentification
    if (useAuth) {
      if (customToken) {
        // Token utilisateur OAuth2 → utilise "Bearer"
        requestHeaders['Authorization'] = `Bearer ${customToken}`;
      } else {
        // Token bot → utilise "Bot"
        requestHeaders['Authorization'] = `Bot ${this.botToken}`;
      }
    }

    // Configuration de la requête Axios
    const axiosConfig: AxiosRequestConfig = {
      method,
      url,
      headers: requestHeaders,
      params,
      ...(data && { data }),
    };

    this.logger.debug(
      `[${method}] ${endpoint} (Rate limit key: ${rateLimitKey})`,
    );

    // Effectuer la requête avec timeout et retry
    const response = await firstValueFrom(
      this.httpService.request<T>(axiosConfig).pipe(
        timeout(requestTimeout),
        retryWhen((errors) =>
          errors.pipe(
            mergeMap((error: AxiosError, retryCount) => {
              // Ne pas retry sur les erreurs 4xx (sauf 429)
              if (
                error.response?.status &&
                error.response.status >= 400 &&
                error.response.status < 500 &&
                error.response.status !== 429
              ) {
                return throwError(() => error);
              }

              // Arrêter après le nombre max de retries
              if (retryCount >= retries) {
                return throwError(() => error);
              }

              // Délai exponentiel: 1s, 2s, 4s...
              const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
              this.logger.warn(
                `Retry ${retryCount + 1}/${retries} for ${endpoint} in ${delayMs}ms`,
              );

              return timer(delayMs);
            }),
          ),
        ),
        catchError((error: AxiosError) => {
          throw this.handleError(error, endpoint, rateLimitKey);
        }),
      ),
    );

    // Mettre à jour le rate limiter avec les headers de réponse (async)
    if (response.headers) {
      await this.rateLimiter.updateBucket(
        rateLimitKey,
        response.headers as Record<string, string>,
      );
    }

    this.logger.debug(`[${method}] ${endpoint} - Success (${response.status})`);

    return response.data;
  }

  /**
   * Gère les erreurs de l'API Discord
   */
  private handleError(
    error: AxiosError,
    endpoint: string,
    rateLimitKey: string,
  ): Error {
    // Timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      this.logger.error(`Timeout on ${endpoint}`);
      return new DiscordApiTimeoutException(endpoint);
    }

    // Erreur réseau (pas de réponse)
    if (!error.response) {
      this.logger.error(`Network error on ${endpoint}: ${error.message}`);
      return new DiscordApiNetworkException(error.message, error);
    }

    const { status, data, headers } = error.response;

    // Rate limit (429)
    if (status === 429) {
      const retryAfter = parseFloat(headers['retry-after'] || '1') * 1000;
      const global = headers['x-ratelimit-global'] === 'true';

      this.logger.warn(
        `Rate limited on ${endpoint}. Retry after ${retryAfter}ms (Global: ${global})`,
      );

      // Mettre à jour le rate limiter (fire and forget car on est dans un error handler)
      void this.rateLimiter.updateBucket(
        rateLimitKey,
        headers as Record<string, string>,
      );

      return new DiscordRateLimitException(retryAfter, global);
    }

    // Erreurs Discord (avec code d'erreur)
    if (data && typeof data === 'object' && 'code' in data) {
      const discordError = data as DiscordApiErrorResponse;
      this.logger.error(
        `Discord API error on ${endpoint}: [${discordError.code}] ${discordError.message}`,
      );
      return DiscordApiException.fromDiscordError(discordError, status);
    }

    // Autres erreurs HTTP
    this.logger.error(
      `HTTP ${status} error on ${endpoint}: ${JSON.stringify(data)}`,
    );
    return new DiscordApiException(
      0,
      `HTTP ${status}: ${JSON.stringify(data)}`,
      undefined,
      status,
    );
  }

  /**
   * Effectue une requête avec les métadonnées de rate limiting
   */
  async requestWithMetadata<T>(
    method: string,
    endpoint: string,
    options?: DiscordApiRequestOptions,
  ): Promise<DiscordApiResponse<T>> {
    const rateLimitKey = options?.rateLimitKey || endpoint;

    await this.rateLimiter.waitForRateLimit(rateLimitKey);

    const url = `${this.baseUrl}${endpoint}`;
    const {
      data,
      headers = {},
      params,
      timeout: requestTimeout = this.defaultTimeout,
      useAuth = true,
      customToken,
    } = options || {};

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (useAuth) {
      if (customToken) {
        // Token utilisateur OAuth2 → utilise "Bearer"
        requestHeaders['Authorization'] = `Bearer ${customToken}`;
      } else {
        // Token bot → utilise "Bot"
        requestHeaders['Authorization'] = `Bot ${this.botToken}`;
      }
    }

    const axiosConfig: AxiosRequestConfig = {
      method,
      url,
      headers: requestHeaders,
      params,
      ...(data && { data }),
    };

    this.logger.debug(
      `[${method}] ${endpoint} (Rate limit key: ${rateLimitKey})`,
    );

    const response = await firstValueFrom(
      this.httpService.request<T>(axiosConfig).pipe(
        timeout(requestTimeout),
        catchError((error: AxiosError) => {
          return throwError(() =>
            this.handleError(error, endpoint, rateLimitKey),
          );
        }),
      ),
    );

    // Mettre à jour le rate limiter (async)
    if (response.headers) {
      await this.rateLimiter.updateBucket(
        rateLimitKey,
        response.headers as Record<string, string>,
      );
    }

    return {
      data: response.data,
      rateLimit: (await this.rateLimiter.getBucket(rateLimitKey)) || undefined,
      headers: response.headers as Record<string, string>,
      status: response.status,
    };
  }

  /**
   * Vérifie si un endpoint est actuellement rate limité
   */
  async isRateLimited(endpoint: string): Promise<boolean> {
    return this.rateLimiter.isRateLimited(endpoint);
  }

  /**
   * Retourne le temps d'attente avant de pouvoir faire une requête
   */
  async getWaitTime(endpoint: string): Promise<number> {
    return this.rateLimiter.getWaitTime(endpoint);
  }

  /**
   * Récupère les informations de rate limiting pour un endpoint
   */
  async getRateLimitInfo(endpoint: string) {
    return this.rateLimiter.getBucket(endpoint);
  }
}
