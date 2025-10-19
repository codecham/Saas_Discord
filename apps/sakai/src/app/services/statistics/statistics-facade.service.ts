// apps/sakai/src/app/services/statistics/statistics-facade.service.ts

import { Injectable, inject, effect } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StatisticsDataService } from './statistics-data.service';
import { StatisticsApiService } from './statistics-api.service';
import { GuildFacadeService } from '../guild/guild-facade.service';
import { ErrorHandlerService } from '../error-handler.service';
import type {
  StatsPeriod,
  MemberStatsQueryDto,
  LeaderboardQueryDto,
  ActivityTimelineQueryDto,
} from './statistics.models';

/**
 * 📊 Service Facade pour les statistiques
 * 
 * Interface publique pour les composants.
 * Orchestre l'API Service et le Data Service.
 * 
 * IMPORTANT : Ce service dépend du GuildFacadeService.
 * Une guild doit être sélectionnée avant d'utiliser ces méthodes.
 * 
 * @example
 * // Dans un composant
 * constructor() {
 *   const statsFacade = inject(StatisticsFacadeService);
 *   
 *   // Charger les stats du dashboard
 *   await statsFacade.loadDashboardStats('week');
 *   
 *   // Accéder aux données
 *   const stats = statsFacade.dashboardStats();
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class StatisticsFacadeService {
  private readonly statsData = inject(StatisticsDataService);
  private readonly statsApi = inject(StatisticsApiService);
  private readonly guildFacade = inject(GuildFacadeService);
  private readonly errorHandler = inject(ErrorHandlerService);

  // ============================================================================
  // 📖 SIGNALS PUBLICS - Exposés depuis le Data Service
  // ============================================================================

  // Dashboard
  readonly dashboardStats = this.statsData.dashboardStats;
  readonly hasDashboardStats = this.statsData.hasDashboardStats;
  readonly isLoadingDashboard = this.statsData.isLoadingDashboard;

  // Members
  readonly memberStatsList = this.statsData.memberStatsList;
  readonly selectedMemberStats = this.statsData.selectedMemberStats;
  readonly currentPageMembers = this.statsData.currentPageMembers;
  readonly totalMembers = this.statsData.totalMembers;
  readonly pagination = this.statsData.pagination;
  readonly isLoadingMembers = this.statsData.isLoadingMembers;

  // Leaderboard
  readonly leaderboard = this.statsData.leaderboard;
  readonly hasLeaderboard = this.statsData.hasLeaderboard;
  readonly topThreeMembers = this.statsData.topThreeMembers;
  readonly remainingLeaderboard = this.statsData.remainingLeaderboard;
  readonly isLoadingLeaderboard = this.statsData.isLoadingLeaderboard;

  // Activity Timeline
  readonly activityTimeline = this.statsData.activityTimeline;
  readonly isLoadingActivity = this.statsData.isLoadingActivity;

  // État global
  readonly currentPeriod = this.statsData.currentPeriod;
  readonly isLoading = this.statsData.isLoading;
  readonly error = this.statsData.error;

  // ============================================================================
  // 🔄 EFFECT - Nettoie le cache quand la guild change
  // ============================================================================

  constructor() {
    // Effect : Nettoie le cache des stats quand la guild change
    effect(() => {
      const guildId = this.guildFacade.selectedGuildId();
      
      // Si la guild change, on nettoie toutes les stats
      if (guildId) {
        console.log('[StatsFacade] Guild changed, clearing stats cache for:', guildId);
        // On ne nettoie que les données en mémoire, pas le cache
        // Le cache sera automatiquement invalidé car il contient l'ancien guildId
        this.clearStatsData();
      }
    });
  }

  // ============================================================================
  // 📊 DASHBOARD STATS
  // ============================================================================

  /**
   * Charge les stats du dashboard pour la guild sélectionnée
   * 
   * @param period - Période des stats ('today' | 'week' | 'month' | 'all')
   * @param forceRefresh - Force le rechargement même si en cache
   * @throws Error si aucune guild n'est sélectionnée
   * 
   * @example
   * await statsFacade.loadDashboardStats('week');
   * const stats = statsFacade.dashboardStats();
   */
  async loadDashboardStats(
    period: StatsPeriod = 'week',
    forceRefresh: boolean = false
  ): Promise<void> {
    const guildId = this.getSelectedGuildId();
    
    console.log('[StatsFacade] Loading dashboard stats', { guildId, period, forceRefresh });

    // Vérifier le cache si pas de force refresh
    if (!forceRefresh) {
      const cached = this.statsData.getCachedDashboard(guildId, period);
      if (cached) {
        console.log('[StatsFacade] Using cached dashboard stats');
        this.statsData.setDashboardStats(cached);
        this.statsData.setCurrentPeriod(period);
        return;
      }
    }

    this.statsData.setLoadingDashboard(true);
    this.statsData.setError(null);

    try {
      const stats = await firstValueFrom(
        this.statsApi.getDashboardStats(guildId, period)
      );

      this.statsData.setDashboardStats(stats, guildId);
      this.statsData.setCurrentPeriod(period);
      
      console.log('[StatsFacade] Dashboard stats loaded successfully');

    } catch (error) {
      const appError = this.errorHandler.handleError(
        error,
        'Chargement des statistiques du dashboard'
      );
      this.statsData.setError(appError.message);
      throw error;

    } finally {
      this.statsData.setLoadingDashboard(false);
    }
  }

  /**
   * Rafraîchit les stats du dashboard (force le rechargement)
   */
  async refreshDashboardStats(): Promise<void> {
    const currentPeriod = this.statsData.currentPeriod();
    await this.loadDashboardStats(currentPeriod, true);
  }

  // ============================================================================
  // 👥 MEMBER STATS
  // ============================================================================

  /**
   * Charge la liste des membres avec leurs stats
   * 
   * @param query - Paramètres de filtrage et pagination
   * @param forceRefresh - Force le rechargement même si en cache
   * 
   * @example
   * await statsFacade.loadMemberStats({
   *   page: 1,
   *   pageSize: 20,
   *   sortBy: 'messages',
   *   sortOrder: 'desc',
   *   activeOnly: true
   * });
   */
  async loadMemberStats(
    query: MemberStatsQueryDto = {},
    forceRefresh: boolean = false
  ): Promise<void> {
    const guildId = this.getSelectedGuildId();
    
    // Générer un hash unique pour cette query
    const queryHash = this.statsApi.generateMemberQueryHash(query);
    
    console.log('[StatsFacade] Loading member stats', { guildId, query, forceRefresh });

    // Vérifier le cache
    if (!forceRefresh) {
      const cached = this.statsData.getCachedMembers(guildId, queryHash);
      if (cached) {
        console.log('[StatsFacade] Using cached member stats');
        this.statsData.setMemberStatsList(cached);
        return;
      }
    }

    this.statsData.setLoadingMembers(true);
    this.statsData.setError(null);

    try {
      const result = await firstValueFrom(
        this.statsApi.getMemberStats(guildId, query)
      );

      this.statsData.setMemberStatsList(result, guildId, queryHash);
      
      console.log('[StatsFacade] Member stats loaded successfully', {
        total: result.pagination.total,
        page: result.pagination.page
      });

    } catch (error) {
      const appError = this.errorHandler.handleError(
        error,
        'Chargement des statistiques des membres'
      );
      this.statsData.setError(appError.message);
      throw error;

    } finally {
      this.statsData.setLoadingMembers(false);
    }
  }

  /**
   * Charge les stats d'un membre spécifique
   * 
   * @param userId - ID du membre
   * 
   * Note: Pour l'instant utilise la liste des membres.
   * Un endpoint dédié pourrait être ajouté au backend plus tard.
   */
  async loadMemberStatsById(userId: string): Promise<void> {
    const guildId = this.getSelectedGuildId();
    
    console.log('[StatsFacade] Loading stats for member:', userId);

    this.statsData.setLoadingMembers(true);
    this.statsData.setError(null);

    try {
      const result = await firstValueFrom(
        this.statsApi.getMemberStatsById(guildId, userId)
      );

      // Prendre le premier (et seul) membre du résultat
      const memberStats = result.members[0] || null;
      this.statsData.setSelectedMemberStats(memberStats);
      
      console.log('[StatsFacade] Member stats loaded successfully');

    } catch (error) {
      const appError = this.errorHandler.handleError(
        error,
        'Chargement des statistiques du membre'
      );
      this.statsData.setError(appError.message);
      throw error;

    } finally {
      this.statsData.setLoadingMembers(false);
    }
  }

  /**
   * Rafraîchit la liste actuelle des membres
   */
  async refreshMemberStats(): Promise<void> {
    // Récréer la query depuis la pagination actuelle si disponible
    const currentPagination = this.statsData.pagination();
    if (currentPagination) {
      await this.loadMemberStats({
        page: currentPagination.page,
        pageSize: currentPagination.pageSize,
      }, true);
    } else {
      await this.loadMemberStats({}, true);
    }
  }

  // ============================================================================
  // 🏆 LEADERBOARD
  // ============================================================================

  /**
   * Charge le leaderboard de la guild
   * 
   * @param query - Paramètres du leaderboard
   * @param forceRefresh - Force le rechargement même si en cache
   * 
   * @example
   * await statsFacade.loadLeaderboard({
   *   category: 'messages',
   *   period: 'week',
   *   limit: 10
   * });
   */
  async loadLeaderboard(
    query: LeaderboardQueryDto = {},
    forceRefresh: boolean = false
  ): Promise<void> {
    const guildId = this.getSelectedGuildId();
    
    // Valeurs par défaut
    const category = query.category || 'messages';
    const period = query.period || 'all';
    const limit = query.limit || 10;
    
    console.log('[StatsFacade] Loading leaderboard', { guildId, category, period, limit });

    // Vérifier le cache
    if (!forceRefresh) {
      const cached = this.statsData.getCachedLeaderboard(guildId, category, period);
      if (cached) {
        console.log('[StatsFacade] Using cached leaderboard');
        this.statsData.setLeaderboard(cached);
        return;
      }
    }

    this.statsData.setLoadingLeaderboard(true);
    this.statsData.setError(null);

    try {
      const leaderboard = await firstValueFrom(
        this.statsApi.getLeaderboard(guildId, { category, period, limit })
      );

      this.statsData.setLeaderboard(leaderboard, guildId);
      
      console.log('[StatsFacade] Leaderboard loaded successfully', {
        entries: leaderboard.entries.length
      });

    } catch (error) {
      const appError = this.errorHandler.handleError(
        error,
        'Chargement du classement'
      );
      this.statsData.setError(appError.message);
      throw error;

    } finally {
      this.statsData.setLoadingLeaderboard(false);
    }
  }

  /**
   * Rafraîchit le leaderboard actuel
   */
  async refreshLeaderboard(): Promise<void> {
    const currentLeaderboard = this.statsData.leaderboard();
    if (currentLeaderboard) {
      await this.loadLeaderboard({
        category: currentLeaderboard.category,
        period: currentLeaderboard.period,
      }, true);
    } else {
      await this.loadLeaderboard({}, true);
    }
  }

  // ============================================================================
  // 📈 ACTIVITY TIMELINE
  // ============================================================================

  /**
   * Charge la timeline d'activité pour les graphiques
   * 
   * @param query - Paramètres de la timeline
   * @param forceRefresh - Force le rechargement même si en cache
   * 
   * @example
   * await statsFacade.loadActivityTimeline({
   *   period: 'week',
   *   granularity: 'day'
   * });
   */
  async loadActivityTimeline(
    query: ActivityTimelineQueryDto = {},
    forceRefresh: boolean = false
  ): Promise<void> {
    const guildId = this.getSelectedGuildId();
    
    // Valeurs par défaut
    const period = query.period || 'week';
    const granularity = query.granularity || 'day';
    
    console.log('[StatsFacade] Loading activity timeline', { guildId, period, granularity });

    // Vérifier le cache
    if (!forceRefresh) {
      const cached = this.statsData.getCachedActivity(guildId, period, granularity);
      if (cached) {
        console.log('[StatsFacade] Using cached activity timeline');
        this.statsData.setActivityTimeline(cached);
        return;
      }
    }

    this.statsData.setLoadingActivity(true);
    this.statsData.setError(null);

    try {
      const timeline = await firstValueFrom(
        this.statsApi.getActivityTimeline(guildId, { period, granularity })
      );

      this.statsData.setActivityTimeline(timeline, guildId);
      
      console.log('[StatsFacade] Activity timeline loaded successfully', {
        dataPoints: timeline.dataPoints.length
      });

    } catch (error) {
      const appError = this.errorHandler.handleError(
        error,
        'Chargement de la timeline d\'activité'
      );
      this.statsData.setError(appError.message);
      throw error;

    } finally {
      this.statsData.setLoadingActivity(false);
    }
  }

  /**
   * Rafraîchit la timeline d'activité actuelle
   */
  async refreshActivityTimeline(): Promise<void> {
    const currentTimeline = this.statsData.activityTimeline();
    if (currentTimeline) {
      await this.loadActivityTimeline({
        period: currentTimeline.period,
        granularity: currentTimeline.granularity,
      }, true);
    } else {
      await this.loadActivityTimeline({}, true);
    }
  }

  // ============================================================================
  // 🛠️ MÉTHODES UTILITAIRES
  // ============================================================================

  /**
   * Change la période actuelle et recharge les stats nécessaires
   * 
   * @param period - Nouvelle période
   * @param reloadDashboard - Recharger le dashboard
   * @param reloadLeaderboard - Recharger le leaderboard
   * 
   * @example
   * await statsFacade.changePeriod('month', true, true);
   */
  async changePeriod(
    period: StatsPeriod,
    reloadDashboard: boolean = true,
    reloadLeaderboard: boolean = false
  ): Promise<void> {
    console.log('[StatsFacade] Changing period to:', period);
    
    this.statsData.setCurrentPeriod(period);

    const promises: Promise<void>[] = [];

    if (reloadDashboard) {
      promises.push(this.loadDashboardStats(period));
    }

    if (reloadLeaderboard && this.statsData.leaderboard()) {
      const currentLeaderboard = this.statsData.leaderboard()!;
      promises.push(this.loadLeaderboard({
        category: currentLeaderboard.category,
        period,
      }));
    }

    await Promise.all(promises);
  }

  /**
   * Efface toutes les données stats (mais garde le cache)
   */
  clearStatsData(): void {
    console.log('[StatsFacade] Clearing stats data');
    this.statsData.clearAll();
  }

  /**
   * Efface tout le cache
   */
  clearCache(): void {
    console.log('[StatsFacade] Clearing stats cache');
    this.statsData.clearCache();
  }

  /**
   * Efface le cache pour la guild actuellement sélectionnée
   */
  clearCacheForCurrentGuild(): void {
    const guildId = this.guildFacade.selectedGuildId();
    if (guildId) {
      console.log('[StatsFacade] Clearing cache for guild:', guildId);
      this.statsData.clearCacheForGuild(guildId);
    }
  }

  /**
   * Rafraîchit toutes les stats actuellement chargées
   */
  async refreshAllStats(): Promise<void> {
    console.log('[StatsFacade] Refreshing all stats');

    const promises: Promise<void>[] = [];

    // Dashboard si chargé
    if (this.statsData.hasDashboardStats()) {
      promises.push(this.refreshDashboardStats());
    }

    // Leaderboard si chargé
    if (this.statsData.hasLeaderboard()) {
      promises.push(this.refreshLeaderboard());
    }

    // Members si chargé
    if (this.statsData.memberStatsList()) {
      promises.push(this.refreshMemberStats());
    }

    // Activity si chargé
    if (this.statsData.activityTimeline()) {
      promises.push(this.refreshActivityTimeline());
    }

    await Promise.all(promises);
  }

  // ============================================================================
  // 🔒 MÉTHODES PRIVÉES
  // ============================================================================

  /**
   * Récupère l'ID de la guild sélectionnée
   * @throws Error si aucune guild n'est sélectionnée
   */
  private getSelectedGuildId(): string {
    const guildId = this.guildFacade.selectedGuildId();
    
    if (!guildId) {
      throw new Error(
        '[StatsFacade] No guild selected. Please select a guild before loading statistics.'
      );
    }

    return guildId;
  }
}