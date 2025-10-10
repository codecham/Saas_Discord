// apps/sakai/src/app/features/members/member-list.component.ts
import { Component, OnInit, ViewChild, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG imports
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { RippleModule } from 'primeng/ripple';
import { ToolbarModule } from 'primeng/toolbar';
import { AvatarModule } from 'primeng/avatar';
import { SkeletonModule } from 'primeng/skeleton';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

// Services
import { MemberFacadeService } from '@app/services/member/member-facade.service';
import { GuildFacadeService } from '@app/services/guild/guild-facade.service';

// Types
import { DiscordGuildMemberDTO } from '@my-project/shared-types';

@Component({
  selector: 'app-member-list',
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
    ToolbarModule,
    AvatarModule,
    SkeletonModule,
    MenuModule
  ],
  template: `
    <div class="card">
      <!-- Toolbar -->
      <p-toolbar styleClass="mb-4">
        <ng-template #start>
          <div class="flex items-center gap-2">
            <i class="pi pi-users text-2xl"></i>
            <div>
              <div class="font-semibold text-xl">Membres</div>
              <div class="text-sm text-muted-color">
                {{ memberFacade.totalMembers() }} membre(s)
              </div>
            </div>
          </div>
        </ng-template>
        
        <ng-template #end>
          <button 
            pButton 
            pRipple 
            icon="pi pi-refresh" 
            class="p-button-outlined"
            (click)="refreshMembers()"
            [loading]="memberFacade.isLoading()"
            pTooltip="Rafraîchir"
            tooltipPosition="bottom">
          </button>
        </ng-template>
      </p-toolbar>

      <!-- Table -->
      <p-table
        #dt
        [value]="memberFacade.filteredMembers()"
        [rows]="25"
        [paginator]="true"
        [globalFilterFields]="['user.username', 'user.global_name', 'nick']"
        [rowHover]="true"
        dataKey="user.id"
        [loading]="memberFacade.isLoading()"
        currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} membres"
        [showCurrentPageReport]="true"
        [rowsPerPageOptions]="[10, 25, 50, 100]"
        styleClass="p-datatable-gridlines">
        
        <!-- Caption avec recherche -->
        <ng-template #caption>
          <div class="flex justify-between items-center">
            <p-iconfield iconPosition="left" class="w-full sm:w-auto">
              <p-inputicon styleClass="pi pi-search"></p-inputicon>
              <input
                pInputText
                type="text"
                [(ngModel)]="searchValue"
                (input)="onSearch($event)"
                placeholder="Rechercher un membre..."
                class="w-full sm:w-80" />
            </p-iconfield>

            <div class="flex gap-2">
              <!-- Filtres rapides -->
              <button
                pButton
                pRipple
                [label]="'Timeout (' + memberFacade.timedOutMembers().length + ')'"
                icon="pi pi-clock"
                class="p-button-outlined p-button-warning"
                [disabled]="memberFacade.timedOutMembers().length === 0"
                (click)="filterTimedOut()">
              </button>
              
              <button
                pButton
                pRipple
                [label]="'Mutés (' + memberFacade.mutedMembers().length + ')'"
                icon="pi pi-volume-off"
                class="p-button-outlined p-button-danger"
                [disabled]="memberFacade.mutedMembers().length === 0"
                (click)="filterMuted()">
              </button>
            </div>
          </div>
        </ng-template>

        <!-- Header -->
        <ng-template #header>
          <tr>
            <th style="width: 4rem"></th>
            <th pSortableColumn="user.username" style="min-width: 12rem">
              Utilisateur <p-sortIcon field="user.username"></p-sortIcon>
            </th>
            <th pSortableColumn="nick" style="min-width: 10rem">
              Pseudo <p-sortIcon field="nick"></p-sortIcon>
            </th>
            <th>Rôles</th>
            <th pSortableColumn="joined_at" style="min-width: 10rem">
              Rejoint le <p-sortIcon field="joined_at"></p-sortIcon>
            </th>
            <th>Statut</th>
            <th style="width: 8rem">Actions</th>
          </tr>
        </ng-template>

        <!-- Body -->
        <ng-template #body let-member>
          <tr class="cursor-pointer" (click)="viewMemberDetails(member)">
            <!-- Avatar -->
            <td>
              <p-avatar 
                [image]="getMemberAvatar(member)"
                shape="circle"
                size="large"
                [style]="{ 'background-color': member.user?.accent_color ? '#' + member.user.accent_color.toString(16) : '#6366f1' }">
                <span *ngIf="!member.user?.avatar">
                  {{ member.user?.username?.charAt(0).toUpperCase() }}
                </span>
              </p-avatar>
            </td>

            <!-- Utilisateur -->
            <td>
              <div class="flex flex-col gap-1">
                <span class="font-semibold">
                  {{ member.user?.global_name || member.user?.username }}
                </span>
                <span class="text-sm text-muted-color">
                  @{{ member.user?.username }}
                </span>
              </div>
            </td>

            <!-- Pseudo -->
            <td>
              <span *ngIf="member.nick" class="font-medium">
                {{ member.nick }}
              </span>
              <span *ngIf="!member.nick" class="text-muted-color italic">
                Aucun
              </span>
            </td>

            <!-- Rôles -->
            <td>
              <div class="flex flex-wrap gap-1">
                <p-tag 
                  *ngFor="let roleId of member.roles.slice(0, 3)"
                  [value]="getRoleName(roleId)"
                  [style]="{ 'background-color': getRoleColor(roleId) }"
                  styleClass="text-xs">
                </p-tag>
                <p-tag 
                  *ngIf="member.roles.length > 3"
                  [value]="'+' + (member.roles.length - 3)"
                  severity="secondary"
                  styleClass="text-xs">
                </p-tag>
              </div>
            </td>

            <!-- Date -->
            <td>
              {{ member.joined_at | date: 'dd/MM/yyyy HH:mm' }}
            </td>

            <!-- Statut -->
            <td>
              <div class="flex flex-col gap-1">
                <p-tag 
                  *ngIf="isTimedOut(member)"
                  value="Timeout"
                  severity="warn"
                  icon="pi pi-clock">
                </p-tag>
                <p-tag 
                  *ngIf="member.mute"
                  value="Muté"
                  severity="danger"
                  icon="pi pi-volume-off">
                </p-tag>
                <p-tag 
                  *ngIf="member.deaf"
                  value="Sourd"
                  severity="secondary"
                  icon="pi pi-volume-off">
                </p-tag>
                <p-tag 
                  *ngIf="!isTimedOut(member) && !member.mute && !member.deaf"
                  value="Actif"
                  severity="success"
                  icon="pi pi-check">
                </p-tag>
              </div>
            </td>

            <!-- Actions -->
            <td>
              <div class="flex gap-1">
                <button
                  pButton
                  pRipple
                  icon="pi pi-eye"
                  class="p-button-rounded p-button-text"
                  (click)="viewMemberDetails(member); $event.stopPropagation()"
                  pTooltip="Voir les détails"
                  tooltipPosition="top">
                </button>
                <button
                  pButton
                  pRipple
                  icon="pi pi-ellipsis-v"
                  class="p-button-rounded p-button-text"
                  (click)="showMemberMenu($event, member); $event.stopPropagation()">
                </button>
              </div>
            </td>
          </tr>
        </ng-template>

        <!-- Loading -->
        <ng-template #loadingbody>
          <tr *ngFor="let i of [1,2,3,4,5]">
            <td><p-skeleton shape="circle" size="3rem"></p-skeleton></td>
            <td><p-skeleton width="10rem"></p-skeleton></td>
            <td><p-skeleton width="8rem"></p-skeleton></td>
            <td><p-skeleton width="100%"></p-skeleton></td>
            <td><p-skeleton width="8rem"></p-skeleton></td>
            <td><p-skeleton width="5rem"></p-skeleton></td>
            <td><p-skeleton width="4rem"></p-skeleton></td>
          </tr>
        </ng-template>

        <!-- Empty -->
        <ng-template #emptymessage>
          <tr>
            <td colspan="7" class="text-center py-8">
              <div class="flex flex-col items-center gap-3">
                <i class="pi pi-users text-4xl text-muted-color"></i>
                <p class="text-muted-color">Aucun membre trouvé</p>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Menu contextuel -->
      <p-menu #memberMenu [model]="menuItems" [popup]="true"></p-menu>
    </div>
  `,
  styles: [`
    :host ::ng-deep {
      .p-datatable .p-datatable-tbody > tr > td {
        padding: 0.75rem;
      }

      .p-toolbar {
        border-radius: 6px;
      }

      .p-tag {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
      }
    }
  `]
})
export class MemberListComponent implements OnInit {
  protected readonly memberFacade = inject(MemberFacadeService);
  private readonly guildFacade = inject(GuildFacadeService);
  private readonly router = inject(Router);

  @ViewChild('dt') table!: Table;
  @ViewChild('memberMenu') memberMenu: any;

  searchValue: string = '';
  selectedMember: DiscordGuildMemberDTO | null = null;
  menuItems: MenuItem[] = [];

  constructor() {
    // Effect pour charger les membres quand la guild change
    effect(() => {
      const guildId = this.guildFacade.selectedGuildId();
      if (guildId) {
        console.log('[MemberList] Guild changed, loading members');
        this.loadMembers();
      }
    });
  }

  ngOnInit(): void {
    // Charger les membres si une guild est déjà sélectionnée
    if (this.guildFacade.selectedGuildId()) {
      this.loadMembers();
    }
  }

  async loadMembers(): Promise<void> {
    try {
      await this.memberFacade.loadMembers(100);
    } catch (error) {
      console.error('[MemberList] Error loading members:', error);
    }
  }

  async refreshMembers(): Promise<void> {
    try {
      await this.memberFacade.refreshMembers();
    } catch (error) {
      console.error('[MemberList] Error refreshing members:', error);
    }
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.table.filterGlobal(value, 'contains');
  }

  filterTimedOut(): void {
    // TODO: Implémenter le filtre pour les membres en timeout
    console.log('Filter timed out members');
  }

  filterMuted(): void {
    // TODO: Implémenter le filtre pour les membres mutés
    console.log('Filter muted members');
  }

  viewMemberDetails(member: DiscordGuildMemberDTO): void {
    this.memberFacade.selectMember(member);
    // Navigation vers la page de détails
    this.router.navigate(['/members', member.user?.id]);
  }

  showMemberMenu(event: Event, member: DiscordGuildMemberDTO): void {
    this.selectedMember = member;
    
    this.menuItems = [
      {
        label: 'Voir les détails',
        icon: 'pi pi-eye',
        command: () => this.viewMemberDetails(member)
      },
      {
        label: 'Modifier',
        icon: 'pi pi-pencil',
        command: () => this.editMember(member)
      },
      { separator: true },
      {
        label: 'Timeout',
        icon: 'pi pi-clock',
        command: () => this.timeoutMember(member)
      },
      {
        label: 'Expulser',
        icon: 'pi pi-sign-out',
        command: () => this.kickMember(member)
      },
      {
        label: 'Bannir',
        icon: 'pi pi-ban',
        command: () => this.banMember(member)
      }
    ];

    this.memberMenu.toggle(event);
  }

  editMember(member: DiscordGuildMemberDTO): void {
    // TODO: Ouvrir dialog d'édition
    console.log('Edit member:', member);
  }

  async timeoutMember(member: DiscordGuildMemberDTO): Promise<void> {
    // TODO: Ouvrir dialog de timeout
    console.log('Timeout member:', member);
  }

  async kickMember(member: DiscordGuildMemberDTO): Promise<void> {
    // TODO: Ouvrir dialog de confirmation
    console.log('Kick member:', member);
  }

  async banMember(member: DiscordGuildMemberDTO): Promise<void> {
    // TODO: Ouvrir dialog de ban
    console.log('Ban member:', member);
  }

  getMemberAvatar(member: DiscordGuildMemberDTO): string | undefined {
    if (!member.user?.avatar) return undefined;
    
    const format = member.user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.${format}?size=128`;
  }

  getRoleName(roleId: string): string {
    // TODO: Récupérer le nom du rôle depuis le service de rôles
    return roleId.substring(0, 8);
  }

  getRoleColor(roleId: string): string {
    // TODO: Récupérer la couleur du rôle depuis le service de rôles
    return '#6366f1';
  }

  isTimedOut(member: DiscordGuildMemberDTO): boolean {
    if (!member.communication_disabled_until) return false;
    return new Date(member.communication_disabled_until) > new Date();
  }
}