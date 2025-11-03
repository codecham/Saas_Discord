import { container } from '@sapphire/framework';
import { BotModule } from './bot-module.interface';
import { configSync } from '../../services/config-sync.service';

/**
 * 🔌 Module Loader Service
 * 
 * Charge et gère les modules du bot avec support des configs par serveur
 */
export class ModuleLoaderService {
  private modules: Map<string, BotModule> = new Map();
  private enabledModules: Map<string, Set<string>> = new Map(); // guildId → Set<moduleId>

  /**
   * Enregistre un module
   */
  register(module: BotModule): void {
    if (this.modules.has(module.id)) {
      container.logger.warn(`[ModuleLoader] Module "${module.id}" already registered`);
      return;
    }

    this.modules.set(module.id, module);
    container.logger.info(`[ModuleLoader] ✅ Registered module: ${module.id}`);
  }

  /**
   * Active un module pour un serveur
   */
  async enableModule(
    guildId: string,
    moduleId: string,
    config?: Record<string, any>,
  ): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) {
      container.logger.error(`[ModuleLoader] Module "${moduleId}" not found`);
      return;
    }

    // Si pas de config fournie, essayer de charger depuis le backend
    if (!config) {
      config = await configSync.loadGuildConfig(moduleId, guildId);
    }

    try {
      await module.onEnable(guildId, config || undefined);

      // Marquer comme activé
      if (!this.enabledModules.has(guildId)) {
        this.enabledModules.set(guildId, new Set());
      }
      this.enabledModules.get(guildId)!.add(moduleId);

      // Stocker la config dans le cache
      if (config) {
        configSync.updateConfig(moduleId, guildId, config);
      }

      container.logger.info(`[ModuleLoader] ✅ Enabled ${moduleId} for guild ${guildId}`);
    } catch (error) {
      container.logger.error(`[ModuleLoader] Failed to enable ${moduleId} for guild ${guildId}:`, error);
    }
  }

  /**
   * Désactive un module pour un serveur
   */
  async disableModule(guildId: string, moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) {
      container.logger.error(`[ModuleLoader] Module "${moduleId}" not found`);
      return;
    }

    try {
      await module.onDisable(guildId);

      // Retirer de la liste des activés
      const guildModules = this.enabledModules.get(guildId);
      if (guildModules) {
        guildModules.delete(moduleId);
      }

      // Supprimer du cache
      configSync.deleteConfig(moduleId, guildId);

      container.logger.info(`[ModuleLoader] ❌ Disabled ${moduleId} for guild ${guildId}`);
    } catch (error) {
      container.logger.error(`[ModuleLoader] Failed to disable ${moduleId} for guild ${guildId}:`, error);
    }
  }

  /**
   * Met à jour la config d'un module
   */
  async updateModuleConfig(
    guildId: string,
    moduleId: string,
    config: Record<string, any>,
  ): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) {
      container.logger.error(`[ModuleLoader] Module "${moduleId}" not found`);
      return;
    }

    try {
      await module.onConfigUpdate(guildId, config);

      // Mettre à jour le cache
      configSync.updateConfig(moduleId, guildId, config);

      container.logger.info(`[ModuleLoader] 🔄 Updated config for ${moduleId} in guild ${guildId}`);
    } catch (error) {
      container.logger.error(`[ModuleLoader] Failed to update config for ${moduleId}/${guildId}:`, error);
    }
  }

  /**
   * Vérifie si un module est activé pour une guild
   */
  isModuleEnabled(guildId: string, moduleId: string): boolean {
    const guildModules = this.enabledModules.get(guildId);
    return guildModules ? guildModules.has(moduleId) : false;
  }

  /**
   * Récupère tous les modules activés pour une guild
   */
  getEnabledModules(guildId: string): string[] {
    const guildModules = this.enabledModules.get(guildId);
    return guildModules ? Array.from(guildModules) : [];
  }

  /**
   * Charge tous les modules actifs au démarrage
   */
  async loadAllModules(): Promise<void> {
    container.logger.info(`[ModuleLoader] Loading all active modules...`);

    for (const [moduleId] of this.modules) {
      // Charger toutes les configs pour ce module depuis le backend
      await configSync.loadModuleConfigs(moduleId);
      
      // Activer le module pour chaque guild
      const guilds = configSync.getGuildsForModule(moduleId);
      for (const guildId of guilds) {
        const config = configSync.getConfig(moduleId, guildId);
        if (config && config.enabled !== false) {
          await this.enableModule(guildId, moduleId, config);
        }
      }
    }

    container.logger.info(`[ModuleLoader] ✅ All modules loaded`);
  }
}

// Export singleton
export const moduleLoader = new ModuleLoaderService();