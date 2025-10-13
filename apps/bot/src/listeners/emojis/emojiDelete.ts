import { Listener } from '@sapphire/framework';
import { Events, GuildEmoji } from 'discord.js';
import { BotEventDto, EmojiDeleteEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class EmojiDeleteListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.GuildEmojiDelete,
    });
  }

  public async run(emoji: GuildEmoji): Promise<void> {
    if (!isListenerEnabled(EventType.EMOJI_DELETE)) return;
    if (!emoji.guild) return;

    try {
      const deletedAt = new Date();
      const lifetime = emoji.createdAt ? deletedAt.getTime() - emoji.createdAt.getTime() : undefined;

      const eventData: EmojiDeleteEventData = {
        emojiId: emoji.id!,
        emojiName: emoji.name!,
        
        animated: emoji.animated!,
        
        managed: emoji.managed!,
        requireColons: emoji.requiresColons ?? true,
        
        roles: emoji.roles.cache.map(role => role.id),
        
        createdAt: emoji.createdAt ?? undefined,
        deletedAt,
        
        lifetime,
      };

      const event: BotEventDto = {
        type: EventType.EMOJI_DELETE,
        guildId: emoji.guild.id,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[EmojiDeleteListener] Error processing emoji delete:', error);
    }
  }
}