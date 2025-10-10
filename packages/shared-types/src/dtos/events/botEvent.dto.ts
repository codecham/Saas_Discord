// packages/shared-types/src/dtos/gateway.dto.ts
import { EventType } from "../../enums/eventTypes.enum";

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


// ==========================================
// DTOs POUR DATA - Modération
// ==========================================

/** Data pour GUILD_BAN_ADD */
export interface BanEventData {
  targetUserId: string;
  targetUsername: string;
  targetDiscriminator?: string;
  targetAvatar?: string | null;
  moderatorId: string | null;
  moderatorUsername?: string;
  reason?: string;
}

/** Data pour GUILD_BAN_REMOVE */
export interface UnbanEventData {
  targetUserId: string;
  targetUsername: string;
  moderatorId: string | null;
  moderatorUsername?: string;
}

/** Data pour GUILD_MEMBER_REMOVE */
export interface MemberRemoveEventData {
  userId: string;
  username: string;
  discriminator?: string;
  avatar?: string | null;
  wasKicked: boolean;
  moderatorId?: string;
  moderatorUsername?: string;
  reason?: string;
  joinedAt: string;
  roles: string[];
}

/** Data pour GUILD_MEMBER_ADD */
export interface MemberAddEventData {
  userId: string;
  username: string;
  discriminator?: string;
  avatar?: string | null;
  bot: boolean;
  inviterId?: string;
  inviterUsername?: string;
  inviteCode?: string;
}

/** Data pour MESSAGE_DELETE */
export interface MessageDeleteEventData {
  messageId: string;
  channelId: string;
  authorId: string;
  authorUsername: string;
  content?: string;
  hasAttachments: boolean;
  attachmentCount: number;
  deletedBy?: {
    userId: string;
    username: string;
  };
}

/** Data pour MESSAGE_DELETE_BULK */
export interface MessageDeleteBulkEventData {
  channelId: string;
  messageIds: string[];
  count: number;
  moderatorId?: string;
  moderatorUsername?: string;
}

/** Data pour GUILD_AUDIT_LOG_ENTRY_CREATE */
export interface AuditLogEventData {
  action: AuditLogAction;
  executorId: string;
  executorUsername: string;
  targetId?: string;
  targetUsername?: string;
  targetType?: 'user' | 'channel' | 'role' | 'guild';
  changes?: Array<{
    key: string;
    oldValue?: any;
    newValue?: any;
  }>;
  reason?: string;
}

export enum AuditLogAction {
  MEMBER_KICK = 'MEMBER_KICK',
  MEMBER_BAN_ADD = 'MEMBER_BAN_ADD',
  MEMBER_BAN_REMOVE = 'MEMBER_BAN_REMOVE',
  MEMBER_UPDATE = 'MEMBER_UPDATE',
  MEMBER_ROLE_UPDATE = 'MEMBER_ROLE_UPDATE',
  MEMBER_TIMEOUT_ADD = 'MEMBER_TIMEOUT_ADD',
  MEMBER_TIMEOUT_REMOVE = 'MEMBER_TIMEOUT_REMOVE',
}

/** Data pour AUTO_MODERATION_ACTION */
export interface AutoModerationEventData {
  ruleId: string;
  ruleName: string;
  action: 'BLOCK_MESSAGE' | 'SEND_ALERT' | 'TIMEOUT';
  userId: string;
  username: string;
  channelId?: string;
  messageContent?: string;
  matchedKeyword?: string;
  matchedContent?: string;
}

// ==========================================
// DTOs POUR DATA - Invitations
// ==========================================

/** Data pour INVITE_CREATE */
export interface InviteCreateEventData {
  code: string;
  channelId: string;
  inviterId: string;
  inviterUsername: string;
  maxUses: number;
  maxAge: number;
  temporary: boolean;
  createdAt: string;
  expiresAt?: string;
}

/** Data pour INVITE_DELETE */
export interface InviteDeleteEventData {
  code: string;
  channelId: string;
  inviterId: string;
  inviterUsername: string;
}

/** Data pour INVITE_USE */
export interface InviteUseEventData {
  code: string;
  inviterId: string;
  inviterUsername: string;
  newMemberId: string;
  newMemberUsername: string;
  uses: number;
  maxUses: number;
}

// ==========================================
// DTOs POUR DATA - Serveur
// ==========================================

/** Data pour GUILD_SYNC */
export interface GuildSyncEventData {
  guilds: Array<{
    id: string;
    name: string;
    icon: string | null;
    ownerId: string;
    memberCount: number;
    features: string[];
    premiumTier: number;
    premiumSubscriptionCount: number;
  }>;
}

/** Data pour GUILD_CREATE */
export interface GuildCreateEventData {
  id: string;
  name: string;
  icon: string | null;
  ownerId: string;
  memberCount: number;
  features: string[];
  premiumTier: number;
  premiumSubscriptionCount: number;
  joinedAt: string;
}

/** Data pour GUILD_DELETE */
export interface GuildDeleteEventData {
  id: string;
  name: string;
  unavailable?: boolean;
}

/** Data pour GUILD_UPDATE */
export interface GuildUpdateEventData {
  id: string;
  changes: {
    name?: { old: string; new: string };
    icon?: { old: string | null; new: string | null };
    ownerId?: { old: string; new: string };
    memberCount?: { old: number; new: number };
    premiumTier?: { old: number; new: number };
    features?: { old: string[]; new: string[] };
  };
}

// ==========================================
// DTOs POUR DATA - Métriques agrégées
// ==========================================

/** Data pour METRICS_SNAPSHOT */
export interface MetricsSnapshotData {
  periodStart: number;
  periodEnd: number;
  periodDuration: number;
  metrics: {
    messages: {
      total: number;
      byChannel: Record<string, number>;
      byMember: Record<string, number>;
      topChannels: Array<{
        channelId: string;
        channelName: string;
        count: number;
      }>;
    };
    voice: {
      totalMinutes: number;
      uniqueUsers: number;
      byChannel: Record<string, number>;
      byMember: Record<string, number>;
      topChannels: Array<{
        channelId: string;
        channelName: string;
        minutes: number;
        peakUsers: number;
      }>;
      sessions: {
        count: number;
        avgDuration: number;
      };
    };
    reactions: {
      total: number;
      byEmoji: Record<string, number>;
      topEmojis: Array<{
        emoji: string;
        emojiId?: string;
        emojiName?: string;
        count: number;
      }>;
      byMember: Record<string, number>;
    };
    topActiveMembers: Array<{
      userId: string;
      username: string;
      avatar?: string | null;
      messages: number;
      voiceMinutes: number;
      reactions: number;
      activityScore: number;
      topChannels: Array<{
        channelId: string;
        channelName: string;
        messages: number;
        voiceMinutes: number;
      }>;
    }>;
  };
}

/** Data pour MEMBER_ACTIVITY_SNAPSHOT */
export interface MemberActivitySnapshotData {
  periodStart: number;
  periodEnd: number;
  periodDuration: number;
  members: Array<{
    userId: string;
    username: string;
    discriminator?: string;
    avatar?: string | null;
    messages: {
      total: number;
      byChannel: Record<string, number>;
    };
    voice: {
      totalMinutes: number;
      byChannel: Record<string, number>;
      sessions: number;
    };
    reactions: {
      added: number;
      received: number;
    };
    isNewMember?: boolean;
    firstSeen?: number;
    lastSeen: number;
  }>;
}
