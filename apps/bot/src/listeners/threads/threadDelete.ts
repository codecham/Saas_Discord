import { Listener } from '@sapphire/framework';
import { Events, ThreadChannel } from 'discord.js';
import { BotEventDto, ThreadDeleteEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class ThreadDeleteListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.ThreadDelete,
    });
  }

  public async run(thread: ThreadChannel): Promise<void> {
    if (!isListenerEnabled(EventType.THREAD_DELETE)) return;
    if (!thread.guild) return;

    try {
      const deletedAt = new Date();
      const lifetime = thread.createdAt ? deletedAt.getTime() - thread.createdAt.getTime() : 0;

      const eventData: ThreadDeleteEventData = {
		threadId: thread.id,
		threadName: thread.name,
		
		parentChannelId: thread.parentId!,
		parentChannelName: thread.parent?.name || 'Unknown',
		
		type: thread.type,
		
		ownerId: thread.ownerId!,
		ownerUsername: thread.guild.members.cache.get(thread.ownerId!)?.user.username || 'Unknown',
		
		archived: thread.archived!,
		locked: thread.locked!,
		
		messageCount: thread.messageCount ?? undefined, // ← FIX: convertir null en undefined
		memberCount: thread.memberCount ?? undefined, // ← FIX: convertir null en undefined
		
		createdAt: thread.createdAt!,
		deletedAt,
		
		lifetime,
		};

      const event: BotEventDto = {
        type: EventType.THREAD_DELETE,
        guildId: thread.guild.id,
        channelId: thread.id,
        userId: thread.ownerId!,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[ThreadDeleteListener] Error processing thread delete:', error);
    }
  }
}