/**
 * DTOs pour les messages Discord
 * Documentation: https://discord.com/developers/docs/resources/channel#message-object
 */

/**
 * Types de messages
 */
export enum DiscordMessageType {
  DEFAULT = 0,
  RECIPIENT_ADD = 1,
  RECIPIENT_REMOVE = 2,
  CALL = 3,
  CHANNEL_NAME_CHANGE = 4,
  CHANNEL_ICON_CHANGE = 5,
  CHANNEL_PINNED_MESSAGE = 6,
  USER_JOIN = 7,
  GUILD_BOOST = 8,
  GUILD_BOOST_TIER_1 = 9,
  GUILD_BOOST_TIER_2 = 10,
  GUILD_BOOST_TIER_3 = 11,
  CHANNEL_FOLLOW_ADD = 12,
  GUILD_DISCOVERY_DISQUALIFIED = 14,
  GUILD_DISCOVERY_REQUALIFIED = 15,
  GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING = 16,
  GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING = 17,
  THREAD_CREATED = 18,
  REPLY = 19,
  CHAT_INPUT_COMMAND = 20,
  THREAD_STARTER_MESSAGE = 21,
  GUILD_INVITE_REMINDER = 22,
  CONTEXT_MENU_COMMAND = 23,
  AUTO_MODERATION_ACTION = 24,
}

/**
 * Flags de message
 */
export enum DiscordMessageFlags {
  CROSSPOSTED = 1 << 0,
  IS_CROSSPOST = 1 << 1,
  SUPPRESS_EMBEDS = 1 << 2,
  SOURCE_MESSAGE_DELETED = 1 << 3,
  URGENT = 1 << 4,
  HAS_THREAD = 1 << 5,
  EPHEMERAL = 1 << 6,
  LOADING = 1 << 7,
  FAILED_TO_MENTION_SOME_ROLES_IN_THREAD = 1 << 8,
}

/**
 * Embed Discord
 */
export interface DiscordEmbedDTO {
  title?: string;
  type?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: {
    text: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  image?: {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  thumbnail?: {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  video?: {
    url?: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  provider?: {
    name?: string;
    url?: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

/**
 * Attachement (fichier joint)
 */
export interface DiscordAttachmentDTO {
  id: string;
  filename: string;
  description?: string;
  content_type?: string;
  size: number;
  url: string;
  proxy_url: string;
  height?: number | null;
  width?: number | null;
  ephemeral?: boolean;
}

/**
 * Réaction sur un message
 */
export interface DiscordReactionDTO {
  count: number;
  me: boolean;
  emoji: {
    id: string | null;
    name: string | null;
    animated?: boolean;
  };
}

/**
 * Message Discord
 */
export interface DiscordMessageDTO {
  id: string;
  channel_id: string;
  author: any; // DiscordUserDTO
  content: string;
  timestamp: string;
  edited_timestamp: string | null;
  tts: boolean;
  mention_everyone: boolean;
  mentions: any[]; // DiscordUserDTO[]
  mention_roles: string[];
  mention_channels?: any[];
  attachments: DiscordAttachmentDTO[];
  embeds: DiscordEmbedDTO[];
  reactions?: DiscordReactionDTO[];
  nonce?: string | number;
  pinned: boolean;
  webhook_id?: string;
  type: DiscordMessageType;
  activity?: any;
  application?: any;
  application_id?: string;
  message_reference?: {
    message_id?: string;
    channel_id?: string;
    guild_id?: string;
    fail_if_not_exists?: boolean;
  };
  flags?: number;
  referenced_message?: DiscordMessageDTO | null;
  interaction?: any;
  thread?: any;
  components?: any[];
  sticker_items?: any[];
  position?: number;
}

/**
 * DTO pour créer un message
 */
export interface CreateMessageDTO {
  content?: string;
  tts?: boolean;
  embeds?: DiscordEmbedDTO[];
  allowed_mentions?: {
    parse?: ('roles' | 'users' | 'everyone')[];
    roles?: string[];
    users?: string[];
    replied_user?: boolean;
  };
  message_reference?: {
    message_id: string;
    channel_id?: string;
    guild_id?: string;
    fail_if_not_exists?: boolean;
  };
  components?: any[];
  sticker_ids?: string[];
  files?: any[]; // Pour les fichiers uploadés
  payload_json?: string;
  attachments?: Array<{
    id: number;
    filename: string;
    description?: string;
  }>;
  flags?: number;
}

/**
 * DTO pour éditer un message
 */
export interface EditMessageDTO {
  content?: string | null;
  embeds?: DiscordEmbedDTO[] | null;
  flags?: number | null;
  allowed_mentions?: {
    parse?: ('roles' | 'users' | 'everyone')[];
    roles?: string[];
    users?: string[];
    replied_user?: boolean;
  } | null;
  components?: any[] | null;
  files?: any[] | null;
  payload_json?: string | null;
  attachments?: Array<{
    id: number;
    filename: string;
    description?: string;
  }> | null;
}

/**
 * DTO pour bulk delete
 */
export interface BulkDeleteMessagesDTO {
  messages: string[]; // Array de message IDs (2-100)
}