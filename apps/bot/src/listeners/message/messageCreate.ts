import { BotEventDto } from '@my-project/shared-types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Message, MessageType } from 'discord.js';
import { EventType } from '@my-project/shared-types';

@ApplyOptions<Listener.Options>({
	event: 'messageCreate'
})
export class MessageCreateListener extends Listener {
	public override run(message: Message) {
		if (!this.shouldProcessMessage(message)) {
			return;
		}
		this.container.logger.info(`MessageCreate event catch!`);
		const guildId = message.guild?.id;
		if (guildId) {
			const eventArray: BotEventDto[] = [];
			const event: BotEventDto = {
				type: EventType.MESSAGE_CREATE,
				guildId: message.guild.id,
				userId: message.author.id,
				channelId: message.channel.id,
				data: message.content,
				timestamp: Date.now()
			}
			eventArray.push(event);
			this.container.ws.sendToBackend(eventArray);
		}
	}


	private shouldProcessMessage(message: Message): boolean {
		// Ignorer si pas dans un serveur
		if (!message.guildId) {
			return false;
		}

		// Ignorer les bots selon configuration
		if (message.author.bot) {
			return false;
		}

		// Ignorer les messages système (UserJoin, etc.)
		// MessageType.UserJoin = 7, mais il y en a d'autres
		if (message.type !== MessageType.Default && message.type !== MessageType.Reply) {
			return false;
		}
		return true;
	}
}
