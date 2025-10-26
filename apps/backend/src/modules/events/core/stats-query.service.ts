import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GuildStatsResponse,
  MemberStatsResponse,
  MembersStatsListResponse,
  RankingsResponse,
  TimelineResponse,
  GetGuildStatsRequest,
  GetMemberStatsRequest,
  GetMembersStatsRequest,
  GetRankingsRequest,
  GetTimelineRequest,
  StatsPeriod,
  StatsMetricType,
  StatsSortBy,
  StatsSortOrder,
} from '@my-project/shared-types';

/**
 * 📊 Service de requêtes pour les statistiques v2
 *
 * Sources de données :
 * - MemberStats : Stats cumulatives temps réel
 * - StatsDaily : Stats détaillées par jour
 */
@Injectable()
export class StatsQueryService {
  private readonly logger = new Logger(StatsQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 📊 Stats globales de la guild (Dashboard)
   */
  async getGuildStats(
    request: GetGuildStatsRequest,
  ): Promise<GuildStatsResponse> {
    const { guildId, period = StatsPeriod.WEEK } = request;
    const { startDate, endDate } = this.getPeriodDates(period);
    const { startDate: prevStartDate, endDate: prevEndDate } =
      this.getPreviousPeriodDates(period, startDate);

    // Stats période actuelle
    const current = await this.getAggregatedStats(guildId, startDate, endDate);

    // Stats période précédente
    const previous = await this.getAggregatedStats(
      guildId,
      prevStartDate,
      prevEndDate,
    );

    // Timeline
    const timeline = await this.getTimeline(guildId, startDate, endDate);

    // Top membres
    const topMessagesSenders = await this.getTopMembers(guildId, 'messages', 3);
    const topVoiceUsers = await this.getTopMembers(guildId, 'voice', 3);

    // Insights & health score
    const insights = this.generateInsights(current, previous);
    const healthScore = this.calculateHealthScore(current);

    return {
      guildId,
      period,
      current: {
        messages: current.messages,
        voiceMinutes: current.voiceMinutes,
        reactions: current.reactions,
        activeMembers: current.activeMembers,
      },
      previous: {
        messages: previous.messages,
        voiceMinutes: previous.voiceMinutes,
        reactions: previous.reactions,
        activeMembers: previous.activeMembers,
      },
      changes: {
        messagesChange: this.calculateChange(
          current.messages,
          previous.messages,
        ),
        voiceChange: this.calculateChange(
          current.voiceMinutes,
          previous.voiceMinutes,
        ),
        reactionsChange: this.calculateChange(
          current.reactions,
          previous.reactions,
        ),
        membersChange: this.calculateChange(
          current.activeMembers,
          previous.activeMembers,
        ),
      },
      timeline,
      topMembers: {
        messages: topMessagesSenders,
        voice: topVoiceUsers,
      },
      insights,
      healthScore,
    };
  }

  /**
   * 👤 Stats d'un membre spécifique
   */
  async getMemberStats(
    request: GetMemberStatsRequest,
  ): Promise<MemberStatsResponse> {
    const { guildId, userId, period = StatsPeriod.MONTH } = request;
    const { startDate, endDate } = this.getPeriodDates(period);

    // Stats cumulatives
    const memberStats = await this.prisma.memberStats.findUnique({
      where: {
        idx_member_stats_unique: { guildId, userId },
      },
    });

    if (!memberStats) {
      return this.getEmptyMemberStats(guildId, userId, period);
    }

    // ✅ Stats de la période: SUM de tous les channels
    const periodStats = await this.prisma.statsDaily.aggregate({
      where: {
        guildId,
        userId,
        date: { gte: startDate, lte: endDate },
        // ❌ RETIRÉ: channelId: '__global__',
      },
      _sum: {
        messagesSent: true,
        messagesDeleted: true,
        messagesEdited: true,
        voiceMinutes: true,
        reactionsGiven: true,
        reactionsReceived: true,
      },
    });

    // Timeline
    const timeline = await this.getMemberTimeline(
      guildId,
      userId,
      startDate,
      endDate,
    );

    // Channel breakdown
    const channelBreakdown = await this.getChannelBreakdown(
      guildId,
      userId,
      startDate,
      endDate,
    );

    // Rankings
    const ranking = await this.getMemberRankings(guildId, userId);

    // Consistency score
    const consistency = await this.calculateConsistency(
      guildId,
      userId,
      startDate,
      endDate,
    );

    // Moderation flags
    const moderationFlags = this.checkModerationFlags(periodStats._sum);

    return {
      guildId,
      userId,
      period,
      totals: {
        messages: periodStats._sum.messagesSent || 0,
        voiceMinutes: periodStats._sum.voiceMinutes || 0,
        reactions: periodStats._sum.reactionsGiven || 0,
        messagesDeleted: periodStats._sum.messagesDeleted || 0,
        messagesEdited: periodStats._sum.messagesEdited || 0,
        reactionsGiven: periodStats._sum.reactionsGiven || 0,
        reactionsReceived: periodStats._sum.reactionsReceived || 0,
      },
      timeline,
      channelBreakdown,
      ranking,
      consistency,
      moderationFlags,
    };
  }

  /**
   * 📋 Liste paginée des membres
   */
  async getMembersList(
    request: GetMembersStatsRequest,
  ): Promise<MembersStatsListResponse> {
    const {
      guildId,
      page = 1,
      pageSize = 20,
      sortBy = StatsSortBy.MESSAGES,
      sortOrder = StatsSortOrder.DESC,
      minMessages,
      minVoiceMinutes,
      activeOnly,
      period = StatsPeriod.MONTH,
    } = request;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { startDate, endDate } = this.getPeriodDates(period);

    // Construire les filtres
    const where: any = { guildId };
    if (minMessages) where.totalMessages = { gte: minMessages };
    if (minVoiceMinutes) where.totalVoiceMinutes = { gte: minVoiceMinutes };
    if (activeOnly) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      where.lastSeen = { gte: sevenDaysAgo };
    }

    // Compter le total
    const total = await this.prisma.memberStats.count({ where });

    // Calculer pagination
    const totalPages = Math.ceil(total / pageSize);
    const skip = (page - 1) * pageSize;

    // Récupérer les membres
    const orderByField =
      sortBy === StatsSortBy.MESSAGES
        ? 'totalMessages'
        : sortBy === StatsSortBy.VOICE
          ? 'totalVoiceMinutes'
          : sortBy === StatsSortBy.REACTIONS
            ? 'totalReactionsGiven'
            : 'lastSeen';

    const members = await this.prisma.memberStats.findMany({
      where,
      orderBy: { [orderByField]: sortOrder },
      skip,
      take: pageSize,
    });

    return {
      members: members.map((m) => ({
        userId: m.userId,
        username: m.userId, // TODO: Enrichir avec données Discord
        avatar: null,
        stats: {
          messages: m.totalMessages,
          voiceMinutes: m.totalVoiceMinutes,
          reactions: m.totalReactionsGiven,
        },
        lastSeen: m.lastSeen?.toISOString() || null,
        joinedAt: m.joinedAt?.toISOString() || null,
      })),
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
      },
      filters: {
        minMessages,
        minVoiceMinutes,
        activeOnly,
      },
    };
  }

  /**
   * 🏆 Rankings/Leaderboard
   */
  async getRankings(request: GetRankingsRequest): Promise<RankingsResponse> {
    const {
      guildId,
      metric = StatsMetricType.ALL,
      limit = 10,
      period = StatsPeriod.MONTH,
    } = request;

    const members = await this.getTopMembers(
      guildId,
      metric,
      Math.min(limit, 50),
    );

    return {
      guildId,
      metric,
      period,
      entries: members.map((m, index) => ({
        ...m,
        badge:
          index === 0
            ? 'gold'
            : index === 1
              ? 'silver'
              : index === 2
                ? 'bronze'
                : undefined,
        stats: {
          messages: m.score, // TODO: Ajouter les autres stats
          voiceMinutes: 0,
          reactions: 0,
        },
      })),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * 📈 Timeline d'activité
   */
  async getTimelineData(
    request: GetTimelineRequest,
  ): Promise<TimelineResponse> {
    const { guildId, period = StatsPeriod.MONTH } = request;
    const { startDate, endDate } = this.getPeriodDates(period);

    const timeline = await this.getTimeline(guildId, startDate, endDate);

    // Calculer les agrégats
    const totals = timeline.reduce(
      (acc, point) => ({
        messages: acc.messages + point.messages,
        voice: acc.voice + point.voice,
        reactions: acc.reactions + point.reactions,
      }),
      { messages: 0, voice: 0, reactions: 0 },
    );

    const days = timeline.length;

    return {
      guildId,
      period,
      dataPoints: timeline,
      aggregated: {
        totalMessages: totals.messages,
        totalVoiceMinutes: totals.voice,
        totalReactions: totals.reactions,
        avgMessagesPerDay: days > 0 ? Math.round(totals.messages / days) : 0,
        avgVoicePerDay: days > 0 ? Math.round(totals.voice / days) : 0,
      },
    };
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  /**
   * Au lieu de chercher channelId = '__global__',
   * on somme TOUTES les lignes (tous channels confondus)
   */
  private async getAggregatedStats(
    guildId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // ✅ NOUVEAU: Agrégation sur TOUS les channels (pas de filtre channelId)
    const result = await this.prisma.statsDaily.aggregate({
      where: {
        guildId,
        date: { gte: startDate, lte: endDate },
        // ❌ RETIRÉ: channelId: '__global__',
      },
      _sum: {
        messagesSent: true,
        voiceMinutes: true,
        reactionsGiven: true,
      },
    });

    // Compter les membres uniques actifs
    const activeMembers = await this.prisma.statsDaily.findMany({
      where: {
        guildId,
        date: { gte: startDate, lte: endDate },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    return {
      messages: result._sum.messagesSent || 0,
      voiceMinutes: result._sum.voiceMinutes || 0,
      reactions: result._sum.reactionsGiven || 0,
      activeMembers: activeMembers.length,
    };
  }

  // ============================================
  // Même logique pour getTimeline
  // ============================================

  private async getTimeline(guildId: string, startDate: Date, endDate: Date) {
    // ✅ Group by date, SUM tous les channels
    const dailyStats = await this.prisma.statsDaily.groupBy({
      by: ['date'],
      where: {
        guildId,
        date: { gte: startDate, lte: endDate },
        // ❌ RETIRÉ: channelId: '__global__',
      },
      _sum: {
        messagesSent: true,
        voiceMinutes: true,
        reactionsGiven: true,
      },
      orderBy: { date: 'asc' },
    });

    return dailyStats.map((stat) => ({
      date: stat.date.toISOString().split('T')[0],
      messages: stat._sum.messagesSent || 0,
      voice: stat._sum.voiceMinutes || 0,
      reactions: stat._sum.reactionsGiven || 0,
    }));
  }

  private async getTopMembers(guildId: string, metric: string, limit: number) {
    const orderBy =
      metric === 'messages'
        ? 'totalMessages'
        : metric === 'voice'
          ? 'totalVoiceMinutes'
          : 'totalReactionsGiven';

    const members = await this.prisma.memberStats.findMany({
      where: { guildId },
      orderBy: { [orderBy]: 'desc' },
      take: limit,
    });

    return members.map((m, index) => ({
      userId: m.userId,
      username: m.userId, // TODO: Enrichir
      avatar: null,
      score:
        metric === 'messages'
          ? m.totalMessages
          : metric === 'voice'
            ? m.totalVoiceMinutes
            : m.totalReactionsGiven,
      rank: index + 1,
    }));
  }

  // ============================================
  // getMemberTimeline - SUM par date
  // ============================================

  private async getMemberTimeline(
    guildId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // ✅ GroupBy date, SUM tous les channels du membre
    const dailyStats = await this.prisma.statsDaily.groupBy({
      by: ['date'],
      where: {
        guildId,
        userId,
        date: { gte: startDate, lte: endDate },
        // ❌ RETIRÉ: channelId: '__global__',
      },
      _sum: {
        messagesSent: true,
        voiceMinutes: true,
        reactionsGiven: true,
      },
      orderBy: { date: 'asc' },
    });

    return dailyStats.map((stat) => ({
      date: stat.date.toISOString().split('T')[0],
      messages: stat._sum.messagesSent || 0,
      voice: stat._sum.voiceMinutes || 0,
      reactions: stat._sum.reactionsGiven || 0,
    }));
  }

  // ============================================
  // getChannelBreakdown - GARDE le groupBy channel
  // ============================================

  private async getChannelBreakdown(
    guildId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // ✅ Ici on VEUT le détail par channel, donc on garde le groupBy
    const channelStats = await this.prisma.statsDaily.groupBy({
      by: ['channelId'],
      where: {
        guildId,
        userId,
        date: { gte: startDate, lte: endDate },
        // ✅ Pas de filtre channelId ici, on veut tous les channels
      },
      _sum: {
        messagesSent: true,
        voiceMinutes: true,
      },
      orderBy: {
        _sum: {
          messagesSent: 'desc',
        },
      },
      take: 10,
    });

    return channelStats.map((stat) => ({
      channelId: stat.channelId,
      channelName: stat.channelId, // TODO: Enrichir avec nom réel
      messages: stat._sum.messagesSent || 0,
      voiceMinutes: stat._sum.voiceMinutes || 0,
    }));
  }

  private async getMemberRankings(guildId: string, userId: string) {
    const member = await this.prisma.memberStats.findUnique({
      where: {
        idx_member_stats_unique: { guildId, userId },
      },
    });

    if (!member) {
      return {
        messages: { rank: 0, total: 0 },
        voice: { rank: 0, total: 0 },
        overall: { rank: 0, total: 0 },
      };
    }

    const total = await this.prisma.memberStats.count({ where: { guildId } });

    const messagesRank = await this.prisma.memberStats.count({
      where: {
        guildId,
        totalMessages: { gt: member.totalMessages },
      },
    });

    const voiceRank = await this.prisma.memberStats.count({
      where: {
        guildId,
        totalVoiceMinutes: { gt: member.totalVoiceMinutes },
      },
    });

    return {
      messages: { rank: messagesRank + 1, total },
      voice: { rank: voiceRank + 1, total },
      overall: { rank: messagesRank + 1, total }, // Simplified
    };
  }

  private async calculateConsistency(
    guildId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const dailyStats = await this.prisma.statsDaily.findMany({
      where: {
        guildId,
        userId,
        date: { gte: startDate, lte: endDate },
        channelId: '__global__',
      },
    });

    if (dailyStats.length === 0) return 0;

    const activeDays = dailyStats.filter((s) => s.messagesSent > 0).length;
    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    );

    return totalDays > 0 ? activeDays / totalDays : 0;
  }

  private checkModerationFlags(sums: any) {
    const deleted = sums.messagesDeleted || 0;
    const sent = sums.messagesSent || 0;
    const deleteRate = sent > 0 ? deleted / sent : 0;

    return {
      highDeleteRate: deleteRate > 0.1,
      suspiciousActivity: false, // TODO: Implémenter détection
    };
  }

  private getPeriodDates(period: StatsPeriod) {
    const now = new Date();
    let days: number;

    switch (period) {
      case StatsPeriod.WEEK:
        days = 7;
        break;
      case StatsPeriod.MONTH:
        days = 30;
        break;
      case StatsPeriod.QUARTER:
        days = 90;
        break;
      default:
        days = 7;
    }

    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return { startDate, endDate: now };
  }

  private getPreviousPeriodDates(period: StatsPeriod, currentStartDate: Date) {
    const endDate = new Date(currentStartDate.getTime() - 1);
    let days: number;

    switch (period) {
      case StatsPeriod.WEEK:
        days = 7;
        break;
      case StatsPeriod.MONTH:
        days = 30;
        break;
      case StatsPeriod.QUARTER:
        days = 90;
        break;
      default:
        days = 7;
    }

    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    return { startDate, endDate };
  }

  private calculateChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private generateInsights(current: any, previous: any): string[] {
    const insights: string[] = [];

    const msgChange = this.calculateChange(current.messages, previous.messages);
    if (msgChange > 20) {
      insights.push(`Activity increased by ${msgChange}%!`);
    } else if (msgChange < -20) {
      insights.push(`Activity decreased by ${Math.abs(msgChange)}%`);
    }

    if (current.activeMembers > previous.activeMembers * 1.5) {
      insights.push('Significant growth in active members');
    }

    return insights;
  }

  private calculateHealthScore(stats: any): number {
    let score = 50;

    if (stats.messages > 100) score += 20;
    if (stats.activeMembers > 10) score += 15;
    if (stats.voiceMinutes > 60) score += 15;

    return Math.min(score, 100);
  }

  private getEmptyMemberStats(
    guildId: string,
    userId: string,
    period: StatsPeriod,
  ): MemberStatsResponse {
    return {
      guildId,
      userId,
      period,
      totals: {
        messages: 0,
        voiceMinutes: 0,
        reactions: 0,
        messagesDeleted: 0,
        messagesEdited: 0,
        reactionsGiven: 0,
        reactionsReceived: 0,
      },
      timeline: [],
      channelBreakdown: [],
      ranking: {
        messages: { rank: 0, total: 0 },
        voice: { rank: 0, total: 0 },
        overall: { rank: 0, total: 0 },
      },
      consistency: 0,
      moderationFlags: {
        highDeleteRate: false,
        suspiciousActivity: false,
      },
    };
  }
}
