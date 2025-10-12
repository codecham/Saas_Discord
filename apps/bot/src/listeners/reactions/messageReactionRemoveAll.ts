import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Message, PartialMessage, Collection, MessageReaction } from 'discord.js';
import { BotEventDto, EventType, ReactionRemoveAllEventData } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

@ApplyOptions<Listener.Options>({
  event: 'messageReactionRemoveAll'
})
export class MessageReactionRemoveAllListener extends Listener {
  
  public override async run(
    message: Message | PartialMessage,
    reactions: Collection<string, MessageReaction>
  ): Promise<void> {
    if (!isListenerEnabled('MESSAGE_REACTION_REMOVE_ALL')) {
      return;
    }

    if (!message.guildId) {
      return;
    }

    const eventData = this.extractReactionData(reactions);

    const event: BotEventDto = {
      type: EventType.MESSAGE_REACTION_REMOVE_ALL,
      guildId: message.guildId,
      channelId: message.channelId,
      messageId: message.id,
      data: eventData,
      timestamp: Date.now()
    };

    this.container.eventBatcher.addEvent(event);

    this.container.logger.debug(
      `[REACTION_REMOVE_ALL] Guild: ${message.guildId} | Message: ${message.id} | Count: ${reactions.size}`
    );
  }

  private extractReactionData(reactions: Collection<string, MessageReaction>): ReactionRemoveAllEventData {
    const removedReactions = Array.from(reactions.values()).map(reaction => ({
      emoji: {
        id: reaction.emoji.id || undefined,
        name: reaction.emoji.name || '❓'
      },
      count: reaction.count || 0
    }));

    return {
      removedReactions
    };
  }
}