/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseFilters,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MembersService } from '../members/members.service';
import { DiscordExceptionFilter } from '../../common/filters/discord-exception.filter';
import { DiscordResponseInterceptor } from '../../common/interceptors/discord-response.interceptor';

/**
 * Controller pour les endpoints liés aux bans Discord
 */
@Controller('discord/guilds/:guildId/bans')
@UseFilters(DiscordExceptionFilter)
@UseInterceptors(DiscordResponseInterceptor)
export class BansController {
  constructor(private readonly membersService: MembersService) {}

  /**
   * GET /discord/guilds/:guildId/bans
   * Récupère la liste des bans d'une guild
   */
  @Get()
  async getGuildBans(
    @Param('guildId') guildId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
    @Query('after') after?: string,
  ) {
    return this.membersService.getGuildBans(guildId, { limit, before, after });
  }

  /**
   * GET /discord/guilds/:guildId/bans/:userId
   * Récupère un ban spécifique
   */
  @Get(':userId')
  async getGuildBan(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
  ) {
    return this.membersService.getGuildBan(guildId, userId);
  }

  /**
   * PUT /discord/guilds/:guildId/bans/:userId
   * Bannit un membre
   */
  @Put(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async createGuildBan(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Body() data?: any,
  ) {
    const { reason, ...banData } = data || {};
    return this.membersService.createGuildBan(guildId, userId, banData, reason);
  }

  /**
   * DELETE /discord/guilds/:guildId/bans/:userId
   * Révoque le ban d'un membre
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeGuildBan(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.membersService.removeGuildBan(guildId, userId, reason);
  }
}
