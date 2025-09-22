// services/auth/auth-api.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { 
  AuthResponseDto,
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  UserDto,
  DiscordUserDto,
} from '@my-project/shared-types'; // Ajuste le chemin

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/auth`; // Ajuste selon ton config
  private readonly baseUrlDiscord = `${environment.apiUrl}/api/discord`;
  private http = inject(HttpClient);

  // ===== AUTHENTIFICATION LOCALE =====
  
  login(credentials: LoginDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.baseUrl}/login`, credentials);
  }

  register(userData: RegisterDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.baseUrl}/register`, userData);
  }

  getDiscordUser(): Observable<DiscordUserDto> {
    return this.http.get<DiscordUserDto>(`${this.baseUrlDiscord}/user`);
  }

  // ===== GESTION DES TOKENS =====
  
  refreshToken(refreshTokenDto: RefreshTokenDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.baseUrl}/refresh`, refreshTokenDto);
  }

  logout(refreshToken: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, { refreshToken });
  }

  logoutAll(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/logout-all`, {});
  }

  getProfile(): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.baseUrl}/profile`);
  }

  getAvailableProviders(): Observable<{ providers: string[] }> {
    return this.http.get<{ providers: string[] }>(`${this.baseUrl}/providers`);
  }

  // OAuth URLs
  getGoogleAuthUrl(): string {
    return `${this.baseUrl}/google`;
  }

  getDiscordAuthUrl(): string {
    return `${this.baseUrl}/discord`;
  }  
}