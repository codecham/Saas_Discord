import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseFilters,
  UseInterceptors,
  UseGuards,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GuildsService } from './guilds.service';
import { DiscordExceptionFilter } from '../../common/filters/discord-exception.filter';
import { DiscordResponseInterceptor } from '../../common/interceptors/discord-response.interceptor';
import { GuildAdminGuard } from '../../common/guards/guild-admin.guard';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';

/**
 * Controller pour les endpoints liés aux guilds Discord
 */
@Controller('discord/guilds')
@UseFilters(DiscordExceptionFilter)
@UseGuards(JwtAuthGuard)
@UseInterceptors(DiscordResponseInterceptor)
export class GuildsController {
  constructor(private readonly guildsService: GuildsService) {}

  /**
   * GET /discord/guilds/:guildId
   * Récupère les informations d'une guild
   */
  @Get(':guildId')
  @UseGuards(GuildAdminGuard)
  async getGuild(@Param('guildId') guildId: string) {
    return this.guildsService.getGuild(guildId);
  }

  /**
   * GET /discord/guilds/:guildId/with-metadata
   * Récupère les informations d'une guild avec les métadonnées de rate limiting
   */
  @Get(':guildId/with-metadata')
  @UseGuards(GuildAdminGuard)
  async getGuildWithMetadata(@Param('guildId') guildId: string) {
    return this.guildsService.getGuildWithMetadata(guildId);
  }

  /**
   * PATCH /discord/guilds/:guildId
   * Modifie les paramètres d'une guild
   */
  @Patch(':guildId')
  @UseGuards(GuildAdminGuard)
  async modifyGuild(
    @Param('guildId') guildId: string,
    @Body() data: any, // Utiliser ModifyGuildDTO depuis /packages
  ) {
    return this.guildsService.modifyGuild(guildId, data);
  }

  /**
   * GET /discord/guilds/:guildId/channels
   * Récupère tous les channels d'une guild
   */
  @Get(':guildId/channels')
  @UseGuards(GuildAdminGuard)
  async getGuildChannels(@Param('guildId') guildId: string) {
    return this.guildsService.getGuildChannels(guildId);
  }

  /**
   * POST /discord/guilds/:guildId/channels
   * Crée un nouveau channel dans une guild
   */
  @Post(':guildId/channels')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(GuildAdminGuard)
  async createGuildChannel(
    @Param('guildId') guildId: string,
    @Body() data: any, // Utiliser CreateChannelDTO depuis /packages
  ) {
    return this.guildsService.createGuildChannel(guildId, data);
  }

  // /**
  //  * GET /discord/guilds/:guildId/members
  //  * Récupère les membres d'une guild
  //  */
  // // @Get(':guildId/members')
  // // @UseGuards(GuildAdminGuard)
  // // async getGuildMembers(
  // //   @Param('guildId') guildId: string,
  // //   @Query('limit') limit?: number,
  // //   @Query('after') after?: string,
  // // ) {
  // //   return this.guildsService.getGuildMembers(guildId, { limit, after });
  // // }

  // /**
  //  * GET /discord/guilds/:guildId/members/:userId
  //  * Récupère un membre spécifique d'une guild
  //  */
  // @Get(':guildId/members/:userId')
  // @UseGuards(GuildAdminGuard)
  // async getGuildMember(
  //   @Param('guildId') guildId: string,
  //   @Param('userId') userId: string,
  // ) {
  //   return this.guildsService.getGuildMember(guildId, userId);
  // }

  // /**
  //  * PATCH /discord/guilds/:guildId/members/:userId
  //  * Modifie un membre d'une guild
  //  */
  // @Patch(':guildId/members/:userId')
  // @UseGuards(GuildAdminGuard)
  // async modifyGuildMember(
  //   @Param('guildId') guildId: string,
  //   @Param('userId') userId: string,
  //   @Body() data: any, // Utiliser ModifyGuildMemberDTO depuis /packages
  // ) {
  //   return this.guildsService.modifyGuildMember(guildId, userId, data);
  // }

  // /**
  //  * PUT /discord/guilds/:guildId/bans/:userId
  //  * Bannit un membre d'une guild
  //  */
  // @Put(':guildId/bans/:userId')
  // @UseGuards(GuildAdminGuard)
  // @HttpCode(HttpStatus.NO_CONTENT)
  // async banGuildMember(
  //   @Param('guildId') guildId: string,
  //   @Param('userId') userId: string,
  //   @Body('reason') reason?: string,
  // ) {
  //   return this.guildsService.banGuildMember(guildId, userId, reason);
  // }

  // /**
  //  * DELETE /discord/guilds/:guildId/bans/:userId
  //  * Révoque le ban d'un membre
  //  */
  // @Delete(':guildId/bans/:userId')
  // @UseGuards(GuildAdminGuard)
  // @HttpCode(HttpStatus.NO_CONTENT)
  // async unbanGuildMember(
  //   @Param('guildId') guildId: string,
  //   @Param('userId') userId: string,
  // ) {
  //   return this.guildsService.unbanGuildMember(guildId, userId);
  // }

  // /**
  //  * GET /discord/guilds/:guildId/roles
  //  * Récupère tous les rôles d'une guild
  //  */
  // @Get(':guildId/roles')
  // @UseGuards(GuildAdminGuard)
  // async getGuildRoles(@Param('guildId') guildId: string) {
  //   return this.guildsService.getGuildRoles(guildId);
  // }

  // /**
  //  * POST /discord/guilds/:guildId/roles
  //  * Crée un nouveau rôle dans une guild
  //  */
  // @Post(':guildId/roles')
  // @UseGuards(GuildAdminGuard)
  // @HttpCode(HttpStatus.CREATED)
  // async createGuildRole(
  //   @Param('guildId') guildId: string,
  //   @Body() data: any, // Utiliser CreateRoleDTO depuis /packages
  // ) {
  //   return this.guildsService.createGuildRole(guildId, data);
  // }

  // /**
  //  * PATCH /discord/guilds/:guildId/roles/:roleId
  //  * Modifie un rôle d'une guild
  //  */
  // @Patch(':guildId/roles/:roleId')
  // @UseGuards(GuildAdminGuard)
  // async modifyGuildRole(
  //   @Param('guildId') guildId: string,
  //   @Param('roleId') roleId: string,
  //   @Body() data: any, // Utiliser ModifyRoleDTO depuis /packages
  // ) {
  //   return this.guildsService.modifyGuildRole(guildId, roleId, data);
  // }

  // /**
  //  * DELETE /discord/guilds/:guildId/roles/:roleId
  //  * Supprime un rôle d'une guild
  //  */
  // @Delete(':guildId/roles/:roleId')
  // @UseGuards(GuildAdminGuard)
  // @HttpCode(HttpStatus.NO_CONTENT)
  // async deleteGuildRole(
  //   @Param('guildId') guildId: string,
  //   @Param('roleId') roleId: string,
  // ) {
  //   return this.guildsService.deleteGuildRole(guildId, roleId);
  // }
}
