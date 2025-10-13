import { Listener } from '@sapphire/framework';
import { Events, GuildScheduledEvent, User } from 'discord.js';
import { BotEventDto, ScheduledEventUserAddEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class GuildScheduledEventUserAddListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.GuildScheduledEventUserAdd,
    });
  }

  public async run(scheduledEvent: GuildScheduledEvent, user: User): Promise<void> {
    if (!isListenerEnabled(EventType.GUILD_SCHEDULED_EVENT_USER_ADD)) return;
    if (!scheduledEvent.guild) return;

    try {
      const eventData: ScheduledEventUserAddEventData = {
        eventId: scheduledEvent.id,
        eventName: scheduledEvent.name,
        
        userId: user.id,
        username: user.username,
        userBot: user.bot,
        
        scheduledStartTime: scheduledEvent.scheduledStartAt!,
        
        totalInterestedUsers: scheduledEvent.userCount ?? undefined,
        
        addedAt: new Date(),
      };

      const event: BotEventDto = {
        type: EventType.GUILD_SCHEDULED_EVENT_USER_ADD,
        guildId: scheduledEvent.guild.id,
        userId: user.id,
        channelId: scheduledEvent.channelId ?? undefined,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[GuildScheduledEventUserAddListener] Error processing scheduled event user add:', error);
    }
  }
}