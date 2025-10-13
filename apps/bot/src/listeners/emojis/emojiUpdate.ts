import { Listener } from '@sapphire/framework';
import { Events, GuildEmoji } from 'discord.js';
import { BotEventDto, EmojiUpdateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class EmojiUpdateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.GuildEmojiUpdate,
    });
  }

  public async run(oldEmoji: GuildEmoji, newEmoji: GuildEmoji): Promise<void> {
    if (!isListenerEnabled(EventType.EMOJI_UPDATE)) return;
    if (!newEmoji.guild) return;

    try {
      const changes: EmojiUpdateEventData['changes'] = {};

      if (oldEmoji.name !== newEmoji.name) {
        changes.name = {
          old: oldEmoji.name!,
          new: newEmoji.name!,
        };
      }

      const oldRoles = oldEmoji.roles.cache.map(role => role.id).sort();
      const newRoles = newEmoji.roles.cache.map(role => role.id).sort();
      
      if (JSON.stringify(oldRoles) !== JSON.stringify(newRoles)) {
        changes.roles = {
          old: oldRoles,
          new: newRoles,
          added: newRoles.filter(id => !oldRoles.includes(id)),
          removed: oldRoles.filter(id => !newRoles.includes(id)),
        };
      }

      if (Object.keys(changes).length === 0) return;

      const eventData: EmojiUpdateEventData = {
        emojiId: newEmoji.id!,
        emojiName: newEmoji.name!,
        animated: newEmoji.animated!,
        changes,
        updatedAt: new Date(),
      };

      const event: BotEventDto = {
        type: EventType.EMOJI_UPDATE,
        guildId: newEmoji.guild.id,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[EmojiUpdateListener] Error processing emoji update:', error);
    }
  }
}