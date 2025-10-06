import { Injectable } from '@nestjs/common';
import { DiscordApiService } from '../../core/discord-api.service';
import { DISCORD_ENDPOINTS } from '../../common/constants/discord-endpoints.constant';
import {
  DiscordGuildMemberDTO,
  AddGuildMemberDTO,
  ModifyGuildMemberDTO,
  ModifyCurrentMemberDTO,
  CreateGuildBanDTO,
  DiscordGuildBanDTO,
} from '@my-project/shared-types';

/**
 * Service pour gérer les membres des guilds Discord
 */
@Injectable()
export class MembersService {
  constructor(private readonly discordApi: DiscordApiService) {}

  /**
   * Liste les membres d'une guild
   */
  async listGuildMembers(
    guildId: string,
    params?: {
      limit?: number;
      after?: string;
    },
  ): Promise<DiscordGuildMemberDTO[]> {
    return this.discordApi.get<DiscordGuildMemberDTO[]>(
      DISCORD_ENDPOINTS.GUILD_MEMBERS(guildId),
      {
        params,
        rateLimitKey: `guild:${guildId}:members:list`,
      },
    );
  }

  /**
   * Recherche des membres dans une guild
   */
  async searchGuildMembers(
    guildId: string,
    query: string,
    limit?: number,
  ): Promise<DiscordGuildMemberDTO[]> {
    return this.discordApi.get<DiscordGuildMemberDTO[]>(
      `${DISCORD_ENDPOINTS.GUILD_MEMBERS(guildId)}/search`,
      {
        params: { query, limit },
        rateLimitKey: `guild:${guildId}:members:search`,
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
   * Ajoute un membre à une guild
   */
  async addGuildMember(
    guildId: string,
    userId: string,
    data: AddGuildMemberDTO,
  ): Promise<DiscordGuildMemberDTO> {
    return this.discordApi.put<DiscordGuildMemberDTO>(
      DISCORD_ENDPOINTS.GUILD_MEMBER(guildId, userId),
      data,
      {
        rateLimitKey: `guild:${guildId}:member:${userId}:add`,
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
    reason?: string,
  ): Promise<DiscordGuildMemberDTO> {
    return this.discordApi.patch<DiscordGuildMemberDTO>(
      DISCORD_ENDPOINTS.GUILD_MEMBER(guildId, userId),
      data,
      {
        headers: reason ? { 'X-Audit-Log-Reason': reason } : {},
        rateLimitKey: `guild:${guildId}:member:${userId}:modify`,
      },
    );
  }

  /**
   * Modifie le pseudo du bot dans une guild
   */
  async modifyCurrentMember(
    guildId: string,
    data: ModifyCurrentMemberDTO,
  ): Promise<DiscordGuildMemberDTO> {
    return this.discordApi.patch<DiscordGuildMemberDTO>(
      `${DISCORD_ENDPOINTS.GUILD_MEMBERS(guildId)}/@me`,
      data,
      {
        rateLimitKey: `guild:${guildId}:member:@me:modify`,
      },
    );
  }

  /**
   * Retire un membre d'une guild (kick)
   */
  async removeGuildMember(
    guildId: string,
    userId: string,
    reason?: string,
  ): Promise<void> {
    return this.discordApi.delete(
      DISCORD_ENDPOINTS.GUILD_MEMBER(guildId, userId),
      {
        headers: reason ? { 'X-Audit-Log-Reason': reason } : {},
        rateLimitKey: `guild:${guildId}:member:${userId}:remove`,
      },
    );
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
   * Timeout un membre (le mettre en sourdine temporairement)
   */
  async timeoutMember(
    guildId: string,
    userId: string,
    duration: string, // ISO8601 timestamp
    reason?: string,
  ): Promise<DiscordGuildMemberDTO> {
    return this.modifyGuildMember(
      guildId,
      userId,
      { communication_disabled_until: duration },
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
  ): Promise<DiscordGuildMemberDTO> {
    return this.modifyGuildMember(
      guildId,
      userId,
      { communication_disabled_until: null },
      reason,
    );
  }
}
