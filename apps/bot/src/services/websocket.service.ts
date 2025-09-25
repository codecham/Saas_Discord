// src/services/gateway-client.service.ts
import { io, Socket } from 'socket.io-client';
import { container } from '@sapphire/framework';
import type { BotEventDto } from '@my-project/shared-types';
import { BOT_CONFIG } from '../config/bot.config';
import { EventStorageService } from './eventStorage.service';

export class WebSocketService {
  private socket: Socket;
  private isConnected = false;
  private readonly botId: string;
  private readonly botName: string;
  private eventStorage: EventStorageService;

  constructor(gatewayUrl: string = process.env.GATEWAY_URL || 'http://localhost:3001') {
    this.botId = BOT_CONFIG.bot.id;
    this.botName = BOT_CONFIG.bot.name;
    this.eventStorage = new EventStorageService();
    
    this.socket = io(gatewayUrl);
    this.setupConnection();
  }

  private setupConnection() {
    this.socket.on('connect', () => {
      container.logger.info('Bot connecté à la gateway');
      this.isConnected = true;
      
      this.socket.emit('register', { 
        type: 'bot',
        botId: this.botId,
        botName: this.botName
      });
      this.processPendingEvents();
    });

    this.socket.on('disconnect', () => {
      container.logger.warn('Bot déconnecté de la gateway');
      this.isConnected = false;
    });

    this.socket.on('from-backend', (data) => {
      container.logger.info('Message reçu du backend:', data);
      this.handleBackendMessage(data);
    });

    this.socket.on('connect_error', (error) => {
      container.logger.error('Erreur de connexion à la gateway:', error.message);
    });
  }

  private async processPendingEvents() {
    const totalEvents = this.eventStorage.countPendingEvents();
    
    if (totalEvents === 0) return;

    container.logger.info(`Traitement de ${totalEvents} événements en attente`);

    const batchSize = BOT_CONFIG.storage.batchSize;
    let processedCount = 0;

    // Traiter par batch
    while (processedCount < totalEvents) {
      const batch = this.eventStorage.getEventsBatch(batchSize, 0); // Toujours offset 0 car on supprime au fur et à mesure
      
      if (batch.length === 0) {
        container.logger.info(`Batch length = 0...`);
        break;
      }
      container.logger.info(`${JSON.stringify(batch)}`)

      container.logger.debug(`Envoi batch: ${batch.length} événements`);
      
      // Envoyer le batch
      this.sendToBackend(batch);
      
      // Supprimer les événements traités
      this.eventStorage.deleteProcessedEvents(batch.length);
      
      processedCount += batch.length;
      
      // Pause entre les batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    container.logger.info(`${processedCount} événements traités avec succès`);
    
    // Nettoyage préventif
    this.eventStorage.cleanupOldEvents();
  }


  private handleBackendMessage(data: any) {
    // Traiter les commandes du backend si nécessaire
    switch (data.type) {
      case 'command':
        container.logger.info(`Commande reçue: ${data.command}`);
        break;
      default:
        container.logger.debug('Message backend non traité:', data);
    }
  }


  /**
   * Envoie des données au backend
   */
  sendToBackend(events: BotEventDto[]) {
    if (!this.isConnected) {
      container.logger.warn("WebSocket non connecté, saving Events");
      this.eventStorage.saveEvents(events);
      return false;
    }

    this.socket.emit('to-backend', events);
    return true;
  }

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
