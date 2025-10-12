// Fichier: apps/bot/src/listeners/messages/messageDelete.ts

import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Message, PartialMessage } from 'discord.js';
import { BotEventDto, EventType, MessageDeleteEventData } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

/**
 * Listener pour l'événement MESSAGE_DELETE
 * 
 * Déclenché lorsqu'un message est supprimé.
 * Note: Les informations complètes ne sont disponibles que si le message était en cache.
 * 
 * @event messageDelete
 */
@ApplyOptions<Listener.Options>({
  event: 'messageDelete'
})
export class MessageDeleteListener extends Listener {
  
  public override async run(message: Message | PartialMessage): Promise<void> {
    if (!isListenerEnabled('MESSAGE_DELETE')) {
      return;
    }

    if (!this.shouldProcessMessage(message)) {
      return;
    }

    const eventData = this.extractMessageData(message);

    const event: BotEventDto = {
      type: EventType.MESSAGE_DELETE,
      guildId: message.guildId!,
      userId: message.author?.id || 'unknown',
      channelId: message.channelId,
      messageId: message.id,
      data: eventData,
      timestamp: Date.now()
    };

    this.container.eventBatcher.addEvent(event);

    this.container.logger.debug(
      `[MESSAGE_DELETE] Guild: ${message.guildId} | Message: ${message.id}`
    );
  }

  private shouldProcessMessage(message: Message | PartialMessage): boolean {
    if (!message.guildId) {
      return false;
    }

    if (message.author?.bot) {
      return false;
    }

    return true;
  }

  private extractMessageData(message: Message | PartialMessage): MessageDeleteEventData {
    const attachments = message.attachments && message.attachments.size > 0
      ? Array.from(message.attachments.values()).map(att => ({
          id: att.id,
          filename: att.name,
          size: att.size,
          url: att.url,
          contentType: att.contentType || undefined
        }))
      : undefined;

    const channel = message.channel;
    const channelName = channel?.isDMBased() 
      ? 'DM' 
      : channel && 'name' in channel 
        ? (channel.name || 'Unknown')
        : 'Unknown';

    return {
      authorId: message.author?.id || 'unknown',
      authorUsername: message.author?.username || 'Unknown User',
      authorBot: message.author?.bot || false,
      
      content: message.content || undefined,
      
      hasAttachments: message.attachments ? message.attachments.size > 0 : false,
      attachmentCount: message.attachments?.size || 0,
      attachments,
      
      hasEmbeds: message.embeds ? message.embeds.length > 0 : false,
      embedCount: message.embeds?.length || 0,
      
      createdAt: message.createdAt || new Date(),
      deletedAt: new Date(),
      
      channelName,
      channelType: message.channel?.type || 0
    };
  }
}