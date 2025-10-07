import { Injectable, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthDataService } from './auth-data.service';
import { AuthApiService } from './auth-api.service';
import { TokenService } from './token.service';
import { UserFacadeService } from '../user/user-facade.service';
import { GuildFacadeService } from '../guild/guild-facade.service';
import { ErrorHandlerService } from '../error-handler.service';
import { 
  RefreshTokenRequestDTO,
  ExchangeSessionRequestDTO,
} from '@my-project/shared-types';
import { environment } from 'src/environments/environment';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Service Facade pour l'authentification Discord OAuth
 * 
 * Responsabilité : Orchestrer l'authentification
 * - Discord OAuth (login/callback)
 * - Logout/Refresh
 * - Validation des tokens
 * - Synchronisation localStorage
 * - Délégation des données user au UserFacadeService
 * - Délégation des données guild au GuildFacadeService
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
      return;
    }

    if (this.tokenService.isTokenExpired(tokens.accessToken)) {
      console.log('[Auth] Access token expired, attempting refresh...');
      const refreshed = await this.refreshToken();
      
      if (!refreshed) {
        console.log('[Auth] Refresh failed, clearing auth state');
        return;
      }
    }

    this.authData.setTokens(tokens);

    try {
      await this.userFacade.initializeUserService();
      await this.guildFacade.initializeGuildService();
      console.log('[Auth] Authentication restored successfully');
    } catch (error) {
      console.error('[Auth] Failed to restore auth state:', error);
      this.handleLogout();
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
   * 
   * Le backend renvoie vers le frontend avec SEULEMENT le sessionId:
   * /auth/callback?session=xxx
   * 
   * @param sessionId Session ID temporaire à échanger contre les tokens
   */
  async handleOAuthCallback(sessionId: string): Promise<void> {
    console.log('[Auth] Handling OAuth callback with sessionId...');
    
    this.authData.setLoading(true);
    this.authData.setError(null);

    try {
      // Valider le sessionId
      if (!sessionId) {
        throw new Error('Session ID manquant dans le callback OAuth');
      }

      // 🔒 NOUVEAU: Échanger le sessionId contre les tokens via POST sécurisé
      const dto: ExchangeSessionRequestDTO = { sessionId };
      const response = await firstValueFrom(this.authApi.exchangeSession(dto));

      // Extraire les tokens de la réponse
      const tokens: AuthTokens = {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
      };
      
      // Sauvegarder immédiatement les tokens (pour l'intercepteur)
      this.tokenService.setTokens(tokens);
      this.authData.setTokens(tokens);

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
   * Déconnexion simple (cet appareil uniquement)
   */
  async logout(): Promise<void> {
    const refreshToken = this.tokenService.getRefreshToken();
    
    // Tenter de notifier le serveur
    if (refreshToken) {
      try {
        await firstValueFrom(this.authApi.logout(refreshToken));
      } catch (error) {
        console.warn('[Auth] Server logout failed:', error);
        // On continue quand même avec le logout local
      }
    }
    
    this.handleLogout();
  }

  /**
   * Déconnexion de tous les appareils
   */
  async logoutAll(): Promise<void> {
    this.authData.setLoading(true);

    try {
      await firstValueFrom(this.authApi.logoutAll());
    } catch (error) {
      console.warn('[Auth] Server logout-all failed:', error);
      // On continue quand même avec le logout local
    } finally {
      this.handleLogout();
      this.authData.setLoading(false);
    }
  }

  /**
   * Rafraîchissement du token JWT
   */
  async refreshToken(): Promise<boolean> {
    const refreshToken = this.tokenService.getRefreshToken();
    
    if (!refreshToken) {
      this.handleLogout();
      return false;
    }

    try {
      const dto: RefreshTokenRequestDTO = { refresh_token: refreshToken };
      const response = await firstValueFrom(this.authApi.refreshToken(dto));
      
      // Sauvegarder les nouveaux tokens
      const tokens: AuthTokens = {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
      };
      
      this.authData.setTokens(tokens);
      
      console.log('[Auth] Token refreshed successfully');
      return true;

    } catch (error) {
      console.error('[Auth] Token refresh failed:', error);
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