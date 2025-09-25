// src/services/gateway-client.service.ts
import { io, Socket } from 'socket.io-client';
import { container } from '@sapphire/framework';
import type { BotEventDto } from '@my-project/shared-types';

export class WebSocketService {
  private socket: Socket;
  private isConnected = false;
  private readonly botId: string;
  private readonly botName: string;

  constructor(gatewayUrl: string = 'http://localhost:3001') {
    this.botId = process.env.BOT_ID || 'main-discord-bot';
    this.botName = process.env.BOT_NAME || 'Discord Bot Principal';
    
    this.socket = io(gatewayUrl);
    this.setupConnection();
  }

  private setupConnection() {
    this.socket.on('connect', () => {
      container.logger.info('Bot connecté à la gateway');
      this.isConnected = true;
      
      // Enregistrer le bot
      this.socket.emit('register', { 
        type: 'bot',
        botId: this.botId,
        botName: this.botName
      });
    });

    this.socket.on('disconnect', () => {
      container.logger.warn('Bot déconnecté de la gateway');
      this.isConnected = false;
    });

    this.socket.on('from-backend', (data) => {
      container.logger.info('Message reçu du backend:', data);
      // Logique pour traiter les messages du backend
      this.handleBackendMessage(data);
    });

    this.socket.on('connect_error', (error) => {
      container.logger.error('Erreur de connexion à la gateway:', error.message);
    });
  }

  private handleBackendMessage(data: any) {
    // Traiter les commandes du backend si nécessaire
    switch (data.type) {
      case 'command':
        container.logger.info(`Commande reçue: ${data.command}`);
        break;
      // case 'ping':
      //   this.sendToBackend({
      //     type: 'pong',
      //     data: { message: 'Bot actif' }
      //   });
      //   break;
      default:
        container.logger.debug('Message backend non traité:', data);
    }
  }

  /**
   * Envoie des données au backend
   */
  sendToBackend(event: BotEventDto | BotEventDto[]) {
    if (!this.isConnected) {
      container.logger.warn("WebSocket non connecté, impossible d'envoyer");
      return false;
    }

    // Ajouter timestamp si pas présent
    // if (!event.timestamp) {
    //   event.timestamp = new Date().toISOString();
    // }

    this.socket.emit('to-backend', event);
    return true;
  }

  /**
   * Envoie un événement Discord
   */
  // sendDiscordEvent(eventType: string, data: any) {
  //   return this.sendToBackend({
  //     botId: this.botId,
  //     eventType,
  //     data
  //   });
  // }

  /**
   * Vérifie si la connexion est active
   */
  isWebSocketConnected() {
    return this.isConnected;
  }

  /**
   * Déconnexion propre
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      container.logger.info('Déconnecté de la gateway');
    }
  }
}