/**
 * ==========================================
 * MODULE SYSTEM - CORE DEFINITIONS
 * ==========================================
 * Types de base pour le système de modules
 */

/**
 * Catégories de modules
 */
export enum ModuleCategory {
  MODERATION = 'moderation',
  ENGAGEMENT = 'engagement',
  UTILITY = 'utility',
  ANALYTICS = 'analytics',
  ECONOMY = 'economy',
}

/**
 * Plans d'abonnement
 */
export enum SubscriptionPlan {
  FREE = 'free',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

/**
 * Limites d'un module selon le plan
 * -1 = illimité
 * 
 * @example
 * {
 *   rules: 3,           // Max 3 règles
 *   actionsPerDay: 100  // Max 100 actions/jour
 * }
 */
export interface ModuleLimits {
  [resource: string]: number;
}

/**
 * Disponibilité d'un module par plan
 */
export interface ModuleAvailability {
  free: boolean;
  premium: boolean;
  enterprise: boolean;
}

/**
 * Runtime du module
 */
export interface ModuleRuntime {
  backend: boolean;  // Tourne côté backend (config, API)
  bot: boolean;      // Tourne côté bot (listeners, commands)
}

/**
 * Définition complète d'un module
 * 
 * @example
 * const AUTOMOD_MODULE: ModuleDefinition = {
 *   id: 'automod',
 *   name: 'Auto-Moderation',
 *   description: 'Automated content filtering',
 *   category: ModuleCategory.MODERATION,
 *   availability: { free: true, premium: true, enterprise: true },
 *   limits: {
 *     free: { rules: 3 },
 *     premium: { rules: 50 }
 *   },
 *   runtime: { backend: true, bot: true },
 *   version: '1.0.0'
 * }
 */
export interface ModuleDefinition {
  // Identification
  id: string;                          // 'automod', 'tickets'...
  name: string;                        // 'Auto-Moderation'
  description: string;                 // Description courte
  icon?: string;                       // Icône (emoji ou class)
  category: ModuleCategory;
  
  // Disponibilité & Limitations
  availability: ModuleAvailability;
  limits?: {
    free?: ModuleLimits;
    premium?: ModuleLimits;
    enterprise?: ModuleLimits;
  };
  
  // Dépendances (si nécessaire)
  dependencies?: string[];             // IDs des modules requis
  
  // Runtime
  runtime: ModuleRuntime;
  
  // Metadata
  version: string;                     // '1.0.0'
  author?: string;
  documentation?: string;              // URL vers docs
}