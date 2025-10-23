import { Injectable, inject, effect } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RoleApiService } from './role-api.service';
import { RoleDataService } from './role-data.service';
import { GuildFacadeService } from '../guild/guild-facade.service';
import { ErrorHandlerService } from '../error-handler.service';
import { 
  GuildRoleDTO,
  CreateRoleDTO,
  ModifyRoleDTO,
  ModifyRolePositionsDTO 
} from '@my-project/shared-types';

/**
 * Service Facade pour la gestion des rôles
 * Interface publique pour les composants
 * 
 * Responsabilités:
 * - Auto-loading au changement de serveur
 * - Orchestration entre API et Data services
 * - Gestion du cache
 * - Actions CRUD sur les rôles
 * - Méthodes utilitaires pour les components
 */
@Injectable({
  providedIn: 'root'
})
export class RoleFacadeService {
  private readonly roleApi = inject(RoleApiService);
  private readonly roleData = inject(RoleDataService);
  private readonly guildFacade = inject(GuildFacadeService);
  private readonly errorHandler = inject(ErrorHandlerService);

  // ============================================
  // EXPOSITION DES SIGNALS PUBLICS
  // ============================================

  // Liste et filtrage
  readonly roles = this.roleData.roles;
  readonly filteredRoles = this.roleData.filteredRoles;
  readonly totalRoles = this.roleData.totalRoles;
  readonly filteredCount = this.roleData.filteredCount;
  readonly searchQuery = this.roleData.searchQuery;

  // Sélection
  readonly selectedRole = this.roleData.selectedRole;
  readonly hasRoleSelected = this.roleData.hasRoleSelected;

  // États
  readonly isLoading = this.roleData.isLoading;
  readonly isLoadingRoleDetails = this.roleData.isLoadingRoleDetails;
  readonly error = this.roleData.error;

  // Computed - Catégories de rôles
  readonly everyoneRole = this.roleData.everyoneRole;
  readonly adminRoles = this.roleData.adminRoles;
  readonly managedRoles = this.roleData.managedRoles;
  readonly hoistedRoles = this.roleData.hoistedRoles;
  readonly assignableRoles = this.roleData.assignableRoles;
  readonly rolesSortedByPosition = this.roleData.rolesSortedByPosition;

  // ============================================
  // CONSTRUCTOR - AUTO-LOADING
  // ============================================

  constructor() {
    // Écouter les changements de serveur pour auto-loading
    effect(() => {
      const guildId = this.guildFacade.selectedGuildId();
      
      if (guildId) {
        console.log('[RoleFacade] Guild changed, loading roles:', guildId);
        void this.loadRoles(guildId);
      } else {
        console.log('[RoleFacade] No guild selected, resetting roles');
        this.roleData.reset();
      }
    });
  }

  // ============================================
  // CHARGEMENT DES RÔLES
  // ============================================

  /**
   * Charge tous les rôles d'une guild
   * Utilise le cache si valide (< 5 minutes)
   */
  async loadRoles(guildId: string, forceRefresh = false): Promise<void> {
    // Vérifier le cache
    if (!forceRefresh && this.roleData.isCacheValid()) {
      console.log('[RoleFacade] Using cached roles');
      return;
    }

    this.roleData.setLoading(true);
    this.roleData.setError(null);

    try {
      const roles = await firstValueFrom(
        this.roleApi.getRoles(guildId)
      );

      this.roleData.setRoles(roles);
      console.log(`[RoleFacade] Loaded ${roles.length} roles`);
    } catch (error) {
      const errorMessage = this.errorHandler.handleError(error, '');
      this.roleData.setError(errorMessage.message);
      console.error('[RoleFacade] Failed to load roles:', error);
    } finally {
      this.roleData.setLoading(false);
    }
  }

  /**
   * Recharge les rôles (force refresh)
   */
  async refreshRoles(): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) {
      console.warn('[RoleFacade] Cannot refresh: no guild selected');
      return;
    }

    await this.loadRoles(guildId, true);
  }

  // ============================================
  // ACTIONS CRUD
  // ============================================

  /**
   * Crée un nouveau rôle
   */
  async createRole(data?: CreateRoleDTO): Promise<GuildRoleDTO | null> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) {
      console.error('[RoleFacade] Cannot create role: no guild selected');
      return null;
    }

    try {
      const newRole = await firstValueFrom(
        this.roleApi.createRole(guildId, data)
      );

      this.roleData.addRole(newRole);
      console.log('[RoleFacade] Role created:', newRole.name);
      return newRole;
    } catch (error) {
      const errorMessage = this.errorHandler.handleError(error, '');
      this.roleData.setError(errorMessage.message);
      console.error('[RoleFacade] Failed to create role:', error);
      return null;
    }
  }

  /**
   * Modifie un rôle existant
   */
  async modifyRole(
    roleId: string, 
    data: ModifyRoleDTO
  ): Promise<GuildRoleDTO | null> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) {
      console.error('[RoleFacade] Cannot modify role: no guild selected');
      return null;
    }

    try {
      const updatedRole = await firstValueFrom(
        this.roleApi.modifyRole(guildId, roleId, data)
      );

      this.roleData.updateRole(updatedRole);
      console.log('[RoleFacade] Role modified:', updatedRole.name);
      return updatedRole;
    } catch (error) {
      const errorMessage = this.errorHandler.handleError(error, '');
      this.roleData.setError(errorMessage.message);
      console.error('[RoleFacade] Failed to modify role:', error);
      return null;
    }
  }

  /**
   * Modifie les positions de plusieurs rôles
   */
  async modifyRolePositions(
    positions: ModifyRolePositionsDTO[]
  ): Promise<boolean> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) {
      console.error('[RoleFacade] Cannot modify positions: no guild selected');
      return false;
    }

    try {
      const updatedRoles = await firstValueFrom(
        this.roleApi.modifyRolePositions(guildId, positions)
      );

      // Mettre à jour tous les rôles modifiés
      this.roleData.setRoles(updatedRoles);
      console.log('[RoleFacade] Role positions modified');
      return true;
    } catch (error) {
      const errorMessage = this.errorHandler.handleError(error, '');
      this.roleData.setError(errorMessage.message);
      console.error('[RoleFacade] Failed to modify positions:', error);
      return false;
    }
  }

  /**
   * Supprime un rôle
   */
  async deleteRole(roleId: string): Promise<boolean> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) {
      console.error('[RoleFacade] Cannot delete role: no guild selected');
      return false;
    }

    try {
      await firstValueFrom(
        this.roleApi.deleteRole(guildId, roleId)
      );

      this.roleData.removeRole(roleId);
      console.log('[RoleFacade] Role deleted');
      return true;
    } catch (error) {
      const errorMessage = this.errorHandler.handleError(error, '');
      this.roleData.setError(errorMessage.message);
      console.error('[RoleFacade] Failed to delete role:', error);
      return false;
    }
  }

  /**
   * Ajoute un rôle à un membre
   */
  async addRoleToMember(
    userId: string,
    roleId: string,
    reason?: string
  ): Promise<boolean> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) {
      console.error('[RoleFacade] Cannot add role: no guild selected');
      return false;
    }

    try {
      await firstValueFrom(
        this.roleApi.addRoleToMember(guildId, userId, roleId, reason)
      );

      console.log('[RoleFacade] Role added to member');
      return true;
    } catch (error) {
      const errorMessage = this.errorHandler.handleError(error, '');
      this.roleData.setError(errorMessage.message);
      console.error('[RoleFacade] Failed to add role to member:', error);
      return false;
    }
  }

  /**
   * Retire un rôle d'un membre
   */
  async removeRoleFromMember(
    userId: string,
    roleId: string,
    reason?: string
  ): Promise<boolean> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) {
      console.error('[RoleFacade] Cannot remove role: no guild selected');
      return false;
    }

    try {
      await firstValueFrom(
        this.roleApi.removeRoleFromMember(guildId, userId, roleId, reason)
      );

      console.log('[RoleFacade] Role removed from member');
      return true;
    } catch (error) {
      const errorMessage = this.errorHandler.handleError(error, '');
      this.roleData.setError(errorMessage.message);
      console.error('[RoleFacade] Failed to remove role from member:', error);
      return false;
    }
  }

  // ============================================
  // SÉLECTION & RECHERCHE
  // ============================================

  /**
   * Sélectionne un rôle
   */
  selectRole(role: GuildRoleDTO): void {
    this.roleData.selectRole(role);
  }

  /**
   * Désélectionne le rôle actuel
   */
  clearSelection(): void {
    this.roleData.clearSelection();
  }

  /**
   * Définit la recherche
   */
  setSearchQuery(query: string): void {
    this.roleData.setSearchQuery(query);
  }

  /**
   * Vide la recherche
   */
  clearSearch(): void {
    this.roleData.clearSearch();
  }

  // ============================================
  // MÉTHODES UTILITAIRES
  // ============================================

  /**
   * Récupère un rôle par son ID
   */
  getRoleById(roleId: string): GuildRoleDTO | undefined {
    return this.roleData.getRoleById(roleId);
  }

  /**
   * Vérifie si un rôle existe
   */
  hasRole(roleId: string): boolean {
    return this.roleData.hasRole(roleId);
  }

  /**
   * Réinitialise l'état
   */
  reset(): void {
    this.roleData.reset();
  }

  /**
   * Invalide le cache pour forcer un refresh au prochain chargement
   */
  invalidateCache(): void {
    this.roleData.invalidateCache();
  }
}