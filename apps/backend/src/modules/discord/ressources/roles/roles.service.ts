import { Injectable } from '@nestjs/common';
import { DiscordApiService } from '../../core/discord-api.service';
import { DISCORD_ENDPOINTS } from '../../common/constants/discord-endpoints.constant';
import {
  DiscordRoleDTO,
  CreateRoleDTO,
  ModifyRoleDTO,
  ModifyRolePositionsDTO,
} from '@my-project/shared-types';

/**
 * Service pour gérer les rôles Discord
 */
@Injectable()
export class RolesService {
  constructor(private readonly discordApi: DiscordApiService) {}

  /**
   * Récupère tous les rôles d'une guild
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
   * Crée un nouveau rôle dans une guild
   */
  async createGuildRole(
    guildId: string,
    data?: CreateRoleDTO,
  ): Promise<DiscordRoleDTO> {
    return this.discordApi.post<DiscordRoleDTO>(
      DISCORD_ENDPOINTS.GUILD_ROLES(guildId),
      data || {},
      {
        rateLimitKey: `guild:${guildId}:roles:create`,
      },
    );
  }

  /**
   * Modifie les positions des rôles dans une guild
   */
  async modifyGuildRolePositions(
    guildId: string,
    positions: ModifyRolePositionsDTO[],
  ): Promise<DiscordRoleDTO[]> {
    return this.discordApi.patch<DiscordRoleDTO[]>(
      DISCORD_ENDPOINTS.GUILD_ROLES(guildId),
      positions,
      {
        rateLimitKey: `guild:${guildId}:roles:positions`,
      },
    );
  }

  /**
   * Modifie un rôle spécifique
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

  /**
   * Ajoute un rôle à un membre
   */
  async addMemberRole(
    guildId: string,
    userId: string,
    roleId: string,
    reason?: string,
  ): Promise<void> {
    return this.discordApi.put(
      `${DISCORD_ENDPOINTS.GUILD_MEMBER(guildId, userId)}/roles/${roleId}`,
      undefined,
      {
        headers: reason ? { 'X-Audit-Log-Reason': reason } : {},
        rateLimitKey: `guild:${guildId}:member:${userId}:role:add`,
      },
    );
  }

  /**
   * Retire un rôle d'un membre
   */
  async removeMemberRole(
    guildId: string,
    userId: string,
    roleId: string,
    reason?: string,
  ): Promise<void> {
    return this.discordApi.delete(
      `${DISCORD_ENDPOINTS.GUILD_MEMBER(guildId, userId)}/roles/${roleId}`,
      {
        headers: reason ? { 'X-Audit-Log-Reason': reason } : {},
        rateLimitKey: `guild:${guildId}:member:${userId}:role:remove`,
      },
    );
  }
}
