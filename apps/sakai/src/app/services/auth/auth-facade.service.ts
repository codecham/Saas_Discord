import { Injectable, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthDataService } from './auth-data.service';
import { AuthApiService } from './auth-api.service';
import { TokenService } from './token.service';
import { UserFacadeService } from '../user/user-facade.service';
import { 
  LoginDto, 
  RegisterDto, 
  RefreshTokenDto,
  AuthTokens
} from '@my-project/shared-types';
import { environment } from 'src/environments/environment';

/**
 * Service Facade pour l'authentification
 * 
 * Responsabilité : Orchestrer l'authentification
 * - Login/Logout/Refresh
 * - Validation des tokens
 * - Synchronisation localStorage
 * - Délégation des données user au UserFacadeService
 */
@Injectable({
  providedIn: 'root'
})
export class AuthFacadeService {
  private readonly authData = inject(AuthDataService);
  private readonly authApi = inject(AuthApiService);
  private readonly tokenService = inject(TokenService);
  private readonly userFacade = inject(UserFacadeService);
  private readonly router = inject(Router);

  readonly isAuthenticated = this.authData.isAuthenticated;
  readonly isLoading = this.authData.isLoading;
  readonly error = this.authData.error;


  constructor() {
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
   * 
   * ÉTAPES :
   * 1. Vérifier si des tokens existent dans localStorage
   * 2. Vérifier s'ils sont valides (pas expirés)
   * 3. Si valides : restaurer l'état auth + charger les profils
   * 4. Si invalides : nettoyer
   */
  private initializeAuth(): void {
    const tokens = this.tokenService.getTokens();

    // Pas de tokens = pas authentifié
    if (!tokens) {
      console.log('[Auth] No tokens found');
      this.userFacade.clearUserData();
      return;
    }

    if (this.tokenService.isTokenExpired(tokens.accessToken)) {
      console.log('[Auth] Access token expired, cleaning up');
      this.tokenService.clearTokens();
      this.userFacade.clearUserData();
      return;
    }
    this.authData.setTokens(tokens);
    this.userFacade.initializeUserService();
  }


  /**
   * Déconnexion
   */
  async logout(): Promise<void> {
    const refreshToken = this.tokenService.getRefreshToken();
    
    if (refreshToken) {
      try {
        await firstValueFrom(this.authApi.logout(refreshToken));
      } catch (error) {
        console.warn('[Auth] Server logout failed:', error);
      }
    }
    this.handleLogout();
  }

  async logoutAll(): Promise<void> {
    this.authData.setLoading(true);

    try {
      await firstValueFrom(this.authApi.logoutAll());
    } catch (error) {
      console.warn('Erreur lors de la déconnexion générale:', error);
    } finally {
      this.handleLogout();
      this.authData.setLoading(false);
    }
  }


  /**
   * Rafraîchissement du token
   */
  async refreshToken(): Promise<boolean> {
    
    const refreshToken = this.tokenService.getRefreshToken();
    
    if (!refreshToken) {
      this.handleLogout();
      return false;
    }

    try {
      const refreshTokenDto: RefreshTokenDto = { refreshToken };
      const response = await firstValueFrom(this.authApi.refreshToken(refreshTokenDto));
      
      // Sauvegarder les nouveaux tokens
      const tokens: AuthTokens = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken
      };
      this.authData.setTokens(tokens);
      
      // Mettre à jour les données user si présentes
      // if (response.user) {
      //   this.userFacade.setUser(response.user);
      // }
      // if (response.discordUser) {
      //   this.userFacade.setDiscordUser(response.discordUser);
      // }
      
      return true;

    } catch (error) {
      console.error('[Auth] Token refresh failed:', error);
      this.handleLogout();
      return false;
    }
  }

  /**
   * Redirige vers Discord OAuth
   */
  loginWithDiscord(): void {
    window.location.href = this.authApi.getDiscordAuthUrl();
  }


  /**
   * Gère le retour du callback Discord OAuth
   * 
   * @param accessToken Token d'accès reçu de Discord
   * @param refreshToken Token de rafraîchissement reçu de Discord
   */
  async handleOAuthCallback(accessToken: string, refreshToken: string): Promise<void> {
    console.log('[Auth] Handling OAuth callback...');
    
    this.authData.setLoading(true);
    this.authData.setError(null);

    try {
      // Valider les tokens
      if (!accessToken || !refreshToken) {
        throw new Error('Tokens manquants dans le callback OAuth');
      }

      const tokens: AuthTokens = { accessToken, refreshToken };
      
      // Sauvegarder immédiatement les tokens (pour l'intercepteur)
      this.tokenService.setTokens(tokens);
      this.authData.setTokens(tokens);

      try {
        await this.userFacade.initializeUserService();
      } catch (error) {
        console.log(`Error while get user: ${error}`);
        this.handleLogout();
        return ;
      }
      
      this.authData.setError(null);
      
      console.log('[Auth] OAuth callback handled successfully');
      this.navigateAfterLogin();

    } catch (error: any) {
      console.error('[Auth] OAuth callback failed:', error);
      
      // Nettoyer en cas d'erreur
      this.authData.clearAll();
      // this.userFacade.clear();
      this.tokenService.clearTokens();

      const errorMessage = this.extractErrorMessage(error);
      this.authData.setError(errorMessage);
      
      throw error;

    } finally {
      this.authData.setLoading(false);
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
    
    // Rediriger
    this.router.navigate(['/auth/login']);
  }


   /**
   * Navigation après login réussi
   */
  private navigateAfterLogin(): void {
    const returnUrl = sessionStorage.getItem('returnUrl') || environment.redirectAuthPath;
    sessionStorage.removeItem('returnUrl');
    console.log('[Auth] Navigating to:', returnUrl);
    this.router.navigate([returnUrl]);
  }

  /**
   * Extraction du message d'erreur
   */
  private extractErrorMessage(error: any): string {
    if (error?.error?.message) return error.error.message;
    if (error?.message) return error.message;
    return 'Une erreur inattendue est survenue';
  }

}