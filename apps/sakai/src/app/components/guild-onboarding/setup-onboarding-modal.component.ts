// apps/sakai/src/app/components/guild-onboarding/setup-onboarding-modal.component.ts

import { Component, inject, input, output, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';

// Services & Types
import { OnboardingFacadeService } from '@app/services/onboarding/onboarding-facade.service';

/**
 * 🎯 Modal d'onboarding simplifiée - Sans QuickStart backend
 * 
 * Features:
 * - ✅ Affichage progression du setup (polling automatique)
 * - ✅ Configuration optionnelle (locale/timezone)
 * - ✅ Gestion des erreurs avec retry
 * - ✅ UX fluide et moderne
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
    CheckboxModule,
    DividerModule,
    CardModule
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
      
      <!-- HEADER -->
      <ng-template #header>
        <div class="flex items-center gap-3">
          @if (isSetupInProgress()) {
            <i class="pi pi-spin pi-spinner text-2xl text-primary"></i>
          } @else if (isSetupComplete() || configVisible()) {
            <i class="pi pi-check-circle text-2xl text-green-500"></i>
          } @else if (isSetupFailed()) {
            <i class="pi pi-times-circle text-2xl text-red-500"></i>
          } @else {
            <i class="pi pi-cog text-2xl"></i>
          }
          
          <div>
            <div class="font-semibold text-xl">{{ getHeaderTitle() }}</div>
            <div class="text-sm text-surface-600 dark:text-surface-400">
              {{ guildName() }}
            </div>
          </div>
        </div>
      </ng-template>

      <!-- CONTENT -->
      <div class="pt-4">
        
        <!-- STATE 1: Setup en cours -->
        @if (isSetupInProgress()) {
          <div class="space-y-6">
            <!-- Progress Bar -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium">{{ getCurrentStatusMessage() }}</span>
                <span class="text-sm text-surface-600 dark:text-surface-400">
                  {{ setupProgress() }}%
                </span>
              </div>
              <p-progressBar 
                [value]="setupProgress()" 
                [showValue]="false"
                styleClass="h-2" />
            </div>

            <!-- Info card -->
            <p-card styleClass="bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800">
              <div class="flex gap-3">
                <i class="pi pi-info-circle text-primary text-xl flex-shrink-0"></i>
                <div class="text-sm">
                  <p class="font-semibold mb-1">⚡ Configuration ultra-rapide</p>
                  <p class="text-surface-700 dark:text-surface-300">
                    Nous configurons votre serveur en quelques secondes seulement !
                  </p>
                </div>
              </div>
            </p-card>

            <!-- Steps detail -->
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2" [class.opacity-50]="setupProgress() < 25">
                <i class="pi" [class.pi-check-circle]="setupProgress() >= 25" 
                   [class.pi-circle]="setupProgress() < 25"
                   [class.text-green-500]="setupProgress() >= 25"></i>
                <span>Création du profil serveur</span>
              </div>
              <div class="flex items-center gap-2" [class.opacity-50]="setupProgress() < 50">
                <i class="pi" [class.pi-check-circle]="setupProgress() >= 50" 
                   [class.pi-circle]="setupProgress() < 50"
                   [class.text-green-500]="setupProgress() >= 50"></i>
                <span>Configuration des paramètres par défaut</span>
              </div>
              <div class="flex items-center gap-2" [class.opacity-50]="setupProgress() < 75">
                <i class="pi" [class.pi-check-circle]="setupProgress() >= 75" 
                   [class.pi-circle]="setupProgress() < 75"
                   [class.text-green-500]="setupProgress() >= 75"></i>
                <span>Vérification des permissions</span>
              </div>
              <div class="flex items-center gap-2" [class.opacity-50]="setupProgress() < 100">
                <i class="pi" [class.pi-check-circle]="setupProgress() >= 100" 
                   [class.pi-circle]="setupProgress() < 100"
                   [class.text-green-500]="setupProgress() >= 100"></i>
                <span>Finalisation</span>
              </div>
            </div>
          </div>
        }

        <!-- STATE 2: Erreur -->
        @if (isSetupFailed() && !configVisible()) {
          <div class="space-y-4">
            <p-message severity="error" styleClass="w-full">
              <div class="flex flex-col gap-2">
                <span class="font-semibold">Le setup a rencontré une erreur</span>
                <span class="text-sm">{{ getErrorMessage() }}</span>
              </div>
            </p-message>

            <div class="flex gap-2 justify-end">
              @if (canRetry()) {
                <p-button 
                  label="Réessayer" 
                  icon="pi pi-refresh"
                  (onClick)="handleRetry()" />
              }
              <p-button 
                label="Fermer" 
                severity="secondary"
                [outlined]="true"
                (onClick)="handleClose()" />
            </div>
          </div>
        }

        <!-- STATE 3: Partial (warnings) -->
        @if (isSetupPartial() && !configVisible()) {
          <div class="space-y-4">
            <p-message severity="warn" styleClass="w-full">
              <div class="flex flex-col gap-2">
                <span class="font-semibold">Configuration terminée avec des avertissements</span>
                <span class="text-sm">{{ getWarningsText() }}</span>
              </div>
            </p-message>

            <p class="text-sm text-surface-600 dark:text-surface-400">
              Vous pouvez continuer et ajuster les paramètres plus tard depuis le dashboard.
            </p>

            <div class="flex gap-2 justify-end">
              <p-button 
                label="Continuer" 
                icon="pi pi-arrow-right"
                (onClick)="showConfig()" />
            </div>
          </div>
        }

        <!-- STATE 4: Success + Configuration Optionnelle -->
        @if ((isSetupComplete() || isSetupPartial()) && configVisible()) {
          <div class="space-y-6">
            <!-- Success message -->
            <p-message severity="success" styleClass="w-full" [closable]="false">
              <div class="flex items-center gap-2">
                <i class="pi pi-check-circle text-xl"></i>
                <span class="font-semibold">Configuration terminée avec succès !</span>
              </div>
            </p-message>

            <p-divider />

            <!-- Config intro -->
            <div>
              <h3 class="font-semibold text-lg mb-2">
                ⚙️ Configuration rapide (optionnel)
              </h3>
              <p class="text-sm text-surface-600 dark:text-surface-400">
                Vous pouvez configurer quelques paramètres de base maintenant, 
                ou le faire plus tard depuis le dashboard.
              </p>
            </div>

            <!-- Locale -->
            <div class="space-y-2">
              <label class="block font-medium mb-2">
                Langue de l'interface
              </label>
              <select 
                [(ngModel)]="settings.locale"
                class="w-full p-2 border rounded">
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
              </select>
            </div>

            <p-divider />

            <!-- Timezone -->
            <div class="space-y-2">
              <label class="block font-medium mb-2">
                Fuseau horaire
              </label>
              <select 
                [(ngModel)]="settings.timezone"
                class="w-full p-2 border rounded">
                <option value="UTC">UTC</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </div>

            <!-- Actions -->
            <div class="flex gap-2 justify-between pt-4">
              <p-button 
                label="Ignorer" 
                severity="secondary"
                [text]="true"
                (onClick)="skipConfig()" />
              
              <p-button 
                label="Sauvegarder" 
                icon="pi pi-check"
                [loading]="isSubmitting()"
                (onClick)="submitConfig()" />
            </div>

            <!-- Premium teaser -->
            <p-card styleClass="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border border-purple-200 dark:border-purple-800">
              <div class="flex items-start gap-3">
                <i class="pi pi-star-fill text-yellow-500 text-2xl flex-shrink-0"></i>
                <div>
                  <p class="font-semibold mb-1">✨ Débloquez encore plus avec Premium</p>
                  <p class="text-sm text-surface-700 dark:text-surface-300 mb-2">
                    Historique de 90 jours, analytics avancées, automodération, et plus encore.
                  </p>
                  <p-button 
                    label="Découvrir Premium" 
                    [text]="true"
                    size="small"
                    icon="pi pi-arrow-right" />
                </div>
              </div>
            </p-card>
          </div>
        }
      </div>
    </p-dialog>
  `,
  styles: [`
    :host ::ng-deep {
      .p-dialog-header {
        border-bottom: 1px solid var(--surface-border);
      }
    }
  `]
})
export class SetupOnboardingModalComponent {
  
  // INPUTS / OUTPUTS
  visible = input.required<boolean>();
  guildId = input.required<string>();
  guildName = input<string>('Serveur Discord');

  visibleChange = output<boolean>();
  setupComplete = output<void>();

  // SERVICES
  protected readonly facade = inject(OnboardingFacadeService);

  // STATE
  protected configVisible = signal<boolean>(false);
  protected isSubmitting = signal<boolean>(false);
  
  protected settings = {
    locale: 'en',
    timezone: 'UTC'
  };

  // COMPUTED
  protected isSetupInProgress = this.facade.isSetupInProgress;
  protected isSetupComplete = this.facade.isSetupComplete;
  protected isSetupFailed = this.facade.isSetupFailed;
  protected isSetupPartial = this.facade.isSetupPartial;
  protected setupProgress = this.facade.setupProgress;
  protected canRetry = this.facade.canRetry;

  protected canClose = computed(() => {
    return !this.isSetupInProgress();
  });

  // LIFECYCLE
  constructor() {
    // Auto-show config when setup completes
    effect(() => {
      const complete = this.isSetupComplete();
      const partial = this.isSetupPartial();
      const visible = this.visible();
      
      if ((complete || partial) && visible && !this.configVisible()) {
        setTimeout(() => {
          this.configVisible.set(true);
        }, 500);
      }
    });
  }

  // UI HELPERS
  protected getHeaderTitle(): string {
    if (this.isSetupInProgress()) {
      return 'Configuration du serveur';
    }
    if (this.isSetupFailed()) {
      return 'Erreur de configuration';
    }
    if (this.configVisible()) {
      return 'Paramètres';
    }
    if (this.isSetupComplete() || this.isSetupPartial()) {
      return 'Configuration terminée';
    }
    return 'Configuration';
  }

  protected getCurrentStatusMessage(): string {
    return this.facade.currentStepMessage() || 'Configuration en cours...';
  }

  protected getErrorMessage(): string {
    const status = this.facade.setupStatus();
    return status?.error?.message || 'Une erreur est survenue.';
  }

  protected getWarningsText(): string {
    const status = this.facade.setupStatus();
    const warnings = status?.warnings || [];
    return warnings.map(w => w.message).join('. ');
  }

  // ACTIONS
  protected showConfig(): void {
    this.configVisible.set(true);
  }

  protected async submitConfig(): Promise<void> {
    this.isSubmitting.set(true);
    
    try {
      await this.facade.updateGuildSettings(this.guildId(), this.settings);
      this.setupComplete.emit();
      this.handleClose();
    } catch (error) {
      console.error('[SetupModal] Failed to submit config:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async skipConfig(): Promise<void> {
    await this.facade.skipConfiguration(this.guildId());
    this.setupComplete.emit();
    this.handleClose();
  }

  protected async handleRetry(): Promise<void> {
    await this.facade.retrySetup(this.guildId());
  }

  protected handleClose(): void {
    this.configVisible.set(false);
    this.visibleChange.emit(false);
  }
}