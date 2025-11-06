// apps/bot/src/listeners/ready.ts

import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { logger } from '../lib/logger/winston.config';

/**
 * Listener pour l'événement 'clientReady' de Discord
 * 
 * Ce listener est déclenché une seule fois (once: true) lorsque le bot
 * est complètement connecté et prêt à recevoir des événements Discord.
 * 
 * ⚠️ IMPORTANT : Ce listener ne fait RIEN volontairement !
 * 
 * Toute la logique d'initialisation a été déplacée dans BotStartupService
 * et est appelée depuis index.ts lors de l'événement 'clientReady'.
 * 
 * Ce listener existe uniquement pour que Sapphire puisse charger correctement
 * le système de listeners. Si on le supprime, Sapphire pourrait avoir des
 * problèmes de chargement.
 * 
 * Architecture :
 * 
 *   index.ts (client.once('clientReady'))
 *        ↓
 *   BotStartupService.initialize()
 *        ↓
 *   [Toute la logique d'initialisation]
 * 
 *   ready.ts (Listener Sapphire)
 *        ↓
 *   [Rien - juste pour Sapphire]
 * 
 * Note: Utilise 'clientReady' au lieu de 'ready' pour éviter le warning de dépréciation
 */
@ApplyOptions<Listener.Options>({ 
	once: true,
	event: 'clientReady'
})
export class ReadyListener extends Listener {

	/**
	 * Exécuté une fois que le bot est connecté et prêt
	 * 
	 * Ce listener ne fait rien car toute l'initialisation est gérée
	 * dans index.ts via BotStartupService.
	 * 
	 * Il existe uniquement pour que le framework Sapphire fonctionne correctement.
	 */
	public override run(): void {
		logger.debug('[ReadyListener] Événement clientReady déclenché (Sapphire)');
		
		// ℹ️ Toute la logique d'initialisation est dans index.ts
		// via client.once('clientReady') et BotStartupService.initialize()
		
		// Ce listener Sapphire sert juste à ce que le framework
		// charge correctement le système de listeners
	}
}