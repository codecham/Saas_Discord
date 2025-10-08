import { Component, inject, OnInit, computed } from '@angular/core';
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
import { GuildWithBotStatusDTO } from '@my-project/shared-types';

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
    TabsModule
  ],
  template: `
    <div class="card">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div>
            <div class="font-semibold text-xl mb-2">🖥️ Sélection du serveur</div>
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
        <div class="flex justify-center items-center py-12">
          <p-progressSpinner 
            styleClass="w-16 h-16" 
            strokeWidth="4"
            animationDuration="1s" />
        </div>
      }

      <!-- Error -->
      @if (guildFacade.error()) {
        <p-message 
          severity="error" 
          styleClass="w-full mb-4">
          <div class="flex items-center gap-2">
            <i class="pi pi-exclamation-triangle"></i>
            <div>
              <div class="font-semibold">Erreur</div>
              <div>{{ guildFacade.error() }}</div>
            </div>
          </div>
        </p-message>
      }

      <!-- Tabs pour les 3 catégories -->
      @if (!guildFacade.isLoading()) {
        <p-tabs [value]="0">
          <p-tablist>
            <!-- Tab Actifs -->
            <p-tab [value]="0">
              <i class="pi pi-check-circle mr-2"></i>
              Serveurs actifs
              <p-tag 
                [value]="guildFacade.activeGuilds().length.toString()" 
                severity="success" 
                styleClass="ml-2" />
            </p-tab>

            <!-- Tab Inactifs -->
            <p-tab [value]="1">
              <i class="pi pi-clock mr-2"></i>
              Serveurs inactifs
              <p-tag 
                [value]="guildFacade.inactiveGuilds().length.toString()" 
                severity="warn" 
                styleClass="ml-2" />
            </p-tab>

            <!-- Tab Non configurés -->
            <p-tab [value]="2">
              <i class="pi pi-plus-circle mr-2"></i>
              Non configurés
              <p-tag 
                [value]="guildFacade.notAddedGuilds().length.toString()" 
                severity="info" 
                styleClass="ml-2" />
            </p-tab>
          </p-tablist>

          <p-tabpanels>
            <!-- Panel Serveurs Actifs -->
            <p-tabpanel [value]="0">
              @if (guildFacade.activeGuilds().length > 0) {
                <p-dataview [value]="guildFacade.activeGuilds()" layout="grid">
                  <ng-template #grid let-guilds>
                    <div class="grid grid-cols-12 gap-4">
                      @for (guild of guilds; track guild.id) {
                        <div class="col-span-12 sm:col-span-6 lg:col-span-4 p-2">
                          <div class="border border-surface rounded-lg flex flex-col h-full hover:shadow-lg transition-all duration-300 overflow-hidden"
                               [class.ring-2]="guildFacade.isGuildSelected(guild.id)"
                               [class.ring-primary]="guildFacade.isGuildSelected(guild.id)">
                            
                            <!-- Header avec fond gradient et icône circulaire -->
                            <div class="relative bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900 dark:to-primary-800 p-6 flex items-center justify-center">
                              <!-- Status Badge -->
                              <div class="absolute top-3 right-3">
                                <p-tag value="Actif" severity="success" [rounded]="true" />
                              </div>

                              <!-- Guild Icon (circulaire) -->
                              @if (guild.icon) {
                                <img 
                                  class="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-white dark:border-surface-800"
                                  [src]="getGuildIconUrl(guild)" 
                                  [alt]="guild.name" />
                              } @else {
                                <div class="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg border-4 border-white dark:border-surface-800">
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

                              <!-- Action Button -->
                              <div class="mt-auto">
                                <p-button 
                                  label="Administrer" 
                                  icon="pi pi-arrow-right"
                                  iconPos="right"
                                  styleClass="w-full"
                                  [loading]="guildFacade.isLoadingGuildDetails() && selectedGuildId === guild.id"
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
                    Le bot n'est présent sur aucun de vos serveurs
                  </p>
                </div>
              }
            </p-tabpanel>

            <!-- Panel Serveurs Inactifs -->
            <p-tabpanel [value]="1">
              <p-message severity="warn" styleClass="w-full mb-4">
                Le bot a été retiré de ces serveurs. Vous pouvez le réinviter pour réactiver la configuration.
              </p-message>

              @if (guildFacade.inactiveGuilds().length > 0) {
                <p-dataview [value]="guildFacade.inactiveGuilds()" layout="grid">
                  <ng-template #grid let-guilds>
                    <div class="grid grid-cols-12 gap-4">
                      @for (guild of guilds; track guild.id) {
                        <div class="col-span-12 sm:col-span-6 lg:col-span-4 p-2">
                          <div class="border border-orange-200 dark:border-orange-800 rounded-lg flex flex-col h-full bg-orange-50/30 dark:bg-orange-950/10 hover:shadow-lg transition-all duration-300 overflow-hidden">
                            
                            <!-- Header avec fond gradient et icône circulaire -->
                            <div class="relative bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900 dark:to-orange-800 p-6 flex items-center justify-center">
                              <!-- Status Badge -->
                              <div class="absolute top-3 right-3">
                                <p-tag value="Inactif" severity="warn" [rounded]="true" />
                              </div>

                              <!-- Guild Icon (circulaire avec opacité) -->
                              @if (guild.icon) {
                                <img 
                                  class="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-white dark:border-surface-800 opacity-75"
                                  [src]="getGuildIconUrl(guild)" 
                                  [alt]="guild.name" />
                              } @else {
                                <div class="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg border-4 border-white dark:border-surface-800 opacity-75">
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
                                @if (guild.botAddedAt) {
                                  <div class="text-sm text-surface-600 dark:text-surface-400 mt-2">
                                    <i class="pi pi-clock mr-1"></i>
                                    Inactif depuis {{ formatDate(guild.botAddedAt) }}
                                  </div>
                                }
                              </div>

                              <!-- Action Button -->
                              <div class="mt-auto">
                                <p-button 
                                  label="Réactiver le bot" 
                                  icon="pi pi-replay"
                                  severity="warn"
                                  styleClass="w-full"
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
                    Tous vos serveurs sont actifs - Excellent !
                  </p>
                </div>
              }
            </p-tabpanel>

            <!-- Panel Serveurs Non Configurés -->
            <p-tabpanel [value]="2">
              <p-message severity="info" styleClass="w-full mb-4">
                Ajoutez le bot à ces serveurs pour commencer à les administrer avec notre plateforme.
              </p-message>

              @if (guildFacade.notAddedGuilds().length > 0) {
                <p-dataview [value]="guildFacade.notAddedGuilds()" layout="grid">
                  <ng-template #grid let-guilds>
                    <div class="grid grid-cols-12 gap-4">
                      @for (guild of guilds; track guild.id) {
                        <div class="col-span-12 sm:col-span-6 lg:col-span-4 p-2">
                          <div class="border border-blue-200 dark:border-blue-800 rounded-lg flex flex-col h-full bg-blue-50/30 dark:bg-blue-950/10 hover:shadow-lg transition-all duration-300 overflow-hidden">
                            
                            <!-- Header avec fond gradient et icône circulaire -->
                            <div class="relative bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-800 p-6 flex items-center justify-center">
                              <!-- Status Badge -->
                              <div class="absolute top-3 right-3">
                                <p-tag value="Non configuré" severity="info" [rounded]="true" />
                              </div>

                              <!-- Guild Icon (circulaire) -->
                              @if (guild.icon) {
                                <img 
                                  class="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-white dark:border-surface-800"
                                  [src]="getGuildIconUrl(guild)" 
                                  [alt]="guild.name" />
                              } @else {
                                <div class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg border-4 border-white dark:border-surface-800">
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

                              <!-- Action Button -->
                              <div class="mt-auto">
                                <p-button 
                                  label="Configurer le bot" 
                                  icon="pi pi-cog"
                                  severity="info"
                                  styleClass="w-full"
                                  (onClick)="configureBot(guild)" />
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
                <li>Pour les nouveaux serveurs, cliquez sur "Configurer le bot" pour commencer</li>
              </ul>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ServerListComponent implements OnInit {
  protected readonly guildFacade = inject(GuildFacadeService);
  private readonly router = inject(Router);
  
  protected selectedGuildId: string | null = null;

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

  async selectGuild(guild: GuildWithBotStatusDTO): Promise<void> {
    this.selectedGuildId = guild.id;
    try {
      await this.guildFacade.selectGuild(guild);
    } catch (error) {
      console.error('Failed to select guild:', error);
      this.selectedGuildId = null;
    }
  }

  async refreshGuilds(): Promise<void> {
    await this.guildFacade.refreshGuildsList();
  }

  getGuildIconUrl(guild: GuildWithBotStatusDTO): string {
    if (!guild.icon) return '';
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`;
  }

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

  // Actions pour les guilds inactives et non configurées
  reactivateBot(guild: GuildWithBotStatusDTO): void {
    console.log('Réactivation du bot pour la guild:', guild.id, guild.name);
    // TODO: Implémenter la logique de réinvitation du bot
  }

  configureBot(guild: GuildWithBotStatusDTO): void {
    console.log('Configuration du bot pour la guild:', guild.id, guild.name);
    // TODO: Implémenter la logique d'ajout du bot
  }
}