import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WelcomeService } from './welcome.service';
import { WelcomeConfig } from '@prisma/client';

/**
 * 👋 Welcome Controller
 *
 * Endpoints pour gérer les messages de bienvenue
 */
@Controller('welcome')
// @UseGuards(JwtAuthGuard, GuildAdminGuard) // À activer quand auth prêt
export class WelcomeController {
  constructor(private readonly welcomeService: WelcomeService) {}

  /**
   * GET /welcome/:guildId
   * Récupère la config
   */
  @Get(':guildId')
  async getConfig(@Param('guildId') guildId: string): Promise<WelcomeConfig> {
    return this.welcomeService.getConfig(guildId);
  }

  /**
   * POST /welcome/:guildId
   * Crée ou met à jour la config
   */
  @Post(':guildId')
  async upsertConfig(
    @Param('guildId') guildId: string,
    @Body()
    body: {
      enabled?: boolean;
      channelId?: string | null;
      messageType?: 'text' | 'embed';
      messageContent?: string;
      embedColor?: string;
      embedTitle?: string;
      embedDescription?: string;
      embedThumbnail?: string;
      embedFooter?: string;
    },
  ): Promise<WelcomeConfig> {
    return this.welcomeService.upsertConfig(guildId, body);
  }

  /**
   * PUT /welcome/:guildId/toggle
   * Active/désactive
   */
  @Put(':guildId/toggle')
  async toggleEnabled(
    @Param('guildId') guildId: string,
    @Body() body: { enabled: boolean },
  ): Promise<WelcomeConfig> {
    return this.welcomeService.toggleEnabled(guildId, body.enabled);
  }

  /**
   * DELETE /welcome/:guildId
   * Supprime la config
   */
  @Delete(':guildId')
  @HttpCode(HttpStatus.OK)
  async deleteConfig(
    @Param('guildId') guildId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.welcomeService.deleteConfig(guildId);
  }
}
