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
import { SubscriptionService } from '../../subscription/services/subscription.service';
import type {
  EnableModuleDto,
  DisableModuleDto,
  CheckLimitRequest,
} from '@my-project/shared-types';

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
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * GET /modules
   * Liste tous les modules disponibles
   */
  @Get()
  // eslint-disable-next-line @typescript-eslint/require-await
  async getAllModules() {
    return this.moduleRegistry.getAllModules();
  }

  /**
   * GET /modules/available/:guildId
   * Liste les modules disponibles pour le plan de la guild
   */
  @Get('available/:guildId')
  async getAvailableModules(@Param('guildId') guildId: string) {
    const plan = await this.subscriptionService.getGuildPlan(guildId);
    const sharedPlan = this.convertPrismaToSharedPlan(plan);
    return this.moduleRegistry.getAvailableModules(sharedPlan);
  }

  /**
   * GET /modules/:guildId
   * Liste les modules d'un serveur avec leur config
   */
  @Get(':guildId')
  async getGuildModules(@Param('guildId') guildId: string) {
    return this.moduleManager.getGuildModules(guildId);
  }

  /**
   * POST /modules/:guildId/enable
   * Active un module pour un serveur
   */
  @Post(':guildId/enable')
  async enableModule(
    @Param('guildId') guildId: string,
    @Body() dto: EnableModuleDto,
  ) {
    return this.moduleManager.enableModule(guildId, dto.moduleId, dto.config);
  }

  /**
   * DELETE /modules/:guildId/disable
   * Désactive un module
   */
  @Delete(':guildId/disable')
  @HttpCode(HttpStatus.OK)
  async disableModule(
    @Param('guildId') guildId: string,
    @Body() dto: DisableModuleDto,
  ) {
    return this.moduleManager.disableModule(guildId, dto.moduleId);
  }

  /**
   * POST /modules/:guildId/check-limit
   * Vérifie si une limite est respectée
   */
  @Post(':guildId/check-limit')
  async checkLimit(
    @Param('guildId') guildId: string,
    @Body() request: CheckLimitRequest,
  ) {
    return this.moduleManager.checkLimit({
      guildId: request.guildId,
      moduleId: request.moduleId,
      resource: request.resource,
      currentCount: request.currentCount,
    });
  }

  /**
   * Convertit un SubscriptionPlan Prisma en SubscriptionPlan Shared
   * (Copie de la méthode du service pour éviter une dépendance)
   */
  private convertPrismaToSharedPlan(prismaPlan: any): any {
    // Simple mapping string to string
    const mapping: Record<string, string> = {
      FREE: 'free',
      PRO: 'premium',
      MAX: 'max',
    };
    return mapping[prismaPlan] || 'free';
  }
}
