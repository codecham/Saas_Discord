import { Component, ViewChild, computed, inject } from '@angular/core';
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
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ChipModule } from 'primeng/chip';
import { MemberFacadeService } from '@app/services/member/member-facade.service';
import { GuildFacadeService } from '@app/services/guild/guild-facade.service';
import { GuildMemberDTO } from '@my-project/shared-types';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule,
    TagModule, TooltipModule, InputIconModule, IconFieldModule, RippleModule,
    AvatarModule, MenuModule, ChipModule
  ],
  template: `
    <div class="grid grid-cols-12 gap-6">
      <!-- Stats Cards -->
      <div class="col-span-12 lg:col-span-3">
        <div class="card mb-0">
          <div class="flex justify-between mb-3">
            <div>
              <span class="block text-muted-color font-medium mb-3">Total Membres</span>
              <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ memberFacade.totalMembers() }}</div>
            </div>
            <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-lg" style="width:2.5rem;height:2.5rem">
              <i class="pi pi-users text-blue-500 text-xl"></i>
            </div>
          </div>
          <span class="text-green-500 font-medium">{{ memberFacade.loadedCount() }} </span>
          <span class="text-muted-color">chargés</span>
        </div>
      </div>

      <div class="col-span-12 lg:col-span-3">
        <div class="card mb-0">
          <div class="flex justify-between mb-3">
            <div>
              <span class="block text-muted-color font-medium mb-3">Admins</span>
              <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ memberFacade.admins().length }}</div>
            </div>
            <div class="flex items-center justify-center bg-yellow-100 dark:bg-yellow-400/10 rounded-lg" style="width:2.5rem;height:2.5rem">
              <i class="pi pi-shield text-yellow-500 text-xl"></i>
            </div>
          </div>
          <span class="text-muted-color">dont {{ memberFacade.owner() ? '1 owner' : '0 owner' }}</span>
        </div>
      </div>

      <div class="col-span-12 lg:col-span-3">
        <div class="card mb-0">
          <div class="flex justify-between mb-3">
            <div>
              <span class="block text-muted-color font-medium mb-3">Bots</span>
              <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ memberFacade.bots().length }}</div>
            </div>
            <div class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-lg" style="width:2.5rem;height:2.5rem">
              <i class="pi pi-desktop text-cyan-500 text-xl"></i>
            </div>
          </div>
          <span class="text-muted-color">{{ ((memberFacade.bots().length / memberFacade.totalMembers()) * 100).toFixed(1) }}% du total</span>
        </div>
      </div>

      <div class="col-span-12 lg:col-span-3">
        <div class="card mb-0">
          <div class="flex justify-between mb-3">
            <div>
              <span class="block text-muted-color font-medium mb-3">En Timeout</span>
              <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ memberFacade.timedOutMembers().length }}</div>
            </div>
            <div class="flex items-center justify-center bg-red-100 dark:bg-red-400/10 rounded-lg" style="width:2.5rem;height:2.5rem">
              <i class="pi pi-ban text-red-500 text-xl"></i>
            </div>
          </div>
          <span class="text-muted-color">membres sanctionnés</span>
        </div>
      </div>

      <!-- Table -->
      <div class="col-span-12">
        <div class="card">
          <div class="font-semibold text-xl mb-4">Liste des membres</div>
          
          <!-- Toolbar -->
          <div class="flex flex-col md:flex-row justify-between gap-4 mb-4">
            <div class="flex-1">
              <p-iconField iconPosition="left" class="w-full">
                <p-inputIcon styleClass="pi pi-search" />
                <input pInputText type="text" [(ngModel)]="searchValue" 
                  (ngModelChange)="onSearchChange()" placeholder="Rechercher..." class="w-full" />
              </p-iconField>
            </div>
            <button pButton pRipple label="Rafraîchir" icon="pi pi-refresh" 
              class="p-button-outlined" [loading]="memberFacade.isLoading()" (click)="refresh()"></button>
          </div>

          <!-- Filtres -->
          <div class="flex flex-wrap gap-2 mb-4">
            <button pButton pRipple [label]="'Tous (' + memberFacade.members().length + ')'" 
              [outlined]="activeFilter !== 'all'" 
              [class.p-button-primary]="activeFilter === 'all'"
              (click)="setFilter('all')"></button>
            <button pButton pRipple [label]="'Admins (' + memberFacade.admins().length + ')'" 
              [outlined]="activeFilter !== 'admins'" 
              [class.p-button-warning]="activeFilter === 'admins'"
              (click)="setFilter('admins')"></button>
            <button pButton pRipple [label]="'Bots (' + memberFacade.bots().length + ')'" 
              [outlined]="activeFilter !== 'bots'" 
              [class.p-button-info]="activeFilter === 'bots'"
              (click)="setFilter('bots')"></button>
            <button pButton pRipple [label]="'Timeout (' + memberFacade.timedOutMembers().length + ')'" 
              [outlined]="activeFilter !== 'timeout'" 
              [class.p-button-danger]="activeFilter === 'timeout'"
              (click)="setFilter('timeout')"></button>
          </div>

          <!-- Table -->
          <p-table #dt [value]="displayedMembers()" [rows]="50" [paginator]="true" 
            [rowsPerPageOptions]="[25, 50, 100]" [loading]="memberFacade.isLoading()"
            [rowHover]="true" [showCurrentPageReport]="true" 
            currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} membres"
            [globalFilterFields]="['username', 'displayName', 'nickname']">
            
            <ng-template #header>
              <tr>
                <th style="width:4rem"></th>
                <th pSortableColumn="displayName">Membre <p-sortIcon field="displayName" /></th>
                <th pSortableColumn="nickname">Pseudo <p-sortIcon field="nickname" /></th>
                <th>Rôles</th>
                <th pSortableColumn="joinedAt">Rejoint le <p-sortIcon field="joinedAt" /></th>
                <th>Statut</th>
                <th style="width:8rem">Actions</th>
              </tr>
            </ng-template>

            <ng-template #body let-member>
              <tr class="cursor-pointer" (click)="viewMemberDetails(member)">
                <td>
                  <p-avatar [image]="member.guildAvatarUrl || member.avatarUrl" 
                    shape="circle" size="large"></p-avatar>
                </td>
                <td>
                  <div class="font-semibold">{{ member.displayName }}</div>
                  <div class="text-sm text-muted-color">{{ member.username }}</div>
                </td>
                <td>{{ member.nickname || '-' }}</td>
                <td>
                  <div class="flex flex-wrap gap-1">
                    @if (member.isOwner) {
                      <p-chip label="Owner" styleClass="bg-yellow-100 text-yellow-900" />
                    }
                    @if (member.isAdmin) {
                      <p-chip label="Admin" styleClass="bg-orange-100 text-orange-900" />
                    }
                    @if (member.isBot) {
                      <p-chip label="Bot" styleClass="bg-blue-100 text-blue-900" />
                    }
                  </div>
                </td>
                <td>{{ formatDate(member.joinedAt) }}</td>
                <td>
                  @if (member.isTimedOut) {
                    <p-tag value="Timeout" severity="danger" />
                  } @else if (member.isMuted) {
                    <p-tag value="Muted" severity="warn" />
                  } @else {
                    <p-tag value="Actif" severity="success" />
                  }
                </td>
                <td>
                  <button pButton pRipple icon="pi pi-ellipsis-v" class="p-button-text p-button-rounded" 
                    (click)="showActions($event, member); $event.stopPropagation()"></button>
                </td>
              </tr>
            </ng-template>

            <ng-template #emptymessage>
              <tr><td colspan="7" class="text-center py-4">Aucun membre trouvé</td></tr>
            </ng-template>
          </p-table>
        </div>
      </div>
    </div>

    <p-menu #menu [model]="menuItems" [popup]="true"></p-menu>
  `
})
export class MembersComponent {
  @ViewChild('dt') table!: Table;
  @ViewChild('menu') menu!: any;

  protected readonly memberFacade = inject(MemberFacadeService);
  private readonly guildFacade = inject(GuildFacadeService);
  private readonly router = inject(Router);

  searchValue = '';
  activeFilter = 'all';
  selectedMember: GuildMemberDTO | null = null;

  displayedMembers = computed(() => {
    let members = this.memberFacade.members();
    
    // Filtres rapides
    if (this.activeFilter === 'admins') members = this.memberFacade.admins();
    else if (this.activeFilter === 'bots') members = this.memberFacade.bots();
    else if (this.activeFilter === 'timeout') members = this.memberFacade.timedOutMembers();
    
    // Recherche
    if (this.searchValue) {
      const search = this.searchValue.toLowerCase();
      members = members.filter(m => 
        m.displayName.toLowerCase().includes(search) ||
        m.username.toLowerCase().includes(search) ||
        m.nickname?.toLowerCase().includes(search)
      );
    }
    
    return members;
  });

  get menuItems(): MenuItem[] {
    return [
      { label: 'Voir profil', icon: 'pi pi-user', command: () => this.viewMemberDetails(this.selectedMember!) },
      { label: 'Modifier pseudo', icon: 'pi pi-pencil', command: () => this.changeNickname(this.selectedMember!) },
      { separator: true },
      { label: 'Timeout', icon: 'pi pi-ban', command: () => this.toggleTimeout(this.selectedMember!), styleClass: 'text-orange-500' },
      { label: 'Kick', icon: 'pi pi-sign-out', command: () => this.kickMember(this.selectedMember!), styleClass: 'text-red-500' }
    ];
  }

  setFilter(filter: string) {
    this.activeFilter = filter;
  }

  onSearchChange() {
    // Trigger reactivity
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  viewMemberDetails(member: GuildMemberDTO) {
    const guildId = this.guildFacade.selectedGuildId();
    if (guildId) this.router.navigate(['/guilds', guildId, 'members', member.id]);
  }

  showActions(event: Event, member: GuildMemberDTO) {
    this.selectedMember = member;
    this.menu.toggle(event);
  }

  async refresh() {
    await this.memberFacade.refresh();
  }

  changeNickname(member: GuildMemberDTO) {
    console.log('Change nickname:', member.displayName);
  }

  async toggleTimeout(member: GuildMemberDTO) {
    if (member.isTimedOut) {
      await this.memberFacade.removeTimeout(member.id);
    } else {
      const until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await this.memberFacade.timeoutMember(member.id, until);
    }
  }

  async kickMember(member: GuildMemberDTO) {
    if (confirm(`Expulser ${member.displayName} ?`)) {
      await this.memberFacade.kickMember(member.id);
    }
  }
}