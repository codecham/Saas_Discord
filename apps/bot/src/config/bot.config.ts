export const BOT_CONFIG = {
  bot: {
    id: '1380932158155391068',
    name: 'Discord Bot Principal',
  },
  
  gateway: {
    reconnectInterval: 5000,
  },
  
  events: {
    enabled: [
      'messageCreate',
      'guildCreate', 
      'guildDelete',
      'guildMemberAdd',
      'guildMemberRemove',
      'bot:ready'
    ],
  },
  storage: {
    databaseFile: './data/events.sqlite',
    batchSize: 500,
    maxPendingEvents: 10000,
  },
} as const;