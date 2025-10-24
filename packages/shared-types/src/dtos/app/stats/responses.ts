/**
 * ==========================================
 * RESPONSE DTOs - Stats System v2
 * ==========================================
 * DTOs pour les réponses de l'API stats
 */

import { StatsPeriod, StatsMetricType } from '../../../enums/stats/stats.enum';
import {
  BaseStatsTotals,
  BaseStatsTimeline,
  BasePagination,
  BaseFullRanking,
  BaseChannelStats,
  BaseMemberRankingEntry,
} from './base';

/**
 * ==========================================
 * GUILD STATS RESPONSE
 * ==========================================
 * Réponse complète pour les stats d'une guild
 * Utilisé dans le dashboard principal
 */
export interface GuildStatsResponse {
  /** ID de la guild */
  guildId: string;
  
  /** Période demandée */
  period: StatsPeriod;
  
  /** Stats de la période actuelle */
  current: BaseStatsTotals & {
    /** Nombre de membres actifs */
    activeMembers: number;
  };
  
  /** Stats de la période précédente (pour comparaison) */
  previous: BaseStatsTotals & {
    /** Nombre de membres actifs */
    activeMembers: number;
  };
  
  /** Changements en pourcentage par rapport à la période précédente */
  changes: {
    /** Changement messages (ex: 15 = +15%, -10 = -10%) */
    messagesChange: number;
    
    /** Changement vocal */
    voiceChange: number;
    
    /** Changement réactions */
    reactionsChange: number;
    
    /** Changement membres actifs */
    membersChange: number;
  };
  
  /** Timeline jour par jour pour graphiques */
  timeline: BaseStatsTimeline[];
  
  /** Top membres les plus actifs */
  topMembers: {
    /** Top par messages */
    messages: BaseMemberRankingEntry[];
    
    /** Top par vocal */
    voice: BaseMemberRankingEntry[];
  };
  
  /** Insights générés automatiquement (messages pour l'admin) */
  insights: string[];
  
  /** Score de santé du serveur (0-100) */
  healthScore: number;
}

/**
 * ==========================================
 * MEMBER STATS RESPONSE
 * ==========================================
 * Réponse complète pour les stats d'un membre
 * Utilisé dans la page de détail membre
 */
export interface MemberStatsResponse {
  /** ID de la guild */
  guildId: string;
  
  /** ID du membre */
  userId: string;
  
  /** Période demandée */
  period: StatsPeriod;
  
  /** Totaux sur la période */
  totals: BaseStatsTotals & {
    /** Messages supprimés */
    messagesDeleted: number;
    
    /** Messages édités */
    messagesEdited: number;
    
    /** Réactions données */
    reactionsGiven: number;
    
    /** Réactions reçues */
    reactionsReceived: number;
  };
  
  /** Timeline jour par jour */
  timeline: BaseStatsTimeline[];
  
  /** Breakdown par channel (top 10) */
  channelBreakdown: BaseChannelStats[];
  
  /** Position dans les classements */
  ranking: BaseFullRanking;
  
  /** Score de régularité (0-1, plus c'est élevé plus c'est régulier) */
  consistency: number;
  
  /** Flags de modération */
  moderationFlags: {
    /** Taux de suppression élevé (>10%) */
    highDeleteRate: boolean;
    
    /** Activité suspecte détectée */
    suspiciousActivity: boolean;
  };
}

/**
 * ==========================================
 * RANKINGS RESPONSE
 * ==========================================
 * Réponse pour les leaderboards/classements
 */
export interface RankingsResponse {
  /** ID de la guild */
  guildId: string;
  
  /** Type de métrique classée */
  metric: StatsMetricType;
  
  /** Période */
  period: StatsPeriod;
  
  /** Entrées du classement */
  entries: RankingEntry[];
  
  /** Date de dernière mise à jour */
  updatedAt: string;
}

/**
 * Entrée détaillée d'un classement
 */
export interface RankingEntry extends BaseMemberRankingEntry {
  /** Stats complètes du membre */
  stats: {
    /** Total messages */
    messages: number;
    
    /** Total minutes vocales */
    voiceMinutes: number;
    
    /** Total réactions */
    reactions: number;
  };
  
  /** Badge pour le top 3 */
  badge?: 'gold' | 'silver' | 'bronze';
}

/**
 * ==========================================
 * MEMBERS LIST RESPONSE
 * ==========================================
 * Réponse paginée pour la liste des membres avec stats
 */
export interface MembersStatsListResponse {
  /** Liste des membres */
  members: MemberStatsListItem[];
  
  /** Informations de pagination */
  pagination: BasePagination;
  
  /** Filtres appliqués */
  filters: {
    /** Messages minimum */
    minMessages?: number;
    
    /** Vocal minimum */
    minVoiceMinutes?: number;
    
    /** Seulement actifs */
    activeOnly?: boolean;
  };
}

/**
 * Item dans la liste des membres
 */
export interface MemberStatsListItem {
  /** ID du membre */
  userId: string;
  
  /** Nom d'utilisateur */
  username: string;
  
  /** Avatar URL */
  avatar: string | null;
  
  /** Stats principales */
  stats: {
    /** Messages */
    messages: number;
    
    /** Minutes vocales */
    voiceMinutes: number;
    
    /** Réactions */
    reactions: number;
  };
  
  /** Dernière activité (ISO date) */
  lastSeen: string | null;
  
  /** Date de join (ISO date) */
  joinedAt: string | null;
}

/**
 * ==========================================
 * TIMELINE RESPONSE
 * ==========================================
 * Réponse pour les données de timeline (graphiques)
 */
export interface TimelineResponse {
  /** ID de la guild */
  guildId: string;
  
  /** Période */
  period: StatsPeriod;
  
  /** Points de données */
  dataPoints: BaseStatsTimeline[];
  
  /** Statistiques agrégées sur toute la période */
  aggregated: {
    /** Total messages */
    totalMessages: number;
    
    /** Total minutes vocales */
    totalVoiceMinutes: number;
    
    /** Total réactions */
    totalReactions: number;
    
    /** Moyenne messages par jour */
    avgMessagesPerDay: number;
    
    /** Moyenne vocal par jour */
    avgVoicePerDay: number;
  };
}