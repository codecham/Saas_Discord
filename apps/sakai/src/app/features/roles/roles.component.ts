import { Component, ViewChild, computed, inject, signal, model } from '@angular/core';
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
import { MessageService } from 'primeng/api';
import { RoleFacadeService } from '@app/services/role/role-facade.service';
import { GuildFacadeService } from '@app/services/guild/guild-facade.service';
import { GuildRoleDTO } from '@my-project/shared-types';

/**
 * Composant de gestion des rôles - Version moderne et professionnelle
 * Affiche la liste des rôles avec leurs informations et actions
 */
@Component({
  selector: 'app-roles',
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
    TabsModule
  ],
  providers: [MessageService],
  template: `
    <div class="grid">
      <!-- Header -->
      <div class="col-span-12">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h1 class="font-semibold text-3xl m-0">Rôles & Permissions</h1>
            @if (guildFacade.selectedGuild(); as guild) {
              <p class="text-muted-color text-sm mt-1">
                {{ guild.name }}
                @if (!roleFacade.isLoading()) {
                  <span> · Hiérarchie de {{ roleFacade.totalRoles() }} rôle{{ roleFacade.totalRoles() > 1 ? 's' : '' }}</span>
                }
              </p>
            }
          </div>

          <div class="flex gap-2">
            <p-button
              label="Créer un rôle"
              icon="pi pi-plus"
              (onClick)="createRole()"
              [disabled]="roleFacade.isLoading()"
            />
            <p-button
              icon="pi pi-refresh"
              [outlined]="true"
              [loading]="roleFacade.isLoading()"
              (onClick)="refreshRoles()"
              pTooltip="Rafraîchir"
              tooltipPosition="bottom"
            />
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <!-- Total Roles -->
          <div class="col-span-1">
            <div class="card mb-0 h-full">
              <div class="flex justify-between mb-3">
                <div>
                  <span class="block text-muted-color font-medium mb-3">Total Rôles</span>
                  <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                    {{ roleFacade.totalRoles() }}
                  </div>
                </div>
                <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-lg" 
                     style="width:2.5rem;height:2.5rem">
                  <i class="pi pi-tags text-blue-500 text-xl"></i>
                </div>
              </div>
              <span class="text-muted-color text-sm">Hiérarchie complète</span>
            </div>
          </div>

          <!-- Admin Roles -->
          <div class="col-span-1">
            <div class="card mb-0 h-full">
              <div class="flex justify-between mb-3">
                <div>
                  <span class="block text-muted-color font-medium mb-3">Rôles Admin</span>
                  <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                    {{ roleFacade.adminRoles().length }}
                  </div>
                </div>
                <div class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-lg" 
                     style="width:2.5rem;height:2.5rem">
                  <i class="pi pi-shield text-orange-500 text-xl"></i>
                </div>
              </div>
              <span class="text-muted-color text-sm">Permissions élevées</span>
            </div>
          </div>

          <!-- Managed Roles -->
          <div class="col-span-1">
            <div class="card mb-0 h-full">
              <div class="flex justify-between mb-3">
                <div>
                  <span class="block text-muted-color font-medium mb-3">Rôles Managés</span>
                  <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                    {{ roleFacade.managedRoles().length }}
                  </div>
                </div>
                <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-lg" 
                     style="width:2.5rem;height:2.5rem">
                  <i class="pi pi-lock text-purple-500 text-xl"></i>
                </div>
              </div>
              <span class="text-muted-color text-sm">Bots & intégrations</span>
            </div>
          </div>

          <!-- Assignable Roles -->
          <div class="col-span-1">
            <div class="card mb-0 h-full">
              <div class="flex justify-between mb-3">
                <div>
                  <span class="block text-muted-color font-medium mb-3">Assignables</span>
                  <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                    {{ roleFacade.assignableRoles().length }}
                  </div>
                </div>
                <div class="flex items-center justify-center bg-green-100 dark:bg-green-400/10 rounded-lg" 
                     style="width:2.5rem;height:2.5rem">
                  <i class="pi pi-check-circle text-green-500 text-xl"></i>
                </div>
              </div>
              <span class="text-muted-color text-sm">Modifiables manuellement</span>
            </div>
          </div>
        </div>

        <!-- Main Content Card -->
        <div class="card">
          <!-- Tabs for different views -->
          <p-tabs [(value)]="activeTab">
            <p-tablist>
              <p-tab 
                value="0"
                class="flex items-center gap-2">
                <i class="pi pi-list"></i>
                <span>Tous les rôles</span>
              </p-tab>
              <p-tab 
                value="1"
                class="flex items-center gap-2">
                <i class="pi pi-sitemap"></i>
                <span>Hiérarchie</span>
              </p-tab>
              <p-tab 
                value="2"
                class="flex items-center gap-2">
                <i class="pi pi-key"></i>
                <span>Permissions</span>
              </p-tab>
            </p-tablist>

            <p-tabpanels>
              <!-- Tab: Tous les rôles -->
              <p-tabpanel value="0">
                <!-- Toolbar avec recherche -->
                <div class="flex flex-col sm:flex-row gap-4 mb-4 pt-4">
                  <!-- Barre de recherche -->
                  <p-iconfield iconPosition="left" class="flex-1">
                    <p-inputicon styleClass="pi pi-search" />
                    <input
                      pInputText
                      type="text"
                      [(ngModel)]="searchValue"
                      (input)="onSearch($event)"
                      placeholder="Rechercher un rôle par nom..."
                      class="w-full"
                      [disabled]="roleFacade.isLoading()"
                    />
                  </p-iconfield>

                  <!-- Quick filters -->
                  <div class="flex gap-2 items-center flex-wrap">
                    <p-button
                      label="Admin"
                      icon="pi pi-shield"
                      [outlined]="activeFilter() !== 'admin'"
                      [severity]="activeFilter() === 'admin' ? 'danger' : 'secondary'"
                      size="small"
                      (onClick)="setFilter('admin')"
                    />
                    <p-button
                      label="Managés"
                      icon="pi pi-lock"
                      [outlined]="activeFilter() !== 'managed'"
                      [severity]="activeFilter() === 'managed' ? 'info' : 'secondary'"
                      size="small"
                      (onClick)="setFilter('managed')"
                    />
                    <p-button
                      label="Hoisted"
                      icon="pi pi-eye"
                      [outlined]="activeFilter() !== 'hoisted'"
                      [severity]="activeFilter() === 'hoisted' ? 'success' : 'secondary'"
                      size="small"
                      (onClick)="setFilter('hoisted')"
                    />
                    @if (activeFilter()) {
                      <p-button
                        icon="pi pi-times"
                        [text]="true"
                        [rounded]="true"
                        size="small"
                        (onClick)="clearFilter()"
                        pTooltip="Réinitialiser les filtres"
                      />
                    }
                  </div>
                </div>

                <!-- Skeleton Loading -->
                @if (roleFacade.isLoading()) {
                  @for (i of [1,2,3,4,5]; track i) {
                    <div class="flex items-center gap-4 p-4 border-b border-surface">
                      <p-skeleton shape="circle" size="2.5rem" />
                      <div class="flex-1">
                        <p-skeleton width="60%" height="1.5rem" styleClass="mb-2" />
                        <p-skeleton width="40%" height="1rem" />
                      </div>
                      <p-skeleton width="6rem" height="2rem" />
                    </div>
                  }
                }

                <!-- Table -->
                @if (!roleFacade.isLoading()) {
                  <p-table
                    #dt
                    [value]="displayedRoles()"
                    [rows]="25"
                    [paginator]="true"
                    [rowsPerPageOptions]="[25, 50, 100]"
                    [globalFilterFields]="['name']"
                    [tableStyle]="{ 'min-width': '50rem' }"
                    styleClass="p-datatable-sm"
                    currentPageReportTemplate="{first} à {last} sur {totalRecords} rôles"
                    [showCurrentPageReport]="true"
                  >
                    <!-- Column: Couleur & Nom -->
                    <ng-template pTemplate="header">
                      <tr>
                        <th pSortableColumn="name" style="width: 40%">
                          <div class="flex items-center gap-2">
                            Rôle
                            <p-sortIcon field="name" />
                          </div>
                        </th>
                        <th pSortableColumn="position" style="width: 20%">
                          <div class="flex items-center gap-2">
                            Position
                            <p-sortIcon field="position" />
                          </div>
                        </th>
                        <th style="width: 15%">Type</th>
                        <th style="width: 15%">Membres</th>
                        <th style="width: 10%">Actions</th>
                      </tr>
                    </ng-template>

                    <ng-template pTemplate="body" let-role>
                      <tr>
                        <!-- Nom + Couleur -->
                        <td>
                          <div class="flex items-center gap-3">
                            <div
                              class="role-color-badge"
                              [style.background]="getRoleGradient(role.colorHex)"
                              [style.border-color]="role.colorHex || '#6b7280'"
                              [pTooltip]="role.colorHex || 'Aucune couleur'"
                              tooltipPosition="top"
                            ></div>
                            <div class="flex flex-col">
                              <span class="font-semibold text-surface-900 dark:text-surface-0">
                                {{ role.name }}
                              </span>
                              @if (role.isManaged) {
                                <span class="text-xs text-muted-color flex items-center gap-1 mt-1">
                                  <i class="pi pi-lock" style="font-size: 0.625rem"></i>
                                  Géré par une intégration
                                </span>
                              }
                            </div>
                          </div>
                        </td>

                        <!-- Position -->
                        <td>
                          <div class="flex items-center gap-2">
                            <p-chip 
                              [label]="'#' + role.position" 
                              styleClass="text-xs"
                            />
                            @if (role.isHoisted) {
                              <i 
                                class="pi pi-eye text-green-500" 
                                pTooltip="Affiché séparément"
                                tooltipPosition="top"
                              ></i>
                            }
                          </div>
                        </td>

                        <!-- Type -->
                        <td>
                          @if (isAdminRole(role)) {
                            <p-tag severity="danger" value="Administrateur" icon="pi pi-shield" />
                          } @else if (role.isManaged) {
                            <p-tag severity="info" value="Managé" icon="pi pi-lock" />
                          } @else {
                            <p-tag severity="secondary" value="Standard" />
                          }
                        </td>

                        <!-- Membres (placeholder) -->
                        <td>
                          <span class="text-muted-color">-</span>
                        </td>

                        <!-- Actions -->
                        <td>
                          <div class="flex gap-2">
                            <p-button
                              icon="pi pi-pencil"
                              [text]="true"
                              [rounded]="true"
                              severity="secondary"
                              size="small"
                              (onClick)="editRole(role)"
                              pTooltip="Éditer"
                              tooltipPosition="top"
                            />
                            @if (!role.isManaged && !role.isEveryone) {
                              <p-button
                                icon="pi pi-trash"
                                [text]="true"
                                [rounded]="true"
                                severity="danger"
                                size="small"
                                (onClick)="deleteRole(role)"
                                pTooltip="Supprimer"
                                tooltipPosition="top"
                              />
                            }
                          </div>
                        </td>
                      </tr>
                    </ng-template>

                    <!-- Empty state -->
                    <ng-template pTemplate="emptymessage">
                      <tr>
                        <td colspan="5" class="text-center py-8">
                          <div class="flex flex-col items-center gap-3">
                            <i class="pi pi-inbox text-4xl text-muted-color"></i>
                            <div>
                              <h3 class="text-lg font-semibold mb-1">Aucun rôle trouvé</h3>
                              <p class="text-muted-color text-sm">
                                @if (searchValue) {
                                  Aucun rôle ne correspond à votre recherche
                                } @else {
                                  Ce serveur n'a pas encore de rôles
                                }
                              </p>
                            </div>
                            @if (!searchValue) {
                              <p-button
                                label="Créer un rôle"
                                icon="pi pi-plus"
                                [outlined]="true"
                                (onClick)="createRole()"
                              />
                            }
                          </div>
                        </td>
                      </tr>
                    </ng-template>
                  </p-table>
                }
              </p-tabpanel>

              <!-- Tab: Hiérarchie -->
              <p-tabpanel value="1">
                <div class="text-center py-12">
                  <i class="pi pi-sitemap text-6xl text-muted-color mb-4"></i>
                  <h3 class="text-xl font-semibold mb-2">Vue Hiérarchique</h3>
                  <p class="text-muted-color mb-6">
                    Visualisez et organisez vos rôles par drag & drop
                  </p>
                  <p-button label="Bientôt disponible" icon="pi pi-clock" [disabled]="true" />
                </div>
              </p-tabpanel>

              <!-- Tab: Permissions -->
              <p-tabpanel value="2">
                <div class="text-center py-12">
                  <i class="pi pi-key text-6xl text-muted-color mb-4"></i>
                  <h3 class="text-xl font-semibold mb-2">Matrice de Permissions</h3>
                  <p class="text-muted-color mb-6">Vue d'ensemble des permissions par rôle</p>
                  <p-button label="Bientôt disponible" icon="pi pi-clock" [disabled]="true" />
                </div>
              </p-tabpanel>
            </p-tabpanels>
          </p-tabs>

          <!-- Error -->
          @if (roleFacade.error()) {
            <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mt-4">
              <div class="flex items-center gap-3">
                <i class="pi pi-exclamation-triangle text-red-500 text-xl"></i>
                <div class="flex-1">
                  <h3 class="font-semibold text-red-700 dark:text-red-400 mb-1">Erreur</h3>
                  <p class="text-red-600 dark:text-red-300 text-sm">{{ roleFacade.error() }}</p>
                </div>
                <p-button
                  label="Réessayer"
                  icon="pi pi-refresh"
                  [outlined]="true"
                  severity="danger"
                  size="small"
                  (onClick)="refreshRoles()"
                />
              </div>
            </div>
          }
        </div>
      </div>
    </div>

    <p-toast />
  `,
  styles: [`
    :host {
      display: block;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      padding: 1rem 1rem !important;
    }

    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      padding: 1rem 1rem !important;
    }

    .role-color-badge {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.75rem;
      border: 2px solid;
      box-shadow: 
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06),
        inset 0 2px 4px 0 rgba(255, 255, 255, 0.1);
      transition: transform 0.2s ease;
    }

    .role-color-badge:hover {
      transform: scale(1.1) rotate(5deg);
    }

    /* Style des tabs - Version moderne */
    ::ng-deep .p-tabs .p-tablist {
      background: transparent;
      border-bottom: 1px solid var(--surface-border);
      padding: 0;
    }

    ::ng-deep .p-tabs .p-tab {
      padding: 1rem 1.5rem;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      color: var(--text-color-secondary);
    }

    ::ng-deep .p-tabs .p-tab:hover {
      color: var(--primary-color);
      background: var(--surface-hover);
    }

    ::ng-deep .p-tabs .p-tab[aria-selected="true"] {
      color: var(--primary-color);
      border-bottom-color: var(--primary-color);
    }

    ::ng-deep .p-tabs .p-tabpanels {
      padding: 0;
      background: transparent;
    }
  `]
})
export class RolesComponent {
  @ViewChild('dt') table!: Table;

  roleFacade = inject(RoleFacadeService);
  guildFacade = inject(GuildFacadeService);
  private messageService = inject(MessageService);

  searchValue = '';
  activeTab = '0'; // String simple pour le two-way binding avec PrimeNG
  private filterSignal = signal<'admin' | 'managed' | 'hoisted' | ''>('');

  activeFilter = computed(() => this.filterSignal());

  /**
   * Computed des rôles affichés (filtrés)
   */
  displayedRoles = computed(() => {
    const filter = this.filterSignal();
    
    // Appliquer le filtre actif
    if (filter === 'admin') {
      return this.roleFacade.adminRoles();
    } else if (filter === 'managed') {
      return this.roleFacade.managedRoles();
    } else if (filter === 'hoisted') {
      return this.roleFacade.hoistedRoles();
    }

    // Par défaut, retourner les rôles filtrés par la recherche
    return this.roleFacade.filteredRoles();
  });

  /**
   * Active un filtre
   */
  setFilter(filter: 'admin' | 'managed' | 'hoisted'): void {
    if (this.filterSignal() === filter) {
      this.filterSignal.set('');
    } else {
      this.filterSignal.set(filter);
    }
  }

  /**
   * Réinitialise le filtre
   */
  clearFilter(): void {
    this.filterSignal.set('');
  }

  /**
   * Vérifie si un rôle a les permissions administrateur
   */
  isAdminRole(role: GuildRoleDTO): boolean {
    if (role.permissions === '8') return true;
    const permissions = Number(role.permissions);
    return (permissions & 8) === 8;
  }

  /**
   * Génère un dégradé pour le badge de couleur
   */
  getRoleGradient(hexColor: string | undefined): string {
    // Valeur par défaut si pas de couleur
    if (!hexColor || hexColor === '#000000') {
      return 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)';
    }
    
    // Créer un dégradé avec la couleur
    const lighter = this.adjustColorBrightness(hexColor, 20);
    return `linear-gradient(135deg, ${hexColor} 0%, ${lighter} 100%)`;
  }

  /**
   * Ajuste la luminosité d'une couleur
   */
  private adjustColorBrightness(hex: string, percent: number): string {
    // Validation de la couleur
    if (!hex || !hex.startsWith('#')) {
      return '#6b7280'; // Couleur par défaut grise
    }
    
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  }

  /**
   * Recherche dans les rôles
   */
  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.roleFacade.setSearchQuery(value);
  }

  /**
   * Rafraîchit la liste des rôles
   */
  async refreshRoles(): Promise<void> {
    await this.roleFacade.refreshRoles();
    this.messageService.add({
      severity: 'success',
      summary: 'Succès',
      detail: 'Liste des rôles rafraîchie',
      life: 3000
    });
  }

  /**
   * Crée un nouveau rôle
   */
  async createRole(): Promise<void> {
    this.messageService.add({
      severity: 'info',
      summary: 'À venir',
      detail: 'Modal de création de rôle - Fonctionnalité à venir',
      life: 3000
    });
  }

  /**
   * Édite un rôle
   */
  editRole(role: GuildRoleDTO): void {
    this.roleFacade.selectRole(role);
    this.messageService.add({
      severity: 'info',
      summary: 'À venir',
      detail: `Édition de ${role.name} - Fonctionnalité à venir`,
      life: 3000
    });
  }

  /**
   * Supprime un rôle
   */
  async deleteRole(role: GuildRoleDTO): Promise<void> {
    const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer le rôle "${role.name}" ?`);
    
    if (confirmed) {
      const success = await this.roleFacade.deleteRole(role.id);
      
      if (success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: `Le rôle "${role.name}" a été supprimé`,
          life: 3000
        });
      }
    }
  }
}