// apps/sakai/src/app/services/statistics/statistics.types.ts

/**
 * Types pour les statistiques
 * Utilise des types union au lieu d'enums pour éviter les problèmes runtime
 */

// ============================================
// TYPES DE BASE
// ============================================

/**
 * Périodes disponibles pour les requêtes de stats
 */
export type StatsPeriod = '1d' | '7d' | '30d' | '90d' | 'all';

/**
 * Types de métriques trackées
 */
export type StatsMetricType = 'messages' | 'voice' | 'reactions' | 'all';

/**
 * Types de tri disponibles pour les listes de membres
 */
export type StatsSortBy = 'messages' | 'voice' | 'reactions' | 'lastSeen';

/**
 * Ordre de tri
 */
export type StatsSortOrder = 'asc' | 'desc';

/**
 * Granularité pour les timelines
 */
export type StatsGranularity = 'day' | 'week';

// ============================================
// CONSTANTES POUR FACILITER L'UTILISATION
// ============================================

export const STATS_PERIODS = {
  TODAY: '1d' as StatsPeriod,
  WEEK: '7d' as StatsPeriod,
  MONTH: '30d' as StatsPeriod,
  QUARTER: '90d' as StatsPeriod,
  ALL: 'all' as StatsPeriod,
} as const;

export const STATS_METRICS = {
  MESSAGES: 'messages' as StatsMetricType,
  VOICE: 'voice' as StatsMetricType,
  REACTIONS: 'reactions' as StatsMetricType,
  ALL: 'all' as StatsMetricType,
} as const;

export const STATS_SORT = {
  MESSAGES: 'messages' as StatsSortBy,
  VOICE: 'voice' as StatsSortBy,
  REACTIONS: 'reactions' as StatsSortBy,
  LAST_SEEN: 'lastSeen' as StatsSortBy,
} as const;

export const STATS_ORDER = {
  ASC: 'asc' as StatsSortOrder,
  DESC: 'desc' as StatsSortOrder,
} as const;