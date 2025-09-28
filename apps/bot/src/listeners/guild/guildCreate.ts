import { BotEventDto, GuildDTO, EventType } from '@my-project/shared-types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Guild } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: 'guildCreate'
})
export class GuildDeleteListener extends Listener {
	public override run(guild: Guild) {
		this.container.logger.info(`Bot add on new guild: ${guild}`);
		
		if (!guild) {
			return;
		}

		const newGuild: GuildDTO = this.createGuildDto(guild);
		const newEventDto: BotEventDto = this.createEventDTO(newGuild);
		this.container.ws.sendToBackend([newEventDto]);
	}

	private createGuildDto(guild: Guild) : GuildDTO {
		const newGuild: GuildDTO = {
			id: guild.id,
			name: guild.name,
			icon: guild.icon,
			ownerId: guild.ownerId,
			memberCount: guild.memberCount
		}
		return newGuild;
	}

	private createEventDTO(newGuild: GuildDTO) : BotEventDto {
		const eventDto: BotEventDto = {
			type: EventType.GuildCreate,
			guildId: '0',
			data: newGuild,
			timestamp: Date.now(),
		}
		return eventDto;
	}
}
