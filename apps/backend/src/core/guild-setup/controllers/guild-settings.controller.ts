import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GuildSettingsService } from '../services/guild-settings.service';
import {
  GuildSettingsDto,
  UpdateGuildSettingsDto,
} from '@my-project/shared-types';

/**
 * Controller pour la gestion des settings de guild
 *
 * Endpoints:
 * - GET    /guilds/:guildId/settings     - Récupérer settings
 * - PATCH  /guilds/:guildId/settings     - Mettre à jour settings
 */
@Controller('guilds/:guildId/settings')
@UseGuards(JwtAuthGuard) // Require authentication
export class GuildSettingsController {
  private readonly logger = new Logger(GuildSettingsController.name);

  constructor(private readonly settingsService: GuildSettingsService) {}

  /**
   * Récupérer les settings d'une guild
   *
   * @example GET /api/guilds/123456789/settings
   */
  @Get()
  async getSettings(
    @Param('guildId') guildId: string,
  ): Promise<GuildSettingsDto> {
    this.logger.log(`Getting settings for guild ${guildId}`);
    return this.settingsService.get(guildId);
  }

  /**
   * Mettre à jour les settings d'une guild (partiel)
   *
   * @example PATCH /api/guilds/123456789/settings
   * Body: {
   *   "locale": "fr",
   *   "timezone": "Europe/Paris",
   *   "adminRoleIds": ["role_id_1", "role_id_2"],
   *   "modRoleIds": ["role_id_3"]
   * }
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  async updateSettings(
    @Param('guildId') guildId: string,
    @Body() updateDto: Omit<UpdateGuildSettingsDto, 'guildId'>,
  ): Promise<GuildSettingsDto> {
    this.logger.log(`Updating settings for guild ${guildId}`);

    const dto: UpdateGuildSettingsDto = {
      guildId,
      ...updateDto,
    };

    return this.settingsService.update(dto);
  }
}
