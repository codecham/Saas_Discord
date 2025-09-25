import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { BotConnectionService } from '../services/bot-connection/bot-connection.service';
import type { BotEventDto } from '@my-project/shared-types';

@WebSocketGateway({
  cors: {
    origin: '*', // À restreindre en production
  },
})
export class BotGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BotGateway.name);
  private backendSocket: Socket | null = null;

  constructor(private botConnectionService: BotConnectionService) {}

  /**
   * Connexion d'un nouveau client
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async handleConnection(client: Socket) {
    this.logger.log(`Nouvelle connexion WebSocket: ${client.id}`);
  }

  /**
   * Déconnexion d'un client
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Déconnexion WebSocket: ${client.id}`);

    // Désenregistrer le bot s'il en est un
    const bots = this.botConnectionService.getAllBots();
    const disconnectedBot = bots.find((bot) => bot.socket.id === client.id);

    if (disconnectedBot) {
      this.botConnectionService.unregisterBot(disconnectedBot.id);
    }

    // Désenregistrer le backend s'il se déconnecte
    if (this.backendSocket?.id === client.id) {
      this.logger.warn('Backend déconnecté');
      this.backendSocket = null;
    }
  }

  /**
   * Enregistrement simplifié (bot ou backend)
   */
  @SubscribeMessage('register')
  handleRegister(
    @MessageBody()
    data: { type: string; botId?: string; botName?: string; name?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.type === 'bot') {
      const botId = data.botId || `bot-${client.id}`;
      const botName = data.botName || 'Bot Discord';

      this.logger.log(`Enregistrement du bot: ${botName} (${botId})`);
      this.botConnectionService.registerBot(botId, botName, client);

      client.emit('registered', { success: true, botId, botName });
    } else if (data.type === 'backend') {
      this.logger.log('Backend principal connecté');
      this.backendSocket = client;

      client.emit('registered', { success: true, type: 'backend' });
    }
  }

  /**
   * Messages du bot vers le backend
   */
  @SubscribeMessage('to-backend')
  handleBotToBackend(
    @MessageBody() data: BotEventDto,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.debug(`Événement bot vers backend:`, data.type);

    // Transmettre au backend s'il est connecté
    if (this.backendSocket?.connected) {
      this.backendSocket.emit('to-backend', data);
    } else {
      this.logger.warn('Backend non connecté, événement ignoré');
    }

    // Confirmer la réception au bot
    client.emit('backend-ack', {
      received: true,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Messages du backend vers un bot spécifique
   */
  @SubscribeMessage('to-bot')
  handleBackendToBot(
    @MessageBody() data: { botId: string; data: any },
    @ConnectedSocket() client: Socket,
  ) {
    if (client.id !== this.backendSocket?.id) {
      this.logger.warn(
        "Tentative d'envoi vers bot depuis un client non-backend",
      );
      return;
    }

    const sent = this.botConnectionService.sendToBot(
      data.botId,
      'from-backend',
      data.data,
    );
    if (!sent) {
      this.logger.warn(`Bot ${data.botId} non trouvé`);
    }
  }

  /**
   * Diffusion du backend vers tous les bots
   */
  @SubscribeMessage('broadcast-to-bots')
  handleBroadcastToBots(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    if (client.id !== this.backendSocket?.id) {
      this.logger.warn('Tentative de broadcast depuis un client non-backend');
      return;
    }

    this.botConnectionService.broadcastToAllBots('from-backend', data);
    this.logger.debug('Message diffusé à tous les bots');
  }

  /**
   * Récupérer les bots connectés
   */
  getConnectedBots() {
    return this.botConnectionService.getAllBots().map((bot) => ({
      id: bot.id,
      name: bot.name,
      connectedAt: bot.connectedAt,
    }));
  }

  /**
   * Vérifier si le backend est connecté
   */
  isBackendConnected() {
    return this.backendSocket?.connected || false;
  }
}
