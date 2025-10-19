// apps/backend/src/modules/events/jobs/stats-aggregation.processor.ts

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { MetricsAggregationService } from '../core/metrics-aggregation.service';

/**
 * 📊 Processor pour l'agrégation des statistiques
 *
 * Ce processor écoute la queue 'stats-aggregation' et traite les jobs
 * d'agrégation de métriques périodiques.
 *
 * Jobs supportés :
 * - aggregate-5min: Agrégation toutes les 5 minutes
 * - aggregate-hourly: Agrégation horaire
 * - aggregate-daily: Agrégation quotidienne
 */
@Processor('stats-aggregation')
export class StatsAggregationProcessor {
  private readonly logger = new Logger(StatsAggregationProcessor.name);

  constructor(private readonly metricsService: MetricsAggregationService) {}

  /**
   * Job d'agrégation toutes les 5 minutes
   *
   * Calcule les métriques pour une période de 5min et les sauvegarde
   * dans la table metrics_snapshots.
   *
   * Format du job.data :
   * {
   *   guildId: string,
   *   startTime: number (timestamp),
   *   endTime: number (timestamp)
   * }
   */
  @Process('aggregate-5min')
  async handleAggregate5Min(job: Job): Promise<void> {
    this.logger.log(`🔄 Début job aggregate-5min (ID: ${job.id})`);

    try {
      const { guildId, startTime, endTime } = job.data;

      // Convertir les timestamps en Date
      const start = new Date(startTime);
      const end = new Date(endTime);

      this.logger.debug(
        `Agrégation 5min pour guild ${guildId}: ${start.toISOString()} → ${end.toISOString()}`,
      );

      // ÉTAPE 1 : Agréger les métriques de la période
      const metrics = await this.metricsService.aggregatePeriod(
        guildId,
        start,
        end,
        '5min',
      );

      this.logger.debug(
        `Métriques calculées : ${metrics.totalMessages} messages, ${metrics.uniqueActiveUsers} users actifs`,
      );

      // ÉTAPE 2 : Sauvegarder dans metrics_snapshots
      await this.metricsService.saveMetricsSnapshot(metrics);

      this.logger.log(
        `✅ Job aggregate-5min terminé (ID: ${job.id}) - ${metrics.totalMessages} messages agrégés`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur job aggregate-5min (ID: ${job.id}): ${error.message}`,
        error.stack,
      );
      throw error; // BullMQ va retry automatiquement
    }
  }

  /**
   * Job d'agrégation horaire
   *
   * Similaire à aggregate-5min mais sur une période d'1 heure
   */
  @Process('aggregate-hourly')
  async handleAggregateHourly(job: Job): Promise<void> {
    this.logger.log(`🔄 Début job aggregate-hourly (ID: ${job.id})`);

    try {
      const { guildId, startTime, endTime } = job.data;

      const start = new Date(startTime);
      const end = new Date(endTime);

      this.logger.debug(
        `Agrégation horaire pour guild ${guildId}: ${start.toISOString()} → ${end.toISOString()}`,
      );

      // Agréger sur 1 heure
      const metrics = await this.metricsService.aggregatePeriod(
        guildId,
        start,
        end,
        'hourly',
      );

      this.logger.debug(
        `Métriques horaires : ${metrics.totalMessages} messages, ${metrics.totalVoiceMinutes} min vocal`,
      );

      // Sauvegarder
      await this.metricsService.saveMetricsSnapshot(metrics);

      this.logger.log(
        `✅ Job aggregate-hourly terminé (ID: ${job.id}) - ${metrics.totalMessages} messages agrégés`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur job aggregate-hourly (ID: ${job.id}): ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Job d'agrégation quotidienne
   *
   * Similaire mais sur 24 heures
   */
  @Process('aggregate-daily')
  async handleAggregateDaily(job: Job): Promise<void> {
    this.logger.log(`🔄 Début job aggregate-daily (ID: ${job.id})`);

    try {
      const { guildId, startTime, endTime } = job.data;

      const start = new Date(startTime);
      const end = new Date(endTime);

      this.logger.debug(
        `Agrégation quotidienne pour guild ${guildId}: ${start.toISOString()} → ${end.toISOString()}`,
      );

      // Agréger sur 24h
      const metrics = await this.metricsService.aggregatePeriod(
        guildId,
        start,
        end,
        'daily',
      );

      this.logger.debug(
        `Métriques quotidiennes : ${metrics.totalMessages} messages, ${metrics.uniqueActiveUsers} users actifs`,
      );

      // Sauvegarder
      await this.metricsService.saveMetricsSnapshot(metrics);

      this.logger.log(
        `✅ Job aggregate-daily terminé (ID: ${job.id}) - ${metrics.totalMessages} messages agrégés`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur job aggregate-daily (ID: ${job.id}): ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
