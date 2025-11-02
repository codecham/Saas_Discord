import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BotEventDto } from '@my-project/shared-types';

/**
 * 💬 Processor pour les événements de messages
 *
 * Responsabilités :
 * - Mettre à jour MemberStats (stats cumulatives)
 * - Mettre à jour StatsDaily (stats du jour par channel)
 */
@Injectable()
export class MessageEventsProcessor {
  private readonly logger = new Logger(MessageEventsProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Traite un event MESSAGE_CREATE
   */
  async processMessageCreate(event: BotEventDto): Promise<void> {
    const { guildId, userId, channelId, timestamp } = event;

    if (!userId) {
      this.logger.warn('MESSAGE_CREATE sans userId ignoré');
      return;
    }

    const now = new Date(timestamp);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    try {
      await Promise.all([
        // 1. Update MemberStats (cumul total)
        this.updateMemberStats(guildId, userId, now),

        // 2. Update StatsDaily (stats du jour)
        this.updateStatsDaily(
          guildId,
          userId,
          channelId || '__global__',
          today,
          now,
        ),
      ]);

      this.logger.debug(
        `✅ Message comptabilisé pour user ${userId} dans guild ${guildId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur traitement MESSAGE_CREATE: ${error.message}`,
        error.stack,
      );
      throw error; // Pour retry BullMQ
    }
  }

  /**
   * Traite un event MESSAGE_UPDATE (édition)
   */
  async processMessageUpdate(event: BotEventDto): Promise<void> {
    const { guildId, userId, channelId, timestamp } = event;

    if (!userId) {
      this.logger.warn('MESSAGE_UPDATE sans userId ignoré');
      return;
    }

    const now = new Date(timestamp);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    try {
      await Promise.all([
        // 1. Update MemberStats (lastSeen seulement)
        this.prisma.memberStats.upsert({
          where: {
            idx_member_stats_unique: { guildId, userId },
          },
          update: {
            lastSeen: now,
            updatedAt: now,
          },
          create: {
            guildId,
            userId,
            totalMessages: 0,
            totalVoiceMinutes: 0,
            totalReactionsGiven: 0,
            totalReactionsReceived: 0,
            lastSeen: now,
          },
        }),

        // 2. Update StatsDaily (messagesEdited++)
        this.prisma.statsDaily.upsert({
          where: {
            guildId_userId_date_channelId: {
              guildId,
              userId,
              date: today,
              channelId: channelId || '__global__',
            },
          },
          update: {
            messagesEdited: { increment: 1 },
          },
          create: {
            guildId,
            userId,
            channelId: channelId || '__global__',
            date: today,
            messagesSent: 0,
            messagesDeleted: 0,
            messagesEdited: 1,
            deletedBySelf: 0,
            deletedByMod: 0,
            voiceMinutes: 0,
            reactionsGiven: 0,
            reactionsReceived: 0,
          },
        }),
      ]);

      this.logger.debug(
        `✅ Message édité comptabilisé pour user ${userId} dans guild ${guildId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur traitement MESSAGE_UPDATE: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Traite un event MESSAGE_DELETE (suppression)
   *
   * ⚠️ Limitation : Discord n'envoie pas toujours l'auteur du message
   * On ne peut tracker que si le bot a le message en cache
   */
  async processMessageDelete(event: BotEventDto): Promise<void> {
    const { guildId, userId, channelId, timestamp, data } = event;

    // Si on n'a pas l'userId (message pas en cache), on ignore
    if (!userId) {
      this.logger.debug(
        'MESSAGE_DELETE sans userId (message pas en cache), ignoré',
      );
      return;
    }

    const now = new Date(timestamp);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Déterminer si suppression par l'auteur ou par un mod
    // data.deletedBy peut être fourni par le bot si disponible
    const deletedByMod = data?.deletedBy && data.deletedBy !== userId;

    try {
      await Promise.all([
        // 1. Update MemberStats (lastSeen seulement)
        this.prisma.memberStats.upsert({
          where: {
            idx_member_stats_unique: { guildId, userId },
          },
          update: {
            lastSeen: now,
            updatedAt: now,
          },
          create: {
            guildId,
            userId,
            totalMessages: 0,
            totalVoiceMinutes: 0,
            totalReactionsGiven: 0,
            totalReactionsReceived: 0,
            lastSeen: now,
          },
        }),

        // 2. Update StatsDaily
        this.prisma.statsDaily.upsert({
          where: {
            guildId_userId_date_channelId: {
              guildId,
              userId,
              date: today,
              channelId: channelId || '__global__',
            },
          },
          update: {
            messagesDeleted: { increment: 1 },
            deletedBySelf: deletedByMod ? 0 : { increment: 1 },
            deletedByMod: deletedByMod ? { increment: 1 } : 0,
          },
          create: {
            guildId,
            userId,
            channelId: channelId || '__global__',
            date: today,
            messagesSent: 0,
            messagesDeleted: 1,
            messagesEdited: 0,
            deletedBySelf: deletedByMod ? 0 : 1,
            deletedByMod: deletedByMod ? 1 : 0,
            voiceMinutes: 0,
            reactionsGiven: 0,
            reactionsReceived: 0,
          },
        }),
      ]);

      const deleteType = deletedByMod ? 'par mod' : 'par auteur';
      this.logger.debug(
        `✅ Message supprimé (${deleteType}) comptabilisé pour user ${userId} dans guild ${guildId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur traitement MESSAGE_DELETE: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Met à jour les stats cumulatives du membre
   */
  private async updateMemberStats(
    guildId: string,
    userId: string,
    timestamp: Date,
  ): Promise<void> {
    await this.prisma.memberStats.upsert({
      where: {
        idx_member_stats_unique: { guildId, userId },
      },
      update: {
        totalMessages: { increment: 1 },
        lastMessageAt: timestamp,
        lastSeen: timestamp,
        updatedAt: timestamp,
      },
      create: {
        guildId,
        userId,
        totalMessages: 1,
        totalVoiceMinutes: 0,
        totalReactionsGiven: 0,
        totalReactionsReceived: 0,
        lastMessageAt: timestamp,
        lastSeen: timestamp,
      },
    });
  }

  /**
   * Met à jour les stats quotidiennes
   */
  private async updateStatsDaily(
    guildId: string,
    userId: string,
    channelId: string,
    date: Date,
    timestamp: Date,
  ): Promise<void> {
    const hour = timestamp.getHours();

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
        messagesSent: { increment: 1 },
        lastMessageAt: timestamp,
        // Update peakHour si ce n'est pas défini ou si on veut tracker l'heure la plus récente
        peakHour: hour,
      },
      create: {
        guildId,
        userId,
        channelId,
        date,
        messagesSent: 1,
        messagesDeleted: 0,
        messagesEdited: 0,
        deletedBySelf: 0,
        deletedByMod: 0,
        voiceMinutes: 0,
        reactionsGiven: 0,
        reactionsReceived: 0,
        peakHour: hour,
        firstMessageAt: timestamp,
        lastMessageAt: timestamp,
      },
    });
  }

  /**
   * Traite un batch d'events (pour compatibilité)
   */
  async processBatch(events: BotEventDto[]): Promise<void> {
    for (const event of events) {
      await this.processMessageCreate(event);
    }
  }
}
