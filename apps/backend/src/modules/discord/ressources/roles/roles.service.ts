/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';
import { DiscordApiService } from '../../core/discord-api.service';
import { DISCORD_ENDPOINTS } from '../../common/constants/discord-endpoints.constant';
import { RoleTransformer } from '../../transformers/role.transformer';
import {
  DiscordRoleDTO,
  GuildRoleDTO,
  CreateRoleDTO,
  ModifyRoleDTO,
  ModifyRolePositionsDTO,
} from '@my-project/shared-types';

/**
 * Service pour gérer les rôles des guilds Discord
 *
 * Retourne maintenant des GuildRoleDTO enrichis au lieu de DiscordRoleDTO bruts
 */
@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private readonly discordApi: DiscordApiService,
    private readonly roleTransformer: RoleTransformer,
  ) {}

  /**
   * Liste tous les rôles d'une guild
   * Retourne maintenant GuildRoleDTO[] enrichis
   */
  async getGuildRoles(guildId: string): Promise<GuildRoleDTO[]> {
    this.logger.debug(`Fetching roles for guild ${guildId}`);

    try {
      // 1. Fetch depuis l'API Discord (DTOs bruts)
      const rawRoles = await this.discordApi.get<DiscordRoleDTO[]>(
        DISCORD_ENDPOINTS.GUILD_ROLES(guildId),
        {
          rateLimitKey: `guild:${guildId}:roles`,
        },
      );

      this.logger.debug(`Fetched ${rawRoles.length} raw roles`);

      // 2. Fetch les membres pour calculer les counts
      const members: any[] = await this.discordApi.get<any[]>(
        DISCORD_ENDPOINTS.GUILD_MEMBERS(guildId),
        {
          params: { limit: 1000 },
          rateLimitKey: `guild:${guildId}:members:list`,
        },
      );

      // 3. Calculer le nombre de membres par rôle
      const memberCounts = new Map<string, number>();

      // Initialiser tous les rôles à 0
      rawRoles.forEach((role) => memberCounts.set(role.id, 0));

      // Compter les membres par rôle
      members.forEach((member) => {
        member.roles?.forEach((roleId: string) => {
          const currentCount = memberCounts.get(roleId) || 0;
          memberCounts.set(roleId, currentCount + 1);
        });
      });

      // 4. Transformer en DTOs enrichis avec les counts
      const enrichedRoles = this.roleTransformer.transformMany(
        rawRoles,
        guildId,
        memberCounts,
      );

      this.logger.debug(
        `Transformed ${enrichedRoles.length} roles with member counts`,
      );

      return enrichedRoles;
    } catch (error) {
      this.logger.error(`Failed to list roles for guild ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Récupère un rôle spécifique par son ID
   * Retourne maintenant GuildRoleDTO enrichi
   */
  async getGuildRole(guildId: string, roleId: string): Promise<GuildRoleDTO> {
    this.logger.debug(`Fetching role ${roleId} from guild ${guildId}`);

    try {
      // Récupérer tous les rôles et filtrer (Discord n'a pas d'endpoint pour un seul rôle)
      const roles = await this.getGuildRoles(guildId);
      const role = roles.find((r) => r.id === roleId);

      if (!role) {
        throw new Error(`Role ${roleId} not found in guild ${guildId}`);
      }

      return role;
    } catch (error) {
      this.logger.error(
        `Failed to fetch role ${roleId} from guild ${guildId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Crée un nouveau rôle
   * Retourne le rôle enrichi créé
   */
  async createGuildRole(
    guildId: string,
    data?: CreateRoleDTO,
  ): Promise<GuildRoleDTO> {
    this.logger.debug(`Creating role in guild ${guildId}`);

    try {
      // 1. Créer via Discord API
      const rawRole = await this.discordApi.post<DiscordRoleDTO>(
        DISCORD_ENDPOINTS.GUILD_ROLES(guildId),
        data || {},
        {
          rateLimitKey: `guild:${guildId}:roles:create`,
        },
      );

      // 2. Transformer et retourner
      return this.roleTransformer.transform(rawRole, guildId);
    } catch (error) {
      this.logger.error(`Failed to create role in guild ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Modifie un rôle spécifique
   * Retourne le rôle enrichi modifié
   */
  async modifyGuildRole(
    guildId: string,
    roleId: string,
    data: ModifyRoleDTO,
  ): Promise<GuildRoleDTO> {
    this.logger.debug(`Modifying role ${roleId} in guild ${guildId}`);

    try {
      // 1. Modifier via Discord API
      const rawRole = await this.discordApi.patch<DiscordRoleDTO>(
        DISCORD_ENDPOINTS.GUILD_ROLE(guildId, roleId),
        data,
        {
          rateLimitKey: `guild:${guildId}:role:${roleId}:modify`,
        },
      );

      // 2. Transformer et retourner
      return this.roleTransformer.transform(rawRole, guildId);
    } catch (error) {
      this.logger.error(
        `Failed to modify role ${roleId} in guild ${guildId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Modifie les positions des rôles
   * Retourne tous les rôles enrichis avec leurs nouvelles positions
   */
  async modifyGuildRolePositions(
    guildId: string,
    positions: ModifyRolePositionsDTO[],
  ): Promise<GuildRoleDTO[]> {
    this.logger.debug(
      `Modifying role positions in guild ${guildId} (${positions.length} roles)`,
    );

    try {
      // 1. Modifier via Discord API
      const rawRoles: DiscordRoleDTO[] = await this.discordApi.patch<
        DiscordRoleDTO[]
      >(DISCORD_ENDPOINTS.GUILD_ROLES(guildId), positions, {
        rateLimitKey: `guild:${guildId}:roles:positions`,
      });

      // 2. Transformer et retourner
      return this.roleTransformer.transformMany(rawRoles, guildId);
    } catch (error) {
      this.logger.error(
        `Failed to modify role positions in guild ${guildId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Supprime un rôle
   */
  async deleteGuildRole(guildId: string, roleId: string): Promise<void> {
    this.logger.debug(`Deleting role ${roleId} from guild ${guildId}`);

    try {
      await this.discordApi.delete(
        DISCORD_ENDPOINTS.GUILD_ROLE(guildId, roleId),
        {
          rateLimitKey: `guild:${guildId}:role:${roleId}:delete`,
        },
      );

      this.logger.debug(
        `Successfully deleted role ${roleId} from guild ${guildId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete role ${roleId} from guild ${guildId}:`,
        error,
      );
      throw error;
    }
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
    this.logger.debug(
      `Adding role ${roleId} to member ${userId} in guild ${guildId}`,
    );

    try {
      await this.discordApi.put(
        `${DISCORD_ENDPOINTS.GUILD_MEMBER(guildId, userId)}/roles/${roleId}`,
        undefined,
        {
          headers: reason ? { 'X-Audit-Log-Reason': reason } : undefined,
          rateLimitKey: `guild:${guildId}:member:${userId}:role:add`,
        },
      );

      this.logger.debug(
        `Successfully added role ${roleId} to member ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add role ${roleId} to member ${userId}:`,
        error,
      );
      throw error;
    }
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
    this.logger.debug(
      `Removing role ${roleId} from member ${userId} in guild ${guildId}`,
    );

    try {
      await this.discordApi.delete(
        `${DISCORD_ENDPOINTS.GUILD_MEMBER(guildId, userId)}/roles/${roleId}`,
        {
          headers: reason ? { 'X-Audit-Log-Reason': reason } : undefined,
          rateLimitKey: `guild:${guildId}:member:${userId}:role:remove`,
        },
      );

      this.logger.debug(
        `Successfully removed role ${roleId} from member ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove role ${roleId} from member ${userId}:`,
        error,
      );
      throw error;
    }
  }
}
