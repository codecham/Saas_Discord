import { ApiEndpoint } from "@app/shared/interfaces/endpoint-tester.interface";

export const TEST_ENDPOINTS: ApiEndpoint[] = [
  // ========================================
  // 🔐 AUTHENTIFICATION
  // ========================================
  {
    id: 'auth-me',
    name: 'Mon profil',
    description: 'Récupère les informations de l\'utilisateur connecté',
    method: 'GET',
    url: '/api/auth/me',
    requiresAuth: true,
    category: 'Authentification',
    expectedResponse: 'UserDto avec linkedAccounts'
  },
  {
    id: 'auth-refresh',
    name: 'Rafraîchir le token',
    description: 'Obtient un nouveau access token via le refresh token',
    method: 'POST',
    url: '/api/auth/refresh',
    requiresAuth: false,
    category: 'Authentification',
    expectedResponse: 'TokensDto'
  },
  {
    id: 'auth-logout',
    name: 'Déconnexion',
    description: 'Déconnecte l\'utilisateur et révoque les tokens',
    method: 'POST',
    url: '/api/auth/logout',
    requiresAuth: true,
    category: 'Authentification',
    expectedResponse: 'Message de succès'
  },

  // ========================================
  // 👤 UTILISATEURS DISCORD
  // ========================================
  {
    id: 'discord-current-user',
    name: 'Mon profil Discord',
    description: 'Récupère les informations Discord de l\'utilisateur connecté',
    method: 'GET',
    url: '/discord/users/@me',
    requiresAuth: true,
    category: 'Discord - Utilisateur',
    expectedResponse: 'DiscordUserDTO'
  },
  {
    id: 'discord-current-user-guilds',
    name: 'Mes serveurs Discord',
    description: 'Liste tous les serveurs Discord de l\'utilisateur',
    method: 'GET',
    url: '/discord/users/@me/guilds',
    requiresAuth: true,
    category: 'Discord - Utilisateur',
    expectedResponse: 'DiscordUserGuildDTO[]',
    parameters: [
      {
        name: 'limit',
        type: 'query',
        description: 'Nombre de guilds à retourner (max 200)',
        required: false,
        placeholder: '100',
        defaultValue: '100'
      },
      {
        name: 'before',
        type: 'query',
        description: 'ID de guild pour pagination (avant)',
        required: false,
        placeholder: 'Guild ID'
      },
      {
        name: 'after',
        type: 'query',
        description: 'ID de guild pour pagination (après)',
        required: false,
        placeholder: 'Guild ID'
      }
    ]
  },
  {
    id: 'discord-current-user-guilds-categorized',
    name: 'Mes serveurs catégorisés',
    description: 'Serveurs admin catégorisés par présence du bot (actif/inactif/jamais ajouté)',
    method: 'GET',
    url: '/discord/users/@me/guilds/categorized',
    requiresAuth: true,
    category: 'Discord - Utilisateur',
    expectedResponse: 'UserGuildsCategorizedDTO { active, inactive, notAdded }'
  },
  {
    id: 'discord-current-user-connections',
    name: 'Mes connexions Discord',
    description: 'Liste les connexions tierces du compte Discord',
    method: 'GET',
    url: '/discord/users/@me/connections',
    requiresAuth: true,
    category: 'Discord - Utilisateur',
    expectedResponse: 'DiscordConnectionDTO[]'
  },
  {
    id: 'discord-bot-user',
    name: 'Profil du bot',
    description: 'Récupère les informations du bot Discord',
    method: 'GET',
    url: '/discord/users/bot',
    requiresAuth: true,
    category: 'Discord - Utilisateur',
    expectedResponse: 'DiscordUserDTO'
  },
  {
    id: 'discord-user-by-id',
    name: 'Utilisateur par ID',
    description: 'Récupère les informations d\'un utilisateur Discord par son ID',
    method: 'GET',
    url: '/discord/users/{userId}',
    requiresAuth: true,
    category: 'Discord - Utilisateur',
    expectedResponse: 'DiscordUserDTO',
    parameters: [
      {
        name: 'userId',
        type: 'path',
        description: 'ID de l\'utilisateur Discord',
        required: true,
        placeholder: '123456789012345678',
        autoSource: 'currentUserId'
      }
    ]
  },

  // ========================================
  // 🏰 SERVEURS DISCORD (GUILDS)
  // ========================================
  {
    id: 'discord-guild-info',
    name: 'Informations du serveur',
    description: 'Récupère les détails d\'un serveur Discord',
    method: 'GET',
    url: '/discord/guilds/{guildId}',
    requiresAuth: true,
    category: 'Discord - Serveurs',
    expectedResponse: 'DiscordGuildDTO',
    parameters: [
      {
        name: 'guildId',
        type: 'path',
        description: 'ID du serveur Discord',
        required: true,
        placeholder: '123456789012345678',
        autoSource: 'selectedGuild'
      }
    ]
  },
  {
    id: 'discord-guild-channels',
    name: 'Channels du serveur',
    description: 'Liste tous les channels d\'un serveur',
    method: 'GET',
    url: '/discord/guilds/{guildId}/channels',
    requiresAuth: true,
    category: 'Discord - Serveurs',
    expectedResponse: 'DiscordChannelDTO[]',
    parameters: [
      {
        name: 'guildId',
        type: 'path',
        description: 'ID du serveur Discord',
        required: true,
        placeholder: '123456789012345678',
        autoSource: 'selectedGuild'
      }
    ]
  },
  {
    id: 'discord-guild-members',
    name: 'Membres du serveur',
    description: 'Liste les membres d\'un serveur',
    method: 'GET',
    url: '/discord/guilds/{guildId}/members',
    requiresAuth: true,
    category: 'Discord - Serveurs',
    expectedResponse: 'DiscordGuildMemberDTO[]',
    parameters: [
      {
        name: 'guildId',
        type: 'path',
        description: 'ID du serveur Discord',
        required: true,
        placeholder: '123456789012345678',
        autoSource: 'selectedGuild'
      },
      {
        name: 'limit',
        type: 'query',
        description: 'Nombre de membres à retourner (1-1000)',
        required: false,
        placeholder: '100',
        defaultValue: '100'
      },
      {
        name: 'after',
        type: 'query',
        description: 'ID utilisateur pour pagination',
        required: false,
        placeholder: 'User ID'
      }
    ]
  },
  {
    id: 'discord-guild-roles',
    name: 'Rôles du serveur',
    description: 'Liste tous les rôles d\'un serveur',
    method: 'GET',
    url: '/discord/guilds/{guildId}/roles',
    requiresAuth: true,
    category: 'Discord - Serveurs',
    expectedResponse: 'DiscordRoleDTO[]',
    parameters: [
      {
        name: 'guildId',
        type: 'path',
        description: 'ID du serveur Discord',
        required: true,
        placeholder: '123456789012345678',
        autoSource: 'selectedGuild'
      }
    ]
  },
  {
    id: 'discord-guild-bans',
    name: 'Bannissements du serveur',
    description: 'Liste tous les utilisateurs bannis d\'un serveur',
    method: 'GET',
    url: '/discord/guilds/{guildId}/bans',
    requiresAuth: true,
    category: 'Discord - Serveurs',
    expectedResponse: 'DiscordBanDTO[]',
    note: 'Nécessite la permission BAN_MEMBERS',
    parameters: [
      {
        name: 'guildId',
        type: 'path',
        description: 'ID du serveur Discord',
        required: true,
        placeholder: '123456789012345678',
        autoSource: 'selectedGuild'
      }
    ]
  },

  // ========================================
  // 💬 CHANNELS
  // ========================================
  {
    id: 'discord-channel-info',
    name: 'Informations du channel',
    description: 'Récupère les détails d\'un channel',
    method: 'GET',
    url: '/discord/channels/{channelId}',
    requiresAuth: true,
    category: 'Discord - Channels',
    expectedResponse: 'DiscordChannelDTO',
    parameters: [
      {
        name: 'channelId',
        type: 'path',
        description: 'ID du channel Discord',
        required: true,
        placeholder: '123456789012345678'
      }
    ]
  },
  {
    id: 'discord-channel-messages',
    name: 'Messages du channel',
    description: 'Récupère les derniers messages d\'un channel',
    method: 'GET',
    url: '/discord/channels/{channelId}/messages',
    requiresAuth: true,
    category: 'Discord - Channels',
    expectedResponse: 'DiscordMessageDTO[]',
    parameters: [
      {
        name: 'channelId',
        type: 'path',
        description: 'ID du channel Discord',
        required: true,
        placeholder: '123456789012345678'
      },
      {
        name: 'limit',
        type: 'query',
        description: 'Nombre de messages (1-100)',
        required: false,
        placeholder: '50',
        defaultValue: '50'
      }
    ]
  },
  {
    id: 'discord-channel-create-message',
    name: 'Envoyer un message',
    description: 'Envoie un message dans un channel',
    method: 'POST',
    url: '/discord/channels/{channelId}/messages',
    requiresAuth: true,
    category: 'Discord - Channels',
    expectedResponse: 'DiscordMessageDTO',
    parameters: [
      {
        name: 'channelId',
        type: 'path',
        description: 'ID du channel Discord',
        required: true,
        placeholder: '123456789012345678'
      },
      {
        name: 'content',
        type: 'body',
        description: 'Contenu du message',
        required: true,
        placeholder: 'Hello from API Tester!'
      }
    ],
    bodyExample: {
      content: 'Test message from API Endpoint Tester'
    }
  },

  // ========================================
  // 👥 MEMBRES (MODÉRATION)
  // ========================================
  {
    id: 'discord-guild-member',
    name: 'Détails d\'un membre',
    description: 'Récupère les informations d\'un membre spécifique',
    method: 'GET',
    url: '/discord/guilds/{guildId}/members/{userId}',
    requiresAuth: true,
    category: 'Discord - Modération',
    expectedResponse: 'DiscordGuildMemberDTO',
    parameters: [
      {
        name: 'guildId',
        type: 'path',
        description: 'ID du serveur Discord',
        required: true,
        placeholder: '123456789012345678',
        autoSource: 'selectedGuild'
      },
      {
        name: 'userId',
        type: 'path',
        description: 'ID de l\'utilisateur Discord',
        required: true,
        placeholder: '123456789012345678',
        autoSource: 'currentUserId'
      }
    ]
  },
  {
    id: 'discord-member-kick',
    name: 'Expulser membre',
    description: 'Expulse un membre du serveur',
    method: 'DELETE',
    url: '/discord/guilds/{guildId}/members/{userId}',
    requiresAuth: true,
    category: 'Discord - Modération',
    expectedResponse: 'Status 204 No Content',
    note: '⚠️ Action irréversible - Nécessite permission KICK_MEMBERS',
    parameters: [
      {
        name: 'guildId',
        type: 'path',
        description: 'ID du serveur Discord',
        required: true,
        placeholder: '123456789012345678',
        autoSource: 'selectedGuild'
      },
      {
        name: 'userId',
        type: 'path',
        description: 'ID de l\'utilisateur à expulser',
        required: true,
        placeholder: '123456789012345678'
      }
    ]
  },
  {
    id: 'discord-member-ban',
    name: 'Bannir membre',
    description: 'Bannit un membre du serveur',
    method: 'PUT',
    url: '/discord/guilds/{guildId}/bans/{userId}',
    requiresAuth: true,
    category: 'Discord - Modération',
    expectedResponse: 'Status 204 No Content',
    note: '⚠️ Action grave - Nécessite permission BAN_MEMBERS',
    parameters: [
      {
        name: 'guildId',
        type: 'path',
        description: 'ID du serveur Discord',
        required: true,
        placeholder: '123456789012345678',
        autoSource: 'selectedGuild'
      },
      {
        name: 'userId',
        type: 'path',
        description: 'ID de l\'utilisateur à bannir',
        required: true,
        placeholder: '123456789012345678'
      },
      {
        name: 'delete_message_seconds',
        type: 'body',
        description: 'Supprimer les messages des X dernières secondes (max 604800 = 7 jours)',
        required: false,
        placeholder: '86400'
      }
    ],
    bodyExample: {
      delete_message_seconds: 86400
    }
  },
  {
    id: 'discord-member-unban',
    name: 'Débannir membre',
    description: 'Retire le bannissement d\'un utilisateur',
    method: 'DELETE',
    url: '/discord/guilds/{guildId}/bans/{userId}',
    requiresAuth: true,
    category: 'Discord - Modération',
    expectedResponse: 'Status 204 No Content',
    note: 'Nécessite permission BAN_MEMBERS',
    parameters: [
      {
        name: 'guildId',
        type: 'path',
        description: 'ID du serveur Discord',
        required: true,
        placeholder: '123456789012345678',
        autoSource: 'selectedGuild'
      },
      {
        name: 'userId',
        type: 'path',
        description: 'ID de l\'utilisateur à débannir',
        required: true,
        placeholder: '123456789012345678'
      }
    ]
  },

  // ========================================
  // 🎭 RÔLES
  // ========================================
  {
    id: 'discord-add-role',
    name: 'Ajouter rôle à membre',
    description: 'Attribue un rôle à un membre',
    method: 'PUT',
    url: '/discord/guilds/{guildId}/members/{userId}/roles/{roleId}',
    requiresAuth: true,
    category: 'Discord - Rôles',
    expectedResponse: 'Status 204 No Content',
    note: 'Nécessite permission MANAGE_ROLES',
    parameters: [
      {
        name: 'guildId',
        type: 'path',
        description: 'ID du serveur Discord',
        required: true,
        placeholder: '123456789012345678',
        autoSource: 'selectedGuild'
      },
      {
        name: 'userId',
        type: 'path',
        description: 'ID de l\'utilisateur',
        required: true,
        placeholder: '123456789012345678',
        autoSource: 'currentUserId'
      },
      {
        name: 'roleId',
        type: 'path',
        description: 'ID du rôle à ajouter',
        required: true,
        placeholder: '123456789012345678'
      }
    ]
  },
  {
    id: 'discord-remove-role',
    name: 'Retirer rôle à membre',
    description: 'Retire un rôle d\'un membre',
    method: 'DELETE',
    url: '/discord/guilds/{guildId}/members/{userId}/roles/{roleId}',
    requiresAuth: true,
    category: 'Discord - Rôles',
    expectedResponse: 'Status 204 No Content',
    note: 'Nécessite permission MANAGE_ROLES',
    parameters: [
      {
        name: 'guildId',
        type: 'path',
        description: 'ID du serveur Discord',
        required: true,
        placeholder: '123456789012345678',
        autoSource: 'selectedGuild'
      },
      {
        name: 'userId',
        type: 'path',
        description: 'ID de l\'utilisateur',
        required: true,
        placeholder: '123456789012345678',
        autoSource: 'currentUserId'
      },
      {
        name: 'roleId',
        type: 'path',
        description: 'ID du rôle à retirer',
        required: true,
        placeholder: '123456789012345678'
      }
    ]
  },

  // ========================================
  // 🔧 GATEWAY & SYSTÈME
  // ========================================
  {
    id: 'gateway-ping',
    name: 'Ping Gateway',
    description: 'Test la communication Backend → Gateway → Bot',
    method: 'GET',
    url: '/api/gateway/ping',
    requiresAuth: false,
    category: 'Système',
    expectedResponse: 'Pong avec latence'
  },

  // ========================================
  // 🧪 DEMO / DEBUG
  // ========================================
  {
    id: 'demo-health',
    name: 'Health Check',
    description: 'Vérifie la santé générale du backend',
    method: 'GET',
    url: '/api/demo/health',
    requiresAuth: false,
    category: 'Debug',
    expectedResponse: 'Status et uptime'
  },
  {
    id: 'demo-database',
    name: 'Test Database',
    description: 'Teste la connectivité avec PostgreSQL',
    method: 'GET',
    url: '/api/demo/database',
    requiresAuth: false,
    category: 'Debug',
    expectedResponse: 'Stats de la DB'
  },
];

/**
 * Utilitaire pour grouper les endpoints par catégorie
 */
export function getEndpointsByCategory(): Record<string, ApiEndpoint[]> {
  return TEST_ENDPOINTS.reduce((groups, endpoint) => {
    const category = endpoint.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(endpoint);
    return groups;
  }, {} as Record<string, ApiEndpoint[]>);
}

/**
 * Utilitaire pour obtenir les endpoints qui nécessitent une authentification
 */
export function getAuthenticatedEndpoints(): ApiEndpoint[] {
  return TEST_ENDPOINTS.filter(endpoint => endpoint.requiresAuth);
}

/**
 * Utilitaire pour obtenir les endpoints publics
 */
export function getPublicEndpoints(): ApiEndpoint[] {
  return TEST_ENDPOINTS.filter(endpoint => !endpoint.requiresAuth);
}

/**
 * Utilitaire pour obtenir les endpoints avec paramètres
 */
export function getParameterizedEndpoints(): ApiEndpoint[] {
  return TEST_ENDPOINTS.filter(endpoint => endpoint.parameters && endpoint.parameters.length > 0);
}