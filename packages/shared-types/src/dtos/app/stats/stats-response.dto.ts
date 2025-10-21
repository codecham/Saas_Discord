// packages/shared-types/src/stats/stats-response.dto.ts

/**
 * Période de temps pour les stats
 */
export type StatsPeriod = 'today' | 'week' | 'month' | 'all';

/**
 * 📊 Dashboard Stats - Vue d'ensemble du serveur
 */
export interface DashboardStatsDto {
  guildId: string;
  period: StatsPeriod;
  
  // Stats principales
  totalMessages: number;
  totalVoiceMinutes: number;
  totalReactions: number;
  uniqueActiveUsers: number;
  
  // Comparaison avec période précédente (%)
  messagesChange: number;      // +15% = 15, -10% = -10
  voiceMinutesChange: number;
  reactionsChange: number;
  activeUsersChange: number;
  
  // Top 3 membres les plus actifs
  topMembers: Array<{
    userId: string;
    totalMessages: number;
    totalVoiceMinutes: number;
  }>;
  
  // Période de temps
  periodStart: string;  // ISO date
  periodEnd: string;    // ISO date
}

/**
 * 👤 Stats d'un membre
 */
export interface MemberStatsDto {
  userId: string;
  guildId: string;
  
  // Compteurs
  totalMessages: number;
  totalVoiceMinutes: number;
  totalReactionsGiven: number;
  totalReactionsReceived: number;
  
  // Activité
  lastMessageAt: string | null;  // ISO date
  lastVoiceAt: string | null;
  lastSeen: string | null;
  joinedAt: string | null;
  
  // Position dans le leaderboard (optionnel)
  rank?: {
    messages: number;
    voice: number;
    reactions: number;
    overall: number;
  };
}

/**
 * 📋 Liste paginée de membres avec stats
 */
export interface MemberStatsListDto {
  members: MemberStatsDto[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * 🏆 Leaderboard
 */
export interface LeaderboardDto {
  guildId: string;
  category: 'messages' | 'voice' | 'reactions' | 'overall';
  period: StatsPeriod;
  
  entries: Array<{
    rank: number;
    userId: string;
    score: number;  // Nombre de messages/minutes/réactions selon category
    
    // Stats détaillées
    totalMessages: number;
    totalVoiceMinutes: number;
    totalReactions: number;
    
    // Badge (gold/silver/bronze pour top 3)
    badge?: 'gold' | 'silver' | 'bronze';
  }>;
  
  updatedAt: string;  // ISO date
}

/**
 * 📈 Timeline d'activité pour graphiques
 */
export interface ActivityTimelineDto {
  guildId: string;
  period: StatsPeriod;
  granularity: 'hour' | 'day' | 'week';  // Agrégation par heure/jour/semaine
  
  dataPoints: Array<{
    timestamp: string;  // ISO date
    totalMessages: number;
    totalVoiceMinutes: number;
    totalReactions: number;
    uniqueActiveUsers: number;
  }>;
}

/**
 * 🔍 Query params pour filtrer/trier les membres
 */
export interface MemberStatsQueryDto {
  // Pagination
  page?: number;
  pageSize?: number;
  
  // Tri
  sortBy?: 'messages' | 'voice' | 'reactions' | 'lastSeen';
  sortOrder?: 'asc' | 'desc';
  
  // Filtres
  minMessages?: number;
  minVoiceMinutes?: number;
  activeOnly?: boolean;  // Seulement les membres actifs (lastSeen < 7 jours)
}

/**
 * 🔍 Query params pour le dashboard
 */
export interface DashboardStatsQueryDto {
  period?: StatsPeriod;
}

/**
 * 🔍 Query params pour le leaderboard
 */
export interface LeaderboardQueryDto {
  category?: 'messages' | 'voice' | 'reactions' | 'overall';
  period?: StatsPeriod;
  limit?: number;  // Nombre d'entrées (défaut 10, max 100)
}

/**
 * 🔍 Query params pour l'activity timeline
 */
export interface ActivityTimelineQueryDto {
  period?: StatsPeriod;
  granularity?: 'hour' | 'day' | 'week';
}