/**
 * Configuration globale pour tous les tests Jest du bot
 * 
 * Ce fichier est exécuté AVANT tous les tests
 */

// Mock des variables d'environnement
process.env.DISCORD_TOKEN = 'test_token_123456789';
process.env.GATEWAY_URL = 'http://localhost:3001';
process.env.BOT_ID = 'test_bot_id';
process.env.BOT_NAME = 'Test Bot';

// Mock du logger pour éviter les logs pendant les tests
jest.mock('@sapphire/framework', () => {
  const actual = jest.requireActual('@sapphire/framework');
  return {
    ...actual,
    container: {
      ...actual.container,
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      },
      // Ces propriétés seront mockées dans chaque test
      eventBatcher: undefined,
      ws: undefined,
    }
  };
});

// Timeout global pour les tests
jest.setTimeout(10000);

// Nettoyage après chaque test
afterEach(() => {
  jest.clearAllMocks();
});