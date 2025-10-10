// apps/sakai/src/app/services/member/member-data.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { DiscordGuildMemberDTO } from '@my-project/shared-types';

/**
 * Service de gestion de l'état des membres
 * Utilise des signals Angular pour la réactivité
 */
@Injectable({
  providedIn: 'root'
})
export class MemberDataService {
  // ============================================
  // SIGNALS DE BASE
  // ============================================

  /**
   * Liste des membres chargés
   */
  private _members = signal<DiscordGuildMemberDTO[]>([]);
  readonly members = this._members.asReadonly();

  /**
   * Membre actuellement sélectionné/consulté
   */
  private _selectedMember = signal<DiscordGuildMemberDTO | null>(null);
  readonly selectedMember = this._selectedMember.asReadonly();

  /**
   * État de chargement de la liste
   */
  private _isLoading = signal<boolean>(false);
  readonly isLoading = this._isLoading.asReadonly();

  /**
   * État de chargement des détails d'un membre
   */
  private _isLoadingMemberDetails = signal<boolean>(false);
  readonly isLoadingMemberDetails = this._isLoadingMemberDetails.asReadonly();

  /**
   * Erreur éventuelle
   */
  private _error = signal<string | null>(null);
  readonly error = this._error.asReadonly();

  /**
   * Terme de recherche actuel
   */
  private _searchQuery = signal<string>('');
  readonly searchQuery = this._searchQuery.asReadonly();

  // ============================================
  // CACHE PAR GUILD
  // ============================================

  /**
   * Cache des membres par guild
   * Map<guildId, membres[]>
   */
  private memberCache = new Map<string, DiscordGuildMemberDTO[]>();

  // ============================================
  // SIGNALS COMPUTED
  // ============================================

  /**
   * Nombre total de membres chargés
   */
  readonly totalMembers = computed(() => this._members().length);

  /**
   * Membres filtrés selon la recherche
   */
  readonly filteredMembers = computed(() => {
    const query = this._searchQuery().toLowerCase().trim();
    
    if (!query) {
      return this._members();
    }

    return this._members().filter(member => {
      const username = member.user?.username?.toLowerCase() || '';
      const globalName = member.user?.global_name?.toLowerCase() || '';
      const nick = member.nick?.toLowerCase() || '';
      
      return username.includes(query) || 
             globalName.includes(query) || 
             nick.includes(query);
    });
  });

  /**
   * Indique si un membre est sélectionné
   */
  readonly hasMemberSelected = computed(() => this._selectedMember() !== null);

  /**
   * Membres avec un rôle spécifique
   */
  membersWithRole(roleId: string) {
    return computed(() => 
      this._members().filter(member => member.roles.includes(roleId))
    );
  }

  /**
   * Membres en timeout
   */
  readonly timedOutMembers = computed(() => {
    return this._members().filter(member => {
      if (!member.communication_disabled_until) return false;
      return new Date(member.communication_disabled_until) > new Date();
    });
  });

  /**
   * Membres mutés
   */
  readonly mutedMembers = computed(() => {
    return this._members().filter(member => member.mute);
  });

  /**
   * Membres deafened
   */
  readonly deafenedMembers = computed(() => {
    return this._members().filter(member => member.deaf);
  });

  // ============================================
  // MÉTHODES PUBLIQUES - SETTERS
  // ============================================

  /**
   * Définit la liste des membres
   */
  setMembers(members: DiscordGuildMemberDTO[]): void {
    this._members.set(members);
  }

  /**
   * Ajoute des membres à la liste existante (pour pagination)
   */
  addMembers(members: DiscordGuildMemberDTO[]): void {
    this._members.update(current => [...current, ...members]);
  }

  /**
   * Définit un membre comme sélectionné
   */
  setSelectedMember(member: DiscordGuildMemberDTO | null): void {
    this._selectedMember.set(member);
  }

  /**
   * Met à jour un membre dans la liste
   */
  updateMember(updatedMember: DiscordGuildMemberDTO): void {
    this._members.update(members => 
      members.map(m => 
        m.user?.id === updatedMember.user?.id ? updatedMember : m
      )
    );

    // Si c'est le membre sélectionné, le mettre à jour aussi
    if (this._selectedMember()?.user?.id === updatedMember.user?.id) {
      this._selectedMember.set(updatedMember);
    }
  }

  /**
   * Retire un membre de la liste (après kick/ban)
   */
  removeMember(userId: string): void {
    this._members.update(members => 
      members.filter(m => m.user?.id !== userId)
    );

    // Si c'était le membre sélectionné, le désélectionner
    if (this._selectedMember()?.user?.id === userId) {
      this._selectedMember.set(null);
    }
  }

  /**
   * Définit l'état de chargement
   */
  setLoading(loading: boolean): void {
    this._isLoading.set(loading);
  }

  /**
   * Définit l'état de chargement des détails
   */
  setLoadingMemberDetails(loading: boolean): void {
    this._isLoadingMemberDetails.set(loading);
  }

  /**
   * Définit une erreur
   */
  setError(error: string | null): void {
    this._error.set(error);
  }

  /**
   * Définit le terme de recherche
   */
  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  // ============================================
  // GESTION DU CACHE
  // ============================================

  /**
   * Sauvegarde les membres dans le cache pour une guild
   */
  cacheMembers(guildId: string, members: DiscordGuildMemberDTO[]): void {
    this.memberCache.set(guildId, members);
  }

  /**
   * Récupère les membres depuis le cache
   */
  getCachedMembers(guildId: string): DiscordGuildMemberDTO[] | undefined {
    return this.memberCache.get(guildId);
  }

  /**
   * Vérifie si des membres sont en cache pour une guild
   */
  hasCachedMembers(guildId: string): boolean {
    return this.memberCache.has(guildId);
  }

  /**
   * Vide le cache pour une guild spécifique
   */
  clearCacheForGuild(guildId: string): void {
    this.memberCache.delete(guildId);
  }

  /**
   * Vide tout le cache
   */
  clearAllCache(): void {
    this.memberCache.clear();
  }

  // ============================================
  // RESET
  // ============================================

  /**
   * Réinitialise toutes les données
   */
  reset(): void {
    this._members.set([]);
    this._selectedMember.set(null);
    this._isLoading.set(false);
    this._isLoadingMemberDetails.set(false);
    this._error.set(null);
    this._searchQuery.set('');
  }

  /**
   * Réinitialise uniquement la sélection
   */
  resetSelection(): void {
    this._selectedMember.set(null);
    this._searchQuery.set('');
  }
}