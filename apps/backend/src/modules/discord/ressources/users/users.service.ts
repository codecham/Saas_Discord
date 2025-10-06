import { Injectable } from '@nestjs/common';
import { DiscordApiService } from '../../core/discord-api.service';
import { DiscordTokenService } from '../../../auth/services/discord-token.service';
import { DISCORD_ENDPOINTS } from '../../common/constants/discord-endpoints.constant';
import {
  DiscordUserDTO,
  DiscordConnectionDTO,
  DiscordUserGuildDTO,
} from '@my-project/shared-types';

/**
 * Service pour gérer les utilisateurs Discord
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly discordApi: DiscordApiService,
    private readonly discordToken: DiscordTokenService,
  ) {}

  /**
   * Récupère les informations d'un utilisateur avec le token du bot
   */
  async getUser(userId: string): Promise<DiscordUserDTO> {
    return this.discordApi.get<DiscordUserDTO>(DISCORD_ENDPOINTS.USER(userId), {
      rateLimitKey: `user:${userId}`,
    });
  }

  /**
   * Récupère les informations de l'utilisateur actuel (bot)
   */
  async getBotUser(): Promise<DiscordUserDTO> {
    return this.discordApi.get<DiscordUserDTO>(
      DISCORD_ENDPOINTS.CURRENT_USER(),
      {
        rateLimitKey: 'user:@me:bot',
      },
    );
  }

  /**
   * Récupère les informations de l'utilisateur connecté (avec son propre token)
   */
  async getCurrentUser(userId: string): Promise<DiscordUserDTO> {
    const userToken = await this.discordToken.getDiscordAccessToken(userId);

    console.log(`userID = ${userId}`);
    console.log(`userToken = ${userToken}`);
    return this.discordApi.get<DiscordUserDTO>(
      DISCORD_ENDPOINTS.CURRENT_USER(),
      {
        rateLimitKey: `user:${userId}:me`,
        customToken: userToken,
        useAuth: true,
      },
    );
  }

  /**
   * Modifie l'utilisateur actuel (bot)
   */
  async modifyCurrentUser(data: any): Promise<DiscordUserDTO> {
    return this.discordApi.patch<DiscordUserDTO>(
      DISCORD_ENDPOINTS.CURRENT_USER(),
      data,
      {
        rateLimitKey: 'user:@me:modify',
      },
    );
  }

  /**
   * Récupère la liste des guilds de l'utilisateur connecté (avec son token)
   */
  async getCurrentUserGuilds(
    userId: string,
    params?: {
      before?: string;
      after?: string;
      limit?: number;
    },
  ): Promise<DiscordUserGuildDTO[]> {
    const userToken = await this.discordToken.getDiscordAccessToken(userId);

    return this.discordApi.get<DiscordUserGuildDTO[]>(
      DISCORD_ENDPOINTS.CURRENT_USER_GUILDS(),
      {
        params,
        rateLimitKey: `user:${userId}:guilds`,
        customToken: userToken,
        useAuth: true,
      },
    );
  }

  /**
   * Récupère les informations d'une guild spécifique pour l'utilisateur connecté
   */
  async getCurrentUserGuild(
    userId: string,
    guildId: string,
  ): Promise<DiscordUserGuildDTO> {
    const userToken = await this.discordToken.getDiscordAccessToken(userId);

    return this.discordApi.get<DiscordUserGuildDTO>(
      DISCORD_ENDPOINTS.CURRENT_USER_GUILD(guildId),
      {
        rateLimitKey: `user:${userId}:guild:${guildId}`,
        customToken: userToken,
        useAuth: true,
      },
    );
  }

  /**
   * Quitte une guild
   */
  async leaveGuild(userId: string, guildId: string): Promise<void> {
    const userToken = await this.discordToken.getDiscordAccessToken(userId);

    return this.discordApi.delete(
      DISCORD_ENDPOINTS.CURRENT_USER_GUILD(guildId),
      {
        rateLimitKey: `user:${userId}:guild:${guildId}:leave`,
        customToken: userToken,
        useAuth: true,
      },
    );
  }

  /**
   * Crée un DM avec un utilisateur
   */
  async createDM(userId: string, recipientId: string): Promise<any> {
    const userToken = await this.discordToken.getDiscordAccessToken(userId);

    return this.discordApi.post(
      DISCORD_ENDPOINTS.CURRENT_USER_CHANNELS(),
      { recipient_id: recipientId },
      {
        rateLimitKey: `user:${userId}:dm:create`,
        customToken: userToken,
        useAuth: true,
      },
    );
  }

  /**
   * Récupère les connexions de l'utilisateur connecté
   */
  async getCurrentUserConnections(
    userId: string,
  ): Promise<DiscordConnectionDTO[]> {
    const userToken = await this.discordToken.getDiscordAccessToken(userId);

    return this.discordApi.get<DiscordConnectionDTO[]>(
      DISCORD_ENDPOINTS.CURRENT_USER_CONNECTIONS(),
      {
        rateLimitKey: `user:${userId}:connections`,
        customToken: userToken,
        useAuth: true,
      },
    );
  }

  /**
   * Récupère les informations d'un utilisateur avec métadonnées
   */
  async getUserWithMetadata(userId: string) {
    return this.discordApi.requestWithMetadata(
      'GET',
      DISCORD_ENDPOINTS.USER(userId),
      {
        rateLimitKey: `user:${userId}`,
      },
    );
  }
}
