import { BotEventDto, GuildDTO, EventType } from '@my-project/shared-types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Guild } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: 'guildUpdate'
})
export class GuildUpdateListener extends Listener {
	// CORRECTION: guildUpdate fournit oldGuild ET newGuild
	public override run(oldGuild: Guild, newGuild: Guild) {
		this.container.logger.info(`Guild updated: ${oldGuild.name} -> ${newGuild.name}`);
		
		if (!newGuild) {
			return;
		}

		// Utiliser la NOUVELLE guild pour obtenir les données mises à jour
		const updatedGuild: GuildDTO = this.createGuildDto(newGuild);
		const newEventDto: BotEventDto = this.createEventDTO(updatedGuild);
		
		// Optionnel: Log des changements pour debug
		this.logChanges(oldGuild, newGuild);
		
		this.container.ws.sendToBackend([newEventDto]);
	}

	private createGuildDto(guild: Guild): GuildDTO {
		const updatedGuild: GuildDTO = {
			id: guild.id,
			name: guild.name,
			icon: guild.icon,
			ownerId: guild.ownerId,
			memberCount: guild.memberCount
		}
		return updatedGuild;
	}

	private createEventDTO(updatedGuild: GuildDTO): BotEventDto {
		const eventDto: BotEventDto = {
			type: EventType.GUILD_UPDATE,
			guildId: '0',
			data: updatedGuild,
			timestamp: Date.now(),
		}
		return eventDto;
	}

	// Méthode utile pour debug - vous pouvez la supprimer si non nécessaire
	private logChanges(oldGuild: Guild, newGuild: Guild): void {
		const changes: string[] = [];
		
		if (oldGuild.name !== newGuild.name) {
			changes.push(`Name: "${oldGuild.name}" -> "${newGuild.name}"`);
		}
		
		if (oldGuild.icon !== newGuild.icon) {
			changes.push(`Icon: "${oldGuild.icon}" -> "${newGuild.icon}"`);
		}
		
		if (oldGuild.ownerId !== newGuild.ownerId) {
			changes.push(`Owner: "${oldGuild.ownerId}" -> "${newGuild.ownerId}"`);
		}
		
		if (oldGuild.memberCount !== newGuild.memberCount) {
			changes.push(`Members: ${oldGuild.memberCount} -> ${newGuild.memberCount}`);
		}
		
		if (changes.length > 0) {
			this.container.logger.info(`Guild changes detected: ${changes.join(', ')}`);
		}
	}
}