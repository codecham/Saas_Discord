import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Interface pour les métriques agrégées d'une période
 */
export interface PeriodMetrics {
  // Période concernée
  guildId: string;
  startTime: Date;
  endTime: Date;
  periodType: '5min' | 'hourly' | 'daily';

  // Métriques calculées
  totalMessages: number;
  totalVoiceMinutes: number;
  totalReactions: number;
  uniqueActiveUsers: number;

  // Détails par type d'event (pour debug/analyse)
  eventCounts: Record<string, number>;
}

/**
 * 📊 Service d'agrégation de métriques
 *
 * Responsabilités :
 * - Compter les events dans une période donnée
 * - Grouper par type d'event
 * - Calculer les métriques dérivées (messages, voice, etc.)
 * - Préparer les données pour sauvegarde dans metrics_snapshots
 */
@Injectable()
export class MetricsAggregationService {
  private readonly logger = new Logger(MetricsAggregationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Agrège les métriques pour une période donnée
   *
   * @param guildId - ID du serveur Discord
   * @param startTime - Début de la période
   * @param endTime - Fin de la période
   * @param periodType - Type de période ('5min', 'hourly', 'daily')
   * @returns Métriques calculées
   *
   * Exemple d'utilisation :
   * ```typescript
   * const metrics = await service.aggregatePeriod(
   *   '123456789',
   *   new Date('2025-10-18T17:00:00Z'),
   *   new Date('2025-10-18T17:05:00Z'),
   *   '5min'
   * );
   * console.log(metrics.totalMessages); // 150
   * ```
   */
  async aggregatePeriod(
    guildId: string,
    startTime: Date,
    endTime: Date,
    periodType: '5min' | 'hourly' | 'daily',
  ): Promise<PeriodMetrics> {
    this.logger.debug(
      `Agrégation ${periodType} pour guild ${guildId}: ${startTime.toISOString()} → ${endTime.toISOString()}`,
    );

    // ÉTAPE 1 : Compter les events par type
    const eventCounts = await this.countEventsByType(
      guildId,
      startTime,
      endTime,
    );

    // ÉTAPE 2 : Calculer les métriques dérivées
    const metrics = this.calculateMetrics(eventCounts);

    // ÉTAPE 3 : Compter les utilisateurs uniques actifs
    const uniqueActiveUsers = await this.countUniqueActiveUsers(
      guildId,
      startTime,
      endTime,
    );

    return {
      guildId,
      startTime,
      endTime,
      periodType,
      totalMessages: metrics.totalMessages,
      totalVoiceMinutes: metrics.totalVoiceMinutes,
      totalReactions: metrics.totalReactions,
      uniqueActiveUsers,
      eventCounts,
    };
  }

  /**
   * Compte les events par type dans une période
   *
   * Résultat exemple :
   * {
   *   'MESSAGE_CREATE': 150,
   *   'VOICE_STATE_UPDATE': 20,
   *   'MESSAGE_REACTION_ADD': 30
   * }
   */
  private async countEventsByType(
    guildId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Record<string, number>> {
    // Requête Prisma pour grouper par type
    const results = await this.prisma.event.groupBy({
      by: ['type'],
      where: {
        guildId,
        timestamp: {
          gte: startTime,
          lte: endTime,
        },
      },
      _count: {
        type: true,
      },
    });

    // Transformer en objet simple
    const counts: Record<string, number> = {};
    for (const result of results) {
      counts[result.type] = result._count.type;
    }

    this.logger.debug(`Events trouvés : ${JSON.stringify(counts)}`);

    return counts;
  }

  /**
   * Calcule les métriques à partir des compteurs d'events
   *
   * Transforme les events bruts en métriques métier
   */
  private calculateMetrics(eventCounts: Record<string, number>): {
    totalMessages: number;
    totalVoiceMinutes: number;
    totalReactions: number;
  } {
    // Messages = MESSAGE_CREATE
    const totalMessages = eventCounts['MESSAGE_CREATE'] || 0;

    // Réactions = MESSAGE_REACTION_ADD
    const totalReactions = eventCounts['MESSAGE_REACTION_ADD'] || 0;

    // Voice : Pour l'instant, on compte juste les VOICE_STATE_UPDATE
    // TODO: Calculer les minutes réelles en analysant les events
    const voiceEvents = eventCounts['VOICE_STATE_UPDATE'] || 0;
    const totalVoiceMinutes = Math.floor(voiceEvents / 2); // Estimation simple (join + leave)

    return {
      totalMessages,
      totalVoiceMinutes,
      totalReactions,
    };
  }

  /**
   * Compte le nombre d'utilisateurs uniques actifs dans la période
   *
   * Un utilisateur est considéré actif s'il a :
   * - Envoyé un message
   * - Rejoint/quitté un vocal
   * - Ajouté une réaction
   */
  private async countUniqueActiveUsers(
    guildId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<number> {
    // Requête pour compter les userId distincts
    const result = await this.prisma.event.groupBy({
      by: ['userId'],
      where: {
        guildId,
        timestamp: {
          gte: startTime,
          lte: endTime,
        },
        userId: {
          not: null, // Exclure les events sans userId
        },
      },
    });

    return result.length; // Nombre de userId distincts
  }

  /**
   * Sauvegarde les métriques agrégées dans metrics_snapshots
   *
   * @param metrics - Métriques calculées
   */
  async saveMetricsSnapshot(metrics: PeriodMetrics): Promise<void> {
    this.logger.debug(
      `Sauvegarde snapshot ${metrics.periodType} pour guild ${metrics.guildId}`,
    );

    await this.prisma.metricsSnapshot.create({
      data: {
        guildId: metrics.guildId,
        periodStart: metrics.startTime,
        periodEnd: metrics.endTime,
        periodType: metrics.periodType,
        totalMessages: metrics.totalMessages,
        totalVoiceMinutes: metrics.totalVoiceMinutes,
        totalReactions: metrics.totalReactions,
        uniqueActiveUsers: metrics.uniqueActiveUsers,
        data: metrics.eventCounts, // JSON avec détails
      },
    });

    this.logger.log(
      `✅ Snapshot ${metrics.periodType} sauvegardé pour guild ${metrics.guildId}`,
    );
  }
}
