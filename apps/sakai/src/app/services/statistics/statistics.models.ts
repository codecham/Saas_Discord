/**
 * 📊 Models & Types pour les Statistics
 * 
 * Ce fichier réexporte les DTOs de shared-types et ajoute
 * des helper functions et types utilitaires pour le frontend.
 */

// ============================================================================
// 🔄 Réexports depuis shared-types
// ============================================================================

export type {
  // DTOs de réponse
  DashboardStatsDto,
  MemberStatsDto,
  MemberStatsListDto,
  LeaderboardDto,
  ActivityTimelineDto,
  
  // DTOs de requête (query params)
  DashboardStatsQueryDto,
  MemberStatsQueryDto,
  LeaderboardQueryDto,
  ActivityTimelineQueryDto,
  
  // Types communs
  StatsPeriod,
} from '@my-project/shared-types';


// ============================================================================
// 🎨 Types Utilitaires pour le Frontend
// ============================================================================

/**
 * État de chargement d'une requête stats
 */
export interface StatsLoadingState {
  loading: boolean;
  error: string | null;
}

/**
 * Statistique avec son changement en pourcentage
 */
export interface StatWithChange {
  value: number;
  change: number;
  isPositive: boolean;
}

/**
 * Options pour le cache local
 */
export interface StatsCacheOptions {
  ttl: number; // Time to live en millisecondes (défaut: 5min = 300000ms)
  forceRefresh?: boolean;
}

/**
 * Entrée de cache
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}


// ============================================================================
// 🛠️ Helper Functions
// ============================================================================

/**
 * Formate un nombre avec des séparateurs de milliers
 * @example formatNumber(1547) => "1,547"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Formate une durée en minutes vers un format lisible
 * @example formatDuration(125) => "2h 5m"
 * @example formatDuration(45) => "45m"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Formate un pourcentage de changement avec le signe + ou -
 * @example formatPercentageChange(15) => "+15%"
 * @example formatPercentageChange(-10) => "-10%"
 * @example formatPercentageChange(0) => "0%"
 */
export function formatPercentageChange(change: number): string {
  if (change === 0) return '0%';
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Détermine si un changement est positif, négatif ou neutre
 * @returns 'positive' | 'negative' | 'neutral'
 */
export function getChangeType(change: number): 'positive' | 'negative' | 'neutral' {
  if (change > 0) return 'positive';
  if (change < 0) return 'negative';
  return 'neutral';
}

/**
 * Formate une date ISO en format relatif (ex: "il y a 2 heures")
 * @param isoDate - Date au format ISO string
 */
export function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return 'Never';
  
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  
  return date.toLocaleDateString();
}

/**
 * Formate une période pour l'affichage
 */
export function formatPeriodLabel(period: import('@my-project/shared-types').StatsPeriod): string {
  const labels: Record<import('@my-project/shared-types').StatsPeriod, string> = {
    today: 'Today',
    week: 'Last 7 Days',
    month: 'Last 30 Days',
    all: 'All Time'
  };
  
  return labels[period];
}

/**
 * Obtient une couleur de badge selon le rang
 */
export function getBadgeColor(badge?: 'gold' | 'silver' | 'bronze'): string {
  const colors = {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
  };
  
  return badge ? colors[badge] : 'transparent';
}

/**
 * Obtient une classe CSS selon le rang
 */
export function getBadgeClass(badge?: 'gold' | 'silver' | 'bronze'): string {
  const classes = {
    gold: 'badge-gold',
    silver: 'badge-silver',
    bronze: 'badge-bronze',
  };
  
  return badge ? classes[badge] : '';
}

/**
 * Calcule le rang d'un membre dans une liste
 */
export function calculateRank(
  members: Array<{ userId: string; [key: string]: any }>,
  targetUserId: string,
  sortBy: keyof any
): number | null {
  const index = members.findIndex(m => m.userId === targetUserId);
  return index !== -1 ? index + 1 : null;
}

/**
 * Trie une liste de membres selon un critère
 */
export function sortMembers<T extends Record<string, any>>(
  members: T[],
  sortBy: keyof T,
  order: 'asc' | 'desc' = 'desc'
): T[] {
  return [...members].sort((a, b) => {
    const aValue = a[sortBy] as number;
    const bValue = b[sortBy] as number;
    
    return order === 'desc' ? bValue - aValue : aValue - bValue;
  });
}

/**
 * Filtre les membres actifs (lastSeen < 7 jours)
 */
export function filterActiveMembers<T extends { lastSeen: string | null }>(
  members: T[]
): T[] {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  return members.filter(member => {
    if (!member.lastSeen) return false;
    const lastSeenDate = new Date(member.lastSeen);
    return lastSeenDate >= sevenDaysAgo;
  });
}

/**
 * Vérifie si une entrée de cache est encore valide
 */
export function isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return false;
  return Date.now() < entry.expiresAt;
}

/**
 * Crée une entrée de cache
 */
export function createCacheEntry<T>(data: T, ttl: number): CacheEntry<T> {
  const now = Date.now();
  return {
    data,
    timestamp: now,
    expiresAt: now + ttl,
  };
}