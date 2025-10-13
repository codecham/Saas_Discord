import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { ChannelType, GuildChannel } from 'discord.js';
import { BotEventDto, ChannelCreateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

@ApplyOptions<Listener.Options>({
  event: Events.ChannelCreate
})
export class ChannelCreateListener extends Listener {
  public override async run(channel: GuildChannel) {
      this.container.logger.debug(
        `[ChannelCreate] [0] Channel created trigger`
      );
    // 1. Vérification configuration
    if (!isListenerEnabled(EventType.CHANNEL_CREATE)) return;

      this.container.logger.debug(
        `[ChannelCreate] [1] Channel created enable`
      );

    // 2. Vérification que c'est bien un channel de guild
    if (!channel.guild) return;

      this.container.logger.debug(
        `[ChannelCreate] [2] Channel has guild`
      );

    try {
      // 3. Extraction des données
      const eventData: ChannelCreateEventData = {
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type,
        parentId: channel.parentId ?? undefined,
        parentName: channel.parent?.name ?? undefined,
        position: channel.position,
        permissionOverwrites: channel.permissionOverwrites.cache.map(overwrite => ({
          id: overwrite.id,
          type: overwrite.type,
          allow: overwrite.allow.bitfield.toString(),
          deny: overwrite.deny.bitfield.toString()
        })),
        createdAt: channel.createdAt
      };

      // Ajout des propriétés spécifiques aux text channels
      if (channel.isTextBased() && 'topic' in channel) {
        eventData.topic = channel.topic ?? undefined;
        eventData.nsfw = 'nsfw' in channel ? channel.nsfw : false;
        eventData.rateLimitPerUser = 'rateLimitPerUser' in channel ? (channel.rateLimitPerUser ?? undefined) : undefined;
      }

      // Ajout des propriétés spécifiques aux voice channels
      if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
        if ('bitrate' in channel) eventData.bitrate = channel.bitrate as number;
        if ('userLimit' in channel) eventData.userLimit = channel.userLimit as number;
      }

      // 4. Création du BotEventDto
      const event: BotEventDto = {
        type: EventType.CHANNEL_CREATE,
        guildId: channel.guild.id,
        channelId: channel.id,
        timestamp: Date.now(),
        data: eventData
      };

      // 5. Envoi via le batcher
      this.container.eventBatcher.addEvent(event);

      this.container.logger.debug(
        `[ChannelCreate] Channel created: ${channel.name} (${channel.id}) in guild ${channel.guild.name}`
      );
    } catch (error) {
      this.container.logger.error('[ChannelCreate] Error processing channel create:', error);
    }
  }
}