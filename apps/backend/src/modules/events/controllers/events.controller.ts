import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Logger,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StatsQueryService } from '../core/stats-query.service';
import {
  // Enums
  StatsPeriod,
  StatsMetricType,
  StatsSortBy,
  StatsSortOrder,
  // Responses
  GuildStatsResponse,
  MemberStatsResponse,
  MembersStatsListResponse,
  RankingsResponse,
  TimelineResponse,
} from '@my-project/shared-types';

/**
 * 📊 Controller Stats API v2
 *
 * Routes :
 * - GET /stats/guild/:guildId           → Dashboard guild
 * - GET /stats/member/:guildId/:userId  → Stats d'un membre
 * - GET /stats/members/:guildId         → Liste paginée membres
 * - GET /stats/rankings/:guildId        → Leaderboard
 * - GET /stats/timeline/:guildId        → Timeline d'activité
 *
 * Tous les endpoints nécessitent une authentification JWT
 */
@Controller('stats')
@UseGuards(JwtAuthGuard)
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(private readonly statsQueryService: StatsQueryService) {}

  /**
   * 📊 Dashboard Guild - Vue d'ensemble du serveur
   *
   * GET /stats/guild/:guildId?period=7d
   *
   * Query params :
   * - period: '7d' | '30d' | '90d' (défaut: '7d')
   *
   * Retourne :
   * - Stats actuelles et précédentes
   * - Changements en pourcentage
   * - Timeline jour par jour
   * - Top membres (messages + voice)
   * - Insights automatiques
   * - Health score (0-100)
   */
  @Get('guild/:guildId')
  async getGuildStats(
    @Param('guildId') guildId: string,
    @Query('period') period?: StatsPeriod,
  ): Promise<GuildStatsResponse> {
    this.logger.log(`📊 Guild stats: ${guildId} (period: ${period || '7d'})`);

    // Valider la période
    const validPeriod = this.validatePeriod(period);

    return this.statsQueryService.getGuildStats({
      guildId,
      period: validPeriod,
    });
  }

  /**
   * 👤 Stats d'un membre spécifique
   *
   * GET /stats/member/:guildId/:userId?period=30d
   *
   * Query params :
   * - period: '7d' | '30d' | '90d' (défaut: '30d')
   *
   * Retourne :
   * - Totaux période (messages, voice, réactions, éditions, suppressions)
   * - Timeline jour par jour
   * - Top 10 channels du membre
   * - Rankings (position dans les classements)
   * - Score de régularité (0-1)
   * - Flags de modération
   */
  @Get('member/:guildId/:userId')
  async getMemberStats(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Query('period') period?: StatsPeriod,
  ): Promise<MemberStatsResponse> {
    this.logger.log(`👤 Member stats: ${userId} in ${guildId}`);

    const validPeriod = this.validatePeriod(period, StatsPeriod.MONTH);

    return this.statsQueryService.getMemberStats({
      guildId,
      userId,
      period: validPeriod,
    });
  }

  /**
   * 📋 Liste des membres avec leurs stats (paginée)
   *
   * GET /stats/members/:guildId?page=1&pageSize=20&sortBy=messages&sortOrder=desc
   *
   * Query params :
   * - page: Numéro de page (défaut: 1)
   * - pageSize: Taille page (défaut: 20, max: 100)
   * - sortBy: 'messages' | 'voice' | 'reactions' | 'lastSeen' (défaut: 'messages')
   * - sortOrder: 'asc' | 'desc' (défaut: 'desc')
   * - minMessages: Minimum de messages (défaut: 0)
   * - minVoiceMinutes: Minimum de minutes vocales (défaut: 0)
   * - activeOnly: Seulement membres actifs (défaut: false)
   * - period: '7d' | '30d' | '90d' (défaut: '30d')
   *
   * Retourne :
   * - Liste de membres (userId, username, avatar, stats)
   * - Infos pagination (total, page, pageSize, totalPages)
   * - Filtres appliqués
   */
  @Get('members/:guildId')
  async getMembersList(
    @Param('guildId') guildId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize: number,
    @Query('sortBy') sortBy?: StatsSortBy,
    @Query('sortOrder') sortOrder?: StatsSortOrder,
    @Query('minMessages', new DefaultValuePipe(0), ParseIntPipe)
    minMessages?: number,
    @Query('minVoiceMinutes', new DefaultValuePipe(0), ParseIntPipe)
    minVoiceMinutes?: number,
    @Query('activeOnly') activeOnly?: string, // String car query param
    @Query('period') period?: StatsPeriod,
  ): Promise<MembersStatsListResponse> {
    this.logger.log(`📋 Members list: ${guildId} (page ${page})`);

    // Valider et limiter pageSize
    const validPageSize = Math.min(Math.max(pageSize, 1), 100);

    // Valider sortBy et sortOrder
    const validSortBy = this.validateSortBy(sortBy);
    const validSortOrder = this.validateSortOrder(sortOrder);
    const validPeriod = this.validatePeriod(period, StatsPeriod.MONTH);

    // Convertir activeOnly string → boolean
    const isActiveOnly = activeOnly === 'true';

    return this.statsQueryService.getMembersList({
      guildId,
      page,
      pageSize: validPageSize,
      sortBy: validSortBy,
      sortOrder: validSortOrder,
      minMessages,
      minVoiceMinutes,
      activeOnly: isActiveOnly,
      period: validPeriod,
    });
  }

  /**
   * 🏆 Rankings / Leaderboard
   *
   * GET /stats/rankings/:guildId?metric=messages&limit=10&period=30d
   *
   * Query params :
   * - metric: 'messages' | 'voice' | 'reactions' | 'all' (défaut: 'all')
   * - limit: Nombre de résultats (défaut: 10, max: 50)
   * - period: '7d' | '30d' | '90d' (défaut: '30d')
   *
   * Retourne :
   * - Liste des top membres (rank, userId, username, avatar, score, stats)
   * - Badge pour le top 3 ('gold' | 'silver' | 'bronze')
   * - Date de dernière mise à jour
   */
  @Get('rankings/:guildId')
  async getRankings(
    @Param('guildId') guildId: string,
    @Query('metric') metric?: StatsMetricType,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('period') period?: StatsPeriod,
  ): Promise<RankingsResponse> {
    this.logger.log(`🏆 Rankings: ${guildId} (${metric || 'all'})`);

    // Valider metric
    const validMetric = this.validateMetric(metric);

    // Limiter le nombre de résultats (max 50)
    const validLimit = Math.min(Math.max(limit || 10, 1), 50);

    const validPeriod = this.validatePeriod(period, StatsPeriod.MONTH);

    return this.statsQueryService.getRankings({
      guildId,
      metric: validMetric,
      limit: validLimit,
      period: validPeriod,
    });
  }

  /**
   * 📈 Timeline d'activité pour graphiques
   *
   * GET /stats/timeline/:guildId?period=30d
   *
   * Query params :
   * - period: '7d' | '30d' | '90d' (défaut: '30d')
   *
   * Retourne :
   * - Points de données jour par jour (date, messages, voice, reactions)
   * - Statistiques agrégées sur toute la période
   * - Moyennes par jour
   */
  @Get('timeline/:guildId')
  async getTimeline(
    @Param('guildId') guildId: string,
    @Query('period') period?: StatsPeriod,
  ): Promise<TimelineResponse> {
    this.logger.log(`📈 Timeline: ${guildId}`);

    const validPeriod = this.validatePeriod(period, StatsPeriod.MONTH);

    return this.statsQueryService.getTimelineData({
      guildId,
      period: validPeriod,
    });
  }

  // ============================================
  // MÉTHODES DE VALIDATION PRIVÉES
  // ============================================

  /**
   * Valide et retourne une période valide
   */
  private validatePeriod(
    period?: StatsPeriod,
    defaultValue: StatsPeriod = StatsPeriod.WEEK,
  ): StatsPeriod {
    if (!period) return defaultValue;

    const validPeriods = Object.values(StatsPeriod);
    if (!validPeriods.includes(period)) {
      throw new BadRequestException(
        `Invalid period. Must be one of: ${validPeriods.join(', ')}`,
      );
    }

    return period;
  }

  /**
   * Valide et retourne un metric valide
   */
  private validateMetric(metric?: StatsMetricType): StatsMetricType {
    if (!metric) return StatsMetricType.ALL;

    const validMetrics = Object.values(StatsMetricType);
    if (!validMetrics.includes(metric)) {
      throw new BadRequestException(
        `Invalid metric. Must be one of: ${validMetrics.join(', ')}`,
      );
    }

    return metric;
  }

  /**
   * Valide et retourne un sortBy valide
   */
  private validateSortBy(sortBy?: StatsSortBy): StatsSortBy {
    if (!sortBy) return StatsSortBy.MESSAGES;

    const validSortBy = Object.values(StatsSortBy);
    if (!validSortBy.includes(sortBy)) {
      throw new BadRequestException(
        `Invalid sortBy. Must be one of: ${validSortBy.join(', ')}`,
      );
    }

    return sortBy;
  }

  /**
   * Valide et retourne un sortOrder valide
   */
  private validateSortOrder(sortOrder?: StatsSortOrder): StatsSortOrder {
    if (!sortOrder) return StatsSortOrder.DESC;

    const validSortOrder = Object.values(StatsSortOrder);
    if (!validSortOrder.includes(sortOrder)) {
      throw new BadRequestException(
        `Invalid sortOrder. Must be one of: ${validSortOrder.join(', ')}`,
      );
    }

    return sortOrder;
  }
}
