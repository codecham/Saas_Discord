/**
 * DTOs pour les membres des guilds Discord
 * Documentation: https://discord.com/developers/docs/resources/guild#guild-member-object
 */

/**
 * Membre d'une guild
 */
export interface DiscordGuildMemberDTO {
  user?: any; // DiscordUserDTO
  nick?: string | null;
  avatar?: string | null;
  roles: string[];
  joined_at: string;
  premium_since?: string | null;
  deaf: boolean;
  mute: boolean;
  flags: number;
  pending?: boolean;
  permissions?: string;
  communication_disabled_until?: string | null;
}

/**
 * DTO pour ajouter un membre à une guild
 */
export interface AddGuildMemberDTO {
  access_token: string;
  nick?: string;
  roles?: string[];
  mute?: boolean;
  deaf?: boolean;
}

/**
 * DTO pour modifier un membre
 */
export interface ModifyGuildMemberDTO {
  nick?: string | null;
  roles?: string[] | null;
  mute?: boolean | null;
  deaf?: boolean | null;
  channel_id?: string | null;
  communication_disabled_until?: string | null;
  flags?: number | null;
}

/**
 * DTO pour modifier le membre actuel (bot)
 */
export interface ModifyCurrentMemberDTO {
  nick?: string | null;
}

/**
 * DTO pour bannir un membre
 */
export interface CreateGuildBanDTO {
  delete_message_days?: number; // 0-7 (deprecated)
  delete_message_seconds?: number; // 0-604800 (7 days)
}

/**
 * Ban d'une guild
 */
export interface DiscordGuildBanDTO {
  reason: string | null;
  user: any; // DiscordUserDTO
}

/**
 * DTO pour rechercher des membres
 */
export interface SearchGuildMembersDTO {
  query: string;
  limit?: number; // 1-1000, default 1
}

/**
 * Helper pour générer l'URL de l'avatar du membre dans la guild
 */
export function getGuildMemberAvatarUrl(
  guildId: string,
  userId: string,
  avatar: string,
  size: number = 128,
): string {
  const format = avatar.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/guilds/${guildId}/users/${userId}/avatars/${avatar}.${format}?size=${size}`;
}

/**
 * Helper pour vérifier si un membre est en timeout
 */
export function isMemberTimedOut(member: DiscordGuildMemberDTO): boolean {
  if (!member.communication_disabled_until) return false;
  return new Date(member.communication_disabled_until) > new Date();
}

/**
 * Helper pour calculer le temps restant de timeout
 */
export function getTimeoutRemaining(member: DiscordGuildMemberDTO): number {
  if (!member.communication_disabled_until) return 0;
  const timeout = new Date(member.communication_disabled_until).getTime();
  const now = Date.now();
  return Math.max(0, timeout - now);
}