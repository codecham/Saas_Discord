// apps/sakai/src/app/services/member/member-facade.service.ts
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MemberApiService } from './member-api.service';
import { MemberDataService } from './member-data.service';
import { GuildFacadeService } from '../guild/guild-facade.service';
import { ErrorHandlerService } from '../error-handler.service';
import { 
  DiscordGuildMemberDTO, 
  ModifyGuildMemberDTO,
  CreateGuildBanDTO,
} from '@my-project/shared-types';

/**
 * Service Facade pour la gestion des membres
 * Interface publique pour les composants
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

  readonly members = this.memberData.members;
  readonly selectedMember = this.memberData.selectedMember;
  readonly isLoading = this.memberData.isLoading;
  readonly isLoadingMemberDetails = this.memberData.isLoadingMemberDetails;
  readonly error = this.memberData.error;
  readonly searchQuery = this.memberData.searchQuery;
  readonly totalMembers = this.memberData.totalMembers;
  readonly filteredMembers = this.memberData.filteredMembers;
  readonly hasMemberSelected = this.memberData.hasMemberSelected;
  readonly timedOutMembers = this.memberData.timedOutMembers;
  readonly mutedMembers = this.memberData.mutedMembers;
  readonly deafenedMembers = this.memberData.deafenedMembers;

  // ============================================
  // CHARGEMENT DES MEMBRES
  // ============================================

  // ============================================
  // MÉTHODES PUBLIQUES EXPOSÉES
  // ============================================

  /**
   * Charge la liste des membres de la guild actuellement sélectionnée
   * @param limit Nombre maximum de membres à charger
   * @param after ID du dernier membre (pour pagination)
   * @param useCache Utiliser le cache si disponible
   */
  async loadMembers(
    limit: number = 100, 
    after?: string,
    useCache: boolean = true
  ): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    
    if (!guildId) {
      console.warn('[MemberFacade] No guild selected');
      return;
    }

    // Vérifier le cache si demandé
    if (useCache && !after && this.memberData.hasCachedMembers(guildId)) {
      console.log('[MemberFacade] Loading members from cache');
      const cachedMembers = this.memberData.getCachedMembers(guildId);
      if (cachedMembers) {
        this.memberData.setMembers(cachedMembers);
        return;
      }
    }

    console.log('[MemberFacade] Loading members from API', { guildId, limit, after });
    this.memberData.setLoading(true);
    this.memberData.setError(null);

    try {
      const members = await firstValueFrom(
        this.memberApi.getMembers(guildId, limit, after)
      );

      // Si c'est la première page, remplacer les membres
      // Sinon, ajouter à la liste existante (pagination)
      if (after) {
        this.memberData.addMembers(members);
      } else {
        this.memberData.setMembers(members);
        this.memberData.cacheMembers(guildId, members);
      }

      console.log('[MemberFacade] Members loaded successfully', members.length);
      
    } catch (error) {
      const appError = this.errorHandler.handleError(
        error,
        'Chargement des membres'
      );
      this.memberData.setError(appError.message);
      throw error;
      
    } finally {
      this.memberData.setLoading(false);
    }
  }

  /**
   * Recherche des membres par nom/pseudo
   * @param query Terme de recherche
   * @param limit Nombre maximum de résultats
   */
  async searchMembers(query: string, limit: number = 100): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    
    if (!guildId) {
      console.warn('[MemberFacade] No guild selected');
      return;
    }

    if (!query.trim()) {
      // Si la recherche est vide, recharger tous les membres
      await this.loadMembers();
      this.memberData.setSearchQuery('');
      return;
    }

    console.log('[MemberFacade] Searching members', { query, limit });
    this.memberData.setLoading(true);
    this.memberData.setError(null);
    this.memberData.setSearchQuery(query);

    try {
      const members = await firstValueFrom(
        this.memberApi.searchMembers(guildId, query, limit)
      );

      this.memberData.setMembers(members);
      console.log('[MemberFacade] Search completed', members.length);
      
    } catch (error) {
      const appError = this.errorHandler.handleError(
        error,
        'Recherche de membres'
      );
      this.memberData.setError(appError.message);
      throw error;
      
    } finally {
      this.memberData.setLoading(false);
    }
  }

  /**
   * Charge les détails complets d'un membre
   * @param userId ID de l'utilisateur
   */
  async loadMemberDetails(userId: string): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    
    if (!guildId) {
      console.warn('[MemberFacade] No guild selected');
      return;
    }

    console.log('[MemberFacade] Loading member details', { userId });
    this.memberData.setLoadingMemberDetails(true);
    this.memberData.setError(null);

    try {
      const member = await firstValueFrom(
        this.memberApi.getMember(guildId, userId)
      );

      this.memberData.setSelectedMember(member);
      
      // Mettre à jour aussi dans la liste si présent
      this.memberData.updateMember(member);
      
      console.log('[MemberFacade] Member details loaded', member);
      
    } catch (error) {
      const appError = this.errorHandler.handleError(
        error,
        'Chargement du membre'
      );
      this.memberData.setError(appError.message);
      throw error;
      
    } finally {
      this.memberData.setLoadingMemberDetails(false);
    }
  }

  // ============================================
  // ACTIONS SUR LES MEMBRES
  // ============================================

  /**
   * Modifie les propriétés d'un membre
   * @param userId ID de l'utilisateur
   * @param data Données à modifier
   * @param reason Raison de la modification
   */
  async modifyMember(
    userId: string,
    data: ModifyGuildMemberDTO,
    reason?: string
  ): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    
    if (!guildId) {
      throw new Error('No guild selected');
    }

    console.log('[MemberFacade] Modifying member', { userId, data, reason });

    try {
      const updatedMember = await firstValueFrom(
        this.memberApi.modifyMember(guildId, userId, data, reason)
      );

      this.memberData.updateMember(updatedMember);
      
      this.errorHandler.showSuccess(
        'Membre modifié avec succès',
        'Succès'
      );
      
    } catch (error) {
      const appError = this.errorHandler.handleError(
        error,
        'Modification du membre'
      );
      throw error;
    }
  }

  /**
   * Ajoute un rôle à un membre
   * @param userId ID de l'utilisateur
   * @param roleId ID du rôle
   * @param reason Raison
   */
  async addRole(userId: string, roleId: string, reason?: string): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    
    if (!guildId) {
      throw new Error('No guild selected');
    }

    console.log('[MemberFacade] Adding role to member', { userId, roleId, reason });

    try {
      await firstValueFrom(
        this.memberApi.addMemberRole(guildId, userId, roleId, reason)
      );

      // Recharger les détails du membre pour avoir la liste à jour
      await this.loadMemberDetails(userId);
      
      this.errorHandler.showSuccess(
        'Rôle ajouté avec succès',
        'Succès'
      );
      
    } catch (error) {
      this.errorHandler.handleError(error, 'Ajout du rôle');
      throw error;
    }
  }

  /**
   * Retire un rôle d'un membre
   * @param userId ID de l'utilisateur
   * @param roleId ID du rôle
   * @param reason Raison
   */
  async removeRole(userId: string, roleId: string, reason?: string): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    
    if (!guildId) {
      throw new Error('No guild selected');
    }

    console.log('[MemberFacade] Removing role from member', { userId, roleId, reason });

    try {
      await firstValueFrom(
        this.memberApi.removeMemberRole(guildId, userId, roleId, reason)
      );

      // Recharger les détails du membre
      await this.loadMemberDetails(userId);
      
      this.errorHandler.showSuccess(
        'Rôle retiré avec succès',
        'Succès'
      );
      
    } catch (error) {
      this.errorHandler.handleError(error, 'Retrait du rôle');
      throw error;
    }
  }

  /**
   * Met un membre en timeout
   * @param userId ID de l'utilisateur
   * @param durationMinutes Durée en minutes (max: 40320 = 28 jours)
   * @param reason Raison
   */
  async timeoutMember(
    userId: string,
    durationMinutes: number,
    reason?: string
  ): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    
    if (!guildId) {
      throw new Error('No guild selected');
    }

    // Calculer la date de fin du timeout
    const until = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    console.log('[MemberFacade] Timing out member', { userId, durationMinutes, until, reason });

    try {
      const updatedMember = await firstValueFrom(
        this.memberApi.timeoutMember(guildId, userId, until, reason)
      );

      this.memberData.updateMember(updatedMember);
      
      this.errorHandler.showSuccess(
        `Membre mis en timeout pour ${durationMinutes} minutes`,
        'Succès'
      );
      
    } catch (error) {
      this.errorHandler.handleError(error, 'Timeout du membre');
      throw error;
    }
  }

  /**
   * Retire le timeout d'un membre
   * @param userId ID de l'utilisateur
   * @param reason Raison
   */
  async removeTimeout(userId: string, reason?: string): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    
    if (!guildId) {
      throw new Error('No guild selected');
    }

    console.log('[MemberFacade] Removing timeout from member', { userId, reason });

    try {
      const updatedMember = await firstValueFrom(
        this.memberApi.removeTimeout(guildId, userId, reason)
      );

      this.memberData.updateMember(updatedMember);
      
      this.errorHandler.showSuccess(
        'Timeout retiré avec succès',
        'Succès'
      );
      
    } catch (error) {
      this.errorHandler.handleError(error, 'Retrait du timeout');
      throw error;
    }
  }

  /**
   * Expulse un membre de la guild (kick)
   * @param userId ID de l'utilisateur
   * @param reason Raison
   */
  async kickMember(userId: string, reason?: string): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    
    if (!guildId) {
      throw new Error('No guild selected');
    }

    console.log('[MemberFacade] Kicking member', { userId, reason });

    try {
      await firstValueFrom(
        this.memberApi.kickMember(guildId, userId, reason)
      );

      // Retirer le membre de la liste
      this.memberData.removeMember(userId);
      
      this.errorHandler.showSuccess(
        'Membre expulsé avec succès',
        'Succès'
      );
      
    } catch (error) {
      this.errorHandler.handleError(error, 'Expulsion du membre');
      throw error;
    }
  }

  /**
   * Bannit un membre de la guild
   * @param userId ID de l'utilisateur
   * @param deleteMessageDays Nombre de jours de messages à supprimer (0-7)
   * @param reason Raison
   */
  async banMember(
    userId: string,
    deleteMessageDays: number = 0,
    reason?: string
  ): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    
    if (!guildId) {
      throw new Error('No guild selected');
    }

    console.log('[MemberFacade] Banning member', { userId, deleteMessageDays, reason });

    const banData: CreateGuildBanDTO = {};
    
    if (deleteMessageDays > 0) {
      // Convertir jours en secondes
      banData.delete_message_seconds = deleteMessageDays * 24 * 60 * 60;
    }

    try {
      await firstValueFrom(
        this.memberApi.banMember(guildId, userId, banData, reason)
      );

      // Retirer le membre de la liste
      this.memberData.removeMember(userId);
      
      this.errorHandler.showSuccess(
        'Membre banni avec succès',
        'Succès'
      );
      
    } catch (error) {
      this.errorHandler.handleError(error, 'Bannissement du membre');
      throw error;
    }
  }

  /**
   * Révoque le ban d'un utilisateur
   * @param userId ID de l'utilisateur
   * @param reason Raison
   */
  async unbanMember(userId: string, reason?: string): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    
    if (!guildId) {
      throw new Error('No guild selected');
    }

    console.log('[MemberFacade] Unbanning member', { userId, reason });

    try {
      await firstValueFrom(
        this.memberApi.unbanMember(guildId, userId, reason)
      );
      
      this.errorHandler.showSuccess(
        'Ban révoqué avec succès',
        'Succès'
      );
      
    } catch (error) {
      this.errorHandler.handleError(error, 'Révocation du ban');
      throw error;
    }
  }

  // ============================================
  // MÉTHODES UTILITAIRES
  // ============================================

  // ============================================
  // MÉTHODES UTILITAIRES PUBLIQUES
  // ============================================

  /**
   * Sélectionne un membre
   * @param member Membre à sélectionner
   */
  selectMember(member: DiscordGuildMemberDTO): void {
    this.memberData.setSelectedMember(member);
  }

  /**
   * Désélectionne le membre actuel
   */
  clearSelectedMember(): void {
    this.memberData.setSelectedMember(null);
  }

  /**
   * Définit le terme de recherche
   * @param query Terme de recherche
   */
  setSearchQuery(query: string): void {
    this.memberData.setSearchQuery(query);
  }

  /**
   * Rafraîchit la liste des membres
   */
  async refreshMembers(): Promise<void> {
    console.log('[MemberFacade] Refreshing members');
    await this.loadMembers(100, undefined, false);
  }

  /**
   * Vide le cache de la guild actuelle
   */
  clearCache(): void {
    const guildId = this.guildFacade.selectedGuildId();
    if (guildId) {
      this.memberData.clearCacheForGuild(guildId);
    }
  }

  /**
   * Réinitialise toutes les données
   */
  reset(): void {
    this.memberData.reset();
  }

  /**
   * Réinitialise uniquement la sélection
   */
  resetSelection(): void {
    this.memberData.resetSelection();
  }

  getMemberById(id: string): DiscordGuildMemberDTO | undefined {
    return this.members().find(member => member.user?.id == id);
  }
}