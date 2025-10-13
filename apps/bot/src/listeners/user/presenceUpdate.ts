import { Listener } from '@sapphire/framework';
import { Events, Presence } from 'discord.js';
import { BotEventDto, PresenceUpdateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class PresenceUpdateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.PresenceUpdate,
    });
  }

  public async run(oldPresence: Presence | null, newPresence: Presence): Promise<void> {
    if (!isListenerEnabled(EventType.PRESENCE_UPDATE)) return;
    if (!newPresence.guild) return;

    try {
      const changes: PresenceUpdateEventData['changes'] = {};

      // Status change
      const oldStatus = oldPresence?.status;
      const newStatus = newPresence.status;
      if (oldStatus !== newStatus) {
        changes.status = {
          old: oldStatus,
          new: newStatus,
        };
      }

      // Activities change
      const oldActivities = oldPresence?.activities.map(activity => ({
        name: activity.name,
        type: activity.type,
        details: activity.details ?? undefined,
        state: activity.state ?? undefined,
        url: activity.url ?? undefined,
      })) || [];

      const newActivities = newPresence.activities.map(activity => ({
        name: activity.name,
        type: activity.type,
        details: activity.details ?? undefined,
        state: activity.state ?? undefined,
        url: activity.url ?? undefined,
      }));

      if (JSON.stringify(oldActivities) !== JSON.stringify(newActivities)) {
        changes.activities = {
          old: oldActivities,
          new: newActivities,
        };
      }

      // Client status change
      const oldClientStatus = oldPresence?.clientStatus;
      const newClientStatus = newPresence.clientStatus;
      if (JSON.stringify(oldClientStatus) !== JSON.stringify(newClientStatus)) {
        changes.clientStatus = {
          old: oldClientStatus ? {
            web: oldClientStatus.web,
            mobile: oldClientStatus.mobile,
            desktop: oldClientStatus.desktop,
          } : undefined,
          new: newClientStatus ? {
            web: newClientStatus.web,
            mobile: newClientStatus.mobile,
            desktop: newClientStatus.desktop,
          } : undefined,
        };
      }

      if (Object.keys(changes).length === 0) return;

      const eventData: PresenceUpdateEventData = {
        userId: newPresence.userId!,
        username: newPresence.user?.username || 'Unknown',
        changes,
        updatedAt: new Date(),
      };

      const event: BotEventDto = {
        type: EventType.PRESENCE_UPDATE,
        guildId: newPresence.guild.id,
        userId: newPresence.userId!,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[PresenceUpdateListener] Error processing presence update:', error);
    }
  }
}