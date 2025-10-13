import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BotEventDto, EventType, GuildDTO } from '@my-project/shared-types';

@Injectable()
export class BotEventHandlerService {
  private readonly logger = new Logger(BotEventHandlerService.name);

  constructor(private prisma: PrismaService) {}

  async processEvent(event: BotEventDto) {
    // Traitement selon le type d'événement
    switch (event.type) {
      case EventType.GUILD_SYNC:
        await this.handleGuildsSync(event.data);
        this.logger.log(
          `Guild sync event recu: ${JSON.stringify(event, null, 2)}`,
        );
        break;
      case EventType.GUILD_CREATE:
        await this.handleGuildCreate(event.data);
        this.logger.log(
          `Guild Create event recu: ${JSON.stringify(event, null, 2)}`,
        );
        break;
      case EventType.GUILD_DELETE:
        await this.handleGuildDelete(event.data);
        this.logger.log(
          `Guild Detele event recu: ${JSON.stringify(event, null, 2)}`,
        );
        break;
      case EventType.GUILD_UPDATE:
        await this.handleGuildUpdate(event.data);
        this.logger.log(
          `Guild Update event recu: ${JSON.stringify(event, null, 2)}`,
        );
        break;
      default:
        this.logger.log(
          `Evenement inconnu reçu: ${JSON.stringify(event, null, 2)}`,
        );
        break;
    }
  }

  // =========================================================
  // ===============  Handle Guilds in DB  ===================
  // =========================================================

  /**
   * Synchronise l'ensemble des guilds Discord avec la base de données
   * Marque d'abord toutes les guilds comme inactives, puis met à jour ou crée chaque guild
   * Les guilds non présentes dans guildsData resteront inactives
   *
   * @param guildsData - Tableau des guilds Discord à synchroniser
   * @throws Error si la synchronisation échoue
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

  /**
   * Traite l'événement guildCreate Discord
   * Crée la guild en base si elle n'existe pas, ou la réactive si elle était inactive
   *
   * @param guildData - Données de la guild Discord à créer/réactiver
   */

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

  /**
   * Traite l'événement guildDelete Discord
   * Marque la guild comme inactive en base de données
   * N'échoue pas si la guild n'existe pas en base
   *
   * @param guildData - Données de la guild Discord à désactiver
   */

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
