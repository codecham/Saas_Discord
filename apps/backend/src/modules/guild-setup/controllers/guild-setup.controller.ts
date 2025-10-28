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
import { QuickStartService } from '../services/quick-start.service';
import type {
  GuildSetupStatusDto,
  InitializeGuildResponseDto,
  RetrySetupDto,
  QuickStartAnswersDto,
  QuickStartResponseDto,
  QuickStartOptionsDto,
} from '@my-project/shared-types';

/**
 * Controller pour la gestion du setup des guilds
 *
 * Endpoints:
 * - GET    /guilds/:guildId/setup/status          - Status du setup (polling)
 * - POST   /guilds/:guildId/setup/retry           - Retry setup échoué
 * - GET    /guilds/:guildId/setup/quick-start     - Options du wizard
 * - POST   /guilds/:guildId/setup/quick-start     - Appliquer wizard
 */
@Controller('guilds/:guildId/setup')
@UseGuards(JwtAuthGuard) // Require authentication
export class GuildSetupController {
  private readonly logger = new Logger(GuildSetupController.name);

  constructor(
    private readonly setupService: GuildSetupService,
    private readonly quickStartService: QuickStartService,
  ) {}

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
   * Récupérer les options disponibles pour le Quick Start Wizard
   *
   * @example GET /api/guilds/123456789/setup/quick-start
   */
  @Get('quick-start')
  async getQuickStartOptions(
    @Param('guildId') guildId: string,
  ): Promise<QuickStartOptionsDto> {
    this.logger.log(`Getting quick start options for guild ${guildId}`);
    return this.quickStartService.getOptions(guildId);
  }

  /**
   * Appliquer les réponses du Quick Start Wizard
   *
   * @example POST /api/guilds/123456789/setup/quick-start
   * Body: {
   *   "guildId": "123456789",
   *   "enableStats": true,
   *   "enableInviteTracking": true,
   *   "modLogChannelId": "987654321"
   * }
   */
  @Post('quick-start')
  @HttpCode(HttpStatus.OK)
  async submitQuickStart(
    @Param('guildId') guildId: string,
    @Body() answers: QuickStartAnswersDto,
  ): Promise<QuickStartResponseDto> {
    this.logger.log(`Submitting quick start for guild ${guildId}`);

    // S'assurer que le guildId du body correspond au param
    answers.guildId = guildId;

    return this.quickStartService.applyAnswers(answers);
  }
}
