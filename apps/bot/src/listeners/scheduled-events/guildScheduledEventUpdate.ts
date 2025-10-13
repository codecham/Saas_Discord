import { Listener } from '@sapphire/framework';
import { Events, GuildScheduledEvent } from 'discord.js';
import { BotEventDto, ScheduledEventUpdateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class GuildScheduledEventUpdateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.GuildScheduledEventUpdate,
    });
  }

  public async run(oldEvent: GuildScheduledEvent | null, newEvent: GuildScheduledEvent): Promise<void> {
    if (!isListenerEnabled(EventType.GUILD_SCHEDULED_EVENT_UPDATE)) return;
    if (!newEvent.guild) return;
    if (!oldEvent) return; // Pas de comparaison possible

    try {
      const changes: ScheduledEventUpdateEventData['changes'] = {};

      if (oldEvent.name !== newEvent.name) {
        changes.name = {
          old: oldEvent.name,
          new: newEvent.name,
        };
      }

      if (oldEvent.description !== newEvent.description) {
        changes.description = {
          old: oldEvent.description ?? undefined,
          new: newEvent.description ?? undefined,
        };
      }

      if (oldEvent.scheduledStartAt?.getTime() !== newEvent.scheduledStartAt?.getTime()) {
        changes.scheduledStartTime = {
          old: oldEvent.scheduledStartAt!,
          new: newEvent.scheduledStartAt!,
        };
      }

      if (oldEvent.scheduledEndAt?.getTime() !== newEvent.scheduledEndAt?.getTime()) {
        changes.scheduledEndTime = {
          old: oldEvent.scheduledEndAt ?? undefined,
          new: newEvent.scheduledEndAt ?? undefined,
        };
      }

      if (oldEvent.status !== newEvent.status) {
        changes.status = {
          old: oldEvent.status,
          new: newEvent.status,
        };
      }

      if (oldEvent.channelId !== newEvent.channelId) {
        changes.channelId = {
          old: oldEvent.channelId ?? undefined,
          new: newEvent.channelId ?? undefined,
        };
      }

      const oldLocation = oldEvent.entityMetadata?.location;
      const newLocation = newEvent.entityMetadata?.location;
      if (oldLocation !== newLocation) {
        changes.entityMetadata = {
          old: oldLocation ? { location: oldLocation } : undefined,
          new: newLocation ? { location: newLocation } : undefined,
        };
      }

      const oldImage = oldEvent.coverImageURL();
      const newImage = newEvent.coverImageURL();
      if (oldImage !== newImage) {
        changes.image = {
          old: oldImage ?? undefined,
          new: newImage ?? undefined,
        };
      }

      if (Object.keys(changes).length === 0) return;

      const eventData: ScheduledEventUpdateEventData = {
        eventId: newEvent.id,
        eventName: newEvent.name,
        changes,
        updatedAt: new Date(),
      };

      const event: BotEventDto = {
        type: EventType.GUILD_SCHEDULED_EVENT_UPDATE,
        guildId: newEvent.guild.id,
        channelId: newEvent.channelId ?? undefined,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[GuildScheduledEventUpdateListener] Error processing scheduled event update:', error);
    }
  }
}