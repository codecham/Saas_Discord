/**
 * Constantes pour les endpoints de l'API Discord
 * Documentation: https://discord.com/developers/docs/reference
 */

// import { channel } from "diagnostics_channel";

export const DISCORD_ENDPOINTS = {
  // Guilds
  GUILD: (guildId: string) => `/guilds/${guildId}`,
  GUILD_PREVIEW: (guildId: string) => `/guilds/${guildId}/preview`,
  GUILD_CHANNELS: (guildId: string) => `/guilds/${guildId}/channels`,
  GUILD_MEMBERS: (guildId: string) => `/guilds/${guildId}/members`,
  GUILD_MEMBER: (guildId: string, userId: string) =>
    `/guilds/${guildId}/members/${userId}`,
  GUILD_BANS: (guildId: string) => `/guilds/${guildId}/bans`,
  GUILD_BAN: (guildId: string, userId: string) =>
    `/guilds/${guildId}/bans/${userId}`,
  GUILD_ROLES: (guildId: string) => `/guilds/${guildId}/roles`,
  GUILD_ROLE: (guildId: string, roleId: string) =>
    `/guilds/${guildId}/roles/${roleId}`,
  GUILD_PRUNE: (guildId: string) => `/guilds/${guildId}/prune`,
  GUILD_INVITES: (guildId: string) => `/guilds/${guildId}/invites`,
  GUILD_INTEGRATIONS: (guildId: string) => `/guilds/${guildId}/integrations`,
  GUILD_WIDGET: (guildId: string) => `/guilds/${guildId}/widget`,
  GUILD_VANITY_URL: (guildId: string) => `/guilds/${guildId}/vanity-url`,

  // Channels
  CHANNEL: (channelId: string) => `/channels/${channelId}`,
  CHANNEL_MESSAGES: (channelId: string) => `/channels/${channelId}/messages`,
  CHANNEL_MESSAGE: (channelId: string, messageId: string) =>
    `/channels/${channelId}/messages/${messageId}`,
  CHANNEL_INVITES: (channelId: string) => `/channels/${channelId}/invites`,
  CHANNEL_PERMISSIONS: (channelId: string, overwriteId: string) =>
    `/channels/${channelId}/permissions/${overwriteId}`,
  CHANNEL_PINS: (channelId: string) => `/channels/${channelId}/pins`,
  CHANNEL_PIN: (channelId: string, messageId: string) =>
    `/channels/${channelId}/pins/${messageId}`,
  CHANNEL_WEBHOOKS: (channelId: string) => `/channels/${channelId}/webhooks`,

  // Users
  USER: (userId: string) => `/users/${userId}`,
  CURRENT_USER: () => '/users/@me',
  CURRENT_USER_GUILDS: () => '/users/@me/guilds',
  CURRENT_USER_GUILD: (guildId: string) => `/users/@me/guilds/${guildId}`,
  CURRENT_USER_CHANNELS: () => '/users/@me/channels',
  CURRENT_USER_CONNECTIONS: () => '/users/@me/connections',

  // OAuth2
  OAUTH2_TOKEN: () => '/oauth2/token',
  OAUTH2_REVOKE: () => '/oauth2/token/revoke',
  OAUTH2_CURRENT_APPLICATION: () => '/oauth2/applications/@me',

  // Webhooks
  WEBHOOK: (webhookId: string) => `/webhooks/${webhookId}`,
  WEBHOOK_WITH_TOKEN: (webhookId: string, token: string) =>
    `/webhooks/${webhookId}/${token}`,

  // Emojis
  GUILD_EMOJIS: (guildId: string) => `/guilds/${guildId}/emojis`,
  GUILD_EMOJI: (guildId: string, emojiId: string) =>
    `/guilds/${guildId}/emojis/${emojiId}`,

  // Stickers
  GUILD_STICKERS: (guildId: string) => `/guilds/${guildId}/stickers`,
  GUILD_STICKER: (guildId: string, stickerId: string) =>
    `/guilds/${guildId}/stickers/${stickerId}`,
} as const;
