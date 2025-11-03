import { container } from '@sapphire/framework';
import { moduleLoader } from '../modules/module-loader/module-loader.service';
import { Socket } from 'socket.io-client';

/**
 * 🔄 Module Events Handler
 * 
 * Gère les événements de modules reçus via la Gateway
 */
export class ModuleEventsHandler {
  /**
   * Configure les listeners sur le socket Gateway
   */
  static setupListeners(socket: Socket): void {
    // Écouter les changements de modules
    socket.on('module:change', async (data: any) => {
      container.logger.info(`[ModuleEvents] Received: ${data.action} for ${data.moduleId} in guild ${data.guildId}`);

      try {
        switch (data.action) {
          case 'enabled':
            await moduleLoader.enableModule(data.guildId, data.moduleId, data.config);
            break;

          case 'disabled':
            await moduleLoader.disableModule(data.guildId, data.moduleId);
            break;

          case 'config_updated':
            await moduleLoader.updateModuleConfig(data.guildId, data.moduleId, data.config);
            break;

          default:
            container.logger.warn(`[ModuleEvents] Unknown action: ${data.action}`);
        }
      } catch (error) {
        container.logger.error(`[ModuleEvents] Error handling event:`, error);
      }
    });

    container.logger.info('[ModuleEvents] ✅ Listeners configured');
  }
}