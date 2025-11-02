import { Injectable, Logger } from '@nestjs/common';
import { DiscordApiService } from '../../core/discord-api.service';
import { DISCORD_ENDPOINTS } from '../../common/constants/discord-endpoints.constant';
import { ChannelTransformer } from '../../transformers/channel.transformer';
import {
  DiscordChannelDTO,
  DiscordMessageDTO,
  DiscordRoleDTO,
  GuildChannelDTO,
  ModifyChannelDTO,
  CreateMessageDTO,
  EditMessageDTO,
  EditChannelPermissionsDTO,
} from '@my-project/shared-types';

/**
 * Service pour gérer les channels Discord
 * Utilise le ChannelTransformer pour enrichir les données
 */
@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(
    private readonly discordApi: DiscordApiService,
    private readonly channelTransformer: ChannelTransformer,
  ) {}

  /**
   * Récupère les informations d'un channel ENRICHI
   * Retourne GuildChannelDTO avec données computed
   */
  async getChannel(channelId: string): Promise<GuildChannelDTO> {
    // 1. Fetch channel depuis Discord API
    const rawChannel = await this.discordApi.get<DiscordChannelDTO>(
      DISCORD_ENDPOINTS.CHANNEL(channelId),
      {
        rateLimitKey: `channel:${channelId}`,
      },
    );

    // 2. Si le channel n'a pas de guild_id, retourner tel quel (DM channel)
    if (!rawChannel.guild_id) {
      this.logger.warn(`Channel ${channelId} has no guild_id (DM channel?)`);
      // On retourne quand même quelque chose mais non enrichi
      return this.channelTransformer.transform(rawChannel, 'unknown');
    }

    // 3. Fetch roles et autres channels de la guild pour enrichissement
    try {
      const [rawRoles, allRawChannels] = await Promise.all([
        this.discordApi.get<DiscordRoleDTO[]>(
          DISCORD_ENDPOINTS.GUILD_ROLES(rawChannel.guild_id),
          { rateLimitKey: `guild:${rawChannel.guild_id}:roles` },
        ),
        this.discordApi.get<DiscordChannelDTO[]>(
          DISCORD_ENDPOINTS.GUILD_CHANNELS(rawChannel.guild_id),
          { rateLimitKey: `guild:${rawChannel.guild_id}:channels` },
        ),
      ]);

      // 4. Transform avec contexte complet
      return this.channelTransformer.transform(
        rawChannel,
        rawChannel.guild_id,
        rawRoles,
        allRawChannels,
      );
    } catch (error) {
      // Si on ne peut pas fetch le contexte, transformer quand même
      this.logger.warn(
        `Could not fetch guild context for channel ${channelId}:`,
        error,
      );
      return this.channelTransformer.transform(rawChannel, rawChannel.guild_id);
    }
  }

  /**
   * Modifie un channel et retourne les données enrichies
   */
  async modifyChannel(
    channelId: string,
    data: ModifyChannelDTO,
  ): Promise<GuildChannelDTO> {
    // 1. Modifier via API Discord
    const rawChannel = await this.discordApi.patch<DiscordChannelDTO>(
      DISCORD_ENDPOINTS.CHANNEL(channelId),
      data,
      {
        rateLimitKey: `channel:${channelId}:modify`,
      },
    );

    // 2. Retourner enrichi
    if (!rawChannel.guild_id) {
      return this.channelTransformer.transform(rawChannel, 'unknown');
    }

    try {
      const [rawRoles, allRawChannels] = await Promise.all([
        this.discordApi.get<DiscordRoleDTO[]>(
          DISCORD_ENDPOINTS.GUILD_ROLES(rawChannel.guild_id),
          { rateLimitKey: `guild:${rawChannel.guild_id}:roles` },
        ),
        this.discordApi.get<DiscordChannelDTO[]>(
          DISCORD_ENDPOINTS.GUILD_CHANNELS(rawChannel.guild_id),
          { rateLimitKey: `guild:${rawChannel.guild_id}:channels` },
        ),
      ]);

      return this.channelTransformer.transform(
        rawChannel,
        rawChannel.guild_id,
        rawRoles,
        allRawChannels,
      );
    } catch (error) {
      this.logger.warn(
        `Could not fetch guild context after modifying channel ${channelId}:`,
        error,
      );
      return this.channelTransformer.transform(rawChannel, rawChannel.guild_id);
    }
  }

  /**
   * Supprime un channel
   */
  async deleteChannel(channelId: string): Promise<void> {
    return this.discordApi.delete(DISCORD_ENDPOINTS.CHANNEL(channelId), {
      rateLimitKey: `channel:${channelId}:delete`,
    });
  }

  /**
   * Récupère les messages d'un channel
   */
  async getChannelMessages(
    channelId: string,
    params?: {
      around?: string;
      before?: string;
      after?: string;
      limit?: number;
    },
  ): Promise<DiscordMessageDTO[]> {
    return this.discordApi.get<DiscordMessageDTO[]>(
      DISCORD_ENDPOINTS.CHANNEL_MESSAGES(channelId),
      {
        params,
        rateLimitKey: `channel:${channelId}:messages`,
      },
    );
  }

  /**
   * Récupère un message spécifique
   */
  async getChannelMessage(
    channelId: string,
    messageId: string,
  ): Promise<DiscordMessageDTO> {
    return this.discordApi.get<DiscordMessageDTO>(
      DISCORD_ENDPOINTS.CHANNEL_MESSAGE(channelId, messageId),
      {
        rateLimitKey: `channel:${channelId}:message:${messageId}`,
      },
    );
  }

  /**
   * Crée un message dans un channel
   */
  async createMessage(
    channelId: string,
    data: CreateMessageDTO,
  ): Promise<DiscordMessageDTO> {
    return this.discordApi.post<DiscordMessageDTO>(
      DISCORD_ENDPOINTS.CHANNEL_MESSAGES(channelId),
      data,
      {
        rateLimitKey: `channel:${channelId}:messages:create`,
      },
    );
  }

  /**
   * Modifie un message
   */
  async editMessage(
    channelId: string,
    messageId: string,
    data: EditMessageDTO,
  ): Promise<DiscordMessageDTO> {
    return this.discordApi.patch<DiscordMessageDTO>(
      DISCORD_ENDPOINTS.CHANNEL_MESSAGE(channelId, messageId),
      data,
      {
        rateLimitKey: `channel:${channelId}:message:${messageId}:edit`,
      },
    );
  }

  /**
   * Supprime un message
   */
  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    return this.discordApi.delete(
      DISCORD_ENDPOINTS.CHANNEL_MESSAGE(channelId, messageId),
      {
        rateLimitKey: `channel:${channelId}:message:${messageId}:delete`,
      },
    );
  }

  /**
   * Supprime plusieurs messages en bulk
   */
  // async bulkDeleteMessages(
  //   channelId: string,
  //   messageIds: string[],
  // ): Promise<void> {
  //   const data: BulkDeleteMessagesDTO = { messages: messageIds };
  //   return this.discordApi.post(
  //     DISCORD_ENDPOINTS.CHANNEL_BULK_DELETE(channelId),
  //     data,
  //     {
  //       rateLimitKey: `channel:${channelId}:messages:bulk-delete`,
  //     },
  //   );
  // }

  /**
   * Modifie les permissions d'un channel
   */
  async editChannelPermissions(
    channelId: string,
    overwriteId: string,
    data: EditChannelPermissionsDTO,
  ): Promise<void> {
    return this.discordApi.put(
      DISCORD_ENDPOINTS.CHANNEL_PERMISSIONS(channelId, overwriteId),
      data,
      {
        rateLimitKey: `channel:${channelId}:permissions:${overwriteId}`,
      },
    );
  }

  /**
   * Supprime les permissions d'un channel
   */
  async deleteChannelPermission(
    channelId: string,
    overwriteId: string,
  ): Promise<void> {
    return this.discordApi.delete(
      DISCORD_ENDPOINTS.CHANNEL_PERMISSIONS(channelId, overwriteId),
      {
        rateLimitKey: `channel:${channelId}:permissions:${overwriteId}:delete`,
      },
    );
  }

  /**
   * Récupère les invitations d'un channel
   */
  async getChannelInvites(channelId: string): Promise<any[]> {
    return this.discordApi.get(DISCORD_ENDPOINTS.CHANNEL_INVITES(channelId), {
      rateLimitKey: `channel:${channelId}:invites`,
    });
  }

  /**
   * Crée une invitation pour un channel
   */
  async createChannelInvite(channelId: string, data?: any): Promise<any> {
    return this.discordApi.post(
      DISCORD_ENDPOINTS.CHANNEL_INVITES(channelId),
      data || {},
      {
        rateLimitKey: `channel:${channelId}:invites:create`,
      },
    );
  }

  /**
   * Récupère les messages épinglés
   */
  async getPinnedMessages(channelId: string): Promise<DiscordMessageDTO[]> {
    return this.discordApi.get<DiscordMessageDTO[]>(
      DISCORD_ENDPOINTS.CHANNEL_PINS(channelId),
      {
        rateLimitKey: `channel:${channelId}:pins`,
      },
    );
  }

  /**
   * Épingle un message
   */
  async pinMessage(channelId: string, messageId: string): Promise<void> {
    return this.discordApi.put(
      DISCORD_ENDPOINTS.CHANNEL_PIN(channelId, messageId),
      {},
      {
        rateLimitKey: `channel:${channelId}:pins:add`,
      },
    );
  }

  /**
   * Désépingle un message
   */
  async unpinMessage(channelId: string, messageId: string): Promise<void> {
    return this.discordApi.delete(
      DISCORD_ENDPOINTS.CHANNEL_PIN(channelId, messageId),
      {
        rateLimitKey: `channel:${channelId}:pins:remove`,
      },
    );
  }

  /**
   * Récupère les webhooks d'un channel
   */
  async getChannelWebhooks(channelId: string): Promise<any[]> {
    return this.discordApi.get(DISCORD_ENDPOINTS.CHANNEL_WEBHOOKS(channelId), {
      rateLimitKey: `channel:${channelId}:webhooks`,
    });
  }

  /**
   * Crée un webhook
   */
  async createWebhook(channelId: string, data: any): Promise<any> {
    return this.discordApi.post(
      DISCORD_ENDPOINTS.CHANNEL_WEBHOOKS(channelId),
      data,
      {
        rateLimitKey: `channel:${channelId}:webhooks:create`,
      },
    );
  }

  /**
   * Envoie un typing indicator
   */
  async triggerTypingIndicator(channelId: string): Promise<void> {
    return this.discordApi.post(
      DISCORD_ENDPOINTS.CHANNEL_PINS(channelId),
      {},
      {
        rateLimitKey: `channel:${channelId}:typing`,
      },
    );
  }
}
