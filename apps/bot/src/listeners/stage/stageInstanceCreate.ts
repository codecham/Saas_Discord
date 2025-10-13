import { Listener } from '@sapphire/framework';
import { Events, StageInstance } from 'discord.js';
import { BotEventDto, StageInstanceCreateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class StageInstanceCreateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.StageInstanceCreate,
    });
  }

  public async run(stageInstance: StageInstance): Promise<void> {
    if (!isListenerEnabled(EventType.STAGE_INSTANCE_CREATE)) return;
    if (!stageInstance.guild) return;

    try {
      const eventData: StageInstanceCreateEventData = {
        stageId: stageInstance.id,
        channelId: stageInstance.channelId,
        channelName: stageInstance.channel?.name || 'Unknown',
        
        topic: stageInstance.topic,
        
        privacyLevel: stageInstance.privacyLevel,
        discoverableDisabled: stageInstance.discoverableDisabled ?? false,
        
        guildScheduledEventId: stageInstance.guildScheduledEventId ?? undefined,
        
        createdAt: stageInstance.createdAt ?? new Date(),
      };

      const event: BotEventDto = {
        type: EventType.STAGE_INSTANCE_CREATE,
        guildId: stageInstance.guild.id,
        channelId: stageInstance.channelId,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[StageInstanceCreateListener] Error processing stage instance create:', error);
    }
  }
}