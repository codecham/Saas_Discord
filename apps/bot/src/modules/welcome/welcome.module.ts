import { BotModule } from '../module-loader/bot-module.interface';
import { container } from '@sapphire/framework';
import { GuildMember, TextChannel, EmbedBuilder, ChannelType } from 'discord.js';

/**
 * 👋 Welcome Bot Module
 * 
 * Envoie des messages de bienvenue personnalisés aux nouveaux membres
 */
export class WelcomeBotModule implements BotModule {
  id = 'welcome';
  private configs: Map<string, any> = new Map();

  async onEnable(guildId: string, config?: Record<string, any>): Promise<void> {
    container.logger.info(`[Welcome] Enabling for guild ${guildId}`);

    if (config) {
      this.configs.set(guildId, config);
    }
  }

  async onDisable(guildId: string): Promise<void> {
    container.logger.info(`[Welcome] Disabling for guild ${guildId}`);
    this.configs.delete(guildId);
  }

  async onConfigUpdate(guildId: string, config: Record<string, any>): Promise<void> {
    container.logger.info(`[Welcome] Config updated for guild ${guildId}`);
    this.configs.set(guildId, config);
  }

  /**
   * Récupère la config d'une guild
   */
  getConfig(guildId: string): any | null {
    return this.configs.get(guildId) || null;
  }

  /**
   * Envoie le message de bienvenue à un nouveau membre
   */
  async sendWelcomeMessage(member: GuildMember): Promise<void> {
    const config = this.getConfig(member.guild.id);
    
    // Pas de config ou désactivé
    if (!config || config.enabled === false) {
      return;
    }

    try {
      // Déterminer le channel
      const channel = await this.getWelcomeChannel(member, config.channelId);
      if (!channel) {
        container.logger.warn(`[Welcome] No valid channel found for guild ${member.guild.id}`);
        return;
      }

      // Remplacer les variables dans le message
      const content = this.replaceVariables(config.messageContent, member);

      // Envoyer selon le type
      if (config.messageType === 'embed') {
        await this.sendEmbedMessage(channel, content, config, member);
      } else {
        await channel.send(content);
      }

      container.logger.info(`[Welcome] Sent message for ${member.user.tag} in ${member.guild.name}`);
    } catch (error) {
      container.logger.error(`[Welcome] Failed to send message in guild ${member.guild.id}:`, error);
    }
  }

  /**
   * Détermine le channel où envoyer le message
   */
  private async getWelcomeChannel(
    member: GuildMember,
    channelId?: string | null,
  ): Promise<TextChannel | null> {
    // Si channel configuré
    if (channelId) {
      try {
        const channel = await member.guild.channels.fetch(channelId);
        if (channel?.type === ChannelType.GuildText) {
          return channel as TextChannel;
        }
      } catch (error) {
        container.logger.warn(`[Welcome] Configured channel ${channelId} not found`);
      }
    }

    // Fallback: System Channel Discord
    if (member.guild.systemChannel) {
      return member.guild.systemChannel;
    }

    // Fallback: Chercher un channel "general", "welcome", ou "bienvenue"
    const fallbackNames = ['general', 'welcome', 'bienvenue', 'général'];
    for (const name of fallbackNames) {
      const channel = member.guild.channels.cache.find(
        (ch) => ch.type === ChannelType.GuildText && ch.name.toLowerCase().includes(name),
      );
      if (channel) {
        return channel as TextChannel;
      }
    }

    return null;
  }

  /**
   * Remplace les variables dans le message
   */
  private replaceVariables(message: string, member: GuildMember): string {
    return message
      .replace(/{user}/g, member.toString())
      .replace(/{username}/g, member.user.username)
      .replace(/{server}/g, member.guild.name)
      .replace(/{memberCount}/g, member.guild.memberCount.toString());
  }

  /**
   * Envoie un message embed
   */
  private async sendEmbedMessage(
    channel: TextChannel,
    content: string,
    config: any,
    member: GuildMember,
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor((config.embedColor as `#${string}`) || '#5865F2')
      .setTimestamp();

    if (config.embedTitle) {
      embed.setTitle(this.replaceVariables(config.embedTitle, member));
    }

    if (config.embedDescription) {
      embed.setDescription(this.replaceVariables(config.embedDescription, member));
    } else {
      embed.setDescription(content);
    }

    if (config.embedThumbnail) {
      embed.setThumbnail(config.embedThumbnail);
    } else {
      // Par défaut, avatar du membre
      embed.setThumbnail(member.user.displayAvatarURL());
    }

    if (config.embedFooter) {
      embed.setFooter({ text: this.replaceVariables(config.embedFooter, member) });
    }

    await channel.send({ embeds: [embed] });
  }
}

// Export singleton
export const welcomeModule = new WelcomeBotModule();