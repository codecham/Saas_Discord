// services/auth/auth-facade.service.ts
import { Injectable, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthDataService } from './auth-data.service';
import { AuthApiService } from './auth-api.service';
import { TokenService } from './token.service';
import { 
  LoginDto, 
  RegisterDto, 
  AuthResponseDto,
  RefreshTokenDto, 
} from '@my-project/shared-types';
import { AuthTokens } from '@my-project/shared-types';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthFacadeService {
  // ===== INJECTION DES DÉPENDANCES =====
  private readonly authData = inject(AuthDataService);
  private readonly authApi = inject(AuthApiService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  // ===== SIGNAUX PUBLICS (EXPOSÉS AUX COMPOSANTS) =====
  readonly user = this.authData.user;
  readonly discordUser = this.authData.discordUser;
  readonly isAuthenticated = this.authData.isAuthenticated;
  readonly isLoading = this.authData.isLoading;
  readonly error = this.authData.error;
  readonly userRole = this.authData.userRole;
  readonly isEmailVerified = this.authData.isEmailVerified;
  readonly isActive = this.authData.isActive;
  readonly authState = this.authData.authState;

  constructor() {
    // Effect pour synchroniser les tokens avec le localStorage
    effect(() => {
      const tokens = this.authData.getCurrentTokens();
      if (tokens) {
        this.tokenService.setTokens(tokens);
      } else {
        this.tokenService.clearTokens();
      }
    });

    // Initialisation SYNCHRONE au démarrage
    this.restoreAuthState();
    
    // Puis chargement du profil en arrière-plan
    this.loadProfileSilently();
  }

  // ===== MÉTHODES PUBLIQUES D'AUTHENTIFICATION =====

  /**
   * Connexion avec email/mot de passe
   */
  async login(credentials: LoginDto): Promise<void> {
    this.authData.setLoading(true);
    this.authData.setError(null);

    try {
      const response = await firstValueFrom(this.authApi.login(credentials));
      this.handleAuthSuccess(response);
    } catch (error: any) {
      this.authData.setError(this.extractErrorMessage(error));
    } finally {
      this.authData.setLoading(false);
    }
  }

  /**
   * Inscription avec email/mot de passe
   */
  async register(userData: RegisterDto): Promise<void> {
    this.authData.setLoading(true);
    this.authData.setError(null);

    try {
      const response = await firstValueFrom(this.authApi.register(userData));
      this.handleAuthSuccess(response);
    } catch (error: any) {
      this.authData.setError(this.extractErrorMessage(error));
    } finally {
      this.authData.setLoading(false);
    }
  }

  /**
   * Déconnexion
   */
  async logout(): Promise<void> {
    const refreshToken = this.tokenService.getRefreshToken();
    
    if (!refreshToken) {
      this.handleLogoutSuccess();
      return;
    }

    this.authData.setLoading(true);

    try {
      await firstValueFrom(this.authApi.logout(refreshToken));
    } catch (error) {
      // Même en cas d'erreur côté serveur, on déconnecte localement
      console.warn('Erreur lors de la déconnexion côté serveur:', error);
    } finally {
      this.handleLogoutSuccess();
      this.authData.setLoading(false);
    }
  }

  /**
   * Déconnexion de tous les appareils
   */
  async logoutAll(): Promise<void> {
    this.authData.setLoading(true);

    try {
      await firstValueFrom(this.authApi.logoutAll());
    } catch (error) {
      console.warn('Erreur lors de la déconnexion générale:', error);
    } finally {
      this.handleLogoutSuccess();
      this.authData.setLoading(false);
    }
  }

  /**
   * Rafraîchissement du token
   */
  async refreshToken(): Promise<boolean> {
    const refreshToken = this.tokenService.getRefreshToken();
    
    if (!refreshToken) {
      this.handleLogoutSuccess();
      return false;
    }

    try {
      const refreshTokenDto: RefreshTokenDto = { refreshToken };
      const response = await firstValueFrom(this.authApi.refreshToken(refreshTokenDto));
      this.handleAuthSuccess(response);
      return true;
    } catch (error) {
      console.warn('Échec du rafraîchissement du token:', error);
      this.handleLogoutSuccess();
      return false;
    }
  }

  /**
   * Récupération du profil utilisateur
   */
  async loadProfile(): Promise<void> {
    if (!this.authData.isAuthenticated()) {
      return;
    }

    this.authData.setLoading(true);

    try {
      const user = await firstValueFrom(this.authApi.getProfile());
      this.authData.setUser(user);
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      // Si le profil ne peut pas être chargé, on déconnecte
      this.handleLogoutSuccess();
    } finally {
      this.authData.setLoading(false);
    }
  }

  // ===== MÉTHODES OAUTH =====

  /**
   * Redirection vers Google OAuth
   */
  loginWithGoogle(): void {
    window.location.href = this.authApi.getGoogleAuthUrl();
  }

  /**
   * Redirection vers Discord OAuth
   */
  loginWithDiscord(): void {
    window.location.href = this.authApi.getDiscordAuthUrl();
  }

  /**
   * Récupération des providers disponibles
   */
  async getAvailableProviders(): Promise<string[]> {
    try {
      const response = await firstValueFrom(this.authApi.getAvailableProviders());
      return response.providers;
    } catch (error) {
      console.warn('Erreur lors de la récupération des providers:', error);
      return ['local'];
    }
  }

  // ===== MÉTHODES UTILITAIRES PUBLIQUES =====

  /**
   * Vérification si l'utilisateur a un rôle spécifique
   */
  hasRole(role: string): boolean {
    return this.authData.userRole() === role;
  }

  /**
   * Vérification si l'utilisateur a l'un des rôles spécifiés
   */
  hasAnyRole(roles: string[]): boolean {
    const userRole = this.authData.userRole();
    return userRole ? roles.includes(userRole) : false;
  }

  /**
   * Navigation après connexion réussie
   */
  navigateAfterLogin(): void {
    const returnUrl = sessionStorage.getItem('returnUrl') || `${environment.redirectAuthPath}`;
    sessionStorage.removeItem('returnUrl');
    console.log(`return url = ${returnUrl}`);
    this.router.navigate([returnUrl]);
  }

  /**
   * Navigation après déconnexion
   */
  navigateAfterLogout(): void {
    this.router.navigate(['/auth/login']);
  }

  // ===== MÉTHODES PRIVÉES =====

  /**
   * Gestion du succès d'authentification
   */
  private handleAuthSuccess(response: AuthResponseDto): void {
    const tokens: AuthTokens = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken
    };

    this.authData.setUser(response.user);
    this.authData.setTokens(tokens);
    this.authData.setError(null);

    // Navigation automatique après connexion
    console.log(`Navigate after login from handle auth success`);
    this.navigateAfterLogin();
  }

  // Gestion du callback OAuth (depuis l'URL)
  /**
   * Traitement du callback OAuth
   */
  /**
   * Traitement du callback OAuth avec tokens directs
   * (version simplifiée où le backend renvoie directement les tokens)
   */
  /**
   * Traitement du callback OAuth avec tokens directs
   * (version simplifiée où le backend renvoie directement les tokens)
   */
  async handleOAuthCallback(accessToken: string, refreshToken: string): Promise<void> {
    this.authData.setLoading(true);
    this.authData.setError(null);

    try {
      // Valider que les tokens sont présents
      if (!accessToken || !refreshToken) {
        throw new Error('Tokens manquants dans le callback OAuth');
      }

      // Créer l'objet tokens
      const tokens: AuthTokens = {
        accessToken,
        refreshToken
      };

      // IMPORTANT: Sauvegarder immédiatement dans localStorage
      // pour que l'intercepteur puisse les utiliser tout de suite
      this.tokenService.setTokens(tokens);
      
      // Puis restaurer dans l'état
      this.authData.setTokens(tokens);

      // Maintenant on peut charger le profil car l'intercepteur a accès aux tokens
      const user = await firstValueFrom(this.authApi.getProfile());
      
      // Mettre à jour l'utilisateur dans l'état
      this.authData.setUser(user);
      this.authData.setError(null);

      // Navigation après succès
      this.navigateAfterLogin();

    } catch (error: any) {
      // En cas d'erreur, nettoyer l'état ET le localStorage
      this.authData.clearAll();
      this.tokenService.clearTokens();

      // Gestion de l'erreur
      const errorMessage = this.extractErrorMessage(error);
      this.authData.setError(errorMessage);

      console.error('OAuth Callback Error:', {
        accessToken: accessToken ? 'present' : 'missing',
        refreshToken: refreshToken ? 'present' : 'missing',
        error: error
      });

      // Pas de redirection automatique, laisser le composant gérer l'affichage d'erreur
      throw error; // Re-lancer pour que le composant puisse l'afficher

    } finally {
      this.authData.setLoading(false);
    }
  }

  /**
   * Extraction du message d'erreur depuis l'erreur HTTP
   */
  private extractErrorMessage(error: any): string {
    if (error?.error?.message) {
      return error.error.message;
    }
    if (error?.message) {
      return error.message;
    }
    return 'Une erreur inattendue est survenue';
  }

  /**
   * Gestion de la déconnexion réussie
   */
  private handleLogoutSuccess(): void {
    this.authData.clearAll();
    this.tokenService.clearTokens();
    this.navigateAfterLogout();
  }

  /**
   * Restaure l'état d'authentification depuis localStorage de manière SYNCHRONE
   * Cette méthode DOIT être rapide et synchrone
   */
  private restoreAuthState(): void {
    const tokens = this.tokenService.getTokens();
    
    // Pas de tokens = pas connecté
    if (!tokens) {
      return;
    }

    // Token expiré = nettoyer et pas connecté
    if (this.tokenService.isTokenExpired()) {
      this.tokenService.clearTokens();
      return;
    }

    // On a des tokens valides : restaurer l'état immédiatement
    this.authData.setTokens(tokens);
    
    // Créer un utilisateur minimal depuis le JWT (pour que isAuthenticated = true)
    const userInfo = this.tokenService.getUserInfoFromToken();
    if (userInfo) {
      const minimalUser = {
        id: userInfo.userId,
        email: userInfo.email,
        role: userInfo.role,
        name: '', // On le récupérera avec le profil complet
        isActive: true,
        emailVerified: true,
        createdAt: new Date()
      };
      this.authData.setUser(minimalUser as any);
    }
  }

  /**
   * Charge le profil complet en arrière-plan (sans bloquer)
   */
  private async loadProfileSilently(): Promise<void> {
    if (!this.authData.isAuthenticated()) {
      return;
    }

    try {
      const user = await firstValueFrom(this.authApi.getProfile());
      const discordUser = await firstValueFrom(this.authApi.getDiscordUser());
      this.authData.setUser(user);
      this.authData.setDiscordUser(discordUser);
    } catch (error) {
    // En cas d'erreur, on garde l'utilisateur minimal du JWT
    // L'utilisateur reste connecté mais avec des infos limitées
      console.warn('Impossible de charger le profil complet:', error);
    }
  }
}

