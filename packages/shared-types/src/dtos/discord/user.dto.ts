/**
 * DTOs pour les utilisateurs Discord
 * Documentation: https://discord.com/developers/docs/resources/user
 */

/**
 * Flags de l'utilisateur Discord
 */
export enum DiscordUserFlags {
  STAFF = 1 << 0,
  PARTNER = 1 << 1,
  HYPESQUAD = 1 << 2,
  BUG_HUNTER_LEVEL_1 = 1 << 3,
  HYPESQUAD_ONLINE_HOUSE_1 = 1 << 6,
  HYPESQUAD_ONLINE_HOUSE_2 = 1 << 7,
  HYPESQUAD_ONLINE_HOUSE_3 = 1 << 8,
  PREMIUM_EARLY_SUPPORTER = 1 << 9,
  TEAM_PSEUDO_USER = 1 << 10,
  BUG_HUNTER_LEVEL_2 = 1 << 14,
  VERIFIED_BOT = 1 << 16,
  VERIFIED_DEVELOPER = 1 << 17,
  CERTIFIED_MODERATOR = 1 << 18,
  BOT_HTTP_INTERACTIONS = 1 << 19,
  ACTIVE_DEVELOPER = 1 << 22,
}

/**
 * Flags premium de l'utilisateur
 */
export enum DiscordPremiumType {
  NONE = 0,
  NITRO_CLASSIC = 1,
  NITRO = 2,
  NITRO_BASIC = 3,
}

/**
 * Utilisateur Discord
 */
export interface DiscordUserDTO {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
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
  premium_type?: DiscordPremiumType;
  public_flags?: number;
  avatar_decoration?: string | null;
}

/**
 * Connexion de l'utilisateur (autres plateformes)
 */
export interface DiscordConnectionDTO {
  id: string;
  name: string;
  type: string;
  verified: boolean;
  friend_sync: boolean;
  show_activity: boolean;
  visibility: number;
}

export interface UserGuildsCategorizedDTO {
  active: GuildWithBotStatusDTO[];
  inactive: GuildWithBotStatusDTO[];
  notAdded: GuildWithBotStatusDTO[];
}

export interface GuildWithBotStatusDTO {
  // Données Discord
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
  
  // Données de notre DB (optionnel si guild pas en DB)
  dbId?: string;
  ownerDiscordId?: string;
  botAddedAt?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Helper pour générer l'URL de l'avatar
 */
export function getAvatarUrl(user: DiscordUserDTO, size: number = 128): string {
  if (!user.avatar) {
    // Avatar par défaut basé sur le discriminator
    const defaultAvatar = parseInt(user.discriminator || '0') % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
  }

  const format = user.avatar.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${format}?size=${size}`;
}

/**
 * Helper pour générer l'URL de la bannière
 */
export function getBannerUrl(user: DiscordUserDTO, size: number = 600): string | null {
  if (!user.banner) return null;

  const format = user.banner.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${format}?size=${size}`;
}