import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { DMChannel, GuildChannel } from 'discord.js';
import { BotEventDto, ChannelDeleteEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

@ApplyOptions<Listener.Options>({
  event: Events.ChannelDelete
})
export class ChannelDeleteListener extends Listener {
  public override async run(channel: DMChannel | GuildChannel) {
    // 1. Vérification configuration
    if (!isListenerEnabled(EventType.CHANNEL_DELETE)) return;

    // 2. Vérification que c'est bien un channel de guild
    if (!('guild' in channel) || !channel.guild) return;

    try {
      // 3. Extraction des données
      const eventData: ChannelDeleteEventData = {
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type,
        parentId: channel.parentId ?? undefined,
        parentName: channel.parent?.name ?? undefined,
        position: channel.position,
        deletedAt: new Date()
      };

      // 4. Création du BotEventDto
      const event: BotEventDto = {
        type: EventType.CHANNEL_DELETE,
        guildId: channel.guild.id,
        channelId: channel.id,
        timestamp: Date.now(),
        data: eventData
      };

      // 5. Envoi via le batcher
      this.container.eventBatcher.addEvent(event);

      this.container.logger.debug(
        `[ChannelDelete] Channel deleted: ${channel.name} (${channel.id}) in guild ${channel.guild.name}`
      );
    } catch (error) {
      this.container.logger.error('[ChannelDelete] Error processing channel delete:', error);
    }
  }
}