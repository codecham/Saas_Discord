// services/auth/token.service.ts
import { Injectable } from '@angular/core';
import { AuthTokens } from '@my-project/shared-types';
import { JwtPayload } from '@my-project/shared-types';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  // ===== STOCKAGE DES TOKENS =====
  
  setTokens(tokens: AuthTokens): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getTokens(): AuthTokens | null {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    if (accessToken && refreshToken) {
      return { accessToken, refreshToken };
    }

    return null;
  }

  // ===== NETTOYAGE =====
  
  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  // ===== VÉRIFICATIONS AVEC TES TYPES JWT =====
  
  hasTokens(): boolean {
    return this.getAccessToken() !== null && this.getRefreshToken() !== null;
  }

  // Méthode pour décoder le payload JWT avec ton interface
  decodeToken(token?: string): JwtPayload | null {
    const accessToken = token || this.getAccessToken();
    if (!accessToken) return null;

    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      return payload as JwtPayload;
    } catch (error) {
      console.error('Erreur lors du décodage du token:', error);
      return null;
    }
  }

  // Vérifie si le token est expiré
  isTokenExpired(token?: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  }

  // Récupère les infos utilisateur depuis le token
  getUserInfoFromToken(): { userId: string; email: string; role: string } | null {
    const payload = this.decodeToken();
    if (!payload) return null;

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role
    };
  }

  // Calcule le temps restant avant expiration (en secondes)
  getTimeToExpiry(token?: string): number {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return 0;

    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - currentTime);
  }
}