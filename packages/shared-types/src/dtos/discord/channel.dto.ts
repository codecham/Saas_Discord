/**
 * DTOs pour les channels Discord
 * Documentation: https://discord.com/developers/docs/resources/channel
 */

/**
 * Types de channels
 */
export enum DiscordChannelType {
  GUILD_TEXT = 0,
  DM = 1,
  GUILD_VOICE = 2,
  GROUP_DM = 3,
  GUILD_CATEGORY = 4,
  GUILD_ANNOUNCEMENT = 5,
  ANNOUNCEMENT_THREAD = 10,
  PUBLIC_THREAD = 11,
  PRIVATE_THREAD = 12,
  GUILD_STAGE_VOICE = 13,
  GUILD_DIRECTORY = 14,
  GUILD_FORUM = 15,
}

/**
 * Types de permission overwrite
 */
export enum DiscordPermissionOverwriteType {
  ROLE = 0,
  MEMBER = 1,
}

/**
 * Permission overwrite
 */
export interface DiscordPermissionOverwriteDTO {
  id: string;
  type: DiscordPermissionOverwriteType;
  allow: string;
  deny: string;
}

/**
 * Channel Discord
 */
export interface DiscordChannelDTO {
  id: string;
  type: DiscordChannelType;
  guild_id?: string;
  position?: number;
  permission_overwrites?: DiscordPermissionOverwriteDTO[];
  name?: string | null;
  topic?: string | null;
  nsfw?: boolean;
  last_message_id?: string | null;
  bitrate?: number;
  user_limit?: number;
  rate_limit_per_user?: number;
  recipients?: any[]; // DiscordUserDTO[]
  icon?: string | null;
  owner_id?: string;
  application_id?: string;
  parent_id?: string | null;
  last_pin_timestamp?: string | null;
  rtc_region?: string | null;
  video_quality_mode?: number;
  message_count?: number;
  member_count?: number;
  thread_metadata?: any;
  member?: any;
  default_auto_archive_duration?: number;
  permissions?: string;
  flags?: number;
  total_message_sent?: number;
}

/**
 * DTO pour créer un channel
 */
export interface CreateChannelDTO {
  name: string;
  type?: DiscordChannelType;
  topic?: string;
  bitrate?: number;
  user_limit?: number;
  rate_limit_per_user?: number;
  position?: number;
  permission_overwrites?: DiscordPermissionOverwriteDTO[];
  parent_id?: string;
  nsfw?: boolean;
}

/**
 * DTO pour modifier un channel
 */
export interface ModifyChannelDTO {
  name?: string;
  type?: DiscordChannelType;
  position?: number | null;
  topic?: string | null;
  nsfw?: boolean | null;
  rate_limit_per_user?: number | null;
  bitrate?: number | null;
  user_limit?: number | null;
  permission_overwrites?: DiscordPermissionOverwriteDTO[] | null;
  parent_id?: string | null;
  rtc_region?: string | null;
  video_quality_mode?: number | null;
  default_auto_archive_duration?: number | null;
  flags?: number;
}

/**
 * DTO pour modifier les permissions d'un channel
 */
export interface EditChannelPermissionsDTO {
  allow?: string;
  deny?: string;
  type: DiscordPermissionOverwriteType;
}