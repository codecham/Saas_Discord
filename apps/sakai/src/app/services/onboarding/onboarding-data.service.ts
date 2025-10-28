import { Injectable, signal, computed } from '@angular/core';
import {
  GuildSetupStatusDto,
  QuickStartOptionsDto,
  GuildSettingsDto,
} from '@my-project/shared-types';

/**
 * Service de gestion de l'état pour l'onboarding des guilds
 * 
 * Responsabilités:
 * - Stocker l'état du setup en cours
 * - Gérer le polling status
 * - Cache des options quick-start
 * - États de chargement et erreurs
 */
@Injectable({
  providedIn: 'root'
})
export class OnboardingDataService {
  
  // ============================================
  // SIGNALS PRIVÉS (État interne)
  // ============================================

  private _setupStatus = signal<GuildSetupStatusDto | null>(null);
  private _quickStartOptions = signal<QuickStartOptionsDto | null>(null);
  private _guildSettings = signal<GuildSettingsDto | null>(null);
  private _inviteUrl = signal<string | null>(null);

  // États de chargement
  private _isLoadingStatus = signal<boolean>(false);
  private _isLoadingQuickStart = signal<boolean>(false);
  private _isSubmittingQuickStart = signal<boolean>(false);
  private _isLoadingInviteUrl = signal<boolean>(false);

  // Erreurs
  private _error = signal<string | null>(null);

  // Polling control
  private _isPolling = signal<boolean>(false);
  private _pollingAttempts = signal<number>(0);

  // ============================================
  // SIGNALS PUBLICS (Lecture seule)
  // ============================================

  readonly setupStatus = this._setupStatus.asReadonly();
  readonly quickStartOptions = this._quickStartOptions.asReadonly();
  readonly guildSettings = this._guildSettings.asReadonly();
  readonly inviteUrl = this._inviteUrl.asReadonly();

  readonly isLoadingStatus = this._isLoadingStatus.asReadonly();
  readonly isLoadingQuickStart = this._isLoadingQuickStart.asReadonly();
  readonly isSubmittingQuickStart = this._isSubmittingQuickStart.asReadonly();
  readonly isLoadingInviteUrl = this._isLoadingInviteUrl.asReadonly();

  readonly error = this._error.asReadonly();
  readonly isPolling = this._isPolling.asReadonly();
  readonly pollingAttempts = this._pollingAttempts.asReadonly();

  // ============================================
  // COMPUTED SIGNALS
  // ============================================

  /**
   * Vérifie si le setup est terminé avec succès
   */
  readonly isSetupComplete = computed(() => {
    const status = this._setupStatus();
    return status?.status === 'ready';
  });

  /**
   * Vérifie si le setup est en cours
   */
  readonly isSetupInProgress = computed(() => {
    const status = this._setupStatus();
    return status?.status === 'pending' || status?.status === 'initializing';
  });

  /**
   * Vérifie si le setup a échoué
   */
  readonly isSetupFailed = computed(() => {
    const status = this._setupStatus();
    return status?.status === 'error';
  });

  /**
   * Récupère le pourcentage de progression
   */
  readonly setupProgress = computed(() => {
    const status = this._setupStatus();
    return status?.progress ?? 0;
  });

  /**
   * Vérifie s'il y a des warnings
   */
  readonly hasWarnings = computed(() => {
    const status = this._setupStatus();
    return (status?.warnings?.length ?? 0) > 0;
  });

  /**
   * Vérifie si on peut continuer à poller
   * (max 15 tentatives = 30 secondes à 2s d'intervalle)
   */
  readonly canContinuePolling = computed(() => {
    return this._pollingAttempts() < 15;
  });

  /**
   * Calcule le temps écoulé estimé
   */
  readonly estimatedTimeRemaining = computed(() => {
    const status = this._setupStatus();
    if (!status) return null;

    const progress = status.progress ?? 0;
    const elapsed = status.elapsedTime ?? 0;

    if (progress === 0) return null;
    if (progress === 100) return 0;

    // Estimation: (temps_écoulé / progression) * (100 - progression)
    const totalEstimated = (elapsed / progress) * 100;
    const remaining = totalEstimated - elapsed;

    return Math.max(0, Math.round(remaining));
  });

  // ============================================
  // SETTERS (Pour API service)
  // ============================================

  setSetupStatus(status: GuildSetupStatusDto | null): void {
    this._setupStatus.set(status);
  }

  setQuickStartOptions(options: QuickStartOptionsDto | null): void {
    this._quickStartOptions.set(options);
  }

  setGuildSettings(settings: GuildSettingsDto | null): void {
    this._guildSettings.set(settings);
  }

  setInviteUrl(url: string | null): void {
    this._inviteUrl.set(url);
  }

  setIsLoadingStatus(loading: boolean): void {
    this._isLoadingStatus.set(loading);
  }

  setIsLoadingQuickStart(loading: boolean): void {
    this._isLoadingQuickStart.set(loading);
  }

  setIsSubmittingQuickStart(loading: boolean): void {
    this._isSubmittingQuickStart.set(loading);
  }

  setIsLoadingInviteUrl(loading: boolean): void {
    this._isLoadingInviteUrl.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  setIsPolling(polling: boolean): void {
    this._isPolling.set(polling);
  }

  incrementPollingAttempts(): void {
    this._pollingAttempts.update(count => count + 1);
  }

  resetPollingAttempts(): void {
    this._pollingAttempts.set(0);
  }

  // ============================================
  // RESET
  // ============================================

  /**
   * Réinitialise complètement l'état du service
   */
  reset(): void {
    this._setupStatus.set(null);
    this._quickStartOptions.set(null);
    this._guildSettings.set(null);
    this._inviteUrl.set(null);
    this._isLoadingStatus.set(false);
    this._isLoadingQuickStart.set(false);
    this._isSubmittingQuickStart.set(false);
    this._isLoadingInviteUrl.set(false);
    this._error.set(null);
    this._isPolling.set(false);
    this._pollingAttempts.set(0);
  }

  /**
   * Réinitialise uniquement les états de chargement
   */
  resetLoadingStates(): void {
    this._isLoadingStatus.set(false);
    this._isLoadingQuickStart.set(false);
    this._isSubmittingQuickStart.set(false);
    this._isLoadingInviteUrl.set(false);
  }

  /**
   * Réinitialise le polling
   */
  resetPolling(): void {
    this._isPolling.set(false);
    this._pollingAttempts.set(0);
  }
}