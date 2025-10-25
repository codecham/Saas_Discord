/* eslint-disable @typescript-eslint/no-unsafe-return */
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
  private readonly isActive5min: boolean = false;

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
    if (!this.isActive5min) {
      this.logger.log(`5 minutes aggregation disable. Pass`);
      return;
    }
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

  /**
   * 🧹 Cleanup StatsDaily > 90 jours
   *
   * Nettoie les données quotidiennes anciennes pour libérer de l'espace.
   * Les données sont déjà agrégées dans StatsMonthly avant suppression.
   *
   * Cron: 0 3 * * * = Tous les jours à 3h du matin
   */
  @Cron('0 3 * * *')
  async cleanupOldDailyStats() {
    this.logger.log('🧹 Déclenchement cleanup StatsDaily > 90 jours');

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const result = await this.prisma.statsDaily.deleteMany({
        where: {
          date: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(
        `✅ Cleanup StatsDaily terminé : ${result.count} entrées supprimées (date < ${cutoffDate.toISOString()})`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors du cleanup StatsDaily: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 📊 Agrégation mensuelle (StatsDaily → StatsMonthly)
   *
   * Agrège les stats quotidiennes du mois écoulé dans StatsMonthly.
   * Permet de garder un historique long terme sans surcharger la DB.
   *
   * Cron: 0 4 1 * * = Le 1er de chaque mois à 4h du matin
   */
  @Cron('0 4 1 * *')
  async aggregateMonthlyStats() {
    this.logger.log('📊 Déclenchement agrégation mensuelle');

    try {
      // Calculer le mois précédent
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0); // Dernier jour du mois précédent

      this.logger.log(
        `📅 Agrégation du mois : ${lastMonth.toISOString().slice(0, 7)}`,
      );

      // Récupérer toutes les guilds qui ont des stats ce mois-là
      const guildsWithStats = await this.prisma.statsDaily.findMany({
        where: {
          date: {
            gte: lastMonth,
            lte: monthEnd,
          },
        },
        select: { guildId: true },
        distinct: ['guildId'],
      });

      if (guildsWithStats.length === 0) {
        this.logger.warn('Aucune guild avec stats pour ce mois');
        return;
      }

      this.logger.log(
        `📊 ${guildsWithStats.length} guilds à agréger pour le mois`,
      );

      // Agréger chaque guild
      let totalAggregated = 0;
      for (const { guildId } of guildsWithStats) {
        const aggregated = await this.aggregateGuildMonth(
          guildId,
          lastMonth,
          monthEnd,
        );
        totalAggregated += aggregated;
      }

      this.logger.log(
        `✅ Agrégation mensuelle terminée : ${totalAggregated} membres agrégés dans ${guildsWithStats.length} guilds`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de l'agrégation mensuelle: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Agrège les stats d'une guild pour un mois donné
   */
  private async aggregateGuildMonth(
    guildId: string,
    monthStart: Date,
    monthEnd: Date,
  ): Promise<number> {
    try {
      // Agréger par membre pour ce mois
      const memberStats = await this.prisma.statsDaily.groupBy({
        by: ['userId'],
        where: {
          guildId,
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
          channelId: '__global__',
        },
        _sum: {
          messagesSent: true,
          voiceMinutes: true,
          reactionsGiven: true,
          reactionsReceived: true,
        },
      });

      // Agréger également les top channels par membre
      const topChannelsData = await this.getTopChannelsForMonth(
        guildId,
        monthStart,
        monthEnd,
      );

      // Calculer le nombre de jours dans le mois
      const daysInMonth =
        Math.ceil(
          (monthEnd.getTime() - monthStart.getTime()) / (24 * 60 * 60 * 1000),
        ) + 1;

      // Sauvegarder dans StatsMonthly
      for (const stat of memberStats) {
        const totalMessages = stat._sum.messagesSent || 0;
        const totalVoice = stat._sum.voiceMinutes || 0;
        const topChannels = topChannelsData.get(stat.userId) || [];

        await this.prisma.statsMonthly.upsert({
          where: {
            guildId_userId_month: {
              guildId,
              userId: stat.userId,
              month: monthStart,
            },
          },
          update: {
            totalMessages,
            totalVoiceMinutes: totalVoice,
            totalReactionsGiven: stat._sum.reactionsGiven || 0,
            totalReactionsReceived: stat._sum.reactionsReceived || 0,
            avgMessagesPerDay:
              daysInMonth > 0 ? totalMessages / daysInMonth : 0,
            avgVoicePerDay: daysInMonth > 0 ? totalVoice / daysInMonth : 0,
            topChannels,
          },
          create: {
            guildId,
            userId: stat.userId,
            month: monthStart,
            totalMessages,
            totalVoiceMinutes: totalVoice,
            totalReactionsGiven: stat._sum.reactionsGiven || 0,
            totalReactionsReceived: stat._sum.reactionsReceived || 0,
            avgMessagesPerDay:
              daysInMonth > 0 ? totalMessages / daysInMonth : 0,
            avgVoicePerDay: daysInMonth > 0 ? totalVoice / daysInMonth : 0,
            topChannels,
          },
        });
      }

      this.logger.debug(
        `✅ Guild ${guildId}: ${memberStats.length} membres agrégés pour ${monthStart.toISOString().slice(0, 7)}`,
      );

      return memberStats.length;
    } catch (error) {
      this.logger.error(
        `❌ Erreur agrégation guild ${guildId}: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * Récupère les top 5 channels par membre pour un mois donné
   */
  private async getTopChannelsForMonth(
    guildId: string,
    monthStart: Date,
    monthEnd: Date,
  ): Promise<Map<string, any[]>> {
    const result = new Map<string, any[]>();

    // Agréger messages par userId + channelId
    const channelStats = await this.prisma.statsDaily.groupBy({
      by: ['userId', 'channelId'],
      where: {
        guildId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
        channelId: {
          not: '__global__', // Exclure les stats globales
        },
      },
      _sum: {
        messagesSent: true,
        voiceMinutes: true,
      },
    });

    // Grouper par userId et trier
    const userChannels = new Map<
      string,
      Array<{
        channelId: string;
        messages: number;
        voiceMinutes: number;
      }>
    >();

    for (const stat of channelStats) {
      if (!userChannels.has(stat.userId)) {
        userChannels.set(stat.userId, []);
      }

      userChannels.get(stat.userId)!.push({
        channelId: stat.channelId,
        messages: stat._sum.messagesSent || 0,
        voiceMinutes: stat._sum.voiceMinutes || 0,
      });
    }

    // Garder seulement le top 5 par utilisateur
    for (const [userId, channels] of userChannels.entries()) {
      const top5 = channels.sort((a, b) => b.messages - a.messages).slice(0, 5);

      result.set(userId, top5);
    }

    return result;
  }
}
