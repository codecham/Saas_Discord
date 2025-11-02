import {
  Injectable,
  Inject,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { OAuthStateService } from './oauth-state.service'; // 👈 NOUVEAU

/**
 * Interface pour les données de session OAuth
 */
interface OAuthSessionData {
  accessToken: string;
  refreshToken: string;
  userId: string;
  createdAt: number;
}

/**
 * Service de gestion des sessions OAuth temporaires
 *
 * Responsabilité:
 * - Créer des sessions temporaires (5 min) pour le flow OAuth
 * - Stocker les tokens de manière sécurisée dans Redis
 * - Échanger sessionId contre tokens (une seule fois)
 * - Nettoyer automatiquement les sessions expirées
 */
@Injectable()
export class OAuthSessionService {
  private readonly logger = new Logger(OAuthSessionService.name);
  private readonly SESSION_PREFIX = 'oauth:session:';
  private readonly SESSION_TTL = 300; // 5 minutes en secondes

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly oauthState: OAuthStateService, // 👈 NOUVEAU
  ) {}

  /**
   * 🔒 NOUVEAU: Valide un state CSRF OAuth
   * Délègue à OAuthStateService
   */
  async validateState(state: string): Promise<boolean> {
    return this.oauthState.validateState(state);
  }

  /**
   * Crée une session temporaire et retourne un sessionId unique
   *
   * @param accessToken JWT access token de notre app
   * @param refreshToken JWT refresh token de notre app
   * @param userId ID de l'utilisateur
   * @returns sessionId à utiliser dans la redirection
   */
  async createSession(
    accessToken: string,
    refreshToken: string,
    userId: string,
  ): Promise<string> {
    try {
      // Générer un sessionId cryptographiquement sûr
      const sessionId = crypto.randomBytes(32).toString('hex');

      const sessionData: OAuthSessionData = {
        accessToken,
        refreshToken,
        userId,
        createdAt: Date.now(),
      };

      const key = this.SESSION_PREFIX + sessionId;

      // Stocker dans Redis avec expiration automatique
      await this.redis.set(
        key,
        JSON.stringify(sessionData),
        'EX',
        this.SESSION_TTL,
      );

      this.logger.log(
        `OAuth session created: ${sessionId} (expires in ${this.SESSION_TTL}s)`,
      );

      return sessionId;
    } catch (error) {
      this.logger.error('Failed to create OAuth session', error);
      throw new Error('Failed to create authentication session');
    }
  }

  /**
   * Échange un sessionId contre les tokens (une seule fois)
   * La session est détruite après récupération pour éviter la réutilisation
   *
   * @param sessionId Session ID à échanger
   * @returns Tokens si la session existe et est valide
   * @throws UnauthorizedException si session invalide/expirée
   */
  async exchangeSession(sessionId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    userId: string;
  }> {
    try {
      const key = this.SESSION_PREFIX + sessionId;

      // Récupérer et supprimer atomiquement (GETDEL disponible Redis 6.2+)
      const sessionDataStr = await this.redis.getdel(key);

      if (!sessionDataStr) {
        this.logger.warn(`Invalid or expired session: ${sessionId}`);
        throw new UnauthorizedException(
          'Invalid or expired authentication session',
        );
      }

      const sessionData: OAuthSessionData = JSON.parse(sessionDataStr);

      // Vérifier l'âge de la session (double sécurité avec TTL)
      const age = Date.now() - sessionData.createdAt;
      if (age > this.SESSION_TTL * 1000) {
        this.logger.warn(`Session expired (age: ${age}ms): ${sessionId}`);
        throw new UnauthorizedException('Authentication session expired');
      }

      this.logger.log(`Session exchanged successfully: ${sessionId}`);

      return {
        accessToken: sessionData.accessToken,
        refreshToken: sessionData.refreshToken,
        userId: sessionData.userId,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Failed to exchange OAuth session', error);
      throw new UnauthorizedException(
        'Failed to exchange authentication session',
      );
    }
  }

  /**
   * Vérifie si une session existe et est valide (sans la consommer)
   * Utile pour le debugging
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    try {
      const key = this.SESSION_PREFIX + sessionId;
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error('Failed to check session existence', error);
      return false;
    }
  }

  /**
   * Supprime manuellement une session (si besoin d'annuler)
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const key = this.SESSION_PREFIX + sessionId;
      await this.redis.del(key);
      this.logger.log(`Session deleted: ${sessionId}`);
    } catch (error) {
      this.logger.error('Failed to delete session', error);
    }
  }

  /**
   * Récupère le nombre de sessions actives (monitoring)
   */
  async getActiveSessionCount(): Promise<number> {
    try {
      const keys = await this.redis.keys(this.SESSION_PREFIX + '*');
      return keys.length;
    } catch (error) {
      this.logger.error('Failed to count active sessions', error);
      return 0;
    }
  }

  /**
   * Vérifie la santé du service Redis
   */
  async healthCheck(): Promise<{
    connected: boolean;
    activeSessions: number;
  }> {
    try {
      await this.redis.ping();
      const activeSessions = await this.getActiveSessionCount();

      return {
        connected: true,
        activeSessions,
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return {
        connected: false,
        activeSessions: 0,
      };
    }
  }
}
