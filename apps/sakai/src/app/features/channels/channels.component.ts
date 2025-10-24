import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
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
 * 🎨 Composant de gestion des channels
 * Layout inspiré de members/roles avec cards stats + tableau
 * 
 * Features:
 * - Cards stats en haut (Total, Text, Voice, Categories)
 * - Tableau avec tous les channels
 * - Filtres avancés (recherche, type, catégorie)
 * - Sidebar détails avec tabs
 * - Actions CRUD
 * - Responsive mobile
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
    <p-toast />

    <div class="grid grid-cols-12 gap-4 md:gap-6">
      <!-- ============================================ -->
      <!-- HEADER -->
      <!-- ============================================ -->
      <div class="col-span-12">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 class="font-semibold text-3xl m-0">Channels & Catégories</h1>
            @if (guildFacade.selectedGuild(); as guild) {
              <p class="text-muted-color text-sm mt-1">
                {{ guild.name }}
                @if (!channelFacade.isLoading()) {
                  · {{ channelFacade.totalChannels() }} channel{{ channelFacade.totalChannels() > 1 ? 's' : '' }}
                }
              </p>
            }
          </div>

          <div class="flex gap-2">
            <p-button
              label="Créer un channel"
              icon="pi pi-plus"
              (onClick)="createChannel()"
              [disabled]="channelFacade.isLoading()"
            />
            <p-button
              icon="pi pi-refresh"
              [outlined]="true"
              [loading]="channelFacade.isLoading()"
              (onClick)="refreshChannels()"
              pTooltip="Rafraîchir"
              tooltipPosition="bottom"
            />
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- STATS CARDS -->
      <!-- ============================================ -->
      <div class="col-span-12 sm:col-span-6 lg:col-span-3">
        <div class="card mb-0">
          <div class="flex justify-between mb-3">
            <div>
              <span class="block text-muted-color font-medium mb-3">Total Channels</span>
              <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                {{ channelFacade.stats().total }}
              </div>
            </div>
            <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-lg" 
                 style="width:2.5rem;height:2.5rem">
              <i class="pi pi-hashtag text-blue-500 text-xl"></i>
            </div>
          </div>
          <span class="text-muted-color">Tous types confondus</span>
        </div>
      </div>

      <div class="col-span-12 sm:col-span-6 lg:col-span-3">
        <div class="card mb-0">
          <div class="flex justify-between mb-3">
            <div>
              <span class="block text-muted-color font-medium mb-3">Channels Texte</span>
              <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                {{ channelFacade.stats().text }}
              </div>
            </div>
            <div class="flex items-center justify-center bg-green-100 dark:bg-green-400/10 rounded-lg" 
                 style="width:2.5rem;height:2.5rem">
              <i class="pi pi-comment text-green-500 text-xl"></i>
            </div>
          </div>
          <span class="text-muted-color">
            @if (channelFacade.stats().announcements > 0) {
              dont {{ channelFacade.stats().announcements }} annonce{{ channelFacade.stats().announcements > 1 ? 's' : '' }}
            } @else {
              Messages et discussions
            }
          </span>
        </div>
      </div>

      <div class="col-span-12 sm:col-span-6 lg:col-span-3">
        <div class="card mb-0">
          <div class="flex justify-between mb-3">
            <div>
              <span class="block text-muted-color font-medium mb-3">Channels Vocaux</span>
              <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                {{ channelFacade.stats().voice }}
              </div>
            </div>
            <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-lg" 
                 style="width:2.5rem;height:2.5rem">
              <i class="pi pi-volume-up text-purple-500 text-xl"></i>
            </div>
          </div>
          <span class="text-muted-color">
            @if (channelFacade.stats().stages > 0) {
              dont {{ channelFacade.stats().stages }} stage{{ channelFacade.stats().stages > 1 ? 's' : '' }}
            } @else {
              Vocal et stages
            }
          </span>
        </div>
      </div>

      <div class="col-span-12 sm:col-span-6 lg:col-span-3">
        <div class="card mb-0">
          <div class="flex justify-between mb-3">
            <div>
              <span class="block text-muted-color font-medium mb-3">Catégories</span>
              <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                {{ channelFacade.stats().categories }}
              </div>
            </div>
            <div class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-lg" 
                 style="width:2.5rem;height:2.5rem">
              <i class="pi pi-folder text-orange-500 text-xl"></i>
            </div>
          </div>
          <span class="text-muted-color">Organisation serveur</span>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- MAIN CONTENT CARD WITH TABLE -->
      <!-- ============================================ -->
      <div class="col-span-12">
        <div class="card">
          <!-- Filtres et recherche -->
          <div class="flex flex-col md:flex-row gap-4 mb-4">
            <!-- Recherche -->
            <p-iconfield iconPosition="left" class="flex-1">
              <p-inputicon styleClass="pi pi-search" />
              <input 
                pInputText 
                type="text" 
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange($event)"
                placeholder="Rechercher un channel..." 
                class="w-full"
              />
            </p-iconfield>

            <!-- Filtre Type -->
            <p-select
              [(ngModel)]="selectedTypeFilter"
              [options]="channelTypeOptions"
              (onChange)="onTypeFilterChange($event.value)"
              placeholder="Type de channel"
              [style]="{'min-width': '200px'}"
            />

            <!-- Filtre Catégorie -->
            <p-select
              [(ngModel)]="selectedCategoryFilter"
              [options]="categoryOptions()"
              (onChange)="onCategoryFilterChange($event.value)"
              placeholder="Catégorie"
              [style]="{'min-width': '200px'}"
            />

            @if (hasActiveFilters()) {
              <p-button
                label="Réinitialiser"
                icon="pi pi-filter-slash"
                [outlined]="true"
                (onClick)="clearFilters()"
              />
            }
          </div>

          <!-- Message si filtres actifs -->
          @if (hasActiveFilters()) {
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <div class="flex items-center gap-2">
                <i class="pi pi-info-circle text-blue-500"></i>
                <span class="text-sm">
                  {{ channelFacade.filteredCount() }} channel{{ channelFacade.filteredCount() > 1 ? 's' : '' }} 
                  sur {{ channelFacade.totalChannels() }}
                </span>
              </div>
            </div>
          }

          <!-- Tableau -->
          @if (channelFacade.isLoading()) {
            <!-- Skeleton Loading -->
            <div class="space-y-3">
              @for (i of [1,2,3,4,5]; track i) {
                <div class="flex items-center gap-3 p-3 border border-surface rounded">
                  <p-skeleton shape="circle" size="3rem" />
                  <div class="flex-1">
                    <p-skeleton width="60%" height="1.5rem" class="mb-2" />
                    <p-skeleton width="40%" height="1rem" />
                  </div>
                  <p-skeleton width="8rem" height="2rem" />
                </div>
              }
            </div>
          } @else if (channelFacade.filteredChannels().length === 0) {
            <!-- Empty State -->
            <div class="text-center py-12">
              <i class="pi pi-inbox text-6xl text-muted-color mb-4"></i>
              <p class="text-xl font-medium mb-2">Aucun channel trouvé</p>
              <p class="text-muted-color">
                @if (hasActiveFilters()) {
                  Essayez de modifier vos filtres
                } @else {
                  Ce serveur n'a pas encore de channels
                }
              </p>
              @if (hasActiveFilters()) {
                <p-button
                  label="Réinitialiser les filtres"
                  icon="pi pi-filter-slash"
                  [outlined]="true"
                  (onClick)="clearFilters()"
                  class="mt-4"
                />
              }
            </div>
          } @else {
            <!-- Tableau avec données -->
            <p-table 
              [value]="channelFacade.filteredChannels()" 
              [tableStyle]="{'min-width': '60rem'}"
              styleClass="p-datatable-sm"
              [paginator]="channelFacade.filteredChannels().length > 10"
              [rows]="10"
              [rowsPerPageOptions]="[10, 25, 50]"
              [globalFilterFields]="['name', 'topic', 'categoryPath']"
              responsiveLayout="scroll">
              
              <ng-template pTemplate="header">
                <tr>
                  <th style="width: 50%">Channel</th>
                  <th style="width: 15%">Type</th>
                  <th style="width: 20%">Catégorie</th>
                  <th style="width: 15%">Actions</th>
                </tr>
              </ng-template>

              <ng-template pTemplate="body" let-channel>
                <tr class="hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                  <!-- Channel Info -->
                  <td>
                    <div class="flex items-center gap-3">
                      <div class="flex items-center justify-center w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-700">
                        <i [class]="getChannelIcon(channel)" class="text-lg"></i>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="font-medium truncate">{{ channel.name }}</span>
                          @if (channel.nsfw) {
                            <p-chip label="NSFW" styleClass="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" />
                          }
                          @if (channel.isLocked) {
                            <i class="pi pi-lock text-orange-500" pTooltip="Channel verrouillé"></i>
                          }
                          @if (channel.isPrivate) {
                            <i class="pi pi-eye-slash text-blue-500" pTooltip="Channel privé"></i>
                          }
                        </div>
                        @if (channel.topic) {
                          <p class="text-sm text-muted-color truncate m-0">{{ channel.topic }}</p>
                        }
                        @if (channel.hasSlowmode) {
                          <p class="text-xs text-blue-500 mt-1">
                            <i class="pi pi-clock"></i> Slowmode: {{ channel.rateLimitPerUser }}s
                          </p>
                        }
                      </div>
                    </div>
                  </td>

                  <!-- Type -->
                  <td>
                    <p-tag 
                      [value]="getChannelTypeLabel(channel)" 
                      [severity]="getChannelTypeSeverity(channel)"
                    />
                  </td>

                  <!-- Catégorie -->
                  <td>
                    @if (channel.isCategory) {
                      <span class="text-muted-color italic">-</span>
                    } @else if (channel.categoryPath) {
                      <span class="text-sm">{{ channel.categoryPath }}</span>
                    } @else {
                      <span class="text-muted-color">Sans catégorie</span>
                    }
                  </td>

                  <!-- Actions -->
                  <td>
                    <div class="flex gap-2">
                      <p-button
                        icon="pi pi-eye"
                        [outlined]="true"
                        [rounded]="true"
                        size="small"
                        (onClick)="viewChannel(channel)"
                        pTooltip="Voir détails"
                        tooltipPosition="top"
                      />
                      <p-button
                        icon="pi pi-pencil"
                        [outlined]="true"
                        [rounded]="true"
                        size="small"
                        severity="secondary"
                        (onClick)="editChannel(channel)"
                        pTooltip="Modifier"
                        tooltipPosition="top"
                      />
                      <p-button
                        icon="pi pi-trash"
                        [outlined]="true"
                        [rounded]="true"
                        size="small"
                        severity="danger"
                        (onClick)="deleteChannel(channel)"
                        pTooltip="Supprimer"
                        tooltipPosition="top"
                      />
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          }
        </div>
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
      (onHide)="onCloseDetails()">
      
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

        <!-- Tabs Content -->
        <p-tabs value="overview">
          <p-tablist>
            <p-tab value="overview">
              <div class="flex items-center gap-2">
                <i class="pi pi-info-circle"></i>
                <span>Aperçu</span>
              </div>
            </p-tab>
            <p-tab value="permissions">
              <div class="flex items-center gap-2">
                <i class="pi pi-lock"></i>
                <span>Permissions</span>
              </div>
            </p-tab>
            <p-tab value="settings">
              <div class="flex items-center gap-2">
                <i class="pi pi-cog"></i>
                <span>Paramètres</span>
              </div>
            </p-tab>
          </p-tablist>

          <p-tabpanels>
            <!-- TAB: OVERVIEW -->
            <p-tabpanel value="overview">
              <p-scrollpanel [style]="{'height': 'calc(100vh - 220px)'}">
                <div class="space-y-4">
                  <!-- Informations générales -->
                  <div class="surface-card p-4 rounded-lg border border-surface">
                    <h4 class="font-semibold text-sm mb-3 flex items-center gap-2">
                      <i class="pi pi-info-circle text-primary-500"></i>
                      Informations générales
                    </h4>
                    
                    <div class="space-y-3">
                      <div class="flex justify-between items-start text-sm">
                        <span class="text-muted-color">ID:</span>
                        <code class="text-xs bg-surface-100 dark:bg-surface-700 px-2 py-1 rounded">{{ channel.id }}</code>
                      </div>
                      
                      <div class="flex justify-between items-start text-sm">
                        <span class="text-muted-color">Type:</span>
                        <p-tag 
                          [value]="getChannelTypeLabel(channel)" 
                          [severity]="getChannelTypeSeverity(channel)"
                        />
                      </div>

                      @if (channel.categoryPath) {
                        <div class="flex justify-between items-start text-sm">
                          <span class="text-muted-color">Catégorie:</span>
                          <span class="font-medium">{{ channel.categoryPath }}</span>
                        </div>
                      }

                      <div class="flex justify-between items-start text-sm">
                        <span class="text-muted-color">Position:</span>
                        <span class="font-medium">{{ channel.position }}</span>
                      </div>

                      @if (channel.topic) {
                        <p-divider />
                        <div class="text-sm">
                          <span class="text-muted-color block mb-2">Description:</span>
                          <p class="m-0 text-surface-700 dark:text-surface-300">{{ channel.topic }}</p>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Flags et états -->
                  <div class="surface-card p-4 rounded-lg border border-surface">
                    <h4 class="font-semibold text-sm mb-3 flex items-center gap-2">
                      <i class="pi pi-flag text-orange-500"></i>
                      États et restrictions
                    </h4>
                    
                    <div class="flex flex-wrap gap-2">
                      @if (channel.nsfw) {
                        <p-chip label="NSFW" icon="pi pi-exclamation-triangle" styleClass="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" />
                      }
                      @if (channel.isLocked) {
                        <p-chip label="Verrouillé" icon="pi pi-lock" styleClass="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" />
                      }
                      @if (channel.isPrivate) {
                        <p-chip label="Privé" icon="pi pi-eye-slash" styleClass="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" />
                      }
                      @if (channel.hasSlowmode) {
                        <p-chip 
                          [label]="'Slowmode ' + channel.rateLimitPerUser + 's'" 
                          icon="pi pi-clock"
                          styleClass="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" 
                        />
                      }
                      @if (!channel.nsfw && !channel.isLocked && !channel.isPrivate && !channel.hasSlowmode) {
                        <span class="text-muted-color text-sm">Aucune restriction active</span>
                      }
                    </div>
                  </div>

                  <!-- Stats spécifiques selon type -->
                  @if (channel.isText || channel.isForum) {
                    <div class="surface-card p-4 rounded-lg border border-surface">
                      <h4 class="font-semibold text-sm mb-3 flex items-center gap-2">
                        <i class="pi pi-chart-bar text-green-500"></i>
                        Statistiques
                      </h4>
                      
                      <div class="space-y-2 text-sm">
                        @if (channel.defaultAutoArchiveDuration) {
                          <div class="flex justify-between">
                            <span class="text-muted-color">Auto-archivage:</span>
                            <span class="font-medium">{{ channel.defaultAutoArchiveDuration }} min</span>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  @if (channel.isVoice || channel.isStage) {
                    <div class="surface-card p-4 rounded-lg border border-surface">
                      <h4 class="font-semibold text-sm mb-3 flex items-center gap-2">
                        <i class="pi pi-volume-up text-purple-500"></i>
                        Configuration vocale
                      </h4>
                      
                      <div class="space-y-2 text-sm">
                        @if (channel.bitrate) {
                          <div class="flex justify-between">
                            <span class="text-muted-color">Bitrate:</span>
                            <span class="font-medium">{{ (channel.bitrate / 1000).toFixed(0) }} kbps</span>
                          </div>
                        }
                        @if (channel.userLimit) {
                          <div class="flex justify-between">
                            <span class="text-muted-color">Limite utilisateurs:</span>
                            <span class="font-medium">{{ channel.userLimit }}</span>
                          </div>
                        } @else {
                          <div class="flex justify-between">
                            <span class="text-muted-color">Limite utilisateurs:</span>
                            <span class="font-medium">Illimité</span>
                          </div>
                        }
                        @if (channel.rtcRegion) {
                          <div class="flex justify-between">
                            <span class="text-muted-color">Région:</span>
                            <span class="font-medium">{{ channel.rtcRegion }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Actions -->
                  <div class="flex gap-2">
                    <p-button
                      label="Modifier"
                      icon="pi pi-pencil"
                      [outlined]="true"
                      class="flex-1"
                      (onClick)="editChannel(channel)"
                    />
                    <p-button
                      label="Supprimer"
                      icon="pi pi-trash"
                      [outlined]="true"
                      severity="danger"
                      class="flex-1"
                      (onClick)="deleteChannel(channel)"
                    />
                  </div>
                </div>
              </p-scrollpanel>
            </p-tabpanel>

            <!-- TAB: PERMISSIONS -->
            <p-tabpanel value="permissions">
              <p-scrollpanel [style]="{'height': 'calc(100vh - 220px)'}">
                <div class="space-y-4">
                  <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div class="flex gap-2">
                      <i class="pi pi-info-circle text-blue-500 mt-0.5"></i>
                      <div class="text-sm text-blue-700 dark:text-blue-300">
                        <p class="m-0 font-medium mb-1">Permissions du channel</p>
                        <p class="m-0">Gérez les autorisations spécifiques pour ce channel.</p>
                      </div>
                    </div>
                  </div>

                  @if (channel.permissionOverwrites && channel.permissionOverwrites.length > 0) {
                    <div class="space-y-2">
                      @for (overwrite of channel.permissionOverwrites; track overwrite.id) {
                        <div class="surface-card p-3 rounded border border-surface">
                          <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                              <i [class]="overwrite.type === 0 ? 'pi pi-users' : 'pi pi-user'" class="text-muted-color"></i>
                              <span class="font-medium text-sm">{{ overwrite.type === 0 ? 'Rôle' : 'Membre' }}</span>
                            </div>
                            <p-button
                              icon="pi pi-pencil"
                              [text]="true"
                              [rounded]="true"
                              size="small"
                              (onClick)="editPermissions(channel, overwrite)"
                            />
                          </div>
                          <div class="text-xs text-muted-color">
                            <span class="block">Allow: {{ overwrite.allow }}</span>
                            <span class="block">Deny: {{ overwrite.deny }}</span>
                          </div>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="text-center py-8 text-muted-color">
                      <i class="pi pi-lock text-4xl mb-3"></i>
                      <p class="text-sm">Aucune permission personnalisée</p>
                    </div>
                  }

                  <p-button
                    label="Ajouter une permission"
                    icon="pi pi-plus"
                    [outlined]="true"
                    class="w-full"
                    (onClick)="addPermission(channel)"
                  />
                </div>
              </p-scrollpanel>
            </p-tabpanel>

            <!-- TAB: SETTINGS -->
            <p-tabpanel value="settings">
              <p-scrollpanel [style]="{'height': 'calc(100vh - 220px)'}">
                <div class="space-y-4">
                  <div class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                    <div class="flex gap-2">
                      <i class="pi pi-exclamation-triangle text-orange-500 mt-0.5"></i>
                      <div class="text-sm text-orange-700 dark:text-orange-300">
                        <p class="m-0 font-medium mb-1">Zone dangereuse</p>
                        <p class="m-0">Les actions ci-dessous sont irréversibles.</p>
                      </div>
                    </div>
                  </div>

                  <div class="space-y-3">
                    <div class="surface-card p-4 rounded border border-surface">
                      <div class="flex justify-between items-start mb-3">
                        <div class="flex-1">
                          <h4 class="font-medium text-sm m-0 mb-1">Dupliquer le channel</h4>
                          <p class="text-xs text-muted-color m-0">Créer une copie avec les mêmes paramètres</p>
                        </div>
                      </div>
                      <p-button
                        label="Dupliquer"
                        icon="pi pi-copy"
                        [outlined]="true"
                        size="small"
                        class="w-full"
                        (onClick)="cloneChannel(channel)"
                      />
                    </div>

                    <div class="surface-card p-4 rounded border border-red-200 dark:border-red-800">
                      <div class="flex justify-between items-start mb-3">
                        <div class="flex-1">
                          <h4 class="font-medium text-sm m-0 mb-1 text-red-600 dark:text-red-400">Supprimer le channel</h4>
                          <p class="text-xs text-muted-color m-0">Cette action est définitive et irréversible</p>
                        </div>
                      </div>
                      <p-button
                        label="Supprimer définitivement"
                        icon="pi pi-trash"
                        severity="danger"
                        size="small"
                        class="w-full"
                        (onClick)="deleteChannel(channel)"
                      />
                    </div>
                  </div>
                </div>
              </p-scrollpanel>
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      }
    </p-drawer>
  `
})
export class ChannelsComponent {
  readonly channelFacade = inject(ChannelFacadeService);
  readonly guildFacade = inject(GuildFacadeService);
  private readonly messageService = inject(MessageService);

  // États locaux
  showChannelDetails = false;
  searchQuery = '';
  selectedTypeFilter: DiscordChannelType | 'all' = 'all';
  selectedCategoryFilter: string | 'all' | 'no-category' = 'all';

  // Options pour les filtres
  channelTypeOptions = [
    { label: 'Tous les types', value: 'all' },
    { label: '💬 Texte', value: DiscordChannelType.GUILD_TEXT },
    { label: '🔊 Vocal', value: DiscordChannelType.GUILD_VOICE },
    { label: '📁 Catégorie', value: DiscordChannelType.GUILD_CATEGORY },
    { label: '📢 Annonces', value: DiscordChannelType.GUILD_ANNOUNCEMENT },
    { label: '💭 Forum', value: DiscordChannelType.GUILD_FORUM },
    { label: '🎤 Stage', value: DiscordChannelType.GUILD_STAGE_VOICE },
  ];

  // Options de catégories (computed depuis le facade)
  categoryOptions = computed(() => {
    const categories = this.channelFacade.categories();
    return [
      { label: 'Toutes les catégories', value: 'all' },
      { label: 'Sans catégorie', value: 'no-category' },
      ...categories.map(c => ({ label: c.name, value: c.id }))
    ];
  });

  // Helper pour savoir si des filtres sont actifs
  hasActiveFilters = computed(() => {
    return this.searchQuery !== '' || 
           this.selectedTypeFilter !== 'all' || 
           this.selectedCategoryFilter !== 'all';
  });

  // ============================================
  // ACTIONS PRINCIPALES
  // ============================================

  refreshChannels(): void {
    void this.channelFacade.refreshChannels();
  }

  createChannel(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Fonctionnalité à venir',
      detail: 'La création de channels sera bientôt disponible'
    });
  }

  viewChannel(channel: GuildChannelDTO): void {
    this.channelFacade.selectChannel(channel);
    this.showChannelDetails = true;
  }

  editChannel(channel: GuildChannelDTO): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Fonctionnalité à venir',
      detail: `Édition de ${channel.name} bientôt disponible`
    });
  }

  deleteChannel(channel: GuildChannelDTO): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Confirmation requise',
      detail: `Suppression de ${channel.name} (à implémenter)`
    });
  }

  cloneChannel(channel: GuildChannelDTO): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Fonctionnalité à venir',
      detail: `Duplication de ${channel.name} bientôt disponible`
    });
  }

  // ============================================
  // FILTRES
  // ============================================

  onSearchChange(query: string): void {
    this.channelFacade.setSearchQuery(query);
  }

  onTypeFilterChange(type: DiscordChannelType | 'all'): void {
    this.channelFacade.setSelectedType(type);
  }

  onCategoryFilterChange(categoryId: string | 'all' | 'no-category'): void {
    this.channelFacade.setSelectedCategory(categoryId);
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedTypeFilter = 'all';
    this.selectedCategoryFilter = 'all';
    this.channelFacade.clearFilters();
  }

  // ============================================
  // PERMISSIONS
  // ============================================

  editPermissions(channel: GuildChannelDTO, overwrite: any): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Fonctionnalité à venir',
      detail: 'Édition des permissions bientôt disponible'
    });
  }

  addPermission(channel: GuildChannelDTO): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Fonctionnalité à venir',
      detail: 'Ajout de permissions bientôt disponible'
    });
  }

  // ============================================
  // SIDEBAR
  // ============================================

  onCloseDetails(): void {
    this.channelFacade.clearSelection();
    this.showChannelDetails = false;
  }

  // ============================================
  // HELPERS UI
  // ============================================

  getChannelIcon(channel: GuildChannelDTO): string {
    if (channel.isCategory) return 'pi pi-folder text-blue-500';
    if (channel.isText) return 'pi pi-comment text-green-500';
    if (channel.isVoice) return 'pi pi-volume-up text-purple-500';
    if (channel.isAnnouncement) return 'pi pi-megaphone text-orange-500';
    if (channel.isForum) return 'pi pi-comments text-indigo-500';
    if (channel.isStage) return 'pi pi-microphone text-pink-500';
    return 'pi pi-hashtag text-gray-500';
  }

  getChannelTypeLabel(channel: GuildChannelDTO): string {
    if (channel.isCategory) return 'Catégorie';
    if (channel.isAnnouncement) return 'Annonce';
    if (channel.isForum) return 'Forum';
    if (channel.isStage) return 'Stage';
    if (channel.isVoice) return 'Vocal';
    if (channel.isText) return 'Texte';
    return 'Autre';
  }

  getChannelTypeSeverity(channel: GuildChannelDTO): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    if (channel.isCategory) return 'info';
    if (channel.isAnnouncement) return 'warn';
    if (channel.isForum) return 'secondary';
    if (channel.isStage) return 'danger';
    if (channel.isVoice) return 'contrast';
    if (channel.isText) return 'success';
    return undefined;
  }
}