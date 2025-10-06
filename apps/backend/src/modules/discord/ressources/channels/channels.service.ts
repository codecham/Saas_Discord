import { Injectable } from '@nestjs/common';
import { DiscordApiService } from '../../core/discord-api.service';
import { DISCORD_ENDPOINTS } from '../../common/constants/discord-endpoints.constant';
import {
  DiscordChannelDTO,
  DiscordMessageDTO,
  ModifyChannelDTO,
  CreateMessageDTO,
  EditMessageDTO,
  EditChannelPermissionsDTO,
  BulkDeleteMessagesDTO,
} from '@my-project/shared-types';

/**
 * Service pour gérer les channels Discord
 */
@Injectable()
export class ChannelsService {
  constructor(private readonly discordApi: DiscordApiService) {}

  /**
   * Récupère les informations d'un channel
   */
  async getChannel(channelId: string): Promise<DiscordChannelDTO> {
    return this.discordApi.get<DiscordChannelDTO>(
      DISCORD_ENDPOINTS.CHANNEL(channelId),
      {
        rateLimitKey: `channel:${channelId}`,
      },
    );
  }

  /**
   * Modifie un channel
   */
  async modifyChannel(
    channelId: string,
    data: ModifyChannelDTO,
  ): Promise<DiscordChannelDTO> {
    return this.discordApi.patch<DiscordChannelDTO>(
      DISCORD_ENDPOINTS.CHANNEL(channelId),
      data,
      {
        rateLimitKey: `channel:${channelId}:modify`,
      },
    );
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
   * Supprime plusieurs messages en une seule fois (bulk delete)
   */
  async bulkDeleteMessages(
    channelId: string,
    messageIds: string[],
  ): Promise<void> {
    const data: BulkDeleteMessagesDTO = { messages: messageIds };

    return this.discordApi.post(
      `${DISCORD_ENDPOINTS.CHANNEL_MESSAGES(channelId)}/bulk-delete`,
      data,
      {
        rateLimitKey: `channel:${channelId}:messages:bulk-delete`,
      },
    );
  }

  /**
   * Modifie les permissions d'un channel pour un rôle ou utilisateur
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
        rateLimitKey: `channel:${channelId}:permissions:${overwriteId}:edit`,
      },
    );
  }

  /**
   * Supprime les permissions d'un channel pour un rôle ou utilisateur
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
   * Épingle un message dans un channel
   */
  async pinMessage(channelId: string, messageId: string): Promise<void> {
    return this.discordApi.put(
      DISCORD_ENDPOINTS.CHANNEL_PIN(channelId, messageId),
      undefined,
      {
        rateLimitKey: `channel:${channelId}:pin`,
      },
    );
  }

  /**
   * Désépingle un message dans un channel
   */
  async unpinMessage(channelId: string, messageId: string): Promise<void> {
    return this.discordApi.delete(
      DISCORD_ENDPOINTS.CHANNEL_PIN(channelId, messageId),
      {
        rateLimitKey: `channel:${channelId}:unpin`,
      },
    );
  }

  /**
   * Récupère les messages épinglés d'un channel
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
   * Récupère les webhooks d'un channel
   */
  async getChannelWebhooks(channelId: string): Promise<any[]> {
    return this.discordApi.get(DISCORD_ENDPOINTS.CHANNEL_WEBHOOKS(channelId), {
      rateLimitKey: `channel:${channelId}:webhooks`,
    });
  }

  /**
   * Crée un webhook dans un channel
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
   * Commence à taper dans un channel (typing indicator)
   */
  async triggerTypingIndicator(channelId: string): Promise<void> {
    return this.discordApi.post(
      `${DISCORD_ENDPOINTS.CHANNEL(channelId)}/typing`,
      undefined,
      {
        rateLimitKey: `channel:${channelId}:typing`,
      },
    );
  }
}
