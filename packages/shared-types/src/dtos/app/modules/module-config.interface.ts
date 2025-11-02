/**
 * ==========================================
 * MODULE SYSTEM - CONFIGURATION
 * ==========================================
 * Types pour la configuration et les événements des modules
 */

/**
 * Status d'un module pour une guild
 */
export enum ModuleStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error',
  CONFIGURING = 'configuring',
}

/**
 * Configuration d'un module sur un serveur
 * 
 * @example
 * {
 *   guildId: '123456789',
 *   moduleId: 'automod',
 *   enabled: true,
 *   status: ModuleStatus.ENABLED,
 *   config: { sensitivity: 'high' }
 * }
 */
export interface GuildModuleConfig {
  guildId: string;
  moduleId: string;
  enabled: boolean;
  status: ModuleStatus;
  enabledAt?: Date;
  disabledAt?: Date;
  config?: Record<string, any>;  // Config spécifique au module
  error?: string;
}

/**
 * Événement de changement de module (Backend → Bot via Gateway)
 * 
 * @example
 * {
 *   guildId: '123456789',
 *   moduleId: 'automod',
 *   action: 'enabled',
 *   config: { rules: [...] },
 *   timestamp: new Date()
 * }
 */
export interface ModuleChangeEvent {
  guildId: string;
  moduleId: string;
  action: 'enabled' | 'disabled' | 'config_updated';
  config?: Record<string, any>;
  timestamp: Date;
}

/**
 * Requête pour vérifier une limite
 * 
 * @example
 * {
 *   guildId: '123456789',
 *   moduleId: 'automod',
 *   resource: 'rules',
 *   currentCount: 3
 * }
 */
export interface CheckLimitRequest {
  guildId: string;
  moduleId: string;
  resource: string;  // 'rules', 'channels', 'actions'...
  currentCount: number;
}

/**
 * Réponse de vérification de limite
 * 
 * @example
 * {
 *   allowed: false,
 *   limit: 3,
 *   current: 3,
 *   plan: 'free',
 *   upgradeRequired: true
 * }
 */
export interface CheckLimitResponse {
  allowed: boolean;
  limit: number;       // -1 si illimité
  current: number;
  plan: string;
  upgradeRequired?: boolean;
}