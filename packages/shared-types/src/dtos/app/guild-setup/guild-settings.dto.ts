import { InitializationStatus } from './guild-setup.enums';

/**
 * Configuration globale d'une guild
 * Correspond au model GuildSettings de Prisma (version nettoyée)
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
}


