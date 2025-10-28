// apps/backend/src/modules/gateway/services/bot-event-handler.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BotEventDto, EventType, GuildDTO } from '@my-project/shared-types';
import { GuildSetupService } from '../../guild-setup/services/guild-setup.service';

@Injectable()
export class BotEventHandlerService {
  private readonly logger = new Logger(BotEventHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly guildSetupService: GuildSetupService,
  ) {}

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
          `Guild Delete event recu: ${JSON.stringify(event, null, 2)}`,
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
   */
  private async handleGuildsSync(guildsData: GuildDTO[]): Promise<void> {
    this.logger.log(`GUILD_SYNC DISABLE`);
    return;
    try {
      // Marquer toutes les guilds comme inactives
      await this.prisma.guild.updateMany({
        data: { isActive: false },
      });

      // Mettre à jour ou créer chaque guild
      for (const guildData of guildsData) {
        await this.upsertGuild(guildData, true);
      }

      this.logger.log(
        `✅ Synchronisation terminée: ${guildsData.length} guilds`,
      );
    } catch (error) {
      this.logger.error('Erreur lors de la synchronisation des guilds:', error);
      throw error;
    }
  }

  /**
   * Gère la création d'une nouvelle guild
   * NOUVEAU: Appelle le GuildSetupService pour initialiser complètement la guild
   */
  private async handleGuildCreate(guildData: any): Promise<void> {
    try {
      this.logger.log(
        `🆕 Nouvelle guild détectée: ${guildData.name} (${guildData.id})`,
      );

      // Appeler le service de setup pour initialisation complète
      const result = await this.guildSetupService.initializeGuild(
        guildData.id,
        {
          name: guildData.name,
          icon: guildData.icon,
          ownerId: guildData.ownerId,
          memberCount: guildData.memberCount,
          channels: guildData.channels,
          roles: guildData.roles,
        },
      );

      if (result.success) {
        this.logger.log(
          `✅ Guild initialisée avec succès: ${guildData.name} (Status: ${result.status.status})`,
        );
      } else {
        this.logger.warn(
          `⚠️ Guild initialisée avec warnings: ${guildData.name}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de l'initialisation de la guild ${guildData.id}:`,
        error,
      );
      // Ne pas throw pour ne pas bloquer le traitement des autres events
    }
  }

  /**
   * Gère la suppression d'une guild (bot kicked/banned)
   */
  private async handleGuildDelete(guildData: GuildDTO): Promise<void> {
    this.logger.log(`GUILD_DELETE DISABLE`);
    return;
    try {
      await this.prisma.guild.update({
        where: { guildId: guildData.id },
        data: {
          isActive: false,
          botRemovedAt: new Date(),
        },
      });

      this.logger.log(`✅ Guild marquée comme inactive: ${guildData.id}`);
    } catch (error) {
      this.logger.error(
        `Erreur lors de la suppression de la guild ${guildData.id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Gère la mise à jour d'une guild
   */
  private async handleGuildUpdate(guildData: GuildDTO): Promise<void> {
    this.logger.log(`GUILD_DELETE DISABLE`);
    return;
    try {
      await this.upsertGuild(guildData, true);
      this.logger.log(`✅ Guild mise à jour: ${guildData.id}`);
    } catch (error) {
      this.logger.error(
        `Erreur lors de la mise à jour de la guild ${guildData.id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Upsert d'une guild dans la base de données
   */
  private async upsertGuild(
    guildData: GuildDTO,
    isActive: boolean,
  ): Promise<void> {
    await this.prisma.guild.upsert({
      where: { guildId: guildData.id },
      create: {
        guildId: guildData.id,
        name: guildData.name ?? 'Unknown Guild',
        icon: guildData.icon,
        ownerDiscordId: guildData.ownerId ?? 'unknown',
        isActive,
        botAddedAt: new Date(),
      },
      update: {
        name: guildData.name ?? 'Unknown Guild',
        icon: guildData.icon,
        ownerDiscordId: guildData.ownerId ?? 'unknown',
        isActive,
      },
    });
  }
}
