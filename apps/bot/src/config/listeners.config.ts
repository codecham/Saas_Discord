/**
 * Configuration des listeners Discord
 * 
 * - enabled: Active/désactive le listener
 * - description: Description de l'événement
 * 
 * ⚠️ ÉVOLUTIF : Cette config sera plus tard déplacée en DB
 *    et configurable par guild individuellement
 */

export interface ListenerConfig {
  enabled: boolean;
  description: string;
}

export const LISTENERS_CONFIG: Record<string, ListenerConfig> = {
  // ==========================================
  // MESSAGES
  // ==========================================
  MESSAGE_CREATE: {
    enabled: false,
    description: 'Nouveau message créé'
  },
  MESSAGE_UPDATE: {
    enabled: false,
    description: 'Message modifié'
  },
  MESSAGE_DELETE: {
    enabled: false,
    description: 'Message supprimé'
  },
  MESSAGE_DELETE_BULK: {
    enabled: false,
    description: 'Suppression en masse de messages'
  },

  // ==========================================
  // MEMBRES
  // ==========================================
  GUILD_MEMBER_ADD: {
    enabled: false,
    description: 'Nouveau membre rejoint le serveur'
  },
  GUILD_MEMBER_REMOVE: {
    enabled: false,
    description: 'Membre quitte le serveur'
  },
  GUILD_MEMBER_UPDATE: {
    enabled: false,
    description: 'Informations du membre mises à jour'
  },

  // ==========================================
  // MODÉRATION
  // ==========================================
  GUILD_BAN_ADD: {
    enabled: false,
    description: 'Membre banni'
  },
  GUILD_BAN_REMOVE: {
    enabled: false,
    description: 'Ban levé'
  },
  GUILD_AUDIT_LOG_ENTRY_CREATE: {
    enabled: false,
    description: 'Nouvelle entrée dans les logs d\'audit (timeouts, etc.)'
  },
  AUTO_MODERATION_ACTION_EXECUTION: {
    enabled: false,
    description: 'Action d\'auto-modération exécutée'
  },

  // ==========================================
  // RÉACTIONS
  // ==========================================
  MESSAGE_REACTION_ADD: {
    enabled: false,
    description: 'Réaction ajoutée à un message'
  },
  MESSAGE_REACTION_REMOVE: {
    enabled: false,
    description: 'Réaction retirée d\'un message'
  },
  MESSAGE_REACTION_REMOVE_ALL: {
    enabled: false,
    description: 'Toutes les réactions retirées'
  },
  MESSAGE_REACTION_REMOVE_EMOJI: {
    enabled: false,
    description: 'Emoji spécifique retiré'
  },

  // ==========================================
  // VOICE
  // ==========================================
  VOICE_STATE_UPDATE: {
    enabled: false,
    description: 'État vocal modifié (join/leave/mute/etc.)'
  },

  // ==========================================
  // CHANNELS
  // ==========================================
  CHANNEL_CREATE: {
    enabled: false,
    description: 'Nouveau channel créé'
  },
  CHANNEL_UPDATE: {
    enabled: false,
    description: 'Channel modifié'
  },
  CHANNEL_DELETE: {
    enabled: false,
    description: 'Channel supprimé'
  },
  CHANNEL_PINS_UPDATE: {
    enabled: false,
    description: 'Messages épinglés modifiés'
  },

  // ==========================================
  // RÔLES
  // ==========================================
  ROLE_CREATE: {
    enabled: false,
    description: 'Nouveau rôle créé'
  },
  ROLE_UPDATE: {
    enabled: false,
    description: 'Rôle modifié'
  },
  ROLE_DELETE: {
    enabled: false,
    description: 'Rôle supprimé'
  },

  // ==========================================
  // INVITATIONS
  // ==========================================
  INVITE_CREATE: {
    enabled: false,
    description: 'Invitation créée'
  },
  INVITE_DELETE: {
    enabled: false,
    description: 'Invitation supprimée'
  },

  // ==========================================
  // THREADS
  // ==========================================
  THREAD_CREATE: {
    enabled: false,
    description: 'Nouveau thread créé'
  },
  THREAD_UPDATE: {
    enabled: false,
    description: 'Thread modifié'
  },
  THREAD_DELETE: {
    enabled: false,
    description: 'Thread supprimé'
  },
  THREAD_MEMBERS_UPDATE: {
    enabled: false,
    description: 'Membres du thread modifiés'
  },

  // ==========================================
  // EMOJIS
  // ==========================================
  EMOJI_CREATE: {
    enabled: false,
    description: 'Nouvel emoji créé'
  },
  EMOJI_UPDATE: {
    enabled: false,
    description: 'Emoji modifié'
  },
  EMOJI_DELETE: {
    enabled: false,
    description: 'Emoji supprimé'
  },

  // ==========================================
  // STICKERS
  // ==========================================
  GUILD_STICKER_CREATE: {
    enabled: false,
    description: 'Nouveau sticker créé'
  },
  GUILD_STICKER_UPDATE: {
    enabled: false,
    description: 'Sticker modifié'
  },
  GUILD_STICKER_DELETE: {
    enabled: false,
    description: 'Sticker supprimé'
  },

  // ==========================================
  // ÉVÉNEMENTS PLANIFIÉS
  // ==========================================
  GUILD_SCHEDULED_EVENT_CREATE: {
    enabled: false,
    description: 'Événement planifié créé'
  },
  GUILD_SCHEDULED_EVENT_UPDATE: {
    enabled: false,
    description: 'Événement planifié modifié'
  },
  GUILD_SCHEDULED_EVENT_DELETE: {
    enabled: false,
    description: 'Événement planifié supprimé'
  },
  GUILD_SCHEDULED_EVENT_USER_ADD: {
    enabled: false,
    description: 'Utilisateur intéressé par l\'événement'
  },
  GUILD_SCHEDULED_EVENT_USER_REMOVE: {
    enabled: false,
    description: 'Utilisateur n\'est plus intéressé'
  },

  // ==========================================
  // WEBHOOKS
  // ==========================================
  WEBHOOKS_UPDATE: {
    enabled: false,
    description: 'Webhooks du channel modifiés'
  },

  // ==========================================
  // STAGE
  // ==========================================
  STAGE_INSTANCE_CREATE: {
    enabled: false,
    description: 'Stage instance créée'
  },
  STAGE_INSTANCE_UPDATE: {
    enabled: false,
    description: 'Stage instance modifiée'
  },
  STAGE_INSTANCE_DELETE: {
    enabled: false,
    description: 'Stage instance supprimée'
  },

  // ==========================================
  // INTÉGRATIONS
  // ==========================================
  GUILD_INTEGRATIONS_UPDATE: {
    enabled: false,
    description: 'Intégrations du serveur modifiées'
  },
  INTEGRATION_CREATE: {
    enabled: false,
    description: 'Nouvelle intégration créée'
  },
  INTEGRATION_UPDATE: {
    enabled: false,
    description: 'Intégration modifiée'
  },
  INTEGRATION_DELETE: {
    enabled: false,
    description: 'Intégration supprimée'
  },

  // ==========================================
  // UTILISATEUR
  // ==========================================
  USER_UPDATE: {
    enabled: false,
    description: 'Informations utilisateur Discord modifiées'
  },
  PRESENCE_UPDATE: {
    enabled: false, // ⚠️ TRÈS VERBEUX - désactivé par défaut
    description: 'Présence utilisateur modifiée (online/offline/etc.)'
  },
  TYPING_START: {
    enabled: false, // ⚠️ TRÈS VERBEUX - désactivé par défaut
    description: 'Utilisateur commence à taper'
  },

  // ==========================================
  // INTERACTIONS
  // ==========================================
  INTERACTION_CREATE: {
    enabled: false,
    description: 'Interaction créée (slash commands, boutons, etc.)'
  },

  // ==========================================
  // AUTOMOD
  // ==========================================
  AUTO_MODERATION_RULE_CREATE: {
    enabled: false,
    description: 'Règle d\'auto-modération créée'
  },
  AUTO_MODERATION_RULE_UPDATE: {
    enabled: false,
    description: 'Règle d\'auto-modération modifiée'
  },
  AUTO_MODERATION_RULE_DELETE: {
    enabled: false,
    description: 'Règle d\'auto-modération supprimée'
  },
};

/**
 * Vérifie si un listener est activé
 * Usage dans les listeners : if (!isListenerEnabled('MESSAGE_CREATE')) return;
 */
export function isListenerEnabled(eventName: string): boolean {
  const config = LISTENERS_CONFIG[eventName];
  // const response = config?.enabled ?? false;
  // console.log(`[Listener Config] Event: ${eventName} are ${response}`);
  return config?.enabled ?? false;
}