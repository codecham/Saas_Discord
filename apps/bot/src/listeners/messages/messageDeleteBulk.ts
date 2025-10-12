import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Collection, Message, PartialMessage, Snowflake } from 'discord.js';
import { BotEventDto, EventType, MessageDeleteBulkEventData } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

/**
 * Listener pour l'événement MESSAGE_DELETE_BULK
 * 
 * Déclenché lors d'une suppression en masse de messages (souvent via modération).
 * Capture les IDs de tous les messages et les infos des messages en cache.
 * 
 * @event messageDeleteBulk
 */
@ApplyOptions<Listener.Options>({
  event: 'messageDeleteBulk'
})
export class MessageDeleteBulkListener extends Listener {
  
  public override async run(
    messages: Collection<Snowflake, Message | PartialMessage>
  ): Promise<void> {
    if (!isListenerEnabled('MESSAGE_DELETE_BULK')) {
      return;
    }

    // Prendre le premier message pour récupérer les infos du guild/channel
    const firstMessage = messages.first();
    if (!firstMessage || !firstMessage.guildId) {
      return;
    }

    const eventData = this.extractBulkDeleteData(messages, firstMessage);

    const event: BotEventDto = {
      type: EventType.MESSAGE_DELETE_BULK,
      guildId: firstMessage.guildId,
      channelId: firstMessage.channelId,
      data: eventData,
      timestamp: Date.now()
    };

    this.container.eventBatcher.addEvent(event);

    this.container.logger.debug(
      `[MESSAGE_DELETE_BULK] Guild: ${firstMessage.guildId} | Count: ${messages.size}`
    );
  }

  private extractBulkDeleteData(
    messages: Collection<Snowflake, Message | PartialMessage>,
    firstMessage: Message | PartialMessage
  ): MessageDeleteBulkEventData {
    const messageIds = Array.from(messages.keys());
    
    // Extraire les infos des messages en cache
    const cachedMessages = messages
      .filter(msg => msg.author && msg.content) // Seulement les messages complets
      .map(msg => ({
        messageId: msg.id,
        authorId: msg.author!.id,
        authorUsername: msg.author!.username,
        content: msg.content || undefined,
        createdAt: msg.createdAt || new Date()
      }));

    const channel = firstMessage.channel;
    const channelName = channel?.isDMBased() 
      ? 'DM' 
      : channel && 'name' in channel 
        ? (channel.name || 'Unknown')
        : 'Unknown';

    return {
      messageIds,
      count: messages.size,
      
      channelId: firstMessage.channelId,
      channelName,
      channelType: firstMessage.channel?.type || 0,
      
      cachedMessages: cachedMessages.length > 0 ? cachedMessages : undefined,
      cachedCount: cachedMessages.length,
      
      deletedAt: new Date()
    };
  }
}