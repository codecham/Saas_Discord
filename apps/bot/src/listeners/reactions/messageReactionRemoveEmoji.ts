import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { MessageReaction, PartialMessageReaction } from 'discord.js';
import { BotEventDto, EventType, ReactionRemoveEmojiEventData } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

@ApplyOptions<Listener.Options>({
  event: 'messageReactionRemoveEmoji'
})
export class MessageReactionRemoveEmojiListener extends Listener {
  
  public override async run(reaction: MessageReaction | PartialMessageReaction): Promise<void> {
    if (!isListenerEnabled('MESSAGE_REACTION_REMOVE_EMOJI')) {
      return;
    }

    if (reaction.partial) {
      try {
        reaction = await reaction.fetch();
      } catch (error) {
        this.container.logger.warn(`[REACTION_REMOVE_EMOJI] Failed to fetch reaction`);
        return;
      }
    }

    if (!reaction.message.guildId) {
      return;
    }

    const eventData = this.extractReactionData(reaction);

    const event: BotEventDto = {
      type: EventType.MESSAGE_REACTION_REMOVE_EMOJI,
      guildId: reaction.message.guildId,
      channelId: reaction.message.channelId,
      messageId: reaction.message.id,
      data: eventData,
      timestamp: Date.now()
    };

    this.container.eventBatcher.addEvent(event);

    this.container.logger.debug(
      `[REACTION_REMOVE_EMOJI] Guild: ${reaction.message.guildId} | Emoji: ${reaction.emoji.name}`
    );
  }

  private extractReactionData(reaction: MessageReaction): ReactionRemoveEmojiEventData {
    return {
      emoji: {
        id: reaction.emoji.id || undefined,
        name: reaction.emoji.name || '❓',
        animated: reaction.emoji.animated || undefined
      },
      count: reaction.count || 0
    };
  }
}