/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BotEventDto } from '@my-project/shared-types';
import type Redis from 'ioredis';

/**
 * Interface pour une session vocale active
 */
interface VoiceSession {
  channelId: string;
  joinedAt: number; // Timestamp en millisecondes
}

/**
 * 🎤 Processor pour les événements vocaux
 *
 * Responsabilités :
 * - Écouter les events VOICE_STATE_UPDATE
 * - Tracker les sessions vocales (join/leave)
 * - Calculer la durée des sessions
 * - Mettre à jour member_stats (totalVoiceMinutes)
 *
 * Fonctionnement :
 * 1. User rejoint vocal → Stocker session dans Redis
 * 2. User quitte vocal → Calculer durée + Update DB + Supprimer de Redis
 * 3. TTL Redis 24h pour auto-cleanup des sessions orphelines
 */
@Injectable()
export class VoiceEventsProcessor {
  private readonly logger = new Logger(VoiceEventsProcessor.name);
  private readonly VOICE_SESSION_PREFIX = 'voice_session';
  private readonly SESSION_TTL = 24 * 60 * 60; // 24h en secondes

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  /**
   * Traite un event VOICE_STATE_UPDATE
   *
   * @param event - Event Discord de type VOICE_STATE_UPDATE
   */
  async processVoiceStateUpdate(event: BotEventDto): Promise<void> {
    try {
      const { guildId, userId, channelId, timestamp } = event;

      if (!userId) {
        this.logger.warn('VOICE_STATE_UPDATE sans userId ignoré');
        return;
      }

      const sessionKey = this.getSessionKey(guildId, userId);

      // Récupérer la session active (si elle existe)
      const activeSession = await this.getActiveSession(sessionKey);

      // CASE 1 : User rejoint un vocal (channelId présent)
      if (channelId) {
        await this.handleVoiceJoin(
          sessionKey,
          guildId,
          userId,
          channelId,
          timestamp,
          activeSession,
        );
      }
      // CASE 2 : User quitte le vocal (channelId null)
      else {
        await this.handleVoiceLeave(
          sessionKey,
          guildId,
          userId,
          timestamp,
          activeSession,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Erreur traitement VOICE_STATE_UPDATE: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Gère l'événement "user rejoint un vocal"
   */
  private async handleVoiceJoin(
    sessionKey: string,
    guildId: string,
    userId: string,
    channelId: string,
    timestamp: number,
    activeSession: VoiceSession | null,
  ): Promise<void> {
    // Si une session existe déjà, l'user change juste de channel
    if (activeSession) {
      this.logger.debug(
        `User ${userId} change de channel vocal dans guild ${guildId}`,
      );

      // Calculer la durée de l'ancienne session
      const durationMinutes = Math.floor(
        (timestamp - activeSession.joinedAt) / (60 * 1000),
      );

      // Si durée > 0, mettre à jour les stats
      if (durationMinutes > 0) {
        await this.updateVoiceMinutes(
          guildId,
          userId,
          durationMinutes,
          new Date(timestamp),
        );
      }
    } else {
      this.logger.debug(`User ${userId} rejoint vocal dans guild ${guildId}`);
    }

    // Créer/Mettre à jour la session
    const newSession: VoiceSession = {
      channelId,
      joinedAt: timestamp,
    };

    await this.setActiveSession(sessionKey, newSession);
  }

  /**
   * Gère l'événement "user quitte le vocal"
   */
  private async handleVoiceLeave(
    sessionKey: string,
    guildId: string,
    userId: string,
    timestamp: number,
    activeSession: VoiceSession | null,
  ): Promise<void> {
    if (!activeSession) {
      this.logger.warn(
        `User ${userId} quitte vocal sans session active (probablement déconnecté avant le démarrage du bot)`,
      );
      return;
    }

    this.logger.debug(`User ${userId} quitte vocal dans guild ${guildId}`);

    // Calculer la durée de la session
    const durationMinutes = Math.floor(
      (timestamp - activeSession.joinedAt) / (60 * 1000),
    );

    // Mettre à jour les stats si durée > 0
    if (durationMinutes > 0) {
      await this.updateVoiceMinutes(
        guildId,
        userId,
        durationMinutes,
        new Date(timestamp),
      );
      this.logger.debug(
        `✅ Session vocale de ${durationMinutes} min pour user ${userId}`,
      );
    }

    // Supprimer la session de Redis
    await this.deleteActiveSession(sessionKey);
  }

  /**
   * Met à jour le compteur de minutes vocales dans member_stats
   */
  private async updateVoiceMinutes(
    guildId: string,
    userId: string,
    minutes: number,
    lastVoiceAt: Date,
  ): Promise<void> {
    await this.prisma.memberStats.upsert({
      where: {
        idx_member_stats_unique: {
          guildId,
          userId,
        },
      },
      update: {
        totalVoiceMinutes: {
          increment: minutes,
        },
        lastVoiceAt,
        lastSeen: lastVoiceAt,
        updatedAt: lastVoiceAt,
      },
      create: {
        guildId,
        userId,
        totalMessages: 0,
        totalVoiceMinutes: minutes,
        totalReactionsGiven: 0,
        totalReactionsReceived: 0,
        lastVoiceAt,
        lastSeen: lastVoiceAt,
      },
    });

    this.logger.debug(
      `✅ ${minutes} minutes vocales ajoutées pour user ${userId}`,
    );
  }

  /**
   * Génère la clé Redis pour une session
   */
  private getSessionKey(guildId: string, userId: string): string {
    return `${this.VOICE_SESSION_PREFIX}:${guildId}:${userId}`;
  }

  /**
   * Récupère une session active depuis Redis
   */
  private async getActiveSession(key: string): Promise<VoiceSession | null> {
    const data = await this.redis.get(key);
    if (!data) return null;

    try {
      return JSON.parse(data) as VoiceSession;
    } catch {
      return null;
    }
  }

  /**
   * Stocke une session active dans Redis
   */
  private async setActiveSession(
    key: string,
    session: VoiceSession,
  ): Promise<void> {
    // Utilisation directe de ioredis avec EX pour TTL
    await this.redis.set(key, JSON.stringify(session), 'EX', this.SESSION_TTL);
  }

  /**
   * Supprime une session active de Redis
   */
  private async deleteActiveSession(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * 🧹 Méthode de nettoyage pour les sessions orphelines
   *
   * À appeler périodiquement pour nettoyer les sessions dont l'user
   * s'est déconnecté pendant que le bot était offline.
   */
  async cleanupOrphanedSessions(guildId: string): Promise<number> {
    this.logger.log(`🧹 Nettoyage sessions orphelines pour guild ${guildId}`);

    const pattern = `${this.VOICE_SESSION_PREFIX}:${guildId}:*`;
    const keys = await this.redis.keys(pattern);

    let cleaned = 0;
    const now = Date.now();

    for (const key of keys) {
      const session = await this.getActiveSession(key);
      if (!session) continue;

      // Si la session a plus de 24h, la supprimer
      const sessionAge = now - session.joinedAt;
      if (sessionAge > 24 * 60 * 60 * 1000) {
        await this.deleteActiveSession(key);
        cleaned++;
      }
    }

    this.logger.log(`✅ ${cleaned} sessions orphelines nettoyées`);
    return cleaned;
  }
}
