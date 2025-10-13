import { Listener } from '@sapphire/framework';
import { Events, StageInstance } from 'discord.js';
import { BotEventDto, StageInstanceUpdateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class StageInstanceUpdateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.StageInstanceUpdate,
    });
  }

  public async run(oldStageInstance: StageInstance | null, newStageInstance: StageInstance): Promise<void> {
    if (!isListenerEnabled(EventType.STAGE_INSTANCE_UPDATE)) return;
    if (!newStageInstance.guild) return;
    if (!oldStageInstance) return; // Pas de comparaison possible

    try {
      const changes: StageInstanceUpdateEventData['changes'] = {};

      if (oldStageInstance.topic !== newStageInstance.topic) {
        changes.topic = {
          old: oldStageInstance.topic,
          new: newStageInstance.topic,
        };
      }

      if (oldStageInstance.privacyLevel !== newStageInstance.privacyLevel) {
        changes.privacyLevel = {
          old: oldStageInstance.privacyLevel,
          new: newStageInstance.privacyLevel,
        };
      }

      if (oldStageInstance.discoverableDisabled !== newStageInstance.discoverableDisabled) {
        changes.discoverableDisabled = {
          old: oldStageInstance.discoverableDisabled ?? false,
          new: newStageInstance.discoverableDisabled ?? false,
        };
      }

      if (Object.keys(changes).length === 0) return;

      const eventData: StageInstanceUpdateEventData = {
        stageId: newStageInstance.id,
        channelId: newStageInstance.channelId,
        channelName: newStageInstance.channel?.name || 'Unknown',
        changes,
        updatedAt: new Date(),
      };

      const event: BotEventDto = {
        type: EventType.STAGE_INSTANCE_UPDATE,
        guildId: newStageInstance.guild.id,
        channelId: newStageInstance.channelId,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[StageInstanceUpdateListener] Error processing stage instance update:', error);
    }
  }
}