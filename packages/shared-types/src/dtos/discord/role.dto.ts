/**
 * DTOs pour les rôles Discord
 * Documentation: https://discord.com/developers/docs/topics/permissions#role-object
 */

/**
 * Permissions Discord (bigint constants)
 * Note: Utilise des constantes au lieu d'enum car les permissions dépassent Number.MAX_SAFE_INTEGER
 */
export const DiscordPermissions = {
  CREATE_INSTANT_INVITE: 1n << 0n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_GUILD: 1n << 5n,
  ADD_REACTIONS: 1n << 6n,
  VIEW_AUDIT_LOG: 1n << 7n,
  PRIORITY_SPEAKER: 1n << 8n,
  STREAM: 1n << 9n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  SEND_TTS_MESSAGES: 1n << 12n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
  VIEW_GUILD_INSIGHTS: 1n << 19n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MUTE_MEMBERS: 1n << 22n,
  DEAFEN_MEMBERS: 1n << 23n,
  MOVE_MEMBERS: 1n << 24n,
  USE_VAD: 1n << 25n,
  CHANGE_NICKNAME: 1n << 26n,
  MANAGE_NICKNAMES: 1n << 27n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_WEBHOOKS: 1n << 29n,
  MANAGE_GUILD_EXPRESSIONS: 1n << 30n,
  USE_APPLICATION_COMMANDS: 1n << 31n,
  REQUEST_TO_SPEAK: 1n << 32n,
  MANAGE_EVENTS: 1n << 33n,
  MANAGE_THREADS: 1n << 34n,
  CREATE_PUBLIC_THREADS: 1n << 35n,
  CREATE_PRIVATE_THREADS: 1n << 36n,
  USE_EXTERNAL_STICKERS: 1n << 37n,
  SEND_MESSAGES_IN_THREADS: 1n << 38n,
  USE_EMBEDDED_ACTIVITIES: 1n << 39n,
  MODERATE_MEMBERS: 1n << 40n,
  VIEW_CREATOR_MONETIZATION_ANALYTICS: 1n << 41n,
  USE_SOUNDBOARD: 1n << 42n,
  USE_EXTERNAL_SOUNDS: 1n << 45n,
  SEND_VOICE_MESSAGES: 1n << 46n,
} as const;

export type DiscordPermission = typeof DiscordPermissions[keyof typeof DiscordPermissions];

/**
 * Tags d'un rôle
 */
export interface DiscordRoleTagsDTO {
  bot_id?: string;
  integration_id?: string;
  premium_subscriber?: null;
  subscription_listing_id?: string;
  available_for_purchase?: null;
  guild_connections?: null;
}

/**
 * Rôle Discord
 */
export interface DiscordRoleDTO {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  icon?: string | null;
  unicode_emoji?: string | null;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
  tags?: DiscordRoleTagsDTO;
}

/**
 * DTO pour créer un rôle
 */
export interface CreateRoleDTO {
  name?: string;
  permissions?: string;
  color?: number;
  hoist?: boolean;
  icon?: string | null;
  unicode_emoji?: string | null;
  mentionable?: boolean;
}

/**
 * DTO pour modifier un rôle
 */
export interface ModifyRoleDTO {
  name?: string | null;
  permissions?: string | null;
  color?: number | null;
  hoist?: boolean | null;
  icon?: string | null;
  unicode_emoji?: string | null;
  mentionable?: boolean | null;
}

/**
 * DTO pour modifier les positions des rôles
 */
export interface ModifyRolePositionsDTO {
  id: string;
  position?: number | null;
}

/**
 * Helper pour vérifier si un rôle a une permission
 */
export function hasPermission(rolePermissions: string, permission: bigint): boolean {
  const permissions = BigInt(rolePermissions);
  return (permissions & permission) === permission;
}

/**
 * Helper pour vérifier si un rôle a la permission ADMINISTRATOR
 */
export function isAdmin(rolePermissions: string): boolean {
  return hasPermission(rolePermissions, DiscordPermissions.ADMINISTRATOR);
}

/**
 * Helper pour générer l'URL de l'icône du rôle
 */
export function getRoleIconUrl(role: DiscordRoleDTO, size: number = 64): string | null {
  if (!role.icon) return null;

  return `https://cdn.discordapp.com/role-icons/${role.id}/${role.icon}.png?size=${size}`;
}