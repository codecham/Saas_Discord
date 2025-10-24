import { Component, ViewChild, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { RippleModule } from 'primeng/ripple';
import { SkeletonModule } from 'primeng/skeleton';
import { ChipModule } from 'primeng/chip';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';
import { SelectModule } from 'primeng/select';
import { DrawerModule } from 'primeng/drawer';
import { DividerModule } from 'primeng/divider';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { MessageService } from 'primeng/api';
import { ChannelFacadeService } from '@app/services/channel/channel-facade.service';
import { GuildFacadeService } from '@app/services/guild/guild-facade.service';
import { GuildChannelDTO, DiscordChannelType } from '@my-project/shared-types';

/**
 * 🎨 Composant de gestion des channels - Design moderne et professionnel
 * 
 * Features:
 * - Liste des channels avec groupement par catégorie
 * - Filtres par type et recherche
 * - Sidebar de détails avec tabs (Overview, Permissions, Settings)
 * - Actions CRUD (Create, Edit, Delete, Clone)
 * - Support complet de tous les types de channels
 * - Design responsive et accessible
 */
@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    TooltipModule,
    InputIconModule,
    IconFieldModule,
    RippleModule,
    SkeletonModule,
    ChipModule,
    ToastModule,
    TabsModule,
    SelectModule,
    DrawerModule,
    DividerModule,
    ScrollPanelModule
  ],
  providers: [MessageService],
  template: `
    <div class="grid">
      <!-- ============================================ -->
      <!-- HEADER AVEC STATS -->
      <!-- ============================================ -->
      <div class="col-span-12">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h1 class="font-semibold text-3xl m-0">Channels & Catégories</h1>
            @if (guildFacade.selectedGuild(); as guild) {
              <p class="text-muted-color text-sm mt-1">
                {{ guild.name }}
                @if (!channelFacade.isLoading()) {
                  <span> · {{ channelFacade.totalChannels() }} channel{{ channelFacade.totalChannels() > 1 ? 's' : '' }}</span>
                }
              </p>
            }
          </div>

          <div class="flex gap-2">
            <button 
              pButton 
              icon="pi pi-refresh" 
              label="Actualiser" 
              [outlined]="true"
              [loading]="channelFacade.isLoading()"
              (click)="refreshChannels()"
              pTooltip="Recharger les channels"
              tooltipPosition="bottom">
            </button>
            
            <button 
              pButton 
              icon="pi pi-plus" 
              label="Nouveau channel" 
              severity="primary"
              (click)="openCreateChannelModal()"
              pTooltip="Créer un nouveau channel"
              tooltipPosition="bottom">
            </button>
          </div>
        </div>

        <!-- STATS CARDS -->
        @if (!channelFacade.isLoading()) {
          <div class="grid mb-4">
            <div class="col-span-6 md:col-span-3 lg:col-span-2">
              <div class="surface-card p-3 rounded border border-surface">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-muted-color text-sm">Catégories</span>
                  <i class="pi pi-folder text-lg text-blue-500"></i>
                </div>
                <div class="text-2xl font-semibold">{{ channelFacade.stats().categories }}</div>
              </div>
            </div>

            <div class="col-span-6 md:col-span-3 lg:col-span-2">
              <div class="surface-card p-3 rounded border border-surface">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-muted-color text-sm">Texte</span>
                  <i class="pi pi-hashtag text-lg text-green-500"></i>
                </div>
                <div class="text-2xl font-semibold">{{ channelFacade.stats().text }}</div>
              </div>
            </div>

            <div class="col-span-6 md:col-span-3 lg:col-span-2">
              <div class="surface-card p-3 rounded border border-surface">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-muted-color text-sm">Vocal</span>
                  <i class="pi pi-volume-up text-lg text-orange-500"></i>
                </div>
                <div class="text-2xl font-semibold">{{ channelFacade.stats().voice }}</div>
              </div>
            </div>

            <div class="col-span-6 md:col-span-3 lg:col-span-2">
              <div class="surface-card p-3 rounded border border-surface">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-muted-color text-sm">Forums</span>
                  <i class="pi pi-comments text-lg text-purple-500"></i>
                </div>
                <div class="text-2xl font-semibold">{{ channelFacade.stats().forums }}</div>
              </div>
            </div>

            <div class="col-span-6 md:col-span-3 lg:col-span-2">
              <div class="surface-card p-3 rounded border border-surface">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-muted-color text-sm">Threads</span>
                  <i class="pi pi-list text-lg text-cyan-500"></i>
                </div>
                <div class="text-2xl font-semibold">{{ channelFacade.stats().threads }}</div>
              </div>
            </div>

            <div class="col-span-6 md:col-span-3 lg:col-span-2">
              <div class="surface-card p-3 rounded border border-surface">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-muted-color text-sm">Privés</span>
                  <i class="pi pi-lock text-lg text-red-500"></i>
                </div>
                <div class="text-2xl font-semibold">{{ channelFacade.stats().private }}</div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- ============================================ -->
      <!-- FILTRES -->
      <!-- ============================================ -->
      <div class="col-span-12">
        <div class="surface-card p-4 rounded border border-surface">
          <div class="grid gap-3">
            <!-- Recherche -->
            <div class="col-span-12 md:col-span-4">
              <p-iconfield iconPosition="left" class="w-full">
                <p-inputicon styleClass="pi pi-search" />
                <input 
                  pInputText 
                  type="text" 
                  placeholder="Rechercher un channel..." 
                  class="w-full"
                  [ngModel]="channelFacade.searchQuery()"
                  (ngModelChange)="channelFacade.setSearchQuery($event)" />
              </p-iconfield>
            </div>

            <!-- Filtre par type -->
            <div class="col-span-12 md:col-span-4">
              <p-select 
                [options]="channelTypeOptions"
                [(ngModel)]="selectedTypeFilter"
                (ngModelChange)="onTypeFilterChange($event)"
                placeholder="Tous les types"
                optionLabel="label"
                optionValue="value"
                [style]="{'width': '100%'}">
              </p-select>
            </div>

            <!-- Filtre par catégorie -->
            <div class="col-span-12 md:col-span-4">
              <p-select 
                [options]="categoryOptions()"
                [(ngModel)]="selectedCategoryFilter"
                (ngModelChange)="onCategoryFilterChange($event)"
                placeholder="Toutes les catégories"
                optionLabel="label"
                optionValue="value"
                [style]="{'width': '100%'}">
              </p-select>
            </div>
          </div>

          <!-- Résultats du filtre -->
          @if (channelFacade.filteredCount() !== channelFacade.totalChannels()) {
            <div class="mt-3 flex items-center justify-between">
              <p class="text-sm text-muted-color">
                {{ channelFacade.filteredCount() }} résultat{{ channelFacade.filteredCount() > 1 ? 's' : '' }} 
                sur {{ channelFacade.totalChannels() }}
              </p>
              <button 
                pButton 
                label="Réinitialiser les filtres" 
                icon="pi pi-filter-slash"
                [text]="true"
                size="small"
                (click)="clearFilters()">
              </button>
            </div>
          }
        </div>
      </div>

      <!-- ============================================ -->
      <!-- LISTE DES CHANNELS -->
      <!-- ============================================ -->
      <div class="col-span-12">
        @if (channelFacade.isLoading()) {
          <!-- SKELETON LOADING -->
          <div class="surface-card p-4 rounded border border-surface">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="flex items-center gap-3 mb-3 pb-3 border-b border-surface last:border-0">
                <p-skeleton shape="circle" size="3rem"></p-skeleton>
                <div class="flex-1">
                  <p-skeleton width="60%" height="1.5rem" class="mb-2"></p-skeleton>
                  <p-skeleton width="40%" height="1rem"></p-skeleton>
                </div>
                <p-skeleton width="8rem" height="2rem"></p-skeleton>
              </div>
            }
          </div>
        } @else {
          <!-- CHANNELS GROUPÉS PAR CATÉGORIE -->
          <div class="space-y-4">
            @for (group of channelFacade.channelsGroupedByCategory(); track group.category?.id || 'no-category') {
              <div class="surface-card rounded border border-surface overflow-hidden">
                <!-- Header de la catégorie -->
                <div class="bg-surface-50 dark:bg-surface-800 px-4 py-3 border-b border-surface">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <i class="pi pi-folder text-lg" [class]="group.category ? 'text-blue-500' : 'text-muted-color'"></i>
                      <h3 class="font-semibold text-lg m-0">
                        {{ group.category?.name || 'Sans catégorie' }}
                      </h3>
                      <p-chip 
                        [label]="group.channels.length.toString()" 
                        [style]="{'min-width': '2rem'}"
                        styleClass="text-xs">
                      </p-chip>
                    </div>
                    @if (group.category) {
                      <button 
                        pButton 
                        icon="pi pi-ellipsis-v" 
                        [text]="true"
                        [rounded]="true"
                        size="small"
                        (click)="openCategoryMenu($event, group.category!)"
                        pTooltip="Actions de la catégorie"
                        tooltipPosition="left">
                      </button>
                    }
                  </div>
                </div>

                <!-- Liste des channels dans la catégorie -->
                <div class="p-2">
                  @for (channel of group.channels; track channel.id) {
                    <div 
                      class="flex items-center gap-3 p-3 rounded hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer transition-colors"
                      [class.bg-primary-50]="channelFacade.selectedChannel()?.id === channel.id"
                      [class.dark:bg-primary-900]="channelFacade.selectedChannel()?.id === channel.id"
                      (click)="selectChannel(channel)">
                      
                      <!-- Icône du type de channel -->
                      <div class="flex items-center justify-center w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-700">
                        <i [class]="getChannelIcon(channel)" class="text-lg"></i>
                      </div>

                      <!-- Informations du channel -->
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                          <h4 class="font-semibold text-base m-0 truncate">
                            {{ channel.name }}
                          </h4>
                          
                          <!-- Badges -->
                          @if (channel.nsfw) {
                            <p-chip label="NSFW" severity="danger" styleClass="text-xs py-1 px-2"></p-chip>
                          }
                          @if (channel.isLocked) {
                            <i class="pi pi-lock text-red-500" pTooltip="Channel verrouillé"></i>
                          }
                          @if (channel.isPrivate) {
                            <i class="pi pi-eye-slash text-orange-500" pTooltip="Channel privé"></i>
                          }
                          @if (channel.hasSlowmode) {
                            <i class="pi pi-clock text-blue-500" pTooltip="Slowmode actif"></i>
                          }
                        </div>
                        
                        @if (channel.topic) {
                          <p class="text-sm text-muted-color truncate m-0">{{ channel.topic }}</p>
                        } @else {
                          <p class="text-sm text-muted-color italic m-0">Aucune description</p>
                        }
                      </div>

                      <!-- Tag du type -->
                      <p-tag 
                        [value]="getChannelTypeLabel(channel)" 
                        [severity]="getChannelTypeSeverity(channel)"
                        styleClass="text-xs">
                      </p-tag>

                      <!-- Actions -->
                      <button 
                        pButton 
                        icon="pi pi-ellipsis-v" 
                        [text]="true"
                        [rounded]="true"
                        size="small"
                        (click)="openChannelMenu($event, channel); $event.stopPropagation()"
                        pTooltip="Actions"
                        tooltipPosition="left">
                      </button>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Message si aucun résultat -->
            @if (channelFacade.filteredCount() === 0) {
              <div class="surface-card p-8 rounded border border-surface text-center">
                <i class="pi pi-inbox text-6xl text-muted-color mb-3"></i>
                <h3 class="font-semibold text-xl mb-2">Aucun channel trouvé</h3>
                <p class="text-muted-color mb-4">Essayez de modifier vos filtres de recherche</p>
                <button 
                  pButton 
                  label="Réinitialiser les filtres" 
                  icon="pi pi-filter-slash"
                  severity="secondary"
                  (click)="clearFilters()">
                </button>
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- ============================================ -->
    <!-- SIDEBAR DÉTAILS DU CHANNEL -->
    <!-- ============================================ -->
    <p-drawer 
      [(visible)]="showChannelDetails" 
      position="right" 
      [style]="{'width': '450px'}"
      [dismissible]="true"
      (onHide)="channelFacade.clearSelection()">
      
      @if (channelFacade.selectedChannel(); as channel) {
        <!-- Header -->
        <ng-template #header>
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900">
              <i [class]="getChannelIcon(channel)" class="text-xl text-primary-500"></i>
            </div>
            <div class="flex-1 min-w-0">
              <h2 class="font-semibold text-lg m-0 truncate">{{ channel.name }}</h2>
              <p class="text-sm text-muted-color m-0">{{ getChannelTypeLabel(channel) }}</p>
            </div>
          </div>
        </ng-template>

        <!-- Content avec tabs -->
        <p-tabs value="0">
          <!-- TAB: OVERVIEW -->
          <p-tabpanel header="Aperçu" value="0">
            <p-scrollpanel [style]="{'height': 'calc(100vh - 200px)'}">
              <div class="space-y-4">
                <!-- Informations générales -->
                <div class="surface-card p-3 rounded border border-surface">
                  <h4 class="font-semibold text-sm mb-3 flex items-center gap-2">
                    <i class="pi pi-info-circle"></i>
                    Informations générales
                  </h4>
                  
                  <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                      <span class="text-muted-color">ID:</span>
                      <code class="text-xs bg-surface-100 dark:bg-surface-700 px-2 py-1 rounded">{{ channel.id }}</code>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-muted-color">Type:</span>
                      <span class="font-medium">{{ getChannelTypeLabel(channel) }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-muted-color">Position:</span>
                      <span class="font-medium">{{ channel.position }}</span>
                    </div>
                    @if (channel.categoryPath) {
                      <div class="flex justify-between text-sm">
                        <span class="text-muted-color">Catégorie:</span>
                        <span class="font-medium">{{ channel.categoryPath }}</span>
                      </div>
                    }
                    @if (channel.createdAt) {
                      <div class="flex justify-between text-sm">
                        <span class="text-muted-color">Créé le:</span>
                        <span class="font-medium">{{ channel.createdAt | date:'short' }}</span>
                      </div>
                    }
                  </div>
                </div>

                <!-- Description -->
                @if (channel.topic) {
                  <div class="surface-card p-3 rounded border border-surface">
                    <h4 class="font-semibold text-sm mb-2">Description</h4>
                    <p class="text-sm m-0">{{ channel.topic }}</p>
                  </div>
                }

                <!-- Propriétés text channel -->
                @if (channel.isText) {
                  <div class="surface-card p-3 rounded border border-surface">
                    <h4 class="font-semibold text-sm mb-3 flex items-center gap-2">
                      <i class="pi pi-hashtag"></i>
                      Paramètres du channel texte
                    </h4>
                    
                    <div class="space-y-2">
                      <div class="flex justify-between items-center text-sm">
                        <span class="text-muted-color">NSFW:</span>
                        <p-tag 
                          [value]="channel.nsfw ? 'Oui' : 'Non'" 
                          [severity]="channel.nsfw ? 'danger' : 'success'">
                        </p-tag>
                      </div>
                      @if (channel.rateLimitPerUser) {
                        <div class="flex justify-between items-center text-sm">
                          <span class="text-muted-color">Slowmode:</span>
                          <span class="font-medium">{{ channel.rateLimitPerUser }}s</span>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Propriétés voice channel -->
                @if (channel.isVoice) {
                  <div class="surface-card p-3 rounded border border-surface">
                    <h4 class="font-semibold text-sm mb-3 flex items-center gap-2">
                      <i class="pi pi-volume-up"></i>
                      Paramètres du channel vocal
                    </h4>
                    
                    <div class="space-y-2">
                      @if (channel.bitrate) {
                        <div class="flex justify-between text-sm">
                          <span class="text-muted-color">Bitrate:</span>
                          <span class="font-medium">{{ channel.bitrate / 1000 }} kbps</span>
                        </div>
                      }
                      @if (channel.userLimit) {
                        <div class="flex justify-between text-sm">
                          <span class="text-muted-color">Limite d'utilisateurs:</span>
                          <span class="font-medium">{{ channel.userLimit === 0 ? 'Illimité' : channel.userLimit }}</span>
                        </div>
                      }
                      @if (channel.rtcRegion) {
                        <div class="flex justify-between text-sm">
                          <span class="text-muted-color">Région:</span>
                          <span class="font-medium">{{ channel.rtcRegion }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- États -->
                <div class="surface-card p-3 rounded border border-surface">
                  <h4 class="font-semibold text-sm mb-3 flex items-center gap-2">
                    <i class="pi pi-shield"></i>
                    États et restrictions
                  </h4>
                  
                  <div class="flex flex-wrap gap-2">
                    @if (channel.isLocked) {
                      <p-chip label="Verrouillé" icon="pi pi-lock" severity="danger"></p-chip>
                    }
                    @if (channel.isPrivate) {
                      <p-chip label="Privé" icon="pi pi-eye-slash" severity="warn"></p-chip>
                    }
                    @if (channel.hasSlowmode) {
                      <p-chip label="Slowmode" icon="pi pi-clock" severity="info"></p-chip>
                    }
                    @if (!channel.isLocked && !channel.isPrivate && !channel.hasSlowmode) {
                      <p-chip label="Aucune restriction" icon="pi pi-check-circle" severity="success"></p-chip>
                    }
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex flex-col gap-2">
                  <button 
                    pButton 
                    label="Modifier le channel" 
                    icon="pi pi-pencil"
                    severity="primary"
                    [outlined]="true"
                    class="w-full"
                    (click)="editChannel(channel)">
                  </button>
                  <button 
                    pButton 
                    label="Cloner le channel" 
                    icon="pi pi-copy"
                    severity="secondary"
                    [outlined]="true"
                    class="w-full"
                    (click)="cloneChannel(channel)">
                  </button>
                  <button 
                    pButton 
                    label="Supprimer" 
                    icon="pi pi-trash"
                    severity="danger"
                    [outlined]="true"
                    class="w-full"
                    (click)="deleteChannel(channel)">
                  </button>
                </div>
              </div>
            </p-scrollpanel>
          </p-tabpanel>

          <!-- TAB: PERMISSIONS -->
          <p-tabpanel header="Permissions" value="1">
            <p-scrollpanel [style]="{'height': 'calc(100vh - 200px)'}">
              <div class="space-y-3">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-semibold text-sm m-0">Permissions du channel</h4>
                  <button 
                    pButton 
                    icon="pi pi-plus" 
                    label="Ajouter"
                    size="small"
                    [outlined]="true"
                    pTooltip="Ajouter une permission"
                    (click)="addPermissionOverwrite(channel)">
                  </button>
                </div>

                @for (overwrite of channel.permissionOverwrites; track overwrite.id) {
                  <div class="surface-card p-3 rounded border border-surface">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <i [class]="overwrite.targetType === 'role' ? 'pi pi-users' : 'pi pi-user'"></i>
                        <span class="font-medium text-sm">{{ overwrite.targetName || overwrite.id }}</span>
                      </div>
                      <button 
                        pButton 
                        icon="pi pi-trash" 
                        [text]="true"
                        [rounded]="true"
                        size="small"
                        severity="danger"
                        (click)="removePermissionOverwrite(channel, overwrite.id)">
                      </button>
                    </div>
                    <div class="text-xs text-muted-color">
                      <div>Allow: <code>{{ overwrite.allow }}</code></div>
                      <div>Deny: <code>{{ overwrite.deny }}</code></div>
                    </div>
                  </div>
                } @empty {
                  <div class="text-center py-4">
                    <i class="pi pi-shield text-4xl text-muted-color mb-2"></i>
                    <p class="text-sm text-muted-color m-0">Aucune permission personnalisée</p>
                  </div>
                }
              </div>
            </p-scrollpanel>
          </p-tabpanel>

          <!-- TAB: PARAMÈTRES -->
          <p-tabpanel header="Paramètres" value="2">
            <p-scrollpanel [style]="{'height': 'calc(100vh - 200px)'}">
              <div class="text-center py-8">
                <i class="pi pi-wrench text-5xl text-muted-color mb-3"></i>
                <p class="text-muted-color mb-4">Paramètres avancés</p>
                <p class="text-xs text-muted-color">Cette fonctionnalité sera implémentée prochainement</p>
              </div>
            </p-scrollpanel>
          </p-tabpanel>
        </p-tabs>
      }
    </p-drawer>

    <!-- TOAST MESSAGES -->
    <p-toast />
  `,
  styles: [`
    :host ::ng-deep {
      .p-scrollpanel {
        .p-scrollpanel-content {
          padding-right: 1rem;
        }
      }

      .p-chip {
        font-weight: 500;
      }

      code {
        font-family: 'Courier New', monospace;
        font-size: 0.875rem;
      }
    }
  `]
})
export class ChannelsComponent {
  readonly channelFacade = inject(ChannelFacadeService);
  readonly guildFacade = inject(GuildFacadeService);
  private readonly messageService = inject(MessageService);

  // États locaux
  showChannelDetails = false;
  selectedTypeFilter: DiscordChannelType | 'all' = 'all';
  selectedCategoryFilter: string | 'all' | 'no-category' = 'all';

  // Options pour les filtres
  channelTypeOptions = [
    { label: 'Tous les types', value: 'all' },
    { label: 'Texte', value: DiscordChannelType.GUILD_TEXT },
    { label: 'Vocal', value: DiscordChannelType.GUILD_VOICE },
    { label: 'Catégorie', value: DiscordChannelType.GUILD_CATEGORY },
    { label: 'Annonces', value: DiscordChannelType.GUILD_ANNOUNCEMENT },
    { label: 'Forum', value: DiscordChannelType.GUILD_FORUM },
    { label: 'Stage', value: DiscordChannelType.GUILD_STAGE_VOICE },
  ];

  // Options de catégories (computed)
  categoryOptions = computed(() => {
    const categories = this.channelFacade.categories();
    return [
      { label: 'Toutes les catégories', value: 'all' },
      { label: 'Sans catégorie', value: 'no-category' },
      ...categories.map(c => ({ label: c.name, value: c.id }))
    ];
  });

  // ============================================
  // ACTIONS
  // ============================================

  refreshChannels(): void {
    void this.channelFacade.refreshChannels();
  }

  selectChannel(channel: GuildChannelDTO): void {
    this.channelFacade.selectChannel(channel);
    this.showChannelDetails = true;
  }

  clearFilters(): void {
    this.channelFacade.clearFilters();
    this.selectedTypeFilter = 'all';
    this.selectedCategoryFilter = 'all';
  }

  onTypeFilterChange(type: DiscordChannelType | 'all'): void {
    this.channelFacade.setSelectedType(type);
  }

  onCategoryFilterChange(categoryId: string | 'all' | 'no-category'): void {
    this.channelFacade.setSelectedCategory(categoryId);
  }

  // ============================================
  // MODALS & ACTIONS (À IMPLÉMENTER)
  // ============================================

  openCreateChannelModal(): void {
    // TODO: Ouvrir modal de création
    this.messageService.add({
      severity: 'info',
      summary: 'Fonctionnalité à venir',
      detail: 'La création de channel sera disponible prochainement'
    });
  }

  editChannel(channel: GuildChannelDTO): void {
    // TODO: Ouvrir modal d'édition
    this.messageService.add({
      severity: 'info',
      summary: 'Fonctionnalité à venir',
      detail: `Édition du channel "${channel.name}" sera disponible prochainement`
    });
  }

  async cloneChannel(channel: GuildChannelDTO): Promise<void> {
    const result = await this.channelFacade.cloneChannel(channel.id);
    if (result) {
      this.messageService.add({
        severity: 'success',
        summary: 'Channel cloné',
        detail: `Le channel "${result.name}" a été créé avec succès`
      });
    }
  }

  deleteChannel(channel: GuildChannelDTO): void {
    // TODO: Confirmation modal puis suppression
    this.messageService.add({
      severity: 'warn',
      summary: 'Fonctionnalité à venir',
      detail: 'La suppression de channel nécessite une confirmation'
    });
  }

  openChannelMenu(event: Event, channel: GuildChannelDTO): void {
    // TODO: Menu contextuel avec actions
    console.log('Channel menu:', channel);
  }

  openCategoryMenu(event: Event, category: GuildChannelDTO): void {
    // TODO: Menu contextuel pour catégorie
    console.log('Category menu:', category);
  }

  addPermissionOverwrite(channel: GuildChannelDTO): void {
    // TODO: Modal pour ajouter permission
    this.messageService.add({
      severity: 'info',
      summary: 'Fonctionnalité à venir',
      detail: 'L\'ajout de permissions sera disponible prochainement'
    });
  }

  removePermissionOverwrite(channel: GuildChannelDTO, overwriteId: string): void {
    // TODO: Confirmation puis suppression
    this.messageService.add({
      severity: 'info',
      summary: 'Fonctionnalité à venir',
      detail: 'La suppression de permissions sera disponible prochainement'
    });
  }

  // ============================================
  // HELPERS
  // ============================================

  getChannelIcon(channel: GuildChannelDTO): string {
    if (channel.isCategory) return 'pi pi-folder text-blue-500';
    if (channel.isText) return 'pi pi-hashtag text-green-500';
    if (channel.isVoice) return 'pi pi-volume-up text-orange-500';
    if (channel.isForum) return 'pi pi-comments text-purple-500';
    if (channel.isAnnouncement) return 'pi pi-megaphone text-red-500';
    if (channel.isStage) return 'pi pi-microphone text-pink-500';
    if (channel.isThread) return 'pi pi-list text-cyan-500';
    return 'pi pi-question-circle text-muted-color';
  }

  getChannelTypeLabel(channel: GuildChannelDTO): string {
    if (channel.isCategory) return 'Catégorie';
    if (channel.isText) return 'Texte';
    if (channel.isVoice) return 'Vocal';
    if (channel.isForum) return 'Forum';
    if (channel.isAnnouncement) return 'Annonces';
    if (channel.isStage) return 'Stage';
    if (channel.isThread) return 'Thread';
    return 'Inconnu';
  }

  getChannelTypeSeverity(channel: GuildChannelDTO): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    if (channel.isCategory) return 'info';
    if (channel.isText) return 'success';
    if (channel.isVoice) return 'warn';
    if (channel.isForum) return 'secondary';
    if (channel.isAnnouncement) return 'danger';
    if (channel.isStage) return 'contrast';
    return undefined;
  }
}