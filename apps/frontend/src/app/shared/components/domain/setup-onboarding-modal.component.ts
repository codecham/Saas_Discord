import { Component, inject, input, output, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider';

// Services & Types
import { OnboardingFacadeService } from '@app/core/services/onboarding/onboarding-facade.service';

/**
 * 🎯 Modal d'onboarding améliorée
 * 
 * Features:
 * - ✅ Spinner pendant le setup
 * - ✅ Icône verte + message si succès
 * - ✅ Icône rouge + message si erreur
 * - ✅ Boutons pour fermer le modal
 * - ✅ Gestion propre du lifecycle
 */
@Component({
  selector: 'app-setup-onboarding-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    ProgressSpinnerModule,
    MessageModule,
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
      [style]="{ width: '90vw', maxWidth: '500px' }"
      (onHide)="handleClose()">
      
      <!-- HEADER -->
      <ng-template #header>
        <div class="flex items-center gap-3">
          @if (isLoading()) {
            <i class="pi pi-spin pi-spinner text-2xl text-primary"></i>
          } @else if (isSuccess()) {
            <i class="pi pi-check-circle text-2xl text-green-500"></i>
          } @else if (isError()) {
            <i class="pi pi-times-circle text-2xl text-red-500"></i>
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
      <div class="py-4">
        
        <!-- ========================================== -->
        <!-- ÉTAT 1: CHARGEMENT (Spinner) -->
        <!-- ========================================== -->
        @if (isLoading()) {
          <div class="flex flex-col items-center justify-center py-8 space-y-6">
            <!-- Spinner -->
            <p-progressSpinner
              strokeWidth="4"
              styleClass="w-20 h-20"
              animationDuration="1s" />
            
            <!-- Message de progression -->
            <div class="text-center space-y-2">
              <p class="font-semibold text-lg">
                {{ getCurrentStatusMessage() }}
              </p>
              <p class="text-sm text-surface-600 dark:text-surface-400">
                Cela ne prendra que quelques secondes...
              </p>
            </div>

            <!-- Barre de progression (optionnel) -->
            @if (setupProgress() > 0) {
              <div class="w-full max-w-xs">
                <div class="flex justify-between text-xs text-surface-600 mb-1">
                  <span>Progression</span>
                  <span>{{ setupProgress() }}%</span>
                </div>
                <div class="w-full bg-surface-200 rounded-full h-2 overflow-hidden">
                  <div 
                    class="bg-primary h-full transition-all duration-300"
                    [style.width.%]="setupProgress()">
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- ========================================== -->
        <!-- ÉTAT 2: SUCCÈS (Icône verte + Message) -->
        <!-- ========================================== -->
        @if (isSuccess()) {
          <div class="flex flex-col items-center justify-center py-6 space-y-4">
            <!-- Icône de succès (grande) -->
            <div class="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <i class="pi pi-check text-5xl text-green-600 dark:text-green-400"></i>
            </div>

            <!-- Message de succès -->
            <div class="text-center space-y-2">
              <h3 class="font-bold text-xl text-green-700 dark:text-green-400">
                Configuration réussie !
              </h3>
              <p class="text-surface-600 dark:text-surface-400">
                Votre serveur est maintenant configuré et prêt à être utilisé.
              </p>
            </div>

            <!-- Optionnel: Warnings si setup partial -->
            @if (isSetupPartial()) {
              <p-message 
                severity="warn" 
                styleClass="w-full"
                [closable]="false">
                <div class="text-sm">
                  <p class="font-semibold mb-1">⚠️ Configuration partielle</p>
                  <p>{{ getWarningsText() }}</p>
                </div>
              </p-message>
            }

            <p-divider />

            <!-- Bouton pour fermer -->
            <div class="w-full flex justify-center gap-3">
              <p-button 
                label="Fermer" 
                icon="pi pi-times"
                [outlined]="true"
                (onClick)="handleClose()" />
              
              <p-button 
                label="Accéder au dashboard" 
                icon="pi pi-arrow-right"
                iconPos="right"
                (onClick)="goToDashboard()" />
            </div>
          </div>
        }

        <!-- ========================================== -->
        <!-- ÉTAT 3: ERREUR (Icône rouge + Message) -->
        <!-- ========================================== -->
        @if (isError()) {
          <div class="flex flex-col items-center justify-center py-6 space-y-4">
            <!-- Icône d'erreur (grande) -->
            <div class="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <i class="pi pi-times text-5xl text-red-600 dark:text-red-400"></i>
            </div>

            <!-- Message d'erreur -->
            <div class="text-center space-y-2">
              <h3 class="font-bold text-xl text-red-700 dark:text-red-400">
                Erreur de configuration
              </h3>
              <p class="text-surface-600 dark:text-surface-400">
                {{ getErrorMessage() }}
              </p>
            </div>

            <!-- Message d'erreur détaillé -->
            <p-message 
              severity="error" 
              styleClass="w-full"
              [closable]="false">
              <div class="text-sm">
                <p class="font-semibold mb-1">Que s'est-il passé ?</p>
                <p>{{ getErrorDetails() }}</p>
              </div>
            </p-message>

            <p-divider />

            <!-- Boutons d'action -->
            <div class="w-full flex justify-center gap-3">
              <p-button 
                label="Fermer" 
                icon="pi pi-times"
                [outlined]="true"
                (onClick)="handleClose()" />
              
              @if (canRetry()) {
                <p-button 
                  label="Réessayer" 
                  icon="pi pi-refresh"
                  severity="danger"
                  (onClick)="handleRetry()" />
              }
            </div>
          </div>
        }
      </div>
    </p-dialog>
  `,
  styles: [`
    :host ::ng-deep {
      .p-dialog-header {
        border-bottom: 1px solid var(--surface-border);
        padding: 1.5rem;
      }
      
      .p-dialog-content {
        padding: 0 1.5rem 1.5rem;
      }

      .p-progressspinner-circle {
        stroke: var(--primary-color);
      }
    }
  `]
})
export class SetupOnboardingModalComponent {
  
  // ============================================
  // INPUTS / OUTPUTS
  // ============================================
  visible = input.required<boolean>();
  guildId = input.required<string>();
  guildName = input<string>('Serveur Discord');

  visibleChange = output<boolean>();
  setupComplete = output<void>();

  // ============================================
  // SERVICES
  // ============================================
  protected readonly facade = inject(OnboardingFacadeService);

  // ============================================
  // COMPUTED STATES
  // ============================================
  
  // État de chargement (setup en cours)
  protected isLoading = computed(() => {
    return this.facade.isSetupInProgress();
  });

  // État de succès (setup terminé avec succès)
  protected isSuccess = computed(() => {
    return this.facade.isSetupComplete() || this.facade.isSetupPartial();
  });

  // État d'erreur (setup échoué)
  protected isError = computed(() => {
    return this.facade.isSetupFailed();
  });

  // Peut-on fermer le modal ?
  protected canClose = computed(() => {
    // On peut fermer si on n'est pas en train de charger
    return !this.isLoading();
  });

  // Autres computed depuis facade
  protected setupProgress = this.facade.setupProgress;
  protected isSetupPartial = this.facade.isSetupPartial;
  protected canRetry = this.facade.canRetry;

  // ============================================
  // UI HELPERS
  // ============================================

  protected getHeaderTitle(): string {
    if (this.isLoading()) {
      return 'Configuration en cours...';
    }
    if (this.isSuccess()) {
      return 'Configuration réussie';
    }
    if (this.isError()) {
      return 'Erreur de configuration';
    }
    return 'Configuration du serveur';
  }

  protected getCurrentStatusMessage(): string {
    return this.facade.currentStepMessage() || 'Initialisation...';
  }

  protected getErrorMessage(): string {
    const status = this.facade.setupStatus();
    if (status?.error?.message) {
      return status.error.message;
    }
    return 'Une erreur est survenue lors de la configuration.';
  }

  protected getErrorDetails(): string {
    const status = this.facade.setupStatus();
    
    if (status?.error?.code === 'USER_CANCELLED') {
      return 'Vous avez annulé l\'invitation du bot. Vous pouvez réessayer quand vous le souhaitez.';
    }
    
    if (status?.error?.resolution) {
      return status.error.resolution;
    }
    
    return 'Veuillez vérifier que le bot dispose des permissions nécessaires et réessayer.';
  }

  protected getWarningsText(): string {
    const status = this.facade.setupStatus();
    const warnings = status?.warnings || [];
    return warnings.map(w => w.message).join('. ');
  }

  // ============================================
  // ACTIONS
  // ============================================

  protected async handleRetry(): Promise<void> {
    console.log('[SetupModal] Retrying setup...');
    await this.facade.retrySetup(this.guildId());
  }

  protected handleClose(): void {
    console.log('[SetupModal] Closing modal');
    
    // Si le setup est réussi, émettre l'événement setupComplete
    if (this.isSuccess()) {
      this.setupComplete.emit();
    }
    
    // Fermer le modal
    this.visibleChange.emit(false);
    
    // Reset du facade
    this.facade.reset();
  }

  protected goToDashboard(): void {
    console.log('[SetupModal] Going to dashboard');
    
    // Émettre l'événement de completion
    this.setupComplete.emit();
    
    // Fermer le modal
    this.visibleChange.emit(false);
    
    // Le facade va gérer la navigation
    // (ou on peut le faire ici directement)
  }
}