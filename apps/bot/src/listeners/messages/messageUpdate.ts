// Fichier: apps/bot/src/listeners/messages/messageUpdate.ts

import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Message, PartialMessage } from 'discord.js';
import { BotEventDto, EventType, MessageUpdateEventData } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

/**
 * Listener pour l'événement MESSAGE_UPDATE
 * 
 * Déclenché lorsqu'un message est modifié.
 * Note: Les anciens messages non-cachés ne fourniront pas oldContent.
 * 
 * @event messageUpdate
 */
@ApplyOptions<Listener.Options>({
  event: 'messageUpdate'
})
export class MessageUpdateListener extends Listener {
  
  public override async run(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage): Promise<void> {
    if (!isListenerEnabled('MESSAGE_UPDATE')) {
      return;
    }

    // Fetch le message complet si c'est un partial
    if (newMessage.partial) {
      try {
        newMessage = await newMessage.fetch();
      } catch (error) {
        this.container.logger.warn(`[MESSAGE_UPDATE] Impossible de fetch le message ${newMessage.id}`);
        return;
      }
    }

    if (!this.shouldProcessMessage(newMessage)) {
      return;
    }

    const eventData = this.extractMessageData(oldMessage, newMessage as Message);

    const event: BotEventDto = {
      type: EventType.MESSAGE_UPDATE,
      guildId: newMessage.guildId!,
      userId: newMessage.author!.id,
      channelId: newMessage.channelId,
      messageId: newMessage.id,
      data: eventData,
      timestamp: Date.now()
    };

    this.container.eventBatcher.addEvent(event);

    this.container.logger.debug(
      `[MESSAGE_UPDATE] Guild: ${newMessage.guildId} | Message: ${newMessage.id}`
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

  private extractMessageData(
    oldMessage: Message | PartialMessage, 
    newMessage: Message
  ): MessageUpdateEventData {
    const attachments = newMessage.attachments.size > 0
      ? Array.from(newMessage.attachments.values()).map(att => ({
          id: att.id,
          filename: att.name,
          size: att.size,
          url: att.url,
          contentType: att.contentType || undefined
        }))
      : undefined;

    const channel = newMessage.channel;
    const channelName = channel.isDMBased() 
      ? 'DM' 
      : 'name' in channel 
        ? channel.name 
        : 'Unknown';

    return {
      oldContent: oldMessage.content || undefined,
      newContent: newMessage.content,
      
      authorId: newMessage.author.id,
      authorUsername: newMessage.author.username,
      authorBot: newMessage.author.bot,
      
      hasAttachments: newMessage.attachments.size > 0,
      attachmentCount: newMessage.attachments.size,
      attachments,
      
      hasEmbeds: newMessage.embeds.length > 0,
      embedCount: newMessage.embeds.length,
      
      editedAt: newMessage.editedAt!,
      originalCreatedAt: newMessage.createdAt,
      
      channelName,
      channelType: newMessage.channel.type
    };
  }
}