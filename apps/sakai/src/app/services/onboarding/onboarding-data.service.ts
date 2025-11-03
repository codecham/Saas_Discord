// apps/sakai/src/app/services/onboarding/onboarding-data.service.ts

import { Injectable, signal, computed } from '@angular/core';
import { GuildSetupStatusDto } from '@my-project/shared-types';

@Injectable({
  providedIn: 'root'
})
export class OnboardingDataService {
  
  private readonly _setupStatus = signal<GuildSetupStatusDto | null>(null);
  readonly setupStatus = this._setupStatus.asReadonly();

  private readonly _error = signal<string | null>(null);
  readonly error = this._error.asReadonly();

  private readonly _isLoading = signal<boolean>(false);
  readonly isLoading = this._isLoading.asReadonly();

  // ============================================
  // COMPUTED - Utilisant les valeurs LOWERCASE du backend
  // ============================================

  readonly isSetupInProgress = computed(() => {
    const status = this._setupStatus()?.status as string;
    return status === 'pending' || status === 'initializing';
  });

  readonly isSetupComplete = computed(() => {
    const status = this._setupStatus()?.status as string;
    return status === 'ready';
  });

  readonly isSetupFailed = computed(() => {
    const status = this._setupStatus()?.status as string;
    return status === 'error';
  });

  readonly isSetupPartial = computed(() => {
    const status = this._setupStatus()?.status as string;
    return status === 'partial';
  });

  readonly setupProgress = computed(() => {
    return this._setupStatus()?.progress ?? 0;
  });

  readonly currentStepMessage = computed(() => {
    return this._setupStatus()?.currentStep ?? 'Initialisation...';
  });

  readonly estimatedTimeRemaining = computed(() => {
    return this._setupStatus()?.estimatedTimeRemaining ?? null;
  });

  readonly canRetry = computed(() => {
    const status = this._setupStatus();
    if (!status) return false;
    return (status.status as string) === 'error' && status.error?.canRetry === true;
  });

  // ============================================
  // MÉTHODES
  // ============================================

  setSetupStatus(status: GuildSetupStatusDto | null): void {
    console.log('[OnboardingData] Setting status:', status);
    this._setupStatus.set(status);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  setLoading(isLoading: boolean): void {
    this._isLoading.set(isLoading);
  }

  reset(): void {
    console.log('[OnboardingData] Reset');
    this._setupStatus.set(null);
    this._error.set(null);
    this._isLoading.set(false);
  }

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

  getErrorMessage(): string | null {
    const status = this._setupStatus();
    if (status?.error) {
      return status.error.message;
    }
    if (this._error()) {
      return this._error();
    }
    return null;
  }

  getWarnings(): string[] {
    const status = this._setupStatus();
    if (status?.warnings) {
      return status.warnings.map(w => w.message);
    }
    return [];
  }

  canRetrySetup(): boolean {
    return this.canRetry();
  }
}