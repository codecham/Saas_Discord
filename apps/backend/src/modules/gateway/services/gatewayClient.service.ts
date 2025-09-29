// apps/backend/src/modules/gateway/services/gateway-client.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import {
  EventType,
  GuildDTO,
  type BotEventDto,
} from '@my-project/shared-types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GatewayClientService implements OnModuleInit {
  private readonly logger = new Logger(GatewayClientService.name);
  private socket: Socket | null = null;
  private readonly gatewayUrl: string;

  constructor(private readonly prisma: PrismaService) {
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

    for (const event of events) {
      this.logger.log(`Événement reçu: ${event.type}`);

      // TODO: Sauvegarder en base de données
      await this.processEvent(event);
    }
  }

  private async processEvent(event: BotEventDto) {
    // Traitement selon le type d'événement
    switch (event.type) {
      case EventType.GuildSync:
        await this.handleGuildsSync(event.data);
        this.logger.log(`Guild sync event recu: ${JSON.stringify(event)}`);
        break;
      case EventType.GuildCreate:
        await this.handleGuildCreate(event.data);
        this.logger.log(`Guild Create event recu: ${JSON.stringify(event)}`);
        break;
      case EventType.GuildDelete:
        await this.handleGuildDelete(event.data);
        this.logger.log(`Guild Detele event recu: ${JSON.stringify(event)}`);
        break;
      case EventType.GuildUpdate:
        await this.handleGuildUpdate(event.data);
        this.logger.log(`Guild Update event recu: ${JSON.stringify(event)}`);
        break;
      default:
        this.logger.log(`Evenement inconnu reçu: ${JSON.stringify(event)}`);
        break;
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

  /**
   * Methodes de gestion des guilds dans la db
   */
  private async handleGuildsSync(guildsData: GuildDTO[]) {
    try {
      console.log(`Synchronisation de ${guildsData.length} guilds`);

      // Marquer toutes les guilds comme inactives
      await this.prisma.guild.updateMany({
        data: { isActive: false },
      });

      // Upsert chaque guild
      for (const guildData of guildsData) {
        await this.prisma.guild.upsert({
          where: { guildId: guildData.id }, // Correction: utiliser guildData.id
          create: {
            guildId: guildData.id,
            name: guildData.name || 'Nom inconnu', // Gérer les champs optionnels
            icon: guildData.icon,
            ownerDiscordId: guildData.ownerId || 'unknown',
            botAddedAt: guildData.joined_at || new Date(), // Utiliser joined_at ou date actuelle
            isActive: true,
          },
          update: {
            name: guildData.name || 'Nom inconnu',
            icon: guildData.icon,
            ownerDiscordId: guildData.ownerId || 'unknown',
            isActive: true,
            updatedAt: new Date(),
          },
        });
      }

      console.log(
        `Synchronisation terminée: ${guildsData.length} guilds traitées`,
      );
    } catch (error) {
      console.error('Erreur lors de la synchronisation des guilds:', error);
      throw error;
    }
  }

  private async handleGuildCreate(guildData: GuildDTO) {
    try {
      await this.prisma.guild.upsert({
        where: { guildId: guildData.id },
        create: {
          guildId: guildData.id,
          name: guildData.name || 'Nom inconnu',
          icon: guildData.icon,
          ownerDiscordId: guildData.ownerId || 'unknown',
          botAddedAt: guildData.joined_at || new Date(),
          isActive: true,
        },
        update: {
          isActive: true,
          name: guildData.name || 'Nom inconnu',
          icon: guildData.icon,
          ownerDiscordId: guildData.ownerId || 'unknown',
          updatedAt: new Date(),
        },
      });

      console.log(`Guild créée/réactivée: ${guildData.name} (${guildData.id})`);
    } catch (error) {
      console.error(`Erreur handleGuildCreate pour ${guildData.id}:`, error);
    }
  }

  private async handleGuildDelete(guildData: GuildDTO) {
    const guildId: string = guildData.id;
    // Correction du type
    try {
      await this.prisma.guild.update({
        where: { guildId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      console.log(`Guild marquée inactive: ${guildId}`);
    } catch (error) {
      console.error(`Erreur handleGuildDelete pour ${guildId}:`, error);
      // Ne pas throw car la guild n'existe peut-être pas en DB
    }
  }

  private async handleGuildUpdate(guildData: GuildDTO) {
    try {
      await this.prisma.guild.update({
        where: { guildId: guildData.id },
        data: {
          name: guildData.name || 'Nom inconnu',
          icon: guildData.icon,
          ownerDiscordId: guildData.ownerId || 'unknown',
          updatedAt: new Date(),
        },
      });

      console.log(`Guild mise à jour: ${guildData.name} (${guildData.id})`);
    } catch (error) {
      console.error(`Erreur handleGuildUpdate pour ${guildData.id}:`, error);
    }
  }
}
