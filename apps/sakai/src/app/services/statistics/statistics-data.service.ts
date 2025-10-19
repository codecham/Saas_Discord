import { Injectable, signal, computed } from '@angular/core';
import type {
  DashboardStatsDto,
  MemberStatsDto,
  MemberStatsListDto,
  LeaderboardDto,
  ActivityTimelineDto,
  StatsPeriod,
} from './statistics.models';
import { 
  CacheEntry, 
  createCacheEntry, 
  isCacheValid 
} from './statistics.models';

/**
 * 📊 Service de gestion de l'état des statistiques
 * 
 * Responsabilités :
 * - Stocker l'état des données stats en signals
 * - Gérer le cache local (5 minutes TTL par défaut)
 * - Transformer les données si nécessaire
 * - Exposer des computed signals pour la logique dérivée
 */
@Injectable({
  providedIn: 'root'
})
export class StatisticsDataService {
  
  // ============================================================================
  // 🔒 SIGNALS PRIVÉS - État interne
  // ============================================================================

  /**
   * Stats du dashboard de la guild actuelle
   */
  private readonly _dashboardStats = signal<DashboardStatsDto | null>(null);

  /**
   * Liste paginée des membres avec leurs stats
   */
  private readonly _memberStatsList = signal<MemberStatsListDto | null>(null);

  /**
   * Stats d'un membre spécifique
   */
  private readonly _selectedMemberStats = signal<MemberStatsDto | null>(null);

  /**
   * Leaderboard actuel
   */
  private readonly _leaderboard = signal<LeaderboardDto | null>(null);

  /**
   * Timeline d'activité pour les graphiques
   */
  private readonly _activityTimeline = signal<ActivityTimelineDto | null>(null);

  /**
   * Période actuellement sélectionnée
   */
  private readonly _currentPeriod = signal<StatsPeriod>('week');

  /**
   * État de chargement du dashboard
   */
  private readonly _isLoadingDashboard = signal<boolean>(false);

  /**
   * État de chargement des membres
   */
  private readonly _isLoadingMembers = signal<boolean>(false);

  /**
   * État de chargement du leaderboard
   */
  private readonly _isLoadingLeaderboard = signal<boolean>(false);

  /**
   * État de chargement de l'activity timeline
   */
  private readonly _isLoadingActivity = signal<boolean>(false);

  /**
   * Erreur éventuelle
   */
  private readonly _error = signal<string | null>(null);

  // ============================================================================
  // 📖 SIGNALS PUBLICS READ-ONLY
  // ============================================================================

  readonly dashboardStats = this._dashboardStats.asReadonly();
  readonly memberStatsList = this._memberStatsList.asReadonly();
  readonly selectedMemberStats = this._selectedMemberStats.asReadonly();
  readonly leaderboard = this._leaderboard.asReadonly();
  readonly activityTimeline = this._activityTimeline.asReadonly();
  readonly currentPeriod = this._currentPeriod.asReadonly();
  readonly isLoadingDashboard = this._isLoadingDashboard.asReadonly();
  readonly isLoadingMembers = this._isLoadingMembers.asReadonly();
  readonly isLoadingLeaderboard = this._isLoadingLeaderboard.asReadonly();
  readonly isLoadingActivity = this._isLoadingActivity.asReadonly();
  readonly error = this._error.asReadonly();

  // ============================================================================
  // 🧮 COMPUTED SIGNALS
  // ============================================================================

  /**
   * Indique si au moins une requête est en cours
   */
  readonly isLoading = computed(() => 
    this._isLoadingDashboard() || 
    this._isLoadingMembers() || 
    this._isLoadingLeaderboard() ||
    this._isLoadingActivity()
  );

  /**
   * Indique si des stats dashboard sont chargées
   */
  readonly hasDashboardStats = computed(() => this._dashboardStats() !== null);

  /**
   * Indique si un leaderboard est chargé
   */
  readonly hasLeaderboard = computed(() => this._leaderboard() !== null);

  /**
   * Nombre total de membres dans la liste actuelle
   */
  readonly totalMembers = computed(() => 
    this._memberStatsList()?.pagination.total || 0
  );

  /**
   * Membres de la page actuelle
   */
  readonly currentPageMembers = computed(() => 
    this._memberStatsList()?.members || []
  );

  /**
   * Pagination info
   */
  readonly pagination = computed(() => 
    this._memberStatsList()?.pagination || null
  );

  /**
   * Top 3 membres du leaderboard
   */
  readonly topThreeMembers = computed(() => {
    const entries = this._leaderboard()?.entries || [];
    return entries.slice(0, 3);
  });

  /**
   * Entrées du leaderboard après le top 3
   */
  readonly remainingLeaderboard = computed(() => {
    const entries = this._leaderboard()?.entries || [];
    return entries.slice(3);
  });

  // ============================================================================
  // 💾 CACHE LOCAL
  // ============================================================================

  /**
   * TTL du cache en millisecondes (5 minutes par défaut)
   */
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Cache pour le dashboard par guild et période
   * Map<"guildId:period", CacheEntry<DashboardStatsDto>>
   */
  private dashboardCache = new Map<string, CacheEntry<DashboardStatsDto>>();

  /**
   * Cache pour le leaderboard par guild, catégorie et période
   * Map<"guildId:category:period", CacheEntry<LeaderboardDto>>
   */
  private leaderboardCache = new Map<string, CacheEntry<LeaderboardDto>>();

  /**
   * Cache pour les members par guild et query params
   * Map<"guildId:queryHash", CacheEntry<MemberStatsListDto>>
   */
  private membersCache = new Map<string, CacheEntry<MemberStatsListDto>>();

  /**
   * Cache pour l'activity timeline par guild, période et granularité
   * Map<"guildId:period:granularity", CacheEntry<ActivityTimelineDto>>
   */
  private activityCache = new Map<string, CacheEntry<ActivityTimelineDto>>();

  // ============================================================================
  // ✍️ SETTERS - Méthodes publiques pour modifier l'état
  // ============================================================================

  setDashboardStats(stats: DashboardStatsDto | null, guildId?: string): void {
    this._dashboardStats.set(stats);
    
    // Mettre en cache si on a un guildId
    if (stats && guildId) {
      const cacheKey = this.getDashboardCacheKey(guildId, stats.period);
      this.dashboardCache.set(cacheKey, createCacheEntry(stats, this.CACHE_TTL));
    }
  }

  setMemberStatsList(list: MemberStatsListDto | null, guildId?: string, queryHash?: string): void {
    this._memberStatsList.set(list);
    
    // Mettre en cache si on a un guildId et queryHash
    if (list && guildId && queryHash) {
      const cacheKey = this.getMembersCacheKey(guildId, queryHash);
      this.membersCache.set(cacheKey, createCacheEntry(list, this.CACHE_TTL));
    }
  }

  setSelectedMemberStats(stats: MemberStatsDto | null): void {
    this._selectedMemberStats.set(stats);
  }

  setLeaderboard(leaderboard: LeaderboardDto | null, guildId?: string): void {
    this._leaderboard.set(leaderboard);
    
    // Mettre en cache si on a un guildId
    if (leaderboard && guildId) {
      const cacheKey = this.getLeaderboardCacheKey(
        guildId, 
        leaderboard.category, 
        leaderboard.period
      );
      this.leaderboardCache.set(cacheKey, createCacheEntry(leaderboard, this.CACHE_TTL));
    }
  }

  setActivityTimeline(timeline: ActivityTimelineDto | null, guildId?: string): void {
    this._activityTimeline.set(timeline);
    
    // Mettre en cache si on a un guildId
    if (timeline && guildId) {
      const cacheKey = this.getActivityCacheKey(
        guildId, 
        timeline.period, 
        timeline.granularity
      );
      this.activityCache.set(cacheKey, createCacheEntry(timeline, this.CACHE_TTL));
    }
  }

  setCurrentPeriod(period: StatsPeriod): void {
    this._currentPeriod.set(period);
  }

  setLoadingDashboard(loading: boolean): void {
    this._isLoadingDashboard.set(loading);
  }

  setLoadingMembers(loading: boolean): void {
    this._isLoadingMembers.set(loading);
  }

  setLoadingLeaderboard(loading: boolean): void {
    this._isLoadingLeaderboard.set(loading);
  }

  setLoadingActivity(loading: boolean): void {
    this._isLoadingActivity.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  // ============================================================================
  // 🗑️ CLEAR METHODS
  // ============================================================================

  /**
   * Efface toutes les données stats
   */
  clearAll(): void {
    this._dashboardStats.set(null);
    this._memberStatsList.set(null);
    this._selectedMemberStats.set(null);
    this._leaderboard.set(null);
    this._activityTimeline.set(null);
    this._currentPeriod.set('week');
    this._isLoadingDashboard.set(false);
    this._isLoadingMembers.set(false);
    this._isLoadingLeaderboard.set(false);
    this._isLoadingActivity.set(false);
    this._error.set(null);
  }

  /**
   * Efface tout le cache
   */
  clearCache(): void {
    this.dashboardCache.clear();
    this.leaderboardCache.clear();
    this.membersCache.clear();
    this.activityCache.clear();
  }

  /**
   * Efface le cache pour une guild spécifique
   */
  clearCacheForGuild(guildId: string): void {
    // Dashboard
    for (const key of this.dashboardCache.keys()) {
      if (key.startsWith(`${guildId}:`)) {
        this.dashboardCache.delete(key);
      }
    }

    // Leaderboard
    for (const key of this.leaderboardCache.keys()) {
      if (key.startsWith(`${guildId}:`)) {
        this.leaderboardCache.delete(key);
      }
    }

    // Members
    for (const key of this.membersCache.keys()) {
      if (key.startsWith(`${guildId}:`)) {
        this.membersCache.delete(key);
      }
    }

    // Activity
    for (const key of this.activityCache.keys()) {
      if (key.startsWith(`${guildId}:`)) {
        this.activityCache.delete(key);
      }
    }
  }

  // ============================================================================
  // 📦 CACHE GETTERS
  // ============================================================================

  /**
   * Récupère le dashboard depuis le cache s'il est valide
   */
  getCachedDashboard(guildId: string, period: StatsPeriod): DashboardStatsDto | null {
    const cacheKey = this.getDashboardCacheKey(guildId, period);
    const cached = this.dashboardCache.get(cacheKey);
    
    if (cached && isCacheValid(cached)) {
      return cached.data;
    }
    
    // Cache expiré, on le supprime
    if (cached) {
      this.dashboardCache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Récupère le leaderboard depuis le cache s'il est valide
   */
  getCachedLeaderboard(
    guildId: string, 
    category: 'messages' | 'voice' | 'reactions' | 'overall',
    period: StatsPeriod
  ): LeaderboardDto | null {
    const cacheKey = this.getLeaderboardCacheKey(guildId, category, period);
    const cached = this.leaderboardCache.get(cacheKey);
    
    if (cached && isCacheValid(cached)) {
      return cached.data;
    }
    
    if (cached) {
      this.leaderboardCache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Récupère la liste de membres depuis le cache s'il est valide
   */
  getCachedMembers(guildId: string, queryHash: string): MemberStatsListDto | null {
    const cacheKey = this.getMembersCacheKey(guildId, queryHash);
    const cached = this.membersCache.get(cacheKey);
    
    if (cached && isCacheValid(cached)) {
      return cached.data;
    }
    
    if (cached) {
      this.membersCache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Récupère l'activity timeline depuis le cache s'il est valide
   */
  getCachedActivity(
    guildId: string, 
    period: StatsPeriod,
    granularity: 'hour' | 'day' | 'week'
  ): ActivityTimelineDto | null {
    const cacheKey = this.getActivityCacheKey(guildId, period, granularity);
    const cached = this.activityCache.get(cacheKey);
    
    if (cached && isCacheValid(cached)) {
      return cached.data;
    }
    
    if (cached) {
      this.activityCache.delete(cacheKey);
    }
    
    return null;
  }

  // ============================================================================
  // 🔑 CACHE KEY HELPERS - Privé
  // ============================================================================

  private getDashboardCacheKey(guildId: string, period: StatsPeriod): string {
    return `${guildId}:${period}`;
  }

  private getLeaderboardCacheKey(
    guildId: string, 
    category: string, 
    period: StatsPeriod
  ): string {
    return `${guildId}:${category}:${period}`;
  }

  private getMembersCacheKey(guildId: string, queryHash: string): string {
    return `${guildId}:${queryHash}`;
  }

  private getActivityCacheKey(
    guildId: string, 
    period: StatsPeriod, 
    granularity: string
  ): string {
    return `${guildId}:${period}:${granularity}`;
  }
}