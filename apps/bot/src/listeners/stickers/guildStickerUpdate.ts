import { Listener } from '@sapphire/framework';
import { Events, Sticker } from 'discord.js';
import { BotEventDto, StickerUpdateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class GuildStickerUpdateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.GuildStickerUpdate,
    });
  }

  public async run(oldSticker: Sticker, newSticker: Sticker): Promise<void> {
    if (!isListenerEnabled(EventType.GUILD_STICKER_UPDATE)) return;
    if (!newSticker.guild) return;

    try {
      const changes: StickerUpdateEventData['changes'] = {};

      if (oldSticker.name !== newSticker.name) {
        changes.name = {
          old: oldSticker.name,
          new: newSticker.name,
        };
      }

      if (oldSticker.description !== newSticker.description) {
        changes.description = {
          old: oldSticker.description ?? undefined,
          new: newSticker.description ?? undefined,
        };
      }

      if (oldSticker.tags !== newSticker.tags) {
        changes.tags = {
          old: oldSticker.tags ?? undefined,
          new: newSticker.tags ?? undefined,
        };
      }

      if (Object.keys(changes).length === 0) return;

      const eventData: StickerUpdateEventData = {
        stickerId: newSticker.id,
        stickerName: newSticker.name,
        changes,
        updatedAt: new Date(),
      };

      const event: BotEventDto = {
        type: EventType.GUILD_STICKER_UPDATE,
        guildId: newSticker.guild.id,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[GuildStickerUpdateListener] Error processing sticker update:', error);
    }
  }
}