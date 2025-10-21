import { Injectable, Logger } from '@nestjs/common';
import { DiscordApiService } from '../../core/discord-api.service';
import { DISCORD_ENDPOINTS } from '../../common/constants/discord-endpoints.constant';
import { MemberTransformer } from '../../transformers/member.transformer';
import {
  DiscordGuildMemberDTO,
  GuildMemberDTO,
  MemberListResponseDTO,
  AddGuildMemberDTO,
  ModifyGuildMemberDTO,
  ModifyCurrentMemberDTO,
  DiscordGuildBanDTO,
  CreateGuildBanDTO,
} from '@my-project/shared-types';

/**
 * Service pour gérer les membres des guilds Discord
 *
 * Maintenant retourne des GuildMemberDTO enrichis au lieu de DiscordGuildMemberDTO bruts
 */
@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly discordApi: DiscordApiService,
    private readonly memberTransformer: MemberTransformer,
  ) {}

  /**
   * Liste les membres d'une guild
   * Retourne maintenant MemberListResponseDTO avec métadonnées de pagination
   */
  async listGuildMembers(
    guildId: string,
    params?: {
      limit?: number;
      after?: string;
    },
  ): Promise<MemberListResponseDTO> {
    this.logger.debug(`Fetching members for guild ${guildId}`);

    try {
      // 1. Fetch depuis l'API Discord (DTOs bruts)
      const rawMembers: DiscordGuildMemberDTO[] = await this.discordApi.get<
        DiscordGuildMemberDTO[]
      >(DISCORD_ENDPOINTS.GUILD_MEMBERS(guildId), {
        params,
        rateLimitKey: `guild:${guildId}:members:list`,
      });

      this.logger.debug(`Fetched ${rawMembers.length} raw members`);

      // 2. Récupérer les infos nécessaires pour la transformation
      const guildInfo = await this.getGuildInfoForTransform(guildId);

      // 3. Transformer en DTOs enrichis
      const enrichedMembers = this.memberTransformer.transformMany(
        rawMembers,
        guildId,
        guildInfo.ownerId,
        guildInfo.adminRoleIds,
        guildInfo.moderatorRoleIds,
      );

      this.logger.debug(`Transformed ${enrichedMembers.length} members`);

      // 4. Construire la réponse paginée
      const limit = params?.limit || 100;
      const hasMore = rawMembers.length === limit;
      const nextCursor =
        hasMore && enrichedMembers.length > 0
          ? enrichedMembers[enrichedMembers.length - 1].id
          : undefined;

      return {
        members: enrichedMembers,
        total: enrichedMembers.length, // TODO: Récupérer le vrai total depuis l'API
        page: 1,
        limit,
        hasMore,
        nextCursor,
        loadedCount: enrichedMembers.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to list members for guild ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Recherche des membres dans une guild
   * Retourne maintenant GuildMemberDTO[] enrichis
   */
  async searchGuildMembers(
    guildId: string,
    query: string,
    limit?: number,
  ): Promise<GuildMemberDTO[]> {
    this.logger.debug(
      `Searching members in guild ${guildId} with query: ${query}`,
    );

    try {
      // 1. Fetch depuis Discord
      const rawMembers: DiscordGuildMemberDTO[] = await this.discordApi.get<
        DiscordGuildMemberDTO[]
      >(`${DISCORD_ENDPOINTS.GUILD_MEMBERS(guildId)}/search`, {
        params: { query, limit },
        rateLimitKey: `guild:${guildId}:members:search`,
      });

      // 2. Récupérer infos guild
      const guildInfo = await this.getGuildInfoForTransform(guildId);

      // 3. Transformer
      return this.memberTransformer.transformMany(
        rawMembers,
        guildId,
        guildInfo.ownerId,
        guildInfo.adminRoleIds,
        guildInfo.moderatorRoleIds,
      );
    } catch (error) {
      this.logger.error(`Failed to search members in guild ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Récupère un membre spécifique d'une guild
   * Retourne maintenant GuildMemberDTO enrichi
   */
  async getGuildMember(
    guildId: string,
    userId: string,
  ): Promise<GuildMemberDTO> {
    this.logger.debug(`Fetching member ${userId} from guild ${guildId}`);

    try {
      // 1. Fetch depuis Discord
      const rawMember: DiscordGuildMemberDTO =
        await this.discordApi.get<DiscordGuildMemberDTO>(
          DISCORD_ENDPOINTS.GUILD_MEMBER(guildId, userId),
          {
            rateLimitKey: `guild:${guildId}:member:${userId}`,
          },
        );

      // 2. Récupérer infos guild
      const guildInfo = await this.getGuildInfoForTransform(guildId);

      // 3. Transformer
      return this.memberTransformer.transform(
        rawMember,
        guildId,
        guildInfo.ownerId,
        guildInfo.adminRoleIds,
        guildInfo.moderatorRoleIds,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch member ${userId} from guild ${guildId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Ajoute un membre à une guild
   * Retourne le membre enrichi
   */
  async addGuildMember(
    guildId: string,
    userId: string,
    data: AddGuildMemberDTO,
  ): Promise<GuildMemberDTO> {
    this.logger.debug(`Adding member ${userId} to guild ${guildId}`);

    try {
      // 1. Ajouter via Discord API
      const rawMember: DiscordGuildMemberDTO =
        await this.discordApi.put<DiscordGuildMemberDTO>(
          DISCORD_ENDPOINTS.GUILD_MEMBER(guildId, userId),
          data,
          {
            rateLimitKey: `guild:${guildId}:member:${userId}:add`,
          },
        );

      // 2. Récupérer infos guild
      const guildInfo = await this.getGuildInfoForTransform(guildId);

      // 3. Transformer et retourner
      return this.memberTransformer.transform(
        rawMember,
        guildId,
        guildInfo.ownerId,
        guildInfo.adminRoleIds,
        guildInfo.moderatorRoleIds,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add member ${userId} to guild ${guildId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Modifie un membre d'une guild
   * Retourne le membre enrichi modifié
   */
  async modifyGuildMember(
    guildId: string,
    userId: string,
    data: ModifyGuildMemberDTO,
    reason?: string,
  ): Promise<GuildMemberDTO> {
    this.logger.debug(`Modifying member ${userId} in guild ${guildId}`);

    try {
      // 1. Modifier via Discord API
      const rawMember: DiscordGuildMemberDTO =
        await this.discordApi.patch<DiscordGuildMemberDTO>(
          DISCORD_ENDPOINTS.GUILD_MEMBER(guildId, userId),
          data,
          {
            headers: reason ? { 'X-Audit-Log-Reason': reason } : undefined,
            rateLimitKey: `guild:${guildId}:member:${userId}:modify`,
          },
        );

      // 2. Récupérer infos guild
      const guildInfo = await this.getGuildInfoForTransform(guildId);

      // 3. Transformer et retourner
      return this.memberTransformer.transform(
        rawMember,
        guildId,
        guildInfo.ownerId,
        guildInfo.adminRoleIds,
        guildInfo.moderatorRoleIds,
      );
    } catch (error) {
      this.logger.error(
        `Failed to modify member ${userId} in guild ${guildId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Modifie le membre actuel (bot)
   */
  async modifyCurrentMember(
    guildId: string,
    data: ModifyCurrentMemberDTO,
  ): Promise<GuildMemberDTO> {
    this.logger.debug(`Modifying current member (bot) in guild ${guildId}`);

    try {
      const rawMember: DiscordGuildMemberDTO =
        await this.discordApi.patch<DiscordGuildMemberDTO>(
          `${DISCORD_ENDPOINTS.GUILD_MEMBERS(guildId)}/@me`,
          data,
          {
            rateLimitKey: `guild:${guildId}:member:@me:modify`,
          },
        );

      const guildInfo = await this.getGuildInfoForTransform(guildId);

      return this.memberTransformer.transform(
        rawMember,
        guildId,
        guildInfo.ownerId,
        guildInfo.adminRoleIds,
        guildInfo.moderatorRoleIds,
      );
    } catch (error) {
      this.logger.error(
        `Failed to modify current member in guild ${guildId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retire un membre (kick)
   */
  async removeGuildMember(
    guildId: string,
    userId: string,
    reason?: string,
  ): Promise<void> {
    this.logger.debug(`Removing member ${userId} from guild ${guildId}`);

    try {
      await this.discordApi.delete(
        DISCORD_ENDPOINTS.GUILD_MEMBER(guildId, userId),
        {
          headers: reason ? { 'X-Audit-Log-Reason': reason } : undefined,
          rateLimitKey: `guild:${guildId}:member:${userId}:remove`,
        },
      );

      this.logger.log(
        `Successfully removed member ${userId} from guild ${guildId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove member ${userId} from guild ${guildId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Bannit un membre d'une guild
   */
  async createGuildBan(
    guildId: string,
    userId: string,
    data?: CreateGuildBanDTO,
    reason?: string,
  ): Promise<void> {
    return this.discordApi.put(
      DISCORD_ENDPOINTS.GUILD_BAN(guildId, userId),
      data || {},
      {
        headers: reason ? { 'X-Audit-Log-Reason': reason } : {},
        rateLimitKey: `guild:${guildId}:bans:create`,
      },
    );
  }

  /**
   * Récupère la liste des bans d'une guild
   */
  async getGuildBans(
    guildId: string,
    params?: {
      limit?: number;
      before?: string;
      after?: string;
    },
  ): Promise<DiscordGuildBanDTO[]> {
    return this.discordApi.get<DiscordGuildBanDTO[]>(
      DISCORD_ENDPOINTS.GUILD_BANS(guildId),
      {
        params,
        rateLimitKey: `guild:${guildId}:bans`,
      },
    );
  }

  /**
   * Récupère un ban spécifique
   */
  async getGuildBan(
    guildId: string,
    userId: string,
  ): Promise<DiscordGuildBanDTO> {
    return this.discordApi.get<DiscordGuildBanDTO>(
      DISCORD_ENDPOINTS.GUILD_BAN(guildId, userId),
      {
        rateLimitKey: `guild:${guildId}:ban:${userId}`,
      },
    );
  }

  /**
   * Révoque le ban d'un membre
   */
  async removeGuildBan(
    guildId: string,
    userId: string,
    reason?: string,
  ): Promise<void> {
    return this.discordApi.delete(
      DISCORD_ENDPOINTS.GUILD_BAN(guildId, userId),
      {
        headers: reason ? { 'X-Audit-Log-Reason': reason } : {},
        rateLimitKey: `guild:${guildId}:bans:remove`,
      },
    );
  }

  /**
   * Timeout un membre (mute temporaire)
   */
  async timeoutMember(
    guildId: string,
    userId: string,
    until: string,
    reason?: string,
  ): Promise<GuildMemberDTO> {
    this.logger.debug(
      `Setting timeout for member ${userId} in guild ${guildId} until ${until}`,
    );

    return this.modifyGuildMember(
      guildId,
      userId,
      { communication_disabled_until: until },
      reason,
    );
  }

  /**
   * Retire le timeout d'un membre
   */
  async removeTimeout(
    guildId: string,
    userId: string,
    reason?: string,
  ): Promise<GuildMemberDTO> {
    this.logger.debug(
      `Removing timeout for member ${userId} in guild ${guildId}`,
    );

    return this.modifyGuildMember(
      guildId,
      userId,
      { communication_disabled_until: null },
      reason,
    );
  }

  // =========================================================================
  // MÉTHODES PRIVÉES - HELPERS
  // =========================================================================

  /**
   * Récupère les informations nécessaires pour transformer les membres
   * (owner, roles admin, roles modérateur)
   *
   * TODO: Optimiser avec cache Redis (TTL 5 minutes)
   */
  private async getGuildInfoForTransform(guildId: string): Promise<{
    ownerId: string;
    adminRoleIds: string[];
    moderatorRoleIds: string[];
  }> {
    try {
      // Fetch la guild pour avoir l'owner_id
      const guild = await this.discordApi.get<any>(
        DISCORD_ENDPOINTS.GUILD(guildId),
        {
          rateLimitKey: `guild:${guildId}:info`,
        },
      );

      // Fetch les rôles pour extraire admin/moderator
      const roles = await this.discordApi.get<any[]>(
        DISCORD_ENDPOINTS.GUILD_ROLES(guildId),
        {
          rateLimitKey: `guild:${guildId}:roles`,
        },
      );

      // Extraire les IDs avec le transformer
      const adminRoleIds = this.memberTransformer.extractAdminRoleIds(roles);
      const moderatorRoleIds =
        this.memberTransformer.extractModeratorRoleIds(roles);

      this.logger.debug(
        `Guild ${guildId} - Owner: ${guild.owner_id}, ` +
          `Admin roles: ${adminRoleIds.length}, Moderator roles: ${moderatorRoleIds.length}`,
      );

      return {
        ownerId: guild.owner_id,
        adminRoleIds,
        moderatorRoleIds,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch guild info for ${guildId}:`, error);

      // Fallback: retourner des valeurs par défaut
      return {
        ownerId: '',
        adminRoleIds: [],
        moderatorRoleIds: [],
      };
    }
  }
}
