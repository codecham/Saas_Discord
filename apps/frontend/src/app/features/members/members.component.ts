import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { RippleModule } from 'primeng/ripple';
import { AvatarModule } from 'primeng/avatar';
import { Popover } from 'primeng/popover';
import { MenuItem, MessageService } from 'primeng/api';
import { ChipModule } from 'primeng/chip';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { MemberFacadeService } from '@app/core/services/member/member-facade.service';
import { GuildFacadeService } from '@app/core/services/guild/guild-facade.service';
import { GuildMemberDTO } from '@my-project/shared-types';
import { MemberRolesComponent } from '@app/shared/components/domain/member-roles.component';
import { 
  MemberActionModalsComponent,
  KickMemberAction,
  BanMemberAction,
  TimeoutMemberAction,
  NicknameChangeAction
} from '@app/shared/components/domain/member-action-modals.component';

/**
 * ✅ VERSION FINALE - Composant de gestion des membres
 * 
 * Phase 2.1 - Modals PrimeNG intégrées:
 * - ✅ Modal Kick élégante
 * - ✅ Modal Ban avec options
 * - ✅ Modal Timeout avec sélection de durée
 * - ✅ Modal Change Nickname avec validation
 * - ✅ Plus de prompt() ou confirm() natifs !
 */
@Component({
  selector: 'app-members',
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
    AvatarModule,
    Popover,
    ChipModule,
    SkeletonModule,
    ToastModule,
    DividerModule,
    MemberActionModalsComponent,
    MemberRolesComponent
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="grid grid-cols-12 gap-4 md:gap-6">
      <!-- ============================================ -->
      <!-- STATS CARDS -->
      <!-- ============================================ -->
      <div class="col-span-12 sm:col-span-6 lg:col-span-3">
        <div class="card mb-0">
          <div class="flex justify-between mb-3">
            <div>
              <span class="block text-muted-color font-medium mb-3">Total Membres</span>
              <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                {{ memberFacade.totalMembers() }}
              </div>
            </div>
            <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-lg" 
                 style="width:2.5rem;height:2.5rem">
              <i class="pi pi-users text-blue-500 text-xl"></i>
            </div>
          </div>
          <span class="text-green-500 font-medium">{{ memberFacade.loadedCount() }} </span>
          <span class="text-muted-color">chargés</span>
        </div>
      </div>

      <div class="col-span-12 sm:col-span-6 lg:col-span-3">
        <div class="card mb-0">
          <div class="flex justify-between mb-3">
            <div>
              <span class="block text-muted-color font-medium mb-3">Admins</span>
              <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                {{ memberFacade.admins().length }}
              </div>
            </div>
            <div class="flex items-center justify-center bg-yellow-100 dark:bg-yellow-400/10 rounded-lg" 
                 style="width:2.5rem;height:2.5rem">
              <i class="pi pi-shield text-yellow-500 text-xl"></i>
            </div>
          </div>
          <span class="text-muted-color">
            dont {{ memberFacade.owner() ? '1 owner' : '0 owner' }}
          </span>
        </div>
      </div>

      <div class="col-span-12 sm:col-span-6 lg:col-span-3">
        <div class="card mb-0">
          <div class="flex justify-between mb-3">
            <div>
              <span class="block text-muted-color font-medium mb-3">Bots</span>
              <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                {{ memberFacade.bots().length }}
              </div>
            </div>
            <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-lg" 
                 style="width:2.5rem;height:2.5rem">
              <i class="pi pi-desktop text-purple-500 text-xl"></i>
            </div>
          </div>
          <span class="text-muted-color">
            {{ memberFacade.humans().length }} humains
          </span>
        </div>
      </div>

      <div class="col-span-12 sm:col-span-6 lg:col-span-3">
        <div class="card mb-0">
          <div class="flex justify-between mb-3">
            <div>
              <span class="block text-muted-color font-medium mb-3">En Timeout</span>
              <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                {{ memberFacade.timedOutMembers().length }}
              </div>
            </div>
            <div class="flex items-center justify-center bg-red-100 dark:bg-red-400/10 rounded-lg" 
                 style="width:2.5rem;height:2.5rem">
              <i class="pi pi-ban text-red-500 text-xl"></i>
            </div>
          </div>
          <span class="text-muted-color">membres sanctionnés</span>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- TABLE SECTION -->
      <!-- ============================================ -->
      <div class="col-span-12">
        <div class="card">
          <!-- Header -->
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h5 class="m-0 text-xl font-semibold">Liste des Membres</h5>
            
            <div class="flex flex-wrap gap-2">
              <p-iconField iconPosition="left" class="flex-1 md:flex-initial">
                <p-inputIcon styleClass="pi pi-search" />
                <input 
                  type="text" 
                  pInputText 
                  placeholder="Rechercher..." 
                  [ngModel]="searchValue()"
                  (ngModelChange)="searchValue.set($event)"
                  class="w-full md:w-auto"
                />
              </p-iconField>
              
              <p-button 
                icon="pi pi-refresh" 
                [text]="true" 
                [rounded]="true"
                (onClick)="refresh()"
                pTooltip="Rafraîchir"
                tooltipPosition="bottom"
              />
            </div>
          </div>

          <!-- Filtres rapides -->
          <div class="flex flex-wrap gap-2 mb-4">
            <p-button 
              label="Tous" 
              [text]="true" 
              [outlined]="activeFilter() !== 'all'" 
              (onClick)="setFilter('all')"
            />
            <p-button 
              label="Admins" 
              icon="pi pi-shield" 
              [text]="true" 
              [outlined]="activeFilter() !== 'admins'" 
              [class.p-button-warning]="activeFilter() === 'admins'"
              (onClick)="setFilter('admins')"
            />
            <p-button 
              label="Bots" 
              icon="pi pi-desktop" 
              [text]="true" 
              [outlined]="activeFilter() !== 'bots'" 
              [class.p-button-info]="activeFilter() === 'bots'"
              (onClick)="setFilter('bots')"
            />
            <p-button 
              label="En Timeout" 
              icon="pi pi-ban" 
              [text]="true" 
              [outlined]="activeFilter() !== 'timeout'" 
              [class.p-button-danger]="activeFilter() === 'timeout'"
              (onClick)="setFilter('timeout')"
            />
          </div>

          <!-- Loading Skeletons -->
          @if (memberFacade.isLoading()) {
            @for (i of [1,2,3,4,5]; track i) {
              <div class="flex items-center gap-3 p-3 border-round surface-border border mb-2">
                <p-skeleton shape="circle" size="3rem" />
                <div class="flex-1">
                  <p-skeleton width="60%" height="1.5rem" styleClass="mb-2" />
                  <p-skeleton width="40%" height="1rem" />
                </div>
                <p-skeleton width="6rem" height="2rem" />
              </div>
            }
          }

          <!-- Table -->
          @if (!memberFacade.isLoading()) {
            <p-table
              #dt
              [value]="displayedMembers()"
              [rows]="50"
              [paginator]="true"
              [rowsPerPageOptions]="[25, 50, 100, 200]"
              [globalFilterFields]="['username', 'displayName', 'nickname']"
              responsiveLayout="scroll"
              styleClass="p-datatable-sm"
              currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} membres"
              [showCurrentPageReport]="true"
            >
              <!-- Header -->
              <ng-template pTemplate="header">
                <tr>
                  <th style="width: 4rem"></th>
                  <th pSortableColumn="username" style="min-width: 12rem">
                    Utilisateur <p-sortIcon field="username" />
                  </th>
                  <th pSortableColumn="nickname" style="min-width: 10rem">
                    Pseudo <p-sortIcon field="nickname" />
                  </th>
                  <th>Badges</th>
                  <th>Rôles</th>
                  <th pSortableColumn="joinedAt" style="min-width: 10rem">
                    Rejoint le <p-sortIcon field="joinedAt" />
                  </th>
                  <th>Statut</th>
                  <th style="width: 8rem">Actions</th>
                </tr>
              </ng-template>

              <!-- Body -->
              <ng-template pTemplate="body" let-member>
                <tr class="cursor-pointer hover:bg-surface-hover" (click)="viewMemberDetails(member)">
                  <!-- Avatar -->
                  <td>
                    <p-avatar
                      [image]="member.guildAvatarUrl || member.avatarUrl"
                      shape="circle"
                      size="large"
                    />
                  </td>

                  <!-- Username -->
                  <td>
                    <div class="font-semibold">{{ member.displayName }}</div>
                    <div class="text-sm text-muted-color">{{ member.username }}</div>
                  </td>

                  <!-- Nickname -->
                  <td>{{ member.nickname || '-' }}</td>

                  <!-- Badges -->
                  <td>
                    <div class="flex flex-wrap gap-1">
                      @if (member.isOwner) {
                        <p-chip label="Owner" styleClass="text-xs py-1 px-2 bg-yellow-100 text-yellow-900" />
                      }
                      @if (member.isAdmin) {
                        <p-chip label="Admin" styleClass="text-xs py-1 px-2 bg-orange-100 text-orange-900" />
                      }
                      @if (member.isBot) {
                        <p-chip label="Bot" styleClass="text-xs py-1 px-2 bg-blue-100 text-blue-900" />
                      }
                    </div>
                  </td>

                  <!-- Roles -->
                  <td>
                    <app-member-roles [roleIds]="member.roles" [maxDisplay]="3" />
                  </td>


                  <!-- Join Date -->
                  <td>{{ formatDate(member.joinedAt) }}</td>

                  <!-- Status -->
                  <td>
                    @if (member.isTimedOut) {
                      <p-tag value="Timeout" severity="danger" />
                    } @else if (member.isMuted) {
                      <p-tag value="Muted" severity="warn" />
                    } @else {
                      <p-tag value="Actif" severity="success" />
                    }
                  </td>

                  <!-- Actions -->
                  <td>
                    <div class="flex gap-1">
                      <p-button 
                        icon="pi pi-eye" 
                        [text]="true" 
                        [rounded]="true"
                        size="small"
                        (onClick)="viewMemberDetails(member); $event.stopPropagation()"
                        pTooltip="Voir profil"
                        tooltipPosition="top"
                      />
                      <p-button 
                        icon="pi pi-ellipsis-v" 
                        [text]="true" 
                        [rounded]="true"
                        size="small"
                        (onClick)="showActions($event, member); $event.stopPropagation()"
                        pTooltip="Plus d'actions"
                        tooltipPosition="top"
                      />
                    </div>
                  </td>
                </tr>
              </ng-template>

              <!-- Empty -->
              <ng-template pTemplate="emptymessage">
                <tr>
                  <td colspan="8" class="text-center py-6">
                    <div class="flex flex-col items-center gap-2">
                      <i class="pi pi-users text-4xl text-muted-color"></i>
                      <p class="text-muted-color m-0">Aucun membre trouvé</p>
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          }
        </div>
      </div>
    </div>

    <!-- Popover pour les actions -->
    <p-popover #actionsPanel>
      @if (selectedMember) {
        <div class="flex flex-col gap-2 p-2 min-w-[200px]">
          <!-- Voir profil -->
          <button 
            class="p-2 hover:bg-surface-hover rounded flex items-center gap-2 cursor-pointer border-0 bg-transparent text-left w-full"
            (click)="viewMemberDetails(selectedMember); actionsPanel.hide()"
          >
            <i class="pi pi-user"></i>
            <span>Voir profil</span>
          </button>

          <!-- Modifier pseudo -->
          <button 
            class="p-2 hover:bg-surface-hover rounded flex items-center gap-2 cursor-pointer border-0 bg-transparent text-left w-full"
            (click)="modals.openNicknameModal(); actionsPanel.hide()"
          >
            <i class="pi pi-pencil"></i>
            <span>Modifier pseudo</span>
          </button>

          <p-divider styleClass="my-2" />

          <!-- Timeout / Remove timeout -->
          @if (selectedMember.isTimedOut) {
            <button 
              class="p-2 hover:bg-surface-hover rounded flex items-center gap-2 cursor-pointer border-0 bg-transparent text-left w-full"
              (click)="removeTimeout(selectedMember); actionsPanel.hide()"
            >
              <i class="pi pi-check-circle text-green-500"></i>
              <span>Retirer timeout</span>
            </button>
          } @else {
            <button 
              class="p-2 hover:bg-surface-hover rounded flex items-center gap-2 cursor-pointer border-0 bg-transparent text-left w-full"
              (click)="modals.openTimeoutModal(); actionsPanel.hide()"
            >
              <i class="pi pi-ban text-orange-500"></i>
              <span class="text-orange-500">Timeout</span>
            </button>
          }

          <!-- Kick -->
          <button 
            class="p-2 hover:bg-surface-hover rounded flex items-center gap-2 cursor-pointer border-0 bg-transparent text-left w-full"
            (click)="modals.openKickModal(); actionsPanel.hide()"
          >
            <i class="pi pi-sign-out text-red-500"></i>
            <span class="text-red-500">Kick</span>
          </button>

          <!-- Ban -->
          <button 
            class="p-2 hover:bg-surface-hover rounded flex items-center gap-2 cursor-pointer border-0 bg-transparent text-left w-full"
            (click)="modals.openBanModal(); actionsPanel.hide()"
          >
            <i class="pi pi-times-circle text-red-600"></i>
            <span class="text-red-600">Ban</span>
          </button>
        </div>
      }
    </p-popover>

    <!-- ✅ NOUVEAU: Modals Component -->
    <app-member-action-modals
      #modals
      [member]="selectedMember"
      (onKick)="handleKick($event)"
      (onBan)="handleBan($event)"
      (onTimeout)="handleTimeout($event)"
      (onNicknameChange)="handleNicknameChange($event)"
    />
  `
})
export class MembersComponent {
  @ViewChild('dt') table!: Table;
  @ViewChild('actionsPanel') actionsPanel!: Popover;
  @ViewChild('modals') modals!: MemberActionModalsComponent;

  protected readonly memberFacade = inject(MemberFacadeService);
  private readonly guildFacade = inject(GuildFacadeService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  // Signals pour la réactivité
  searchValue = signal('');
  activeFilter = signal<'all' | 'admins' | 'bots' | 'timeout'>('all');
  selectedMember: GuildMemberDTO | null = null;

  // Computed - Membres affichés avec filtres
  displayedMembers = computed(() => {
    const filter = this.activeFilter();
    const search = this.searchValue().toLowerCase().trim();
    
    let members = this.memberFacade.members();
    
    // Appliquer le filtre rapide
    if (filter === 'admins') {
      members = this.memberFacade.admins();
    } else if (filter === 'bots') {
      members = this.memberFacade.bots();
    } else if (filter === 'timeout') {
      members = this.memberFacade.timedOutMembers();
    }
    
    // Appliquer la recherche
    if (search) {
      members = members.filter(m => 
        m.displayName.toLowerCase().includes(search) ||
        m.username.toLowerCase().includes(search) ||
        m.nickname?.toLowerCase().includes(search)
      );
    }
    
    return members;
  });

  // ============================================
  // MÉTHODES DE BASE
  // ============================================

  setFilter(filter: 'all' | 'admins' | 'bots' | 'timeout'): void {
    this.activeFilter.set(filter);
  }

  viewMemberDetails(member: GuildMemberDTO): void {
    const guildId = this.guildFacade.selectedGuildId();
    if (guildId) {
      this.router.navigate(['/guilds', guildId, 'members', member.id]);
    }
  }

  showActions(event: Event, member: GuildMemberDTO): void {
    this.selectedMember = member;
    this.actionsPanel.toggle(event);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  }

  async refresh(): Promise<void> {
    try {
      await this.memberFacade.refresh();
      this.messageService.add({
        severity: 'success',
        summary: 'Succès',
        detail: 'Liste des membres rafraîchie',
        life: 3000
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de rafraîchir la liste',
        life: 5000
      });
    }
  }

  // ============================================
  // ✅ NOUVEAU: HANDLERS POUR LES MODALS
  // ============================================

  async handleKick(action: KickMemberAction): Promise<void> {
    try {
      await this.memberFacade.kickMember(action.memberId, action.reason);
      
      this.modals.resetAndClose('kick');
      
      this.messageService.add({
        severity: 'success',
        summary: 'Membre expulsé',
        detail: `Le membre a été expulsé du serveur`,
        life: 3000
      });
    } catch (error) {
      this.modals.resetLoading('kick');
      
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible d\'expulser le membre',
        life: 5000
      });
    }
  }

  async handleBan(action: BanMemberAction): Promise<void> {
    try {
      await this.memberFacade.banMember(
        action.memberId, 
        action.reason, 
        action.deleteMessageDays
      );
      
      this.modals.resetAndClose('ban');
      
      this.messageService.add({
        severity: 'warn',
        summary: 'Membre banni',
        detail: `Le membre a été banni du serveur`,
        life: 3000
      });
    } catch (error) {
      this.modals.resetLoading('ban');
      
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de bannir le membre',
        life: 5000
      });
    }
  }

  async handleTimeout(action: TimeoutMemberAction): Promise<void> {
    try {
      await this.memberFacade.timeoutMember(
        action.memberId, 
        action.duration, 
        action.reason
      );
      
      this.modals.resetAndClose('timeout');
      
      this.messageService.add({
        severity: 'success',
        summary: 'Timeout appliqué',
        detail: `Le membre est maintenant en timeout`,
        life: 3000
      });
    } catch (error) {
      this.modals.resetLoading('timeout');
      
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible d\'appliquer le timeout',
        life: 5000
      });
    }
  }

  async handleNicknameChange(action: NicknameChangeAction): Promise<void> {
    try {
      await this.memberFacade.changeNickname(
        action.memberId, 
        action.nickname, 
        action.reason
      );
      
      this.modals.resetAndClose('nickname');
      
      this.messageService.add({
        severity: 'success',
        summary: 'Pseudo modifié',
        detail: `Le pseudo du membre a été mis à jour`,
        life: 3000
      });
    } catch (error) {
      this.modals.resetLoading('nickname');
      
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de modifier le pseudo',
        life: 5000
      });
    }
  }

  // ============================================
  // ACTIONS DIRECTES (sans modal)
  // ============================================

  async removeTimeout(member: GuildMemberDTO): Promise<void> {
    try {
      await this.memberFacade.removeTimeout(member.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Timeout retiré',
        detail: `${member.displayName} n'est plus en timeout`,
        life: 3000
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de retirer le timeout',
        life: 5000
      });
    }
  }
}