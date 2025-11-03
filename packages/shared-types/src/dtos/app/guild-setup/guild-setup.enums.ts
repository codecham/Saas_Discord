/**
 * Status d'initialisation d'une guild
 */
export enum InitializationStatus {
  /** En attente que le bot rejoigne */
  PENDING = 'pending',
  
  /** Setup en cours (fetch channels, roles, etc.) */
  INITIALIZING = 'initializing',
  
  /** Setup terminé avec succès */
  READY = 'ready',
  
  /** Erreur bloquante lors du setup */
  ERROR = 'error',
  
  /** Setup terminé mais avec des warnings non-bloquants */
  PARTIAL = 'partial'
}

/**
 * Sévérité d'une erreur de setup
 */
export enum SetupErrorSeverity {
  /** Information, pas bloquant */
  INFO = 'info',
  
  /** Avertissement, peut nécessiter action */
  WARNING = 'warning',
  
  /** Erreur bloquante */
  CRITICAL = 'critical'
}