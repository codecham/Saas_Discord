// DTOs d'authentification locale
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponseDto {
  user: UserDto;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

// DTOs OAuth
export interface OAuthUrlDto {
  url: string;
  state: string;
}

export interface OAuthCallbackDto {
  code: string;
  state?: string;
}

// User DTO (réponse publique)
export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
}

// DTOs pour la gestion des utilisateurs
export interface UpdateUserDto {
  name?: string;
  avatar?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// Enums
export enum OAuthProvider {
  GOOGLE = 'google',
  DISCORD = 'discord'
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR'
}

// Payload JWT (pour typer les tokens)
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthState {
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Interface pour les tokens (simplifie AuthResponseDto)
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Types pour les réponses d'erreur
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}