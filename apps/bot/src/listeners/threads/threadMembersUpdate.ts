import { Listener } from '@sapphire/framework';
import { Events, Collection, Snowflake, ThreadMember } from 'discord.js';
import { BotEventDto, ThreadMembersUpdateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class ThreadMembersUpdateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.ThreadMembersUpdate,
    });
  }

  public async run(
    addedMembers: Collection<Snowflake, ThreadMember>,
    removedMembers: Collection<Snowflake, ThreadMember>,
    thread: any // ThreadChannel type
  ): Promise<void> {
    if (!isListenerEnabled(EventType.THREAD_MEMBERS_UPDATE)) return;
    if (!thread.guild) return;

    try {
      if (addedMembers.size === 0 && removedMembers.size === 0) return;

      const addedMembersData = addedMembers.map(member => ({
        userId: member.id!,
        username: thread.guild.members.cache.get(member.id!)?.user.username || 'Unknown',
        joinedAt: member.joinedAt || new Date(),
      }));

      const removedMemberIds = removedMembers.map(member => member.id!);

      const eventData: ThreadMembersUpdateEventData = {
        threadId: thread.id,
        threadName: thread.name,
        parentChannelId: thread.parentId!,
        addedMembers: addedMembersData,
        removedMemberIds,
        memberCount: thread.memberCount || 0,
        updatedAt: new Date(),
      };

      const event: BotEventDto = {
        type: EventType.THREAD_MEMBERS_UPDATE,
        guildId: thread.guild.id,
        channelId: thread.id,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[ThreadMembersUpdateListener] Error processing thread members update:', error);
    }
  }
}