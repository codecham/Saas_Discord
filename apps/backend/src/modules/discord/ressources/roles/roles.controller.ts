/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  UseFilters,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { DiscordExceptionFilter } from '../../common/filters/discord-exception.filter';
import { DiscordResponseInterceptor } from '../../common/interceptors/discord-response.interceptor';

/**
 * Controller pour les endpoints liés aux rôles Discord
 */
@Controller('discord/guilds/:guildId/roles')
@UseFilters(DiscordExceptionFilter)
@UseInterceptors(DiscordResponseInterceptor)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * GET /discord/guilds/:guildId/roles
   * Récupère tous les rôles d'une guild
   */
  @Get()
  async getGuildRoles(@Param('guildId') guildId: string) {
    return this.rolesService.getGuildRoles(guildId);
  }

  /**
   * POST /discord/guilds/:guildId/roles
   * Crée un nouveau rôle
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createGuildRole(@Param('guildId') guildId: string, @Body() data?: any) {
    return this.rolesService.createGuildRole(guildId, data);
  }

  /**
   * PATCH /discord/guilds/:guildId/roles
   * Modifie les positions des rôles
   */
  @Patch()
  async modifyGuildRolePositions(
    @Param('guildId') guildId: string,
    @Body() positions: Array<{ id: string; position: number }>,
  ) {
    return this.rolesService.modifyGuildRolePositions(guildId, positions);
  }

  /**
   * PATCH /discord/guilds/:guildId/roles/:roleId
   * Modifie un rôle spécifique
   */
  @Patch(':roleId')
  async modifyGuildRole(
    @Param('guildId') guildId: string,
    @Param('roleId') roleId: string,
    @Body() data: any,
  ) {
    return this.rolesService.modifyGuildRole(guildId, roleId, data);
  }

  /**
   * DELETE /discord/guilds/:guildId/roles/:roleId
   * Supprime un rôle
   */
  @Delete(':roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGuildRole(
    @Param('guildId') guildId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.rolesService.deleteGuildRole(guildId, roleId);
  }

  /**
   * PUT /discord/guilds/:guildId/members/:userId/roles/:roleId
   * Ajoute un rôle à un membre
   */
  @Put('../members/:userId/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async addMemberRole(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @Body('reason') reason?: string,
  ) {
    return this.rolesService.addMemberRole(guildId, userId, roleId, reason);
  }

  /**
   * DELETE /discord/guilds/:guildId/members/:userId/roles/:roleId
   * Retire un rôle d'un membre
   */
  @Delete('../members/:userId/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMemberRole(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @Body('reason') reason?: string,
  ) {
    return this.rolesService.removeMemberRole(guildId, userId, roleId, reason);
  }
}
