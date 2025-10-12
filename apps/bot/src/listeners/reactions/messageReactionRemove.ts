import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { MessageReaction, PartialMessageReaction, User, PartialUser } from 'discord.js';
import { BotEventDto, EventType, ReactionRemoveEventData } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

@ApplyOptions<Listener.Options>({
  event: 'messageReactionRemove'
})
export class MessageReactionRemoveListener extends Listener {
  
  public override async run(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ): Promise<void> {
    if (!isListenerEnabled('MESSAGE_REACTION_REMOVE')) {
      return;
    }

    if (reaction.partial) {
      try {
        reaction = await reaction.fetch();
      } catch (error) {
        this.container.logger.warn(`[REACTION_REMOVE] Failed to fetch reaction`);
        return;
      }
    }

    if (user.partial) {
      try {
        user = await user.fetch();
      } catch (error) {
        this.container.logger.warn(`[REACTION_REMOVE] Failed to fetch user`);
        return;
      }
    }

    if (!reaction.message.guildId || user.bot) {
      return;
    }

    const eventData = this.extractReactionData(reaction, user as User);

    const event: BotEventDto = {
      type: EventType.MESSAGE_REACTION_REMOVE,
      guildId: reaction.message.guildId,
      userId: user.id,
      channelId: reaction.message.channelId,
      messageId: reaction.message.id,
      data: eventData,
      timestamp: Date.now()
    };

    this.container.eventBatcher.addEvent(event);

    this.container.logger.debug(
      `[REACTION_REMOVE] Guild: ${reaction.message.guildId} | User: ${user.id} | Emoji: ${reaction.emoji.name}`
    );
  }

  private extractReactionData(reaction: MessageReaction, user: User): ReactionRemoveEventData {
    return {
      emoji: {
        id: reaction.emoji.id || undefined,
        name: reaction.emoji.name || '❓',
        animated: reaction.emoji.animated || undefined
      },
      userId: user.id,
      username: user.username,
      messageAuthorId: reaction.message.author?.id || undefined
    };
  }
}