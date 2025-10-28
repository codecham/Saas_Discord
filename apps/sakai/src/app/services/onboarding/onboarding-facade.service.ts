import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, interval, Subject, takeUntil, takeWhile } from 'rxjs';
import { OnboardingDataService } from './onboarding-data.service';
import { OnboardingApiService } from './onboarding-api.service';
import { ErrorHandlerService } from '../error-handler.service';
import { 
  QuickStartAnswersDto,
  InitializationStatus
} from '@my-project/shared-types';

/**
 * Service Facade pour l'onboarding des guilds
 * Interface publique pour les composants
 * 
 * Responsabilités:
 * - Orchestration du flow complet d'ajout du bot
 * - Gestion du polling du status
 * - Gestion du Quick Start Wizard
 * - Navigation après setup terminé
 * - Conversion Premium (tracking & prompts)
 */
@Injectable({
  providedIn: 'root'
})
export class OnboardingFacadeService {
  private readonly onboardingData = inject(OnboardingDataService);
  private readonly onboardingApi = inject(OnboardingApiService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly router = inject(Router);

  // Subject pour arrêter le polling
  private stopPolling$ = new Subject<void>();

  // ============================================
  // EXPOSITION DES SIGNALS PUBLICS
  // ============================================

  readonly setupStatus = this.onboardingData.setupStatus;
  readonly quickStartOptions = this.onboardingData.quickStartOptions;
  readonly guildSettings = this.onboardingData.guildSettings;
  readonly inviteUrl = this.onboardingData.inviteUrl;

  readonly isLoadingStatus = this.onboardingData.isLoadingStatus;
  readonly isLoadingQuickStart = this.onboardingData.isLoadingQuickStart;
  readonly isSubmittingQuickStart = this.onboardingData.isSubmittingQuickStart;
  readonly isLoadingInviteUrl = this.onboardingData.isLoadingInviteUrl;

  readonly error = this.onboardingData.error;
  readonly isPolling = this.onboardingData.isPolling;
  readonly pollingAttempts = this.onboardingData.pollingAttempts;

  // Computed
  readonly isSetupComplete = this.onboardingData.isSetupComplete;
  readonly isSetupInProgress = this.onboardingData.isSetupInProgress;
  readonly isSetupFailed = this.onboardingData.isSetupFailed;
  readonly setupProgress = this.onboardingData.setupProgress;
  readonly hasWarnings = this.onboardingData.hasWarnings;
  readonly canContinuePolling = this.onboardingData.canContinuePolling;
  readonly estimatedTimeRemaining = this.onboardingData.estimatedTimeRemaining;

  // ============================================
  // FLOW PRINCIPAL D'ONBOARDING
  // ============================================

  /**
   * Démarre le flow d'ajout du bot sur un serveur
   * 
   * Étapes:
   * 1. Génère l'URL d'invitation OAuth
   * 2. Ouvre Discord dans un nouvel onglet
   * 3. Lance le polling du status après autorisation
   * 
   * @param guildId - ID de la guild Discord
   */
  async startOnboarding(guildId: string): Promise<void> {
    console.log('[OnboardingFacade] Starting onboarding for guild:', guildId);

    try {
      // 1. Générer l'URL d'invitation
      this.onboardingData.setIsLoadingInviteUrl(true);
      this.onboardingData.setError(null);

      const response = await firstValueFrom(
        this.onboardingApi.getInviteUrl(guildId)
      );

      this.onboardingData.setInviteUrl(response.inviteUrl);
      console.log('[OnboardingFacade] Invite URL generated:', response.inviteUrl);

      // 2. Ouvrir Discord dans un nouvel onglet
      window.open(response.inviteUrl, '_blank');

      // 3. Démarrer le polling après un court délai
      // (Le temps que l'utilisateur autorise le bot)
      setTimeout(() => {
        void this.startPollingSetupStatus(guildId);
      }, 3000); // 3 secondes de délai

    } catch (error) {
      console.error('[OnboardingFacade] Failed to start onboarding:', error);
      this.errorHandler.handleError(error, 'Impossible de générer le lien d\'invitation');
      this.onboardingData.setError('Échec de la génération du lien d\'invitation');
    } finally {
      this.onboardingData.setIsLoadingInviteUrl(false);
    }
  }

  /**
   * Réactive un bot inactif sur un serveur
   * Même flow que startOnboarding car on réinvite le bot
   * 
   * @param guildId - ID de la guild Discord
   */
  async reactivateBot(guildId: string): Promise<void> {
    console.log('[OnboardingFacade] Reactivating bot for guild:', guildId);
    return this.startOnboarding(guildId);
  }

  // ============================================
  // POLLING DU STATUS
  // ============================================

  /**
   * Démarre le polling du status de setup
   * Vérifie toutes les 2 secondes si le setup est terminé
   * 
   * Arrêt automatique après:
   * - Setup terminé (ready/error/partial)
   * - 15 tentatives (30 secondes)
   * - Appel manuel à stopPollingSetupStatus()
   * 
   * @param guildId - ID de la guild Discord
   */
  async startPollingSetupStatus(guildId: string): Promise<void> {
    console.log('[OnboardingFacade] Starting setup status polling for guild:', guildId);

    // Reset polling state
    this.onboardingData.resetPolling();
    this.onboardingData.setIsPolling(true);

    // Créer un observable qui poll toutes les 2 secondes
    interval(2000)
      .pipe(
        takeUntil(this.stopPolling$),
        takeWhile(() => this.onboardingData.canContinuePolling())
      )
      .subscribe({
        next: async () => {
          try {
            await this.fetchSetupStatus(guildId);
            this.onboardingData.incrementPollingAttempts();

            // Arrêter si setup terminé
            if (
              this.onboardingData.isSetupComplete() ||
              this.onboardingData.isSetupFailed()
            ) {
              this.stopPollingSetupStatus();
              await this.handleSetupCompleted(guildId);
            }
          } catch (error) {
            console.error('[OnboardingFacade] Polling error:', error);
            // Continue polling même en cas d'erreur
          }
        },
        complete: () => {
          console.log('[OnboardingFacade] Polling stopped');
          this.onboardingData.setIsPolling(false);

          // Si on a atteint la limite sans succès
          if (!this.onboardingData.isSetupComplete()) {
            this.onboardingData.setError(
              'Le setup prend plus de temps que prévu. Veuillez rafraîchir la page.'
            );
          }
        }
      });
  }

  /**
   * Arrête le polling du status
   */
  stopPollingSetupStatus(): void {
    console.log('[OnboardingFacade] Stopping setup status polling');
    this.stopPolling$.next();
    this.onboardingData.setIsPolling(false);
  }

  /**
   * Récupère le status du setup une seule fois
   * 
   * @param guildId - ID de la guild Discord
   */
  async fetchSetupStatus(guildId: string): Promise<void> {
    try {
      this.onboardingData.setIsLoadingStatus(true);
      this.onboardingData.setError(null);

      const status = await firstValueFrom(
        this.onboardingApi.getSetupStatus(guildId)
      );

      this.onboardingData.setSetupStatus(status);
      console.log('[OnboardingFacade] Setup status fetched:', status);

    } catch (error) {
      console.error('[OnboardingFacade] Failed to fetch setup status:', error);
      // Ne pas throw l'erreur pour ne pas casser le polling
    } finally {
      this.onboardingData.setIsLoadingStatus(false);
    }
  }

  /**
   * Retry un setup qui a échoué
   * 
   * @param guildId - ID de la guild Discord
   * @param force - Forcer le retry même si en cours
   */
  async retrySetup(guildId: string, force: boolean = false): Promise<void> {
    console.log('[OnboardingFacade] Retrying setup for guild:', guildId);

    try {
      this.onboardingData.setIsLoadingStatus(true);
      this.onboardingData.setError(null);

      const status = await firstValueFrom(
        this.onboardingApi.retrySetup(guildId, force)
      );

      this.onboardingData.setSetupStatus(status);

      // Relancer le polling
      await this.startPollingSetupStatus(guildId);

    } catch (error) {
      console.error('[OnboardingFacade] Failed to retry setup:', error);
      this.errorHandler.handleError(error, 'Échec de la relance du setup');
      this.onboardingData.setError('Impossible de relancer le setup');
    } finally {
      this.onboardingData.setIsLoadingStatus(false);
    }
  }

  // ============================================
  // QUICK START WIZARD
  // ============================================

  /**
   * Récupère les options pour le Quick Start Wizard
   * 
   * @param guildId - ID de la guild Discord
   */
  async loadQuickStartOptions(guildId: string): Promise<void> {
    console.log('[OnboardingFacade] Loading quick start options for guild:', guildId);

    try {
      this.onboardingData.setIsLoadingQuickStart(true);
      this.onboardingData.setError(null);

      const options = await firstValueFrom(
        this.onboardingApi.getQuickStartOptions(guildId)
      );

      this.onboardingData.setQuickStartOptions(options);
      console.log('[OnboardingFacade] Quick start options loaded:', options);

    } catch (error) {
      console.error('[OnboardingFacade] Failed to load quick start options:', error);
      this.errorHandler.handleError(error, 'Impossible de charger les options');
      this.onboardingData.setError('Échec du chargement des options');
    } finally {
      this.onboardingData.setIsLoadingQuickStart(false);
    }
  }

  /**
   * Soumet les réponses du Quick Start Wizard
   * Configure automatiquement les modules selon les choix
   * 
   * @param guildId - ID de la guild Discord
   * @param answers - Réponses du wizard
   */
  async submitQuickStartAnswers(
    guildId: string, 
    answers: QuickStartAnswersDto
  ): Promise<void> {
    console.log('[OnboardingFacade] Submitting quick start answers for guild:', guildId);

    try {
      this.onboardingData.setIsSubmittingQuickStart(true);
      this.onboardingData.setError(null);

      const response = await firstValueFrom(
        this.onboardingApi.submitQuickStartAnswers(guildId, answers)
      );

      console.log('[OnboardingFacade] Quick start answers submitted:', response);

      // Afficher un message de succès
      this.errorHandler.showSuccess(
        'Configuration appliquée avec succès ! Votre bot est prêt à l\'emploi.'
      );

      // Rediriger vers le dashboard
      await this.navigateToDashboard(guildId);

    } catch (error) {
      console.error('[OnboardingFacade] Failed to submit quick start answers:', error);
      this.errorHandler.handleError(error, 'Échec de la configuration');
      this.onboardingData.setError('Impossible d\'appliquer la configuration');
    } finally {
      this.onboardingData.setIsSubmittingQuickStart(false);
    }
  }

  /**
   * Skip le wizard et utiliser les defaults
   * 
   * @param guildId - ID de la guild Discord
   */
  async skipQuickStart(guildId: string): Promise<void> {
    console.log('[OnboardingFacade] Skipping quick start for guild:', guildId);

    // Soumettre des réponses vides pour garder les defaults
    const emptyAnswers: QuickStartAnswersDto = {
      guildId,
      enableStats: false,
      enableInviteTracking: false,
      enableAutomod: false,
      enableWelcome: false
    };

    await this.submitQuickStartAnswers(guildId, emptyAnswers);
  }

  // ============================================
  // SETTINGS
  // ============================================

  /**
   * Récupère les settings d'une guild
   * 
   * @param guildId - ID de la guild Discord
   */
  async loadSettings(guildId: string): Promise<void> {
    console.log('[OnboardingFacade] Loading settings for guild:', guildId);

    try {
      const settings = await firstValueFrom(
        this.onboardingApi.getSettings(guildId)
      );

      this.onboardingData.setGuildSettings(settings);
      console.log('[OnboardingFacade] Settings loaded:', settings);

    } catch (error) {
      console.error('[OnboardingFacade] Failed to load settings:', error);
      this.errorHandler.handleError(error, 'Impossible de charger les paramètres');
    }
  }

  // ============================================
  // NAVIGATION & COMPLETION
  // ============================================

  /**
   * Gère la complétion du setup
   * Affiche un message et redirige vers le dashboard
   * 
   * @param guildId - ID de la guild Discord
   */
  private async handleSetupCompleted(guildId: string): Promise<void> {
    const status = this.onboardingData.setupStatus();

    if (status?.status === 'ready') {
      console.log('[OnboardingFacade] Setup completed successfully!');

      // Charger les options du Quick Start Wizard
      await this.loadQuickStartOptions(guildId);

      // Le composant affichera automatiquement le wizard
      // car isSetupComplete() retournera true

    } else if (status?.status === 'error') {
      console.error('[OnboardingFacade] Setup failed:', status.error);
      this.errorHandler.handleError(
        { message: 'Le setup a rencontré des erreurs. Veuillez réessayer.' },
        'Setup'
      );
    } else if (status?.status === 'partial') {
      console.warn('[OnboardingFacade] Setup completed with warnings:', status.warnings);
      this.errorHandler.showWarning(
        'Le setup est terminé mais certaines fonctionnalités sont limitées.'
      );

      // Charger quand même le wizard
      await this.loadQuickStartOptions(guildId);
    }
  }

  /**
   * Navigue vers le dashboard du serveur
   * 
   * @param guildId - ID de la guild Discord
   */
  async navigateToDashboard(guildId: string): Promise<void> {
    console.log('[OnboardingFacade] Navigating to dashboard for guild:', guildId);

    // TODO: Adapter selon ta structure de routes
    // Exemple: /guild/:guildId/dashboard ou /dashboard
    await this.router.navigate(['/dashboard']);
  }

  // ============================================
  // PREMIUM FEATURES
  // ============================================

  /**
   * Vérifie si une feature est Premium
   * Utilisé pour afficher les badges "Premium"
   * 
   * @param featureName - Nom de la feature
   * @returns true si Premium
   */
  isPremiumFeature(featureName: string): boolean {
    // TODO: Définir quelles features sont Premium
    const premiumFeatures = [
      'backfill',
      'advanced_automod',
      'custom_commands',
      'advanced_analytics'
    ];

    return premiumFeatures.includes(featureName);
  }

  /**
   * Affiche un prompt pour upgrade vers Premium
   * Optimisé pour la conversion
   * 
   * @param featureName - Feature qui a trigger le prompt
   */
  showPremiumPrompt(featureName: string): void {
    console.log('[OnboardingFacade] Showing premium prompt for:', featureName);

    // TODO: Afficher une modal ou toast avec CTA Premium
    this.errorHandler.showInfo(
      `🎯 Cette fonctionnalité est réservée aux abonnés Premium. Upgrade maintenant !`
    );
  }

  // ============================================
  // RESET
  // ============================================

  /**
   * Réinitialise complètement l'état de l'onboarding
   */
  reset(): void {
    console.log('[OnboardingFacade] Resetting onboarding state');
    this.stopPollingSetupStatus();
    this.onboardingData.reset();
  }
}