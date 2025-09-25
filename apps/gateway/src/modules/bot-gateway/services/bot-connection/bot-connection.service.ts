import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

export interface ConnectedBot {
  id: string;
  name: string;
  socket: Socket;
  connectedAt: Date;
  lastHeartbeat: Date;
}

@Injectable()
export class BotConnectionService {
  private readonly logger = new Logger(BotConnectionService.name);
  private connectedBots = new Map<string, ConnectedBot>();

  /**
   * Enregistre un nouveau bot connecté
   */
  registerBot(botId: string, botName: string, socket: Socket): void {
    const bot: ConnectedBot = {
      id: botId,
      name: botName,
      socket,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    };

    this.connectedBots.set(botId, bot);
    this.logger.log(`✅ Bot connecté: ${botName} (${botId})`);
  }

  /**
   * Déconnecte un bot
   */
  unregisterBot(botId: string): void {
    const bot = this.connectedBots.get(botId);
    if (bot) {
      this.connectedBots.delete(botId);
      this.logger.log(`❌ Bot déconnecté: ${bot.name} (${botId})`);
    }
  }

  /**
   * Met à jour le heartbeat d'un bot
   */
  updateHeartbeat(botId: string): void {
    const bot = this.connectedBots.get(botId);
    if (bot) {
      bot.lastHeartbeat = new Date();
    }
  }

  /**
   * Récupère un bot connecté par son ID
   */
  getBot(botId: string): ConnectedBot | undefined {
    return this.connectedBots.get(botId);
  }

  /**
   * Récupère tous les bots connectés
   */
  getAllBots(): ConnectedBot[] {
    return Array.from(this.connectedBots.values());
  }

  /**
   * Envoie un message à un bot spécifique
   */
  sendToBot(botId: string, event: string, data: any): boolean {
    const bot = this.connectedBots.get(botId);
    if (bot) {
      bot.socket.emit(event, data);
      this.logger.debug(`📤 Message envoyé à ${bot.name}: ${event}`);
      return true;
    }

    this.logger.warn(`⚠️ Bot non trouvé: ${botId}`);
    return false;
  }

  /**
   * Diffuse un message à tous les bots connectés
   */
  broadcastToAllBots(event: string, data: any): void {
    const botCount = this.connectedBots.size;
    this.connectedBots.forEach((bot) => {
      bot.socket.emit(event, data);
    });

    this.logger.debug(`📡 Message diffusé à ${botCount} bots: ${event}`);
  }

  /**
   * Vérifie les bots inactifs (heartbeat > 30s)
   */
  checkInactiveBots(): void {
    const now = new Date();
    const timeout = 30 * 1000; // 30 secondes

    this.connectedBots.forEach((bot, botId) => {
      const timeSinceHeartbeat = now.getTime() - bot.lastHeartbeat.getTime();
      if (timeSinceHeartbeat > timeout) {
        this.logger.warn(
          `💔 Bot inactif détecté: ${bot.name} (${timeSinceHeartbeat}ms)`,
        );
        bot.socket.disconnect();
        this.unregisterBot(botId);
      }
    });
  }
}
