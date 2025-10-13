import { Listener } from '@sapphire/framework';
import { Events, GuildEmoji } from 'discord.js';
import { BotEventDto, EmojiCreateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class EmojiCreateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.GuildEmojiCreate,
    });
  }

  public async run(emoji: GuildEmoji): Promise<void> {
    if (!isListenerEnabled(EventType.EMOJI_CREATE)) return;
    if (!emoji.guild) return;

    try {
      const eventData: EmojiCreateEventData = {
        emojiId: emoji.id!,
        emojiName: emoji.name!,
        
        animated: emoji.animated!,
        
        creatorId: emoji.author?.id,
        creatorUsername: emoji.author?.username,
        creatorBot: emoji.author?.bot,
        
        managed: emoji.managed!,
        requireColons: emoji.requiresColons ?? true,
        available: emoji.available ?? true,
        
        roles: emoji.roles.cache.map(role => role.id),
        
        createdAt: emoji.createdAt!,
      };

      const event: BotEventDto = {
        type: EventType.EMOJI_CREATE,
        guildId: emoji.guild.id,
        userId: emoji.author?.id,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[EmojiCreateListener] Error processing emoji create:', error);
    }
  }
}