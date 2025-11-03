/**
 * Types locaux pour le setup de guild
 * Correspondent aux valeurs du backend
 */
export type InitializationStatus = 
  | 'PENDING'
  | 'INITIALIZING' 
  | 'READY'
  | 'ERROR'
  | 'PARTIAL';

export type SetupErrorSeverity = 
  | 'INFO'
  | 'WARNING'
  | 'CRITICAL';

/**
 * Helpers pour vérifier les status (optionnel)
 */
export const SetupStatus = {
  PENDING: 'PENDING' as const,
  INITIALIZING: 'INITIALIZING' as const,
  READY: 'READY' as const,
  ERROR: 'ERROR' as const,
  PARTIAL: 'PARTIAL' as const,
} as const;