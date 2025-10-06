import { ApiEndpoint } from "@app/interfaces/endpoint-tester.interface";

export const TEST_ENDPOINTS: ApiEndpoint[] = [
  // Endpoints de diagnostic
  {
    id: 'discord-ping',
    name: 'Discord API Ping',
    description: 'Test la connectivité avec l\'API Discord (endpoint public)',
    method: 'GET',
    url: '/api/discord_V1/ping',
    requiresAuth: false,
    category: 'Discord - Diagnostic',
    expectedResponse: 'DiscordPingResultDto (avec latence et gateway)'
  },

  // Endpoints utilisateur Discord
  {
    id: 'discord-user-me',
    name: 'Mon profil Discord',
    description: 'Récupère les infos du profil Discord de l\'utilisateur connecté',
    method: 'GET',
    url: '/api/discord_V1/user',
    requiresAuth: true,
    category: 'Discord - Utilisateur',
    expectedResponse: 'DiscordUserDto'
  },
  {
    id: 'discord-user-by-id',
    name: 'Utilisateur Discord par ID',
    description: 'Récupère un utilisateur Discord par son ID (token bot): Ajouter idUser',
    method: 'GET',
    url: '/api/discord_V1/user/',
    requiresAuth: false,
    category: 'Discord - Utilisateur',
    expectedResponse: 'DiscordUserDto avec avatarUrl'
  },

  // Endpoints serveurs Discord
  {
    id: 'discord-guilds',
    name: 'Mes serveurs Discord',
    description: 'Liste tous les serveurs Discord de l\'utilisateur',
    method: 'GET',
    url: '/api/discord_V1/guilds',
    requiresAuth: true,
    category: 'Discord - Serveurs',
    expectedResponse: 'DiscordGuildDto[]'
  },
  {
    id: 'discord-admin-guilds',
    name: 'Mes serveurs avec droits admin',
    description: 'Liste seulement les serveurs où l\'utilisateur a des droits admin',
    method: 'GET',
    url: '/api/discord_V1/guilds/admin',
    requiresAuth: true,
    category: 'Discord - Serveurs',
    expectedResponse: 'DiscordGuildDto[] (filtrés admin)'
  },
  {
    id: 'discord-admin-guilds-avaible',
    name: 'Mes serveurs avec droits admin et séparé par présence du bot',
    description: `Liste seulement les serveurs où l\'utilisateur a des droits admin et le sépare par: si le bot est présent, à eté présent ou jamais `,
    method: 'GET',
    url: '/api/discord_V1/guilds/avaible/list',
    requiresAuth: true,
    category: 'Discord - Serveurs',
    expectedResponse: 'DiscordUserGuildListAvaible'
  },

  // Endpoints de debug
  {
    id: 'discord-debug-user-info',
    name: 'Debug - Info utilisateur app',
    description: 'Infos de l\'utilisateur de notre app avec comptes liés',
    method: 'GET',
    url: '/api/discord_V1/debug/user-info',
    requiresAuth: true,
    category: 'Discord - Debug',
    expectedResponse: 'UserDto avec linkedAccounts'
  },

  // Endpoints demo (existants)
  {
    id: 'demo-health',
    name: 'Demo - Health Check',
    description: 'Test de santé général du backend',
    method: 'GET',
    url: '/api/demo/health',
    requiresAuth: false,
    category: 'Demo',
    expectedResponse: 'Statut général du système'
  },
  {
    id: 'demo-database',
    name: 'Demo - Base de données',
    description: 'Test de connectivité avec la base de données',
    method: 'GET',
    url: '/api/demo/database',
    requiresAuth: false,
    category: 'Demo',
    expectedResponse: 'Stats de la base de données'
  },
  {
    id: 'ping-bot',
    name: 'Ping bot',
    description: 'Test la communication depuis le backend vers le bot à travers la gateway',
    method: "GET",
    url: "/api/gateway/ping",
    requiresAuth: false,
    category: "Bot"
  },
  {
    id: '@me V2',
    name: 'Get current user in V2',
    description: 'Récupère le user actuel',
    method: "GET",
    url: "/discord/users/@me",
    requiresAuth: false,
    category: "API_V2"
  }
];

// Utilitaire pour grouper les endpoints par catégorie
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
