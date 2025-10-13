import { Listener } from '@sapphire/framework';
import { Events, ThreadChannel } from 'discord.js';
import { BotEventDto, ThreadCreateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class ThreadCreateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.ThreadCreate,
    });
  }

  public async run(thread: ThreadChannel): Promise<void> {
    if (!isListenerEnabled(EventType.THREAD_CREATE)) return;
    if (!thread.guild) return;

    try {
      const eventData: ThreadCreateEventData = {
		threadId: thread.id,
		threadName: thread.name,
		
		parentChannelId: thread.parentId!,
		parentChannelName: thread.parent?.name || 'Unknown',
		
		ownerId: thread.ownerId!,
		ownerUsername: thread.guild.members.cache.get(thread.ownerId!)?.user.username || 'Unknown',
		ownerBot: thread.guild.members.cache.get(thread.ownerId!)?.user.bot || false,
		
		type: thread.type,
		
		autoArchiveDuration: thread.autoArchiveDuration!,
		archived: thread.archived!,
		archiveTimestamp: thread.archiveTimestamp ? new Date(thread.archiveTimestamp) : undefined,
		locked: thread.locked!,
		
		invitable: thread.invitable ?? undefined, // ← FIX: convertir null en undefined
		
		messageCount: thread.messageCount ?? undefined, // ← FIX: convertir null en undefined
		memberCount: thread.memberCount ?? undefined, // ← FIX: convertir null en undefined
		
		createdAt: thread.createdAt!,
		
		messageId: thread.id,
		};

      const event: BotEventDto = {
        type: EventType.THREAD_CREATE,
        guildId: thread.guild.id,
        channelId: thread.id,
        userId: thread.ownerId!,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[ThreadCreateListener] Error processing thread create:', error);
    }
  }
}