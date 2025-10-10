import { BotEventDto, GuildDTO, EventType } from '@my-project/shared-types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Guild } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: 'guildDelete'
})
export class GuildDeleteListener extends Listener {
	public override run(guild: Guild) {
		this.container.logger.info(`Bot deleted from guild: ${guild}`);
		
		if (!guild) {
			return;
		}

		const oldGuild: GuildDTO = this.createGuildDto(guild);
		const newEventDto: BotEventDto = this.createEventDTO(oldGuild);
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

	private createEventDTO(oldGuild: GuildDTO) : BotEventDto {
		const eventDto: BotEventDto = {
			type: EventType.GUILD_DELETE,
			guildId: '0',
			data: oldGuild,
			timestamp: Date.now(),
		}
		return eventDto;
	}
}
