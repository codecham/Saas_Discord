/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Get,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseFilters,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { DiscordExceptionFilter } from '../../common/filters/discord-exception.filter';
import { DiscordResponseInterceptor } from '../../common/interceptors/discord-response.interceptor';

/**
 * Controller pour les endpoints liés aux membres des guilds Discord
 */
@Controller('discord/guilds/:guildId/members')
@UseFilters(DiscordExceptionFilter)
@UseInterceptors(DiscordResponseInterceptor)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  /**
   * GET /discord/guilds/:guildId/members
   * Liste les membres d'une guild
   */
  @Get()
  async listGuildMembers(
    @Param('guildId') guildId: string,
    @Query('limit') limit?: number,
    @Query('after') after?: string,
  ) {
    return this.membersService.listGuildMembers(guildId, { limit, after });
  }

  /**
   * GET /discord/guilds/:guildId/members/search
   * Recherche des membres dans une guild
   */
  @Get('search')
  async searchGuildMembers(
    @Param('guildId') guildId: string,
    @Query('query') query: string,
    @Query('limit') limit?: number,
  ) {
    return this.membersService.searchGuildMembers(guildId, query, limit);
  }

  /**
   * PATCH /discord/guilds/:guildId/members/@me
   * Modifie le membre actuel (bot)
   */
  @Patch('@me')
  async modifyCurrentMember(
    @Param('guildId') guildId: string,
    @Body() data: { nick?: string | null },
  ) {
    return this.membersService.modifyCurrentMember(guildId, data);
  }

  /**
   * GET /discord/guilds/:guildId/members/:userId
   * Récupère un membre spécifique
   */
  @Get(':userId')
  async getGuildMember(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
  ) {
    return this.membersService.getGuildMember(guildId, userId);
  }

  /**
   * PUT /discord/guilds/:guildId/members/:userId
   * Ajoute un membre à une guild
   */
  @Put(':userId')
  async addGuildMember(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Body() data: any,
  ) {
    return this.membersService.addGuildMember(guildId, userId, data);
  }

  /**
   * PATCH /discord/guilds/:guildId/members/:userId
   * Modifie un membre
   */
  @Patch(':userId')
  async modifyGuildMember(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Body() data: any,
  ) {
    const { reason, ...memberData } = data;
    return this.membersService.modifyGuildMember(
      guildId,
      userId,
      memberData,
      reason,
    );
  }

  /**
   * DELETE /discord/guilds/:guildId/members/:userId
   * Retire un membre (kick)
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeGuildMember(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.membersService.removeGuildMember(guildId, userId, reason);
  }

  /**
   * POST /discord/guilds/:guildId/members/:userId/timeout
   * Timeout un membre
   */
  @Patch(':userId/timeout')
  async timeoutMember(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Body('duration') duration: string,
    @Body('reason') reason?: string,
  ) {
    return this.membersService.timeoutMember(guildId, userId, duration, reason);
  }

  /**
   * DELETE /discord/guilds/:guildId/members/:userId/timeout
   * Retire le timeout d'un membre
   */
  @Delete(':userId/timeout')
  async removeTimeout(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.membersService.removeTimeout(guildId, userId, reason);
  }
}
