/**
 * ==========================================
 * REQUEST DTOs - Stats System v2
 * ==========================================
 * DTOs pour les requêtes vers l'API (query params, body)
 */

import { StatsPeriod, StatsMetricType, StatsSortBy, StatsSortOrder } from '../../../enums/stats/stats.enum';

/**
 * Requête pour obtenir les stats globales d'une guild
 * 
 * @example
 * GET /stats/guild/:guildId?period=7d
 */
export interface GetGuildStatsRequest {
  /** ID de la guild Discord */
  guildId: string;
  
  /** Période de temps (défaut: 7d) */
  period?: StatsPeriod;
}

/**
 * Requête pour obtenir les stats d'un membre spécifique
 * 
 * @example
 * GET /stats/member/:guildId/:userId?period=30d
 */
export interface GetMemberStatsRequest {
  /** ID de la guild Discord */
  guildId: string;
  
  /** ID du membre Discord */
  userId: string;
  
  /** Période de temps (défaut: 30d) */
  period?: StatsPeriod;
}

/**
 * Requête pour obtenir le leaderboard
 * 
 * @example
 * GET /stats/rankings/:guildId?metric=messages&limit=10
 */
export interface GetRankingsRequest {
  /** ID de la guild Discord */
  guildId: string;
  
  /** Type de métrique pour le classement (défaut: all) */
  metric?: StatsMetricType;
  
  /** Nombre maximum de résultats (défaut: 10, max: 50) */
  limit?: number;
  
  /** Période de temps (défaut: 30d) */
  period?: StatsPeriod;
}

/**
 * Requête pour obtenir la liste des membres avec stats (paginée)
 * 
 * @example
 * GET /stats/members/:guildId?page=1&pageSize=20&sortBy=messages&sortOrder=desc
 */
export interface GetMembersStatsRequest {
  /** ID de la guild Discord */
  guildId: string;
  
  /** Numéro de page (commence à 1, défaut: 1) */
  page?: number;
  
  /** Nombre d'éléments par page (défaut: 20, max: 100) */
  pageSize?: number;
  
  /** Critère de tri (défaut: messages) */
  sortBy?: StatsSortBy;
  
  /** Ordre de tri (défaut: desc) */
  sortOrder?: StatsSortOrder;
  
  /** Filtre: minimum de messages */
  minMessages?: number;
  
  /** Filtre: minimum de minutes vocales */
  minVoiceMinutes?: number;
  
  /** Filtre: seulement les membres actifs (lastSeen < 7 jours) */
  activeOnly?: boolean;
  
  /** Période pour calculer les stats (défaut: 30d) */
  period?: StatsPeriod;
}

/**
 * Requête pour obtenir la timeline d'activité
 * 
 * @example
 * GET /stats/timeline/:guildId?period=30d
 */
export interface GetTimelineRequest {
  /** ID de la guild Discord */
  guildId: string;
  
  /** Période de temps (défaut: 30d) */
  period?: StatsPeriod;
}