// services/auth/auth-data.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { AuthState, AuthTokens, UserDto, DiscordUserDto } from '@my-project/shared-types';

@Injectable({
  providedIn: 'root'
})
export class AuthDataService {
  // ===== SIGNAUX PRIVÉS =====
  // Ces signaux ne doivent JAMAIS être exposés directement aux composants
  
  private readonly _user = signal<UserDto | null>(null);
  private readonly _discordUser = signal<DiscordUserDto | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _tokens = signal<AuthTokens | null>(null);

  // ===== SIGNAUX CALCULÉS PUBLICS =====
  // Ces signaux sont exposés en lecture seule pour les composants
  
  readonly user = this._user.asReadonly();
  readonly discordUser = this._discordUser.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  
  // Signal calculé pour l'état d'authentification
  readonly isAuthenticated = computed(() => {
    return this._user() !== null && this._tokens() !== null;
  });

  // Signaux calculés utiles basés sur tes DTOs
  readonly userRole = computed(() => {
    const user = this._user();
    return user?.role || null;
  });

  readonly isEmailVerified = computed(() => {
    const user = this._user();
    return user?.emailVerified || false;
  });

  readonly isActive = computed(() => {
    const user = this._user();
    return user?.isActive || false;
  });

  // Signal calculé pour l'état complet (utile pour le debug)
  readonly authState = computed<AuthState>(() => ({
    user: this._user(),
    isAuthenticated: this.isAuthenticated(),
    isLoading: this._isLoading(),
    error: this._error()
  }));

  // ===== GETTERS PRIVÉS =====
  // Ces getters permettent à la façade d'accéder aux valeurs actuelles
  
  getCurrentUser(): UserDto | null {
    return this._user();
  }

  getCurrentTokens(): AuthTokens | null {
    return this._tokens();
  }

  getLoadingState(): boolean {
    return this._isLoading();
  }

  getCurrentError(): string | null {
    return this._error();
  }

  getDiscordUser(): DiscordUserDto | null {
    return this._discordUser();
  }

  // ===== SETTERS PRIVÉS =====
  // Ces setters permettent à la façade de modifier l'état
  
  setUser(user: UserDto | null): void {
    this._user.set(user);
    // Quand on définit un utilisateur, on efface les erreurs
    if (user) {
      this._error.set(null);
    }
  }

  setDiscordUser(discordUser: DiscordUserDto | null): void {
    this._discordUser.set(discordUser);
  }

  setTokens(tokens: AuthTokens | null): void {
    this._tokens.set(tokens);
  }

  setLoading(loading: boolean): void {
    this._isLoading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  // ===== MÉTHODES UTILITAIRES PRIVÉES =====
  
  clearAll(): void {
    this._user.set(null);
    this._tokens.set(null);
    this._error.set(null);
    this._isLoading.set(false);
  }

  updateUserProfile(updates: Partial<UserDto>): void {
    const currentUser = this._user();
    if (currentUser) {
      this._user.set({ ...currentUser, ...updates });
    }
  }
}