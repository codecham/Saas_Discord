// apps/sakai/src/app/services/onboarding/onboarding-data.service.ts

import { Injectable, signal, computed } from '@angular/core';
import { 
  GuildSetupStatusDto, 
  InitializationStatus 
} from '@my-project/shared-types';

/**
 * 🗄️ Service de gestion des données locales pour l'onboarding
 * 
 * Responsabilités:
 * - Stocker l'état du setup en cours
 * - Gérer les signals Angular pour réactivité
 * - Calculer les états dérivés (isComplete, isFailed, etc.)
 * - Cache temporaire des données
 * 
 * Pattern: Data Layer (pas d'appels HTTP)
 */
@Injectable({
  providedIn: 'root'
})
export class OnboardingDataService {
  
  // ============================================
  // SIGNALS - État du setup
  // ============================================
  
  /**
   * Status actuel du setup d'une guild
   */
  private readonly _setupStatus = signal<GuildSetupStatusDto | null>(null);
  readonly setupStatus = this._setupStatus.asReadonly();

  /**
   * Erreur globale (non liée au setup)
   */
  private readonly _error = signal<string | null>(null);
  readonly error = this._error.asReadonly();

  /**
   * Flag de chargement global
   */
  private readonly _isLoading = signal<boolean>(false);
  readonly isLoading = this._isLoading.asReadonly();

  // ============================================
  // COMPUTED - États dérivés
  // ============================================

  /**
   * Le setup est-il en cours ?
   */
  readonly isSetupInProgress = computed(() => {
    const status = this._setupStatus()?.status;
    return status === InitializationStatus.PENDING || 
           status === InitializationStatus.INITIALIZING;
  });

  /**
   * Le setup est-il terminé avec succès ?
   */
  readonly isSetupComplete = computed(() => {
    return this._setupStatus()?.status === InitializationStatus.READY;
  });

  /**
   * Le setup a-t-il échoué ?
   */
  readonly isSetupFailed = computed(() => {
    return this._setupStatus()?.status === InitializationStatus.ERROR;
  });

  /**
   * Le setup s'est-il terminé avec des warnings ?
   */
  readonly isSetupPartial = computed(() => {
    return this._setupStatus()?.status === InitializationStatus.PARTIAL;
  });

  /**
   * Progression du setup (0-100)
   */
  readonly setupProgress = computed(() => {
    return this._setupStatus()?.progress ?? 0;
  });

  /**
   * Message d'étape actuelle
   */
  readonly currentStepMessage = computed(() => {
    return this._setupStatus()?.currentStep ?? 'Initialisation...';
  });

  /**
   * Temps restant estimé (ms)
   */
  readonly estimatedTimeRemaining = computed(() => {
    return this._setupStatus()?.estimatedTimeRemaining ?? null;
  });

  /**
   * Peut-on retry le setup ?
   */
  readonly canRetry = computed(() => {
    const status = this._setupStatus();
    return status?.status === InitializationStatus.ERROR && 
           status.error?.canRetry === true;
  });

  // ============================================
  // MÉTHODES - Manipulation de l'état
  // ============================================

  /**
   * Met à jour le status du setup
   */
  setSetupStatus(status: GuildSetupStatusDto | null): void {
    this._setupStatus.set(status);
  }

  /**
   * Définit une erreur globale
   */
  setError(error: string | null): void {
    this._error.set(error);
  }

  /**
   * Définit l'état de chargement
   */
  setLoading(isLoading: boolean): void {
    this._isLoading.set(isLoading);
  }

  /**
   * Réinitialise complètement l'état
   */
  reset(): void {
    this._setupStatus.set(null);
    this._error.set(null);
    this._isLoading.set(false);
  }

  /**
   * Met à jour uniquement la progression (utile pour polling)
   */
  updateProgress(progress: number, currentStep?: string): void {
    const current = this._setupStatus();
    if (current) {
      this._setupStatus.set({
        ...current,
        progress,
        currentStep: currentStep ?? current.currentStep
      });
    }
  }

  // ============================================
  // HELPERS - Gestion des erreurs
  // ============================================

  /**
   * Extrait un message d'erreur user-friendly
   */
  getErrorMessage(): string | null {
    const status = this._setupStatus();
    
    // Erreur du setup
    if (status?.error) {
      return status.error.message;
    }
    
    // Erreur globale
    if (this._error()) {
      return this._error();
    }
    
    return null;
  }

  /**
   * Extrait les warnings si setup PARTIAL
   */
  getWarnings(): string[] {
    const status = this._setupStatus();
    if (status?.warnings) {
      return status.warnings.map(w => w.message);
    }
    return [];
  }

  /**
   * Vérifie si le setup peut être relancé
   */
  canRetrySetup(): boolean {
    return this.canRetry();
  }
}