import 'dotenv/config';
import './lib/setup';

import { LogLevel, SapphireClient, container } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import { WebSocketService } from './services/websocket.service';
import { logger } from './lib/logger/winston.config';
import { EventBatcher } from './services/eventBatcher.service';

declare module '@sapphire/pieces' {
	interface Container {
		ws: WebSocketService;
		eventBatchter: EventBatcher;
	}
}

const client = new SapphireClient({
	defaultPrefix: '!',
	caseInsensitiveCommands: true,
	logger: {
		level: LogLevel.Debug
	},
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildBans,
		GatewayIntentBits.GuildExpressions,
		GatewayIntentBits.GuildEmojisAndStickers,
		GatewayIntentBits.GuildIntegrations,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.GuildInvites,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessageTyping,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.DirectMessageTyping,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildScheduledEvents,
		GatewayIntentBits.AutoModerationConfiguration,
		GatewayIntentBits.AutoModerationExecution,
		GatewayIntentBits.GuildMessagePolls,
		GatewayIntentBits.DirectMessagePolls
	],
	loadMessageCommandListeners: true
});

const main = async () => {
	try {
		logger.info('🤖 Bot démarrage...');
		const token = process.env.DISCORD_TOKEN;
		if (!token) throw new Error('Token not define in .env');
		
		await client.login();
		
		logger.info('🤖 Bot connecté à Discord');
		logger.info(`📊 Logs envoyés vers Loki: ${process.env.LOKI_URL || 'http://localhost:3100'}`);
	} catch (error) {
		logger.error('❌ Erreur fatale lors du démarrage du bot', error);
		await client.destroy();
		process.exit(1);
	}
	container.ws = new WebSocketService();
	container.eventBatchter = new EventBatcher();
};

void main();