import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { 
  UserDTO,
  AuthStatusDTO,
  ExchangeSessionRequestDTO,
  ExchangeSessionResponseDTO,
} from '@my-project/shared-types';

/**
 * 🔒 NOUVEAU: DTO pour la réponse refresh (sans refresh_token)
 */
export interface RefreshTokenResponseDTO {
  access_token: string;
  // refresh_token retiré - géré par cookie httpOnly
}

/**
 * Service API pour l'authentification
 * 
 * 🔒 SÉCURITÉ:
 * - Tous les appels utilisent withCredentials: true
 * - Les cookies httpOnly sont envoyés automatiquement
 */
@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/auth`;
  private readonly http = inject(HttpClient);

  // ===== DISCORD OAUTH =====
  
  /**
   * Redirige vers Discord OAuth
   * Le backend gère la redirection
   */
  getDiscordAuthUrl(): string {
    return `${this.baseUrl}/discord`;
  }

  /**
   * 🔒 MODIFIÉ: Échange un sessionId contre les tokens JWT
   * Appelé après le callback OAuth
   * 
   * @returns { access_token, user } (refresh_token dans cookie)
   */
  exchangeSession(dto: ExchangeSessionRequestDTO): Observable<ExchangeSessionResponseDTO> {
    return this.http.post<ExchangeSessionResponseDTO>(
      `${this.baseUrl}/exchange-session`,
      dto,
      { 
        withCredentials: true // ✅ Permet de recevoir le cookie httpOnly
      }
    );
  }

  // ===== GESTION DES TOKENS =====
  
  /**
   * 🔒 MODIFIÉ: Refresh le token JWT via cookie httpOnly
   * Le refresh token n'est plus envoyé dans le body
   */
  refreshToken(): Observable<RefreshTokenResponseDTO> {
    return this.http.post<RefreshTokenResponseDTO>(
      `${this.baseUrl}/refresh`,
      {}, // ✅ Body vide - le refresh token est dans le cookie
      { 
        withCredentials: true // ✅ Envoie automatiquement le cookie refresh_token
      }
    );
  }

  /**
   * 🔒 MODIFIÉ: Déconnexion (le refresh token est dans le cookie)
   */
  logout(): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/logout`,
      {}, // ✅ Body vide - le refresh token est dans le cookie
      { 
        withCredentials: true // ✅ Envoie le cookie pour suppression côté serveur
      }
    );
  }

  /**
   * 🔒 MODIFIÉ: Déconnexion de tous les appareils
   */
  logoutAll(): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/logout-all`,
      {},
      { 
        withCredentials: true // ✅ Envoie le cookie
      }
    );
  }

  // ===== RÉCUPÉRATION UTILISATEUR =====
  
  /**
   * Récupère l'utilisateur actuel
   * Nécessite un JWT valide
   */
  getCurrentUser(): Observable<UserDTO> {
    return this.http.get<UserDTO>(
      `${this.baseUrl}/me`,
      { 
        withCredentials: true // ✅ Pour cohérence
      }
    );
  }

  /**
   * Vérifie le statut d'authentification
   */
  getStatus(): Observable<AuthStatusDTO> {
    return this.http.get<AuthStatusDTO>(
      `${this.baseUrl}/status`,
      { 
        withCredentials: true // ✅ Pour cohérence
      }
    );
  }

  /**
   * 🔒 NOUVEAU: Health check du service auth
   */
  getHealthCheck(): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/health`,
      { 
        withCredentials: true // ✅ Pour cohérence
      }
    );
  }
}