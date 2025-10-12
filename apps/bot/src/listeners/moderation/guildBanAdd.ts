// Fichier: apps/bot/src/listeners/moderation/guildBanAdd.ts

import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { GuildBan } from 'discord.js';
import { BotEventDto, EventType, GuildBanAddEventData } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

/**
 * Listener pour l'événement GUILD_BAN_ADD
 * 
 * Déclenché lorsqu'un membre est banni du serveur.
 * Note: Pour savoir QUI a banni, utiliser GUILD_AUDIT_LOG_ENTRY_CREATE.
 * 
 * @event guildBanAdd
 */
@ApplyOptions<Listener.Options>({
  event: 'guildBanAdd'
})
export class GuildBanAddListener extends Listener {
  
  public override async run(ban: GuildBan): Promise<void> {
    if (!isListenerEnabled('GUILD_BAN_ADD')) {
      return;
    }

    const eventData = this.extractBanData(ban);

    const event: BotEventDto = {
      type: EventType.GUILD_BAN_ADD,
      guildId: ban.guild.id,
      userId: ban.user.id,
      data: eventData,
      timestamp: Date.now()
    };

    this.container.eventBatcher.addEvent(event);

    this.container.logger.info(
      `[GUILD_BAN_ADD] Guild: ${ban.guild.name} | User: ${ban.user.tag} | Reason: ${ban.reason || 'No reason'}`
    );
  }

  private extractBanData(ban: GuildBan): GuildBanAddEventData {
    return {
      userId: ban.user.id,
      username: ban.user.username,
      discriminator: ban.user.discriminator !== '0' 
        ? ban.user.discriminator 
        : undefined,
      globalName: ban.user.globalName || undefined,
      avatar: ban.user.avatar,
      bot: ban.user.bot,
      
      reason: ban.reason || undefined,
      
      bannedAt: new Date(),
      
      guildMemberCount: ban.guild.memberCount
    };
  }
}