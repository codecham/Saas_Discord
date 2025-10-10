import { container } from '@sapphire/framework';
import { BotEventDto, EventType } from '@my-project/shared-types';

interface BatchConfig {
	maxSize: number;
	maxWait: number;
}

enum PriorityTime {
	CRITICAL = 0,
	IMPORTANT = 2000,
	SLOW = 10000
}

export class EventBatcher {
	private batches = new Map<string, BotEventDto[]>();
	private timers = new Map<string, NodeJS.Timeout>();

	private readonly batchesConfig = {
		messageCreate: { maxSize: 50, maxWait: PriorityTime.IMPORTANT }, // 50 messages ou 2s
		messageDelete: { maxSize: 50, maxWait: PriorityTime.IMPORTANT },
		messageUpdate: { maxSize: 50, maxWait: PriorityTime.IMPORTANT },
		messageReactionEvent: { maxSize: 50, maxWait: PriorityTime.SLOW },
		voiceStateUpdate: { maxSize: 50, maxWait: PriorityTime.SLOW }, // 50 états ou 5s
		guildMemberUpdate: { maxSize: 30, maxWait: PriorityTime.IMPORTANT }, // 30 updates ou 10s
		presenceUpdate: { maxSize: 100, maxWait: PriorityTime.SLOW }, // 100 présences ou 15s
		guildBanAdd: { maxSize: 1, maxWait: PriorityTime.CRITICAL },
		guildMemberRemove: { maxSize: 1, maxWait: PriorityTime.CRITICAL },
		guildSync: { maxSize: 1, maxWait: PriorityTime.CRITICAL},
		default: { maxSize: 50, maxWait: PriorityTime.SLOW }
	};

	public addEvent(event: BotEventDto) {
		const config = this.getConfig(event.type);

		//Critical Event: Send immediately
		if (!config || config.maxSize === 1) {
			this.sendImmediately(event);
			return;
		}

		//Set BatchKey
		const batchKey = `${event.guildId}_${event.type}`;

		//Init BatchKey if needed
		if (!this.batches.has(batchKey)) {
			this.batches.set(batchKey, []);
		}

		//Push event
		const batch = this.batches.get(batchKey)!;
		batch.push(event);

		if (batch.length >= config.maxSize) {
			this.flushBatch(batchKey);
		} else if (!this.timers.has(batchKey)) {
			// Démarrer le timer si pas déjà en cours
			const timer = setTimeout(() => {
				this.flushBatch(batchKey);
			}, config.maxWait);

			this.timers.set(batchKey, timer);
		}
	}

	private flushBatch(batchKey: string) {
		const batch = this.batches.get(batchKey);
		if (!batch || batch.length === 0) return;

		// Clear timer
		const timer = this.timers.get(batchKey);
		if (timer) {
			clearTimeout(timer);
			this.timers.delete(batchKey);
		}

		// Envoyer le batch
		this.sendBatches(batch);

		// Clear batch
		this.batches.delete(batchKey);
	}

	private getConfig(eventType: EventType): BatchConfig {
		if (eventType.includes(`VOICE`)) {
			return this.batchesConfig.voiceStateUpdate;
		}
		switch (eventType) {
			case EventType.MESSAGE_CREATE:
				return this.batchesConfig.messageCreate;
			case EventType.MESSAGE_DELETE:
				return this.batchesConfig.messageDelete;
			case EventType.MESSAGE_UPDATE:
				return this.batchesConfig.messageUpdate;
			case EventType.MESSAGE_REACTION_ADD:
				return this.batchesConfig.messageReactionEvent;
			case EventType.MESSAGE_REACTION_REMOVE:
				return this.batchesConfig.messageReactionEvent;
			case EventType.MESSAGE_REACTION_REMOVE_ALL:
				return this.batchesConfig.messageReactionEvent;
			case EventType.MESSAGE_REACTION_REMOVE_EMOJI:
				return this.batchesConfig.messageReactionEvent;
		}
		return this.batchesConfig.default;
	}

	private sendBatches(events: BotEventDto[]) {
		container.ws.sendToBackend(events);
	}

	private sendImmediately(event: BotEventDto) {
		const eventArray: BotEventDto[] = [];

		eventArray.push(event);
		container.ws.sendToBackend(eventArray);
	}

	public flushAll() {
		for (const batchKey of this.batches.keys()) {
			this.flushBatch(batchKey);
		}
	}
}