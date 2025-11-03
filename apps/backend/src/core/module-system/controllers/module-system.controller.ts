/* eslint-disable @typescript-eslint/require-await */
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ModuleRegistry } from '../registry/module.registry';
import { ModuleManagerService } from '../services/module-manager.service';
import * as sharedTypes from '@my-project/shared-types';
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
// import { GuildAdminGuard } from '../../auth/guards/guild-admin.guard';

/**
 * 🎛️ Module System Controller
 *
 * Endpoints pour gérer les modules
 */
@Controller('modules')
// @UseGuards(JwtAuthGuard, GuildAdminGuard) // À activer quand auth prêt
export class ModuleSystemController {
  constructor(
    private readonly moduleRegistry: ModuleRegistry,
    private readonly moduleManager: ModuleManagerService,
  ) {}

  /**
   * GET /modules
   * Liste tous les modules disponibles
   */
  @Get()
  async getAllModules() {
    return this.moduleRegistry.getAllModules();
  }

  /**
   * GET /modules/available/:plan
   * Liste les modules disponibles pour un plan
   */
  @Get('available/:plan')
  async getAvailableModules(@Param('plan') plan: sharedTypes.SubscriptionPlan) {
    return this.moduleRegistry.getAvailableModules(plan);
  }

  /**
   * GET /modules/enabled/:moduleId
   * Récupère toutes les guilds où un module est activé avec leurs configs
   */
  @Get('enabled/:moduleId')
  async getEnabledGuilds(@Param('moduleId') moduleId: string) {
    return this.moduleManager.getEnabledGuilds(moduleId);
  }

  /**
   * GET /modules/:guildId
   * Liste les modules d'un serveur
   */
  @Get(':guildId')
  async getGuildModules(@Param('guildId') guildId: string) {
    return this.moduleManager.getGuildModules(guildId);
  }

  /**
   * POST /modules/:guildId/enable
   * Active un module
   */
  @Post(':guildId/enable')
  async enableModule(
    @Param('guildId') guildId: string,
    @Body() dto: sharedTypes.EnableModuleDto,
  ) {
    // TODO: Récupérer le plan depuis la DB (guild.subscription)
    const plan = sharedTypes.SubscriptionPlan.FREE;

    return this.moduleManager.enableModule(
      guildId,
      dto.moduleId,
      plan,
      dto.config,
    );
  }

  /**
   * DELETE /modules/:guildId/disable
   * Désactive un module
   */
  @Delete(':guildId/disable')
  @HttpCode(HttpStatus.OK)
  async disableModule(
    @Param('guildId') guildId: string,
    @Body() dto: sharedTypes.DisableModuleDto,
  ) {
    return this.moduleManager.disableModule(guildId, dto.moduleId);
  }

  /**
   * POST /modules/:guildId/check-limit
   * Vérifie une limite
   */
  @Post(':guildId/check-limit')
  async checkLimit(
    @Param('guildId') guildId: string,
    @Body() request: sharedTypes.CheckLimitRequest,
  ) {
    // TODO: Récupérer le plan depuis la DB
    const plan = sharedTypes.SubscriptionPlan.FREE;

    return this.moduleManager.checkLimit(request, plan);
  }
}
