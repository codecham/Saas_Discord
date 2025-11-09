/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModuleRegistry } from '../registry/module.registry';
import { GuildModuleConfig, SubscriptionPlan } from '@my-project/shared-types';
import { SubscriptionService } from '../../subscription/services/subscription.service';
import { SubscriptionPlan as PrismaSubscriptionPlan } from '@prisma/client';

/**
 * 🎮 Module Manager Service
 *
 * Service pour gérer l'activation/désactivation des modules par serveur.
 * Vérifie les limites selon le plan d'abonnement via le SubscriptionService (core).
 */
@Injectable()
export class ModuleManagerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleRegistry: ModuleRegistry,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Active un module pour un serveur
   *
   * @param guildId - ID Discord du serveur
   * @param moduleId - ID du module à activer
   * @param config - Configuration initiale du module (optionnel)
   * @returns Configuration du module activé
   */
  async enableModule(
    guildId: string,
    moduleId: string,
    config?: Record<string, any>,
  ): Promise<GuildModuleConfig> {
    // Récupérer le plan d'abonnement de la guild
    const prismaPlan = await this.subscriptionService.getGuildPlan(guildId);
    const plan = this.convertPrismaToSharedPlan(prismaPlan);

    // Vérifier que le module existe
    const moduleDef = this.moduleRegistry.getModule(moduleId);
    if (!moduleDef) {
      throw new BadRequestException(`Module ${moduleId} not found`);
    }

    // Vérifier que le module est disponible pour ce plan
    const isAvailable = this.moduleRegistry.isModuleAvailable(moduleId, plan);
    if (!isAvailable) {
      throw new BadRequestException(
        `Module ${moduleId} is not available for plan ${plan}`,
      );
    }

    // Vérifier les dépendances
    const enabledModuleIds = await this.getEnabledModuleIds(guildId);
    const missingDeps = this.moduleRegistry.checkDependencies(
      moduleId,
      enabledModuleIds,
    );

    if (missingDeps.length > 0) {
      throw new BadRequestException(
        `Missing dependencies: ${missingDeps.join(', ')}`,
      );
    }

    // Activer ou mettre à jour le module
    const guildModule = await this.prisma.guildModule.upsert({
      where: {
        guildId_moduleId: {
          guildId,
          moduleId,
        },
      },
      update: {
        enabled: true,
        enabledAt: new Date(),
        config: config ?? undefined,
      },
      create: {
        guildId,
        moduleId,
        enabled: true,
        enabledAt: new Date(),
        config: config ?? undefined,
      },
    });

    return this.mapToGuildModuleConfig(guildModule, moduleDef);
  }

  /**
   * Désactive un module pour un serveur
   *
   * @param guildId - ID Discord du serveur
   * @param moduleId - ID du module à désactiver
   * @returns Configuration du module désactivé
   */
  async disableModule(
    guildId: string,
    moduleId: string,
  ): Promise<GuildModuleConfig> {
    const moduleDef = this.moduleRegistry.getModule(moduleId);
    if (!moduleDef) {
      throw new BadRequestException(`Module ${moduleId} not found`);
    }

    const guildModule = await this.prisma.guildModule.update({
      where: {
        guildId_moduleId: {
          guildId,
          moduleId,
        },
      },
      data: {
        enabled: false,
        disabledAt: new Date(),
      },
    });

    return this.mapToGuildModuleConfig(guildModule, moduleDef);
  }

  /**
   * Vérifie si un module est activé pour un serveur
   *
   * @param guildId - ID Discord du serveur
   * @param moduleId - ID du module
   * @returns true si activé
   */
  async isModuleEnabled(guildId: string, moduleId: string): Promise<boolean> {
    const guildModule = await this.prisma.guildModule.findUnique({
      where: {
        guildId_moduleId: {
          guildId,
          moduleId,
        },
      },
    });

    return guildModule?.enabled ?? false;
  }

  /**
   * Récupère tous les modules d'un serveur
   *
   * @param guildId - ID Discord du serveur
   * @returns Liste des configurations de modules
   */
  async getGuildModules(guildId: string): Promise<GuildModuleConfig[]> {
    const guildModules = await this.prisma.guildModule.findMany({
      where: { guildId },
    });

    return guildModules.map((gm) => {
      const moduleDef = this.moduleRegistry.getModule(gm.moduleId);
      return this.mapToGuildModuleConfig(gm, moduleDef);
    });
  }

  /**
   * Récupère les IDs des modules activés pour un serveur
   *
   * @param guildId - ID Discord du serveur
   * @returns Liste des IDs de modules activés
   */
  async getEnabledModuleIds(guildId: string): Promise<string[]> {
    const guildModules = await this.prisma.guildModule.findMany({
      where: {
        guildId,
        enabled: true,
      },
      select: {
        moduleId: true,
      },
    });

    return guildModules.map((gm) => gm.moduleId);
  }

  /**
   * Vérifie si une limite est respectée pour un module
   *
   * Combine la vérification du registry avec le plan actuel de la guild
   *
   * @param params - Paramètres de vérification
   * @param params.guildId - ID Discord du serveur
   * @param params.moduleId - ID du module
   * @param params.resource - Nom de la ressource limitée (ex: 'rules', 'channels')
   * @param params.currentCount - Nombre actuel de ressources utilisées
   * @returns Résultat de la vérification avec la limite
   */
  async checkLimit(params: {
    guildId: string;
    moduleId: string;
    resource: string;
    currentCount: number;
  }): Promise<{
    allowed: boolean;
    limit: number;
    current: number;
    remaining: number;
  }> {
    const { guildId, moduleId, resource, currentCount } = params;

    // Récupérer le plan de la guild
    const prismaPlan = await this.subscriptionService.getGuildPlan(guildId);
    const plan = this.convertPrismaToSharedPlan(prismaPlan);

    // Vérifier avec le registry
    const allowed = this.moduleRegistry.checkLimit(
      moduleId,
      plan,
      resource,
      currentCount,
    );

    const limitValue = this.moduleRegistry.getLimitValue(
      moduleId,
      plan,
      resource,
    );
    const limit = limitValue ?? 0;

    return {
      allowed,
      limit,
      current: currentCount,
      remaining: limit === -1 ? -1 : Math.max(0, limit - currentCount),
    };
  }

  /**
   * Met à jour la configuration d'un module
   *
   * @param guildId - ID Discord du serveur
   * @param moduleId - ID du module
   * @param config - Nouvelle configuration
   * @returns Configuration mise à jour
   */
  async updateModuleConfig(
    guildId: string,
    moduleId: string,
    config: Record<string, any>,
  ): Promise<GuildModuleConfig> {
    const moduleDef = this.moduleRegistry.getModule(moduleId);
    if (!moduleDef) {
      throw new BadRequestException(`Module ${moduleId} not found`);
    }

    const guildModule = await this.prisma.guildModule.update({
      where: {
        guildId_moduleId: {
          guildId,
          moduleId,
        },
      },
      data: {
        config,
      },
    });

    return this.mapToGuildModuleConfig(guildModule, moduleDef);
  }

  /**
   * Convertit un SubscriptionPlan Prisma en SubscriptionPlan Shared
   *
   * @param prismaPlan - Plan depuis Prisma (enum)
   * @returns Plan pour shared-types (string)
   */
  private convertPrismaToSharedPlan(
    prismaPlan: PrismaSubscriptionPlan,
  ): SubscriptionPlan {
    // Prisma enums are uppercase strings: "FREE", "PRO", "MAX"
    // Shared-types enums are lowercase strings: "free", "premium", "max"
    const mapping: Record<PrismaSubscriptionPlan, SubscriptionPlan> = {
      [PrismaSubscriptionPlan.FREE]: SubscriptionPlan.FREE,
      [PrismaSubscriptionPlan.PRO]: SubscriptionPlan.PREMIUM,
      [PrismaSubscriptionPlan.MAX]: SubscriptionPlan.MAX,
    };

    return mapping[prismaPlan];
  }

  /**
   * Transforme un GuildModule Prisma en GuildModuleConfig DTO
   *
   * @param guildModule - Model Prisma
   * @param moduleDef - Définition du module (optionnel)
   * @returns DTO pour le frontend
   */
  private mapToGuildModuleConfig(
    guildModule: {
      id: string;
      guildId: string;
      moduleId: string;
      enabled: boolean;
      enabledAt: Date | null;
      disabledAt: Date | null;
      config: any;
      createdAt: Date;
      updatedAt: Date;
    },
    moduleDef?: any,
  ): GuildModuleConfig {
    return {
      id: guildModule.id,
      guildId: guildModule.guildId,
      moduleId: guildModule.moduleId,
      enabled: guildModule.enabled,
      enabledAt: guildModule.enabledAt?.toISOString() ?? null,
      disabledAt: guildModule.disabledAt?.toISOString() ?? null,
      config: guildModule.config as Record<string, any>,
      createdAt: guildModule.createdAt.toISOString(),
      updatedAt: guildModule.updatedAt.toISOString(),
      // Ajouter les infos du module si disponibles
      ...(moduleDef && {
        moduleName: moduleDef.name,
        moduleDescription: moduleDef.description,
        moduleIcon: moduleDef.icon,
        moduleCategory: moduleDef.category,
      }),
    };
  }
}
