/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 📅 Service de planification des agrégations statistiques
 *
 * Responsabilités :
 * - Déclencher automatiquement les jobs d'agrégation
 * - Gérer les périodes (5min, horaire, quotidien)
 * - Créer des jobs pour chaque guild active
 *
 */
@Injectable()
export class StatsSchedulerService {
  private readonly logger = new Logger(StatsSchedulerService.name);

  constructor(
    @InjectQueue('stats-aggregation')
    private readonly statsQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 🕐 Job toutes les 5 minutes
   *
   * Agrège les stats des 5 dernières minutes pour chaque guild active.
   *
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduleAggregate5Min() {
    this.logger.log('🕐 Déclenchement agrégation 5min');

    try {
      // Récupérer toutes les guilds actives
      const activeGuilds = await this.getActiveGuilds();

      if (activeGuilds.length === 0) {
        this.logger.warn('Aucune guild active trouvée');
        return;
      }

      this.logger.log(`📊 ${activeGuilds.length} guilds actives`);

      // Période : 5 dernières minutes
      const now = Date.now();
      const endTime = now;
      const startTime = now - 5 * 60 * 1000; // Il y a 5 minutes

      // Créer un job pour chaque guild
      let jobsCreated = 0;
      for (const guild of activeGuilds) {
        await this.statsQueue.add('aggregate-5min', {
          guildId: guild.guildId,
          startTime,
          endTime,
        });
        jobsCreated++;
      }

      this.logger.log(
        `✅ ${jobsCreated} jobs aggregate-5min créés (${new Date(startTime).toISOString()} → ${new Date(endTime).toISOString()})`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors du scheduling 5min: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 🕐 Job toutes les heures
   *
   * Agrège les stats de l'heure écoulée pour chaque guild active.
   *
   * Cron: 0 * * * * = À la minute 0 de chaque heure (14:00, 15:00, ...)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduleAggregateHourly() {
    this.logger.log('🕐 Déclenchement agrégation horaire');

    try {
      const activeGuilds = await this.getActiveGuilds();

      if (activeGuilds.length === 0) {
        this.logger.warn('Aucune guild active trouvée');
        return;
      }

      this.logger.log(`📊 ${activeGuilds.length} guilds actives`);

      // Période : dernière heure complète
      const now = new Date();
      const endTime = new Date(now);
      endTime.setMinutes(0, 0, 0); // Arrondir à l'heure (ex: 14:00:00)

      const startTime = new Date(endTime);
      startTime.setHours(startTime.getHours() - 1); // Heure précédente (ex: 13:00:00)

      // Créer un job pour chaque guild
      let jobsCreated = 0;
      for (const guild of activeGuilds) {
        await this.statsQueue.add('aggregate-hourly', {
          guildId: guild.guildId,
          startTime: startTime.getTime(),
          endTime: endTime.getTime(),
        });
        jobsCreated++;
      }

      this.logger.log(
        `✅ ${jobsCreated} jobs aggregate-hourly créés (${startTime.toISOString()} → ${endTime.toISOString()})`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors du scheduling horaire: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 🕐 Job quotidien (à minuit)
   *
   * Agrège les stats de la journée écoulée pour chaque guild active.
   *
   * Cron: 0 0 * * * = Tous les jours à 00:00
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduleAggregateDaily() {
    this.logger.log('🕐 Déclenchement agrégation quotidienne');

    try {
      const activeGuilds = await this.getActiveGuilds();

      if (activeGuilds.length === 0) {
        this.logger.warn('Aucune guild active trouvée');
        return;
      }

      this.logger.log(`📊 ${activeGuilds.length} guilds actives`);

      // Période : jour précédent complet (00:00 → 23:59:59)
      const now = new Date();
      const endTime = new Date(now);
      endTime.setHours(0, 0, 0, 0); // Début d'aujourd'hui = Fin d'hier

      const startTime = new Date(endTime);
      startTime.setDate(startTime.getDate() - 1); // Début d'hier

      // Créer un job pour chaque guild
      let jobsCreated = 0;
      for (const guild of activeGuilds) {
        await this.statsQueue.add('aggregate-daily', {
          guildId: guild.guildId,
          startTime: startTime.getTime(),
          endTime: endTime.getTime(),
        });
        jobsCreated++;
      }

      this.logger.log(
        `✅ ${jobsCreated} jobs aggregate-daily créés (${startTime.toISOString()} → ${endTime.toISOString()})`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors du scheduling quotidien: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Récupère les guilds actives (qui ont le bot)
   *
   * Pour l'instant, on agrège pour TOUTES les guilds.
   * Plus tard, on pourra filtrer par :
   * - Guilds premium uniquement
   * - Guilds avec activité récente
   * - etc.
   */
  private async getActiveGuilds(): Promise<Array<{ guildId: string }>> {
    return this.prisma.guild.findMany({
      where: {
        isActive: true,
      },
      select: {
        guildId: true,
      },
    });
  }

  /**
   * 🧹 Job de nettoyage (optionnel)
   *
   * Nettoie les vieux events (> 30 jours) pour libérer de l'espace.
   *
   * Cron: 0 2 * * * = Tous les jours à 2h du matin
   */
  @Cron('0 2 * * *')
  async scheduleCleanup() {
    this.logger.log('🧹 Déclenchement cleanup des vieux events');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.event.deleteMany({
        where: {
          timestamp: {
            lt: thirtyDaysAgo,
          },
        },
      });

      this.logger.log(
        `✅ Cleanup terminé : ${result.count} events supprimés (> 30 jours)`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors du cleanup: ${error.message}`,
        error.stack,
      );
    }
  }
}
