/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BotEventDto } from '@my-project/shared-types';

/**
 * 👍 Processor pour les événements de réactions
 *
 * Responsabilités :
 * - Écouter les events MESSAGE_REACTION_ADD
 * - Mettre à jour member_stats (réactions données et reçues)
 * - Mettre à jour les timestamps (lastSeen)
 *
 * Logique :
 * - User qui réagit → totalReactionsGiven++
 * - Auteur du message → totalReactionsReceived++
 */
@Injectable()
export class ReactionEventsProcessor {
  private readonly logger = new Logger(ReactionEventsProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Traite un event MESSAGE_REACTION_ADD
   *
   * @param event - Event Discord de type MESSAGE_REACTION_ADD
   */
  async processReactionAdd(event: BotEventDto): Promise<void> {
    try {
      const { guildId, userId, timestamp, data } = event;

      // Validation : on ne traite que les réactions avec userId
      if (!userId) {
        this.logger.warn('MESSAGE_REACTION_ADD sans userId ignoré');
        return;
      }

      const now = new Date(timestamp);

      // ÉTAPE 1 : Incrémenter totalReactionsGiven pour l'user qui réagit
      await this.incrementReactionsGiven(guildId, userId, now);

      // ÉTAPE 2 : Si on connaît l'auteur du message, incrémenter totalReactionsReceived
      const messageAuthorId = data?.messageAuthorId as string | undefined;

      if (messageAuthorId && messageAuthorId !== userId) {
        // Ne pas compter si l'user réagit à son propre message
        await this.incrementReactionsReceived(guildId, messageAuthorId, now);
      }

      this.logger.debug(
        `✅ Réaction comptabilisée pour user ${userId} dans guild ${guildId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur traitement MESSAGE_REACTION_ADD: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Incrémente le compteur de réactions données
   */
  private async incrementReactionsGiven(
    guildId: string,
    userId: string,
    timestamp: Date,
  ): Promise<void> {
    await this.prisma.memberStats.upsert({
      where: {
        idx_member_stats_unique: {
          guildId,
          userId,
        },
      },
      update: {
        totalReactionsGiven: {
          increment: 1,
        },
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

  /**
   * Incrémente le compteur de réactions reçues
   */
  private async incrementReactionsReceived(
    guildId: string,
    userId: string,
    timestamp: Date,
  ): Promise<void> {
    await this.prisma.memberStats.upsert({
      where: {
        idx_member_stats_unique: {
          guildId,
          userId,
        },
      },
      update: {
        totalReactionsReceived: {
          increment: 1,
        },
        updatedAt: timestamp,
        // Note : on ne met pas à jour lastSeen car c'est l'auteur du message,
        // pas forcément actif à ce moment
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

  /**
   * Traite un batch d'events réactions
   *
   * Optimisation : groupe par userId pour réduire les requêtes DB
   *
   * @param events - Tableau d'events MESSAGE_REACTION_ADD
   */
  async processBatch(events: BotEventDto[]): Promise<void> {
    if (events.length === 0) return;

    this.logger.log(`📥 Traitement batch de ${events.length} réactions`);

    // Grouper les réactions données par userId
    const reactionsGiven = new Map<string, { count: number; lastTime: Date }>();

    // Grouper les réactions reçues par userId
    const reactionsReceived = new Map<
      string,
      { count: number; lastTime: Date }
    >();

    for (const event of events) {
      if (!event.userId) continue;

      const timestamp = new Date(event.timestamp);

      // Compter réactions données
      const givenKey = `${event.guildId}-${event.userId}`;
      const existingGiven = reactionsGiven.get(givenKey);

      if (existingGiven) {
        existingGiven.count++;
        existingGiven.lastTime = new Date(
          Math.max(existingGiven.lastTime.getTime(), event.timestamp),
        );
      } else {
        reactionsGiven.set(givenKey, {
          count: 1,
          lastTime: timestamp,
        });
      }

      // Compter réactions reçues (si messageAuthorId disponible)
      const messageAuthorId = event.data?.messageAuthorId as string | undefined;

      if (messageAuthorId && messageAuthorId !== event.userId) {
        const receivedKey = `${event.guildId}-${messageAuthorId}`;
        const existingReceived = reactionsReceived.get(receivedKey);

        if (existingReceived) {
          existingReceived.count++;
          existingReceived.lastTime = new Date(
            Math.max(existingReceived.lastTime.getTime(), event.timestamp),
          );
        } else {
          reactionsReceived.set(receivedKey, {
            count: 1,
            lastTime: timestamp,
          });
        }
      }
    }

    // Mettre à jour les réactions données
    const updates: Promise<unknown>[] = [];

    for (const [key, data] of reactionsGiven.entries()) {
      const [guildId, userId] = key.split('-');

      const updatePromise = this.prisma.memberStats.upsert({
        where: {
          idx_member_stats_unique: {
            guildId,
            userId,
          },
        },
        update: {
          totalReactionsGiven: {
            increment: data.count,
          },
          lastSeen: data.lastTime,
          updatedAt: data.lastTime,
        },
        create: {
          guildId,
          userId,
          totalMessages: 0,
          totalVoiceMinutes: 0,
          totalReactionsGiven: data.count,
          totalReactionsReceived: 0,
          lastSeen: data.lastTime,
        },
      });

      updates.push(updatePromise);
    }

    // Mettre à jour les réactions reçues
    for (const [key, data] of reactionsReceived.entries()) {
      const [guildId, userId] = key.split('-');

      const updatePromise = this.prisma.memberStats.upsert({
        where: {
          idx_member_stats_unique: {
            guildId,
            userId,
          },
        },
        update: {
          totalReactionsReceived: {
            increment: data.count,
          },
          updatedAt: data.lastTime,
        },
        create: {
          guildId,
          userId,
          totalMessages: 0,
          totalVoiceMinutes: 0,
          totalReactionsGiven: 0,
          totalReactionsReceived: data.count,
        },
      });

      updates.push(updatePromise);
    }

    // Exécuter toutes les updates en parallèle
    await Promise.all(updates);

    this.logger.log(
      `✅ ${reactionsGiven.size} users mis à jour (réactions données), ${reactionsReceived.size} users mis à jour (réactions reçues)`,
    );
  }
}
