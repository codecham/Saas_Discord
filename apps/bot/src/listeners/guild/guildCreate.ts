// apps/bot/src/listeners/guild/guildCreate.ts

import { BotEventDto, EventType } from '@my-project/shared-types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Guild } from 'discord.js';

/**
 * Listener pour l'événement GUILD_CREATE
 * 
 * Déclenché lorsque:
 * - Le bot rejoint un nouveau serveur
 * - Le bot démarre et charge tous les serveurs existants
 * 
 * Version simplifiée - Envoie uniquement les données de base de la guild
 * On ne stocke pas les channels/roles/members, on les fetch à la demande
 * 
 * @event guildCreate
 */
@ApplyOptions<Listener.Options>({
  event: 'guildCreate'
})
export class GuildCreateListener extends Listener {
  
  public override async run(guild: Guild): Promise<void> {
    this.container.logger.info(`🎉 Bot added to guild: ${guild.name} (${guild.id})`);

    if (!guild) {
      this.container.logger.error('[GuildCreate] Guild is null/undefined');
      return;
    }

    try {
      // Données de base uniquement
      const guildData = {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        ownerId: guild.ownerId,
        memberCount: guild.memberCount,
        description: guild.description,
        preferredLocale: guild.preferredLocale,
      };

      // Créer l'event DTO
      const eventDto: BotEventDto = {
        type: EventType.GUILD_CREATE,
        guildId: guild.id,
        data: guildData,
        timestamp: Date.now(),
      };

      // Envoyer au backend
      this.container.ws.sendToBackend([eventDto]);

      this.container.logger.info(
        `✅ Guild setup data sent for: ${guild.name} (${guild.memberCount} members)`
      );

      // Optionnel: Envoyer un message de bienvenue dans le premier channel accessible
      await this.sendWelcomeMessage(guild);

    } catch (error) {
      this.container.logger.error(
        `[GuildCreate] Error processing guild ${guild.id}:`,
        error
      );
    }
  }

  /**
   * Envoyer un message de bienvenue (optionnel)
   */
  private async sendWelcomeMessage(guild: Guild): Promise<void> {
    try {
      // Trouver le premier channel où on peut envoyer des messages
      const channel = guild.channels.cache.find(
        (ch: any) =>
          ch.isTextBased() &&
          ch.permissionsFor(guild.members.me!)?.has('SendMessages')
      );

      if (!channel || !channel.isTextBased()) {
        this.container.logger.debug(
          `[GuildCreate] No accessible text channel found in guild ${guild.id}`
        );
        return;
      }

      await channel.send({
        embeds: [
          {
            title: '👋 Merci d\'avoir ajouté le bot !',
            description:
              'Bienvenue ! Le bot est maintenant configuré et prêt à l\'emploi.\n\n' +
              'Pour commencer, rendez-vous sur le **dashboard** pour activer les modules souhaités.',
            color: 0x5865f2, // Discord blurple
            footer: {
              text: 'Discord Admin Bot',
            },
            timestamp: new Date().toISOString(),
          },
        ],
      });

      this.container.logger.info(
        `Welcome message sent in guild ${guild.id}`
      );
    } catch (error) {
      // Ne pas throw, c'est pas critique si le message ne s'envoie pas
      this.container.logger.error(
        `[GuildCreate] Failed to send welcome message in guild ${guild.id}:`,
        error
      );
    }
  }
}