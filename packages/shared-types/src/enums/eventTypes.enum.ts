// packages/shared-types/src/enums/eventTypes.enum.ts

/**
 * Tous les types d'événements Discord
 * Conserve les événements existants + ajoute les nouveaux pour Phase 1
 */
export enum EventType {
  // ==========================================
  // ÉVÉNEMENTS EXISTANTS (Gardés tels quels)
  // ==========================================
  
  // Général
  READY = 'READY',
  ERROR = 'ERROR',
  WARN = 'WARN',
  DEBUG = 'DEBUG',

  // Messages
  MESSAGE_CREATE = 'MESSAGE-CREATE',
  MESSAGE_UPDATE = 'MESSAGE-UPDATE',
  MESSAGE_DELETE = 'MESSAGE-DELETE',
  MESSAGE_DELETE_BULK = 'MESSAGE-DELETE-BULK',

  // Réactions
  MESSAGE_REACTION_ADD = 'MESSAGE-REACTION-ADD',
  MESSAGE_REACTION_REMOVE = 'MESSAGE-REACTION-REMOVE',
  MESSAGE_REACTION_REMOVE_ALL = 'MESSAGE-REACTION-REMOVE-ALL',
  MESSAGE_REACTION_REMOVE_EMOJI = 'MESSAGE-REACTION-REMOVE-EMOJI',

  // Membres
  GUILD_MEMBER_ADD = 'GUILD-MEMBER-ADD',
  GUILD_MEMBER_REMOVE = 'GUILD-MEMBER-REMOVE',
  GUILD_MEMBER_UPDATE = 'GUILD-MEMBER-UPDATE',
  GUILD_BAN_ADD = 'GUILD-BAN-ADD',
  GUILD_BAN_REMOVE = 'GUILD-BAN-REMOVE',

  // Rôles
  ROLE_CREATE = 'ROLE-CREATE',
  ROLE_DELETE = 'ROLE-DELETE',
  ROLE_UPDATE = 'ROLE-UPDATE',

  // Salons (channels)
  CHANNEL_CREATE = 'CHANNEL-CREATE',
  CHANNEL_DELETE = 'CHANNEL-DELETE',
  CHANNEL_UPDATE = 'CHANNEL-UPDATE',
  CHANNEL_PINS_UPDATE = 'CHANNEL-PINS-UPDATE',

  // Guildes (serveurs)
  GUILD_CREATE = 'GUILD-CREATE',
  GUILD_DELETE = 'GUILD-DELETE',
  GUILD_UPDATE = 'GUILD-UPDATE',
  GUILD_LIST = 'GUILD-LIST',
  GUILD_SYNC = 'GUILD-SYNC',
  GUILD_UNAVAILABLE = 'GUILD-UNAVAILABLE',
  GUILD_INTEGRATIONS_UPDATE = 'GUILD-INTEGRATIONS-UPDATE',

  // Événements vocaux - Connexions/Déconnexions
  VOICE_CHANNEL_JOIN = 'VOICE-CHANNEL-JOIN',
  VOICE_CHANNEL_LEAVE = 'VOICE-CHANNEL-LEAVE',
  VOICE_CHANNEL_MOVE = 'VOICE-CHANNEL-MOVE',

  // Événements vocaux - Actions de modération
  VOICE_MUTE = 'VOICE-MUTE',
  VOICE_UNMUTE = 'VOICE-UNMUTE',
  VOICE_DEAFEN = 'VOICE-DEAFEN',
  VOICE_UNDEAFEN = 'VOICE-UNDEAFEN',

  // Événements vocaux - Actions utilisateur
  VOICE_SELF_MUTE = 'VOICE-SELF-MUTE',
  VOICE_SELF_DEAFEN = 'VOICE-SELF-DEAFEN',
  VOICE_STREAMING = 'VOICE-STREAMING',
  VOICE_VIDEO = 'VOICE-VIDEO',

  // Présence / statut
  PRESENCE_UPDATE = 'PRESENCE-UPDATE',
  USER_UPDATE = 'USER-UPDATE',
  TYPING_START = 'TYPING-START',

  // Invitations
  INVITE_CREATE = 'INVITE-CREATE',
  INVITE_DELETE = 'INVITE-DELETE',

  // Interactions (slash commands, boutons, etc.)
  INTERACTION_CREATE = 'INTERACTION-CREATE',

  // Emojis
  EMOJI_CREATE = 'EMOJI-CREATE',
  EMOJI_DELETE = 'EMOJI-DELETE',
  EMOJI_UPDATE = 'EMOJI-UPDATE',

  // Threads
  THREAD_CREATE = 'THREAD-CREATE',
  THREAD_UPDATE = 'THREAD-UPDATE',
  THREAD_DELETE = 'THREAD-DELETE',
  THREAD_LIST_SYNC = 'THREAD-LIST-SYNC',
  THREAD_MEMBER_UPDATE = 'THREAD-MEMBER-UPDATE',
  THREAD_MEMBERS_UPDATE = 'THREAD-MEMBERS-UPDATE',

  // Webhooks
  WEBHOOKS_UPDATE = 'WEBHOOKS-UPDATE',

  // AutoMod
  AUTO_MODERATION_ACTION_EXECUTION = 'AUTO-MODERATION-ACTION-EXECUTION',
  AUTO_MODERATION_RULE_CREATE = 'AUTO-MODERATION-RULE-CREATE',
  AUTO_MODERATION_RULE_DELETE = 'AUTO-MODERATION-RULE-DELETE',
  AUTO_MODERATION_RULE_UPDATE = 'AUTO-MODERATION-RULE-UPDATE',

  // ==========================================
  // NOUVEAUX ÉVÉNEMENTS (Phase 1)
  // ==========================================
  
  // Invitations - Tracking
  INVITE_USE = 'INVITE-USE',  // Nouveau : pour tracker qui invite qui
  
  // Audit Log
  GUILD_AUDIT_LOG_ENTRY_CREATE = 'GUILD-AUDIT-LOG-ENTRY-CREATE',  // Nouveau : timeouts, etc.
  
  // Métriques agrégées
  METRICS_SNAPSHOT = 'METRICS-SNAPSHOT',  // Nouveau : snapshot de métriques (messages, vocal, réactions)
  MEMBER_ACTIVITY_SNAPSHOT = 'MEMBER-ACTIVITY-SNAPSHOT',  // Nouveau : activité détaillée par membre
  
  // ==========================================
  // PHASE 2-3 (Futur - pas de listener pour l'instant)
  // ==========================================
  
  // XP/Levels
  XP_GAIN = 'XP-GAIN',
  LEVEL_UP = 'LEVEL-UP',
}