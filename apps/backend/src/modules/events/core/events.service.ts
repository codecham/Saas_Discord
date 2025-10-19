/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BotEventDto } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { Prisma } from '@prisma/client';
import { MessageEventsProcessor } from '../processors/message-events.processor';
import { VoiceEventsProcessor } from '../processors/voice-events.processor';
import { ReactionEventsProcessor } from '../processors/reaction-events.processor';

/**
 * 📊 EventsService - Service principal de gestion des événements Discord
 *
 * Responsabilités :
 * - Recevoir les batches d'events depuis Gateway
 * - Valider les events
 * - Persister dans TimescaleDB (table events - hypertable)
 * - Dispatcher vers les processors (à venir)
 *
 * Performance :
 * - Insertion en batch via createMany()
 * - Validation légère (pas de fetch API Discord)
 * - Logging structuré pour monitoring
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageProcessor: MessageEventsProcessor,
    private readonly voiceProcessor: VoiceEventsProcessor,
    private readonly reactionProcessor: ReactionEventsProcessor,
  ) {}

  /**
   * Traite un batch d'événements Discord
   *
   * @param events - Tableau de BotEventDto reçus du bot
   * @returns Nombre d'events persistés avec succès
   */
  async processBatch(events: BotEventDto[]): Promise<number> {
    if (!events || events.length === 0) {
      this.logger.warn('processBatch appelé avec un tableau vide');
      return 0;
    }

    this.logger.log(`📥 Réception de ${events.length} events`);

    try {
      // Étape 1 : Valider les events
      const validEvents = this.validateEvents(events);

      if (validEvents.length === 0) {
        this.logger.warn('Aucun event valide dans le batch');
        return 0;
      }

      // Étape 2 : Transformer pour Prisma
      const eventsForDb = this.transformEventsForDb(validEvents);

      // Étape 3 : Persister dans TimescaleDB
      const result = await this.persistEvents(eventsForDb);

      this.logger.log(
        `✅ ${result.count} events persistés avec succès (${events.length - validEvents.length} rejetés)`,
      );

      // 🆕 ÉTAPE 4 : Dispatcher vers les processors pour mise à jour temps réel
      await this.dispatchToProcessors(validEvents);

      return result.count;
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors du traitement du batch: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Valide un batch d'events
   *
   * Rejette les events qui n'ont pas :
   * - Un type valide
   * - Un timestamp valide
   * - Un guildId (sauf events globaux)
   */
  private validateEvents(events: BotEventDto[]): BotEventDto[] {
    const validEvents: BotEventDto[] = [];

    for (const event of events) {
      // Validation basique
      if (!event.type) {
        this.logger.warn(`Event sans type ignoré: ${JSON.stringify(event)}`);
        continue;
      }

      if (!event.timestamp || event.timestamp <= 0) {
        this.logger.warn(`Event avec timestamp invalide ignoré: ${event.type}`);
        continue;
      }

      // La plupart des events nécessitent un guildId
      if (!event.guildId) {
        this.logger.warn(`Event sans guildId ignoré: ${event.type}`);
        continue;
      }

      validEvents.push(event);
    }

    return validEvents;
  }

  /**
   * Transforme les BotEventDto en format Prisma pour insertion
   *
   * Convertit :
   * - timestamp (number) → Date
   * - data (object) → JsonValue (Prisma)
   * - Utilise le mapping camelCase de Prisma
   */
  private transformEventsForDb(
    events: BotEventDto[],
  ): Prisma.EventCreateManyInput[] {
    return events.map((event) => ({
      type: event.type,
      guildId: event.guildId, // ✅ camelCase (Prisma gère le mapping vers guild_id)
      userId: event.userId || null,
      channelId: event.channelId || null,
      messageId: event.messageId || null,
      roleId: event.roleId || null,
      shardId: null, // TODO: Ajouter shardId dans BotEventDto plus tard
      timestamp: new Date(event.timestamp), // Conversion number → Date
      data: (event.data as Prisma.JsonValue) || Prisma.JsonNull,
    }));
  }

  /**
   * Persiste les events dans TimescaleDB
   *
   * Utilise createMany() pour performance (1 seule requête SQL)
   */
  private async persistEvents(
    events: Prisma.EventCreateManyInput[],
  ): Promise<Prisma.BatchPayload> {
    try {
      return await this.prisma.event.createMany({
        data: events,
        skipDuplicates: true,
      });
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de la persistance: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Récupère les events d'une guild dans une période donnée
   */
  async getEventsByGuild(
    guildId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<unknown> {
    return this.prisma.event.findMany({
      where: {
        guildId, // ✅ camelCase
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 1000,
    });
  }

  /**
   * Compte les events par type pour une guild
   */
  async countEventsByType(
    guildId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, number>> {
    const results = await this.prisma.event.groupBy({
      by: ['type'],
      where: {
        guildId, // ✅ camelCase
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        type: true,
      },
    });

    return results.reduce(
      (acc, curr) => {
        acc[curr.type] = curr._count.type;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Dispatch les events vers les processors appropriés
   *
   * Groupe les events par type et appelle les processors en batch
   * pour optimiser les performances.
   */
  private async dispatchToProcessors(events: BotEventDto[]): Promise<void> {
    // Grouper les events par type
    const messageEvents: BotEventDto[] = [];
    const voiceEvents: BotEventDto[] = [];
    const reactionEvents: BotEventDto[] = [];

    for (const event of events) {
      switch (event.type) {
        case EventType.MESSAGE_CREATE:
          messageEvents.push(event);
          break;

        case EventType.VOICE_STATE_UPDATE:
          voiceEvents.push(event);
          break;

        case EventType.MESSAGE_REACTION_ADD:
          reactionEvents.push(event);
          break;

        // Autres types d'events ignorés pour l'instant
        default:
          break;
      }
    }

    // Traiter chaque type en parallèle
    const processorPromises: Promise<void>[] = [];

    if (messageEvents.length > 0) {
      this.logger.debug(
        `📨 Dispatch ${messageEvents.length} MESSAGE_CREATE vers MessageProcessor`,
      );
      processorPromises.push(this.messageProcessor.processBatch(messageEvents));
    }

    if (voiceEvents.length > 0) {
      this.logger.debug(
        `🎤 Dispatch ${voiceEvents.length} VOICE_STATE_UPDATE vers VoiceProcessor`,
      );
      // Traiter 1 par 1 car le voice processor gère les sessions
      for (const event of voiceEvents) {
        processorPromises.push(
          this.voiceProcessor.processVoiceStateUpdate(event),
        );
      }
    }

    if (reactionEvents.length > 0) {
      this.logger.debug(
        `👍 Dispatch ${reactionEvents.length} MESSAGE_REACTION_ADD vers ReactionProcessor`,
      );
      processorPromises.push(
        this.reactionProcessor.processBatch(reactionEvents),
      );
    }

    // Attendre que tous les processors aient terminé
    try {
      await Promise.all(processorPromises);
      this.logger.debug(`✅ Tous les processors ont terminé`);
    } catch (error) {
      this.logger.error(
        `❌ Erreur dans un processor: ${error.message}`,
        error.stack,
      );
      // On ne throw pas pour ne pas bloquer la persistance
    }
  }
}
