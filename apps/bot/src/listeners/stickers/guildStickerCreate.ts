import { Listener } from '@sapphire/framework';
import { Events, Sticker } from 'discord.js';
import { BotEventDto, StickerCreateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class GuildStickerCreateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.GuildStickerCreate,
    });
  }

  public async run(sticker: Sticker): Promise<void> {
    if (!isListenerEnabled(EventType.GUILD_STICKER_CREATE)) return;
    if (!sticker.guild) return;

    try {
      const eventData: StickerCreateEventData = {
        stickerId: sticker.id,
        stickerName: sticker.name,
        
        description: sticker.description ?? undefined,
        
        tags: sticker.tags ?? undefined,
        
        type: sticker.type ?? 2,
        formatType: sticker.format,
        
        creatorId: sticker.user?.id,
        creatorUsername: sticker.user?.username,
        creatorBot: sticker.user?.bot,
        
        available: sticker.available ?? true,
        
        createdAt: sticker.createdAt!,
      };

      const event: BotEventDto = {
        type: EventType.GUILD_STICKER_CREATE,
        guildId: sticker.guild.id,
        userId: sticker.user?.id,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[GuildStickerCreateListener] Error processing sticker create:', error);
    }
  }
}
