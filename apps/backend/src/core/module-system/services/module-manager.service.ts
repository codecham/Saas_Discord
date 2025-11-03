/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModuleRegistry } from '../registry/module.registry';
import {
  GuildModuleConfig,
  CheckLimitRequest,
  CheckLimitResponse,
  SubscriptionPlan,
  ModuleStatus,
} from '@my-project/shared-types';

/**
 * 🎛️ Module Manager Service
 *
 * Responsabilités :
 * - Enable/Disable modules pour un serveur
 * - CRUD sur guild_modules
 * - Vérifier limites avant actions
 * - Notifier le Bot des changements
 */
@Injectable()
export class ModuleManagerService {
  private readonly logger = new Logger(ModuleManagerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleRegistry: ModuleRegistry,
  ) {}

  /**
   * Active un module pour un serveur
   */
  async enableModule(
    guildId: string,
    moduleId: string,
    plan: SubscriptionPlan,
    config?: Record<string, any>,
  ): Promise<GuildModuleConfig> {
    // 1. Vérifier que le module existe
    const moduleDef = this.moduleRegistry.getModule(moduleId);
    if (!moduleDef) {
      throw new NotFoundException(`Module "${moduleId}" not found`);
    }

    // 2. Vérifier disponibilité pour le plan
    if (!this.moduleRegistry.isModuleAvailable(moduleId, plan)) {
      throw new ForbiddenException(
        `Module "${moduleId}" not available for ${plan} plan`,
      );
    }

    // 3. Vérifier dépendances
    const enabledModules = await this.getEnabledModuleIds(guildId);
    const missingDeps = this.moduleRegistry.checkDependencies(
      moduleId,
      enabledModules,
    );
    if (missingDeps.length > 0) {
      throw new BadRequestException(
        `Missing required modules: ${missingDeps.join(', ')}`,
      );
    }

    // 4. Enable dans la DB
    const guildModule = await this.prisma.guildModule.upsert({
      where: {
        guildId_moduleId: { guildId, moduleId },
      },
      create: {
        guildId,
        moduleId,
        enabled: true,
        enabledAt: new Date(),
        config: config || {},
      },
      update: {
        enabled: true,
        enabledAt: new Date(),
        disabledAt: null,
        config: config || {},
      },
    });

    this.logger.log(`✅ Module "${moduleId}" enabled for guild ${guildId}`);

    // 5. TODO: Notifier le Bot via Gateway
    // await this.notifyBot({ ... });

    return this.mapToGuildModuleConfig(guildModule);
  }

  /**
   * Désactive un module pour un serveur
   */
  async disableModule(
    guildId: string,
    moduleId: string,
  ): Promise<GuildModuleConfig> {
    const guildModule = await this.prisma.guildModule.update({
      where: {
        guildId_moduleId: { guildId, moduleId },
      },
      data: {
        enabled: false,
        disabledAt: new Date(),
      },
    });

    this.logger.log(`❌ Module "${moduleId}" disabled for guild ${guildId}`);

    // TODO: Notifier le Bot
    // await this.notifyBot({ ... });

    return this.mapToGuildModuleConfig(guildModule);
  }

  /**
   * Vérifie si un module est activé pour un serveur
   */
  async isModuleEnabled(guildId: string, moduleId: string): Promise<boolean> {
    const guildModule = await this.prisma.guildModule.findUnique({
      where: {
        guildId_moduleId: { guildId, moduleId },
      },
    });

    return guildModule?.enabled || false;
  }

  /**
   * Récupère tous les modules d'un serveur
   */
  async getGuildModules(guildId: string): Promise<GuildModuleConfig[]> {
    const guildModules = await this.prisma.guildModule.findMany({
      where: { guildId },
    });

    return guildModules.map((gm) => this.mapToGuildModuleConfig(gm));
  }

  /**
   * Récupère les IDs des modules actifs
   */
  async getEnabledModuleIds(guildId: string): Promise<string[]> {
    const guildModules = await this.prisma.guildModule.findMany({
      where: { guildId, enabled: true },
      select: { moduleId: true },
    });

    return guildModules.map((gm) => gm.moduleId);
  }

  /**
   * Vérifie une limite pour un module
   */
  async checkLimit(
    request: CheckLimitRequest,
    plan: SubscriptionPlan,
  ): Promise<CheckLimitResponse> {
    const { guildId, moduleId, resource, currentCount } = request;

    // Vérifier si module activé
    const isEnabled = await this.isModuleEnabled(guildId, moduleId);
    if (!isEnabled) {
      return {
        allowed: false,
        limit: 0,
        current: currentCount,
        plan,
        upgradeRequired: false,
      };
    }

    // Récupérer limite
    const limitValue = this.moduleRegistry.getLimitValue(
      moduleId,
      plan,
      resource,
    );

    // Pas de limite définie = autorisé
    if (limitValue === undefined) {
      return {
        allowed: true,
        limit: -1,
        current: currentCount,
        plan,
      };
    }

    // Illimité
    if (limitValue === -1) {
      return {
        allowed: true,
        limit: -1,
        current: currentCount,
        plan,
      };
    }

    // Vérifier limite
    const allowed = currentCount < limitValue;

    return {
      allowed,
      limit: limitValue,
      current: currentCount,
      plan,
      upgradeRequired: !allowed && plan !== SubscriptionPlan.ENTERPRISE,
    };
  }

  /**
   * Met à jour la config d'un module
   */
  async updateModuleConfig(
    guildId: string,
    moduleId: string,
    config: Record<string, any>,
  ): Promise<GuildModuleConfig> {
    const guildModule = await this.prisma.guildModule.update({
      where: {
        guildId_moduleId: { guildId, moduleId },
      },
      data: {
        config,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `🔧 Module "${moduleId}" config updated for guild ${guildId}`,
    );

    // TODO: Notifier le Bot
    // await this.notifyBot({ ... });

    return this.mapToGuildModuleConfig(guildModule);
  }

  /**
   * Map Prisma model vers DTO
   */
  private mapToGuildModuleConfig(guildModule: any): GuildModuleConfig {
    return {
      guildId: guildModule.guildId,
      moduleId: guildModule.moduleId,
      enabled: guildModule.enabled,
      status: guildModule.enabled
        ? ModuleStatus.ENABLED
        : ModuleStatus.DISABLED,
      enabledAt: guildModule.enabledAt,
      disabledAt: guildModule.disabledAt,
      config: guildModule.config as Record<string, any>,
    };
  }

  /**
   * Récupère toutes les guilds où un module est activé
   * Retourne les configs spécifiques au module
   */
  async getEnabledGuilds(
    moduleId: string,
  ): Promise<Array<{ guildId: string; config: any }>> {
    // Récupérer les guild_modules activés
    const guildModules = await this.prisma.guildModule.findMany({
      where: {
        moduleId,
        enabled: true,
      },
      select: {
        guildId: true,
        config: true,
      },
    });

    // Si le module a une table de config spécifique, la charger aussi
    if (moduleId === 'welcome') {
      // S'il n'y a pas de guild_modules, retourner tableau vide
      if (guildModules.length === 0) {
        return [];
      }

      const welcomeConfigs = await this.prisma.welcomeConfig.findMany({
        where: {
          enabled: true,
          guildId: {
            in: guildModules.map((gm) => gm.guildId),
          },
        },
      });

      // Retourner les configs spécifiques au module welcome
      return welcomeConfigs.map((wc) => ({
        guildId: wc.guildId,
        config: {
          id: wc.id,
          enabled: wc.enabled,
          channelId: wc.channelId,
          messageType: wc.messageType,
          messageContent: wc.messageContent,
          embedColor: wc.embedColor,
          embedTitle: wc.embedTitle,
          embedDescription: wc.embedDescription,
          embedThumbnail: wc.embedThumbnail,
          embedFooter: wc.embedFooter,
        },
      }));
    }

    // Pour les autres modules futurs, retourner la config générique
    return guildModules.map((gm) => ({
      guildId: gm.guildId,
      config: (gm.config as Record<string, any>) || {},
    }));
  }
}
