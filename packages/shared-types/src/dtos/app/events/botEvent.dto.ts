// packages/shared-types/src/dtos/gateway.dto.ts
import { EventType } from "../../../enums/eventTypes.enum";

export interface BotEventDto {
  type: EventType;           // Type d'événement
  guildId: string;        // Index obligatoire
  userId?: string;        // Index pour recherches utilisateur
  channelId?: string;     // Index pour recherches channel  
  messageId?: string;     // Pour les événements de message
  roleId?: string;        // Pour les événements de rôles
  timestamp: number;        // Index pour tri chronologique
  data?: any;            // Données supplémentaires non-recherchables
}

/*
    MESSAGES LISTENERS
*/

export interface MessageCreateEventData {
  // Informations de base
  content: string;
  authorId: string;
  authorUsername: string;
  authorDiscriminator?: string;
  authorGlobalName?: string;
  authorBot: boolean;
  
  // Informations du message
  messageType: number; // MessageType enum
  hasAttachments: boolean;
  attachmentCount: number;
  attachments?: Array<{
    id: string;
    filename: string;
    size: number;
    url: string;
    contentType?: string;
  }>;
  
  // Embeds
  hasEmbeds: boolean;
  embedCount: number;
  
  // Mentions
  mentionedUserIds: string[];
  mentionedRoleIds: string[];
  mentionsEveryone: boolean;
  
  // Thread/Reply
  isReply: boolean;
  replyToMessageId?: string;
  replyToAuthorId?: string;
  
  // Stickers
  hasStickerIds: string[];
  
  // Timestamps
  createdAt: Date;
  editedAt?: Date;
  
  // Channel context
  channelName: string;
  channelType: number;
}

export interface MessageUpdateEventData {
  // Contenu
  oldContent?: string; // undefined si message pas en cache
  newContent: string;
  
  // Informations auteur
  authorId: string;
  authorUsername: string;
  authorBot: boolean;
  
  // Attachments
  hasAttachments: boolean;
  attachmentCount: number;
  attachments?: Array<{
    id: string;
    filename: string;
    size: number;
    url: string;
    contentType?: string;
  }>;
  
  // Embeds (peuvent être ajoutés/modifiés)
  hasEmbeds: boolean;
  embedCount: number;
  
  // Timestamps
  editedAt: Date;
  originalCreatedAt: Date;
  
  // Channel context
  channelName: string;
  channelType: number;
}

export interface MessageDeleteEventData {
  // Informations auteur
  authorId: string;
  authorUsername: string;
  authorBot: boolean;
  
  // Contenu (seulement si message en cache)
  content?: string;
  
  // Attachments (seulement si message en cache)
  hasAttachments: boolean;
  attachmentCount: number;
  attachments?: Array<{
    id: string;
    filename: string;
    size: number;
    url: string;
    contentType?: string;
  }>;
  
  // Embeds (seulement si message en cache)
  hasEmbeds: boolean;
  embedCount: number;
  
  // Timestamps
  createdAt: Date;
  deletedAt: Date;
  
  // Channel context
  channelName: string;
  channelType: number;
}

export interface MessageDeleteBulkEventData {
  // IDs des messages supprimés
  messageIds: string[];
  
  // Nombre total de messages supprimés
  count: number;
  
  // Informations du channel
  channelId: string;
  channelName: string;
  channelType: number;
  
  // Messages en cache (si disponibles)
  cachedMessages?: Array<{
    messageId: string;
    authorId: string;
    authorUsername: string;
    content?: string;
    createdAt: Date;
  }>;
  
  // Statistiques
  cachedCount: number; // Nombre de messages qui étaient en cache
  
  // Timestamp
  deletedAt: Date;
}


/*
    MEMBERS LISTENERS
*/

export interface MemberAddEventData {
  // Informations utilisateur
  userId: string;
  username: string;
  discriminator?: string;
  globalName?: string;
  avatar?: string | null;
  avatarURL?: string;
  bot: boolean;
  
  // Informations membre
  joinedAt: Date;
  accountCreatedAt: Date;
  
  // Statistiques
  accountAgeInDays: number;
  
  // Contexte serveur
  guildMemberCount: number;
}

export interface MemberRemoveEventData {
  // Informations utilisateur
  userId: string;
  username: string;
  discriminator?: string;
  globalName?: string;
  avatar?: string | null;
  avatarURL?: string;
  bot: boolean;
  
  // Informations membre (si en cache)
  joinedAt?: Date;
  roles?: string[]; // IDs des rôles
  nickname?: string;
  
  // Statistiques
  membershipDurationInDays?: number; // Si joinedAt disponible
  
  // Contexte serveur
  guildMemberCount: number;
  leftAt: Date;
}

export interface MemberUpdateEventData {
  // Informations utilisateur
  userId: string;
  username: string;
  bot: boolean;
  
  // Changements détectés
  changes: {
    // Nickname
    nickname?: {
      old?: string;
      new?: string;
    };
    
    // Rôles
    roles?: {
      added: Array<{
        id: string;
        name: string;
      }>;
      removed: Array<{
        id: string;
        name: string;
      }>;
    };
    
    // Avatar du serveur
    avatar?: {
      old?: string;
      new?: string;
    };
    
    // Timeout
    communicationDisabledUntil?: {
      old?: Date;
      new?: Date;
    };
    
    // Pending (membre en attente de vérification)
    pending?: {
      old: boolean;
      new: boolean;
    };
  };
  
  // État actuel
  currentNickname?: string;
  currentRoles: string[]; // IDs
  isCommunicationDisabled: boolean;
  communicationDisabledUntil?: Date;
}


/*
    MODERATION LISTENERS
*/

export interface GuildBanAddEventData {
  // Informations utilisateur banni
  userId: string;
  username: string;
  discriminator?: string;
  globalName?: string;
  avatar?: string | null;
  bot: boolean;
  
  // Raison du ban (si fournie)
  reason?: string;
  
  // Timestamp
  bannedAt: Date;
  
  // Contexte serveur
  guildMemberCount: number;
}

export interface GuildBanRemoveEventData {
  // Informations utilisateur unbanned
  userId: string;
  username: string;
  discriminator?: string;
  globalName?: string;
  avatar?: string | null;
  bot: boolean;
  
  // Timestamp
  unbannedAt: Date;
  
  // Contexte serveur
  guildMemberCount: number;
}

export interface AuditLogEntryCreateEventData {
  // Informations de l'action
  actionType: number; // AuditLogEvent enum
  actionName: string; // Nom lisible de l'action
  
  // Qui a effectué l'action
  executorId: string;
  executorUsername: string;
  executorBot: boolean;
  
  // Sur qui/quoi
  targetId?: string;
  targetType?: string; // 'user' | 'channel' | 'role' | 'guild' | 'webhook' | 'emoji' | 'message'
  
  // Détails
  reason?: string;
  
  // Changements (pour les updates)
  changes?: Array<{
    key: string;
    oldValue?: any;
    newValue?: any;
  }>;
  
  // Métadonnées spécifiques selon le type d'action
  extra?: {
    // Pour les timeouts
    timeoutDuration?: number; // en secondes
    
    // Pour les suppressions de messages
    deletedMessageCount?: number;
    
    // Pour les channels
    channelId?: string;
    
    // Pour les rôles
    roleId?: string;
    roleName?: string;
    
    // Autres données contextuelles
    [key: string]: any;
  };
  
  // Timestamp
  createdAt: Date;
}

export interface AutoModerationActionExecutionEventData {
  // Informations sur la règle
  ruleId: string;
  ruleName?: string;
  ruleTriggerType: number; // AutoModerationRuleTriggerType
  
  // Action exécutée
  ruleActionType: number; // AutoModerationActionType
  
  // Utilisateur concerné
  userId: string;
  username: string;
  
  // Contexte
  channelId?: string;
  messageId?: string;
  alertSystemMessageId?: string;
  
  // Contenu qui a déclenché la règle
  content?: string;
  matchedKeyword?: string;
  matchedContent?: string;
  
  // Timestamp
  executedAt: Date;
}


/*
    REACTION LISTENERS
*/

export interface ReactionAddEventData {
  emoji: {
    id?: string;
    name: string;
    animated?: boolean;
  };
  userId: string;
  username: string;
  messageAuthorId?: string;
}

export interface ReactionRemoveEventData {
  emoji: {
    id?: string;
    name: string;
    animated?: boolean;
  };
  userId: string;
  username: string;
  messageAuthorId?: string;
}

export interface ReactionRemoveAllEventData {
  removedReactions: Array<{
    emoji: {
      id?: string;
      name: string;
    };
    count: number;
  }>;
}

export interface ReactionRemoveEmojiEventData {
  emoji: {
    id?: string;
    name: string;
    animated?: boolean;
  };
  count: number;
}


/*
    VOICE LISTENERS
*/

export interface VoiceStateUpdateEventData {
  userId: string;
  username: string;
  
  oldChannelId?: string;
  oldChannelName?: string;
  newChannelId?: string;
  newChannelName?: string;
  
  action: 'join' | 'leave' | 'move' | 'mute' | 'unmute' | 'deafen' | 'undeafen' | 'self_mute' | 'self_unmute' | 'self_deafen' | 'self_undeafen' | 'stream_start' | 'stream_stop' | 'video_start' | 'video_stop';
  
  changes: {
    serverMute?: { old: boolean; new: boolean };
    serverDeaf?: { old: boolean; new: boolean };
    selfMute?: { old: boolean; new: boolean };
    selfDeaf?: { old: boolean; new: boolean };
    selfVideo?: { old: boolean; new: boolean };
    streaming?: { old: boolean; new: boolean };
  };
  
  currentState: {
    channelId?: string;
    channelName?: string;
    serverMute: boolean;
    serverDeaf: boolean;
    selfMute: boolean;
    selfDeaf: boolean;
    selfVideo: boolean;
    streaming: boolean;
  };
}

/*
    CHANNELS LISTENERS
*/

export interface ChannelCreateEventData {
  channelId: string;
  channelName: string;
  channelType: number; // ChannelType enum
  
  parentId?: string;
  parentName?: string;
  
  position: number;
  
  // Permissions
  permissionOverwrites?: Array<{
    id: string;
    type: number; // 0 = role, 1 = member
    allow: string;
    deny: string;
  }>;
  
  // Text channels
  topic?: string;
  nsfw?: boolean;
  rateLimitPerUser?: number; // slowmode en secondes
  
  // Voice channels
  bitrate?: number;
  userLimit?: number;
  
  createdAt: Date;
}

export interface ChannelUpdateEventData {
  channelId: string;
  channelName: string;
  channelType: number;
  
  changes: {
    name?: {
      old: string;
      new: string;
    };
    
    topic?: {
      old?: string;
      new?: string;
    };
    
    nsfw?: {
      old: boolean;
      new: boolean;
    };
    
    rateLimitPerUser?: {
      old: number;
      new: number;
    };
    
    bitrate?: {
      old: number;
      new: number;
    };
    
    userLimit?: {
      old: number;
      new: number;
    };
    
    parent?: {
      oldId?: string;
      oldName?: string;
      newId?: string;
      newName?: string;
    };
    
    position?: {
      old: number;
      new: number;
    };
    
    permissionOverwrites?: {
      added: Array<{
        id: string;
        type: number;
        allow: string;
        deny: string;
      }>;
      removed: Array<{
        id: string;
        type: number;
      }>;
      updated: Array<{
        id: string;
        type: number;
        oldAllow: string;
        newAllow: string;
        oldDeny: string;
        newDeny: string;
      }>;
    };
  };
  
  updatedAt: Date;
}

export interface ChannelDeleteEventData {
  channelId: string;
  channelName: string;
  channelType: number;
  
  parentId?: string;
  parentName?: string;
  
  position: number;
  
  // Statistiques si disponibles
  messageCount?: number;
  
  deletedAt: Date;
}

export interface ChannelPinsUpdateEventData {
  channelId: string;
  channelName: string;
  channelType: number;
  
  lastPinTimestamp?: Date; // undefined si tous les pins ont été retirés
  
  updatedAt: Date;
}


/*
    ROLES LISTENERS
*/

export interface RoleCreateEventData {
  roleId: string;
  roleName: string;
  
  color: number;
  hoist: boolean; // Affiché séparément dans la liste des membres
  position: number;
  permissions: string; // Bitfield des permissions
  
  mentionable: boolean;
  managed: boolean; // Géré par une intégration (bot, boost, etc.)
  
  icon?: string | null;
  unicodeEmoji?: string | null;
  
  createdAt: Date;
}

export interface RoleUpdateEventData {
  roleId: string;
  roleName: string;
  
  changes: {
    name?: {
      old: string;
      new: string;
    };
    
    color?: {
      old: number;
      new: number;
    };
    
    hoist?: {
      old: boolean;
      new: boolean;
    };
    
    position?: {
      old: number;
      new: number;
    };
    
    permissions?: {
      old: string;
      new: string;
      addedPermissions: string[];
      removedPermissions: string[];
    };
    
    mentionable?: {
      old: boolean;
      new: boolean;
    };
    
    icon?: {
      old?: string | null;
      new?: string | null;
    };
    
    unicodeEmoji?: {
      old?: string | null;
      new?: string | null;
    };
  };
  
  updatedAt: Date;
}

export interface RoleDeleteEventData {
  roleId: string;
  roleName: string;
  
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  
  mentionable: boolean;
  managed: boolean;
  
  memberCount?: number; // Nombre de membres qui avaient ce rôle (si disponible)
  
  deletedAt: Date;
}

/*
    INVITES LISTENERS
*/

export interface InviteCreateEventData {
  code: string;
  channelId: string;
  channelName: string;
  
  inviterId?: string;
  inviterUsername?: string;
  inviterBot?: boolean;
  
  maxAge: number; // Durée de validité en secondes (0 = infini)
  maxUses: number; // Nombre d'utilisations max (0 = illimité)
  temporary: boolean; // Adhésion temporaire
  
  createdAt: Date;
  expiresAt?: Date; // Calculé si maxAge > 0
  
  targetType?: number; // InviteTargetType (stream, embedded application)
  targetUserId?: string;
  targetUsername?: string;
  targetApplicationId?: string;
}

export interface InviteDeleteEventData {
  code: string;
  channelId: string;
  channelName: string;
  
  inviterId?: string;
  inviterUsername?: string;
  
  uses?: number; // Nombre d'utilisations avant suppression (si disponible)
  maxUses?: number;
  createdAt?: Date;
  
  deletedAt: Date;
  reason?: 'expired' | 'max_uses' | 'manual' | 'unknown'; // Raison de la suppression (si détectable)
}

/*
    THREADS LISTENERS
*/

export interface ThreadCreateEventData {
  threadId: string;
  threadName: string;
  
  parentChannelId: string;
  parentChannelName: string;
  
  ownerId: string;
  ownerUsername: string;
  ownerBot: boolean;
  
  type: number; // ChannelType.PublicThread | PrivateThread | AnnouncementThread
  
  autoArchiveDuration: number; // Minutes (60, 1440, 4320, 10080)
  archived: boolean;
  archiveTimestamp?: Date;
  locked: boolean;
  
  invitable?: boolean; // Pour les threads privés
  
  messageCount?: number;
  memberCount?: number;
  
  createdAt: Date;
  
  messageId?: string; // ID du message d'origine si thread créé depuis un message
}

export interface ThreadUpdateEventData {
  threadId: string;
  threadName: string;
  
  parentChannelId: string;
  
  changes: {
    name?: {
      old: string;
      new: string;
    };
    
    archived?: {
      old: boolean;
      new: boolean;
    };
    
    autoArchiveDuration?: {
      old: number;
      new: number;
    };
    
    locked?: {
      old: boolean;
      new: boolean;
    };
    
    rateLimitPerUser?: {
      old: number;
      new: number;
    };
    
    flags?: {
      old: number;
      new: number;
    };
    
    appliedTags?: {
      old: string[];
      new: string[];
      added: string[];
      removed: string[];
    };
  };
  
  updatedAt: Date;
}

export interface ThreadDeleteEventData {
  threadId: string;
  threadName: string;
  
  parentChannelId: string;
  parentChannelName: string;
  
  type: number;
  
  ownerId: string;
  ownerUsername: string;
  
  archived: boolean;
  locked: boolean;
  
  messageCount?: number;
  memberCount?: number;
  
  createdAt: Date;
  deletedAt: Date;
  
  lifetime: number; // Durée de vie en millisecondes
}

export interface ThreadMembersUpdateEventData {
  threadId: string;
  threadName: string;
  
  parentChannelId: string;
  
  addedMembers: Array<{
    userId: string;
    username: string;
    joinedAt: Date;
  }>;
  
  removedMemberIds: string[];
  
  memberCount: number; // Nouveau total de membres
  
  updatedAt: Date;
}

/*
    EMOJIS LISTENERS
*/

export interface EmojiCreateEventData {
  emojiId: string;
  emojiName: string;
  
  animated: boolean;
  
  creatorId?: string;
  creatorUsername?: string;
  creatorBot?: boolean;
  
  managed: boolean; // true si l'emoji vient d'une intégration (Twitch, etc)
  requireColons: boolean;
  available: boolean;
  
  roles: string[]; // IDs des rôles qui peuvent utiliser cet emoji (vide = tout le monde)
  
  createdAt: Date;
}

export interface EmojiUpdateEventData {
  emojiId: string;
  emojiName: string;
  
  animated: boolean;
  
  changes: {
    name?: {
      old: string;
      new: string;
    };
    
    roles?: {
      old: string[];
      new: string[];
      added: string[];
      removed: string[];
    };
  };
  
  updatedAt: Date;
}

export interface EmojiDeleteEventData {
  emojiId: string;
  emojiName: string;
  
  animated: boolean;
  
  managed: boolean;
  requireColons: boolean;
  
  roles: string[];
  
  createdAt?: Date;
  deletedAt: Date;
  
  lifetime?: number; // Durée de vie en millisecondes (si createdAt disponible)
}

/*
    STICKERS LISTENERS
*/

export interface StickerCreateEventData {
  stickerId: string;
  stickerName: string;
  
  description?: string;
  
  tags?: string; // Tags associés au sticker (emoji par exemple)
  
  type: number; // StickerType (STANDARD = 1, GUILD = 2)
  formatType: number; // StickerFormatType (PNG = 1, APNG = 2, LOTTIE = 3, GIF = 4)
  
  creatorId?: string;
  creatorUsername?: string;
  creatorBot?: boolean;
  
  available: boolean;
  
  createdAt: Date;
}

export interface StickerUpdateEventData {
  stickerId: string;
  stickerName: string;
  
  changes: {
    name?: {
      old: string;
      new: string;
    };
    
    description?: {
      old?: string;
      new?: string;
    };
    
    tags?: {
      old?: string;
      new?: string;
    };
  };
  
  updatedAt: Date;
}

export interface StickerDeleteEventData {
  stickerId: string;
  stickerName: string;
  
  description?: string;
  tags?: string;
  
  type: number;
  formatType: number;
  
  available: boolean;
  
  createdAt?: Date;
  deletedAt: Date;
  
  lifetime?: number; // Durée de vie en millisecondes (si createdAt disponible)
}

/*
    SCHEDULED EVENTS LISTENERS
*/

export interface ScheduledEventCreateEventData {
  eventId: string;
  eventName: string;
  
  description?: string;
  
  scheduledStartTime: Date;
  scheduledEndTime?: Date;
  
  entityType: number; // ScheduledEventEntityType (STAGE_INSTANCE = 1, VOICE = 2, EXTERNAL = 3)
  entityMetadata?: {
    location?: string; // Pour les événements externes
  };
  
  channelId?: string;
  channelName?: string;
  
  creatorId?: string;
  creatorUsername?: string;
  creatorBot?: boolean;
  
  status: number; // ScheduledEventStatus (SCHEDULED = 1, ACTIVE = 2, COMPLETED = 3, CANCELED = 4)
  
  privacyLevel: number; // ScheduledEventPrivacyLevel (GUILD_ONLY = 2)
  
  userCount?: number; // Nombre d'utilisateurs intéressés
  
  image?: string; // URL de l'image de couverture
  
  createdAt: Date;
}

export interface ScheduledEventUpdateEventData {
  eventId: string;
  eventName: string;
  
  changes: {
    name?: {
      old: string;
      new: string;
    };
    
    description?: {
      old?: string;
      new?: string;
    };
    
    scheduledStartTime?: {
      old: Date;
      new: Date;
    };
    
    scheduledEndTime?: {
      old?: Date;
      new?: Date;
    };
    
    status?: {
      old: number;
      new: number;
    };
    
    channelId?: {
      old?: string;
      new?: string;
    };
    
    entityMetadata?: {
      old?: {
        location?: string;
      };
      new?: {
        location?: string;
      };
    };
    
    image?: {
      old?: string;
      new?: string;
    };
  };
  
  updatedAt: Date;
}

export interface ScheduledEventDeleteEventData {
  eventId: string;
  eventName: string;
  
  description?: string;
  
  scheduledStartTime: Date;
  scheduledEndTime?: Date;
  
  entityType: number;
  channelId?: string;
  
  status: number;
  
  userCount?: number;
  
  createdAt?: Date;
  deletedAt: Date;
  
  wasCanceled: boolean; // true si status = CANCELED, false si simplement supprimé
}

export interface ScheduledEventUserAddEventData {
  eventId: string;
  eventName: string;
  
  userId: string;
  username: string;
  userBot: boolean;
  
  scheduledStartTime: Date;
  
  totalInterestedUsers?: number; // Nombre total d'utilisateurs intéressés après cet ajout
  
  addedAt: Date;
}

export interface ScheduledEventUserRemoveEventData {
  eventId: string;
  eventName: string;
  
  userId: string;
  username: string;
  userBot: boolean;
  
  scheduledStartTime: Date;
  
  totalInterestedUsers?: number; // Nombre total d'utilisateurs intéressés après ce retrait
  
  removedAt: Date;
}

/*
    WEBHOOKS LISTENERS
*/

export interface WebhooksUpdateEventData {
  channelId: string;
  channelName: string;
  channelType: number;
  
  updatedAt: Date;
}

/*
    STAGE LISTENERS
*/

export interface StageInstanceCreateEventData {
  stageId: string;
  channelId: string;
  channelName: string;
  
  topic: string;
  
  privacyLevel: number; // StageInstancePrivacyLevel (PUBLIC = 1, GUILD_ONLY = 2)
  discoverableDisabled: boolean;
  
  guildScheduledEventId?: string; // ID de l'événement planifié associé (si existe)
  
  createdAt: Date;
}

export interface StageInstanceUpdateEventData {
  stageId: string;
  channelId: string;
  channelName: string;
  
  changes: {
    topic?: {
      old: string;
      new: string;
    };
    
    privacyLevel?: {
      old: number;
      new: number;
    };
    
    discoverableDisabled?: {
      old: boolean;
      new: boolean;
    };
  };
  
  updatedAt: Date;
}

export interface StageInstanceDeleteEventData {
  stageId: string;
  channelId: string;
  channelName: string;
  
  topic: string;
  
  privacyLevel: number;
  discoverableDisabled: boolean;
  
  guildScheduledEventId?: string;
  
  createdAt?: Date;
  deletedAt: Date;
  
  duration?: number; // Durée en millisecondes (si createdAt disponible)
}

/*
    INTEGRATIONS LISTENERS
*/

export interface GuildIntegrationsUpdateEventData {
  updatedAt: Date;
}


/*
    USER LISTENERS
*/

export interface UserUpdateEventData {
  userId: string;
  
  changes: {
    username?: {
      old: string;
      new: string;
    };
    
    discriminator?: {
      old?: string;
      new?: string;
    };
    
    globalName?: {
      old?: string;
      new?: string;
    };
    
    avatar?: {
      old?: string;
      new?: string;
    };
    
    banner?: {
      old?: string;
      new?: string;
    };
    
    accentColor?: {
      old?: number;
      new?: number;
    };
  };
  
  updatedAt: Date;
}

export interface PresenceUpdateEventData {
  userId: string;
  username: string;
  
  changes: {
    status?: {
      old?: string; // online, idle, dnd, offline
      new: string;
    };
    
    activities?: {
      old: Array<{
        name: string;
        type: number; // ActivityType (Playing = 0, Streaming = 1, Listening = 2, Watching = 3, Custom = 4, Competing = 5)
        details?: string;
        state?: string;
        url?: string;
      }>;
      new: Array<{
        name: string;
        type: number;
        details?: string;
        state?: string;
        url?: string;
      }>;
    };
    
    clientStatus?: {
      old?: {
        web?: string;
        mobile?: string;
        desktop?: string;
      };
      new?: {
        web?: string;
        mobile?: string;
        desktop?: string;
      };
    };
  };
  
  updatedAt: Date;
}

export interface TypingStartEventData {
  userId: string;
  username: string;
  userBot: boolean;
  
  channelId: string;
  channelName: string;
  channelType: number;
  
  startedAt: Date;
}

/*
    INTERACTIONS LISTENERS
*/

export interface InteractionCreateEventData {
  interactionId: string;
  interactionType: number; // InteractionType (Ping = 1, ApplicationCommand = 2, MessageComponent = 3, ApplicationCommandAutocomplete = 4, ModalSubmit = 5)
  
  userId: string;
  username: string;
  userBot: boolean;
  
  channelId?: string;
  channelName?: string;
  channelType?: number;
  
  commandName?: string; // Pour les commandes slash
  commandType?: number; // ApplicationCommandType (ChatInput = 1, User = 2, Message = 3)
  
  customId?: string; // Pour les boutons, select menus, modals
  componentType?: number; // ComponentType (Button = 2, StringSelect = 3, TextInput = 4, UserSelect = 5, RoleSelect = 6, MentionableSelect = 7, ChannelSelect = 8)
  
  values?: string[]; // Valeurs sélectionnées (select menus)
  
  deferred: boolean; // Si l'interaction a été defer
  replied: boolean; // Si une réponse a été envoyée
  ephemeral?: boolean; // Si la réponse est éphémère
  
  locale?: string; // Locale de l'utilisateur
  guildLocale?: string; // Locale de la guilde
  
  createdAt: Date;
}

/*
    AUTOMOD RULES LISTENERS
*/

export interface AutoModerationRuleCreateEventData {
  ruleId: string;
  ruleName: string;
  
  creatorId: string;
  creatorUsername: string;
  
  eventType: number; // AutoModerationRuleEventType (MESSAGE_SEND = 1)
  triggerType: number; // AutoModerationRuleTriggerType (KEYWORD = 1, SPAM = 3, KEYWORD_PRESET = 4, MENTION_SPAM = 5)
  
  triggerMetadata?: {
    keywordFilter?: string[];
    regexPatterns?: string[];
    presets?: number[];
    allowList?: string[];
    mentionTotalLimit?: number;
    mentionRaidProtectionEnabled?: boolean;
  };
  
  actions: Array<{
    type: number; // AutoModerationActionType (BLOCK_MESSAGE = 1, SEND_ALERT_MESSAGE = 2, TIMEOUT = 3)
    metadata?: {
      channelId?: string;
      durationSeconds?: number;
      customMessage?: string;
    };
  }>;
  
  enabled: boolean;
  
  exemptRoles: string[];
  exemptChannels: string[];
  
  createdAt: Date;
}

export interface AutoModerationRuleUpdateEventData {
  ruleId: string;
  ruleName: string;
  
  changes: {
    name?: {
      old: string;
      new: string;
    };
    
    enabled?: {
      old: boolean;
      new: boolean;
    };
    
    eventType?: {
      old: number;
      new: number;
    };
    
    triggerMetadata?: {
      old?: any;
      new?: any;
    };
    
    actions?: {
      old: Array<{
        type: number;
        metadata?: any;
      }>;
      new: Array<{
        type: number;
        metadata?: any;
      }>;
    };
    
    exemptRoles?: {
      old: string[];
      new: string[];
      added: string[];
      removed: string[];
    };
    
    exemptChannels?: {
      old: string[];
      new: string[];
      added: string[];
      removed: string[];
    };
  };
  
  updatedAt: Date;
}

export interface AutoModerationRuleDeleteEventData {
  ruleId: string;
  ruleName: string;
  
  creatorId: string;
  creatorUsername: string;
  
  eventType: number;
  triggerType: number;
  
  enabled: boolean;
  
  actionsCount: number;
  exemptRolesCount: number;
  exemptChannelsCount: number;
  
  deletedAt: Date;
  
}