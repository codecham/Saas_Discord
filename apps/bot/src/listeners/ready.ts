import { BotEventDto, EventType, GuildDTO } from '@my-project/shared-types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { StoreRegistryValue } from '@sapphire/pieces';
import { blue, gray, green, magenta, magentaBright, white, yellow } from 'colorette';
import { EventBatcher } from '../services/eventBatcher.service';

const dev = process.env.NODE_ENV !== 'production';

@ApplyOptions<Listener.Options>({ once: true })
export class UserEvent extends Listener {
	private readonly style = dev ? yellow : blue;
	private eventBatcher: EventBatcher;

	public constructor(context: Listener.Context, options: Listener.Options) {
		super(context, options);
		this.eventBatcher = new EventBatcher();
	}

	public override run() {
		this.printBanner();
		this.printStoreDebugInformation();
		(this.container as any).eventBatcher = this.eventBatcher;
		this.sendGuildListToBackEnd();
	}

	private printBanner() {
		const success = green('+');

		const llc = dev ? magentaBright : white;
		const blc = dev ? magenta : blue;

		const line01 = llc('');
		const line02 = llc('');
		const line03 = llc('');

		// Offset Pad
		const pad = ' '.repeat(7);

		console.log(
			String.raw`
${line01} ${pad}${blc('1.0.0')}
${line02} ${pad}[${success}] Gateway
${line03}${dev ? ` ${pad}${blc('<')}${llc('/')}${blc('>')} ${llc('DEVELOPMENT MODE')}` : ''}
		`.trim()
		);
	}

	private printStoreDebugInformation() {
		const { client, logger } = this.container;
		const stores = [...client.stores.values()];
		const last = stores.pop()!;

		for (const store of stores) logger.info(this.styleStore(store, false));
		logger.info(this.styleStore(last, true));
	}

	private styleStore(store: StoreRegistryValue, last: boolean) {
		return gray(`${last ? '└─' : '├─'} Loaded ${this.style(store.size.toString().padEnd(3, ' '))} ${store.name}.`);
	}

	private sendGuildListToBackEnd() {
		const guilds: GuildDTO[] = this.container.client.guilds.cache.map((guild) => ({
			id: guild.id,
			name: guild.name,
			icon: guild.icon,
			ownerId: guild.ownerId,
			memberCount: guild.memberCount
		}));
		const guildSyncDto: BotEventDto = {
			type: EventType.GuildSync,
			guildId: '',
			timestamp: Date.now(),
			data: guilds,
		}
		this.container.logger.info(`GUILDS: ${JSON.stringify(guilds, null, guilds.length)}`);
		this.container.ws.sendToBackend([guildSyncDto]);
	}
}
