// apps/bot/src/index.ts

import 'dotenv/config';
import './lib/setup';

import { LogLevel, SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import { logger } from './lib/logger/winston.config';
import { BotStartupService } from './services/bot-startup.service';
import { WebSocketService } from './services/websocket.service';
import { EventBatcher } from './services/eventBatcher.service';

/**
 * Extension du Container Sapphire pour inclure nos services customs
 */
declare module '@sapphire/pieces' {
	interface Container {
		ws: WebSocketService;
		eventBatcher: EventBatcher;
	}
}

/**
 * Configuration du client Sapphire avec tous les intents nécessaires
 */
const client = new SapphireClient({
	defaultPrefix: '!',
	caseInsensitiveCommands: true,
	logger: {
		level: LogLevel.Debug
	},
	intents: [
		// Intents de base
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		
		// Modération
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildBans,
		
		// Expressions
		GatewayIntentBits.GuildExpressions,
		GatewayIntentBits.GuildEmojisAndStickers,
		
		// Intégrations et webhooks
		GatewayIntentBits.GuildIntegrations,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.GuildInvites,
		
		// Voice
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildPresences,
		
		// Messages et réactions
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessageTyping,
		
		// Messages privés
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.DirectMessageTyping,
		
		// Événements planifiés
		GatewayIntentBits.GuildScheduledEvents,
		
		// AutoMod
		GatewayIntentBits.AutoModerationConfiguration,
		GatewayIntentBits.AutoModerationExecution,
		
		// Sondages
		GatewayIntentBits.GuildMessagePolls,
		GatewayIntentBits.DirectMessagePolls
	],
	loadMessageCommandListeners: true
});

/**
 * Point d'entrée principal de l'application bot
 */
const main = async (): Promise<void> => {
	try {
		logger.info('🤖 Démarrage du bot...');
		
		// 1. Validation du token
		const token = validateBotToken();
		
		// 2. Configuration de l'événement ready
		setupReadyEvent();
		
		// 3. Connexion à Discord
		await client.login(token);
		
		// 4. Logs de succès
		logSuccessfulStartup();
		
	} catch (error) {
		await handleStartupError(error);
	}
};

/**
 * Valide la présence du token Discord
 * @throws Error si le token n'est pas défini
 */
function validateBotToken(): string {
	const token = process.env.DISCORD_TOKEN;
	
	if (!token) {
		throw new Error('❌ Token Discord non défini dans le fichier .env (DISCORD_TOKEN)');
	}
	
	logger.debug('✅ Token Discord validé');
	return token;
}

/**
 * Configure l'événement 'clientReady' qui sera déclenché une seule fois
 * Toute l'initialisation se fait ici pour garantir que le bot est connecté
 * 
 * Note: Utilise 'clientReady' au lieu de 'ready' pour éviter le warning de dépréciation
 */
function setupReadyEvent(): void {
	client.once('clientReady', async () => {
		try {
			logger.info(`✅ Bot connecté en tant que ${client.user?.tag}`);
			
			// Initialiser le service de démarrage
			const startupService = new BotStartupService(client);
			await startupService.initialize();
			
			logger.info('🎉 Bot prêt et opérationnel');
			
		} catch (error) {
			logger.error('❌ Erreur lors de l\'initialisation du bot', error);
			await client.destroy();
			process.exit(1);
		}
	});
	
	logger.debug('✅ Event ready configuré');
}

/**
 * Affiche les logs de démarrage réussi
 */
function logSuccessfulStartup(): void {
	logger.info('🤖 Bot connecté à Discord avec succès');
	logger.info(`📊 Logs envoyés vers Loki: ${process.env.LOKI_URL || 'http://localhost:3100'}`);
}

/**
 * Gère les erreurs lors du démarrage
 */
async function handleStartupError(error: unknown): Promise<void> {
	logger.error('❌ Erreur fatale lors du démarrage du bot', error);
	
	// Cleanup propre
	try {
		await client.destroy();
	} catch (destroyError) {
		logger.error('❌ Erreur lors de la destruction du client', destroyError);
	}
	
	// Exit avec code d'erreur
	process.exit(1);
}

/**
 * Gestion propre de l'arrêt du bot (SIGINT)
 */
process.on('SIGINT', async () => {
	logger.info('🛑 Arrêt du bot demandé (SIGINT)');
	
	try {
		await client.destroy();
		logger.info('✅ Bot arrêté proprement');
	} catch (error) {
		logger.error('❌ Erreur lors de l\'arrêt du bot', error);
	}
	
	process.exit(0);
});

/**
 * Gestion propre de l'arrêt du bot (SIGTERM)
 */
process.on('SIGTERM', async () => {
	logger.info('🛑 Arrêt du bot demandé (SIGTERM)');
	
	try {
		await client.destroy();
		logger.info('✅ Bot arrêté proprement');
	} catch (error) {
		logger.error('❌ Erreur lors de l\'arrêt du bot', error);
	}
	
	process.exit(0);
});

/**
 * Gestion des erreurs non catchées
 */
process.on('uncaughtException', (error: Error) => {
	logger.error('❌ Exception non catchée', error);
	process.exit(1);
});

/**
 * Gestion des rejets de promesses non gérés
 */
process.on('unhandledRejection', (reason: unknown) => {
	logger.error('❌ Rejection non gérée', reason);
	process.exit(1);
});

// Lancement de l'application
void main();