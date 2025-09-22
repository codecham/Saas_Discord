// packages/shared-types/src/dtos/discord.dto.ts

// N'oublie pas d'ajouter ceci dans packages/shared-types/src/index.ts :
// export * from './dtos/discord.dto';

export interface DiscordGatewayDto {
  url: string;
}

export interface DiscordUserDto {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  banner?: string | null;
  accent_color?: number | null;
  locale?: string;
  verified?: boolean;
  email?: string | null;
  flags?: number;
  premium_type?: number;
  public_flags?: number;
}

export interface DiscordGuildDto {
  id: string;
  name: string;
  icon: string | null;
  iconUrl: string | null;
  owner: boolean;
  permissions: string;
  hasAdminRights: boolean;
  memberCount?: number;
  features?: string[];
}

export interface DiscordApiErrorDto {
  message: string;
  code: number;
}

// DTOs "Result" gardés seulement pour les endpoints de diagnostic
export interface DiscordPingResultDto {
  success: boolean;
  latency?: number;
  gateway?: string;
  error?: string;
}