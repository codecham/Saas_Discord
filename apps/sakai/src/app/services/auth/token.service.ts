import { Injectable } from '@angular/core';
import { JwtPayloadDTO } from '@my-project/shared-types';

/**
 * 🔒 MODIFIÉ: Structure des tokens (refresh token retiré)
 * Le refresh token est maintenant stocké dans un cookie httpOnly côté serveur
 */
interface AuthTokens {
  accessToken: string;
  // refreshToken retiré - géré par cookie httpOnly
}

/**
 * Service de gestion des tokens JWT
 * 
 * 🔒 SÉCURITÉ:
 * - Access token: localStorage (court TTL, acceptable)
 * - Refresh token: cookie httpOnly (protection XSS)
 */
@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  // 🔒 SUPPRIMÉ: REFRESH_TOKEN_KEY - plus stocké en localStorage

  // ===== STOCKAGE DES TOKENS =====
  
  /**
   * 🔒 MODIFIÉ: Sauvegarde UNIQUEMENT l'access token
   */
  setTokens(tokens: AuthTokens): void {
    if (tokens.accessToken) {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
      console.log('[TokenService] Access token saved');
    }
    
    // 🔒 NOTE: Le refresh token est géré automatiquement par les cookies
    // Rien à stocker manuellement
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * 🔒 SUPPRIMÉ: getRefreshToken()
   * Le refresh token n'est plus accessible en JavaScript
   * Il est géré automatiquement par les cookies httpOnly
   */

  /**
   * 🔒 MODIFIÉ: Récupère UNIQUEMENT l'access token
   */
  getTokens(): AuthTokens | null {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      return null;
    }

    // 🔒 MODIFIÉ: Plus de refresh token dans le retour
    return { accessToken };
  }

  // ===== NETTOYAGE =====
  
  /**
   * 🔒 MODIFIÉ: Suppression UNIQUEMENT de l'access token
   * Le cookie httpOnly sera supprimé par le backend lors du logout
   */
  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    console.log('[TokenService] Access token cleared');
    
    // 🔒 NOTE: Le cookie refresh_token sera supprimé par le backend
    // via res.clearCookie() lors de l'appel à /api/auth/logout
  }

  // ===== VÉRIFICATIONS =====
  
  hasTokens(): boolean {
    return this.getAccessToken() !== null;
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
      console.error('[TokenService] Erreur lors du décodage du token:', error);
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