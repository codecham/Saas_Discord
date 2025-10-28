// packages/shared-types/src/dtos/app/guild-setup/guild-setup-status.dto.ts

import { InitializationStatus, SetupErrorSeverity } from './guild-setup.enums';

/**
 * Erreur durant le setup d'une guild
 */
export interface SetupErrorDto {
  /** Code unique de l'erreur */
  code: string;
  
  /** Sévérité de l'erreur */
  severity: SetupErrorSeverity;
  
  /** Message user-friendly */
  message: string;
  
  /** Action suggérée pour résoudre */
  resolution: string;
  
  /** Possibilité de retry */
  canRetry: boolean;
  
  /** Détails techniques (pour logs) */
  technicalDetails?: string;
  
  /** Timestamp de l'erreur */
  timestamp: number;
}

/**
 * Warning durant le setup (non-bloquant)
 */
export interface SetupWarningDto {
  /** Code unique du warning */
  code: string;
  
  /** Message user-friendly */
  message: string;
  
  /** Action suggérée (optionnelle) */
  suggestion?: string;
  
  /** Timestamp du warning */
  timestamp: number;
}

/**
 * Status du setup d'une guild
 * Utilisé pour le polling côté frontend
 */
export interface GuildSetupStatusDto {
  /** ID de la guild */
  guildId: string;
  
  /** Status actuel */
  status: InitializationStatus;
  
  /** Erreur si status = ERROR */
  error?: SetupErrorDto;
  
  /** Warnings si status = PARTIAL */
  warnings?: SetupWarningDto[];
  
  /** Pourcentage de progression (0-100) */
  progress: number;
  
  /** Étape actuelle du setup */
  currentStep?: string;
  
  /** Temps écoulé depuis début du setup (ms) */
  elapsedTime?: number;
  
  /** Estimation du temps restant (ms) */
  estimatedTimeRemaining?: number;
  
  /** Date de début du setup */
  startedAt?: string; // ISO date
  
  /** Date de fin du setup */
  completedAt?: string; // ISO date
}

/**
 * DTO pour demander un retry du setup
 */
export interface RetrySetupDto {
  guildId: string;
  
  /** Forcer un re-setup complet (ignore cache) */
  force?: boolean;
}

/**
 * DTO pour la réponse d'initialisation
 */
export interface InitializeGuildResponseDto {
  /** Succès ou non */
  success: boolean;
  
  /** Status actuel après tentative */
  status: GuildSetupStatusDto;
  
  /** Message de confirmation */
  message: string;
}