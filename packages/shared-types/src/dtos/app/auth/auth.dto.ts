/**
 * DTOs et interfaces pour l'authentification
 */

/**
 * Réponse de connexion Discord OAuth
 */
export interface LoginResponseDTO {
  accessToken: string;
  refreshToken: string;
  user: UserDTO;
}

/**
 * 🔒 NOUVEAU: Requête d'échange de session OAuth
 */
export interface ExchangeSessionRequestDTO {
  sessionId: string;
}

/**
 * 🔒 NOUVEAU: Réponse d'échange de session OAuth
 */
export interface ExchangeSessionResponseDTO {
  access_token: string;
  user: UserDTO;
}

/**
 * Utilisateur de l'application
 */
export interface UserDTO {
  id: string;
  discordId: string;
  username: string;
  discriminator: string | null;
  globalName: string | null;
  avatar: string | null;
  email: string | null;
  role: UserRole;
  createdAt?: string;
  lastLoginAt?: string;
}

/**
 * Rôles utilisateur
 */
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
}

/**
 * Requête de refresh token
 */
export interface RefreshTokenRequestDTO {}

/**
 * Réponse de refresh token
 */
export interface RefreshTokenResponseDTO {
  access_token: string;
}

/**
 * Statut d'authentification
 */
export interface AuthStatusDTO {
  authenticated: boolean;
  user: {
    id: string;
    username: string;
    role: string;
  };
}

/**
 * Payload JWT décodé
 */
export interface JwtPayloadDTO {
  sub: string; // userId
  discordId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}