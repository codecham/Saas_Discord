/**
 * ==========================================
 * BASE INTERFACES - Stats System v2
 * ==========================================
 * Interfaces de base réutilisables pour éviter la duplication
 */

/**
 * Totaux de base pour les métriques principales
 * Utilisé dans les réponses guild et member
 */
export interface BaseStatsTotals {
  /** Nombre total de messages */
  messages: number;
  
  /** Minutes totales en vocal */
  voiceMinutes: number;
  
  /** Réactions totales (données ou reçues selon le contexte) */
  reactions: number;
}

/**
 * Point de données pour les timelines
 * Représente les stats agrégées pour une date donnée
 */
export interface BaseStatsTimeline {
  /** Date au format ISO 'YYYY-MM-DD' */
  date: string;
  
  /** Messages ce jour-là */
  messages: number;
  
  /** Minutes vocales ce jour-là */
  voice: number;
  
  /** Réactions ce jour-là */
  reactions: number;
}

/**
 * Informations de pagination standard
 */
export interface BasePagination {
  /** Nombre total d'éléments */
  total: number;
  
  /** Page actuelle (commence à 1) */
  page: number;
  
  /** Nombre d'éléments par page */
  pageSize: number;
  
  /** Nombre total de pages */
  totalPages: number;
}

/**
 * Ranking d'un membre dans un leaderboard
 * Utilisé pour afficher la position d'un membre
 */
export interface BaseMemberRanking {
  /** Position (1 = premier) */
  rank: number;
  
  /** Nombre total de membres classés */
  total: number;
}

/**
 * Informations complètes de ranking pour un membre
 * Contient les positions pour chaque métrique
 */
export interface BaseFullRanking {
  /** Ranking par messages */
  messages: BaseMemberRanking;
  
  /** Ranking par vocal */
  voice: BaseMemberRanking;
  
  /** Ranking global (score combiné) */
  overall: BaseMemberRanking;
}

/**
 * Statistiques par channel
 * Utilisé pour le breakdown d'activité par channel
 */
export interface BaseChannelStats {
  /** ID du channel Discord */
  channelId: string;
  
  /** Nom du channel */
  channelName: string;
  
  /** Nombre de messages dans ce channel */
  messages: number;
  
  /** Minutes vocales dans ce channel */
  voiceMinutes: number;
}

/**
 * Entrée de leaderboard pour un membre
 * Format standardisé pour tous les types de classements
 */
export interface BaseMemberRankingEntry {
  /** ID Discord du membre */
  userId: string;
  
  /** Nom d'utilisateur */
  username: string;
  
  /** Avatar URL (peut être null) */
  avatar: string | null;
  
  /** Score pour ce classement */
  score: number;
  
  /** Position dans le classement */
  rank: number;
}