import { Listener } from '@sapphire/framework';
import { Events, GuildScheduledEvent, User } from 'discord.js';
import { BotEventDto, ScheduledEventUserRemoveEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class GuildScheduledEventUserRemoveListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.GuildScheduledEventUserRemove,
    });
  }

  public async run(scheduledEvent: GuildScheduledEvent, user: User): Promise<void> {
    if (!isListenerEnabled(EventType.GUILD_SCHEDULED_EVENT_USER_REMOVE)) return;
    if (!scheduledEvent.guild) return;

    try {
      const eventData: ScheduledEventUserRemoveEventData = {
        eventId: scheduledEvent.id,
        eventName: scheduledEvent.name,
        
        userId: user.id,
        username: user.username,
        userBot: user.bot,
        
        scheduledStartTime: scheduledEvent.scheduledStartAt!,
        
        totalInterestedUsers: scheduledEvent.userCount ?? undefined,
        
        removedAt: new Date(),
      };

      const event: BotEventDto = {
        type: EventType.GUILD_SCHEDULED_EVENT_USER_REMOVE,
        guildId: scheduledEvent.guild.id,
        userId: user.id,
        channelId: scheduledEvent.channelId ?? undefined,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[GuildScheduledEventUserRemoveListener] Error processing scheduled event user remove:', error);
    }
  }
}