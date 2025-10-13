import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import type { BotEventDto } from '@my-project/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { BotEventHandlerService } from './bot-event-handler.service';

@Injectable()
export class GatewayClientService implements OnModuleInit {
  private readonly logger = new Logger(GatewayClientService.name);
  private socket: Socket | null = null;
  private readonly gatewayUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly botEventHandlerService: BotEventHandlerService,
  ) {
    this.gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3001';
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async onModuleInit() {
    this.connectToGateway();
  }

  private connectToGateway() {
    this.logger.log(`Connexion à la Gateway: ${this.gatewayUrl}`);

    this.socket = io(this.gatewayUrl, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.logger.log('Backend connecté à la Gateway');

      // S'enregistrer comme backend
      this.socket?.emit('register', {
        type: 'backend',
        name: 'Backend Principal',
      });
    });

    this.socket.on('disconnect', () => {
      this.logger.warn('Backend déconnecté de la Gateway');
    });

    // Écouter les événements des bots
    this.socket.on('to-backend', async (events: BotEventDto[]) => {
      await this.handleBotEvent(events);
    });

    this.socket.on('connect_error', (error) => {
      this.logger.error(`Erreur connexion Gateway: ${error.message}`);
    });
  }

  private async handleBotEvent(events: BotEventDto[]) {
    // Normaliser en array

    this.logger.log(`Event recieved[${events.length}]:`);
    for (const event of events) {
      await this.botEventHandlerService.processEvent(event);
    }
  }

  /**
   * Envoyer un message à un bot spécifique
   */
  sendToBot(botId: string, data: any) {
    if (!this.socket?.connected) {
      this.logger.warn('Gateway non connectée');
      return false;
    }

    this.socket.emit('to-bot', { botId, data });
    return true;
  }

  /**
   * Diffuser un message à tous les bots
   */
  broadcastToBots(data: any) {
    if (!this.socket?.connected) {
      this.logger.warn('Gateway non connectée');
      return false;
    }

    this.socket.emit('broadcast-to-bots', data);
    return true;
  }
}
