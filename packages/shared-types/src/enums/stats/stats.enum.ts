/**
 * ==========================================
 * ENUMS - Stats System v2
 * ==========================================
 * Enums centralisés pour le système de statistiques
 */

/**
 * Périodes disponibles pour les requêtes de stats
 * 
 * @example
 * const stats = await getGuildStats(guildId, StatsPeriod.WEEK);
 */
export enum StatsPeriod {
  /** 7 derniers jours */
  WEEK = '7d',
  
  /** 30 derniers jours */
  MONTH = '30d',
  
  /** 90 derniers jours */
  QUARTER = '90d',
}

/**
 * Types de métriques trackées
 * Utilisé pour filter les données ou spécifier le type de ranking
 */
export enum StatsMetricType {
  /** Nombre de messages envoyés */
  MESSAGES = 'messages',
  
  /** Minutes en vocal */
  VOICE = 'voice',
  
  /** Réactions données/reçues */
  REACTIONS = 'reactions',
  
  /** Toutes les métriques combinées */
  ALL = 'all',
}

/**
 * Granularité pour les timelines
 * Détermine comment les données sont agrégées dans le temps
 */
export enum StatsGranularity {
  /** Agrégation par jour */
  DAY = 'day',
  
  /** Agrégation par semaine */
  WEEK = 'week',
}

/**
 * Types de tri disponibles pour les listes de membres
 */
export enum StatsSortBy {
  /** Trier par nombre de messages */
  MESSAGES = 'messages',
  
  /** Trier par minutes vocales */
  VOICE = 'voice',
  
  /** Trier par réactions */
  REACTIONS = 'reactions',
  
  /** Trier par dernière activité */
  LAST_SEEN = 'lastSeen',
}

/**
 * Ordre de tri
 */
export enum StatsSortOrder {
  /** Ascendant (A-Z, 0-9) */
  ASC = 'asc',
  
  /** Descendant (Z-A, 9-0) */
  DESC = 'desc',
}