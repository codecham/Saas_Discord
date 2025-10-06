import { Injectable, signal, computed } from '@angular/core';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthDataService {
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _tokens = signal<AuthTokens | null>(null);

  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isAuthenticated = computed(() => this._tokens() !== null);

  getCurrentTokens(): AuthTokens | null {
    return this._tokens();
  }

  // =========================================================================
  // SETTERS
  // =========================================================================
  
  setTokens(tokens: AuthTokens | null): void {
    this._tokens.set(tokens);
  }

  setLoading(loading: boolean): void {
    this._isLoading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  clearAll(): void {
    this._tokens.set(null);
    this._error.set(null);
    this._isLoading.set(false);
  }
}