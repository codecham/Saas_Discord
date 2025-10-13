import { Listener } from '@sapphire/framework';
import { Events, GuildChannel } from 'discord.js';
import { BotEventDto, WebhooksUpdateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class WebhooksUpdateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.WebhooksUpdate,
    });
  }

  public async run(channel: GuildChannel): Promise<void> {
    if (!isListenerEnabled(EventType.WEBHOOKS_UPDATE)) return;
    if (!channel.guild) return;

    try {
      const eventData: WebhooksUpdateEventData = {
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type,
        updatedAt: new Date(),
      };

      const event: BotEventDto = {
        type: EventType.WEBHOOKS_UPDATE,
        guildId: channel.guild.id,
        channelId: channel.id,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[WebhooksUpdateListener] Error processing webhooks update:', error);
    }
  }
}