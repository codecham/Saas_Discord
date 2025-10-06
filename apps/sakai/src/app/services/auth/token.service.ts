import { Injectable } from '@angular/core';
import { JwtPayloadDTO } from '@my-project/shared-types';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

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

  // ===== VÉRIFICATIONS AVEC LE NOUVEAU JwtPayloadDTO =====
  
  hasTokens(): boolean {
    return this.getAccessToken() !== null && this.getRefreshToken() !== null;
  }

  /**
   * Décode le payload JWT avec l'interface JwtPayloadDTO
   */
  decodeToken(token?: string): JwtPayloadDTO | null {
    const accessToken = token || this.getAccessToken();
    if (!accessToken) return null;

    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      return payload as JwtPayloadDTO;
    } catch (error) {
      console.error('Erreur lors du décodage du token:', error);
      return null;
    }
  }

  /**
   * Vérifie si le token est expiré
   */
  isTokenExpired(token?: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  }

  /**
   * Récupère les infos utilisateur depuis le token
   * Utilise le nouveau format : sub (userId), discordId, username, role
   */
  getUserInfoFromToken(): { 
    userId: string; 
    discordId: string;
    username: string;
    role: string;
  } | null {
    const payload = this.decodeToken();
    if (!payload) return null;

    return {
      userId: payload.sub,
      discordId: payload.discordId,
      username: payload.username,
      role: payload.role,
    };
  }

  /**
   * Calcule le temps restant avant expiration (en secondes)
   */
  getTimeToExpiry(token?: string): number {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return 0;

    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - currentTime);
  }
}