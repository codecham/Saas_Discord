// apps/sakai/src/app/services/statistics/statistics-data.service.ts
import { Injectable, signal, computed } from '@angular/core';
import {
  GuildStatsResponse,
  MemberStatsResponse,
  MembersStatsListResponse,
  RankingsResponse,
  TimelineResponse,
} from '@my-project/shared-types';

/**
 * Service de gestion de l'état des statistiques
 * Utilise des signals Angular pour la réactivité
 */
@Injectable({
  providedIn: 'root'
})
export class StatisticsDataService {

  // ============================================
  // SIGNALS PRIVÉS - État interne
  // ============================================

  /**
   * Stats globales de la guild
   */
  private readonly _guildStats = signal<GuildStatsResponse | null>(null);

  /**
   * Stats d'un membre spécifique
   */
  private readonly _memberStats = signal<MemberStatsResponse | null>(null);

  /**
   * Liste des membres avec leurs stats
   */
  private readonly _membersList = signal<MembersStatsListResponse | null>(null);

  /**
   * Leaderboard
   */
  private readonly _rankings = signal<RankingsResponse | null>(null);

  /**
   * Timeline d'activité
   */
  private readonly _timeline = signal<TimelineResponse | null>(null);

  /**
   * États de chargement
   */
  private readonly _isLoadingGuildStats = signal<boolean>(false);
  private readonly _isLoadingMemberStats = signal<boolean>(false);
  private readonly _isLoadingMembersList = signal<boolean>(false);
  private readonly _isLoadingRankings = signal<boolean>(false);
  private readonly _isLoadingTimeline = signal<boolean>(false);

  /**
   * Erreurs
   */
  private readonly _error = signal<string | null>(null);

  // ============================================
  // CACHE PAR GUILD
  // ============================================

  private currentGuildId: string | null = null;

  /**
   * Cache des stats par guild
   */
  private readonly statsCache = new Map<string, {
    guildStats: GuildStatsResponse | null;
    membersList: MembersStatsListResponse | null;
    rankings: RankingsResponse | null;
    timeline: TimelineResponse | null;
    timestamp: number;
  }>();

  /**
   * TTL du cache en millisecondes (2 minutes)
   */
  private readonly CACHE_TTL = 2 * 60 * 1000;

  // ============================================
  // SIGNALS PUBLICS (READONLY)
  // ============================================

  readonly guildStats = this._guildStats.asReadonly();
  readonly memberStats = this._memberStats.asReadonly();
  readonly membersList = this._membersList.asReadonly();
  readonly rankings = this._rankings.asReadonly();
  readonly timeline = this._timeline.asReadonly();

  readonly isLoadingGuildStats = this._isLoadingGuildStats.asReadonly();
  readonly isLoadingMemberStats = this._isLoadingMemberStats.asReadonly();
  readonly isLoadingMembersList = this._isLoadingMembersList.asReadonly();
  readonly isLoadingRankings = this._isLoadingRankings.asReadonly();
  readonly isLoadingTimeline = this._isLoadingTimeline.asReadonly();

  readonly error = this._error.asReadonly();

  /**
   * Computed - Vérifier si on a des stats guild
   */
  readonly hasGuildStats = computed(() => this._guildStats() !== null);

  /**
   * Computed - Vérifier si on a des rankings
   */
  readonly hasRankings = computed(() => this._rankings() !== null);

  /**
   * Computed - Membres de la liste paginée
   */
  readonly members = computed(() => this._membersList()?.members || []);

  /**
   * Computed - Pagination info
   */
  readonly pagination = computed(() => this._membersList()?.pagination || null);

  /**
   * Computed - Top 3 du leaderboard
   */
  readonly topThree = computed(() => {
    const rankings = this._rankings();
    if (!rankings) return [];
    return rankings.entries.slice(0, 3);
  });

  /**
   * Computed - Reste du leaderboard (après top 3)
   */
  readonly remainingRankings = computed(() => {
    const rankings = this._rankings();
    if (!rankings) return [];
    return rankings.entries.slice(3);
  });

  // ============================================
  // MÉTHODES PUBLIQUES - Gestion des données
  // ============================================

  /**
   * Définit les stats de la guild
   */
  setGuildStats(stats: GuildStatsResponse): void {
    this._guildStats.set(stats);
  }

  /**
   * Définit les stats d'un membre
   */
  setMemberStats(stats: MemberStatsResponse): void {
    this._memberStats.set(stats);
  }

  /**
   * Définit la liste des membres
   */
  setMembersList(list: MembersStatsListResponse): void {
    this._membersList.set(list);
  }

  /**
   * Définit le leaderboard
   */
  setRankings(rankings: RankingsResponse): void {
    this._rankings.set(rankings);
  }

  /**
   * Définit la timeline
   */
  setTimeline(timeline: TimelineResponse): void {
    this._timeline.set(timeline);
  }

  /**
   * Gestion des états de chargement
   */
  setLoadingGuildStats(loading: boolean): void {
    this._isLoadingGuildStats.set(loading);
  }

  setLoadingMemberStats(loading: boolean): void {
    this._isLoadingMemberStats.set(loading);
  }

  setLoadingMembersList(loading: boolean): void {
    this._isLoadingMembersList.set(loading);
  }

  setLoadingRankings(loading: boolean): void {
    this._isLoadingRankings.set(loading);
  }

  setLoadingTimeline(loading: boolean): void {
    this._isLoadingTimeline.set(loading);
  }

  /**
   * Définit une erreur
   */
  setError(error: string | null): void {
    this._error.set(error);
  }

  // ============================================
  // CACHE
  // ============================================

  /**
   * Charge les stats depuis le cache si disponible et valide
   */
  loadFromCache(guildId: string): boolean {
    const cached = this.statsCache.get(guildId);
    
    if (!cached) return false;

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL) {
      this.statsCache.delete(guildId);
      return false;
    }

    this._guildStats.set(cached.guildStats);
    this._membersList.set(cached.membersList);
    this._rankings.set(cached.rankings);
    this._timeline.set(cached.timeline);
    
    this.currentGuildId = guildId;
    return true;
  }

  /**
   * Sauvegarde les stats dans le cache
   */
  saveToCache(guildId: string): void {
    this.statsCache.set(guildId, {
      guildStats: this._guildStats(),
      membersList: this._membersList(),
      rankings: this._rankings(),
      timeline: this._timeline(),
      timestamp: Date.now(),
    });
    this.currentGuildId = guildId;
  }

  /**
   * Invalide le cache pour une guild
   */
  invalidateCache(guildId: string): void {
    this.statsCache.delete(guildId);
  }

  /**
   * Clear toutes les données
   */
  clearAll(): void {
    this._guildStats.set(null);
    this._memberStats.set(null);
    this._membersList.set(null);
    this._rankings.set(null);
    this._timeline.set(null);
    this._error.set(null);
    this.currentGuildId = null;
  }
}