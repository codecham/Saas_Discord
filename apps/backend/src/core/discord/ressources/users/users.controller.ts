/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseFilters,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { DiscordExceptionFilter } from '../../common/filters/discord-exception.filter';
import { DiscordResponseInterceptor } from '../../common/interceptors/discord-response.interceptor';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

/**
 * Controller pour les endpoints liés aux utilisateurs Discord
 * Nécessite une authentification JWT
 */
@Controller('discord/users')
@UseFilters(DiscordExceptionFilter)
@UseInterceptors(DiscordResponseInterceptor)
@UseGuards(JwtAuthGuard) // Toutes les routes nécessitent une auth
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /discord/users/@me/guilds/categorized
   * Récupère les guilds admin de l'utilisateur catégorisées par présence du bot
   * IMPORTANT: Cette route doit être AVANT @me/guilds pour éviter les conflits
   */
  @Get('@me/guilds/categorized')
  async getCurrentUserGuildsCategorized(@CurrentUser('id') userId: string) {
    return this.usersService.getCurrentUserGuildsCategorized(userId);
  }

  /**
   * GET /discord/users/@me/guilds/:guildId
   * Récupère les informations d'une guild spécifique pour l'utilisateur connecté
   * IMPORTANT: Cette route doit être AVANT @me/guilds pour éviter les conflits
   */
  @Get('@me/guilds/:guildId')
  async getCurrentUserGuild(
    @Param('guildId') guildId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.getCurrentUserGuild(userId, guildId);
  }

  /**
   * DELETE /discord/users/@me/guilds/:guildId
   * Quitte une guild
   */
  @Delete('@me/guilds/:guildId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveGuild(
    @Param('guildId') guildId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.leaveGuild(userId, guildId);
  }

  /**
   * GET /discord/users/@me/guilds
   * Récupère la liste des guilds de l'utilisateur connecté
   */
  @Get('@me/guilds')
  async getCurrentUserGuilds(
    @CurrentUser('id') userId: string,
    @Query('before') before?: string,
    @Query('after') after?: string,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getCurrentUserGuilds(userId, {
      before,
      after,
      limit,
    });
  }

  /**
   * GET /discord/users/@me/connections
   * Récupère les connexions de l'utilisateur connecté
   */
  @Get('@me/connections')
  async getCurrentUserConnections(@CurrentUser('id') userId: string) {
    return this.usersService.getCurrentUserConnections(userId);
  }

  /**
   * POST /discord/users/@me/channels
   * Crée un DM avec un utilisateur
   */
  @Post('@me/channels')
  @HttpCode(HttpStatus.CREATED)
  async createDM(
    @Body('recipient_id') recipientId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.createDM(userId, recipientId);
  }

  /**
   * GET /discord/users/@me
   * Récupère les informations Discord de l'utilisateur connecté
   */
  @Get('@me')
  async getCurrentUser(@CurrentUser('id') userId: string) {
    return this.usersService.getCurrentUser(userId);
  }

  /**
   * GET /discord/users/bot
   * Récupère les informations du bot Discord
   */
  @Get('bot')
  async getBotUser() {
    return this.usersService.getBotUser();
  }

  /**
   * PATCH /discord/users/@me
   * Modifie l'utilisateur actuel (bot uniquement)
   * Note: Cette route modifie le BOT, pas l'utilisateur connecté
   */
  @Patch('@me')
  async modifyCurrentUser(@Body() data: any) {
    return this.usersService.modifyCurrentUser(data);
  }

  /**
   * GET /discord/users/:userId/with-metadata
   * Récupère les informations d'un utilisateur avec métadonnées
   * IMPORTANT: Cette route doit être AVANT :userId pour éviter les conflits
   */
  @Get(':userId/with-metadata')
  async getUserWithMetadata(@Param('userId') userId: string) {
    return this.usersService.getUserWithMetadata(userId);
  }

  /**
   * GET /discord/users/:userId
   * Récupère les informations d'un utilisateur (via le bot)
   * IMPORTANT: Cette route doit être EN DERNIER pour ne pas capturer les routes spécifiques
   */
  @Get(':userId')
  async getUser(@Param('userId') userId: string) {
    return this.usersService.getUser(userId);
  }
}
