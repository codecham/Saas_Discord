import { Listener } from '@sapphire/framework';
import { Events, Guild } from 'discord.js';
import { BotEventDto, GuildIntegrationsUpdateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class GuildIntegrationsUpdateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.GuildIntegrationsUpdate,
    });
  }

  public async run(guild: Guild): Promise<void> {
    if (!isListenerEnabled(EventType.GUILD_INTEGRATIONS_UPDATE)) return;

    try {
      const eventData: GuildIntegrationsUpdateEventData = {
        updatedAt: new Date(),
      };

      const event: BotEventDto = {
        type: EventType.GUILD_INTEGRATIONS_UPDATE,
        guildId: guild.id,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[GuildIntegrationsUpdateListener] Error processing guild integrations update:', error);
    }
  }
}