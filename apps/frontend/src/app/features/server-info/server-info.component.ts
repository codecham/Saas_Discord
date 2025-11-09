import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GuildFacadeService } from '@app/services/guild/guild-facade.service';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { AccordionModule } from 'primeng/accordion';

@Component({
  selector: 'app-server-info',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule,
    DividerModule,
    ProgressSpinnerModule,
    ChipModule,
    TooltipModule,
    AccordionModule
  ],
  template: `
    <div class="server-info-container p-4">
      <!-- Loading -->
      <div *ngIf="guildFacade.isLoadingGuildDetails()" class="flex justify-center items-center py-12">
        <p-progressSpinner 
          styleClass="w-16 h-16" 
          strokeWidth="4"
          animationDuration="1s">
        </p-progressSpinner>
      </div>

      <!-- No Guild Selected -->
      <div *ngIf="!currentGuild() && !guildFacade.isLoadingGuildDetails()">
        <p-card>
          <div class="text-center py-8">
            <i class="pi pi-inbox text-6xl text-gray-400 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Aucun serveur sélectionné
            </h3>
            <p class="text-gray-500 dark:text-gray-400 mb-4">
              Veuillez sélectionner un serveur pour voir ses informations
            </p>
            <p-button 
              label="Sélectionner un serveur" 
              icon="pi pi-server"
              (onClick)="navigateToServerList()">
            </p-button>
          </div>
        </p-card>
      </div>

      <!-- Guild Info -->
      <div *ngIf="currentGuild() && !guildFacade.isLoadingGuildDetails()">
        <!-- Header -->
        <div class="mb-6">
          <div class="flex items-center gap-4 mb-4">
            <p-button 
              icon="pi pi-arrow-left" 
              [outlined]="true"
              [rounded]="true"
              (onClick)="navigateToServerList()"
              pTooltip="Retour à la liste">
            </p-button>
            <div class="flex-1">
              <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                Informations du serveur
              </h1>
              <p class="text-gray-600 dark:text-gray-400 mt-1">
                Détails et statistiques du serveur Discord
              </p>
            </div>
            <p-button 
              label="Rafraîchir" 
              icon="pi pi-refresh"
              [outlined]="true"
              (onClick)="refreshGuild()"
              [loading]="guildFacade.isLoadingGuildDetails()">
            </p-button>
          </div>
        </div>

        <!-- Main Card -->
        <p-card styleClass="mb-4">
          <div class="flex flex-col md:flex-row gap-6">
            <!-- Guild Icon -->
            <div class="flex-shrink-0">
              <div class="w-32 h-32 rounded-xl overflow-hidden shadow-lg border-4 border-white dark:border-gray-700">
                <img 
                  *ngIf="guildIconUrl(); else noIcon"
                  [src]="guildIconUrl()" 
                  [alt]="currentGuild()!.name"
                  class="w-full h-full object-cover">
                <ng-template #noIcon>
                  <div class="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold">
                    {{ currentGuild()!.name.charAt(0).toUpperCase() }}
                  </div>
                </ng-template>
              </div>
            </div>

            <!-- Guild Details -->
            <div class="flex-1">
              <div class="flex items-start justify-between mb-4">
                <div>
                  <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {{ currentGuild()!.name }}
                  </h2>
                  <div class="flex flex-wrap gap-2">
                    <p-tag 
                      *ngIf="currentGuild()!.owner"
                      severity="warn" 
                      [rounded]="true">
                      <i class="pi pi-crown mr-1"></i>Propriétaire
                    </p-tag>
                    <p-tag 
                      severity="success" 
                      [rounded]="true">
                      <i class="pi pi-check-circle mr-1"></i>Actif
                    </p-tag>
                    <p-tag 
                      *ngIf="isPremium()"
                      severity="info" 
                      [rounded]="true">
                      <i class="pi pi-star mr-1"></i>Premium
                    </p-tag>
                  </div>
                </div>
              </div>

              <!-- Quick Stats -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {{ memberCount() || '...' }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">Membres</div>
                </div>
                <div class="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div class="text-2xl font-bold text-green-600 dark:text-green-400">
                    {{ channelCount() || '...' }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">Salons</div>
                </div>
                <div class="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {{ roleCount() || '...' }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">Rôles</div>
                </div>
                <div class="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div class="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {{ emojiCount() || '...' }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">Émojis</div>
                </div>
              </div>
            </div>
          </div>
        </p-card>

        <!-- Accordion for Details -->
        <p-accordion [value]="['0']" [multiple]="true">
          <!-- General Section -->
          <p-accordion-panel value="0">
            <p-accordion-header>
              <span class="flex align-items-center gap-2 w-full">
                <i class="pi pi-info-circle text-primary"></i>
                <span class="font-bold white-space-nowrap">Informations générales</span>
              </span>
            </p-accordion-header>
            <p-accordion-content>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="info-item">
                  <label class="info-label">ID du serveur</label>
                  <div class="info-value font-mono">{{ currentGuild()!.id }}</div>
                </div>
                <div class="info-item">
                  <label class="info-label">Niveau de vérification</label>
                  <div class="info-value">{{ verificationLevel() }}</div>
                </div>
                <div class="info-item">
                  <label class="info-label">Filtre de contenu</label>
                  <div class="info-value">{{ explicitContentFilter() }}</div>
                </div>
                <div class="info-item">
                  <label class="info-label">Notifications par défaut</label>
                  <div class="info-value">{{ defaultNotifications() }}</div>
                </div>
                <div class="info-item" *ngIf="currentGuild()!.description">
                  <label class="info-label">Description</label>
                  <div class="info-value">{{ currentGuild()!.description }}</div>
                </div>
                <div class="info-item" *ngIf="currentGuild()!.preferred_locale">
                  <label class="info-label">Langue préférée</label>
                  <div class="info-value">{{ currentGuild()!.preferred_locale }}</div>
                </div>
              </div>
            </p-accordion-content>
          </p-accordion-panel>

          <!-- Features Section -->
          <p-accordion-panel value="1">
            <p-accordion-header>
              <span class="flex align-items-center gap-2 w-full">
                <i class="pi pi-sparkles text-primary"></i>
                <span class="font-bold white-space-nowrap">Fonctionnalités Discord</span>
              </span>
            </p-accordion-header>
            <p-accordion-content>
              <div *ngIf="currentGuild()!.features && currentGuild()!.features!.length > 0; else noFeatures">
                <div class="flex flex-wrap gap-2">
                  <p-chip 
                    *ngFor="let feature of currentGuild()!.features"
                    [label]="formatFeature(feature)"
                    styleClass="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  </p-chip>
                </div>
              </div>
              <ng-template #noFeatures>
                <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                  <i class="pi pi-info-circle text-4xl mb-3"></i>
                  <p>Aucune fonctionnalité spéciale activée</p>
                </div>
              </ng-template>
            </p-accordion-content>
          </p-accordion-panel>

          <!-- Channels Section -->
          <p-accordion-panel value="2">
            <p-accordion-header>
              <span class="flex align-items-center gap-2 w-full">
                <i class="pi pi-hashtag text-primary"></i>
                <span class="font-bold white-space-nowrap">Configuration des salons</span>
              </span>
            </p-accordion-header>
            <p-accordion-content>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="info-item">
                  <label class="info-label">Nombre total de salons</label>
                  <div class="info-value">{{ channelCount() || 'Non disponible' }}</div>
                </div>
                <div class="info-item" *ngIf="currentGuild()!.afk_channel_id">
                  <label class="info-label">Salon AFK</label>
                  <div class="info-value font-mono">{{ currentGuild()!.afk_channel_id }}</div>
                </div>
                <div class="info-item" *ngIf="currentGuild()!.afk_timeout">
                  <label class="info-label">Délai AFK</label>
                  <div class="info-value">{{ currentGuild()!.afk_timeout / 60 }} minutes</div>
                </div>
                <div class="info-item" *ngIf="currentGuild()!.system_channel_id">
                  <label class="info-label">Salon système</label>
                  <div class="info-value font-mono">{{ currentGuild()!.system_channel_id }}</div>
                </div>
                <div class="info-item" *ngIf="currentGuild()!.rules_channel_id">
                  <label class="info-label">Salon des règles</label>
                  <div class="info-value font-mono">{{ currentGuild()!.rules_channel_id }}</div>
                </div>
                <div class="info-item" *ngIf="currentGuild()!.public_updates_channel_id">
                  <label class="info-label">Salon mises à jour publiques</label>
                  <div class="info-value font-mono">{{ currentGuild()!.public_updates_channel_id }}</div>
                </div>
              </div>
            </p-accordion-content>
          </p-accordion-panel>

          <!-- Boost Section -->
          <p-accordion-panel value="3">
            <p-accordion-header>
              <span class="flex align-items-center gap-2 w-full">
                <i class="pi pi-star-fill text-primary"></i>
                <span class="font-bold white-space-nowrap">Statut Premium & Boosts</span>
              </span>
            </p-accordion-header>
            <p-accordion-content>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="info-item text-center">
                  <label class="info-label">Niveau de boost</label>
                  <div class="info-value">
                    <span class="text-3xl font-bold text-pink-600 dark:text-pink-400">
                      Niveau {{ currentGuild()!.premium_tier || 0 }}
                    </span>
                  </div>
                </div>
                <div class="info-item text-center">
                  <label class="info-label">Nombre de boosts</label>
                  <div class="info-value">
                    <span class="text-3xl font-bold text-pink-600 dark:text-pink-400">
                      {{ currentGuild()!.premium_subscription_count || 0 }}
                    </span>
                  </div>
                </div>
                <div class="info-item text-center">
                  <label class="info-label">Progression</label>
                  <div class="info-value text-sm">
                    {{ boostProgress() }}
                  </div>
                </div>
              </div>

              <!-- Boost Benefits -->
              <p-divider></p-divider>
              <div class="mt-4">
                <h4 class="font-semibold mb-3 text-gray-800 dark:text-gray-200">
                  Avantages du niveau actuel :
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div class="flex items-center gap-2 text-sm">
                    <i class="pi pi-check-circle text-green-500"></i>
                    <span>Qualité audio améliorée ({{ getAudioQuality() }})</span>
                  </div>
                  <div class="flex items-center gap-2 text-sm">
                    <i class="pi pi-check-circle text-green-500"></i>
                    <span>Limite d'upload : {{ getUploadLimit() }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-sm">
                    <i class="pi pi-check-circle text-green-500"></i>
                    <span>Emojis personnalisés : {{ getEmojiSlots() }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-sm">
                    <i class="pi pi-check-circle text-green-500"></i>
                    <span>Stickers personnalisés : {{ getStickerSlots() }}</span>
                  </div>
                </div>
              </div>
            </p-accordion-content>
          </p-accordion-panel>
        </p-accordion>

        <!-- Action Buttons -->
        <div class="mt-6 flex flex-wrap gap-3">
          <p-button 
            label="Gérer les membres" 
            icon="pi pi-users"
            (onClick)="navigateToMembers()">
          </p-button>
          <p-button 
            label="Gérer les salons" 
            icon="pi pi-hashtag"
            [outlined]="true"
            (onClick)="navigateToChannels()">
          </p-button>
          <p-button 
            label="Gérer les rôles" 
            icon="pi pi-shield"
            [outlined]="true"
            (onClick)="navigateToRoles()">
          </p-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .server-info-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .info-item {
      padding: 1rem;
      background: var(--surface-ground);
      border-radius: 8px;
      border: 1px solid var(--surface-border);
    }

    .info-label {
      display: block;
      font-size: 0.875rem;
      color: var(--text-color-secondary);
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .info-value {
      font-size: 1rem;
      color: var(--text-color);
      word-break: break-all;
    }

    :host ::ng-deep .p-accordion .p-accordion-header-link {
      padding: 1.25rem;
    }

    :host ::ng-deep .p-accordion .p-accordion-content {
      padding: 1.5rem;
    }
  `]
})
export class ServerInfoComponent {
  protected readonly guildFacade = inject(GuildFacadeService);
  private readonly router = inject(Router);

  protected readonly currentGuild = this.guildFacade.selectedGuild;

  // Computed properties
  protected readonly guildIconUrl = computed(() => {
    const guild = this.currentGuild();
    if (!guild?.icon) return null;
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`;
  });

  protected readonly memberCount = computed(() => {
    return this.currentGuild()?.approximate_member_count;
  });

  protected readonly channelCount = computed(() => {
    // Les channels ne sont pas dans DiscordGuildDTO par défaut
    // Vous devrez faire un appel API séparé pour obtenir cette info
    return 'N/A';
  });

  protected readonly roleCount = computed(() => {
    return this.currentGuild()?.roles?.length || 'N/A';
  });

  protected readonly emojiCount = computed(() => {
    return this.currentGuild()?.emojis?.length || 'N/A';
  });

  protected readonly isPremium = computed(() => {
    return (this.currentGuild()?.premium_tier || 0) > 0;
  });

  protected readonly verificationLevel = computed(() => {
    const level = this.currentGuild()?.verification_level;
    const levels = ['Aucune', 'Faible', 'Moyenne', 'Élevée', 'Très élevée'];
    return levels[level || 0];
  });

  protected readonly explicitContentFilter = computed(() => {
    const filter = this.currentGuild()?.explicit_content_filter;
    const filters = ['Désactivé', 'Membres sans rôle', 'Tous les membres'];
    return filters[filter || 0];
  });

  protected readonly defaultNotifications = computed(() => {
    const notif = this.currentGuild()?.default_message_notifications;
    return notif === 1 ? 'Mentions uniquement' : 'Tous les messages';
  });

  protected readonly boostProgress = computed(() => {
    const currentBoosts = this.currentGuild()?.premium_subscription_count || 0;
    const currentTier = this.currentGuild()?.premium_tier || 0;
    
    const boostsRequired = [0, 2, 7, 14];
    const nextTier = currentTier + 1;
    
    if (nextTier >= boostsRequired.length) {
      return 'Niveau maximum atteint ! 🎉';
    }
    
    const required = boostsRequired[nextTier];
    const remaining = required - currentBoosts;
    
    return remaining > 0 
      ? `${remaining} boost${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''}`
      : 'Prêt pour le niveau suivant !';
  });

  formatFeature(feature: string): string {
    return feature
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  getAudioQuality(): string {
    const tier = this.currentGuild()?.premium_tier || 0;
    const qualities = ['96 kbps', '128 kbps', '256 kbps', '384 kbps'];
    return qualities[tier];
  }

  getUploadLimit(): string {
    const tier = this.currentGuild()?.premium_tier || 0;
    const limits = ['25 MB', '25 MB', '50 MB', '100 MB'];
    return limits[tier];
  }

  getEmojiSlots(): string {
    const tier = this.currentGuild()?.premium_tier || 0;
    const slots = ['50', '100', '150', '250'];
    return slots[tier];
  }

  getStickerSlots(): string {
    const tier = this.currentGuild()?.premium_tier || 0;
    const slots = ['5', '15', '30', '60'];
    return slots[tier];
  }

  async refreshGuild(): Promise<void> {
    await this.guildFacade.refreshSelectedGuild();
  }

  navigateToServerList(): void {
    this.router.navigate(['/server-list']);
  }

  navigateToMembers(): void {
    this.router.navigate(['/members']);
  }

  navigateToChannels(): void {
    this.router.navigate(['/channels']);
  }

  navigateToRoles(): void {
    this.router.navigate(['/roles']);
  }
}