import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import type { BotEventDto } from '@my-project/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { BotEventHandlerService } from './bot-event-handler.service';
import { EventsService } from '../../events/core/events.service';

@Injectable()
export class GatewayClientService implements OnModuleInit {
  private readonly logger = new Logger(GatewayClientService.name);
  private socket: Socket | null = null;
  private readonly gatewayUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly botEventHandlerService: BotEventHandlerService,
    private readonly eventsService: EventsService,
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

  // private async handleBotEvent(events: BotEventDto[]) {
  //   // Normaliser en array

  //   this.logger.log(`Event recieved[${events.length}]:`);
  //   for (const event of events) {
  //     await this.botEventHandlerService.processEvent(event);
  //   }
  // }

  private async handleBotEvent(events: BotEventDto[]) {
    this.logger.log(`📥 Events reçus [${events.length}]`);

    // 🆕 ÉTAPE 1 : Persister TOUS les events dans TimescaleDB
    try {
      const count = await this.eventsService.processBatch(events);
      this.logger.log(`✅ ${count} events persistés dans TimescaleDB`);
    } catch (error) {
      this.logger.error(
        `❌ Erreur persistance events: ${error.message}`,
        error.stack,
      );
      // On continue même en cas d'erreur pour ne pas bloquer le traitement
    }

    // ⚠️ ÉTAPE 2 : TEMPORAIRE - Traiter les events Guild avec l'ancien système
    // TODO: À supprimer quand les processors seront implémentés
    for (const event of events) {
      // Traiter uniquement les events Guild (GUILD_SYNC, GUILD_CREATE, GUILD_UPDATE, GUILD_DELETE)
      if (event.type.startsWith('GUILD_')) {
        try {
          await this.botEventHandlerService.processEvent(event);
        } catch (error) {
          this.logger.error(
            `❌ Erreur traitement event ${event.type}: ${error.message}`,
          );
        }
      }
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
