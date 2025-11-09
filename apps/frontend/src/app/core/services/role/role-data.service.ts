import { Injectable, signal, computed } from '@angular/core';
import { GuildRoleDTO } from '@my-project/shared-types';

/**
 * Service de gestion de l'état des rôles
 * Gère le cache, les signals et les computed
 */
@Injectable({
  providedIn: 'root'
})
export class RoleDataService {
  // ============================================
  // SIGNALS D'ÉTAT
  // ============================================

  // Liste complète des rôles
  private readonly _roles = signal<GuildRoleDTO[]>([]);

  // Rôle sélectionné
  private readonly _selectedRole = signal<GuildRoleDTO | null>(null);

  // Recherche/filtrage
  private readonly _searchQuery = signal<string>('');

  // États de chargement
  private readonly _isLoading = signal<boolean>(false);
  private readonly _isLoadingRoleDetails = signal<boolean>(false);

  // Erreurs
  private readonly _error = signal<string | null>(null);

  // Cache timestamp
  private readonly _lastFetchTimestamp = signal<number>(0);

  // ============================================
  // SIGNALS PUBLICS (readonly)
  // ============================================

  readonly roles = this._roles.asReadonly();
  readonly selectedRole = this._selectedRole.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isLoadingRoleDetails = this._isLoadingRoleDetails.asReadonly();
  readonly error = this._error.asReadonly();

  // ============================================
  // COMPUTED SIGNALS
  // ============================================

  /**
   * Rôles filtrés selon la recherche
   */
  readonly filteredRoles = computed(() => {
    const query = this._searchQuery().toLowerCase().trim();
    const roles = this._roles();

    if (!query) {
      return roles;
    }

    return roles.filter(role => 
      role.name.toLowerCase().includes(query)
    );
  });

  /**
   * Nombre total de rôles
   */
  readonly totalRoles = computed(() => this._roles().length);

  /**
   * Nombre de rôles filtrés
   */
  readonly filteredCount = computed(() => this.filteredRoles().length);

  /**
   * Y a-t-il un rôle sélectionné ?
   */
  readonly hasRoleSelected = computed(() => this._selectedRole() !== null);

  /**
   * Rôle @everyone (ID = guildId)
   */
  readonly everyoneRole = computed(() => 
    this._roles().find(r => r.isEveryone)
  );

  /**
   * Rôles avec permission admin
   */
  readonly adminRoles = computed(() => 
    this._roles().filter(r => r.isAdmin && !r.isEveryone)
  );

  /**
   * Rôles managés (bots, boost, etc.)
   */
  readonly managedRoles = computed(() => 
    this._roles().filter(r => r.isManaged)
  );

  /**
   * Rôles hoisted (affichés séparément)
   */
  readonly hoistedRoles = computed(() => 
    this._roles().filter(r => r.isHoisted)
  );

  /**
   * Rôles assignables (non managés, non @everyone)
   */
  readonly assignableRoles = computed(() => 
    this._roles().filter(r => !r.isManaged && !r.isEveryone)
  );

  /**
   * Rôles triés par position (ordre hiérarchique)
   */
  readonly rolesSortedByPosition = computed(() => 
    [...this._roles()].sort((a, b) => b.position - a.position)
  );

  /**
   * Vérifier si le cache est valide (< 5 minutes)
   */
  readonly isCacheValid = computed(() => {
    const lastFetch = this._lastFetchTimestamp();
    if (lastFetch === 0) return false;
    
    const now = Date.now();
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    return (now - lastFetch) < CACHE_TTL;
  });

  // ============================================
  // MÉTHODES DE MISE À JOUR
  // ============================================

  /**
   * Définit la liste complète des rôles
   */
  setRoles(roles: GuildRoleDTO[]): void {
    this._roles.set(roles);
    this._lastFetchTimestamp.set(Date.now());
    this._error.set(null);
  }

  /**
   * Ajoute un rôle à la liste
   */
  addRole(role: GuildRoleDTO): void {
    this._roles.update(roles => [...roles, role]);
  }

  /**
   * Met à jour un rôle existant
   */
  updateRole(updatedRole: GuildRoleDTO): void {
    this._roles.update(roles => 
      roles.map(r => r.id === updatedRole.id ? updatedRole : r)
    );

    // Mettre à jour le rôle sélectionné si c'est le même
    if (this._selectedRole()?.id === updatedRole.id) {
      this._selectedRole.set(updatedRole);
    }
  }

  /**
   * Supprime un rôle de la liste
   */
  removeRole(roleId: string): void {
    this._roles.update(roles => roles.filter(r => r.id !== roleId));

    // Désélectionner si c'était le rôle sélectionné
    if (this._selectedRole()?.id === roleId) {
      this._selectedRole.set(null);
    }
  }

  /**
   * Sélectionne un rôle
   */
  selectRole(role: GuildRoleDTO | null): void {
    this._selectedRole.set(role);
  }

  /**
   * Désélectionne le rôle actuel
   */
  clearSelection(): void {
    this._selectedRole.set(null);
  }

  /**
   * Définit la recherche
   */
  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  /**
   * Vide la recherche
   */
  clearSearch(): void {
    this._searchQuery.set('');
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
  setLoadingRoleDetails(loading: boolean): void {
    this._isLoadingRoleDetails.set(loading);
  }

  /**
   * Définit une erreur
   */
  setError(error: string | null): void {
    this._error.set(error);
  }

  /**
   * Réinitialise complètement l'état
   */
  reset(): void {
    this._roles.set([]);
    this._selectedRole.set(null);
    this._searchQuery.set('');
    this._isLoading.set(false);
    this._isLoadingRoleDetails.set(false);
    this._error.set(null);
    this._lastFetchTimestamp.set(0);
  }

  /**
   * Invalide le cache
   */
  invalidateCache(): void {
    this._lastFetchTimestamp.set(0);
  }

  // ============================================
  // MÉTHODES UTILITAIRES
  // ============================================

  /**
   * Récupère un rôle par son ID
   */
  getRoleById(roleId: string): GuildRoleDTO | undefined {
    return this._roles().find(r => r.id === roleId);
  }

  /**
   * Vérifie si un rôle existe
   */
  hasRole(roleId: string): boolean {
    return this._roles().some(r => r.id === roleId);
  }
}