// apps/sakai/src/app/services/statistics/statistics-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  GuildStatsResponse,
  MemberStatsResponse,
  MembersStatsListResponse,
  RankingsResponse,
  TimelineResponse,
  StatsPeriod,
  StatsMetricType,
  StatsSortBy,
  StatsSortOrder,
} from '@my-project/shared-types';

/**
 * Service API pour les statistiques
 * Gère uniquement les appels HTTP vers le backend
 */
@Injectable({
  providedIn: 'root'
})
export class StatisticsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Récupère les stats dashboard d'une guild
   */
  getGuildStats(guildId: string, period?: StatsPeriod): Observable<GuildStatsResponse> {
    let params = new HttpParams();
    if (period) {
      params = params.set('period', period);
    }

    return this.http.get<GuildStatsResponse>(
      `${this.apiUrl}/stats/guild/${guildId}`,
      { params }
    );
  }

  /**
   * Récupère les stats d'un membre spécifique
   */
  getMemberStats(guildId: string, userId: string, period?: StatsPeriod): Observable<MemberStatsResponse> {
    let params = new HttpParams();
    if (period) {
      params = params.set('period', period);
    }

    return this.http.get<MemberStatsResponse>(
      `${this.apiUrl}/stats/member/${guildId}/${userId}`,
      { params }
    );
  }

  /**
   * Récupère la liste paginée des membres avec leurs stats
   */
  getMembersList(
    guildId: string,
    options?: {
      page?: number;
      pageSize?: number;
      sortBy?: StatsSortBy;
      sortOrder?: StatsSortOrder;
      minMessages?: number;
      minVoiceMinutes?: number;
      activeOnly?: boolean;
    }
  ): Observable<MembersStatsListResponse> {
    let params = new HttpParams();

    if (options?.page) params = params.set('page', options.page.toString());
    if (options?.pageSize) params = params.set('pageSize', options.pageSize.toString());
    if (options?.sortBy) params = params.set('sortBy', options.sortBy);
    if (options?.sortOrder) params = params.set('sortOrder', options.sortOrder);
    if (options?.minMessages !== undefined) params = params.set('minMessages', options.minMessages.toString());
    if (options?.minVoiceMinutes !== undefined) params = params.set('minVoiceMinutes', options.minVoiceMinutes.toString());
    if (options?.activeOnly !== undefined) params = params.set('activeOnly', options.activeOnly.toString());

    return this.http.get<MembersStatsListResponse>(
      `${this.apiUrl}/stats/members/${guildId}`,
      { params }
    );
  }

  /**
   * Récupère le leaderboard
   */
  getRankings(
    guildId: string,
    options?: {
      metric?: StatsMetricType;
      period?: StatsPeriod;
      limit?: number;
    }
  ): Observable<RankingsResponse> {
    let params = new HttpParams();

    if (options?.metric) params = params.set('metric', options.metric);
    if (options?.period) params = params.set('period', options.period);
    if (options?.limit) params = params.set('limit', options.limit.toString());

    return this.http.get<RankingsResponse>(
      `${this.apiUrl}/stats/rankings/${guildId}`,
      { params }
    );
  }

  /**
   * Récupère la timeline d'activité
   */
  getTimeline(
    guildId: string,
    options?: {
      period?: StatsPeriod;
      metrics?: StatsMetricType[];
      userId?: string;
    }
  ): Observable<TimelineResponse> {
    let params = new HttpParams();

    if (options?.period) params = params.set('period', options.period);
    if (options?.metrics) params = params.set('metrics', options.metrics.join(','));
    if (options?.userId) params = params.set('userId', options.userId);

    return this.http.get<TimelineResponse>(
      `${this.apiUrl}/stats/timeline/${guildId}`,
      { params }
    );
  }
}