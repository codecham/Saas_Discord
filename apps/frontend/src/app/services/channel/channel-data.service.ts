import { Injectable, computed, signal } from '@angular/core';
import { GuildChannelDTO, DiscordChannelType } from '@my-project/shared-types';

/**
 * Service Data pour gérer l'état des channels avec Angular Signals
 * 
 * Responsabilités:
 * - Stockage de l'état (channels, sélection, filtres, loading)
 * - Computed values (channels groupés, filtrés, catégorisés)
 * - Méthodes de mise à jour de l'état
 * 
 * Utilisé exclusivement par ChannelFacadeService
 */
@Injectable({
  providedIn: 'root'
})
export class ChannelDataService {
  // ============================================
  // ÉTAT PRINCIPAL
  // ============================================

  private readonly _channels = signal<GuildChannelDTO[]>([]);
  private readonly _selectedChannel = signal<GuildChannelDTO | null>(null);
  private readonly _searchQuery = signal<string>('');
  private readonly _selectedType = signal<DiscordChannelType | 'all'>('all');
  private readonly _selectedCategory = signal<string | 'all' | 'no-category'>('all');
  
  // États de chargement
  private readonly _isLoading = signal<boolean>(false);
  private readonly _isLoadingChannelDetails = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // ============================================
  // SIGNALS PUBLICS - ÉTAT DE BASE
  // ============================================

  readonly channels = this._channels.asReadonly();
  readonly selectedChannel = this._selectedChannel.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly selectedType = this._selectedType.asReadonly();
  readonly selectedCategory = this._selectedCategory.asReadonly();
  
  readonly isLoading = this._isLoading.asReadonly();
  readonly isLoadingChannelDetails = this._isLoadingChannelDetails.asReadonly();
  readonly error = this._error.asReadonly();

  // ============================================
  // COMPUTED - MÉTRIQUES DE BASE
  // ============================================

  readonly totalChannels = computed(() => this._channels().length);
  readonly hasChannelSelected = computed(() => this._selectedChannel() !== null);

  // ============================================
  // COMPUTED - CATÉGORISATION PAR TYPE
  // ============================================

  readonly categories = computed(() =>
    this._channels().filter((c) => c.isCategory)
  );

  readonly textChannels = computed(() =>
    this._channels().filter((c) => c.isText && !c.isThread)
  );

  readonly voiceChannels = computed(() =>
    this._channels().filter((c) => c.isVoice)
  );

  readonly threads = computed(() =>
    this._channels().filter((c) => c.isThread)
  );

  readonly forumChannels = computed(() =>
    this._channels().filter((c) => c.isForum)
  );

  readonly announcementChannels = computed(() =>
    this._channels().filter((c) => c.isAnnouncement)
  );

  readonly stageChannels = computed(() =>
    this._channels().filter((c) => c.isStage)
  );

  // ============================================
  // COMPUTED - FILTRAGE ET TRI
  // ============================================

  /**
   * Channels filtrés par recherche et type
   */
  readonly filteredChannels = computed(() => {
    let filtered = this._channels();

    // Filtre par recherche
    const query = this._searchQuery().toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.topic?.toLowerCase().includes(query) ||
          c.categoryPath?.toLowerCase().includes(query)
      );
    }

    // Filtre par type
    const type = this._selectedType();
    if (type !== 'all') {
      filtered = filtered.filter((c) => c.type === type);
    }

    // Filtre par catégorie
    const category = this._selectedCategory();
    if (category === 'no-category') {
      filtered = filtered.filter((c) => !c.parentId && !c.isCategory);
    } else if (category !== 'all') {
      filtered = filtered.filter((c) => c.parentId === category);
    }

    return filtered;
  });

  readonly filteredCount = computed(() => this.filteredChannels().length);

  /**
   * Channels triés par position
   */
  readonly channelsSortedByPosition = computed(() => {
    return [...this._channels()].sort((a, b) => a.position - b.position);
  });

  /**
   * Channels groupés par catégorie
   * Structure: { category: CategoryChannel, channels: Channel[] }[]
   */
  readonly channelsGroupedByCategory = computed(() => {
    const channels = this.channelsSortedByPosition();
    const categories = channels.filter((c) => c.isCategory);
    
    const groups: Array<{
      category: GuildChannelDTO | null;
      channels: GuildChannelDTO[];
    }> = [];

    // Channels sans catégorie
    const noCategory = channels.filter((c) => !c.parentId && !c.isCategory);
    if (noCategory.length > 0) {
      groups.push({
        category: null,
        channels: noCategory,
      });
    }

    // Channels par catégorie
    categories.forEach((category) => {
      const categoryChannels = channels.filter((c) => c.parentId === category.id);
      if (categoryChannels.length > 0) {
        groups.push({
          category,
          channels: categoryChannels,
        });
      }
    });

    return groups;
  });

  // ============================================
  // COMPUTED - STATISTIQUES
  // ============================================

  readonly stats = computed(() => {
    const all = this._channels();
    return {
      total: all.length,
      categories: all.filter((c) => c.isCategory).length,
      text: all.filter((c) => c.isText && !c.isThread).length,
      voice: all.filter((c) => c.isVoice).length,
      threads: all.filter((c) => c.isThread).length,
      forums: all.filter((c) => c.isForum).length,
      announcements: all.filter((c) => c.isAnnouncement).length,
      stages: all.filter((c) => c.isStage).length,
      locked: all.filter((c) => c.isLocked).length,
      private: all.filter((c) => c.isPrivate).length,
      nsfw: all.filter((c) => c.nsfw).length,
      withSlowmode: all.filter((c) => c.hasSlowmode).length,
    };
  });

  // ============================================
  // MÉTHODES DE MISE À JOUR - CHANNELS
  // ============================================

  setChannels(channels: GuildChannelDTO[]): void {
    this._channels.set(channels);
  }

  addChannel(channel: GuildChannelDTO): void {
    this._channels.update((current) => [...current, channel]);
  }

  updateChannel(channelId: string, updates: Partial<GuildChannelDTO>): void {
    this._channels.update((current) =>
      current.map((c) => (c.id === channelId ? { ...c, ...updates } : c))
    );
  }

  removeChannel(channelId: string): void {
    this._channels.update((current) => current.filter((c) => c.id !== channelId));
  }

  // ============================================
  // MÉTHODES DE MISE À JOUR - SÉLECTION
  // ============================================

  selectChannel(channel: GuildChannelDTO | null): void {
    this._selectedChannel.set(channel);
  }

  selectChannelById(channelId: string): void {
    const channel = this._channels().find((c) => c.id === channelId);
    this._selectedChannel.set(channel ?? null);
  }

  clearSelection(): void {
    this._selectedChannel.set(null);
  }

  // ============================================
  // MÉTHODES DE MISE À JOUR - FILTRES
  // ============================================

  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  setSelectedType(type: DiscordChannelType | 'all'): void {
    this._selectedType.set(type);
  }

  setSelectedCategory(categoryId: string | 'all' | 'no-category'): void {
    this._selectedCategory.set(categoryId);
  }

  clearFilters(): void {
    this._searchQuery.set('');
    this._selectedType.set('all');
    this._selectedCategory.set('all');
  }

  // ============================================
  // MÉTHODES DE MISE À JOUR - ÉTATS
  // ============================================

  setLoading(loading: boolean): void {
    this._isLoading.set(loading);
  }

  setLoadingChannelDetails(loading: boolean): void {
    this._isLoadingChannelDetails.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  clearError(): void {
    this._error.set(null);
  }

  // ============================================
  // RESET
  // ============================================

  reset(): void {
    this._channels.set([]);
    this._selectedChannel.set(null);
    this._searchQuery.set('');
    this._selectedType.set('all');
    this._selectedCategory.set('all');
    this._isLoading.set(false);
    this._isLoadingChannelDetails.set(false);
    this._error.set(null);
  }
}