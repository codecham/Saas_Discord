import { Injectable, inject, effect } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MemberApiService } from './member-api.service';
import { MemberDataService } from './member-data.service';
import { GuildFacadeService } from '../guild/guild-facade.service';
import { ErrorHandlerService } from '../error-handler.service';
import { 
  GuildMemberDTO,
  ModifyGuildMemberDTO,
  CreateGuildBanDTO 
} from '@my-project/shared-types';

/**
 * Service Facade pour la gestion des membres
 * Interface publique pour les composants
 * 
 * Responsabilités:
 * - Auto-loading au changement de serveur
 * - Orchestration entre API et Data services
 * - Gestion du cache
 * - Lazy loading des membres restants
 * - Méthodes utilitaires pour les components
 * 
 * Architecture:
 * - Écoute selectedGuildId$ du GuildFacade
 * - Charge automatiquement les membres
 * - Utilise le cache quand possible
 * - Expose des signals readonly aux components
 */
@Injectable({
  providedIn: 'root'
})
export class MemberFacadeService {
  private readonly memberApi = inject(MemberApiService);
  private readonly memberData = inject(MemberDataService);
  private readonly guildFacade = inject(GuildFacadeService);
  private readonly errorHandler = inject(ErrorHandlerService);

  // ============================================
  // EXPOSITION DES SIGNALS PUBLICS
  // ============================================

  // Liste et filtrage
  readonly members = this.memberData.members;
  readonly filteredMembers = this.memberData.filteredMembers;
  readonly loadedCount = this.memberData.loadedCount;
  readonly totalMembers = this.memberData.totalMembers;
  readonly searchQuery = this.memberData.searchQuery;

  // Sélection
  readonly selectedMember = this.memberData.selectedMember;
  readonly hasMemberSelected = this.memberData.hasMemberSelected;

  // Pagination
  readonly hasMore = this.memberData.hasMore;
  readonly nextCursor = this.memberData.nextCursor;

  // États
  readonly isLoading = this.memberData.isLoading;
  readonly isLoadingMore = this.memberData.isLoadingMore;
  readonly isLoadingMemberDetails = this.memberData.isLoadingMemberDetails;
  readonly error = this.memberData.error;

  // Computed - Catégories de membres
  readonly admins = this.memberData.admins;
  readonly moderators = this.memberData.moderators;
  readonly owner = this.memberData.owner;
  readonly timedOutMembers = this.memberData.timedOutMembers;
  readonly mutedMembers = this.memberData.mutedMembers;
  readonly deafenedMembers = this.memberData.deafenedMembers;
  readonly bots = this.memberData.bots;
  readonly humans = this.memberData.humans;
  readonly pendingMembers = this.memberData.pendingMembers;

  // ============================================
  // CONSTRUCTOR - AUTO-LOADING
  // ============================================

  constructor() {
    // Écouter les changements de serveur pour auto-loading
    effect(() => {
      const guildId = this.guildFacade.selectedGuildId();
      
      if (guildId) {
        // Essayer de charger depuis le cache
        const fromCache = this.memberData.loadFromCache(guildId);
        
        if (fromCache) {
          console.log('[MemberFacade] Membres chargés depuis le cache');
        } else {
          // Pas en cache, charger depuis l'API
          console.log('[MemberFacade] Chargement des membres depuis l\'API');
          this.loadAllMembers(guildId).catch(err => {
            console.error('[MemberFacade] Erreur auto-loading:', err);
          });
        }
      } else {
        // Pas de serveur sélectionné, clear
        this.memberData.clearAll();
      }
    });
  }

  // ============================================
  // CHARGEMENT DES MEMBRES
  // ============================================

  /**
   * Charge tous les membres d'une guild
   * Appelé automatiquement au changement de serveur (si pas en cache)
   * Peut aussi être appelé manuellement pour forcer le refresh
   * 
   * @param guildId - ID de la guild (optionnel, utilise selectedGuildId si absent)
   * @param forceRefresh - Forcer le rechargement même si en cache
   */
  async loadAllMembers(guildId?: string, forceRefresh: boolean = false): Promise<void> {
    const targetGuildId = guildId || this.guildFacade.selectedGuildId();
    
    if (!targetGuildId) {
      throw new Error('Aucune guild sélectionnée');
    }

    // Si pas de force refresh, vérifier le cache
    if (!forceRefresh) {
      const fromCache = this.memberData.loadFromCache(targetGuildId);
      if (fromCache) {
        console.log('[MemberFacade] Utilisé le cache');
        return;
      }
    }

    try {
      this.memberData.setLoading(true);
      this.memberData.setError(null);

      console.log(`[MemberFacade] Chargement des membres pour guild ${targetGuildId}`);

      // Charger la première page (1000 membres max par défaut)
      const response = await firstValueFrom(
        this.memberApi.getMembers(targetGuildId, 1000)
      );

      console.log(`[MemberFacade] Response from backend: ${JSON.stringify(response)}`);
      console.log(`[MemberFacade] ${response.loadedCount} membres chargés`);

      this.memberData.setMembersFromResponse(response, targetGuildId);

      // Si plus de membres disponibles, charger en arrière-plan
      if (response.hasMore && response.nextCursor) {
        console.log('[MemberFacade] Plus de membres disponibles, lazy loading...');
        this.loadRemainingMembersInBackground(targetGuildId, response.nextCursor);
      }

    } catch (error) {
      const message = this.errorHandler.handleError(error, 'Chargement des membres');
      this.memberData.setError(message.message);
      throw error;
    } finally {
      this.memberData.setLoading(false);
    }
  }

  /**
   * Charge les membres restants en arrière-plan (lazy loading)
   * Ne bloque pas l'UI
   * 
   * @param guildId - ID de la guild
   * @param cursor - Cursor pour pagination
   */
  private async loadRemainingMembersInBackground(guildId: string, cursor?: string): Promise<void> {
    if (!cursor) return;

    try {
      this.memberData.setLoadingMore(true);

      const response = await firstValueFrom(
        this.memberApi.getMembers(guildId, 1000, cursor)
      );

      console.log(`[MemberFacade] ${response.loadedCount} membres supplémentaires chargés`);

      this.memberData.addMembers(response.members);
      this.memberData.setHasMore(response.hasMore);
      this.memberData.setNextCursor(response.nextCursor);

      // Récursif si encore plus de membres
      if (response.hasMore && response.nextCursor) {
        await this.loadRemainingMembersInBackground(guildId, response.nextCursor);
      } else {
        console.log('[MemberFacade] Tous les membres chargés');
      }

    } catch (error) {
      console.error('[MemberFacade] Erreur lazy loading:', error);
      // Ne pas throw, c'est en background
    } finally {
      this.memberData.setLoadingMore(false);
    }
  }

  /**
   * Charge plus de membres manuellement (pagination infinie UI)
   * Pour scroll infini ou bouton "Charger plus"
   */
  async loadMoreMembers(): Promise<void> {
    const cursor = this.memberData.nextCursor();
    const guildId = this.guildFacade.selectedGuildId();
    
    if (!cursor || !guildId || !this.memberData.hasMore()) {
      console.log('[MemberFacade] Pas de membres supplémentaires à charger');
      return;
    }

    try {
      this.memberData.setLoadingMore(true);
      
      const response = await firstValueFrom(
        this.memberApi.getMembers(guildId, 100, cursor)
      );
      
      this.memberData.addMembers(response.members);
      this.memberData.setHasMore(response.hasMore);
      this.memberData.setNextCursor(response.nextCursor);
      
    } catch (error) {
      const message = this.errorHandler.handleError(error, 'Chargement des membres');
      this.memberData.setError(message.message);
      throw error;
    } finally {
      this.memberData.setLoadingMore(false);
    }
  }

  /**
   * Rafraîchit les données (force reload)
   */
  async refresh(): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    if (guildId) {
      // Invalider le cache
      this.memberData.invalidateCache(guildId);
      // Recharger
      await this.loadAllMembers(guildId, true);
    }
  }

  // ============================================
  // SÉLECTION ET NAVIGATION
  // ============================================

  /**
   * Sélectionne un membre pour affichage détail
   * Charge les détails si pas déjà en cache
   * 
   * @param userId - ID de l'utilisateur
   */
  async selectMember(userId: string): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) return;

    // Vérifier si déjà en cache
    let member = this.memberData.getMemberById(userId);

    if (!member) {
      // Charger depuis l'API
      try {
        this.memberData.setLoadingMemberDetails(true);
        
        member = await firstValueFrom(
          this.memberApi.getMember(guildId, userId)
        );
        
        this.memberData.updateMember(member);
        
      } catch (error) {
        this.errorHandler.handleError(error, 'Chargement du membre');
        throw error;
      } finally {
        this.memberData.setLoadingMemberDetails(false);
      }
    }

    this.memberData.selectMember(userId);
  }

  /**
   * Désélectionne le membre actuel
   */
  deselectMember(): void {
    this.memberData.deselectMember();
  }

  // ============================================
  // RECHERCHE
  // ============================================

  /**
   * Définit la query de recherche locale (filtre les membres chargés)
   */
  setSearchQuery(query: string): void {
    this.memberData.setSearchQuery(query);
  }

  /**
   * Clear la recherche
   */
  clearSearch(): void {
    this.memberData.clearSearch();
  }

  /**
   * Recherche des membres via l'API Discord (recherche serveur)
   * Utile pour les très gros serveurs où tous les membres ne sont pas chargés
   * 
   * @param query - Terme de recherche
   * @param limit - Nombre de résultats max
   */
  async searchMembersOnServer(query: string, limit: number = 100): Promise<GuildMemberDTO[]> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) {
      throw new Error('Aucune guild sélectionnée');
    }

    try {
      const results = await firstValueFrom(
        this.memberApi.searchMembers(guildId, query, limit)
      );

      // Ajouter les résultats au cache local
      this.memberData.addMembers(results);

      return results;

    } catch (error) {
      this.errorHandler.handleError(error, 'Recherche de membres');
      throw error;
    }
  }

  // ============================================
  // MÉTHODES UTILITAIRES
  // ============================================

  /**
   * Récupère un membre par ID (O(1))
   */
  getMemberById(userId: string): GuildMemberDTO | undefined {
    return this.memberData.getMemberById(userId);
  }

  /**
   * Récupère plusieurs membres par IDs
   */
  getMembersByIds(userIds: string[]): GuildMemberDTO[] {
    return this.memberData.getMembersByIds(userIds);
  }

  /**
   * Obtient les membres avec un rôle spécifique
   */
  getMembersWithRole(roleId: string): GuildMemberDTO[] {
    return this.memberData.getMembersWithRole(roleId);
  }

  /**
   * Compte le nombre de membres avec un rôle
   */
  countMembersWithRole(roleId: string): number {
    return this.memberData.countMembersWithRole(roleId);
  }

  // ============================================
  // ACTIONS DE MODÉRATION
  // ============================================

  /**
   * Kick un membre du serveur
   */
  async kickMember(userId: string, reason?: string): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) return;

    try {
      await firstValueFrom(
        this.memberApi.kickMember(guildId, userId, reason)
      );

      // Supprimer du cache local
      this.memberData.removeMember(userId);

      console.log(`[MemberFacade] Membre ${userId} kicked`);

    } catch (error) {
      this.errorHandler.handleError(error, 'Kick du membre');
      throw error;
    }
  }

  /**
   * Ban un membre du serveur
   */
  async banMember(userId: string, data: CreateGuildBanDTO = {}, reason?: string): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) return;

    try {
      await firstValueFrom(
        this.memberApi.banMember(guildId, userId, data, reason)
      );

      // Supprimer du cache local
      this.memberData.removeMember(userId);

      console.log(`[MemberFacade] Membre ${userId} banned`);

    } catch (error) {
      this.errorHandler.handleError(error, 'Ban du membre');
      throw error;
    }
  }

  /**
   * Timeout un membre
   */
  async timeoutMember(userId: string, until: string, reason?: string): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) return;

    try {
      const updatedMember = await firstValueFrom(
        this.memberApi.timeoutMember(guildId, userId, until, reason)
      );

      // Mettre à jour dans le cache
      this.memberData.updateMember(updatedMember);

      console.log(`[MemberFacade] Membre ${userId} timeout jusqu'à ${until}`);

    } catch (error) {
      this.errorHandler.handleError(error, 'Timeout du membre');
      throw error;
    }
  }

  /**
   * Retire le timeout d'un membre
   */
  async removeTimeout(userId: string, reason?: string): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) return;

    try {
      const updatedMember = await firstValueFrom(
        this.memberApi.removeTimeout(guildId, userId, reason)
      );

      // Mettre à jour dans le cache
      this.memberData.updateMember(updatedMember);

      console.log(`[MemberFacade] Timeout retiré pour membre ${userId}`);

    } catch (error) {
      this.errorHandler.handleError(error, 'Retrait du timeout');
      throw error;
    }
  }

  /**
   * Change le pseudo d'un membre
   */
  async changeNickname(userId: string, nickname: string | null, reason?: string): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) return;

    try {
      const updatedMember = await firstValueFrom(
        this.memberApi.changeNickname(guildId, userId, nickname, reason)
      );

      // Mettre à jour dans le cache
      this.memberData.updateMember(updatedMember);

      console.log(`[MemberFacade] Pseudo de ${userId} changé en "${nickname}"`);

    } catch (error) {
      this.errorHandler.handleError(error, 'Changement de pseudo');
      throw error;
    }
  }

  /**
   * Définit les rôles d'un membre
   */
  async setMemberRoles(userId: string, roleIds: string[], reason?: string): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) return;

    try {
      const updatedMember = await firstValueFrom(
        this.memberApi.setMemberRoles(guildId, userId, roleIds, reason)
      );

      // Mettre à jour dans le cache
      this.memberData.updateMember(updatedMember);

      console.log(`[MemberFacade] Rôles de ${userId} mis à jour`);

    } catch (error) {
      this.errorHandler.handleError(error, 'Modification des rôles');
      throw error;
    }
  }

  /**
   * Mute un membre en vocal
   */
  async muteMember(userId: string, reason?: string): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) return;

    try {
      const updatedMember = await firstValueFrom(
        this.memberApi.muteMember(guildId, userId, reason)
      );

      this.memberData.updateMember(updatedMember);

    } catch (error) {
      this.errorHandler.handleError(error, 'Mute du membre');
      throw error;
    }
  }

  /**
   * Unmute un membre en vocal
   */
  async unmuteMember(userId: string, reason?: string): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) return;

    try {
      const updatedMember = await firstValueFrom(
        this.memberApi.unmuteMember(guildId, userId, reason)
      );

      this.memberData.updateMember(updatedMember);

    } catch (error) {
      this.errorHandler.handleError(error, 'Unmute du membre');
      throw error;
    }
  }

  /**
   * Déplace un membre vers un channel vocal
   */
  async moveMember(userId: string, channelId: string, reason?: string): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) return;

    try {
      const updatedMember = await firstValueFrom(
        this.memberApi.moveMember(guildId, userId, channelId, reason)
      );

      this.memberData.updateMember(updatedMember);

    } catch (error) {
      this.errorHandler.handleError(error, 'Déplacement du membre');
      throw error;
    }
  }

  /**
   * Déconnecte un membre du vocal
   */
  async disconnectMember(userId: string, reason?: string): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) return;

    try {
      const updatedMember = await firstValueFrom(
        this.memberApi.disconnectMember(guildId, userId, reason)
      );

      this.memberData.updateMember(updatedMember);

    } catch (error) {
      this.errorHandler.handleError(error, 'Déconnexion du membre');
      throw error;
    }
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  /**
   * Invalide le cache de la guild actuelle
   */
  invalidateCache(): void {
    const guildId = this.guildFacade.selectedGuildId();
    if (guildId) {
      this.memberData.invalidateCache(guildId);
    }
  }

  /**
   * Invalide tout le cache
   */
  invalidateAllCache(): void {
    this.memberData.invalidateAllCache();
  }
}