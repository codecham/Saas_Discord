import { Listener } from '@sapphire/framework';
import { Events, Sticker } from 'discord.js';
import { BotEventDto, StickerDeleteEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class GuildStickerDeleteListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.GuildStickerDelete,
    });
  }

  public async run(sticker: Sticker): Promise<void> {
    if (!isListenerEnabled(EventType.GUILD_STICKER_DELETE)) return;
    if (!sticker.guild) return;

    try {
      const deletedAt = new Date();
      const lifetime = sticker.createdAt ? deletedAt.getTime() - sticker.createdAt.getTime() : undefined;

      const eventData: StickerDeleteEventData = {
        stickerId: sticker.id,
        stickerName: sticker.name,
        
        description: sticker.description ?? undefined,
        tags: sticker.tags ?? undefined,
        
        type: sticker.type ?? 2,
        formatType: sticker.format,
        
        available: sticker.available ?? true,
        
        createdAt: sticker.createdAt ?? undefined,
        deletedAt,
        
        lifetime,
      };

      const event: BotEventDto = {
        type: EventType.GUILD_STICKER_DELETE,
        guildId: sticker.guild.id,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[GuildStickerDeleteListener] Error processing sticker delete:', error);
    }
  }
}