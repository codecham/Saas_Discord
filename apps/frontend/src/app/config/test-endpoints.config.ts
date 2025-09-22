import { ApiEndpoint } from "@app/interfaces/endpoint-tester.interface";

export const TEST_ENDPOINTS: ApiEndpoint[] = [
  // Endpoints de diagnostic
  {
    id: 'discord-ping',
    name: 'Discord API Ping',
    description: 'Test la connectivité avec l\'API Discord (endpoint public)',
    method: 'GET',
    url: '/api/discord/ping',
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
    url: '/api/discord/user',
    requiresAuth: true,
    category: 'Discord - Utilisateur',
    expectedResponse: 'DiscordUserDto'
  },
  {
    id: 'discord-user-by-id',
    name: 'Utilisateur Discord par ID',
    description: 'Récupère un utilisateur Discord par son ID (token bot): Ajouter idUser',
    method: 'GET',
    url: '/api/discord/user/',
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
    url: '/api/discord/guilds',
    requiresAuth: true,
    category: 'Discord - Serveurs',
    expectedResponse: 'DiscordGuildDto[]'
  },
  {
    id: 'discord-admin-guilds',
    name: 'Mes serveurs avec droits admin',
    description: 'Liste seulement les serveurs où l\'utilisateur a des droits admin',
    method: 'GET',
    url: '/api/discord/guilds/admin',
    requiresAuth: true,
    category: 'Discord - Serveurs',
    expectedResponse: 'DiscordGuildDto[] (filtrés admin)'
  },

  // Endpoints de debug
  {
    id: 'discord-debug-user-info',
    name: 'Debug - Info utilisateur app',
    description: 'Infos de l\'utilisateur de notre app avec comptes liés',
    method: 'GET',
    url: '/api/discord/debug/user-info',
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
