/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BotEventDto } from '@my-project/shared-types';
import type Redis from 'ioredis';

interface VoiceSession {
  channelId: string;
  joinedAt: number;
}

@Injectable()
export class VoiceEventsProcessor {
  private readonly logger = new Logger(VoiceEventsProcessor.name);
  private readonly VOICE_SESSION_PREFIX = 'voice_session';
  private readonly SESSION_TTL = 24 * 60 * 60; // 24h

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async processVoiceStateUpdate(event: BotEventDto): Promise<void> {
    const { guildId, userId, channelId, timestamp } = event;
    const action = event?.data.action;

    if (!userId) {
      this.logger.warn('VOICE_STATE_UPDATE sans userId ignoré');
      return;
    }

    if (!action) {
      this.logger.warn(`VOICE_STATE_UPDATE without action ignored`);
      return;
    }

    const sessionKey = this.getSessionKey(guildId, userId);
    const activeSession = await this.getActiveSession(sessionKey);

    if (channelId && action == 'join') {
      // User rejoint vocal
      await this.handleVoiceJoin(sessionKey, channelId, timestamp);
    } else if (activeSession && action == 'leave') {
      // User quitte vocal
      await this.handleVoiceLeave(
        sessionKey,
        guildId,
        userId,
        activeSession,
        timestamp,
      );
    } else {
      this.logger.warn(
        `VOICE_STATE_UPDATE not update cause not: ChannelID && action join OR activeSeesion && session`,
      );
    }
  }

  private async handleVoiceJoin(
    sessionKey: string,
    channelId: string,
    timestamp: number,
  ): Promise<void> {
    const session: VoiceSession = {
      channelId,
      joinedAt: timestamp,
    };

    await this.redis.setex(
      sessionKey,
      this.SESSION_TTL,
      JSON.stringify(session),
    );

    this.logger.debug(`📥 Session vocale créée: ${sessionKey}`);
  }

  private async handleVoiceLeave(
    sessionKey: string,
    guildId: string,
    userId: string,
    session: VoiceSession,
    timestamp: number,
  ): Promise<void> {
    // Calculer durée
    const durationMs = timestamp - session.joinedAt;
    const durationMinutes = Math.floor(durationMs / 60000);

    if (durationMinutes > 0) {
      const now = new Date(timestamp);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      try {
        await Promise.all([
          // 1. Update MemberStats
          this.updateMemberStats(guildId, userId, durationMinutes, now),

          // 2. Update StatsDaily
          this.updateStatsDaily(
            guildId,
            userId,
            session.channelId,
            today,
            durationMinutes,
          ),
        ]);

        this.logger.debug(
          `✅ ${durationMinutes} minutes vocales comptabilisées pour ${userId}`,
        );
      } catch (error) {
        this.logger.error(
          `❌ Erreur mise à jour vocal: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }

    // Supprimer session
    await this.redis.del(sessionKey);
  }

  private async updateMemberStats(
    guildId: string,
    userId: string,
    minutes: number,
    timestamp: Date,
  ): Promise<void> {
    await this.prisma.memberStats.upsert({
      where: {
        idx_member_stats_unique: { guildId, userId },
      },
      update: {
        totalVoiceMinutes: { increment: minutes },
        lastVoiceAt: timestamp,
        lastSeen: timestamp,
        updatedAt: timestamp,
      },
      create: {
        guildId,
        userId,
        totalMessages: 0,
        totalVoiceMinutes: minutes,
        totalReactionsGiven: 0,
        totalReactionsReceived: 0,
        lastVoiceAt: timestamp,
        lastSeen: timestamp,
      },
    });
  }

  private async updateStatsDaily(
    guildId: string,
    userId: string,
    channelId: string,
    date: Date,
    minutes: number,
  ): Promise<void> {
    await this.prisma.statsDaily.upsert({
      where: {
        guildId_userId_date_channelId: {
          guildId,
          userId,
          date,
          channelId,
        },
      },
      update: {
        voiceMinutes: { increment: minutes },
      },
      create: {
        guildId,
        userId,
        channelId,
        date,
        messagesSent: 0,
        messagesDeleted: 0,
        messagesEdited: 0,
        deletedBySelf: 0,
        deletedByMod: 0,
        voiceMinutes: minutes,
        reactionsGiven: 0,
        reactionsReceived: 0,
      },
    });
  }

  private getSessionKey(guildId: string, userId: string): string {
    return `${this.VOICE_SESSION_PREFIX}:${guildId}:${userId}`;
  }

  private async getActiveSession(key: string): Promise<VoiceSession | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }
}
