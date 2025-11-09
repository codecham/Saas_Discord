import { computed, inject, Injectable } from '@angular/core';
import { UserDataService } from './user-data.service';
import { UserApiService } from './user-api.service';
import { ErrorHandlerService } from '../error-handling/error-handler.service';
import { UserDTO } from '@my-project/shared-types';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserFacadeService {
  private readonly userData = inject(UserDataService);
  private readonly userApi = inject(UserApiService);
  private readonly errorHandler = inject(ErrorHandlerService);

  readonly discordUser = this.userData.discordUser;
  readonly isLoading = this.userData.isLoading;
  readonly error = this.userData.error;

  readonly user = computed(() => this.discordUser() ?? null);
  
  // Computed pour l'affichage
  readonly discordId = computed(() => this.user()?.discordId ?? null);
  readonly username = computed(() => this.user()?.username ?? null);
  readonly discriminator = computed(() => this.user()?.discriminator ?? null);
  readonly globalName = computed(() => this.user()?.globalName ?? null);
  readonly email = computed(() => this.user()?.email ?? null);
  readonly role = computed(() => this.user()?.role ?? undefined);
  readonly createdAt = computed(() => this.user()?.createdAt ?? null);
  readonly lastLoginAt = computed(() => this.user()?.lastLoginAt ?? null);
  
  readonly avatar = computed(() => {
    const user = this.user();
    if (!user?.avatar || !user.discordId) return '/assets/default-avatar.png';
    return `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=256`;
  });
  
  readonly displayName = computed(() => {
    return this.globalName() || this.username() || 'User';
  });
  
  readonly userTag = computed(() => {
    const username = this.username();
    const discriminator = this.discriminator();
    if (!username) return '';
    return discriminator && discriminator !== '0' 
      ? `${username}#${discriminator}` 
      : username;
  });

  /**
   * Initialise le user service
   */
  async initializeUserService(): Promise<void> {
    this.userData.setLoading(true);
    this.userData.setError(null);
    
    try {
      const discordUser: UserDTO = await firstValueFrom(this.userApi.getDiscordUser());
      this.setDiscordUser(discordUser);
      
      console.log('[UserFacade] User loaded:', this.user());
      
    } catch (error: any) {
      const appError = this.errorHandler.handleError(error, 'Chargement du profil');
      this.userData.setError(appError.message);
      this.clearUserData();
      throw error;
      
    } finally {
      this.userData.setLoading(false);
    }
  }

  /**
   * Rafraîchit les données utilisateur
   */
  async refreshUser(): Promise<void> {
    console.log('[UserFacade] Refreshing user data...');
    
    try {
      await this.initializeUserService();
      this.errorHandler.showSuccess('Profil actualisé', 'Succès');
    } catch (error) {
      // L'erreur est déjà gérée dans initializeUserService
      console.error('[UserFacade] Failed to refresh user');
    }
  }

  /**
   * Définit le profil Discord (appelé par AuthFacadeService après login)
   */
  setDiscordUser(discordUser: UserDTO | null): void {
    this.userData.setDiscordUser(discordUser);
  }

  /**
   * Nettoie toutes les données (appelé par AuthFacadeService au logout)
   */
  clearUserData(): void {
    this.userData.clearAll();
  }

  /**
   * Obtient l'URL de l'avatar avec une taille personnalisée
   */
  getAvatarUrl(size: number = 256): string {
    const user = this.user();
    if (!user?.avatar || !user.discordId) return '/assets/default-avatar.png';
    return `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=${size}`;
  }
}