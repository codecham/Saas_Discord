import { container } from '@sapphire/framework';
import fetch from 'node-fetch';

/**
 * 🔄 Config Sync Service
 * 
 * Charge et synchronise les configurations des modules depuis le backend
 */
export class ConfigSyncService {
  private readonly backendUrl: string;
  private configs: Map<string, Map<string, any>> = new Map(); // moduleId → Map<guildId, config>

  constructor(backendUrl?: string) {
    this.backendUrl = backendUrl || process.env.BACKEND_URL || 'http://localhost:3000';
  }

  /**
   * Charge les configs de toutes les guilds pour un module
   */
  async loadModuleConfigs(moduleId: string): Promise<void> {
    try {
      container.logger.info(`[ConfigSync] Loading configs for module: ${moduleId}`);

      // TODO: Endpoint backend qui retourne toutes les guilds avec le module activé
      const response = await fetch(`${this.backendUrl}/modules/enabled/${moduleId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          container.logger.warn(`[ConfigSync] Endpoint not found for module ${moduleId}. Module will start with empty configs.`);
          this.configs.set(moduleId, new Map());
          return;
        }
        throw new Error(`Failed to fetch module configs: ${response.statusText}`);
      }

      const guilds = await response.json() as Array<{ guildId: string; config: any }>;

      // Stocker les configs
      const moduleConfigs = new Map<string, any>();
      for (const { guildId, config } of guilds) {
        moduleConfigs.set(guildId, config);
      }

      this.configs.set(moduleId, moduleConfigs);
      container.logger.info(`[ConfigSync] Loaded ${guilds.length} configs for ${moduleId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      container.logger.error(`[ConfigSync] Failed to load configs for ${moduleId}: ${errorMessage}`);
      // Initialiser avec une Map vide pour que le module puisse démarrer
      this.configs.set(moduleId, new Map());
    }
  }

  /**
   * Charge la config d'une guild spécifique pour un module
   */
  async loadGuildConfig(moduleId: string, guildId: string): Promise<any | null> {
    try {
      container.logger.debug(`[ConfigSync] Loading config for ${moduleId} in guild ${guildId}`);

      const response = await fetch(`${this.backendUrl}/${moduleId}/${guildId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Config n'existe pas
        }
        throw new Error(`Failed to fetch config: ${response.statusText}`);
      }

      const config = await response.json();

      // Stocker dans le cache
      if (!this.configs.has(moduleId)) {
        this.configs.set(moduleId, new Map());
      }
      this.configs.get(moduleId)!.set(guildId, config);

      return config;
    } catch (error) {
      container.logger.error(`[ConfigSync] Failed to load config for ${moduleId}/${guildId}:`, error);
      return null;
    }
  }

  /**
   * Récupère une config depuis le cache
   */
  getConfig(moduleId: string, guildId: string): any | null {
    const moduleConfigs = this.configs.get(moduleId);
    if (!moduleConfigs) return null;
    return moduleConfigs.get(guildId) || null;
  }

  /**
   * Met à jour une config dans le cache
   */
  updateConfig(moduleId: string, guildId: string, config: any): void {
    if (!this.configs.has(moduleId)) {
      this.configs.set(moduleId, new Map());
    }
    this.configs.get(moduleId)!.set(guildId, config);
    container.logger.debug(`[ConfigSync] Updated cache for ${moduleId}/${guildId}`);
  }

  /**
   * Supprime une config du cache
   */
  deleteConfig(moduleId: string, guildId: string): void {
    const moduleConfigs = this.configs.get(moduleId);
    if (moduleConfigs) {
      moduleConfigs.delete(guildId);
      container.logger.debug(`[ConfigSync] Deleted cache for ${moduleId}/${guildId}`);
    }
  }

  /**
   * Vérifie si une config existe
   */
  hasConfig(moduleId: string, guildId: string): boolean {
    const moduleConfigs = this.configs.get(moduleId);
    return moduleConfigs ? moduleConfigs.has(guildId) : false;
  }

  /**
   * Récupère toutes les guilds avec config pour un module
   */
  getGuildsForModule(moduleId: string): string[] {
    const moduleConfigs = this.configs.get(moduleId);
    return moduleConfigs ? Array.from(moduleConfigs.keys()) : [];
  }

  /**
   * Vide le cache
   */
  clearCache(moduleId?: string): void {
    if (moduleId) {
      this.configs.delete(moduleId);
      container.logger.info(`[ConfigSync] Cleared cache for ${moduleId}`);
    } else {
      this.configs.clear();
      container.logger.info(`[ConfigSync] Cleared all cache`);
    }
  }
}

// Export singleton
export const configSync = new ConfigSyncService();