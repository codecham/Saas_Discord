import { Injectable } from '@nestjs/common';
import { DiscordApiService } from '../../core/discord-api.service';
import { DISCORD_ENDPOINTS } from '../../common/constants/discord-endpoints.constant';
import {
  DiscordGuildDTO,
  DiscordChannelDTO,
  DiscordGuildMemberDTO,
  DiscordRoleDTO,
  ModifyGuildDTO,
  CreateChannelDTO,
  ModifyGuildMemberDTO,
  CreateRoleDTO,
  ModifyRoleDTO,
} from '@my-project/shared-types';

/**
 * Service pour gérer les guilds (serveurs Discord)
 */
@Injectable()
export class GuildsService {
  constructor(private readonly discordApi: DiscordApiService) {}

  /**
   * Récupère les informations d'une guild
   */
  async getGuild(guildId: string): Promise<DiscordGuildDTO> {
    return this.discordApi.get<DiscordGuildDTO>(
      DISCORD_ENDPOINTS.GUILD(guildId),
      {
        rateLimitKey: `guild:${guildId}`,
      },
    );
  }

  /**
   * Récupère les informations d'une guild avec les métadonnées
   */
  async getGuildWithMetadata(guildId: string) {
    return this.discordApi.requestWithMetadata(
      'GET',
      DISCORD_ENDPOINTS.GUILD(guildId),
      {
        rateLimitKey: `guild:${guildId}`,
      },
    );
  }

  /**
   * Modifie les paramètres d'une guild
   */
  async modifyGuild(
    guildId: string,
    data: ModifyGuildDTO,
  ): Promise<DiscordGuildDTO> {
    return this.discordApi.patch<DiscordGuildDTO>(
      DISCORD_ENDPOINTS.GUILD(guildId),
      data,
      {
        rateLimitKey: `guild:${guildId}:modify`,
      },
    );
  }

  /**
   * Récupère la liste des channels d'une guild
   */
  async getGuildChannels(guildId: string): Promise<DiscordChannelDTO[]> {
    return this.discordApi.get<DiscordChannelDTO[]>(
      DISCORD_ENDPOINTS.GUILD_CHANNELS(guildId),
      {
        rateLimitKey: `guild:${guildId}:channels`,
      },
    );
  }

  /**
   * Crée un nouveau channel dans une guild
   */
  async createGuildChannel(
    guildId: string,
    data: CreateChannelDTO,
  ): Promise<DiscordChannelDTO> {
    return this.discordApi.post<DiscordChannelDTO>(
      DISCORD_ENDPOINTS.GUILD_CHANNELS(guildId),
      data,
      {
        rateLimitKey: `guild:${guildId}:channels:create`,
      },
    );
  }

  /**
   * Récupère les membres d'une guild
   */
  async getGuildMembers(
    guildId: string,
    params?: { limit?: number; after?: string },
  ): Promise<DiscordGuildMemberDTO[]> {
    return this.discordApi.get<DiscordGuildMemberDTO[]>(
      DISCORD_ENDPOINTS.GUILD_MEMBERS(guildId),
      {
        params,
        rateLimitKey: `guild:${guildId}:members`,
      },
    );
  }

  /**
   * Récupère un membre spécifique d'une guild
   */
  async getGuildMember(
    guildId: string,
    userId: string,
  ): Promise<DiscordGuildMemberDTO> {
    return this.discordApi.get<DiscordGuildMemberDTO>(
      DISCORD_ENDPOINTS.GUILD_MEMBER(guildId, userId),
      {
        rateLimitKey: `guild:${guildId}:member:${userId}`,
      },
    );
  }

  /**
   * Modifie un membre d'une guild
   */
  async modifyGuildMember(
    guildId: string,
    userId: string,
    data: ModifyGuildMemberDTO,
  ): Promise<DiscordGuildMemberDTO> {
    return this.discordApi.patch<DiscordGuildMemberDTO>(
      DISCORD_ENDPOINTS.GUILD_MEMBER(guildId, userId),
      data,
      {
        rateLimitKey: `guild:${guildId}:member:${userId}:modify`,
      },
    );
  }

  /**
   * Bannit un membre d'une guild
   */
  async banGuildMember(
    guildId: string,
    userId: string,
    reason?: string,
  ): Promise<void> {
    return this.discordApi.put(
      DISCORD_ENDPOINTS.GUILD_BAN(guildId, userId),
      { delete_message_days: 7 },
      {
        headers: reason ? { 'X-Audit-Log-Reason': reason } : {},
        rateLimitKey: `guild:${guildId}:ban`,
      },
    );
  }

  /**
   * Révoque le ban d'un membre
   */
  async unbanGuildMember(guildId: string, userId: string): Promise<void> {
    return this.discordApi.delete(
      DISCORD_ENDPOINTS.GUILD_BAN(guildId, userId),
      {
        rateLimitKey: `guild:${guildId}:unban`,
      },
    );
  }

  /**
   * Récupère les rôles d'une guild
   */
  async getGuildRoles(guildId: string): Promise<DiscordRoleDTO[]> {
    return this.discordApi.get<DiscordRoleDTO[]>(
      DISCORD_ENDPOINTS.GUILD_ROLES(guildId),
      {
        rateLimitKey: `guild:${guildId}:roles`,
      },
    );
  }

  /**
   * Crée un rôle dans une guild
   */
  async createGuildRole(
    guildId: string,
    data: CreateRoleDTO,
  ): Promise<DiscordRoleDTO> {
    return this.discordApi.post<DiscordRoleDTO>(
      DISCORD_ENDPOINTS.GUILD_ROLES(guildId),
      data,
      {
        rateLimitKey: `guild:${guildId}:roles:create`,
      },
    );
  }

  /**
   * Modifie un rôle d'une guild
   */
  async modifyGuildRole(
    guildId: string,
    roleId: string,
    data: ModifyRoleDTO,
  ): Promise<DiscordRoleDTO> {
    return this.discordApi.patch<DiscordRoleDTO>(
      DISCORD_ENDPOINTS.GUILD_ROLE(guildId, roleId),
      data,
      {
        rateLimitKey: `guild:${guildId}:role:${roleId}:modify`,
      },
    );
  }

  /**
   * Supprime un rôle d'une guild
   */
  async deleteGuildRole(guildId: string, roleId: string): Promise<void> {
    return this.discordApi.delete(
      DISCORD_ENDPOINTS.GUILD_ROLE(guildId, roleId),
      {
        rateLimitKey: `guild:${guildId}:role:${roleId}:delete`,
      },
    );
  }
}
