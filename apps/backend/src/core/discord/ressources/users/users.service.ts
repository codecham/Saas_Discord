/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { DiscordApiService } from '../../core/discord-api.service';
import { DiscordTokenService } from '../../../auth/services/discord-token.service';
import { DISCORD_ENDPOINTS } from '../../common/constants/discord-endpoints.constant';
import {
  DiscordUserDTO,
  DiscordConnectionDTO,
  DiscordUserGuildDTO,
  GuildWithBotStatusDTO,
  UserGuildsCategorizedDTO,
} from '@my-project/shared-types';
import { GuildsDbService } from '../../common/services/guild-db.service';

/**
 * Service pour gérer les utilisateurs Discord
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly discordApi: DiscordApiService,
    private readonly discordToken: DiscordTokenService,
    private readonly guildsDb: GuildsDbService,
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

  /**
   * Récupère les guilds de l'utilisateur catégorisées par présence du bot
   * Filtre uniquement les guilds où l'utilisateur a les droits admin
   */
  async getCurrentUserGuildsCategorized(
    userId: string,
  ): Promise<UserGuildsCategorizedDTO> {
    // 1. Récupérer toutes les guilds de l'utilisateur depuis Discord
    const userToken = await this.discordToken.getDiscordAccessToken(userId);

    const allGuilds = await this.discordApi.get<DiscordUserGuildDTO[]>(
      DISCORD_ENDPOINTS.CURRENT_USER_GUILDS(),
      {
        params: { limit: 200 }, // Maximum autorisé par Discord
        rateLimitKey: `user:${userId}:guilds`,
        customToken: userToken,
        useAuth: true,
      },
    );

    // 2. Filtrer uniquement les guilds où l'utilisateur a les droits admin
    // Permission ADMINISTRATOR = 0x8 (bit 3)
    const ADMINISTRATOR_PERMISSION = 0x8;
    const adminGuilds = allGuilds.filter((guild) => {
      const permissions = BigInt(guild.permissions);
      return (permissions & BigInt(ADMINISTRATOR_PERMISSION)) !== BigInt(0);
    });

    if (adminGuilds.length === 0) {
      return {
        active: [],
        inactive: [],
        notAdded: [],
      };
    }

    // 3. Récupérer les guilds de notre DB
    const guildIds = adminGuilds.map((g) => g.id);
    const dbGuilds = await this.guildsDb.findManyByDiscordIds(guildIds);

    // Créer une Map pour accès rapide
    const dbGuildsMap = new Map(
      dbGuilds.map((guild) => [guild.guildId, guild]),
    );

    // 4. Catégoriser les guilds
    const active: GuildWithBotStatusDTO[] = [];
    const inactive: GuildWithBotStatusDTO[] = [];
    const notAdded: GuildWithBotStatusDTO[] = [];

    for (const discordGuild of adminGuilds) {
      const dbGuild = dbGuildsMap.get(discordGuild.id);

      const guildDto: GuildWithBotStatusDTO = {
        id: discordGuild.id,
        name: discordGuild.name,
        icon: discordGuild.icon,
        owner: discordGuild.owner,
        permissions: discordGuild.permissions,
        features: discordGuild.features,
      };

      if (dbGuild) {
        // Guild existe en DB → ajouter les données
        guildDto.dbId = dbGuild.id;
        guildDto.ownerDiscordId = dbGuild.ownerDiscordId;
        guildDto.botAddedAt = dbGuild.botAddedAt.toISOString();
        guildDto.isActive = dbGuild.isActive;
        guildDto.createdAt = dbGuild.createdAt.toISOString();
        guildDto.updatedAt = dbGuild.updatedAt.toISOString();

        if (dbGuild.isActive) {
          active.push(guildDto);
        } else {
          inactive.push(guildDto);
        }
      } else {
        // Guild n'existe pas en DB
        notAdded.push(guildDto);
      }
    }

    return {
      active,
      inactive,
      notAdded,
    };
  }
}
