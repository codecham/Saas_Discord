import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// PrimeNG Imports
import { DataViewModule } from 'primeng/dataview';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TabsModule } from 'primeng/tabs';

// Services
import { GuildFacadeService } from '@app/services/guild/guild-facade.service';
import { OnboardingFacadeService } from '@app/services/onboarding/onboarding-facade.service';
import { GuildWithBotStatusDTO } from '@my-project/shared-types';

// Components
import { SetupOnboardingModalComponent } from '@app/components/guild-onboarding/setup-onboarding-modal.component';

@Component({
  selector: 'app-server-list',
  standalone: true,
  imports: [
    CommonModule,
    DataViewModule,
    ButtonModule,
    TagModule,
    MessageModule,
    ProgressSpinnerModule,
    TabsModule,
    SetupOnboardingModalComponent
  ],
  template: `
    <div class="card">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div>
            <div class="font-semibold text-xl mb-2">Sélection du serveur</div>
            <p class="text-surface-600 dark:text-surface-400">
              Choisissez le serveur Discord que vous souhaitez administrer
            </p>
          </div>
          
          <p-button 
            label="Rafraîchir" 
            icon="pi pi-refresh" 
            [outlined]="true"
            (onClick)="refreshGuilds()"
            [loading]="guildFacade.isLoading()" />
        </div>

        <!-- Status -->
        <div class="flex items-center gap-2 text-sm">
          <i class="pi pi-check-circle text-green-500"></i>
          <span>
            Connecté - {{ totalGuildsCount() }} serveur(s) où vous avez les droits administrateur
          </span>
        </div>
      </div>

      <!-- Loading -->
      @if (guildFacade.isLoading()) {
        <div class="flex justify-center items-center py-16">
          <p-progressSpinner 
            styleClass="w-16 h-16" 
            strokeWidth="4"
            animationDuration="1s">
          </p-progressSpinner>
        </div>
      }

      <!-- Empty State -->
      @if (!guildFacade.isLoading() && totalGuildsCount() === 0) {
        <div class="text-center py-16">
          <i class="pi pi-server text-6xl text-surface-400 mb-4"></i>
          <div class="text-xl font-semibold mb-2">Aucun serveur trouvé</div>
          <p class="text-surface-600 dark:text-surface-400 mb-6">
            Vous devez avoir les droits administrateur sur un serveur Discord pour utiliser cette application.
          </p>
          <p-button 
            label="Rafraîchir" 
            icon="pi pi-refresh" 
            (onClick)="refreshGuilds()" />
        </div>
      }

      <!-- Tabs avec les listes -->
      @if (!guildFacade.isLoading() && totalGuildsCount() > 0) {
        <p-tabs [value]="0" styleClass="w-full">
          <p-tablist>
            <p-tab [value]="0">
              Serveurs actifs
              @if (guildFacade.activeGuilds().length > 0) {
                <p-tag 
                  [value]="guildFacade.activeGuilds().length.toString()" 
                  severity="success"
                  styleClass="ml-2" />
              }
            </p-tab>
            <p-tab [value]="1">
              Serveurs inactifs
              @if (guildFacade.inactiveGuilds().length > 0) {
                <p-tag 
                  [value]="guildFacade.inactiveGuilds().length.toString()" 
                  severity="warn"
                  styleClass="ml-2" />
              }
            </p-tab>
            <p-tab [value]="2">
              Non configurés
              @if (guildFacade.notAddedGuilds().length > 0) {
                <p-tag 
                  [value]="guildFacade.notAddedGuilds().length.toString()" 
                  severity="info"
                  styleClass="ml-2" />
              }
            </p-tab>
          </p-tablist>

          <p-tabpanels>
            <!-- Panel Serveurs Actifs -->
            <p-tabpanel [value]="0">
              @if (guildFacade.activeGuilds().length > 0) {
                <p-dataview [value]="guildFacade.activeGuilds()" layout="grid">
                  <ng-template #grid let-guilds>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      @for (guild of guilds; track guild.id) {
                        <div class="card p-0 hover:shadow-lg transition-shadow cursor-pointer"
                             [class.ring-2]="selectedGuildId === guild.id"
                             [class.ring-primary]="selectedGuildId === guild.id">
                          <div class="flex flex-col h-full">
                            <!-- Guild Image -->
                            <div class="relative h-32 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-t-lg overflow-hidden">
                              @if (guild.icon) {
                                <div class="absolute inset-0 flex items-center justify-center">
                                  <img 
                                    class="w-24 h-24 rounded-full shadow-xl border-4 border-white dark:border-surface-800"
                                    [src]="getGuildIconUrl(guild)" 
                                    [alt]="guild.name" />
                                </div>
                              } @else {
                                <div class="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm absolute inset-0 m-auto flex items-center justify-center text-white text-4xl font-bold shadow-xl border-4 border-white dark:border-surface-800">
                                  {{ guild.name.charAt(0).toUpperCase() }}
                                </div>
                              }
                            </div>

                            <!-- Content -->
                            <div class="p-6 flex-1 flex flex-col">
                              <!-- Guild Name + Badges -->
                              <div class="mb-4">
                                <div class="text-lg font-bold mb-2" [title]="guild.name">
                                  {{ guild.name }}
                                </div>
                                <div class="flex flex-wrap gap-2">
                                  @if (guild.owner) {
                                    <p-tag value="OWNER" icon="pi pi-crown" severity="warn" />
                                  }
                                  <p-tag value="ADMIN" icon="pi pi-shield" severity="info" />
                                  <p-tag value="BOT ACTIF" icon="pi pi-check-circle" severity="success" />
                                </div>
                              </div>

                              <!-- Action Button -->
                              <div class="mt-auto">
                                <p-button 
                                  label="Gérer ce serveur" 
                                  icon="pi pi-cog"
                                  severity="info"
                                  styleClass="w-full"
                                  [loading]="selectedGuildId === guild.id"
                                  (onClick)="selectGuild(guild)" />
                              </div>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  </ng-template>
                </p-dataview>
              } @else {
                <div class="text-center py-12">
                  <i class="pi pi-inbox text-6xl text-surface-400 mb-4"></i>
                  <div class="text-xl font-semibold mb-2">Aucun serveur actif</div>
                  <p class="text-surface-600 dark:text-surface-400">
                    Vous n'avez pas encore configuré de serveur avec le bot.
                  </p>
                </div>
              }
            </p-tabpanel>

            <!-- Panel Serveurs Inactifs -->
            <p-tabpanel [value]="1">
              @if (guildFacade.inactiveGuilds().length > 0) {
                <p-message severity="warn" styleClass="w-full mb-4">
                  ⚠️ Ces serveurs ont retiré le bot. Vous pouvez le réinviter pour reprendre le suivi.
                </p-message>

                <p-dataview [value]="guildFacade.inactiveGuilds()" layout="grid">
                  <ng-template #grid let-guilds>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      @for (guild of guilds; track guild.id) {
                        <div class="card p-0 hover:shadow-lg transition-shadow">
                          <div class="flex flex-col h-full">
                            <!-- Guild Image -->
                            <div class="relative h-32 bg-gradient-to-br from-orange-400 to-red-500 rounded-t-lg overflow-hidden">
                              @if (guild.icon) {
                                <div class="absolute inset-0 flex items-center justify-center">
                                  <img 
                                    class="w-24 h-24 rounded-full shadow-xl border-4 border-white dark:border-surface-800 grayscale"
                                    [src]="getGuildIconUrl(guild)" 
                                    [alt]="guild.name" />
                                  <div class="absolute inset-0 w-24 h-24 rounded-full bg-black/20"></div>
                                </div>
                              } @else {
                                <div class="w-24 h-24 rounded-full bg-gradient-to-br from-orange-300 to-yellow-500 opacity-60 absolute inset-0 m-auto flex items-center justify-center text-white text-4xl font-bold shadow-xl border-4 border-white dark:border-surface-800">
                                  {{ guild.name.charAt(0).toUpperCase() }}
                                </div>
                              }
                            </div>

                            <!-- Content -->
                            <div class="p-6 flex-1 flex flex-col">
                              <!-- Guild Name + Badges -->
                              <div class="mb-4">
                                <div class="text-lg font-bold mb-2" [title]="guild.name">
                                  {{ guild.name }}
                                </div>
                                <div class="flex flex-wrap gap-2">
                                  @if (guild.owner) {
                                    <p-tag value="OWNER" icon="pi pi-crown" severity="warn" />
                                  }
                                  <p-tag value="ADMIN" icon="pi pi-shield" severity="info" />
                                </div>
                              </div>

                              <!-- Info inactivité -->
                              @if (guild.botRemovedAt) {
                                <div class="text-sm text-orange-700 dark:text-orange-300 mb-4 bg-orange-100 dark:bg-orange-900/30 p-3 rounded">
                                  <i class="pi pi-info-circle mr-2"></i>
                                  Inactif depuis {{ formatDate(guild.botRemovedAt) }}
                                </div>
                              }

                              <!-- Action Button - RÉACTIVER -->
                              <div class="mt-auto">
                                <p-button 
                                  label="Réactiver le bot" 
                                  icon="pi pi-refresh"
                                  severity="warn"
                                  styleClass="w-full"
                                  [loading]="isReactivating(guild.id)"
                                  (onClick)="reactivateBot(guild)" />
                              </div>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  </ng-template>
                </p-dataview>
              } @else {
                <div class="text-center py-12">
                  <i class="pi pi-check-circle text-6xl text-green-500 mb-4"></i>
                  <div class="text-xl font-semibold mb-2">Aucun serveur inactif</div>
                  <p class="text-surface-600 dark:text-surface-400">
                    Le bot est actif sur tous vos serveurs configurés !
                  </p>
                </div>
              }
            </p-tabpanel>

            <!-- Panel Serveurs Non Configurés -->
            <p-tabpanel [value]="2">
              <p-message severity="info" styleClass="w-full mb-4">
                🚀 Ajoutez le bot à ces serveurs pour commencer à les administrer avec notre plateforme.
              </p-message>

              @if (guildFacade.notAddedGuilds().length > 0) {
                <p-dataview [value]="guildFacade.notAddedGuilds()" layout="grid">
                  <ng-template #grid let-guilds>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      @for (guild of guilds; track guild.id) {
                        <div class="card p-0 hover:shadow-lg transition-shadow">
                          <div class="flex flex-col h-full">
                            <!-- Guild Image -->
                            <div class="relative h-32 bg-gradient-to-br from-gray-400 to-gray-600 rounded-t-lg overflow-hidden">
                              @if (guild.icon) {
                                <div class="absolute inset-0 flex items-center justify-center">
                                  <img 
                                    class="w-24 h-24 rounded-full shadow-xl border-4 border-white dark:border-surface-800 grayscale"
                                    [src]="getGuildIconUrl(guild)" 
                                    [alt]="guild.name" />
                                </div>
                              } @else {
                                <div class="w-24 h-24 rounded-full bg-white/30 absolute inset-0 m-auto flex items-center justify-center text-white text-4xl font-bold shadow-xl border-4 border-white dark:border-surface-800">
                                  {{ guild.name.charAt(0).toUpperCase() }}
                                </div>
                              }
                            </div>

                            <!-- Content -->
                            <div class="p-6 flex-1 flex flex-col">
                              <!-- Guild Name + Badges -->
                              <div class="mb-4">
                                <div class="text-lg font-bold mb-2" [title]="guild.name">
                                  {{ guild.name }}
                                </div>
                                <div class="flex flex-wrap gap-2">
                                  @if (guild.owner) {
                                    <p-tag value="OWNER" icon="pi pi-crown" severity="warn" />
                                  }
                                  <p-tag value="ADMIN" icon="pi pi-shield" severity="info" />
                                </div>
                              </div>

                              <!-- Action Button - AJOUTER -->
                              <div class="mt-auto">
                                <p-button 
                                  label="Ajouter le bot" 
                                  icon="pi pi-plus"
                                  severity="info"
                                  styleClass="w-full"
                                  [loading]="isAddingBot(guild.id)"
                                  (onClick)="addBot(guild)" />
                              </div>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  </ng-template>
                </p-dataview>
              } @else {
                <div class="text-center py-12">
                  <i class="pi pi-check-circle text-6xl text-green-500 mb-4"></i>
                  <div class="text-xl font-semibold mb-2">Tous vos serveurs sont configurés</div>
                  <p class="text-surface-600 dark:text-surface-400">
                    Le bot est présent sur tous vos serveurs !
                  </p>
                </div>
              }
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      }

      <!-- Info footer -->
      @if (!guildFacade.isLoading() && totalGuildsCount() > 0) {
        <div class="mt-6 p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
          <div class="flex items-start gap-3">
            <i class="pi pi-info-circle text-surface-600 dark:text-surface-400 text-xl"></i>
            <div class="text-sm text-surface-700 dark:text-surface-300">
              <p class="font-semibold mb-2">💡 Bon à savoir</p>
              <ul class="list-disc list-inside space-y-1">
                <li>Seuls les serveurs où vous avez les droits administrateur sont affichés</li>
                <li>Les serveurs actifs ont le bot connecté et fonctionnel</li>
                <li>Vous pouvez réactiver un serveur inactif en réinvitant le bot</li>
                <li>Pour les nouveaux serveurs, cliquez sur "Ajouter le bot" pour commencer</li>
              </ul>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- 🆕 Modal d'onboarding -->
    <app-setup-onboarding-modal
      [visible]="showOnboardingModal()"
      [guildId]="onboardingGuildId()"
      [guildName]="onboardingGuildName()"
      (visibleChange)="closeOnboardingModal()"
      (setupComplete)="handleSetupComplete()" />
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ServerListComponent implements OnInit {
  protected readonly guildFacade = inject(GuildFacadeService);
  protected readonly onboardingFacade = inject(OnboardingFacadeService);
  private readonly router = inject(Router);
  
  protected selectedGuildId: string | null = null;

  // Track which guild is being processed for onboarding
  private processingGuildId: string | null = null;

  // 🆕 Modal state
  protected showOnboardingModal = signal(false);
  protected onboardingGuildId = signal('');
  protected onboardingGuildName = signal('');

  // Computed pour le total de guilds
  totalGuildsCount = computed(() => {
    return (
      this.guildFacade.activeGuilds().length +
      this.guildFacade.inactiveGuilds().length +
      this.guildFacade.notAddedGuilds().length
    );
  });

  ngOnInit(): void {
    // Les guilds sont déjà chargées par AuthFacade
    if (this.totalGuildsCount() === 0 && !this.guildFacade.isLoading()) {
      this.guildFacade.refreshGuildsList();
    }
  }

  /**
   * Sélectionne une guild active pour l'administrer
   */
  async selectGuild(guild: GuildWithBotStatusDTO): Promise<void> {
    this.selectedGuildId = guild.id;
    try {
      await this.guildFacade.selectGuild(guild);
    } catch (error) {
      console.error('Failed to select guild:', error);
      this.selectedGuildId = null;
    }
  }

  /**
   * Rafraîchit la liste des guilds
   */
  async refreshGuilds(): Promise<void> {
    await this.guildFacade.refreshGuildsList();
  }

  /**
   * 🆕 Ajoute le bot à une guild non configurée
   */
  async addBot(guild: GuildWithBotStatusDTO): Promise<void> {
    console.log('[ServerList] Adding bot to guild:', guild.id, guild.name);
    
    this.processingGuildId = guild.id;
    
    try {
      // Ouvrir la modal AVANT de démarrer l'onboarding
      this.onboardingGuildId.set(guild.id);
      this.onboardingGuildName.set(guild.name);
      this.showOnboardingModal.set(true);

      // Démarre le flow d'onboarding
      await this.onboardingFacade.startOnboarding(guild.id);
      
    } catch (error) {
      console.error('[ServerList] Failed to add bot:', error);
      this.closeOnboardingModal();
    } finally {
      // Reset après un délai
      setTimeout(() => {
        this.processingGuildId = null;
      }, 1000);
    }
  }

  /**
   * 🆕 Réactive le bot sur une guild inactive
   */
  async reactivateBot(guild: GuildWithBotStatusDTO): Promise<void> {
    console.log('[ServerList] Reactivating bot for guild:', guild.id, guild.name);
    
    this.processingGuildId = guild.id;
    
    try {
      // Ouvrir la modal AVANT de démarrer la réactivation
      this.onboardingGuildId.set(guild.id);
      this.onboardingGuildName.set(guild.name);
      this.showOnboardingModal.set(true);

      // Démarre le flow de réactivation
      await this.onboardingFacade.reactivateBot(guild.id);
      
    } catch (error) {
      console.error('[ServerList] Failed to reactivate bot:', error);
      this.closeOnboardingModal();
    } finally {
      setTimeout(() => {
        this.processingGuildId = null;
      }, 1000);
    }
  }

  /**
   * 🆕 Ferme la modal d'onboarding
   */
  protected closeOnboardingModal(): void {
    this.showOnboardingModal.set(false);
    
    // Reset après animation de fermeture
    setTimeout(() => {
      this.onboardingGuildId.set('');
      this.onboardingGuildName.set('');
    }, 300);
  }

  /**
   * 🆕 Gère la fin du setup
   */
  protected handleSetupComplete(): void {
    console.log('[ServerList] Setup complete, refreshing guilds...');
    // Rafraîchir la liste des guilds pour mettre à jour les états
    this.refreshGuilds();
  }

  /**
   * Vérifie si un bot est en cours d'ajout
   */
  isAddingBot(guildId: string): boolean {
    return this.processingGuildId === guildId;
  }

  /**
   * Vérifie si un bot est en cours de réactivation
   */
  isReactivating(guildId: string): boolean {
    return this.processingGuildId === guildId;
  }

  /**
   * Récupère l'URL de l'icône de la guild
   */
  getGuildIconUrl(guild: GuildWithBotStatusDTO): string {
    if (!guild.icon) return '';
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`;
  }

  /**
   * Formate une date en format relatif (ex: "2j", "3m", "1a")
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays}j`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months}m`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years}a`;
    }
  }

  /**
   * Navigate to server list (for back button)
   */
  protected navigateToServerList(): void {
    this.router.navigate(['/server-list']);
  }
}