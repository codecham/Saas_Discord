import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BotEventDto } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { Prisma } from '@prisma/client';
import type { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

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
    @InjectQueue('events-processing') private readonly eventsQueue: Queue,
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
      // Validation
      const validEvents = this.validateEvents(events);

      if (validEvents.length === 0) {
        this.logger.warn('Aucun event valide dans le batch');
        return 0;
      }

      // Transformer
      const eventsForDb = this.transformEventsForDb(validEvents);

      // Persister (OPTIONAL - peut être supprimé si on ne veut plus stocker les events bruts)
      const result = await this.persistEvents(eventsForDb);

      this.logger.log(`✅ ${result.count} events persistés`);

      // ✅ NOUVEAU : Envoyer à la queue au lieu d'appeler directement les processors
      await this.sendToQueue(validEvents);

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
   * Envoie les events à la queue BullMQ pour traitement asynchrone
   */
  private async sendToQueue(events: BotEventDto[]): Promise<void> {
    if (events.length === 0) return;

    try {
      // Envoyer tous les events en bulk à la queue
      await this.eventsQueue.addBulk(
        events.map((event) => ({
          name: 'process-event',
          data: event,
          opts: {
            // Priority basée sur le type d'event (optionnel)
            priority: this.getEventPriority(event.type),
          },
        })),
      );

      this.logger.debug(
        `📤 ${events.length} events envoyés à la queue events-processing`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de l'envoi à la queue: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Détermine la priorité d'un event (1 = haute, 5 = basse)
   */
  private getEventPriority(eventType: EventType): number {
    // Events critiques = priorité haute
    if (
      [
        EventType.GUILD_BAN_ADD,
        EventType.GUILD_BAN_REMOVE,
        EventType.GUILD_MEMBER_REMOVE,
      ].includes(eventType)
    ) {
      return 1;
    }

    // Events stats = priorité normale
    if (
      [
        EventType.MESSAGE_CREATE,
        EventType.VOICE_STATE_UPDATE,
        EventType.MESSAGE_REACTION_ADD,
      ].includes(eventType)
    ) {
      return 2;
    }

    // Autres = priorité basse
    return 3;
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
}
