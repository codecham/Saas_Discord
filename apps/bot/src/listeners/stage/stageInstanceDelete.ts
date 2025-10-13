import { Listener } from '@sapphire/framework';
import { Events, StageInstance } from 'discord.js';
import { BotEventDto, StageInstanceDeleteEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class StageInstanceDeleteListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.StageInstanceDelete,
    });
  }

  public async run(stageInstance: StageInstance): Promise<void> {
    if (!isListenerEnabled(EventType.STAGE_INSTANCE_DELETE)) return;
    if (!stageInstance.guild) return;

    try {
      const deletedAt = new Date();
      const duration = stageInstance.createdAt 
        ? deletedAt.getTime() - stageInstance.createdAt.getTime() 
        : undefined;

      const eventData: StageInstanceDeleteEventData = {
        stageId: stageInstance.id,
        channelId: stageInstance.channelId,
        channelName: stageInstance.channel?.name || 'Unknown',
        
        topic: stageInstance.topic,
        
        privacyLevel: stageInstance.privacyLevel,
        discoverableDisabled: stageInstance.discoverableDisabled ?? false,
        
        guildScheduledEventId: stageInstance.guildScheduledEventId ?? undefined,
        
        createdAt: stageInstance.createdAt ?? undefined,
        deletedAt,
        
        duration,
      };

      const event: BotEventDto = {
        type: EventType.STAGE_INSTANCE_DELETE,
        guildId: stageInstance.guild.id,
        channelId: stageInstance.channelId,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[StageInstanceDeleteListener] Error processing stage instance delete:', error);
    }
  }
}