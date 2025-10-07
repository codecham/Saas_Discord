import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { 
  RefreshTokenRequestDTO,
  RefreshTokenResponseDTO,
  UserDTO,
  AuthStatusDTO,
  ExchangeSessionRequestDTO,
  ExchangeSessionResponseDTO,
} from '@my-project/shared-types';

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
   * 🔒 NOUVEAU: Échange un sessionId contre les tokens JWT
   * Appelé après le callback OAuth
   */
  exchangeSession(dto: ExchangeSessionRequestDTO): Observable<ExchangeSessionResponseDTO> {
    return this.http.post<ExchangeSessionResponseDTO>(
      `${this.baseUrl}/exchange-session`,
      dto
    );
  }

  // ===== GESTION DES TOKENS =====
  
  /**
   * Refresh le token JWT
   */
  refreshToken(dto: RefreshTokenRequestDTO): Observable<RefreshTokenResponseDTO> {
    return this.http.post<RefreshTokenResponseDTO>(`${this.baseUrl}/refresh`, dto);
  }

  /**
   * Déconnexion (supprime le refresh token côté serveur)
   */
  logout(refreshToken?: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, { 
      refresh_token: refreshToken 
    });
  }

  /**
   * Déconnexion de tous les appareils
   */
  logoutAll(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout-all`, {});
  }

  // ===== RÉCUPÉRATION UTILISATEUR =====
  
  /**
   * Récupère l'utilisateur actuel
   * Nécessite un JWT valide
   */
  getCurrentUser(): Observable<UserDTO> {
    return this.http.get<UserDTO>(`${this.baseUrl}/me`);
  }

  /**
   * Vérifie le statut d'authentification
   */
  getStatus(): Observable<AuthStatusDTO> {
    return this.http.get<AuthStatusDTO>(`${this.baseUrl}/status`);
  }

  /**
   * 🔒 NOUVEAU: Health check du service auth
   */
  getHealthCheck(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }
}