import { Injectable, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthDataService } from './auth-data.service';
import { AuthApiService } from './auth-api.service';
import { TokenService } from './token.service';
import { UserFacadeService } from '../user/user-facade.service';
import { GuildFacadeService } from '../guild/guild-facade.service';
import { ExchangeSessionRequestDTO } from '@my-project/shared-types';
import { ErrorHandlerService } from '../error-handling/error-handler.service';

/**
 * 🔒 MODIFIÉ: Interface sans refreshToken
 */
interface AuthTokens {
  accessToken: string;
  // refreshToken retiré - géré par cookie httpOnly
}

/**
 * Service Facade pour l'authentification Discord OAuth
 * 
 * 🔒 MODIFIÉ: Adapté pour les refresh tokens en cookies httpOnly
 */
@Injectable({
  providedIn: 'root'
})
export class AuthFacadeService {
  private readonly authData = inject(AuthDataService);
  private readonly authApi = inject(AuthApiService);
  private readonly tokenService = inject(TokenService);
  private readonly userFacade = inject(UserFacadeService);
  private readonly guildFacade = inject(GuildFacadeService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly router = inject(Router);

  readonly isAuthenticated = this.authData.isAuthenticated;
  readonly isLoading = this.authData.isLoading;
  readonly error = this.authData.error;
  readonly isInitialized = this.authData.isInitialized; 

  constructor() {
    // Synchroniser les tokens avec localStorage
    effect(() => {
      const tokens = this.authData.getCurrentTokens();
      if (tokens) {
        this.tokenService.setTokens(tokens);
      } else {
        this.tokenService.clearTokens();
      }
    });
    
    this.initializeAuth();
  }

  /**
   * Initialise l'authentification au démarrage de l'application
   */
    private async initializeAuth(): Promise<void> {
    const tokens = this.tokenService.getTokens();

    if (!tokens) {
      console.log('[Auth] No tokens found, user not authenticated');
      this.authData.setInitialized(true); // 🔒 AJOUT
      return;
    }

    if (this.tokenService.isTokenExpired(tokens.accessToken)) {
      console.log('[Auth] Access token expired, attempting refresh...');
      const refreshed = await this.refreshToken();
      
      if (!refreshed) {
        console.log('[Auth] Refresh failed, clearing auth state');
        this.authData.setInitialized(true); // 🔒 AJOUT
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const currentTokens = this.tokenService.getTokens();
    if (currentTokens) {
      this.authData.setTokens(currentTokens);
    }

    try {
      await this.userFacade.initializeUserService();
      await this.guildFacade.initializeGuildService();
      console.log('[Auth] Authentication restored successfully');
    } catch (error) {
      console.error('[Auth] Failed to restore auth state:', error);
      this.handleLogout();
    } finally {
      this.authData.setInitialized(true); // 🔒 AJOUT (dans finally pour toujours s'exécuter)
    }
  }

  /**
   * Lance le processus de connexion Discord OAuth
   */
  login(): void {
    const currentUrl = this.router.url;
    if (currentUrl !== '/auth/login' && currentUrl !== '/') {
      sessionStorage.setItem('returnUrl', currentUrl);
    }
    
    window.location.href = this.authApi.getDiscordAuthUrl();
  }

  /**
   * 🔒 MODIFIÉ: Gère le retour du callback Discord OAuth avec sessionId
   */
  async handleOAuthCallback(sessionId: string): Promise<void> {
    console.log('[Auth] Handling OAuth callback with sessionId...');
    
    this.authData.setLoading(true);
    this.authData.setError(null);

    try {
      if (!sessionId) {
        throw new Error('Session ID manquant dans le callback OAuth');
      }

      // 🔒 MODIFIÉ: Échanger le sessionId contre les tokens
      // Le refresh token sera automatiquement stocké dans un cookie httpOnly
      const dto: ExchangeSessionRequestDTO = { sessionId };
      const response = await firstValueFrom(this.authApi.exchangeSession(dto));

      // 🔒 MODIFIÉ: Extraire UNIQUEMENT l'access token
      // Le refresh token est maintenant dans un cookie httpOnly
      const tokens: AuthTokens = {
        accessToken: response.access_token,
        // refreshToken retiré - géré par cookie
      };
      
      // Sauvegarder immédiatement les tokens (pour l'intercepteur)
      this.tokenService.setTokens(tokens);
      this.authData.setTokens(tokens);

      console.log('[Auth] OAuth callback successful, tokens saved');
      console.log('[Auth] Refresh token stored in httpOnly cookie');

      // Charger les données utilisateur
      try {
        await this.userFacade.initializeUserService();
      } catch (error) {
        console.error('[Auth] Failed to load user data:', error);
        this.handleLogout();
        throw new Error('Impossible de charger les données utilisateur');
      }

      // Charger les guilds
      try {
        await this.guildFacade.initializeGuildService();
      } catch (error) {
        console.error('[Auth] Failed to load guilds:', error);
        // On continue quand même, l'utilisateur pourra réessayer
        this.errorHandler.handleError(error, 'Chargement des serveurs', false);
      }
      
      this.authData.setError(null);
      
      console.log('[Auth] OAuth callback handled successfully');
      this.navigateAfterLogin();

    } catch (error: any) {
      console.error('[Auth] OAuth callback failed:', error);
      
      // Nettoyer en cas d'erreur
      this.authData.clearAll();
      this.userFacade.clearUserData();
      this.guildFacade.clearAllGuildData();
      this.tokenService.clearTokens();

      const appError = this.errorHandler.handleError(error, 'Connexion');
      this.authData.setError(appError.message);
      
      throw error;

    } finally {
      this.authData.setLoading(false);
    }
  }

  /**
   * 🔒 MODIFIÉ: Déconnexion simple (cet appareil uniquement)
   */
  async logout(): Promise<void> {
    // 🔒 MODIFIÉ: Plus besoin d'envoyer le refresh token
    // Il est automatiquement envoyé via le cookie httpOnly
    try {
      await firstValueFrom(this.authApi.logout());
      console.log('[Auth] Server logout successful, cookie cleared by backend');
    } catch (error) {
      console.warn('[Auth] Server logout failed:', error);
      // On continue quand même avec le logout local
    } finally {
      this.handleLogout();
    }
  }

  /**
   * 🔒 MODIFIÉ: Déconnexion de tous les appareils
   */
  async logoutAll(): Promise<void> {
    this.authData.setLoading(true);

    try {
      await firstValueFrom(this.authApi.logoutAll());
      console.log('[Auth] Server logout-all successful');
    } catch (error) {
      console.warn('[Auth] Server logout-all failed:', error);
      // On continue quand même avec le logout local
    } finally {
      this.handleLogout();
      this.authData.setLoading(false);
    }
  }

  /**
   * 🔒 MODIFIÉ: Rafraîchissement du token JWT via cookie httpOnly
   */
  async refreshToken(): Promise<boolean> {
    // 🔒 MODIFIÉ: Plus besoin de récupérer le refresh token manuellement
    // Il est automatiquement envoyé via le cookie httpOnly
    
    try {
      console.log('[Auth] Refreshing token via httpOnly cookie...');
      
      const response = await firstValueFrom(this.authApi.refreshToken());
      
      // 🔒 MODIFIÉ: Sauvegarder UNIQUEMENT le nouvel access token
      // Le nouveau refresh token est automatiquement mis à jour dans le cookie
      const tokens: AuthTokens = {
        accessToken: response.access_token,
        // refreshToken retiré - géré par cookie
      };
      
      this.authData.setTokens(tokens);
      
      console.log('[Auth] Token refreshed successfully');
      console.log('[Auth] New refresh token stored in httpOnly cookie');
      return true;

    } catch (error) {
      console.error('[Auth] Token refresh failed:', error);
      console.log('[Auth] Cookie may be expired or invalid');
      this.handleLogout();
      return false;
    }
  }

  /**
   * Gère la déconnexion (nettoyage complet)
   */
  private handleLogout(): void {
    console.log('[Auth] Cleaning up auth state');
    
    // Nettoyer auth
    this.authData.clearAll();
    this.tokenService.clearTokens();
    
    // 🔒 NOTE: Le cookie httpOnly sera automatiquement supprimé
    // par le backend lors de l'appel à /api/auth/logout
    // On ne peut pas le supprimer manuellement en JavaScript (sécurité)
    
    // Nettoyer user
    this.userFacade.clearUserData();
    
    // Nettoyer guild
    this.guildFacade.clearAllGuildData();
    
    // Rediriger
    this.router.navigate(['/auth/login']);
  }

  /**
   * Navigation après login réussi
   */
  private navigateAfterLogin(): void {
    const returnUrl = sessionStorage.getItem('returnUrl');
    sessionStorage.removeItem('returnUrl');
    
    // Si une URL de retour existe et qu'elle n'est pas /auth/*, rediriger dessus
    if (returnUrl && !returnUrl.startsWith('/auth')) {
      console.log('[Auth] Navigating to return URL:', returnUrl);
      this.router.navigate([returnUrl]);
    } else {
      // Sinon, rediriger vers la sélection de serveur
      console.log('[Auth] Navigating to server list');
      this.router.navigate(['/server-list']);
    }
  }
}