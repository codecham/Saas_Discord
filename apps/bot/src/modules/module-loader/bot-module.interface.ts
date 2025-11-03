// apps/bot/src/modules/module-loader/bot-module.interface.ts

/**
 * Interface que chaque module Bot doit implémenter
 */
export interface BotModule {
  /**
   * ID unique du module (doit correspondre au backend)
   */
  id: string;

  /**
   * Appelé quand le module est activé pour un serveur
   */
  onEnable(guildId: string, config?: Record<string, any>): Promise<void>;

  /**
   * Appelé quand le module est désactivé pour un serveur
   */
  onDisable(guildId: string): Promise<void>;

  /**
   * Appelé quand la config du module est mise à jour
   */
  onConfigUpdate(guildId: string, config: Record<string, any>): Promise<void>;
}