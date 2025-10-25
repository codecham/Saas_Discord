/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BotEventDto } from '@my-project/shared-types';

@Injectable()
export class ReactionEventsProcessor {
  private readonly logger = new Logger(ReactionEventsProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  async processReactionAdd(event: BotEventDto): Promise<void> {
    const { guildId, userId, channelId, timestamp, data } = event;

    if (!userId) {
      this.logger.warn('MESSAGE_REACTION_ADD sans userId ignoré');
      return;
    }

    const now = new Date(timestamp);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // messageAuthorId pour réactions reçues
    const messageAuthorId = data?.messageAuthorId;

    try {
      await Promise.all([
        // 1. Update MemberStats (celui qui donne la réaction)
        this.updateMemberStatsGiven(guildId, userId, now),

        // 2. Update StatsDaily (celui qui donne)
        this.updateStatsDailyGiven(
          guildId,
          userId,
          channelId || '__global__',
          today,
        ),

        // 3. Update MemberStats (celui qui reçoit la réaction)
        messageAuthorId &&
          this.updateMemberStatsReceived(guildId, messageAuthorId, now),

        // 4. Update StatsDaily (celui qui reçoit)
        messageAuthorId &&
          this.updateStatsDailyReceived(
            guildId,
            messageAuthorId,
            channelId || '__global__',
            today,
          ),
      ]);

      this.logger.debug(
        `✅ Réaction comptabilisée pour ${userId} dans guild ${guildId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur traitement MESSAGE_REACTION_ADD: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Traite un event MESSAGE_REACTION_REMOVE (retrait de réaction)
   */
  async processReactionRemove(event: BotEventDto): Promise<void> {
    const { guildId, userId, channelId, timestamp } = event;

    if (!userId) {
      this.logger.warn('MESSAGE_REACTION_REMOVE sans userId ignoré');
      return;
    }

    const now = new Date(timestamp);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    try {
      // 1. Update MemberStats - Décrémenter reactionsGiven
      const memberStats = await this.prisma.memberStats.findUnique({
        where: {
          idx_member_stats_unique: { guildId, userId },
        },
      });

      if (memberStats && memberStats.totalReactionsGiven > 0) {
        await this.prisma.memberStats.update({
          where: {
            idx_member_stats_unique: { guildId, userId },
          },
          data: {
            totalReactionsGiven: { decrement: 1 },
            lastSeen: now,
            updatedAt: now,
          },
        });
      } else {
        this.logger.debug(
          `Skip decrement: user ${userId} n'a pas de réactions à retirer`,
        );
      }

      // 2. Update StatsDaily - Décrémenter reactionsGiven
      const dailyStats = await this.prisma.statsDaily.findUnique({
        where: {
          guildId_userId_date_channelId: {
            guildId,
            userId,
            date: today,
            channelId: channelId || '__global__',
          },
        },
      });

      if (dailyStats && dailyStats.reactionsGiven > 0) {
        await this.prisma.statsDaily.update({
          where: {
            guildId_userId_date_channelId: {
              guildId,
              userId,
              date: today,
              channelId: channelId || '__global__',
            },
          },
          data: {
            reactionsGiven: { decrement: 1 },
          },
        });
      } else {
        this.logger.debug(
          `Skip decrement: user ${userId} n'a pas de réactions daily à retirer`,
        );
      }

      this.logger.debug(
        `✅ Réaction retirée comptabilisée pour user ${userId} dans guild ${guildId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur traitement MESSAGE_REACTION_REMOVE: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async updateMemberStatsGiven(
    guildId: string,
    userId: string,
    timestamp: Date,
  ): Promise<void> {
    await this.prisma.memberStats.upsert({
      where: {
        idx_member_stats_unique: { guildId, userId },
      },
      update: {
        totalReactionsGiven: { increment: 1 },
        lastSeen: timestamp,
        updatedAt: timestamp,
      },
      create: {
        guildId,
        userId,
        totalMessages: 0,
        totalVoiceMinutes: 0,
        totalReactionsGiven: 1,
        totalReactionsReceived: 0,
        lastSeen: timestamp,
      },
    });
  }

  private async updateMemberStatsReceived(
    guildId: string,
    userId: string,
    timestamp: Date,
  ): Promise<void> {
    await this.prisma.memberStats.upsert({
      where: {
        idx_member_stats_unique: { guildId, userId },
      },
      update: {
        totalReactionsReceived: { increment: 1 },
        updatedAt: timestamp,
      },
      create: {
        guildId,
        userId,
        totalMessages: 0,
        totalVoiceMinutes: 0,
        totalReactionsGiven: 0,
        totalReactionsReceived: 1,
      },
    });
  }

  private async updateStatsDailyGiven(
    guildId: string,
    userId: string,
    channelId: string,
    date: Date,
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
        reactionsGiven: { increment: 1 },
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
        voiceMinutes: 0,
        reactionsGiven: 1,
        reactionsReceived: 0,
      },
    });
  }

  private async updateStatsDailyReceived(
    guildId: string,
    userId: string,
    channelId: string,
    date: Date,
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
        reactionsReceived: { increment: 1 },
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
        voiceMinutes: 0,
        reactionsGiven: 0,
        reactionsReceived: 1,
      },
    });
  }

  async processBatch(events: BotEventDto[]): Promise<void> {
    for (const event of events) {
      await this.processReactionAdd(event);
    }
  }
}
