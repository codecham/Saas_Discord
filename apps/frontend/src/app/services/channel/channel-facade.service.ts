import { Injectable, inject, effect } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ChannelApiService } from './channel-api.service';
import { ChannelDataService } from './channel-data.service';
import { GuildFacadeService } from '../guild/guild-facade.service';
import { ErrorHandlerService } from '../error-handler.service';
import { 
  GuildChannelDTO,
  CreateChannelDTO,
  ModifyChannelDTO,
  EditChannelPermissionsDTO,
  DiscordChannelType
} from '@my-project/shared-types';

/**
 * Service Facade pour la gestion des channels
 * Interface publique pour les composants
 * 
 * Responsabilités:
 * - Auto-loading au changement de serveur
 * - Orchestration entre API et Data services
 * - Gestion du cache
 * - Actions CRUD sur les channels
 * - Méthodes utilitaires pour les components
 */
@Injectable({
  providedIn: 'root'
})
export class ChannelFacadeService {
  private readonly channelApi = inject(ChannelApiService);
  private readonly channelData = inject(ChannelDataService);
  private readonly guildFacade = inject(GuildFacadeService);
  private readonly errorHandler = inject(ErrorHandlerService);

  // ============================================
  // EXPOSITION DES SIGNALS PUBLICS
  // ============================================

  // Liste et filtrage
  readonly channels = this.channelData.channels;
  readonly filteredChannels = this.channelData.filteredChannels;
  readonly totalChannels = this.channelData.totalChannels;
  readonly filteredCount = this.channelData.filteredCount;
  readonly searchQuery = this.channelData.searchQuery;
  readonly selectedType = this.channelData.selectedType;
  readonly selectedCategory = this.channelData.selectedCategory;

  // Sélection
  readonly selectedChannel = this.channelData.selectedChannel;
  readonly hasChannelSelected = this.channelData.hasChannelSelected;

  // États
  readonly isLoading = this.channelData.isLoading;
  readonly isLoadingChannelDetails = this.channelData.isLoadingChannelDetails;
  readonly error = this.channelData.error;

  // Computed - Catégories de channels
  readonly categories = this.channelData.categories;
  readonly textChannels = this.channelData.textChannels;
  readonly voiceChannels = this.channelData.voiceChannels;
  readonly threads = this.channelData.threads;
  readonly forumChannels = this.channelData.forumChannels;
  readonly announcementChannels = this.channelData.announcementChannels;
  readonly stageChannels = this.channelData.stageChannels;

  // Channels groupés et triés
  readonly channelsSortedByPosition = this.channelData.channelsSortedByPosition;
  readonly channelsGroupedByCategory = this.channelData.channelsGroupedByCategory;

  // Statistiques
  readonly stats = this.channelData.stats;

  // ============================================
  // CONSTRUCTOR - AUTO-LOADING
  // ============================================

  constructor() {
    // Écouter les changements de serveur pour auto-loading
    effect(() => {
      const guildId = this.guildFacade.selectedGuildId();
      
      if (guildId) {
        console.log('[ChannelFacade] Guild changed, loading channels:', guildId);
        void this.loadChannels(guildId);
      } else {
        console.log('[ChannelFacade] No guild selected, resetting channels');
        this.channelData.reset();
      }
    });
  }

  // ============================================
  // CHARGEMENT DES CHANNELS
  // ============================================

  /**
   * Charge tous les channels d'une guild
   * Appelé automatiquement au changement de serveur
   */
  async loadChannels(guildId: string): Promise<void> {
    try {
      this.channelData.setLoading(true);
      this.channelData.clearError();

      const channels = await firstValueFrom(
        this.channelApi.getChannels(guildId)
      );

      this.channelData.setChannels(channels);

      console.log(`[ChannelFacade] Loaded ${channels.length} channels`);
    } catch (error) {
      const errorMessage = this.errorHandler.handleError(error, '');
      this.channelData.setError(errorMessage.message);
      console.error('[ChannelFacade] Failed to load channels:', error);
    } finally {
      this.channelData.setLoading(false);
    }
  }

  /**
   * Recharge les channels (force refresh)
   */
  async refreshChannels(): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) {
      console.warn('[ChannelFacade] Cannot refresh: no guild selected');
      return;
    }

    await this.loadChannels(guildId);
  }

  /**
   * Charge les détails d'un channel spécifique
   * Utile pour rafraîchir un channel sans recharger toute la liste
   */
  async loadChannelDetails(channelId: string): Promise<GuildChannelDTO | null> {
    try {
      this.channelData.setLoadingChannelDetails(true);

      const channel = await firstValueFrom(
        this.channelApi.getChannel(channelId)
      );

      // Mise à jour dans la liste
      this.channelData.updateChannel(channelId, channel);

      // Si c'est le channel sélectionné, le mettre à jour
      if (this.channelData.selectedChannel()?.id === channelId) {
        this.channelData.selectChannel(channel);
      }

      console.log(`[ChannelFacade] Loaded details for channel ${channelId}`);
      return channel;
    } catch (error) {
      console.error('[ChannelFacade] Failed to load channel details:', error);
      return null;
    } finally {
      this.channelData.setLoadingChannelDetails(false);
    }
  }

  // ============================================
  // ACTIONS CRUD
  // ============================================

  /**
   * Crée un nouveau channel
   */
  async createChannel(data: CreateChannelDTO): Promise<GuildChannelDTO | null> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) return null;

    try {
      const newChannel = await firstValueFrom(
        this.channelApi.createChannel(guildId, data)
      );

      this.channelData.addChannel(newChannel);

      console.log(`[ChannelFacade] Created channel: ${newChannel.name}`);
      return newChannel;
    } catch (error) {
      const errorMessage = this.errorHandler.handleError(error, '');
      this.channelData.setError(errorMessage.message);
      console.error('[ChannelFacade] Failed to create channel:', error);
      return null;
    }
  }

  /**
   * Modifie un channel existant
   */
  async modifyChannel(
    channelId: string,
    data: ModifyChannelDTO
  ): Promise<GuildChannelDTO | null> {
    try {
      const updatedChannel = await firstValueFrom(
        this.channelApi.modifyChannel(channelId, data)
      );

      this.channelData.updateChannel(channelId, updatedChannel);

      // Si c'est le channel sélectionné, le mettre à jour
      if (this.channelData.selectedChannel()?.id === channelId) {
        this.channelData.selectChannel(updatedChannel);
      }

      console.log(`[ChannelFacade] Modified channel: ${channelId}`);
      return updatedChannel;
    } catch (error) {
      const errorMessage = this.errorHandler.handleError(error, '');
      this.channelData.setError(errorMessage.message);
      console.error('[ChannelFacade] Failed to modify channel:', error);
      return null;
    }
  }

  /**
   * Supprime un channel
   */
  async deleteChannel(channelId: string, reason?: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.channelApi.deleteChannel(channelId, reason)
      );

      this.channelData.removeChannel(channelId);

      // Si c'est le channel sélectionné, désélectionner
      if (this.channelData.selectedChannel()?.id === channelId) {
        this.channelData.clearSelection();
      }

      console.log(`[ChannelFacade] Deleted channel: ${channelId}`);
      return true;
    } catch (error) {
      const errorMessage = this.errorHandler.handleError(error, '');
      this.channelData.setError(errorMessage.message);
      console.error('[ChannelFacade] Failed to delete channel:', error);
      return false;
    }
  }

  /**
   * Clone un channel (crée un nouveau channel avec les mêmes paramètres)
   */
  async cloneChannel(channelId: string): Promise<GuildChannelDTO | null> {
    const guildId = this.guildFacade.selectedGuildId();
    if (!guildId) return null;

    try {
      const clonedChannel = await firstValueFrom(
        this.channelApi.cloneChannel(guildId, channelId)
      );

      this.channelData.addChannel(clonedChannel);

      console.log(`[ChannelFacade] Cloned channel: ${clonedChannel.name}`);
      return clonedChannel;
    } catch (error) {
      const errorMessage = this.errorHandler.handleError(error, '');
      this.channelData.setError(errorMessage.message);
      console.error('[ChannelFacade] Failed to clone channel:', error);
      return null;
    }
  }

  // ============================================
  // GESTION DES PERMISSIONS
  // ============================================

  /**
   * Modifie les permissions d'un channel pour un role/membre
   */
  async editChannelPermissions(
    channelId: string,
    overwriteId: string,
    data: EditChannelPermissionsDTO
  ): Promise<boolean> {
    try {
      await firstValueFrom(
        this.channelApi.editChannelPermissions(channelId, overwriteId, data)
      );

      // Recharger le channel pour avoir les permissions à jour
      await this.loadChannelDetails(channelId);

      console.log(`[ChannelFacade] Updated permissions for channel ${channelId}`);
      return true;
    } catch (error) {
      const errorMessage = this.errorHandler.handleError(error, '');
      this.channelData.setError(errorMessage.message);
      console.error('[ChannelFacade] Failed to edit channel permissions:', error);
      return false;
    }
  }

  /**
   * Supprime les permissions d'un channel pour un role/membre
   */
  async deleteChannelPermission(
    channelId: string,
    overwriteId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      await firstValueFrom(
        this.channelApi.deleteChannelPermission(channelId, overwriteId, reason)
      );

      // Recharger le channel pour avoir les permissions à jour
      await this.loadChannelDetails(channelId);

      console.log(`[ChannelFacade] Deleted permission overwrite for channel ${channelId}`);
      return true;
    } catch (error) {
      const errorMessage = this.errorHandler.handleError(error, '');
      this.channelData.setError(errorMessage.message);
      console.error('[ChannelFacade] Failed to delete channel permission:', error);
      return false;
    }
  }

  // ============================================
  // SÉLECTION
  // ============================================

  selectChannel(channel: GuildChannelDTO | null): void {
    this.channelData.selectChannel(channel);
  }

  selectChannelById(channelId: string): void {
    this.channelData.selectChannelById(channelId);
  }

  clearSelection(): void {
    this.channelData.clearSelection();
  }

  // ============================================
  // FILTRAGE
  // ============================================

  setSearchQuery(query: string): void {
    this.channelData.setSearchQuery(query);
  }

  setSelectedType(type: DiscordChannelType | 'all'): void {
    this.channelData.setSelectedType(type);
  }

  setSelectedCategory(categoryId: string | 'all' | 'no-category'): void {
    this.channelData.setSelectedCategory(categoryId);
  }

  clearFilters(): void {
    this.channelData.clearFilters();
  }

  // ============================================
  // UTILITAIRES
  // ============================================

  /**
   * Trouve un channel par son ID
   */
  findChannelById(channelId: string): GuildChannelDTO | undefined {
    return this.channels().find((c) => c.id === channelId);
  }

  /**
   * Trouve les channels enfants d'une catégorie
   */
  findChildChannels(categoryId: string): GuildChannelDTO[] {
    return this.channels().filter((c) => c.parentId === categoryId);
  }

  /**
   * Vérifie si un channel existe
   */
  hasChannel(channelId: string): boolean {
    return this.channels().some((c) => c.id === channelId);
  }
}