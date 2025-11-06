import { SapphireClient, container } from '@sapphire/framework';
import { blue, gray, green, magenta, magentaBright, white, yellow } from 'colorette';
import type { StoreRegistryValue } from '@sapphire/pieces';
import { BotEventDto, EventType, GuildDTO } from '@my-project/shared-types';
import { WebSocketService } from './websocket.service';
import { EventBatcher } from './eventBatcher.service';
import { moduleLoader } from '../modules/module-loader/module-loader.service';
import { welcomeModule } from '../modules/welcome/welcome.module';
import { logger } from '../lib/logger/winston.config';

/**
 * Service responsable de toutes les opérations d'initialisation du bot
 * 
 * Ce service orchestre le démarrage du bot en suivant un ordre précis :
 * 1. Affichage des informations (banner, stores)
 * 2. Initialisation des services critiques (WebSocket, EventBatcher)
 * 3. Enregistrement et chargement des modules
 * 4. Synchronisation avec le backend
 * 
 * Chaque méthode a une responsabilité unique pour faciliter la maintenance et les tests.
 */
export class BotStartupService {
	private client: SapphireClient;
	private readonly isDevelopment: boolean;
	private readonly enableGuildSync: boolean = true;

	constructor(client: SapphireClient) {
		this.client = client;
		this.isDevelopment = process.env.NODE_ENV !== 'production';
	}

	/**
	 * Point d'entrée principal pour l'initialisation complète du bot
	 * 
	 * Ordre d'exécution :
	 * 1. Affichage UI (banner + stores)
	 * 2. Services essentiels
	 * 3. Modules
	 * 4. Synchronisation
	 */
	async initialize(): Promise<void> {
		logger.info('🚀 Initialisation du bot...');

		// Phase 1 : Affichage
		this.displayBanner();
		this.displayStoresInfo();
		
		// Phase 2 : Services critiques (AVANT tout le reste)
		this.initializeServices();
		
		// Phase 3 : Modules
		await this.registerModules();
		
		// Phase 4 : Synchronisation (si activée)
		if (this.enableGuildSync) {
			this.syncGuildsWithBackend();
		}

		logger.info('✅ Bot initialisé avec succès');
	}

	/**
	 * Affiche le banner de démarrage dans la console
	 * 
	 * Format :
	 * - Version du bot
	 * - Status Gateway
	 * - Mode (DEVELOPMENT ou PRODUCTION)
	 */
	private displayBanner(): void {
		const successIcon = green('+');
		const titleColor = this.isDevelopment ? magentaBright : white;
		const versionColor = this.isDevelopment ? magenta : blue;
		const pad = ' '.repeat(7);

		const line01 = titleColor('');
		const line02 = titleColor('');
		const line03 = titleColor('');

		const banner = String.raw`
${line01} ${pad}${versionColor('1.0.0')}
${line02} ${pad}[${successIcon}] Gateway
${line03}${this.isDevelopment ? ` ${pad}${versionColor('<')}${titleColor('/')}${versionColor('>')} ${titleColor('DEVELOPMENT MODE')}` : ''}
		`.trim();

		console.log(banner);
		logger.debug('✅ Banner affiché');
	}

	/**
	 * Affiche les informations sur les stores chargés par Sapphire
	 * 
	 * Les stores contiennent :
	 * - Listeners
	 * - Commands
	 * - Interaction handlers
	 * - etc.
	 */
	private displayStoresInfo(): void {
		const stores = [...this.client.stores.values()];
		const lastStore = stores.pop()!;

		// Afficher tous les stores sauf le dernier
		stores.forEach(store => {
			logger.info(this.formatStoreInfo(store, false));
		});

		// Afficher le dernier store avec un style différent (└─)
		logger.info(this.formatStoreInfo(lastStore, true));
		
		logger.debug('✅ Stores affichés');
	}

	/**
	 * Formate les informations d'un store pour l'affichage
	 * 
	 * @param store - Le store à formater
	 * @param isLast - Si true, utilise └─ sinon ├─
	 * @returns String formaté avec couleurs
	 */
	private formatStoreInfo(store: StoreRegistryValue, isLast: boolean): string {
		const storeStyle = this.isDevelopment ? yellow : blue;
		const prefix = isLast ? '└─' : '├─';
		const paddedSize = store.size.toString().padEnd(3, ' ');
		
		return gray(`${prefix} Loaded ${storeStyle(paddedSize)} ${store.name}.`);
	}

	/**
	 * Initialise les services essentiels et les injecte dans le container
	 * 
	 * CRITIQUE : Ces services DOIVENT être initialisés AVANT que les événements
	 * Discord ne commencent à arriver. C'est pourquoi cette méthode est appelée
	 * en tout premier dans initialize().
	 * 
	 * Services initialisés :
	 * - WebSocketService : Communication avec le backend via Gateway
	 * - EventBatcher : Mise en batch des événements Discord
	 */
	private initializeServices(): void {
		logger.info('🔧 Initialisation des services...');

		// ✅ FIX : Initialiser WebSocket AVANT tout le reste
		const wsService = new WebSocketService();
		container.ws = wsService;
		logger.info('✅ WebSocket Service initialisé et connecté à la Gateway');

		// ✅ FIX : Initialiser EventBatcher UNE SEULE FOIS
		const eventBatcher = new EventBatcher();
		container.eventBatcher = eventBatcher;
		logger.info('✅ Event Batcher initialisé');

		logger.debug('✅ Tous les services sont prêts');
	}

	/**
	 * Enregistre et charge tous les modules du bot
	 * 
	 * Processus en 2 étapes :
	 * 1. Enregistrement : Déclare les modules disponibles
	 * 2. Chargement : Active les modules pour chaque serveur
	 */
	private async registerModules(): Promise<void> {
		logger.info('📦 Enregistrement des modules...');

		// Enregistrer les modules disponibles
		moduleLoader.register(welcomeModule);
		// TODO: Ajouter d'autres modules ici au fur et à mesure
		// moduleLoader.register(automodModule);
		// moduleLoader.register(ticketsModule);
		// moduleLoader.register(levelingModule);

		logger.info('📦 Modules enregistrés');

		// Charger les modules actifs pour tous les serveurs
		logger.info('📦 Chargement des modules actifs...');
		await moduleLoader.loadAllModules();
		logger.info('✅ Modules actifs chargés');
	}

	/**
	 * Synchronise la liste des guilds avec le backend
	 * 
	 * Cette méthode :
	 * 1. Récupère toutes les guilds du cache Discord
	 * 2. Crée un événement GUILD_SYNC
	 * 3. Envoie au backend via WebSocket
	 * 
	 * Le backend utilisera ces données pour :
	 * - Créer/mettre à jour les enregistrements de guilds
	 * - Marquer les guilds actives
	 * - Initialiser les settings par défaut
	 */
	private syncGuildsWithBackend(): void {
		logger.info('🔄 Synchronisation des guilds avec le backend...');

		try {
			const guilds = this.extractGuildsData();
			const guildSyncEvent = this.createGuildSyncEvent(guilds);
			
			this.sendGuildSyncToBackend(guildSyncEvent);
			
			logger.info(`✅ ${guilds.length} guild(s) synchronisée(s) avec le backend`);
			
		} catch (error) {
			logger.error('❌ Erreur lors de la synchronisation des guilds', error);
			// On ne throw pas l'erreur pour ne pas bloquer le démarrage
			// Les guilds seront sync lors du prochain événement GUILD_CREATE
		}
	}

	/**
	 * Extrait les données des guilds du cache Discord
	 * 
	 * @returns Array de GuildDTO avec les informations essentielles
	 */
	private extractGuildsData(): GuildDTO[] {
		return this.client.guilds.cache.map(guild => ({
			id: guild.id,
			name: guild.name,
			icon: guild.icon,
			ownerId: guild.ownerId,
			memberCount: guild.memberCount
		}));
	}

	/**
	 * Crée l'événement de synchronisation des guilds
	 * 
	 * @param guilds - Liste des guilds à synchroniser
	 * @returns BotEventDto de type GUILD_SYNC
	 */
	private createGuildSyncEvent(guilds: GuildDTO[]): BotEventDto {
		return {
			type: EventType.GUILD_SYNC,
			guildId: '', // Vide car concerne plusieurs guilds
			timestamp: Date.now(),
			data: guilds,
		};
	}

	/**
	 * Envoie l'événement de synchronisation au backend via WebSocket
	 * 
	 * @param event - L'événement GUILD_SYNC à envoyer
	 */
	private sendGuildSyncToBackend(event: BotEventDto): void {
		try {
			const success = container.ws.sendToBackend([event]);
			
			if (success) {
				logger.info('📡 Événement GUILD_SYNC envoyé au backend avec succès');
			} else {
				logger.warn('⚠️ WebSocket non connecté, événement sauvegardé pour envoi ultérieur');
			}
			
		} catch (error) {
			logger.error('❌ Erreur lors de l\'envoi de GUILD_SYNC', error);
			// L'événement sera sauvegardé dans SQLite par le WebSocketService
		}
	}

	/**
	 * Méthode utilitaire pour obtenir le client
	 * Peut être utile pour les tests ou extensions futures
	 */
	getClient(): SapphireClient {
		return this.client;
	}
}