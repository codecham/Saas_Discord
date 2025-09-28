export const BOT_CONFIG = {
  bot: {
    id: '0',
    name: 'Discord Bot Principal',
  },
  
  gateway: {
    reconnectInterval: 5000,
  },
  
  events: {
    enabled: [
      'messageCreate',
    ],
  },
  storage: {
    databaseFile: './data/events.sqlite',
    batchSize: 500,
    maxPendingEvents: 10000,
  },
} as const;