/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 📅 Service de planification des tâches statistiques
 *
 * Responsabilités :
 * - Cleanup automatique des anciennes données
 * - Agrégation mensuelle (StatsDaily → StatsMonthly)
 * - Gestion de la rétention des données
 *
 * Architecture Stats V2 :
 * - Table events : rétention 30 jours (TimescaleDB auto + backup manuel)
 * - Table stats_daily : rétention 90 jours (cleanup manuel)
 * - Table stats_monthly : illimité (historique long terme)
 * - Table member_stats : illimité (compteurs cumulatifs)
 */
@Injectable()
export class StatsSchedulerService {
  private readonly logger = new Logger(StatsSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 🧹 Cleanup des events anciens
   *
   * Nettoie les events de plus de 30 jours pour libérer de l'espace.
   * TimescaleDB a déjà une retention policy automatique, mais ce cron
   * sert de backup manuel.
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
        `✅ Cleanup events terminé : ${result.count} events supprimés (> 30 jours)`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors du cleanup events: ${error.message}`,
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
        `✅ Agrégation mensuelle terminée : ${totalAggregated} membres agrégés pour ${guildsWithStats.length} guilds`,
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
   *
   * @private
   */
  private async aggregateGuildMonth(
    guildId: string,
    monthStart: Date,
    monthEnd: Date,
  ): Promise<number> {
    // Grouper par membre et sommer les stats du mois
    const monthlyStats = await this.prisma.statsDaily.groupBy({
      by: ['guildId', 'userId'],
      where: {
        guildId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: {
        messagesSent: true,
        voiceMinutes: true,
        reactionsGiven: true,
        reactionsReceived: true,
      },
      _count: {
        date: true, // Nombre de jours actifs
      },
    });

    if (monthlyStats.length === 0) {
      this.logger.debug(`Aucune stat pour guild ${guildId} ce mois`);
      return 0;
    }

    // Créer ou mettre à jour les entrées StatsMonthly
    const updates = monthlyStats.map((stat) => {
      const totalMessages = stat._sum.messagesSent || 0;
      const totalVoice = stat._sum.voiceMinutes || 0;
      const totalReactionsGiven = stat._sum.reactionsGiven || 0;
      const totalReactionsReceived = stat._sum.reactionsReceived || 0;
      const daysActive = stat._count.date;

      // Calculer moyennes
      const avgMessagesPerDay = daysActive > 0 ? totalMessages / daysActive : 0;
      const avgVoicePerDay = daysActive > 0 ? totalVoice / daysActive : 0;

      return this.prisma.statsMonthly.upsert({
        where: {
          guildId_userId_month: {
            guildId: stat.guildId,
            userId: stat.userId,
            month: monthStart,
          },
        },
        update: {
          totalMessages,
          totalVoiceMinutes: totalVoice,
          totalReactionsGiven,
          totalReactionsReceived,
          avgMessagesPerDay,
          avgVoicePerDay,
        },
        create: {
          guildId: stat.guildId,
          userId: stat.userId,
          month: monthStart,
          totalMessages,
          totalVoiceMinutes: totalVoice,
          totalReactionsGiven,
          totalReactionsReceived,
          avgMessagesPerDay,
          avgVoicePerDay,
        },
      });
    });

    await Promise.all(updates);

    this.logger.debug(
      `📊 Guild ${guildId} : ${monthlyStats.length} membres agrégés`,
    );

    return monthlyStats.length;
  }

  /**
   * Récupère les guilds actives (qui ont le bot)
   *
   * @private
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
}
