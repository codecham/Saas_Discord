import { inject, Injectable, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GuildDataService } from './guild-data.service';
import { GuildApiService } from './guild-api.service';
import { GuildStorageService } from './guild-storage.service';
import { ErrorHandlerService } from '../error-handling/error-handler.service';
import { DiscordGuildDTO } from '@my-project/shared-types';
import { getGuildIconUrl } from '@my-project/shared-types';

@Injectable({
  providedIn: 'root'
})
export class GuildFacadeService {
  private readonly guildData = inject(GuildDataService);
  private readonly guildApi = inject(GuildApiService);
  private readonly guildStorage = inject(GuildStorageService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly router = inject(Router);

  // Signal pour savoir si on a déjà initialisé le service
  private isInitialized = signal<boolean>(false);

  // Exposer les signals publics
  readonly selectedGuild = this.guildData.selectedGuild;
  readonly selectedGuildId = this.guildData.selectedGuildId;
  readonly userGuildsList = this.guildData.userGuildsList;
  readonly isLoading = this.guildData.isLoading;
  readonly isLoadingGuildDetails = this.guildData.isLoadingGuildDetails;
  readonly error = this.guildData.error;
  readonly hasSelectedGuild = this.guildData.hasSelectedGuild;
  readonly activeGuilds = this.guildData.activeGuilds;
  readonly inactiveGuilds = this.guildData.inactiveGuilds;
  readonly notAddedGuilds = this.guildData.notAddedGuilds;
  readonly totalActiveGuilds = this.guildData.totalActiveGuilds;

  constructor() {
    // ✅ Effect amélioré : synchronise UNIQUEMENT après initialisation
    effect(() => {
      // Ne rien faire tant qu'on n'a pas initialisé le service
      if (!this.isInitialized()) {
        return;
      }

      const guildId = this.guildData.selectedGuildId();
      
      if (guildId) {
        this.guildStorage.setSelectedGuildId(guildId);
        console.log('[GuildFacade Effect] Saved guild ID to storage:', guildId);
      } else {
        this.guildStorage.clearSelectedGuildId();
        console.log('[GuildFacade Effect] Cleared guild ID from storage');
      }
    });
  }

  /**
   * Initialise le service Guild
   * - Charge la liste des guilds
   * - Tente de restaurer la dernière guild sélectionnée
   */
  async initializeGuildService(): Promise<void> {
    console.log('[GuildFacade] Initializing guild service...');

    try {
      // 1. Charger la liste des guilds
      await this.loadUserGuildsList();

      // 2. Attendre un petit délai pour que les signals soient mis à jour
      await new Promise(resolve => setTimeout(resolve, 50));

      // 3. Tenter de restaurer la guild depuis localStorage
      const savedGuildId = this.guildStorage.getSelectedGuildId();
      if (savedGuildId) {
        console.log('[GuildFacade] Found saved guild ID:', savedGuildId);
        await this.tryRestoreGuild(savedGuildId);
      } else {
        console.log('[GuildFacade] No saved guild ID found');
      }

    } catch (error) {
      this.errorHandler.handleError(error, 'Initialisation des serveurs', false);
      // Ne pas throw l'erreur pour ne pas bloquer l'app
    } finally {
      // ✅ Marquer comme initialisé pour activer l'effect
      this.isInitialized.set(true);
      console.log('[GuildFacade] Initialization complete');
    }
  }


  /**
   * Charge la liste des guilds de l'utilisateur
   */
  async loadUserGuildsList(): Promise<void> {
    console.log('[GuildFacade] Loading user guilds list...');
    
    this.guildData.setLoading(true);
    this.guildData.setError(null);

    try {
      const guilds = await firstValueFrom(this.guildApi.getUserGuildList());
      this.guildData.setUserGuildsList(guilds);
      
      console.log('[GuildFacade] Guilds loaded successfully:', {
        active: guilds.active.length,
        inactive: guilds.inactive.length,
        notAdded: guilds.notAdded.length
      });

    } catch (error) {
      const appError = this.errorHandler.handleError(
        error, 
        'Chargement des serveurs'
      );
      this.guildData.setError(appError.message);
      throw error;

    } finally {
      this.guildData.setLoading(false);
    }
  }

  /**
   * Tente de restaurer une guild depuis son ID
   * Utilisé au démarrage de l'app pour restaurer la dernière guild sélectionnée
   */
  private async tryRestoreGuild(guildId: string): Promise<void> {
    console.log('[GuildFacade] Attempting to restore guild:', guildId);

    // Vérifier que la guild est dans les guilds actives
    const activeGuilds = this.guildData.activeGuilds();
    
    console.log('[GuildFacade] Available active guilds:', activeGuilds.map(g => g.id));
    
    const guildExists = activeGuilds.some(g => g.id === guildId);

    if (!guildExists) {
      console.warn('[GuildFacade] Saved guild not found in active guilds, clearing');
      this.guildStorage.clearSelectedGuildId();
      return;
    }

    try {
      // Charger les détails complets de la guild
      // false = ne pas naviguer automatiquement au dashboard
      await this.selectGuildById(guildId, false);
      console.log('[GuildFacade] Guild restored successfully');

    } catch (error) {
      console.error('[GuildFacade] Failed to restore guild:', error);
      this.guildStorage.clearSelectedGuildId();
      // Ne pas afficher d'erreur à l'utilisateur, c'est une restauration silencieuse
    }
  }


  /**
   * Sélectionne une guild par son ID et charge ses détails complets
   * @param guildId ID de la guild à sélectionner
   * @param navigate Si true, redirige vers le dashboard après sélection
   */
  async selectGuildById(guildId: string, navigate: boolean = true): Promise<void> {
    console.log('[GuildFacade] Selecting guild:', guildId);

    this.guildData.setLoadingGuildDetails(true);
    this.guildData.setError(null);

    try {
      // Charger les détails complets de la guild
      const guild = await firstValueFrom(this.guildApi.getGuild(guildId));
      
      // Sauvegarder la guild sélectionnée
      this.guildData.setSelectedGuild(guild);
      
      console.log('[GuildFacade] Guild selected successfully:', guild.name);
      
      // Afficher un message de succès
      this.errorHandler.showSuccess(
        `Serveur "${guild.name}" sélectionné`,
        'Succès'
      );

      // Navigation vers le dashboard si demandé
      if (navigate) {
        await this.router.navigate(['/dashboard']);
      }

    } catch (error) {
      const appError = this.errorHandler.handleError(
        error, 
        'Sélection du serveur'
      );
      this.guildData.setError(appError.message);
      
      // Nettoyer la sélection en cas d'erreur
      this.clearSelectedGuild();
      throw error;

    } finally {
      this.guildData.setLoadingGuildDetails(false);
    }
  }

  /**
   * Sélectionne une guild depuis l'objet GuildWithBotStatusDTO
   * (utilisé dans la liste des serveurs)
   */
  async selectGuild(guild: { id: string; name: string }): Promise<void> {
    return this.selectGuildById(guild.id, true);
  }

  /**
   * Désélectionne la guild actuelle
   */
  clearSelectedGuild(): void {
    console.log('[GuildFacade] Clearing selected guild');
    this.guildData.setSelectedGuild(null);
    // Le localStorage sera nettoyé automatiquement par l'effect
  }

  /**
   * Change de guild (désélectionne + sélectionne une nouvelle)
   */
  async changeGuild(guildId: string): Promise<void> {
    console.log('[GuildFacade] Changing guild to:', guildId);
    this.clearSelectedGuild();
    await this.selectGuildById(guildId, true);
  }

  /**
   * Rafraîchit les détails de la guild actuellement sélectionnée
   */
  async refreshSelectedGuild(): Promise<void> {
    const currentGuildId = this.guildData.selectedGuildId();
    
    if (!currentGuildId) {
      console.warn('[GuildFacade] No guild selected to refresh');
      return;
    }

    console.log('[GuildFacade] Refreshing current guild:', currentGuildId);
    
    try {
      await this.selectGuildById(currentGuildId, false);
      this.errorHandler.showSuccess('Serveur actualisé', 'Succès');
    } catch (error) {
      // L'erreur est déjà gérée dans selectGuildById
      console.error('[GuildFacade] Failed to refresh guild');
    }
  }

  /**
   * Rafraîchit la liste complète des guilds
   */
  async refreshGuildsList(): Promise<void> {
    console.log('[GuildFacade] Refreshing guilds list');
    
    try {
      await this.loadUserGuildsList();
      this.errorHandler.showSuccess('Liste des serveurs actualisée', 'Succès');
    } catch (error) {
      // L'erreur est déjà gérée dans loadUserGuildsList
      console.error('[GuildFacade] Failed to refresh guilds list');
    }
  }

  /**
   * Vérifie si une guild spécifique est actuellement sélectionnée
   */
  isGuildSelected(guildId: string): boolean {
    return this.guildData.selectedGuildId() === guildId;
  }

  /**
   * Obtient la guild actuellement sélectionnée (ou null)
   */
  getCurrentGuild(): DiscordGuildDTO | null {
    return this.guildData.selectedGuild();
  }

  /**
   * Obtient l'URL de l'icône de la guild sélectionnée
   * @param size Taille de l'icône (par défaut: 128)
   * @returns URL de l'icône ou null si pas d'icône
   */
  getSelectedGuildIconUrl(size: number = 128): string | null {
    const guild = this.selectedGuild();
    if (!guild) return null;
    return getGuildIconUrl(guild, size);
  }


  /**
   * Nettoie toutes les données (appelé au logout)
   */
  clearAllGuildData(): void {
    console.log('[GuildFacade] Clearing all guild data');
    this.guildData.clearAll();
    this.guildStorage.clearSelectedGuildId();
  }
}