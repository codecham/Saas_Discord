import { Listener } from '@sapphire/framework';
import { Events, GuildScheduledEvent } from 'discord.js';
import { BotEventDto, ScheduledEventCreateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class GuildScheduledEventCreateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.GuildScheduledEventCreate,
    });
  }

  public async run(scheduledEvent: GuildScheduledEvent): Promise<void> {
    if (!isListenerEnabled(EventType.GUILD_SCHEDULED_EVENT_CREATE)) return;
    if (!scheduledEvent.guild) return;

    try {
      const eventData: ScheduledEventCreateEventData = {
        eventId: scheduledEvent.id,
        eventName: scheduledEvent.name,
        
        description: scheduledEvent.description ?? undefined,
        
        scheduledStartTime: scheduledEvent.scheduledStartAt!,
        scheduledEndTime: scheduledEvent.scheduledEndAt ?? undefined,
        
        entityType: scheduledEvent.entityType,
        entityMetadata: scheduledEvent.entityMetadata ? {
          location: scheduledEvent.entityMetadata.location ?? undefined,
        } : undefined,
        
        channelId: scheduledEvent.channelId ?? undefined,
        channelName: scheduledEvent.channel?.name ?? undefined,
        
        creatorId: scheduledEvent.creatorId ?? undefined,
        creatorUsername: scheduledEvent.creator?.username ?? undefined,
        creatorBot: scheduledEvent.creator?.bot ?? undefined,
        
        status: scheduledEvent.status,
        
        privacyLevel: scheduledEvent.privacyLevel,
        
        userCount: scheduledEvent.userCount ?? undefined,
        
        image: scheduledEvent.coverImageURL() ?? undefined,
        
        createdAt: scheduledEvent.createdAt!,
      };

      const event: BotEventDto = {
        type: EventType.GUILD_SCHEDULED_EVENT_CREATE,
        guildId: scheduledEvent.guild.id,
        channelId: scheduledEvent.channelId ?? undefined,
        userId: scheduledEvent.creatorId ?? undefined,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[GuildScheduledEventCreateListener] Error processing scheduled event create:', error);
    }
  }
}