import { Injectable, Logger } from '@nestjs/common';
import {
  ModuleDefinition,
  SubscriptionPlan,
  ModuleLimits,
} from '@my-project/shared-types';

/**
 * 🧠 Module Registry - Cerveau du système de modules
 *
 * Responsabilités :
 * - Enregistrer tous les modules disponibles
 * - Vérifier disponibilité selon le plan
 * - Checker les limites d'utilisation
 * - Fournir la liste des modules
 */
@Injectable()
export class ModuleRegistry {
  private readonly logger = new Logger(ModuleRegistry.name);
  private readonly modules: Map<string, ModuleDefinition> = new Map();

  /**
   * Enregistre un nouveau module dans le registry
   */
  register(module: ModuleDefinition): void {
    if (this.modules.has(module.id)) {
      this.logger.warn(
        `Module "${module.id}" already registered. Overwriting.`,
      );
    }

    this.modules.set(module.id, module);
    this.logger.log(`✅ Module registered: ${module.id} (${module.name})`);
  }

  /**
   * Récupère la définition d'un module
   */
  getModule(moduleId: string): ModuleDefinition | undefined {
    return this.modules.get(moduleId);
  }

  /**
   * Récupère tous les modules
   */
  getAllModules(): ModuleDefinition[] {
    return Array.from(this.modules.values());
  }

  /**
   * Récupère les modules disponibles pour un plan
   */
  getAvailableModules(plan: SubscriptionPlan): ModuleDefinition[] {
    return this.getAllModules().filter((module) => {
      return module.availability[plan] === true;
    });
  }

  /**
   * Vérifie si un module est disponible pour un plan
   */
  isModuleAvailable(moduleId: string, plan: SubscriptionPlan): boolean {
    const module = this.getModule(moduleId);
    if (!module) return false;

    return module.availability[plan] === true;
  }

  /**
   * Récupère les limites d'un module pour un plan
   */
  getModuleLimits(
    moduleId: string,
    plan: SubscriptionPlan,
  ): ModuleLimits | undefined {
    const module = this.getModule(moduleId);
    if (!module?.limits) return undefined;

    const limits = module.limits[plan];
    return limits ?? undefined;
  }

  /**
   * Vérifie si une ressource dépasse la limite
   *
   * @returns true si dans la limite, false si dépassé
   */
  checkLimit(
    moduleId: string,
    plan: SubscriptionPlan,
    resource: string,
    currentCount: number,
  ): boolean {
    const limits = this.getModuleLimits(moduleId, plan);
    if (!limits) return true; // Pas de limites = autorisé

    const limit = limits[resource];
    if (limit === undefined) return true; // Ressource non limitée
    if (limit === -1) return true; // Illimité

    return currentCount < limit;
  }

  /**
   * Récupère la valeur d'une limite
   *
   * @returns La limite (-1 si illimité, undefined si pas de limite)
   */
  getLimitValue(
    moduleId: string,
    plan: SubscriptionPlan,
    resource: string,
  ): number | undefined {
    const limits = this.getModuleLimits(moduleId, plan);
    if (!limits) return undefined;

    const limitValue = limits[resource];
    return typeof limitValue === 'number' ? limitValue : undefined;
  }

  /**
   * Vérifie les dépendances d'un module
   *
   * @returns Array des modules dépendants manquants
   */
  checkDependencies(moduleId: string, enabledModules: string[]): string[] {
    const module = this.getModule(moduleId);
    if (!module?.dependencies || module.dependencies.length === 0) {
      return [];
    }

    return module.dependencies.filter(
      (depId) => !enabledModules.includes(depId),
    );
  }
}
