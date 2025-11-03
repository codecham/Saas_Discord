// apps/sakai/src/app/services/onboarding/onboarding-facade.service.ts

import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { 
  InitializationStatus,
  UpdateGuildSettingsDto 
} from '@my-project/shared-types';
import { OnboardingApiService } from './onboarding-api.service';
import { OnboardingDataService } from './onboarding-data.service';
import { firstValueFrom, interval, Subject, takeUntil, switchMap } from 'rxjs';

/**
 * 🎯 Facade Service pour l'onboarding des guilds
 * 
 * Responsabilités:
 * - Orchestrer le flow complet d'onboarding
 * - Gérer le polling automatique du setup status
 * - Exposer une API simple aux composants
 * - Gérer les erreurs et retry
 * - Navigation automatique vers le dashboard
 * 
 * Pattern: Facade (interface publique)
 */
@Injectable({
  providedIn: 'root'
})
export class OnboardingFacadeService {
  private readonly api = inject(OnboardingApiService);
  private readonly dataService = inject(OnboardingDataService);
  private readonly router = inject(Router);

  // ============================================
  // POLLING MANAGEMENT
  // ============================================

  private pollingInterval = 2000; // 2 secondes
  private maxPollingDuration = 30000; // 30 secondes max
  private pollingStartTime = 0;
  private stopPolling$ = new Subject<void>();

  // ============================================
  // EXPOSER LES SIGNALS DU DATA SERVICE
  // ============================================

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

  // ============================================
  // FLOW PRINCIPAL - Ajouter le bot
  // ============================================

  /**
   * Démarre le flow d'onboarding complet pour une nouvelle guild
   * 
   * Flow:
   * 1. Génère l'URL OAuth
   * 2. Ouvre popup Discord
   * 3. Une fois le bot ajouté, backend initie le setup
   * 4. Démarre le polling du status
   * 5. Affiche le wizard quand ready
   * 
   * @param guildId - ID de la guild Discord
   */
  async startOnboarding(guildId: string): Promise<void> {
    console.log('[OnboardingFacade] Starting onboarding for guild:', guildId);

    try {
      this.dataService.setLoading(true);
      this.dataService.reset();

      // 1. Générer l'URL d'invitation
      const { inviteUrl } = await firstValueFrom(
        this.api.getInviteUrl(guildId)
      );

      console.log('[OnboardingFacade] Invite URL generated:', inviteUrl);

      // 2. Ouvrir la popup Discord pour autoriser le bot
      const popup = window.open(
        inviteUrl,
        'discord-oauth',
        'width=500,height=700'
      );

      if (!popup) {
        throw new Error('Impossible d\'ouvrir la fenêtre d\'autorisation. Veuillez autoriser les popups.');
      }

      // 3. Attendre que la popup se ferme (= user a validé)
      await this.waitForPopupClose(popup);

      console.log('[OnboardingFacade] User closed popup, starting setup polling...');

      // 4. Démarrer le polling du setup status
      await this.startSetupPolling(guildId);

    } catch (error) {
      console.error('[OnboardingFacade] Onboarding failed:', error);
      this.dataService.setError(
        error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'ajout du bot.'
      );
    } finally {
      this.dataService.setLoading(false);
    }
  }

  /**
   * Réactive un bot sur une guild inactive
   * Similaire à startOnboarding mais peut skip le wizard si déjà configuré
   * 
   * @param guildId - ID de la guild Discord
   */
  async reactivateBot(guildId: string): Promise<void> {
    console.log('[OnboardingFacade] Reactivating bot for guild:', guildId);

    try {
      this.dataService.setLoading(true);
      this.dataService.reset();

      // 1. Générer l'URL d'invitation
      const { inviteUrl } = await firstValueFrom(
        this.api.getInviteUrl(guildId)
      );

      // 2. Ouvrir la popup Discord
      const popup = window.open(
        inviteUrl,
        'discord-oauth',
        'width=500,height=700'
      );

      if (!popup) {
        throw new Error('Impossible d\'ouvrir la fenêtre d\'autorisation. Veuillez autoriser les popups.');
      }

      // 3. Attendre la fermeture de la popup
      await this.waitForPopupClose(popup);

      console.log('[OnboardingFacade] Bot reactivated, starting setup polling...');

      // 4. Polling du setup
      await this.startSetupPolling(guildId);

    } catch (error) {
      console.error('[OnboardingFacade] Reactivation failed:', error);
      this.dataService.setError(
        error instanceof Error ? error.message : 'Une erreur est survenue lors de la réactivation du bot.'
      );
    } finally {
      this.dataService.setLoading(false);
    }
  }

  // ============================================
  // POLLING DU SETUP STATUS
  // ============================================

  /**
   * Démarre le polling du status du setup
   * Vérifie toutes les 2 secondes jusqu'à ce que le setup soit terminé
   * 
   * @param guildId - ID de la guild Discord
   */
  private async startSetupPolling(guildId: string): Promise<void> {
    console.log('[OnboardingFacade] Starting setup polling for guild:', guildId);

    this.pollingStartTime = Date.now();
    this.stopPolling$ = new Subject<void>();

    // Polling interval
    interval(this.pollingInterval)
      .pipe(
        takeUntil(this.stopPolling$),
        switchMap(() => this.api.getSetupStatus(guildId))
      )
      .subscribe({
        next: (status) => {
          console.log('[OnboardingFacade] Setup status:', status);
          
          // Mettre à jour l'état
          this.dataService.setSetupStatus(status);

          // Vérifier si le setup est terminé
          if (this.isSetupFinished(status.status)) {
            console.log('[OnboardingFacade] Setup finished with status:', status.status);
            this.stopPollingSetupStatus();
            this.handleSetupComplete(guildId, status.status);
          }

          // Timeout si trop long
          if (Date.now() - this.pollingStartTime > this.maxPollingDuration) {
            console.warn('[OnboardingFacade] Setup polling timeout');
            this.stopPollingSetupStatus();
            this.dataService.setError('Le setup prend trop de temps. Veuillez réessayer.');
          }
        },
        error: (error) => {
          console.error('[OnboardingFacade] Polling error:', error);
          this.stopPollingSetupStatus();
          this.dataService.setError('Erreur lors de la vérification du setup.');
        }
      });
  }

  /**
   * Arrête le polling du setup
   */
  private stopPollingSetupStatus(): void {
    console.log('[OnboardingFacade] Stopping setup polling');
    this.stopPolling$.next();
    this.stopPolling$.complete();
  }

  /**
   * Vérifie si un status indique que le setup est terminé
   */
  private isSetupFinished(status: InitializationStatus): boolean {
    return status === InitializationStatus.READY ||
           status === InitializationStatus.ERROR ||
           status === InitializationStatus.PARTIAL;
  }

  // ============================================
  // GESTION DE LA FIN DU SETUP
  // ============================================

  /**
   * Appelé quand le setup est terminé (ready, error, ou partial)
   */
  private async handleSetupComplete(
    guildId: string, 
    status: InitializationStatus
  ): Promise<void> {
    console.log('[OnboardingFacade] Handling setup complete:', status);

    if (status === InitializationStatus.READY || 
        status === InitializationStatus.PARTIAL) {
      
      // Setup terminé avec succès
      // Le composant affichera automatiquement le wizard si nécessaire
      console.log('[OnboardingFacade] Setup complete, ready for configuration');

    } else if (status === InitializationStatus.ERROR) {
      console.error('[OnboardingFacade] Setup failed');
      // L'erreur est déjà dans le status
    }
  }

  // ============================================
  // SETTINGS - Mise à jour directe
  // ============================================

  /**
   * Met à jour les settings d'une guild
   * Utilisé par le wizard ou à tout moment
   * 
   * @param guildId - ID de la guild
   * @param updates - Settings à mettre à jour
   */
  async updateGuildSettings(
    guildId: string, 
    updates: Omit<UpdateGuildSettingsDto, 'guildId'>
  ): Promise<void> {
    console.log('[OnboardingFacade] Updating guild settings:', updates);

    try {
      this.dataService.setLoading(true);

      await firstValueFrom(
        this.api.updateSettings(guildId, updates)
      );

      console.log('[OnboardingFacade] Settings updated successfully');

      // Navigation vers le dashboard
      await this.navigateToDashboard(guildId);

    } catch (error) {
      console.error('[OnboardingFacade] Failed to update settings:', error);
      this.dataService.setError('Impossible de sauvegarder vos préférences. Veuillez réessayer.');
    } finally {
      this.dataService.setLoading(false);
    }
  }

  /**
   * Skip la configuration et redirige directement vers le dashboard
   * Utilise les valeurs par défaut
   */
  async skipConfiguration(guildId: string): Promise<void> {
    console.log('[OnboardingFacade] Skipping configuration for guild:', guildId);
    
    // Pas besoin de modifier les settings, les defaults sont déjà en DB
    await this.navigateToDashboard(guildId);
  }

  // ============================================
  // RETRY SETUP
  // ============================================

  /**
   * Réessaie un setup qui a échoué
   */
  async retrySetup(guildId: string): Promise<void> {
    console.log('[OnboardingFacade] Retrying setup for guild:', guildId);

    try {
      this.dataService.reset();
      this.dataService.setLoading(true);

      // Appeler l'endpoint de retry
      const status = await firstValueFrom(
        this.api.retrySetup(guildId, false)
      );

      this.dataService.setSetupStatus(status);

      // Redémarrer le polling
      await this.startSetupPolling(guildId);

    } catch (error) {
      console.error('[OnboardingFacade] Retry setup failed:', error);
      this.dataService.setError('Impossible de relancer le setup. Veuillez réessayer plus tard.');
    } finally {
      this.dataService.setLoading(false);
    }
  }

  // ============================================
  // NAVIGATION
  // ============================================

  /**
   * Navigue vers le dashboard du serveur
   */
  private async navigateToDashboard(guildId: string): Promise<void> {
    console.log('[OnboardingFacade] Navigating to dashboard for guild:', guildId);

    // TODO: Adapter selon votre structure de routes
    // Exemples possibles:
    // - /dashboard/:guildId
    // - /guild/:guildId/dashboard
    // - /dashboard (avec guildId stocké dans un service de contexte)
    
    await this.router.navigate(['/dashboard', guildId]);
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Attend que la popup Discord OAuth se ferme
   */
  private waitForPopupClose(popup: Window): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);

      // Timeout après 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!popup.closed) {
          popup.close();
          reject(new Error('Timeout: La fenêtre d\'autorisation n\'a pas été fermée.'));
        }
      }, 300000);
    });
  }

  /**
   * Réinitialise complètement l'état de l'onboarding
   */
  reset(): void {
    console.log('[OnboardingFacade] Resetting onboarding state');
    this.stopPollingSetupStatus();
    this.dataService.reset();
  }
}