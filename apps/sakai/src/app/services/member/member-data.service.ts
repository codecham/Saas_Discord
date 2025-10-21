// apps/sakai/src/app/services/member/member-data.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { GuildMemberDTO, MemberListResponseDTO } from '@my-project/shared-types';

/**
 * Service de gestion de l'état des membres
 * Utilise des signals Angular + Map pour performance O(1)
 * 
 * Architecture:
 * - Map<userId, GuildMemberDTO> pour accès rapide
 * - Computed signals pour données dérivées (admins, moderators, etc.)
 * - Cache par guild pour éviter les rechargements
 */
@Injectable({
  providedIn: 'root'
})
export class MemberDataService {
  
  // ============================================
  // SIGNALS PRIVÉS - État interne
  // ============================================

  /**
   * Map des membres par ID (accès O(1))
   * Utilisé en interne pour la performance
   */
  private readonly _membersMap = signal<Map<string, GuildMemberDTO>>(new Map());

  /**
   * ID du membre actuellement sélectionné
   */
  private readonly _selectedMemberId = signal<string | null>(null);

  /**
   * Métadonnées de pagination depuis le backend
   */
  private readonly _totalMembers = signal<number>(0);
  private readonly _hasMore = signal<boolean>(false);
  private readonly _nextCursor = signal<string | undefined>(undefined);

  /**
   * États de chargement
   */
  private readonly _isLoading = signal<boolean>(false);
  private readonly _isLoadingMore = signal<boolean>(false);
  private readonly _isLoadingMemberDetails = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  /**
   * Recherche locale
   */
  private readonly _searchQuery = signal<string>('');

  // ============================================
  // CACHE PAR GUILD
  // ============================================

  /**
   * Guild actuellement chargée
   */
  private currentGuildId: string | null = null;

  /**
   * Cache des membres par guild
   * Map<guildId, Map<userId, GuildMemberDTO>>
   */
  private readonly memberCache = new Map<string, Map<string, GuildMemberDTO>>();

  /**
   * Timestamps du cache pour invalidation
   * Map<guildId, timestamp>
   */
  private readonly cacheTimestamps = new Map<string, number>();

  /**
   * TTL du cache en millisecondes (5 minutes)
   */
  private readonly CACHE_TTL = 5 * 60 * 1000;

  // ============================================
  // SIGNALS PUBLICS (READONLY)
  // ============================================

  /**
   * Array de tous les membres (pour affichage liste)
   */
  readonly members = computed(() => 
    Array.from(this._membersMap().values())
  );

  /**
   * Membre actuellement sélectionné
   */
  readonly selectedMember = computed(() => {
    const id = this._selectedMemberId();
    return id ? this._membersMap().get(id) || null : null;
  });

  /**
   * Métadonnées de pagination
   */
  readonly totalMembers = this._totalMembers.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly nextCursor = this._nextCursor.asReadonly();

  /**
   * États de chargement
   */
  readonly isLoading = this._isLoading.asReadonly();
  readonly isLoadingMore = this._isLoadingMore.asReadonly();
  readonly isLoadingMemberDetails = this._isLoadingMemberDetails.asReadonly();
  readonly error = this._error.asReadonly();

  /**
   * Recherche
   */
  readonly searchQuery = this._searchQuery.asReadonly();

  // ============================================
  // COMPUTED SIGNALS - Données dérivées
  // ============================================

  /**
   * Nombre de membres chargés localement
   */
  readonly loadedCount = computed(() => this._membersMap().size);

  /**
   * Indique si un membre est sélectionné
   */
  readonly hasMemberSelected = computed(() => this._selectedMemberId() !== null);

  /**
   * Membres filtrés selon la recherche locale
   */
  readonly filteredMembers = computed(() => {
    const query = this._searchQuery().toLowerCase().trim();
    
    if (!query) {
      return this.members();
    }

    return this.members().filter(member => {
      // Recherche dans displayName et username
      return member.displayName.toLowerCase().includes(query) ||
             member.username.toLowerCase().includes(query);
    });
  });

  /**
   * Membres avec statut admin
   */
  readonly admins = computed(() => 
    this.members().filter(m => m.isAdmin)
  );

  /**
   * Membres avec statut modérateur
   */
  readonly moderators = computed(() => 
    this.members().filter(m => m.isModerator)
  );

  /**
   * Propriétaire du serveur
   */
  readonly owner = computed(() => 
    this.members().find(m => m.isOwner) || null
  );

  /**
   * Membres en timeout
   */
  readonly timedOutMembers = computed(() => 
    this.members().filter(m => m.isTimedOut)
  );

  /**
   * Membres muted (vocal)
   */
  readonly mutedMembers = computed(() => 
    this.members().filter(m => m.isMuted)
  );

  /**
   * Membres deafened (vocal)
   */
  readonly deafenedMembers = computed(() => 
    this.members().filter(m => m.isDeafened)
  );

  /**
   * Bots
   */
  readonly bots = computed(() => 
    this.members().filter(m => m.isBot)
  );

  /**
   * Membres humains (pas bots)
   */
  readonly humans = computed(() => 
    this.members().filter(m => !m.isBot)
  );

  /**
   * Membres en attente (pending screening)
   */
  readonly pendingMembers = computed(() => 
    this.members().filter(m => m.isPending)
  );

  // ============================================
  // MÉTHODES PUBLIQUES - Setters
  // ============================================

  /**
   * Définir la liste complète des membres depuis une response backend
   */
  setMembersFromResponse(response: MemberListResponseDTO, guildId: string): void {
    const map = new Map<string, GuildMemberDTO>();
    
    response.members.forEach(member => {
      map.set(member.id, member);
    });
    
    this._membersMap.set(map);
    this._totalMembers.set(response.total);
    this._hasMore.set(response.hasMore);
    this._nextCursor.set(response.nextCursor);
    
    // Mettre en cache
    this.memberCache.set(guildId, map);
    this.cacheTimestamps.set(guildId, Date.now());
    this.currentGuildId = guildId;
  }

  /**
   * Ajouter des membres (pour lazy loading / pagination)
   */
  addMembers(members: GuildMemberDTO[]): void {
    const map = new Map(this._membersMap());
    
    members.forEach(member => {
      map.set(member.id, member);
    });
    
    this._membersMap.set(map);
    
    // Mettre à jour le cache
    if (this.currentGuildId) {
      this.memberCache.set(this.currentGuildId, map);
    }
  }

  /**
   * Mettre à jour un membre spécifique
   */
  updateMember(member: GuildMemberDTO): void {
    const map = new Map(this._membersMap());
    map.set(member.id, member);
    this._membersMap.set(map);
    
    // Mettre à jour le cache
    if (this.currentGuildId) {
      this.memberCache.set(this.currentGuildId, map);
    }
  }

  /**
   * Supprimer un membre (après kick/ban)
   */
  removeMember(userId: string): void {
    const map = new Map(this._membersMap());
    map.delete(userId);
    this._membersMap.set(map);
    
    // Mettre à jour le cache
    if (this.currentGuildId) {
      this.memberCache.set(this.currentGuildId, map);
    }
    
    // Désélectionner si c'était le membre sélectionné
    if (this._selectedMemberId() === userId) {
      this._selectedMemberId.set(null);
    }
  }

  // ============================================
  // MÉTHODES PUBLIQUES - Getters
  // ============================================

  /**
   * Récupérer un membre par ID (O(1))
   */
  getMemberById(userId: string): GuildMemberDTO | undefined {
    return this._membersMap().get(userId);
  }

  /**
   * Récupérer plusieurs membres par IDs
   */
  getMembersByIds(userIds: string[]): GuildMemberDTO[] {
    return userIds
      .map(id => this._membersMap().get(id))
      .filter((member): member is GuildMemberDTO => member !== undefined);
  }

  /**
   * Récupérer les membres avec un rôle spécifique
   */
  getMembersWithRole(roleId: string): GuildMemberDTO[] {
    return this.members().filter(m => m.roles.includes(roleId));
  }

  /**
   * Compte le nombre de membres avec un rôle
   */
  countMembersWithRole(roleId: string): number {
    return this.getMembersWithRole(roleId).length;
  }

  // ============================================
  // MÉTHODES PUBLIQUES - Navigation
  // ============================================

  /**
   * Sélectionner un membre pour affichage détail
   */
  selectMember(userId: string | null): void {
    this._selectedMemberId.set(userId);
  }

  /**
   * Désélectionner le membre actuel
   */
  deselectMember(): void {
    this._selectedMemberId.set(null);
  }

  // ============================================
  // MÉTHODES PUBLIQUES - Recherche
  // ============================================

  /**
   * Définir la query de recherche
   */
  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  /**
   * Clear la recherche
   */
  clearSearch(): void {
    this._searchQuery.set('');
  }

  // ============================================
  // MÉTHODES PUBLIQUES - Cache
  // ============================================

  /**
   * Charger depuis le cache (si disponible et valide)
   * Retourne true si chargé depuis cache, false sinon
   */
  loadFromCache(guildId: string): boolean {
    // Vérifier si cache existe
    const cached = this.memberCache.get(guildId);
    if (!cached) {
      return false;
    }

    // Vérifier si cache est expiré
    const timestamp = this.cacheTimestamps.get(guildId);
    if (timestamp && Date.now() - timestamp > this.CACHE_TTL) {
      // Cache expiré, le supprimer
      this.memberCache.delete(guildId);
      this.cacheTimestamps.delete(guildId);
      return false;
    }

    // Cache valide, charger
    this._membersMap.set(cached);
    this.currentGuildId = guildId;
    return true;
  }

  /**
   * Invalider le cache d'une guild
   */
  invalidateCache(guildId: string): void {
    this.memberCache.delete(guildId);
    this.cacheTimestamps.delete(guildId);
  }

  /**
   * Invalider tout le cache
   */
  invalidateAllCache(): void {
    this.memberCache.clear();
    this.cacheTimestamps.clear();
  }

  // ============================================
  // MÉTHODES PUBLIQUES - États
  // ============================================

  setLoading(loading: boolean): void {
    this._isLoading.set(loading);
  }

  setLoadingMore(loading: boolean): void {
    this._isLoadingMore.set(loading);
  }

  setLoadingMemberDetails(loading: boolean): void {
    this._isLoadingMemberDetails.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  setTotalMembers(total: number): void {
    this._totalMembers.set(total);
  }

  setHasMore(hasMore: boolean): void {
    this._hasMore.set(hasMore);
  }

  setNextCursor(cursor: string | undefined): void {
    this._nextCursor.set(cursor);
  }

  // ============================================
  // MÉTHODES PUBLIQUES - Reset
  // ============================================

  /**
   * Clear tout l'état (changement de serveur)
   */
  clearAll(): void {
    this._membersMap.set(new Map());
    this._selectedMemberId.set(null);
    this._totalMembers.set(0);
    this._hasMore.set(false);
    this._nextCursor.set(undefined);
    this._isLoading.set(false);
    this._isLoadingMore.set(false);
    this._isLoadingMemberDetails.set(false);
    this._error.set(null);
    this._searchQuery.set('');
    this.currentGuildId = null;
  }

  /**
   * Reset uniquement les états de chargement et erreurs
   */
  resetStates(): void {
    this._isLoading.set(false);
    this._isLoadingMore.set(false);
    this._isLoadingMemberDetails.set(false);
    this._error.set(null);
  }
}