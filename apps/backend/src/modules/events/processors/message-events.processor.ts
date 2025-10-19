/* eslint-disable @typescript-eslint/no-unsafe-call */
// apps/backend/src/modules/events/processors/message-events.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BotEventDto } from '@my-project/shared-types';

/**
 * 💬 Processor pour les événements de messages
 *
 * Responsabilités :
 * - Écouter les events MESSAGE_CREATE
 * - Mettre à jour member_stats (compteur de messages)
 * - Mettre à jour les timestamps (lastMessageAt, lastSeen)
 *
 * Events traités :
 * - MESSAGE_CREATE : Nouveau message envoyé
 */
@Injectable()
export class MessageEventsProcessor {
  private readonly logger = new Logger(MessageEventsProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Traite un event MESSAGE_CREATE
   *
   * @param event - Event Discord de type MESSAGE_CREATE
   */
  async processMessageCreate(event: BotEventDto): Promise<void> {
    try {
      const { guildId, userId } = event;

      // Validation : on ne traite que les messages avec userId
      if (!userId) {
        this.logger.warn('MESSAGE_CREATE sans userId ignoré');
        return;
      }

      const now = new Date(event.timestamp);

      // ÉTAPE 1 : Trouver ou créer l'entrée member_stats
      // On utilise upsert : si existe → update, sinon → create
      await this.prisma.memberStats.upsert({
        where: {
          // Index unique (guildId, userId)
          idx_member_stats_unique: {
            guildId,
            userId,
          },
        },
        // Si existe déjà : incrémenter
        update: {
          totalMessages: {
            increment: 1, // +1 message
          },
          lastMessageAt: now,
          lastSeen: now,
          updatedAt: now,
        },
        // Si n'existe pas : créer avec valeurs initiales
        create: {
          guildId,
          userId,
          totalMessages: 1,
          totalVoiceMinutes: 0,
          totalReactionsGiven: 0,
          totalReactionsReceived: 0,
          lastMessageAt: now,
          lastSeen: now,
        },
      });

      this.logger.debug(
        `✅ Message comptabilisé pour user ${userId} dans guild ${guildId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur traitement MESSAGE_CREATE: ${error.message}`,
        error.stack,
      );
      // On ne throw pas l'erreur pour ne pas bloquer le traitement des autres events
    }
  }

  /**
   * Traite un batch d'events messages
   *
   * Optimisation : au lieu de traiter 1 par 1, on groupe par (guildId, userId)
   * et on fait 1 seule requête DB par utilisateur.
   *
   * @param events - Tableau d'events MESSAGE_CREATE
   */
  async processBatch(events: BotEventDto[]): Promise<void> {
    if (events.length === 0) return;

    this.logger.log(`📥 Traitement batch de ${events.length} messages`);

    // Grouper par (guildId, userId)
    const userMessageCounts = new Map<
      string,
      { count: number; lastTime: Date }
    >();

    for (const event of events) {
      if (!event.userId) continue;

      const key = `${event.guildId}-${event.userId}`;
      const existing = userMessageCounts.get(key);

      if (existing) {
        existing.count++;
        existing.lastTime = new Date(
          Math.max(existing.lastTime.getTime(), event.timestamp),
        );
      } else {
        userMessageCounts.set(key, {
          count: 1,
          lastTime: new Date(event.timestamp),
        });
      }
    }

    // Mettre à jour chaque utilisateur
    const updates: Promise<unknown>[] = [];

    for (const [key, data] of userMessageCounts.entries()) {
      const [guildId, userId] = key.split('-');

      const updatePromise = this.prisma.memberStats.upsert({
        where: {
          idx_member_stats_unique: {
            guildId,
            userId,
          },
        },
        update: {
          totalMessages: {
            increment: data.count,
          },
          lastMessageAt: data.lastTime,
          lastSeen: data.lastTime,
          updatedAt: data.lastTime,
        },
        create: {
          guildId,
          userId,
          totalMessages: data.count,
          totalVoiceMinutes: 0,
          totalReactionsGiven: 0,
          totalReactionsReceived: 0,
          lastMessageAt: data.lastTime,
          lastSeen: data.lastTime,
        },
      });

      updates.push(updatePromise);
    }

    // Exécuter toutes les updates en parallèle
    await Promise.all(updates);

    this.logger.log(
      `✅ ${userMessageCounts.size} utilisateurs mis à jour (${events.length} messages)`,
    );
  }
}
