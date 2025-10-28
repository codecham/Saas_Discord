// apps/sakai/src/app/components/guild-onboarding/setup-onboarding-modal.component.ts
import { Component, inject, input, output, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { StepsModule } from 'primeng/steps';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DividerModule } from 'primeng/divider';

// Services & Types
import { OnboardingFacadeService } from '@app/services/onboarding/onboarding-facade.service';
import { QuickStartAnswersDto } from '@my-project/shared-types';

/**
 * 🎯 Modal d'onboarding avec:
 * - Polling automatique du setup status
 * - Affichage de la progression
 * - Quick Start Wizard
 * - Gestion erreurs avec retry
 * - Navigation auto vers dashboard
 */
@Component({
  selector: 'app-setup-onboarding-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    ProgressBarModule,
    MessageModule,
    StepsModule,
    CheckboxModule,
    SelectModule,
    InputTextModule,
    DividerModule
  ],
  template: `
    <p-dialog
      [visible]="visible()"
      [modal]="true"
      [closable]="canClose()"
      [closeOnEscape]="canClose()"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '90vw', maxWidth: '600px' }"
      (onHide)="handleClose()">
      
      <!-- Header -->
      <ng-template #header>
        <div class="flex items-center gap-3">
          <i class="pi pi-cog text-2xl"></i>
          <div>
            <div class="font-semibold text-xl">{{ getHeaderTitle() }}</div>
            <div class="text-sm text-surface-600 dark:text-surface-400">
              {{ guildName() }}
            </div>
          </div>
        </div>
      </ng-template>

      <!-- Content -->
      <div class="pt-4">
        <!-- Loading State -->
        @if (isSetupInProgress()) {
          <div class="space-y-6">
            <!-- Progress Bar -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium">Configuration en cours...</span>
                <span class="text-sm text-surface-600 dark:text-surface-400">
                  {{ onboardingFacade.setupProgress() }}%
                </span>
              </div>
              <p-progressBar 
                [value]="onboardingFacade.setupProgress()"
                [showValue]="false"
                [style]="{ height: '8px' }" />
            </div>

            <!-- Status Message -->
            <div class="text-center py-4">
              <div class="mb-4">
                <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
              </div>
              <p class="text-lg font-medium mb-2">
                {{ getCurrentStatusMessage() }}
              </p>
              <p class="text-sm text-surface-600 dark:text-surface-400">
                Temps restant estimé: {{ getEstimatedTimeRemaining() }}
              </p>
            </div>

            <!-- Info message -->
            <p-message 
              severity="info"
              text="Veuillez patienter pendant que nous configurons votre serveur. Cette étape ne prend généralement que quelques secondes."
              [closable]="false" />

            <!-- Warnings if any -->
            @if (onboardingFacade.hasWarnings()) {
              <p-message 
                severity="warn"
                [text]="getWarningsText()"
                [closable]="false" />
            }
          </div>
        }

        <!-- Error State -->
        @if (isSetupFailed()) {
          <div class="space-y-6">
            <p-message 
              severity="error"
              [closable]="false">
              <ng-template #content>
                <div class="flex flex-col gap-2">
                  <div class="font-semibold">Erreur lors de la configuration</div>
                  <div class="text-sm">{{ onboardingFacade.error() }}</div>
                </div>
              </ng-template>
            </p-message>

            <!-- Possible causes -->
            <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4">
              <div class="font-semibold mb-2 text-sm">Causes possibles:</div>
              <ul class="list-disc list-inside text-sm space-y-1 text-surface-700 dark:text-surface-300">
                <li>Le bot n'a pas rejoint le serveur</li>
                <li>Permissions insuffisantes sur le serveur</li>
                <li>Problème de connexion temporaire</li>
              </ul>
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
              <p-button 
                label="Réessayer"
                icon="pi pi-refresh"
                [loading]="onboardingFacade.isLoadingStatus()"
                (onClick)="retrySetup()"
                class="flex-1" />
              <p-button 
                label="Réinviter le bot"
                icon="pi pi-external-link"
                severity="secondary"
                [outlined]="true"
                (onClick)="reopenInvite()"
                class="flex-1" />
            </div>
          </div>
        }

        <!-- Success State - Wizard -->
        @if (isSetupComplete() && !wizardSubmitted()) {
          <div class="space-y-6">
            <!-- Success message -->
            <div class="text-center py-4">
              <div class="mb-4">
                <i class="pi pi-check-circle text-5xl text-green-500"></i>
              </div>
              <p class="text-lg font-semibold mb-2">
                🎉 Serveur configuré avec succès !
              </p>
              <p class="text-sm text-surface-600 dark:text-surface-400">
                Configurez quelques options de base pour démarrer
              </p>
            </div>

            <p-divider />

            <!-- Quick Start Wizard -->
            <div class="space-y-5">
              <div class="font-semibold text-lg">Configuration rapide</div>

              <!-- Stats tracking -->
              <div class="flex items-start gap-3 p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                <p-checkbox 
                  [(ngModel)]="wizardAnswers.enableStats"
                  [binary]="true"
                  inputId="enableStats" />
                <div class="flex-1">
                  <label for="enableStats" class="font-medium cursor-pointer">
                    Activer le suivi des statistiques
                  </label>
                  <p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
                    Suivez l'activité des membres, les messages et l'utilisation du vocal
                  </p>
                </div>
              </div>

              <!-- Invite tracking -->
              <div class="flex items-start gap-3 p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                <p-checkbox 
                  [(ngModel)]="wizardAnswers.enableInviteTracking"
                  [binary]="true"
                  inputId="enableInvites" />
                <div class="flex-1">
                  <label for="enableInvites" class="font-medium cursor-pointer">
                    Tracker les invitations
                  </label>
                  <p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
                    Savoir qui invite de nouveaux membres sur votre serveur
                  </p>
                </div>
              </div>

              <!-- Mod log channel -->
              @if (channelOptions().length > 0) {
                <div class="space-y-2">
                  <label class="font-medium">Canal de logs (optionnel)</label>
                  <p-select
                    [(ngModel)]="wizardAnswers.modLogChannelId"
                    [options]="channelOptions()"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Sélectionner un canal"
                    [showClear]="true"
                    [filter]="true"
                    filterBy="name"
                    appendTo="body"
                    class="w-full">
                    <ng-template #selectedItem let-option>
                      @if (option) {
                        <div class="flex items-center gap-2">
                          <i class="pi pi-hashtag text-sm"></i>
                          <span>{{ option.name }}</span>
                        </div>
                      }
                    </ng-template>
                    <ng-template let-option #item>
                      <div class="flex items-center gap-2">
                        <i class="pi pi-hashtag text-sm"></i>
                        <span>{{ option.name }}</span>
                      </div>
                    </ng-template>
                  </p-select>
                  <p class="text-xs text-surface-600 dark:text-surface-400">
                    Les actions de modération seront enregistrées dans ce canal
                  </p>
                </div>
              }
            </div>

            <p-divider />

            <!-- Actions -->
            <div class="flex gap-3">
              <p-button 
                label="Ignorer"
                severity="secondary"
                [outlined]="true"
                (onClick)="skipWizard()"
                class="flex-1" />
              <p-button 
                label="Continuer"
                icon="pi pi-arrow-right"
                iconPos="right"
                [loading]="onboardingFacade.isSubmittingQuickStart()"
                (onClick)="submitWizard()"
                class="flex-1" />
            </div>
          </div>
        }

        <!-- Wizard Submitted - Redirecting -->
        @if (wizardSubmitted()) {
          <div class="text-center py-8">
            <div class="mb-4">
              <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
            </div>
            <p class="text-lg font-medium mb-2">
              Configuration enregistrée !
            </p>
            <p class="text-sm text-surface-600 dark:text-surface-400">
              Redirection vers le dashboard...
            </p>
          </div>
        }
      </div>
    </p-dialog>
  `
})
export class SetupOnboardingModalComponent {
  // Inputs
  visible = input.required<boolean>();
  guildId = input.required<string>();
  guildName = input<string>('Serveur Discord');

  // Outputs
  visibleChange = output<boolean>();
  setupComplete = output<void>();

  // Services
  protected readonly onboardingFacade = inject(OnboardingFacadeService);
  private readonly router = inject(Router);

  // Wizard state
  protected wizardSubmitted = computed(() => false); // Will be managed by signal if needed
  protected wizardAnswers: QuickStartAnswersDto = {
    guildId: '',
    enableStats: true,
    enableInviteTracking: true,
    modLogChannelId: null
  };

  // Computed
  protected channelOptions = computed(() => {
    const options = this.onboardingFacade.quickStartOptions();
    return options?.availableChannels || [];
  });

  protected isSetupInProgress = computed(() => {
    return this.onboardingFacade.isSetupInProgress();
  });

  protected isSetupComplete = computed(() => {
    return this.onboardingFacade.isSetupComplete();
  });

  protected isSetupFailed = computed(() => {
    return this.onboardingFacade.isSetupFailed();
  });

  protected canClose = computed(() => {
    // Can't close while setup is in progress
    return !this.isSetupInProgress();
  });

  constructor() {
    // Load quick start options when setup is complete
    effect(() => {
      if (this.isSetupComplete() && this.visible()) {
        const guildId = this.guildId();
        if (guildId) {
          this.wizardAnswers.guildId = guildId;
          this.onboardingFacade.loadQuickStartOptions(guildId);
        }
      }
    });
  }

  protected getHeaderTitle(): string {
    if (this.isSetupInProgress()) {
      return 'Configuration du serveur';
    }
    if (this.isSetupFailed()) {
      return 'Erreur de configuration';
    }
    if (this.isSetupComplete()) {
      return 'Configuration terminée';
    }
    return 'Configuration';
  }

  protected getCurrentStatusMessage(): string {
    const statusData = this.onboardingFacade.setupStatus();
    const status = statusData?.status;
    
    switch (status) {
      case 'pending':
        return 'Préparation de la configuration...';
      case 'initializing':
        return 'Récupération des données du serveur...';
      default:
        return 'Configuration en cours...';
    }
  }

  protected getEstimatedTimeRemaining(): string {
    const ms = this.onboardingFacade.estimatedTimeRemaining();
    if (!ms || ms <= 0) return 'Quelques secondes';
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  }

  protected getWarningsText(): string {
    const statusData = this.onboardingFacade.setupStatus();
    const warnings = statusData?.warnings || [];
    return warnings.map(w => w.message).join('. ');
  }

  protected async retrySetup(): Promise<void> {
    const guildId = this.guildId();
    if (!guildId) return;
    
    await this.onboardingFacade.retrySetup(guildId, true);
  }

  protected async reopenInvite(): Promise<void> {
    const guildId = this.guildId();
    if (!guildId) return;

    // Close modal and restart onboarding flow
    this.handleClose();
    await this.onboardingFacade.startOnboarding(guildId);
  }

  protected async skipWizard(): Promise<void> {
    const guildId = this.guildId();
    if (!guildId) return;

    await this.onboardingFacade.skipQuickStart(guildId);
    this.navigateToDashboard();
  }

  protected async submitWizard(): Promise<void> {
    const guildId = this.guildId();
    if (!guildId) return;

    this.wizardAnswers.guildId = guildId;
    await this.onboardingFacade.submitQuickStartAnswers(guildId, this.wizardAnswers);
    
    // Small delay for better UX
    setTimeout(() => {
      this.navigateToDashboard();
    }, 1000);
  }

  protected handleClose(): void {
    if (!this.canClose()) return;
    this.visibleChange.emit(false);
  }

  private navigateToDashboard(): void {
    this.setupComplete.emit();
    this.handleClose();
    this.onboardingFacade.navigateToDashboard(this.guildId());
  }
}