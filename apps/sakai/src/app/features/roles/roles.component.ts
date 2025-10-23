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
import { MessageService } from 'primeng/api';
import { RoleFacadeService } from '@app/services/role/role-facade.service';
import { GuildFacadeService } from '@app/services/guild/guild-facade.service';
import { GuildRoleDTO } from '@my-project/shared-types';

/**
 * Composant de gestion des rôles
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
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <div class="grid">
      <div class="col-span-12">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h1 class="font-semibold text-3xl m-0">Rôles</h1>
            @if (guildFacade.selectedGuild(); as guild) {
              <p class="text-muted-color text-sm mt-1">
                {{ guild.name }}
                @if (!roleFacade.isLoading()) {
                  <span> · {{ roleFacade.totalRoles() }} rôle{{ roleFacade.totalRoles() > 1 ? 's' : '' }}</span>
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

        <!-- Card -->
        <div class="card">
          <!-- Toolbar avec recherche -->
          <div class="flex flex-col sm:flex-row gap-4 mb-4">
            <!-- Barre de recherche -->
            <p-iconfield iconPosition="left" class="flex-1">
              <p-inputicon styleClass="pi pi-search" />
              <input
                pInputText
                type="text"
                [(ngModel)]="searchValue"
                (input)="onSearch($event)"
                placeholder="Rechercher un rôle..."
                class="w-full"
                [disabled]="roleFacade.isLoading()"
              />
            </p-iconfield>

            <!-- Chips de filtrage rapide -->
            <div class="flex gap-2 items-center flex-wrap">
              <p-chip
                label="Admin"
                [removable]="false"
                styleClass="cursor-pointer"
                (click)="filterByCategory('admin')"
              />
              <p-chip
                label="Managés"
                [removable]="false"
                styleClass="cursor-pointer"
                (click)="filterByCategory('managed')"
              />
              <p-chip
                label="Hoisted"
                [removable]="false"
                styleClass="cursor-pointer"
                (click)="filterByCategory('hoisted')"
              />
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
              responsiveLayout="scroll"
              styleClass="p-datatable-gridlines"
              [rowHover]="true"
              currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} rôles"
              [showCurrentPageReport]="true"
            >
              <!-- Header -->
              <ng-template pTemplate="header">
                <tr>
                  <th style="width: 3rem"></th>
                  <th pSortableColumn="name" style="min-width: 12rem">
                    Nom du rôle <p-sortIcon field="name" />
                  </th>
                  <th pSortableColumn="memberCount" style="min-width: 8rem">
                    Membres <p-sortIcon field="memberCount" />
                  </th>
                  <th pSortableColumn="position" style="min-width: 8rem">
                    Position <p-sortIcon field="position" />
                  </th>
                  <th>Propriétés</th>
                  <th style="width: 10rem">Actions</th>
                </tr>
              </ng-template>

              <!-- Body -->
              <ng-template pTemplate="body" let-role>
                <tr [class.opacity-50]="role.isEveryone">
                  <!-- Couleur -->
                  <td>
                    <div
                      class="w-8 h-8 rounded-full border-2 border-surface"
                      [style.background-color]="role.colorHex"
                      [pTooltip]="role.colorHex"
                    ></div>
                  </td>

                  <!-- Nom -->
                  <td>
                    <div class="flex items-center gap-2">
                      @if (role.icon && role.iconUrl) {
                        <img [src]="role.iconUrl" [alt]="role.name" class="w-5 h-5" />
                      }
                      <span class="font-semibold">{{ role.name }}</span>
                      @if (role.isEveryone) {
                        <p-tag value="@everyone" severity="secondary" />
                      }
                    </div>
                  </td>

                  <!-- Nombre de membres -->
                  <td>
                    @if (role.memberCount !== undefined) {
                      <span class="text-muted-color">
                        {{ role.memberCount }} membre{{ role.memberCount > 1 ? 's' : '' }}
                      </span>
                    } @else {
                      <span class="text-muted-color">N/A</span>
                    }
                  </td>

                  <!-- Position -->
                  <td>
                    <p-tag [value]="role.position.toString()" severity="info" />
                  </td>

                  <!-- Propriétés -->
                  <td>
                    <div class="flex gap-1 flex-wrap">
                      @if (role.isAdmin) {
                        <p-chip label="Admin" icon="pi pi-shield" styleClass="text-xs" />
                      }
                      @if (role.isManaged) {
                        <p-chip label="Managé" icon="pi pi-lock" styleClass="text-xs" />
                      }
                      @if (role.isHoisted) {
                        <p-chip label="Hoisted" icon="pi pi-eye" styleClass="text-xs" />
                      }
                      @if (role.isMentionable) {
                        <p-chip label="Mentionnable" icon="pi pi-at" styleClass="text-xs" />
                      }
                    </div>
                  </td>

                  <!-- Actions -->
                  <td>
                    <div class="flex gap-2">
                      <p-button
                        icon="pi pi-pencil"
                        [outlined]="true"
                        [rounded]="true"
                        size="small"
                        pTooltip="Modifier"
                        tooltipPosition="top"
                        (onClick)="editRole(role)"
                        [disabled]="role.isEveryone || role.isManaged"
                      />
                      <p-button
                        icon="pi pi-trash"
                        [outlined]="true"
                        [rounded]="true"
                        size="small"
                        severity="danger"
                        pTooltip="Supprimer"
                        tooltipPosition="top"
                        (onClick)="deleteRole(role)"
                        [disabled]="role.isEveryone || role.isManaged"
                      />
                    </div>
                  </td>
                </tr>
              </ng-template>

              <!-- Empty -->
              <ng-template pTemplate="emptymessage">
                <tr>
                  <td colspan="6" class="text-center py-8">
                    <i class="pi pi-info-circle text-4xl text-muted-color mb-3"></i>
                    <p class="text-muted-color">Aucun rôle trouvé</p>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          }

          <!-- Error -->
          @if (roleFacade.error()) {
            <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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
  `]
})
export class RolesComponent {
  @ViewChild('dt') table!: Table;

  roleFacade = inject(RoleFacadeService);
  guildFacade = inject(GuildFacadeService);
  private messageService = inject(MessageService);

  searchValue = '';

  /**
   * Computed des rôles affichés (filtrés)
   */
  displayedRoles = computed(() => {
    return this.roleFacade.filteredRoles();
  });

  /**
   * Recherche dans les rôles
   */
  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.roleFacade.setSearchQuery(value);
  }

  /**
   * Filtrage rapide par catégorie
   */
  filterByCategory(category: 'admin' | 'managed' | 'hoisted'): void {
    // Cette fonctionnalité nécessiterait d'ajouter des computed supplémentaires
    // dans le data service pour filtrer par catégorie
    // Pour l'instant, on peut juste afficher un message
    this.messageService.add({
      severity: 'info',
      summary: 'Filtre',
      detail: `Filtrage par ${category} - Fonctionnalité à venir`
    });
  }

  /**
   * Rafraîchit la liste des rôles
   */
  async refreshRoles(): Promise<void> {
    await this.roleFacade.refreshRoles();
    this.messageService.add({
      severity: 'success',
      summary: 'Succès',
      detail: 'Liste des rôles rafraîchie'
    });
  }

  /**
   * Crée un nouveau rôle
   */
  async createRole(): Promise<void> {
    // TODO: Ouvrir un modal pour créer un rôle
    this.messageService.add({
      severity: 'info',
      summary: 'À venir',
      detail: 'Modal de création de rôle - Fonctionnalité à venir'
    });
  }

  /**
   * Édite un rôle
   */
  editRole(role: GuildRoleDTO): void {
    // TODO: Ouvrir un modal pour éditer le rôle
    this.roleFacade.selectRole(role);
    this.messageService.add({
      severity: 'info',
      summary: 'À venir',
      detail: `Édition de ${role.name} - Fonctionnalité à venir`
    });
  }

  /**
   * Supprime un rôle
   */
  async deleteRole(role: GuildRoleDTO): Promise<void> {
    // TODO: Ouvrir un modal de confirmation
    const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer le rôle "${role.name}" ?`);
    
    if (confirmed) {
      const success = await this.roleFacade.deleteRole(role.id);
      
      if (success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: `Le rôle "${role.name}" a été supprimé`
        });
      }
    }
  }
}