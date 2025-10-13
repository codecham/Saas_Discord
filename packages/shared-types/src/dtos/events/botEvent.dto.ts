// packages/shared-types/src/dtos/gateway.dto.ts
import { EventType } from "../../enums/eventTypes.enum";

export interface BotEventDto {
  type: EventType;           // Type d'événement
  guildId?: string;        // Index obligatoire
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