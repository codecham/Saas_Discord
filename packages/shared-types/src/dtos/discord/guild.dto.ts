/**
 * DTOs pour les guilds (serveurs) Discord
 * Documentation: https://discord.com/developers/docs/resources/guild
 */

/**
 * Niveaux de vérification
 */
export enum DiscordVerificationLevel {
  NONE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  VERY_HIGH = 4,
}

/**
 * Niveaux de notification par défaut
 */
export enum DiscordDefaultMessageNotificationLevel {
  ALL_MESSAGES = 0,
  ONLY_MENTIONS = 1,
}

/**
 * Niveaux de filtre de contenu explicite
 */
export enum DiscordExplicitContentFilterLevel {
  DISABLED = 0,
  MEMBERS_WITHOUT_ROLES = 1,
  ALL_MEMBERS = 2,
}

/**
 * Niveaux de boost
 */
export enum DiscordPremiumTier {
  NONE = 0,
  TIER_1 = 1,
  TIER_2 = 2,
  TIER_3 = 3,
}

/**
 * Features de la guild
 */
export type DiscordGuildFeature =
  | 'ANIMATED_BANNER'
  | 'ANIMATED_ICON'
  | 'BANNER'
  | 'COMMERCE'
  | 'COMMUNITY'
  | 'DISCOVERABLE'
  | 'FEATURABLE'
  | 'INVITE_SPLASH'
  | 'MEMBER_VERIFICATION_GATE_ENABLED'
  | 'MONETIZATION_ENABLED'
  | 'MORE_STICKERS'
  | 'NEWS'
  | 'PARTNERED'
  | 'PREVIEW_ENABLED'
  | 'PRIVATE_THREADS'
  | 'ROLE_ICONS'
  | 'TICKETED_EVENTS_ENABLED'
  | 'VANITY_URL'
  | 'VERIFIED'
  | 'VIP_REGIONS'
  | 'WELCOME_SCREEN_ENABLED';

/**
 * Guild Discord complète
 */
export interface DiscordGuildDTO {
  id: string;
  name: string;
  icon: string | null;
  icon_hash?: string | null;
  splash: string | null;
  discovery_splash: string | null;
  owner?: boolean;
  owner_id: string;
  permissions?: string;
  region?: string | null;
  afk_channel_id: string | null;
  afk_timeout: number;
  widget_enabled?: boolean;
  widget_channel_id?: string | null;
  verification_level: DiscordVerificationLevel;
  default_message_notifications: DiscordDefaultMessageNotificationLevel;
  explicit_content_filter: DiscordExplicitContentFilterLevel;
  roles: any[]; // DiscordRoleDTO[]
  emojis: any[]; // DiscordEmojiDTO[]
  features: DiscordGuildFeature[];
  mfa_level: number;
  application_id: string | null;
  system_channel_id: string | null;
  system_channel_flags: number;
  rules_channel_id: string | null;
  max_presences?: number | null;
  max_members?: number;
  vanity_url_code: string | null;
  description: string | null;
  banner: string | null;
  premium_tier: DiscordPremiumTier;
  premium_subscription_count?: number;
  preferred_locale: string;
  public_updates_channel_id: string | null;
  max_video_channel_users?: number;
  approximate_member_count?: number;
  approximate_presence_count?: number;
  welcome_screen?: any;
  nsfw_level: number;
  stickers?: any[];
  premium_progress_bar_enabled: boolean;
}

/**
 * Guild partielle (dans la liste des guilds de l'utilisateur)
 */
export interface DiscordUserGuildDTO {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: DiscordGuildFeature[];
}

/**
 * DTO pour modifier une guild
 */
export interface ModifyGuildDTO {
  name?: string;
  verification_level?: DiscordVerificationLevel | null;
  default_message_notifications?: DiscordDefaultMessageNotificationLevel | null;
  explicit_content_filter?: DiscordExplicitContentFilterLevel | null;
  afk_channel_id?: string | null;
  afk_timeout?: number;
  icon?: string | null;
  owner_id?: string;
  splash?: string | null;
  discovery_splash?: string | null;
  banner?: string | null;
  system_channel_id?: string | null;
  system_channel_flags?: number;
  rules_channel_id?: string | null;
  public_updates_channel_id?: string | null;
  preferred_locale?: string | null;
  features?: DiscordGuildFeature[];
  description?: string | null;
  premium_progress_bar_enabled?: boolean;
}

/**
 * Helper pour générer l'URL de l'icône de la guild
 */
export function getGuildIconUrl(guild: DiscordGuildDTO | DiscordUserGuildDTO, size: number = 128): string | null {
  if (!guild.icon) return null;

  const format = guild.icon.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${format}?size=${size}`;
}

/**
 * Helper pour générer l'URL de la bannière de la guild
 */
export function getGuildBannerUrl(guild: DiscordGuildDTO, size: number = 600): string | null {
  if (!guild.banner) return null;

  const format = guild.banner.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}.${format}?size=${size}`;
}