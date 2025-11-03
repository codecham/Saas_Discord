import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GuildSetupService } from '../services/guild-setup.service';
import type {
  GuildSetupStatusDto,
  InitializeGuildResponseDto,
  RetrySetupDto,
} from '@my-project/shared-types';

/**
 * Controller pour la gestion du setup des guilds
 *
 * Endpoints:
 * - GET    /guilds/:guildId/setup/status          - Status du setup (polling)
 * - POST   /guilds/:guildId/setup/retry           - Retry setup échoué
 * - GET    /guilds/:guildId/setup/invite-url      - URL d'invitation Discord
 */
@Controller('guilds/:guildId/setup')
@UseGuards(JwtAuthGuard) // Require authentication
export class GuildSetupController {
  private readonly logger = new Logger(GuildSetupController.name);

  constructor(private readonly setupService: GuildSetupService) {}

  /**
   * Récupérer le status du setup d'une guild
   * Utilisé pour le polling côté frontend
   *
   * @example GET /api/guilds/123456789/setup/status
   */
  @Get('status')
  async getSetupStatus(
    @Param('guildId') guildId: string,
  ): Promise<GuildSetupStatusDto> {
    this.logger.log(`Getting setup status for guild ${guildId}`);
    return this.setupService.getSetupStatus(guildId);
  }

  /**
   * Retry un setup qui a échoué
   *
   * @example POST /api/guilds/123456789/setup/retry
   * Body: { "force": true }
   */
  @Post('retry')
  @HttpCode(HttpStatus.OK)
  async retrySetup(
    @Param('guildId') guildId: string,
    @Body() body: { force?: boolean },
  ): Promise<InitializeGuildResponseDto> {
    this.logger.log(`Retrying setup for guild ${guildId}`);

    const dto: RetrySetupDto = {
      guildId,
      force: body.force,
    };

    return this.setupService.retrySetup(dto);
  }

  /**
   * Génère l'URL d'invitation Discord OAuth pour ajouter le bot
   * Pré-remplit le guild_id pour une expérience fluide
   *
   * @example GET /api/guilds/123456789/setup/invite-url
   */
  @Get('invite-url')
  // eslint-disable-next-line @typescript-eslint/require-await
  async getInviteUrl(
    @Param('guildId') guildId: string,
  ): Promise<{ inviteUrl: string }> {
    this.logger.log(`Generating invite URL for guild ${guildId}`);

    // Récupérer le bot client ID depuis les variables d'environnement
    const clientId = process.env.DISCORD_CLIENT_ID;

    if (!clientId) {
      throw new Error('DISCORD_CLIENT_ID not configured');
    }

    // Permissions requises (calculées en fonction des features)
    // Voir: https://discord.com/developers/docs/topics/permissions
    const permissions = '8'; // Administrator (recommandé pour simplicité)

    // Alternative: liste détaillée des permissions nécessaires
    // const permissions = [
    //   '2048',     // VIEW_CHANNELS
    //   '3072',     // SEND_MESSAGES + EMBED_LINKS
    //   '8192',     // MANAGE_MESSAGES
    //   '268435456' // MANAGE_ROLES
    // ].join('');

    // Construire l'URL OAuth
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&guild_id=${guildId}&scope=bot%20applications.commands`;

    return { inviteUrl };
  }
}
