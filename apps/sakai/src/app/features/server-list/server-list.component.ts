import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// PrimeNG Imports
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';

// Services
import { GuildFacadeService } from '@app/services/guild/guild-facade.service';
import { GuildWithBotStatusDTO } from '@my-project/shared-types';

@Component({
  selector: 'app-server-list',
  standalone: true,
  imports: [
    CommonModule,
    AccordionModule,
    ButtonModule,
    TagModule,
    BadgeModule,
    MessageModule,
    ProgressSpinnerModule,
    TooltipModule
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

        <!-- Status de connexion -->
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

      <!-- Accordion avec les 3 catégories -->
      @if (!guildFacade.isLoading()) {
        <p-accordion [value]="['0', '1', '2']" [multiple]="true">
          
          <!-- 1. Serveurs Actifs -->
          <p-accordion-panel value="0">
            <p-accordion-header>
              <div class="flex items-center justify-between w-full pr-4">
                <div class="flex items-center gap-3">
                  <i class="pi pi-check-circle text-green-500 text-xl"></i>
                  <span class="font-bold">Serveurs actifs</span>
                  <p-badge 
                    [value]="guildFacade.activeGuilds().length.toString()" 
                    severity="success" />
                </div>
                <p-tag 
                  value="Bot présent" 
                  severity="success" 
                  [rounded]="true" />
              </div>
            </p-accordion-header>
            
            <p-accordion-content>
              @if (guildFacade.activeGuilds().length > 0) {
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  @for (guild of guildFacade.activeGuilds(); track guild.id) {
                    <div class="border border-surface rounded-lg p-4 hover:shadow-lg transition-all duration-300"
                         [class.ring-2]="guildFacade.isGuildSelected(guild.id)"
                         [class.ring-primary]="guildFacade.isGuildSelected(guild.id)">
                      
                      <!-- Icon & Header -->
                      <div class="flex items-center gap-3 mb-4">
                        @if (guild.icon) {
                          <img 
                            [src]="getGuildIconUrl(guild)" 
                            [alt]="guild.name"
                            class="w-12 h-12 rounded-full" />
                        } @else {
                          <div class="w-12 h-12 rounded-full bg-primary text-primary-contrast flex items-center justify-center text-xl font-bold">
                            {{ guild.name.charAt(0).toUpperCase() }}
                          </div>
                        }
                        
                        <div class="flex-1 min-w-0">
                          <h3 class="font-bold truncate" [title]="guild.name">
                            {{ guild.name }}
                          </h3>
                          <div class="flex flex-wrap gap-1 mt-1">
                            @if (guild.owner) {
                              <p-tag 
                                value="Propriétaire" 
                                icon="pi pi-crown"
                                severity="warn"
                                styleClass="text-xs" />
                            }
                          </div>
                        </div>
                      </div>

                      <!-- Bouton Administrer -->
                      <p-button 
                        label="Administrer" 
                        icon="pi pi-arrow-right"
                        styleClass="w-full"
                        [loading]="guildFacade.isLoadingGuildDetails() && selectedGuildId === guild.id"
                        (onClick)="selectGuild(guild)" />
                    </div>
                  }
                </div>
              } @else {
                <p-message severity="info" styleClass="w-full">
                  <div class="text-center py-4">
                    <i class="pi pi-inbox text-4xl mb-2"></i>
                    <div>Aucun serveur actif</div>
                  </div>
                </p-message>
              }
            </p-accordion-content>
          </p-accordion-panel>

          <!-- 2. Serveurs Inactifs -->
          <p-accordion-panel value="1">
            <p-accordion-header>
              <div class="flex items-center justify-between w-full pr-4">
                <div class="flex items-center gap-3">
                  <i class="pi pi-clock text-orange-500 text-xl"></i>
                  <span class="font-bold">Serveurs inactifs</span>
                  <p-badge 
                    [value]="guildFacade.inactiveGuilds().length.toString()" 
                    severity="warn" />
                </div>
                <p-tag 
                  value="Bot retiré" 
                  severity="warn" 
                  [rounded]="true" />
              </div>
            </p-accordion-header>
            
            <p-accordion-content>
              @if (guildFacade.inactiveGuilds().length > 0) {
                <div class="mb-4">
                  <p-message severity="warn" styleClass="w-full">
                    Le bot a été retiré de ces serveurs. Vous pouvez le réinviter pour réactiver la configuration.
                  </p-message>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  @for (guild of guildFacade.inactiveGuilds(); track guild.id) {
                    <div class="border border-orange-200 dark:border-orange-800 rounded-lg p-4 bg-orange-50 dark:bg-orange-950/20">
                      
                      <!-- Icon & Header -->
                      <div class="flex items-center gap-3 mb-4">
                        @if (guild.icon) {
                          <img 
                            [src]="getGuildIconUrl(guild)" 
                            [alt]="guild.name"
                            class="w-12 h-12 rounded-full opacity-60" />
                        } @else {
                          <div class="w-12 h-12 rounded-full bg-orange-400 text-white flex items-center justify-center text-xl font-bold opacity-60">
                            {{ guild.name.charAt(0).toUpperCase() }}
                          </div>
                        }
                        
                        <div class="flex-1 min-w-0">
                          <h3 class="font-bold truncate" [title]="guild.name">
                            {{ guild.name }}
                          </h3>
                          <div class="flex flex-wrap gap-1 mt-1">
                            @if (guild.owner) {
                              <p-tag 
                                value="Propriétaire" 
                                icon="pi pi-crown"
                                severity="warn"
                                styleClass="text-xs" />
                            }
                            @if (guild.botAddedAt) {
                              <p-tag 
                                [value]="'Inactif depuis ' + formatDate(guild.botAddedAt)"
                                severity="warn"
                                styleClass="text-xs"
                                pTooltip="Date de retrait du bot" />
                            }
                          </div>
                        </div>
                      </div>

                      <!-- Bouton Réactiver -->
                      <p-button 
                        label="Réactiver le bot" 
                        icon="pi pi-replay"
                        severity="warn"
                        styleClass="w-full"
                        (onClick)="reactivateBot(guild)" />
                    </div>
                  }
                </div>
              } @else {
                <p-message severity="success" styleClass="w-full">
                  <div class="text-center py-4">
                    <i class="pi pi-check text-4xl mb-2"></i>
                    <div>Aucun serveur inactif - Excellent !</div>
                  </div>
                </p-message>
              }
            </p-accordion-content>
          </p-accordion-panel>

          <!-- 3. Serveurs Non Configurés -->
          <p-accordion-panel value="2">
            <p-accordion-header>
              <div class="flex items-center justify-between w-full pr-4">
                <div class="flex items-center gap-3">
                  <i class="pi pi-plus-circle text-blue-500 text-xl"></i>
                  <span class="font-bold">Serveurs non configurés</span>
                  <p-badge 
                    [value]="guildFacade.notAddedGuilds().length.toString()" 
                    severity="info" />
                </div>
                <p-tag 
                  value="Bot non ajouté" 
                  severity="info" 
                  [rounded]="true" />
              </div>
            </p-accordion-header>
            
            <p-accordion-content>
              @if (guildFacade.notAddedGuilds().length > 0) {
                <div class="mb-4">
                  <p-message severity="info" styleClass="w-full">
                    Ajoutez le bot à ces serveurs pour commencer à les administrer avec notre plateforme.
                  </p-message>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  @for (guild of guildFacade.notAddedGuilds(); track guild.id) {
                    <div class="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
                      
                      <!-- Icon & Header -->
                      <div class="flex items-center gap-3 mb-4">
                        @if (guild.icon) {
                          <img 
                            [src]="getGuildIconUrl(guild)" 
                            [alt]="guild.name"
                            class="w-12 h-12 rounded-full" />
                        } @else {
                          <div class="w-12 h-12 rounded-full bg-blue-400 text-white flex items-center justify-center text-xl font-bold">
                            {{ guild.name.charAt(0).toUpperCase() }}
                          </div>
                        }
                        
                        <div class="flex-1 min-w-0">
                          <h3 class="font-bold truncate" [title]="guild.name">
                            {{ guild.name }}
                          </h3>
                          <div class="flex flex-wrap gap-1 mt-1">
                            @if (guild.owner) {
                              <p-tag 
                                value="Propriétaire" 
                                icon="pi pi-crown"
                                severity="warn"
                                styleClass="text-xs" />
                            }
                          </div>
                        </div>
                      </div>

                      <!-- Bouton Configurer -->
                      <p-button 
                        label="Configurer le bot" 
                        icon="pi pi-cog"
                        severity="info"
                        styleClass="w-full"
                        (onClick)="configureBot(guild)" />
                    </div>
                  }
                </div>
              } @else {
                <p-message severity="success" styleClass="w-full">
                  <div class="text-center py-4">
                    <i class="pi pi-check text-4xl mb-2"></i>
                    <div>Tous vos serveurs sont déjà configurés !</div>
                  </div>
                </p-message>
              }
            </p-accordion-content>
          </p-accordion-panel>

        </p-accordion>
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
    // Mais on peut forcer un refresh si nécessaire
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
    // Probablement ouvrir une popup avec le lien d'invitation Discord
  }

  configureBot(guild: GuildWithBotStatusDTO): void {
    console.log('Configuration du bot pour la guild:', guild.id, guild.name);
    // TODO: Implémenter la logique d'ajout du bot
    // Probablement ouvrir une popup avec le lien d'invitation Discord
  }
}