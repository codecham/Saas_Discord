import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { StoreRegistryValue } from '@sapphire/pieces';
import { blue, gray, green, magenta, magentaBright, white, yellow } from 'colorette';
import { EventType } from '@my-project/shared-types';
import { BotEventDto } from '@my-project/shared-types';

const dev = process.env.NODE_ENV !== 'production';

@ApplyOptions<Listener.Options>({ once: true })
export class UserEvent extends Listener {
	private readonly style = dev ? yellow : blue;
	private sendReady: boolean = false;

	public override run() {
		this.printBanner();
		this.printStoreDebugInformation();
		if (this.sendReady) {
			this.sendReadyToBackend();
		}
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

	private sendReadyToBackend() {
		let done: boolean = false;
		let i = 0;
		const readyEvent: BotEventDto = {
			type: EventType.Ready,
			guildId: '0',
			timestamp: Date.now()
		}
		const arrayEvent: BotEventDto[] = [];

		arrayEvent.push(readyEvent);
		while (!done && i < 1000) {
			console.log(`Try to send ready to backend...`);
			done = this.container.ws.sendToBackend(arrayEvent);
		}
		if (done) {
			console.log(`Ready send to backend success`);
		} else {
			console.log(`Failed to send ready to backend`);
		}
	}	
}
