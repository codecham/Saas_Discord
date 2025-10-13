import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { GuildTextBasedChannel } from 'discord.js';
import { BotEventDto, ChannelPinsUpdateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

@ApplyOptions<Listener.Options>({
  event: Events.ChannelPinsUpdate
})
export class ChannelPinsUpdateListener extends Listener {
  public override async run(channel: GuildTextBasedChannel, time: Date | null) {
    // 1. Vérification configuration
    if (!isListenerEnabled(EventType.CHANNEL_PINS_UPDATE)) return;

    // 2. Vérification que c'est bien un channel de guild
    if (!channel.guild) return;

    try {
      // 3. Extraction des données
      const eventData: ChannelPinsUpdateEventData = {
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type,
        lastPinTimestamp: time ?? undefined,
        updatedAt: new Date()
      };

      // 4. Création du BotEventDto
      const event: BotEventDto = {
        type: EventType.CHANNEL_PINS_UPDATE,
        guildId: channel.guild.id,
        channelId: channel.id,
        timestamp: Date.now(),
        data: eventData
      };

      // 5. Envoi via le batcher
      this.container.eventBatcher.addEvent(event);

      this.container.logger.debug(
        `[ChannelPinsUpdate] Pins updated in channel: ${channel.name} (${channel.id}) - Last pin: ${time?.toISOString() ?? 'None'}`
      );
    } catch (error) {
      this.container.logger.error('[ChannelPinsUpdate] Error processing channel pins update:', error);
    }
  }
}