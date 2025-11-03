/* eslint-disable @typescript-eslint/require-await */
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
        this.logger.log(`Guild sync event received`);
        break;
      case EventType.GUILD_CREATE:
        await this.handleGuildCreate(event.data);
        this.logger.log(`Guild Create event received for: ${event.data.name}`);
        break;
      case EventType.GUILD_DELETE:
        await this.handleGuildDelete(event.data);
        this.logger.log(`Guild Delete event received`);
        break;
      case EventType.GUILD_UPDATE:
        await this.handleGuildUpdate(event.data);
        this.logger.log(`Guild Update event received`);
        break;
      default:
        this.logger.log(`Unknown event type received: ${event.type}`);
        break;
    }
  }

  // =========================================================
  // ===============  Handle Guilds in DB  ===================
  // =========================================================

  /**
   * Synchronise l'ensemble des guilds Discord avec la base de données
   * DÉSACTIVÉ pour l'instant
   */
  private async handleGuildsSync(guildsData: GuildDTO[]): Promise<void> {
    this.logger.log(`GUILD_SYNC DISABLED ${JSON.stringify(guildsData)}`);
    return;
  }

  /**
   * Gère la création d'une nouvelle guild
   * Version simplifiée - Appelle juste le GuildSetupService
   */
  private async handleGuildCreate(guildData: any): Promise<void> {
    try {
      this.logger.log(
        `🆕 New guild detected: ${guildData.name} (${guildData.id})`,
      );

      // Appel simplifié avec seulement les données de base
      const result = await this.guildSetupService.initializeGuild(
        guildData.id,
        {
          name: guildData.name,
          icon: guildData.icon,
          ownerId: guildData.ownerId,
          memberCount: guildData.memberCount,
        },
      );

      if (result.success) {
        this.logger.log(
          `✅ Guild initialized successfully: ${guildData.name} (Status: ${result.status.status})`,
        );
      } else {
        this.logger.error(`❌ Failed to initialize guild: ${guildData.name}`);
      }
    } catch (error) {
      this.logger.error(
        `Error handling GUILD_CREATE for ${guildData.id}:`,
        error,
      );
      // Ne pas throw pour ne pas bloquer le traitement des autres events
    }
  }

  /**
   * Gère la suppression d'une guild (bot kicked/banned)
   */
  private async handleGuildDelete(guildData: any): Promise<void> {
    try {
      this.logger.log(`Guild left: ${guildData.id}`);

      await this.prisma.guild.update({
        where: { guildId: guildData.id },
        data: {
          isActive: false,
          botRemovedAt: new Date(),
        },
      });

      this.logger.log(`✅ Guild ${guildData.id} marked as inactive`);
    } catch (error) {
      this.logger.error(
        `Error handling GUILD_DELETE for ${guildData.id}:`,
        error,
      );
    }
  }

  /**
   * Gère la mise à jour d'une guild
   */
  private async handleGuildUpdate(guildData: any): Promise<void> {
    try {
      await this.prisma.guild.update({
        where: { guildId: guildData.id },
        data: {
          name: guildData.name,
          icon: guildData.icon,
          ownerDiscordId: guildData.ownerId,
        },
      });

      this.logger.log(`✅ Guild ${guildData.id} updated`);
    } catch (error) {
      this.logger.error(
        `Error handling GUILD_UPDATE for ${guildData.id}:`,
        error,
      );
    }
  }
}
