// packages/shared-types/src/dtos/app/guild-setup/guild-setup.enums.ts

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
 * Status du backfill de stats historiques
 */
export enum BackfillStatus {
  /** Pas de backfill demandé/effectué */
  NONE = 'none',
  
  /** Backfill demandé, en attente de traitement */
  REQUESTED = 'requested',
  
  /** Backfill en cours d'exécution */
  IN_PROGRESS = 'in_progress',
  
  /** Backfill terminé avec succès */
  COMPLETED = 'completed',
  
  /** Backfill échoué */
  FAILED = 'failed'
}

/**
 * Niveau d'automodération
 */
export enum AutoModLevel {
  /** Désactivé */
  OFF = 'off',
  
  /** Niveau faible */
  LOW = 'low',
  
  /** Niveau moyen (par défaut) */
  MEDIUM = 'medium',
  
  /** Niveau élevé */
  HIGH = 'high'
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