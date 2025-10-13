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
    enabled: true,
    description: 'Nouveau message créé'
  },
  MESSAGE_UPDATE: {
    enabled: true,
    description: 'Message modifié'
  },
  MESSAGE_DELETE: {
    enabled: true,
    description: 'Message supprimé'
  },
  MESSAGE_DELETE_BULK: {
    enabled: true,
    description: 'Suppression en masse de messages'
  },

  // ==========================================
  // MEMBRES
  // ==========================================
  GUILD_MEMBER_ADD: {
    enabled: true,
    description: 'Nouveau membre rejoint le serveur'
  },
  GUILD_MEMBER_REMOVE: {
    enabled: true,
    description: 'Membre quitte le serveur'
  },
  GUILD_MEMBER_UPDATE: {
    enabled: true,
    description: 'Informations du membre mises à jour'
  },

  // ==========================================
  // MODÉRATION
  // ==========================================
  GUILD_BAN_ADD: {
    enabled: true,
    description: 'Membre banni'
  },
  GUILD_BAN_REMOVE: {
    enabled: true,
    description: 'Ban levé'
  },
  GUILD_AUDIT_LOG_ENTRY_CREATE: {
    enabled: true,
    description: 'Nouvelle entrée dans les logs d\'audit (timeouts, etc.)'
  },
  AUTO_MODERATION_ACTION_EXECUTION: {
    enabled: true,
    description: 'Action d\'auto-modération exécutée'
  },

  // ==========================================
  // RÉACTIONS
  // ==========================================
  MESSAGE_REACTION_ADD: {
    enabled: true,
    description: 'Réaction ajoutée à un message'
  },
  MESSAGE_REACTION_REMOVE: {
    enabled: true,
    description: 'Réaction retirée d\'un message'
  },
  MESSAGE_REACTION_REMOVE_ALL: {
    enabled: true,
    description: 'Toutes les réactions retirées'
  },
  MESSAGE_REACTION_REMOVE_EMOJI: {
    enabled: true,
    description: 'Emoji spécifique retiré'
  },

  // ==========================================
  // VOICE
  // ==========================================
  VOICE_STATE_UPDATE: {
    enabled: true,
    description: 'État vocal modifié (join/leave/mute/etc.)'
  },

  // ==========================================
  // CHANNELS
  // ==========================================
  CHANNEL_CREATE: {
    enabled: true,
    description: 'Nouveau channel créé'
  },
  CHANNEL_UPDATE: {
    enabled: true,
    description: 'Channel modifié'
  },
  CHANNEL_DELETE: {
    enabled: true,
    description: 'Channel supprimé'
  },
  CHANNEL_PINS_UPDATE: {
    enabled: true,
    description: 'Messages épinglés modifiés'
  },

  // ==========================================
  // RÔLES
  // ==========================================
  ROLE_CREATE: {
    enabled: true,
    description: 'Nouveau rôle créé'
  },
  ROLE_UPDATE: {
    enabled: true,
    description: 'Rôle modifié'
  },
  ROLE_DELETE: {
    enabled: true,
    description: 'Rôle supprimé'
  },

  // ==========================================
  // INVITATIONS
  // ==========================================
  INVITE_CREATE: {
    enabled: true,
    description: 'Invitation créée'
  },
  INVITE_DELETE: {
    enabled: true,
    description: 'Invitation supprimée'
  },

  // ==========================================
  // THREADS
  // ==========================================
  THREAD_CREATE: {
    enabled: true,
    description: 'Nouveau thread créé'
  },
  THREAD_UPDATE: {
    enabled: true,
    description: 'Thread modifié'
  },
  THREAD_DELETE: {
    enabled: true,
    description: 'Thread supprimé'
  },
  THREAD_MEMBERS_UPDATE: {
    enabled: true,
    description: 'Membres du thread modifiés'
  },

  // ==========================================
  // EMOJIS
  // ==========================================
  EMOJI_CREATE: {
    enabled: true,
    description: 'Nouvel emoji créé'
  },
  EMOJI_UPDATE: {
    enabled: true,
    description: 'Emoji modifié'
  },
  EMOJI_DELETE: {
    enabled: true,
    description: 'Emoji supprimé'
  },

  // ==========================================
  // STICKERS
  // ==========================================
  GUILD_STICKER_CREATE: {
    enabled: true,
    description: 'Nouveau sticker créé'
  },
  GUILD_STICKER_UPDATE: {
    enabled: true,
    description: 'Sticker modifié'
  },
  GUILD_STICKER_DELETE: {
    enabled: true,
    description: 'Sticker supprimé'
  },

  // ==========================================
  // ÉVÉNEMENTS PLANIFIÉS
  // ==========================================
  GUILD_SCHEDULED_EVENT_CREATE: {
    enabled: true,
    description: 'Événement planifié créé'
  },
  GUILD_SCHEDULED_EVENT_UPDATE: {
    enabled: true,
    description: 'Événement planifié modifié'
  },
  GUILD_SCHEDULED_EVENT_DELETE: {
    enabled: true,
    description: 'Événement planifié supprimé'
  },
  GUILD_SCHEDULED_EVENT_USER_ADD: {
    enabled: true,
    description: 'Utilisateur intéressé par l\'événement'
  },
  GUILD_SCHEDULED_EVENT_USER_REMOVE: {
    enabled: true,
    description: 'Utilisateur n\'est plus intéressé'
  },

  // ==========================================
  // WEBHOOKS
  // ==========================================
  WEBHOOKS_UPDATE: {
    enabled: true,
    description: 'Webhooks du channel modifiés'
  },

  // ==========================================
  // STAGE
  // ==========================================
  STAGE_INSTANCE_CREATE: {
    enabled: true,
    description: 'Stage instance créée'
  },
  STAGE_INSTANCE_UPDATE: {
    enabled: true,
    description: 'Stage instance modifiée'
  },
  STAGE_INSTANCE_DELETE: {
    enabled: true,
    description: 'Stage instance supprimée'
  },

  // ==========================================
  // INTÉGRATIONS
  // ==========================================
  GUILD_INTEGRATIONS_UPDATE: {
    enabled: true,
    description: 'Intégrations du serveur modifiées'
  },
  INTEGRATION_CREATE: {
    enabled: true,
    description: 'Nouvelle intégration créée'
  },
  INTEGRATION_UPDATE: {
    enabled: true,
    description: 'Intégration modifiée'
  },
  INTEGRATION_DELETE: {
    enabled: true,
    description: 'Intégration supprimée'
  },

  // ==========================================
  // UTILISATEUR
  // ==========================================
  USER_UPDATE: {
    enabled: true,
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
    enabled: true,
    description: 'Interaction créée (slash commands, boutons, etc.)'
  },

  // ==========================================
  // AUTOMOD
  // ==========================================
  AUTO_MODERATION_RULE_CREATE: {
    enabled: true,
    description: 'Règle d\'auto-modération créée'
  },
  AUTO_MODERATION_RULE_UPDATE: {
    enabled: true,
    description: 'Règle d\'auto-modération modifiée'
  },
  AUTO_MODERATION_RULE_DELETE: {
    enabled: true,
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