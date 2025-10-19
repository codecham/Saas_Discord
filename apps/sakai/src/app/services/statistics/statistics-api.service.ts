import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import type {
  DashboardStatsDto,
  MemberStatsListDto,
  LeaderboardDto,
  ActivityTimelineDto,
  StatsPeriod,
  MemberStatsQueryDto,
  LeaderboardQueryDto,
  ActivityTimelineQueryDto,
} from './statistics.models';

/**
 * 📊 Service API pour les statistiques
 * 
 * Responsabilités :
 * - Effectuer les appels HTTP vers le backend
 * - Construire les query params correctement
 * - Retourner des Observables pour que le Facade les gère
 * 
 * Endpoints disponibles :
 * - GET /api/guilds/:guildId/stats/dashboard
 * - GET /api/guilds/:guildId/stats/members
 * - GET /api/guilds/:guildId/stats/leaderboard
 * - GET /api/guilds/:guildId/stats/activity
 */
@Injectable({
  providedIn: 'root'
})
export class StatisticsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // ============================================================================
  // 📊 DASHBOARD STATS
  // ============================================================================

  /**
   * Récupère les stats du dashboard d'une guild
   * 
   * @param guildId - ID de la guild
   * @param period - Période des stats ('today' | 'week' | 'month' | 'all')
   * @returns Observable<DashboardStatsDto>
   * 
   * @example
   * getDashboardStats('123456', 'week').subscribe(stats => {
   *   console.log(stats.totalMessages); // 1547
   *   console.log(stats.messagesChange); // +23
   * });
   */
  getDashboardStats(
    guildId: string, 
    period: StatsPeriod = 'week'
  ): Observable<DashboardStatsDto> {
    const params = new HttpParams().set('period', period);

    return this.http.get<DashboardStatsDto>(
      `${this.apiUrl}/guilds/${guildId}/stats/dashboard`,
      { params }
    );
  }

  // ============================================================================
  // 👥 MEMBER STATS
  // ============================================================================

  /**
   * Récupère la liste paginée des membres avec leurs stats
   * 
   * @param guildId - ID de la guild
   * @param query - Paramètres de filtrage et tri
   * @returns Observable<MemberStatsListDto>
   * 
   * @example
   * getMemberStats('123456', {
   *   page: 1,
   *   pageSize: 20,
   *   sortBy: 'messages',
   *   sortOrder: 'desc',
   *   activeOnly: true
   * }).subscribe(result => {
   *   console.log(result.members); // Liste des membres
   *   console.log(result.pagination.total); // Total de membres
   * });
   */
  getMemberStats(
    guildId: string, 
    query: MemberStatsQueryDto = {}
  ): Observable<MemberStatsListDto> {
    let params = new HttpParams();

    // Pagination
    if (query.page !== undefined) {
      params = params.set('page', query.page.toString());
    }
    if (query.pageSize !== undefined) {
      params = params.set('pageSize', query.pageSize.toString());
    }

    // Tri
    if (query.sortBy) {
      params = params.set('sortBy', query.sortBy);
    }
    if (query.sortOrder) {
      params = params.set('sortOrder', query.sortOrder);
    }

    // Filtres
    if (query.minMessages !== undefined) {
      params = params.set('minMessages', query.minMessages.toString());
    }
    if (query.minVoiceMinutes !== undefined) {
      params = params.set('minVoiceMinutes', query.minVoiceMinutes.toString());
    }
    if (query.activeOnly !== undefined) {
      params = params.set('activeOnly', query.activeOnly.toString());
    }

    return this.http.get<MemberStatsListDto>(
      `${this.apiUrl}/guilds/${guildId}/stats/members`,
      { params }
    );
  }

  /**
   * Récupère les stats d'un membre spécifique
   * 
   * Note: Cette fonctionnalité n'est pas encore implémentée dans le backend,
   * mais on peut filtrer la liste des membres pour obtenir un membre spécifique.
   * 
   * @param guildId - ID de la guild
   * @param userId - ID du membre
   * @returns Observable avec un seul membre ou vide
   */
  getMemberStatsById(
    guildId: string, 
    userId: string
  ): Observable<MemberStatsListDto> {
    // Pour l'instant, on récupère via la liste des membres
    // Le backend pourrait ajouter un endpoint dédié plus tard:
    // GET /api/guilds/:guildId/stats/members/:userId
    
    const params = new HttpParams()
      .set('page', '1')
      .set('pageSize', '1');

    return this.http.get<MemberStatsListDto>(
      `${this.apiUrl}/guilds/${guildId}/stats/members`,
      { params }
    );
  }

  // ============================================================================
  // 🏆 LEADERBOARD
  // ============================================================================

  /**
   * Récupère le leaderboard d'une guild
   * 
   * @param guildId - ID de la guild
   * @param query - Paramètres du leaderboard
   * @returns Observable<LeaderboardDto>
   * 
   * @example
   * getLeaderboard('123456', {
   *   category: 'messages',
   *   period: 'week',
   *   limit: 10
   * }).subscribe(leaderboard => {
   *   console.log(leaderboard.entries[0]); // Top 1
   *   console.log(leaderboard.entries[0].badge); // 'gold'
   * });
   */
  getLeaderboard(
    guildId: string, 
    query: LeaderboardQueryDto = {}
  ): Observable<LeaderboardDto> {
    let params = new HttpParams();

    if (query.category) {
      params = params.set('category', query.category);
    }
    if (query.period) {
      params = params.set('period', query.period);
    }
    if (query.limit !== undefined) {
      params = params.set('limit', query.limit.toString());
    }

    return this.http.get<LeaderboardDto>(
      `${this.apiUrl}/guilds/${guildId}/stats/leaderboard`,
      { params }
    );
  }

  // ============================================================================
  // 📈 ACTIVITY TIMELINE
  // ============================================================================

  /**
   * Récupère la timeline d'activité pour les graphiques
   * 
   * @param guildId - ID de la guild
   * @param query - Paramètres de la timeline
   * @returns Observable<ActivityTimelineDto>
   * 
   * @example
   * getActivityTimeline('123456', {
   *   period: 'week',
   *   granularity: 'day'
   * }).subscribe(timeline => {
   *   timeline.dataPoints.forEach(point => {
   *     console.log(point.timestamp, point.totalMessages);
   *   });
   * });
   */
  getActivityTimeline(
    guildId: string, 
    query: ActivityTimelineQueryDto = {}
  ): Observable<ActivityTimelineDto> {
    let params = new HttpParams();

    if (query.period) {
      params = params.set('period', query.period);
    }
    if (query.granularity) {
      params = params.set('granularity', query.granularity);
    }

    return this.http.get<ActivityTimelineDto>(
      `${this.apiUrl}/guilds/${guildId}/stats/activity`,
      { params }
    );
  }

  // ============================================================================
  // 🛠️ HELPER METHODS
  // ============================================================================

  /**
   * Génère un hash unique pour les query params des membres
   * Utilisé pour le cache dans le Data Service
   * 
   * @param query - Paramètres de requête
   * @returns Hash string unique
   */
  generateMemberQueryHash(query: MemberStatsQueryDto): string {
    const keys = [
      'page',
      'pageSize',
      'sortBy',
      'sortOrder',
      'minMessages',
      'minVoiceMinutes',
      'activeOnly'
    ];

    const values = keys.map(key => {
      const value = query[key as keyof MemberStatsQueryDto];
      return value !== undefined ? `${key}=${value}` : '';
    }).filter(Boolean);

    return values.join('&');
  }

  /**
   * Construit l'URL complète d'un endpoint
   * Utile pour le debug ou les logs
   * 
   * @param path - Chemin relatif de l'endpoint
   * @returns URL complète
   */
  getFullUrl(path: string): string {
    return `${this.apiUrl}${path}`;
  }
}