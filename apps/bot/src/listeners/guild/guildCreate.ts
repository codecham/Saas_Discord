// apps/bot/src/listeners/guild/guildCreate.ts

import { BotEventDto, EventType } from '@my-project/shared-types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Guild, ChannelType } from 'discord.js';

/**
 * Listener pour l'événement GUILD_CREATE
 * 
 * Déclenché lorsque:
 * - Le bot rejoint un nouveau serveur
 * - Le bot démarre et charge tous les serveurs existants
 * 
 * Ce listener est critique pour l'initialisation du setup.
 * Il envoie toutes les données nécessaires au backend pour:
 * - Créer la guild en DB
 * - Créer les settings par défaut
 * - Vérifier les permissions
 * - Créer un snapshot initial
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
      // Enrichir les données de la guild
      const enrichedGuildData = await this.enrichGuildData(guild);

      // Créer l'event DTO
      const eventDto: BotEventDto = {
        type: EventType.GUILD_CREATE,
        guildId: guild.id,
        data: enrichedGuildData,
        timestamp: Date.now(),
      };

      // Envoyer au backend
      this.container.ws.sendToBackend([eventDto]);

      this.container.logger.info(
        `✅ Guild setup data sent for: ${guild.name} (${enrichedGuildData.channels?.length ?? 0} channels, ${enrichedGuildData.roles?.length ?? 0} roles)`
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
   * Enrichir les données de la guild avec channels, roles, etc.
   */
  private async enrichGuildData(guild: Guild): Promise<any> {
    // Données de base
    const baseData = {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      ownerId: guild.ownerId,
      memberCount: guild.memberCount,
      description: guild.description,
      preferredLocale: guild.preferredLocale,
      premiumTier: guild.premiumTier,
      premiumSubscriptionCount: guild.premiumSubscriptionCount,
      verificationLevel: guild.verificationLevel,
      features: guild.features,
    };

    // Fetch channels (avec gestion d'erreur)
    let channels: any[] = [];
    try {
      const channelsCollection = await guild.channels.fetch();
      channels = channelsCollection.map((channel) => {
        if (!channel) return null;

        return {
          id: channel.id,
          name: channel.name,
          type: channel.type,
          position: 'position' in channel ? channel.position : undefined,
          parentId: channel.parentId,
          // Vérifier si le bot peut voir ce channel
          viewable: 'viewable' in channel ? channel.viewable : true,
          // Permissions (si text channel)
          permissions: channel.type === ChannelType.GuildText
            ? this.getChannelPermissions(guild, channel)
            : undefined,
        };
      }).filter(Boolean);

      this.container.logger.debug(`Fetched ${channels.length} channels for guild ${guild.id}`);
    } catch (error) {
      this.container.logger.warn(`Failed to fetch channels for guild ${guild.id}:`, error);
      channels = [];
    }

    // Fetch roles (avec gestion d'erreur)
    let roles: any[] = [];
    try {
      const rolesCollection = await guild.roles.fetch();
      roles = rolesCollection.map((role) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        permissions: role.permissions.bitfield.toString(),
        managed: role.managed,
        mentionable: role.mentionable,
        hoist: role.hoist,
      }));

      this.container.logger.debug(`Fetched ${roles.length} roles for guild ${guild.id}`);
    } catch (error) {
      this.container.logger.warn(`Failed to fetch roles for guild ${guild.id}:`, error);
      roles = [];
    }

    // Permissions du bot dans la guild
    const botMember = guild.members.me;
    const botPermissions = botMember
      ? {
          hasAdministrator: botMember.permissions.has('Administrator'),
          hasManageGuild: botMember.permissions.has('ManageGuild'),
          hasManageChannels: botMember.permissions.has('ManageChannels'),
          hasManageRoles: botMember.permissions.has('ManageRoles'),
          hasManageMessages: botMember.permissions.has('ManageMessages'),
          hasViewAuditLog: botMember.permissions.has('ViewAuditLog'),
          hasSendMessages: botMember.permissions.has('SendMessages'),
          hasEmbedLinks: botMember.permissions.has('EmbedLinks'),
          permissions: botMember.permissions.bitfield.toString(),
        }
      : undefined;

    return {
      ...baseData,
      channels,
      roles,
      botPermissions,
    };
  }

  /**
   * Vérifier les permissions du bot dans un channel
   */
  private getChannelPermissions(guild: Guild, channel: any): any {
    const botMember = guild.members.me;
    if (!botMember || !('permissionsFor' in channel)) {
      return undefined;
    }

    try {
      const permissions = channel.permissionsFor(botMember);
      return {
        canView: permissions?.has('ViewChannel') ?? false,
        canSend: permissions?.has('SendMessages') ?? false,
        canRead: permissions?.has('ReadMessageHistory') ?? false,
        canManage: permissions?.has('ManageMessages') ?? false,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Envoyer un message de bienvenue dans le premier channel accessible
   */
  private async sendWelcomeMessage(guild: Guild): Promise<void> {
    try {
      // Trouver le premier text channel où le bot peut envoyer des messages
      const channel = guild.channels.cache.find(
        (c) =>
          c.type === ChannelType.GuildText &&
          c.permissionsFor(guild.members.me!)?.has('SendMessages')
      );

      if (!channel || !channel.isTextBased()) {
        this.container.logger.debug(`No accessible text channel found in guild ${guild.id}`);
        return;
      }

      const embed = {
        title: '👋 Merci d\'avoir ajouté le bot !',
        description:
          'Je suis en train de configurer le serveur...\n\n' +
          '**Étapes en cours:**\n' +
          '✅ Analyse de la structure du serveur\n' +
          '✅ Configuration des paramètres par défaut\n' +
          '⏳ Vérification des permissions\n\n' +
          '**Prochaines étapes:**\n' +
          '• Rendez-vous sur le dashboard pour terminer la configuration\n' +
          '• Configurez les modules que vous souhaitez activer\n' +
          '• Personnalisez les paramètres selon vos besoins',
        color: 0x5865f2, // Discord Blurple
        footer: {
          text: 'Configuration en cours... Cela peut prendre quelques secondes.',
        },
        timestamp: new Date().toISOString(),
      };

      await channel.send({ embeds: [embed] });

      this.container.logger.info(`Welcome message sent in guild ${guild.id}`);
    } catch (error) {
      this.container.logger.warn(`Failed to send welcome message in guild ${guild.id}:`, error);
      // Non-bloquant, on continue
    }
  }
}