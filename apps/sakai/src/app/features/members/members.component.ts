// apps/sakai/src/app/features/members/members.component.ts
import { Component, ViewChild, signal, computed, inject } from '@angular/core';
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
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';

// Services
import { MemberFacadeService } from '@app/services/member/member-facade.service';
import { GuildFacadeService } from '@app/services/guild/guild-facade.service';

// Types
import { GuildMemberDTO } from '@my-project/shared-types';

/**
 * Page de liste des membres
 * 
 * Fonctionnalités:
 * - Liste complète des membres (auto-chargée)
 * - Recherche locale
 * - Filtres rapides (admins, bots, timeout, etc.)
 * - Tri sur toutes les colonnes
 * - Navigation vers détails membre
 * - Actions rapides (menu contextuel)
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
    ToolbarModule,
    AvatarModule,
    SkeletonModule,
    MenuModule,
    BadgeModule,
    ChipModule
  ],
  templateUrl: './members.component.html',
  styleUrls: ['./members.component.scss']
})
export class MembersComponent {
  @ViewChild('dt') table!: Table;

  guildFacade: GuildFacadeService = inject(GuildFacadeService);
  memberFacade: MemberFacadeService = inject(MemberFacadeService);
  router: Router = inject(Router);

  // Services injectés (protected pour utilisation dans le template)
  constructor() {}

  // ============================================
  // ÉTATS LOCAUX
  // ============================================

  /**
   * Query de recherche locale
   */
  searchValue = signal('');

  /**
   * Filtre actif (all, admins, moderators, bots, timedout, muted)
   */
  activeFilter = signal<string>('all');

  /**
   * Membre sélectionné pour le menu contextuel
   */
  selectedMemberForActions = signal<GuildMemberDTO | null>(null);

  // ============================================
  // COMPUTED - Données filtrées
  // ============================================

  /**
   * Membres affichés selon le filtre actif
   */
  displayedMembers = computed(() => {
    const filter = this.activeFilter();
    const members = this.memberFacade.filteredMembers(); // Déjà filtré par searchQuery

    switch (filter) {
      case 'admins':
        return members.filter(m => m.isAdmin);
      case 'moderators':
        return members.filter(m => m.isModerator && !m.isAdmin);
      case 'bots':
        return members.filter(m => m.isBot);
      case 'timedout':
        return members.filter(m => m.isTimedOut);
      case 'muted':
        return members.filter(m => m.isMuted);
      case 'deafened':
        return members.filter(m => m.isDeafened);
      case 'pending':
        return members.filter(m => m.isPending);
      default:
        return members;
    }
  });

  /**
   * Guild actuellement sélectionnée
   */
  selectedGuild = this.guildFacade.selectedGuild;

  // ============================================
  // MENU CONTEXTUEL
  // ============================================

  /**
   * Items du menu contextuel (actions sur membre)
   */
  memberActions = computed<MenuItem[]>(() => {
    const member = this.selectedMemberForActions();
    if (!member) return [];

    return [
      {
        label: 'Voir le profil',
        icon: 'pi pi-user',
        command: () => this.viewMemberDetails(member)
      },
      {
        label: 'Voir les stats',
        icon: 'pi pi-chart-bar',
        command: () => this.viewMemberStats(member)
      },
      {
        separator: true
      },
      {
        label: 'Changer le pseudo',
        icon: 'pi pi-pencil',
        command: () => this.changeNickname(member)
      },
      {
        label: 'Gérer les rôles',
        icon: 'pi pi-shield',
        command: () => this.manageRoles(member)
      },
      {
        separator: true
      },
      {
        label: member.isTimedOut ? 'Retirer le timeout' : 'Mettre en timeout',
        icon: 'pi pi-clock',
        command: () => this.toggleTimeout(member)
      },
      {
        label: 'Expulser',
        icon: 'pi pi-sign-out',
        command: () => this.kickMember(member),
        styleClass: 'text-orange-500'
      },
      {
        label: 'Bannir',
        icon: 'pi pi-ban',
        command: () => this.banMember(member),
        styleClass: 'text-red-500'
      }
    ];
  });

  // ============================================
  // RECHERCHE
  // ============================================

  /**
   * Déclenché à chaque changement de recherche
   */
  onSearchChange(value: string): void {
    this.searchValue.set(value);
    this.memberFacade.setSearchQuery(value);
  }

  /**
   * Clear la recherche
   */
  clearSearch(): void {
    this.searchValue.set('');
    this.memberFacade.clearSearch();
    if (this.table) {
      this.table.clear();
    }
  }

  // ============================================
  // FILTRES RAPIDES
  // ============================================

  /**
   * Afficher tous les membres
   */
  filterAll(): void {
    this.activeFilter.set('all');
  }

  /**
   * Afficher uniquement les admins
   */
  filterAdmins(): void {
    this.activeFilter.set('admins');
  }

  /**
   * Afficher uniquement les modérateurs
   */
  filterModerators(): void {
    this.activeFilter.set('moderators');
  }

  /**
   * Afficher uniquement les bots
   */
  filterBots(): void {
    this.activeFilter.set('bots');
  }

  /**
   * Afficher uniquement les membres en timeout
   */
  filterTimedOut(): void {
    this.activeFilter.set('timedout');
  }

  /**
   * Afficher uniquement les membres muted
   */
  filterMuted(): void {
    this.activeFilter.set('muted');
  }

  /**
   * Afficher uniquement les membres en attente
   */
  filterPending(): void {
    this.activeFilter.set('pending');
  }

  // ============================================
  // NAVIGATION
  // ============================================

  /**
   * Ouvre le profil détaillé d'un membre
   */
  viewMemberDetails(member: GuildMemberDTO): void {
    const guildId = this.guildFacade.selectedGuildId();
    if (guildId) {
      this.router.navigate(['/guilds', guildId, 'members', member.id]);
    }
  }

  /**
   * Ouvre les statistiques d'un membre
   */
  viewMemberStats(member: GuildMemberDTO): void {
    const guildId = this.guildFacade.selectedGuildId();
    if (guildId) {
      this.router.navigate(['/guilds', guildId, 'members', member.id, 'stats']);
    }
  }

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Rafraîchir la liste des membres
   */
  async refresh(): Promise<void> {
    await this.memberFacade.refresh();
  }

  /**
   * Ouvre le menu contextuel pour un membre
   */
  showMemberActions(event: Event, member: GuildMemberDTO): void {
    this.selectedMemberForActions.set(member);
    // Le menu s'ouvre automatiquement avec [model] et [popup]
  }

  /**
   * Change le pseudo d'un membre
   * TODO: Ouvrir un dialog
   */
  changeNickname(member: GuildMemberDTO): void {
    console.log('Change nickname for', member.displayName);
    // TODO: Implémenter dialog avec input
  }

  /**
   * Gère les rôles d'un membre
   * TODO: Ouvrir un dialog
   */
  manageRoles(member: GuildMemberDTO): void {
    console.log('Manage roles for', member.displayName);
    // TODO: Implémenter dialog avec liste de rôles
  }

  /**
   * Toggle le timeout d'un membre
   */
  async toggleTimeout(member: GuildMemberDTO): Promise<void> {
    if (member.isTimedOut) {
      await this.memberFacade.removeTimeout(member.id, 'Retrait timeout via interface');
    } else {
      // Timeout de 1 heure
      const until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await this.memberFacade.timeoutMember(member.id, until, 'Timeout 1h via interface');
    }
  }

  /**
   * Kick un membre
   * TODO: Ajouter confirmation
   */
  async kickMember(member: GuildMemberDTO): Promise<void> {
    if (confirm(`Expulser ${member.displayName} ?`)) {
      await this.memberFacade.kickMember(member.id, 'Kick via interface');
    }
  }

  /**
   * Ban un membre
   * TODO: Ajouter confirmation + options
   */
  async banMember(member: GuildMemberDTO): Promise<void> {
    if (confirm(`Bannir ${member.displayName} ?`)) {
      await this.memberFacade.banMember(
        member.id,
        { delete_message_seconds: 604800 }, // 7 jours
        'Ban via interface'
      );
    }
  }

  // ============================================
  // HELPERS POUR LE TEMPLATE
  // ============================================

  /**
   * Retourne la couleur de tag selon le status
   */
  getMemberStatusSeverity(member: GuildMemberDTO): 'success' | 'info' | 'warn' | 'danger' {
    if (member.isTimedOut) return 'danger';
    if (member.isMuted) return 'warn';
    if (member.isPending) return 'info';
    return 'success';
  }

  /**
   * Retourne le label de status
   */
  getMemberStatusLabel(member: GuildMemberDTO): string {
    if (member.isTimedOut) return 'Timeout';
    if (member.isMuted) return 'Muted';
    if (member.isDeafened) return 'Deafened';
    if (member.isPending) return 'En attente';
    return 'Actif';
  }

  /**
   * Formatte la date de join
   */
  formatJoinDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Retourne le nombre de jours depuis le join
   */
  getDaysSinceJoin(dateString: string): number {
    const joinDate = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - joinDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}