// apps/backend/src/modules/events/controllers/events.controller.ts
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StatsQueryService } from '../core/stats-query.service';
import type {
  DashboardStatsDto,
  MemberStatsListDto,
  LeaderboardDto,
  ActivityTimelineDto,
  StatsPeriod,
  MemberStatsQueryDto,
  LeaderboardQueryDto,
  ActivityTimelineQueryDto,
} from '@my-project/shared-types';

/**
 * 📊 Controller pour les endpoints de statistiques
 *
 * Routes :
 * - GET /api/guilds/:guildId/stats/dashboard
 * - GET /api/guilds/:guildId/stats/members
 * - GET /api/guilds/:guildId/stats/leaderboard
 * - GET /api/guilds/:guildId/stats/activity
 */
@Controller('guilds/:guildId/stats')
@UseGuards(JwtAuthGuard)
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(private readonly statsQueryService: StatsQueryService) {}

  /**
   * 📊 Dashboard Stats - Vue d'ensemble du serveur
   *
   * GET /api/guilds/:guildId/stats/dashboard?period=week
   *
   * Query params :
   * - period: 'today' | 'week' | 'month' | 'all' (défaut: 'week')
   *
   * Retourne :
   * - Stats principales (messages, vocal, réactions, users actifs)
   * - Comparaison avec période précédente (%)
   * - Top 3 membres les plus actifs
   */
  @Get('dashboard')
  async getDashboard(
    @Param('guildId') guildId: string,
    @Query('period') period?: StatsPeriod,
  ): Promise<DashboardStatsDto> {
    this.logger.log(
      `Dashboard stats demandé pour guild ${guildId} (période: ${period || 'week'})`,
    );

    return this.statsQueryService.getDashboardStats(guildId, period || 'week');
  }

  /**
   * 👥 Member Stats - Liste des membres avec leurs statistiques
   *
   * GET /api/guilds/:guildId/stats/members?page=1&pageSize=20&sortBy=totalMessages&sortOrder=desc
   *
   * Query params :
   * - page: Numéro de page (défaut: 1)
   * - pageSize: Taille de page (défaut: 20, max: 100)
   * - sortBy: 'messages' | 'voice' | 'reactions' | 'lastSeen' (défaut: 'messages')
   * - sortOrder: 'asc' | 'desc' (défaut: 'desc')
   * - minMessages: Nombre minimum de messages (défaut: 0)
   * - minVoiceMinutes: Nombre minimum de minutes vocales (défaut: 0)
   * - activeOnly: Seulement les membres actifs (lastSeen < 7 jours) (défaut: false)
   *
   * Retourne :
   * - Liste paginée de membres avec leurs stats
   * - Infos de pagination (total, page, totalPages)
   */
  @Get('members')
  async getMembers(
    @Param('guildId') guildId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy')
    sortBy?: 'messages' | 'voice' | 'reactions' | 'lastSeen',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('minMessages') minMessages?: string,
    @Query('minVoiceMinutes') minVoiceMinutes?: string,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<MemberStatsListDto> {
    this.logger.log(`Member stats demandés pour guild ${guildId}`);

    const query: MemberStatsQueryDto = {
      page: page ? parseInt(page, 10) : 1,
      pageSize: Math.min(pageSize ? parseInt(pageSize, 10) : 20, 100), // Max 100
      sortBy: sortBy || 'messages',
      sortOrder: sortOrder || 'desc',
      minMessages: minMessages ? parseInt(minMessages, 10) : 0,
      minVoiceMinutes: minVoiceMinutes ? parseInt(minVoiceMinutes, 10) : 0,
      activeOnly: activeOnly === 'true',
    };

    return this.statsQueryService.getMemberStats(guildId, query);
  }

  /**
   * 🏆 Leaderboard - Top membres
   *
   * GET /api/guilds/:guildId/stats/leaderboard?category=messages&period=week&limit=10
   *
   * Query params :
   * - category: 'messages' | 'voice' | 'reactions' | 'overall' (défaut: 'messages')
   * - period: 'today' | 'week' | 'month' | 'all' (défaut: 'all')
   * - limit: Nombre d'entrées (défaut: 10, max: 100)
   *
   * Retourne :
   * - Liste des top membres avec leur rank
   * - Badges or/argent/bronze pour le top 3
   * - Scores selon la catégorie
   */
  @Get('leaderboard')
  async getLeaderboard(
    @Param('guildId') guildId: string,
    @Query('category')
    category?: 'messages' | 'voice' | 'reactions' | 'overall',
    @Query('period') period?: StatsPeriod,
    @Query('limit') limit?: string,
  ): Promise<LeaderboardDto> {
    this.logger.log(
      `Leaderboard demandé pour guild ${guildId} (catégorie: ${category || 'messages'})`,
    );

    const query: LeaderboardQueryDto = {
      category: category || 'messages',
      period: period || 'all',
      limit: Math.min(limit ? parseInt(limit, 10) : 10, 100), // Max 100
    };

    return this.statsQueryService.getLeaderboard(guildId, query);
  }

  /**
   * 📈 Activity Timeline - Données pour graphiques
   *
   * GET /api/guilds/:guildId/stats/activity?period=week&granularity=day
   *
   * Query params :
   * - period: 'today' | 'week' | 'month' | 'all' (défaut: 'week')
   * - granularity: 'hour' | 'day' | 'week' (défaut: 'day')
   *
   * Retourne :
   * - Série de points de données pour graphiques
   * - Agrégation par heure/jour/semaine
   * - Messages, vocal, réactions, users actifs par point
   */
  @Get('activity')
  async getActivity(
    @Param('guildId') guildId: string,
    @Query('period') period?: StatsPeriod,
    @Query('granularity') granularity?: 'hour' | 'day' | 'week',
  ): Promise<ActivityTimelineDto> {
    this.logger.log(
      `Activity timeline demandé pour guild ${guildId} (période: ${period || 'week'}, granularité: ${granularity || 'day'})`,
    );

    const query: ActivityTimelineQueryDto = {
      period: period || 'week',
      granularity: granularity || 'day',
    };

    return this.statsQueryService.getActivityTimeline(guildId, query);
  }
}
