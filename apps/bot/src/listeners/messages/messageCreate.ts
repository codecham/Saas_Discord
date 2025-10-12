// Fichier: apps/bot/src/listeners/messages/messageCreate.ts

import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Message, MessageType } from 'discord.js';
import { BotEventDto, EventType, MessageCreateEventData } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

/**
 * Listener pour l'événement MESSAGE_CREATE
 * 
 * Déclenché lorsqu'un nouveau message est envoyé dans un channel du serveur.
 * Capture toutes les informations du message pour les transmettre au backend.
 * 
 * @event messageCreate
 * @see https://discord.js.org/docs/packages/discord.js/main/Client:Class#messageCreate
 */
@ApplyOptions<Listener.Options>({
  event: 'messageCreate'
})
export class MessageCreateListener extends Listener {
  
  /**
   * Traite l'événement messageCreate
   * 
   * Filtre les messages non pertinents (bots, DMs, messages système)
   * puis extrait toutes les données et les envoie via l'EventBatcher
   */
  public override async run(message: Message): Promise<void> {
    // ✅ Vérification de la configuration - Si désactivé, on arrête
    if (!isListenerEnabled('MESSAGE_CREATE')) {
      return;
    }

    // ✅ Filtres de base - On ignore ce qui n'est pas pertinent
    if (!this.shouldProcessMessage(message)) {
      return;
    }

    // ✅ Extraction des données
    const eventData = this.extractMessageData(message);

    // ✅ Construction de l'événement
    const event: BotEventDto = {
      type: EventType.MESSAGE_CREATE,
      guildId: message.guildId!,
      userId: message.author.id,
      channelId: message.channelId,
      messageId: message.id,
      data: eventData,
      timestamp: Date.now()
    };

    // ✅ Envoi via l'EventBatcher
    this.container.eventBatcher.addEvent(event);

    // 📝 Log pour debug (optionnel)
    this.container.logger.debug(
      `[MESSAGE_CREATE] Guild: ${message.guildId} | Channel: ${message.channelId} | Author: ${message.author.tag}`
    );
  }

  /**
   * Détermine si le message doit être traité
   * 
   * Filtre :
   * - Messages en DM (pas dans un serveur)
   * - Messages de bots
   * - Messages système (UserJoin, ChannelPinnedMessage, etc.)
   */
  private shouldProcessMessage(message: Message): boolean {
    // Ignorer si pas dans un serveur
    if (!message.guildId) {
      return false;
    }

    // Ignorer les bots
    if (message.author.bot) {
      return false;
    }

    // Ignorer les messages système
    // On garde uniquement : Default (0) et Reply (19)
    if (
      message.type !== MessageType.Default && 
      message.type !== MessageType.Reply
    ) {
      return false;
    }

    return true;
  }

  /**
   * Extrait toutes les données pertinentes du message
   * 
   * Cette méthode récupère TOUT ce qui peut être utile pour le backend :
   * - Informations de l'auteur
   * - Contenu et attachments
   * - Mentions et embeds
   * - Contexte (reply, thread, etc.)
   */
  private extractMessageData(message: Message): MessageCreateEventData {
    // Extraction des attachments
    const attachments = message.attachments.size > 0
      ? Array.from(message.attachments.values()).map(att => ({
          id: att.id,
          filename: att.name,
          size: att.size,
          url: att.url,
          contentType: att.contentType || undefined
        }))
      : undefined;

    // Extraction des mentions
    const mentionedUserIds = message.mentions.users.map(user => user.id);
    const mentionedRoleIds = message.mentions.roles.map(role => role.id);

    // Extraction des stickers
    const hasStickerIds = message.stickers.map(sticker => sticker.id);

    // Informations sur le reply
    const isReply = message.type === MessageType.Reply;
    const replyToMessageId = message.reference?.messageId;
    const replyToAuthorId = message.mentions.repliedUser?.id;

    // Nom du channel
    const channel = message.channel;
    const channelName = channel.isDMBased() 
      ? 'DM' 
      : 'name' in channel 
        ? channel.name 
        : 'Unknown';

    return {
      // Informations de base
      content: message.content,
      authorId: message.author.id,
      authorUsername: message.author.username,
      authorDiscriminator: message.author.discriminator !== '0' 
        ? message.author.discriminator 
        : undefined,
      authorGlobalName: message.author.globalName || undefined,
      authorBot: message.author.bot,

      // Informations du message
      messageType: message.type,
      hasAttachments: message.attachments.size > 0,
      attachmentCount: message.attachments.size,
      attachments,

      // Embeds
      hasEmbeds: message.embeds.length > 0,
      embedCount: message.embeds.length,

      // Mentions
      mentionedUserIds,
      mentionedRoleIds,
      mentionsEveryone: message.mentions.everyone,

      // Thread/Reply
      isReply,
      replyToMessageId,
      replyToAuthorId,

      // Stickers
      hasStickerIds,

      // Timestamps
      createdAt: message.createdAt,
      editedAt: message.editedAt || undefined,

      // Channel context
      channelName,
      channelType: message.channel.type
    };
  }
}