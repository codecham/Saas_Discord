// packages/shared-types/src/dtos/app/guild-setup/guild-settings.dto.ts

import { InitializationStatus, BackfillStatus, AutoModLevel } from './guild-setup.enums';

/**
 * Configuration complète d'une guild
 * Correspond au model GuildSettings de Prisma
 */
export interface GuildSettingsDto {
  id: string;
  guildId: string;
  
  // ═══════════════════════════════════════
  // INITIALISATION
  // ═══════════════════════════════════════
  initializationStatus: InitializationStatus;
  initializationError?: string | null;
  initializedAt?: string | null; // ISO date
  
  // ═══════════════════════════════════════
  // MODULES ACTIVÉS
  // ═══════════════════════════════════════
  moduleStats: boolean;
  moduleModeration: boolean;
  moduleInvites: boolean;
  moduleAutomod: boolean;
  moduleWelcome: boolean;
  
  // ═══════════════════════════════════════
  // CONFIGURATION STATS
  // ═══════════════════════════════════════
  statsBackfillDays: number; // 0 = aucun, 7 = free, 30/60/90 = premium
  statsBackfillStatus: BackfillStatus;
  statsBackfillProgress: number; // 0-100
  statsRetentionDays: number;
  statsBackfilledAt?: string | null; // ISO date
  
  // ═══════════════════════════════════════
  // CONFIGURATION MODÉRATION
  // ═══════════════════════════════════════
  modLogChannelId?: string | null;
  autoModLevel: AutoModLevel;
  
  // ═══════════════════════════════════════
  // CONFIGURATION INVITES
  // ═══════════════════════════════════════
  trackInvites: boolean;
  inviteAnalytics: boolean;
  
  // ═══════════════════════════════════════
  // LOCALE & TIMEZONE
  // ═══════════════════════════════════════
  locale: string; // 'en', 'fr', 'es', etc.
  timezone: string; // 'UTC', 'Europe/Paris', etc.
  
  // ═══════════════════════════════════════
  // PERMISSIONS
  // ═══════════════════════════════════════
  adminRoleIds: string[]; // Discord role IDs
  modRoleIds: string[]; // Discord role IDs
  
  // ═══════════════════════════════════════
  // MÉTADONNÉES
  // ═══════════════════════════════════════
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

/**
 * DTO pour créer/mettre à jour des settings
 * Tous les champs sont optionnels sauf guildId
 */
export interface UpdateGuildSettingsDto {
  guildId: string;
  
  // Modules
  moduleStats?: boolean;
  moduleModeration?: boolean;
  moduleInvites?: boolean;
  moduleAutomod?: boolean;
  moduleWelcome?: boolean;
  
  // Config stats
  statsBackfillDays?: number;
  statsRetentionDays?: number;
  
  // Config modération
  modLogChannelId?: string | null;
  autoModLevel?: AutoModLevel;
  
  // Config invites
  trackInvites?: boolean;
  inviteAnalytics?: boolean;
  
  // Locale & timezone
  locale?: string;
  timezone?: string;
  
  // Permissions
  adminRoleIds?: string[];
  modRoleIds?: string[];
}

/**
 * DTO pour les valeurs par défaut lors de la création
 */
export interface CreateGuildSettingsDto {
  guildId: string;
  
  // Override des defaults si besoin
  locale?: string;
  timezone?: string;
  moduleStats?: boolean;
  moduleInvites?: boolean;
}