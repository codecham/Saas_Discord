import { Listener } from '@sapphire/framework';
import { Events, GuildScheduledEvent, GuildScheduledEventStatus } from 'discord.js';
import { BotEventDto, ScheduledEventDeleteEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class GuildScheduledEventDeleteListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.GuildScheduledEventDelete,
    });
  }

  public async run(scheduledEvent: GuildScheduledEvent): Promise<void> {
    if (!isListenerEnabled(EventType.GUILD_SCHEDULED_EVENT_DELETE)) return;
    if (!scheduledEvent.guild) return;

    try {
      const deletedAt = new Date();

      const eventData: ScheduledEventDeleteEventData = {
        eventId: scheduledEvent.id,
        eventName: scheduledEvent.name,
        
        description: scheduledEvent.description ?? undefined,
        
        scheduledStartTime: scheduledEvent.scheduledStartAt!,
        scheduledEndTime: scheduledEvent.scheduledEndAt ?? undefined,
        
        entityType: scheduledEvent.entityType,
        channelId: scheduledEvent.channelId ?? undefined,
        
        status: scheduledEvent.status,
        
        userCount: scheduledEvent.userCount ?? undefined,
        
        createdAt: scheduledEvent.createdAt ?? undefined,
        deletedAt,
        
        wasCanceled: scheduledEvent.status === GuildScheduledEventStatus.Canceled,
      };

      const event: BotEventDto = {
        type: EventType.GUILD_SCHEDULED_EVENT_DELETE,
        guildId: scheduledEvent.guild.id,
        channelId: scheduledEvent.channelId ?? undefined,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[GuildScheduledEventDeleteListener] Error processing scheduled event delete:', error);
    }
  }
}