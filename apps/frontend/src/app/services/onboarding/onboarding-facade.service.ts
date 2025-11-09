import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OnboardingApiService } from './onboarding-api.service';
import { OnboardingDataService } from './onboarding-data.service';
import { GuildSetupStatusDto } from '@my-project/shared-types';
import { firstValueFrom, interval, Subject, takeUntil, switchMap, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OnboardingFacadeService {
  private readonly api = inject(OnboardingApiService);
  private readonly dataService = inject(OnboardingDataService);
  private readonly router = inject(Router);

  private pollingInterval = 2000; // 2 secondes
  private maxPollingDuration = 60000; // 60 secondes max
  private pollingStartTime = 0;
  private stopPolling$ = new Subject<void>();

  // Exposer les signals
  readonly setupStatus = this.dataService.setupStatus;
  readonly error = this.dataService.error;
  readonly isLoading = this.dataService.isLoading;
  readonly isSetupInProgress = this.dataService.isSetupInProgress;
  readonly isSetupComplete = this.dataService.isSetupComplete;
  readonly isSetupFailed = this.dataService.isSetupFailed;
  readonly isSetupPartial = this.dataService.isSetupPartial;
  readonly setupProgress = this.dataService.setupProgress;
  readonly currentStepMessage = this.dataService.currentStepMessage;
  readonly estimatedTimeRemaining = this.dataService.estimatedTimeRemaining;
  readonly canRetry = this.dataService.canRetry;

  /**
   * 🎯 FLOW SIMPLIFIÉ:
   * 1. Ouvrir popup Discord
   * 2. Attendre que l'user ferme la popup
   * 3. Démarrer le polling sur /setup/status
   * 4. Le modal reste ouvert pendant le polling
   */
  async startOnboarding(guildId: string): Promise<void> {
    console.log('[OnboardingFacade] Starting onboarding for guild:', guildId);

    try {
      this.dataService.setLoading(true);

      // 1. Générer URL
      console.log('[OnboardingFacade] Getting invite URL...');
      const { inviteUrl } = await firstValueFrom(
        this.api.getInviteUrl(guildId)
      );

      // 2. Ouvrir popup
      console.log('[OnboardingFacade] Opening popup...');
      const popup = window.open(inviteUrl, 'discord-oauth', 'width=500,height=700');

      if (!popup) {
        throw new Error('Impossible d\'ouvrir la fenêtre. Veuillez autoriser les popups.');
      }

      // 3. Attendre fermeture popup
      await this.waitForPopupClose(popup);
      console.log('[OnboardingFacade] Popup closed, starting polling...');

      // 4. Démarrer le polling
      this.startSetupPolling(guildId);

    } catch (error) {
      console.error('[OnboardingFacade] Error:', error);
      this.dataService.setError(
        error instanceof Error ? error.message : 'Une erreur est survenue.'
      );
      this.dataService.setLoading(false);
    }
  }

  /**
   * Réactive le bot (même flow)
   */
  async reactivateBot(guildId: string): Promise<void> {
    console.log('[OnboardingFacade] Reactivating bot');
    await this.startOnboarding(guildId);
  }

  /**
   * Démarre le polling du status jusqu'à ready/error/partial
   */
  private startSetupPolling(guildId: string): void {
    console.log('[OnboardingFacade] Starting polling');
    
    this.pollingStartTime = Date.now();
    this.stopPolling$ = new Subject<void>();
    this.dataService.setLoading(false); // On arrête le loading général

    interval(this.pollingInterval)
      .pipe(
        takeUntil(this.stopPolling$),
        switchMap(() => this.api.getSetupStatus(guildId).pipe(
          catchError(err => {
            console.warn('[OnboardingFacade] Polling error (will retry):', err);
            // Retourner un status "pending" si erreur 404 (settings pas encore créés)
            return of({
              guildId,
              status: 'pending' as any,
              progress: 0,
              currentStep: 'En attente que le bot rejoigne...',
              startedAt: new Date().toISOString()
            } as GuildSetupStatusDto);
          })
        ))
      )
      .subscribe({
        next: (status: GuildSetupStatusDto) => {
          console.log('[OnboardingFacade] Status:', status);
          this.dataService.setSetupStatus(status);

          // Vérifier si terminé
          const currentStatus = status.status as string;
          if (this.isSetupFinished(currentStatus)) {
            console.log('[OnboardingFacade] Setup finished:', currentStatus);
            this.stopPollingSetupStatus();
          }

          // Timeout
          const elapsed = Date.now() - this.pollingStartTime;
          if (elapsed > this.maxPollingDuration) {
            console.warn('[OnboardingFacade] Timeout reached');
            this.stopPollingSetupStatus();
            this.dataService.setError('Le setup prend trop de temps. Le bot a peut-être été refusé.');
          }
        },
        error: (error) => {
          console.error('[OnboardingFacade] Fatal polling error:', error);
          this.stopPollingSetupStatus();
          this.dataService.setError('Erreur lors de la vérification du setup.');
        }
      });
  }

  private stopPollingSetupStatus(): void {
    console.log('[OnboardingFacade] Stopping polling');
    this.stopPolling$.next();
    this.stopPolling$.complete();
  }

  private isSetupFinished(status: string): boolean {
    return status === 'ready' || status === 'error' || status === 'partial';
  }

  private waitForPopupClose(popup: Window): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);

      setTimeout(() => {
        clearInterval(checkInterval);
        if (!popup.closed) {
          popup.close();
          reject(new Error('Timeout: popup not closed'));
        }
      }, 300000); // 5 minutes
    });
  }

  /**
   * Arrête le polling et reset l'état (appelé quand le modal se ferme)
   */
  reset(): void {
    console.log('[OnboardingFacade] Reset');
    this.stopPollingSetupStatus();
    this.dataService.reset();
  }

  async retrySetup(guildId: string): Promise<void> {
    console.log('[OnboardingFacade] Retrying setup');
    this.dataService.reset();
    await this.startOnboarding(guildId);
  }

  async updateGuildSettings(guildId: string, updates: any): Promise<void> {
    await firstValueFrom(this.api.updateSettings(guildId, updates));
  }

  async skipConfiguration(guildId: string): Promise<void> {
    await this.router.navigate(['/dashboard', guildId]);
  }
}