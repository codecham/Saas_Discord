import { Listener } from '@sapphire/framework';
import { Events, ThreadChannel } from 'discord.js';
import { BotEventDto, ThreadUpdateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class ThreadUpdateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.ThreadUpdate,
    });
  }

  public async run(oldThread: ThreadChannel, newThread: ThreadChannel): Promise<void> {
    if (!isListenerEnabled(EventType.THREAD_UPDATE)) return;
    if (!newThread.guild) return;

    try {
      const changes: ThreadUpdateEventData['changes'] = {};

      if (oldThread.name !== newThread.name) {
        changes.name = {
          old: oldThread.name,
          new: newThread.name,
        };
      }

      if (oldThread.archived !== newThread.archived) {
        changes.archived = {
          old: oldThread.archived!,
          new: newThread.archived!,
        };
      }

      if (oldThread.autoArchiveDuration !== newThread.autoArchiveDuration) {
        changes.autoArchiveDuration = {
          old: oldThread.autoArchiveDuration!,
          new: newThread.autoArchiveDuration!,
        };
      }

      if (oldThread.locked !== newThread.locked) {
        changes.locked = {
          old: oldThread.locked!,
          new: newThread.locked!,
        };
      }

      if (oldThread.rateLimitPerUser !== newThread.rateLimitPerUser) {
        changes.rateLimitPerUser = {
          old: oldThread.rateLimitPerUser!,
          new: newThread.rateLimitPerUser!,
        };
      }

      if (oldThread.flags?.bitfield !== newThread.flags?.bitfield) {
        changes.flags = {
          old: oldThread.flags?.bitfield || 0,
          new: newThread.flags?.bitfield || 0,
        };
      }

      // Tags pour les forum threads
      const oldTags = oldThread.appliedTags || [];
      const newTags = newThread.appliedTags || [];
      if (JSON.stringify(oldTags) !== JSON.stringify(newTags)) {
        changes.appliedTags = {
          old: oldTags,
          new: newTags,
          added: newTags.filter(tag => !oldTags.includes(tag)),
          removed: oldTags.filter(tag => !newTags.includes(tag)),
        };
      }

      if (Object.keys(changes).length === 0) return;

      const eventData: ThreadUpdateEventData = {
        threadId: newThread.id,
        threadName: newThread.name,
        parentChannelId: newThread.parentId!,
        changes,
        updatedAt: new Date(),
      };

      const event: BotEventDto = {
        type: EventType.THREAD_UPDATE,
        guildId: newThread.guild.id,
        channelId: newThread.id,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[ThreadUpdateListener] Error processing thread update:', error);
    }
  }
}