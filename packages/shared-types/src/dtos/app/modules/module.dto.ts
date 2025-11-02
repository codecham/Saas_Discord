/**
 * ==========================================
 * MODULE SYSTEM - DTOs
 * ==========================================
 * Data Transfer Objects pour les requêtes API
 */

import { ModuleCategory, SubscriptionPlan } from './module-definition.interface';

/**
 * DTO pour activer un module
 * 
 * @example
 * {
 *   guildId: '123456789',
 *   moduleId: 'automod',
 *   config: { sensitivity: 'high' }
 * }
 */
export interface EnableModuleDto {
  guildId: string;
  moduleId: string;
  config?: Record<string, any>;
}

/**
 * DTO pour désactiver un module
 * 
 * @example
 * {
 *   guildId: '123456789',
 *   moduleId: 'automod'
 * }
 */
export interface DisableModuleDto {
  guildId: string;
  moduleId: string;
}

/**
 * DTO pour lister les modules disponibles
 * 
 * @example
 * {
 *   category: ModuleCategory.MODERATION,
 *   plan: SubscriptionPlan.FREE,
 *   enabledOnly: true
 * }
 */
export interface ListModulesDto {
  category?: ModuleCategory;
  plan?: SubscriptionPlan;
  enabledOnly?: boolean;
}

/**
 * DTO de réponse : Module avec status
 * 
 * @example
 * {
 *   id: 'automod',
 *   name: 'Auto-Moderation',
 *   description: '...',
 *   category: ModuleCategory.MODERATION,
 *   enabled: true,
 *   available: true,
 *   requiresUpgrade: false,
 *   limits: { rules: 3 },
 *   currentUsage: { rules: 2 }
 * }
 */
export interface ModuleResponseDto {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: ModuleCategory;
  enabled: boolean;
  available: boolean;      // Dispo pour le plan actuel
  requiresUpgrade: boolean;
  limits?: Record<string, number>;
  currentUsage?: Record<string, number>;
}