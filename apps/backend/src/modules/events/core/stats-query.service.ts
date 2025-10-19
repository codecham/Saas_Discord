/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  DashboardStatsDto,
  MemberStatsDto,
  MemberStatsListDto,
  LeaderboardDto,
  ActivityTimelineDto,
  StatsPeriod,
  MemberStatsQueryDto,
  LeaderboardQueryDto,
  ActivityTimelineQueryDto,
} from '@my-project/shared-types';

/**
 * 📊 Service de requêtes pour les statistiques
 *
 * Responsabilités :
 * - Calculer les périodes (today, week, month, all)
 * - Requêtes complexes pour dashboard, leaderboard, timeline
 * - Agrégations et calculs de comparaisons
 */
@Injectable()
export class StatsQueryService {
  private readonly logger = new Logger(StatsQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 📊 Dashboard Stats
   */
  async getDashboardStats(
    guildId: string,
    period: StatsPeriod = 'week',
  ): Promise<DashboardStatsDto> {
    const { startDate, endDate } = this.getPeriodDates(period);
    const { startDate: prevStartDate, endDate: prevEndDate } =
      this.getPreviousPeriodDates(period, startDate);

    // Stats période actuelle
    const currentStats = await this.getAggregatedStats(
      guildId,
      startDate,
      endDate,
    );

    // Stats période précédente (pour comparaison)
    const previousStats = await this.getAggregatedStats(
      guildId,
      prevStartDate,
      prevEndDate,
    );

    // Top 3 membres
    const topMembers = await this.prisma.memberStats.findMany({
      where: { guildId },
      orderBy: { totalMessages: 'desc' },
      take: 3,
      select: {
        userId: true,
        totalMessages: true,
        totalVoiceMinutes: true,
      },
    });

    // Calcul des changements (%)
    const messagesChange = this.calculatePercentageChange(
      currentStats.totalMessages,
      previousStats.totalMessages,
    );
    const voiceMinutesChange = this.calculatePercentageChange(
      currentStats.totalVoiceMinutes,
      previousStats.totalVoiceMinutes,
    );
    const reactionsChange = this.calculatePercentageChange(
      currentStats.totalReactions,
      previousStats.totalReactions,
    );
    const activeUsersChange = this.calculatePercentageChange(
      currentStats.uniqueActiveUsers,
      previousStats.uniqueActiveUsers,
    );

    return {
      guildId,
      period,
      totalMessages: currentStats.totalMessages,
      totalVoiceMinutes: currentStats.totalVoiceMinutes,
      totalReactions: currentStats.totalReactions,
      uniqueActiveUsers: currentStats.uniqueActiveUsers,
      messagesChange,
      voiceMinutesChange,
      reactionsChange,
      activeUsersChange,
      topMembers,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
    };
  }

  /**
   * 👥 Liste des membres avec stats
   */
  async getMemberStats(
    guildId: string,
    query: MemberStatsQueryDto = {},
  ): Promise<MemberStatsListDto> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'totalMessages',
      sortOrder = 'desc',
      minMessages = 0,
      minVoiceMinutes = 0,
      activeOnly = false,
    } = query;

    // Filtres
    const where: any = {
      guildId,
      totalMessages: { gte: minMessages },
      totalVoiceMinutes: { gte: minVoiceMinutes },
    };

    if (activeOnly) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      where.lastSeen = { gte: sevenDaysAgo };
    }

    // Compter le total
    const total = await this.prisma.memberStats.count({ where });

    // Récupérer les membres
    const members = await this.prisma.memberStats.findMany({
      where,
      orderBy: {
        [sortBy === 'messages'
          ? 'totalMessages'
          : sortBy === 'voice'
            ? 'totalVoiceMinutes'
            : sortBy === 'reactions'
              ? 'totalReactionsGiven'
              : sortBy]: sortOrder,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Transformer en DTO
    const membersDto: MemberStatsDto[] = members.map((m) => ({
      userId: m.userId,
      guildId: m.guildId,
      totalMessages: m.totalMessages,
      totalVoiceMinutes: m.totalVoiceMinutes,
      totalReactionsGiven: m.totalReactionsGiven,
      totalReactionsReceived: m.totalReactionsReceived,
      lastMessageAt: m.lastMessageAt?.toISOString() || null,
      lastVoiceAt: m.lastVoiceAt?.toISOString() || null,
      lastSeen: m.lastSeen?.toISOString() || null,
      joinedAt: m.joinedAt?.toISOString() || null,
    }));

    return {
      members: membersDto,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 🏆 Leaderboard
   */
  async getLeaderboard(
    guildId: string,
    query: LeaderboardQueryDto = {},
  ): Promise<LeaderboardDto> {
    const { category = 'messages', period = 'all', limit = 10 } = query;

    // Déterminer le champ de tri
    const sortField =
      category === 'messages'
        ? 'totalMessages'
        : category === 'voice'
          ? 'totalVoiceMinutes'
          : category === 'reactions'
            ? 'totalReactionsGiven'
            : 'totalMessages'; // overall = messages par défaut

    // Récupérer les top membres
    const topMembers = await this.prisma.memberStats.findMany({
      where: { guildId },
      orderBy: { [sortField]: 'desc' },
      take: Math.min(limit, 100), // Max 100
    });

    // Transformer en entries avec ranks
    const entries = topMembers.map((member, index) => {
      const rank = index + 1;
      const score =
        category === 'messages'
          ? member.totalMessages
          : category === 'voice'
            ? member.totalVoiceMinutes
            : category === 'reactions'
              ? member.totalReactionsGiven
              : member.totalMessages +
                member.totalVoiceMinutes +
                member.totalReactionsGiven;

      return {
        rank,
        userId: member.userId,
        score,
        totalMessages: member.totalMessages,
        totalVoiceMinutes: member.totalVoiceMinutes,
        totalReactions:
          member.totalReactionsGiven + member.totalReactionsReceived,
        badge:
          rank === 1
            ? ('gold' as const)
            : rank === 2
              ? ('silver' as const)
              : rank === 3
                ? ('bronze' as const)
                : undefined,
      };
    });

    return {
      guildId,
      category,
      period,
      entries,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * 📈 Activity Timeline
   */
  async getActivityTimeline(
    guildId: string,
    query: ActivityTimelineQueryDto = {},
  ): Promise<ActivityTimelineDto> {
    const { period = 'week', granularity = 'day' } = query;
    const { startDate, endDate } = this.getPeriodDates(period);

    // Requête pour récupérer les snapshots agrégés
    const snapshots = await this.prisma.metricsSnapshot.findMany({
      where: {
        guildId,
        periodStart: { gte: startDate },
        periodEnd: { lte: endDate },
        periodType:
          granularity === 'hour'
            ? '5min'
            : granularity === 'day'
              ? 'hourly'
              : 'daily',
      },
      orderBy: { periodStart: 'asc' },
    });

    // Si pas de snapshots, créer des points vides
    const dataPoints =
      snapshots.length > 0
        ? snapshots.map((s) => ({
            timestamp: s.periodStart.toISOString(),
            totalMessages: s.totalMessages || 0,
            totalVoiceMinutes: s.totalVoiceMinutes || 0,
            totalReactions: s.totalReactions || 0,
            uniqueActiveUsers: s.uniqueActiveUsers || 0,
          }))
        : this.generateEmptyDataPoints(startDate, endDate, granularity);

    return {
      guildId,
      period,
      granularity,
      dataPoints,
    };
  }

  /**
   * Calcule les stats agrégées pour une période
   */
  private async getAggregatedStats(
    guildId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalMessages: number;
    totalVoiceMinutes: number;
    totalReactions: number;
    uniqueActiveUsers: number;
  }> {
    // Compter depuis les events bruts
    const eventCounts = await this.prisma.event.groupBy({
      by: ['type'],
      where: {
        guildId,
        timestamp: { gte: startDate, lte: endDate },
      },
      _count: { type: true },
    });

    const totalMessages =
      eventCounts.find((e) => e.type === 'MESSAGE_CREATE')?._count.type || 0;
    const totalReactions =
      eventCounts.find((e) => e.type === 'MESSAGE_REACTION_ADD')?._count.type ||
      0;
    const voiceEvents =
      eventCounts.find((e) => e.type === 'VOICE_STATE_UPDATE')?._count.type ||
      0;
    const totalVoiceMinutes = Math.floor(voiceEvents / 2); // Estimation

    // Compter users uniques
    const uniqueUsers = await this.prisma.event.groupBy({
      by: ['userId'],
      where: {
        guildId,
        timestamp: { gte: startDate, lte: endDate },
        userId: { not: null },
      },
    });

    return {
      totalMessages,
      totalVoiceMinutes,
      totalReactions,
      uniqueActiveUsers: uniqueUsers.length,
    };
  }

  /**
   * Calcule le pourcentage de changement
   */
  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * Récupère les dates de début/fin selon la période
   */
  private getPeriodDates(period: StatsPeriod): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'all':
        startDate.setFullYear(2020, 0, 1); // 1er janvier 2020
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Récupère les dates de la période précédente (pour comparaison)
   */
  private getPreviousPeriodDates(
    period: StatsPeriod,
    currentStartDate: Date,
  ): { startDate: Date; endDate: Date } {
    const endDate = new Date(currentStartDate);
    const startDate = new Date(currentStartDate);

    switch (period) {
      case 'today':
        startDate.setDate(startDate.getDate() - 1);
        endDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        endDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(startDate.getDate() - 30);
        endDate.setDate(endDate.getDate() - 30);
        break;
      case 'all':
        // Pas de période précédente pour "all"
        return { startDate: new Date(0), endDate: new Date(0) };
    }

    return { startDate, endDate };
  }

  /**
   * Génère des points de données vides si pas de snapshots
   */
  private generateEmptyDataPoints(
    startDate: Date,
    endDate: Date,
    granularity: 'hour' | 'day' | 'week',
  ): Array<{
    timestamp: string;
    totalMessages: number;
    totalVoiceMinutes: number;
    totalReactions: number;
    uniqueActiveUsers: number;
  }> {
    const points: Array<any> = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      points.push({
        timestamp: current.toISOString(),
        totalMessages: 0,
        totalVoiceMinutes: 0,
        totalReactions: 0,
        uniqueActiveUsers: 0,
      });

      // Incrémenter selon granularité
      if (granularity === 'hour') {
        current.setHours(current.getHours() + 1);
      } else if (granularity === 'day') {
        current.setDate(current.getDate() + 1);
      } else {
        current.setDate(current.getDate() + 7);
      }
    }

    return points;
  }
}
