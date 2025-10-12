import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { GuildBan } from 'discord.js';
import { BotEventDto, EventType, GuildBanRemoveEventData } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

/**
 * Listener pour l'événement GUILD_BAN_REMOVE
 * 
 * Déclenché lorsqu'un ban est levé.
 * Note: Pour savoir QUI a unbanned, utiliser GUILD_AUDIT_LOG_ENTRY_CREATE.
 * 
 * @event guildBanRemove
 */
@ApplyOptions<Listener.Options>({
  event: 'guildBanRemove'
})
export class GuildBanRemoveListener extends Listener {
  
  public override async run(ban: GuildBan): Promise<void> {
    if (!isListenerEnabled('GUILD_BAN_REMOVE')) {
      return;
    }

    const eventData = this.extractUnbanData(ban);

    const event: BotEventDto = {
      type: EventType.GUILD_BAN_REMOVE,
      guildId: ban.guild.id,
      userId: ban.user.id,
      data: eventData,
      timestamp: Date.now()
    };

    this.container.eventBatcher.addEvent(event);

    this.container.logger.info(
      `[GUILD_BAN_REMOVE] Guild: ${ban.guild.name} | User: ${ban.user.tag}`
    );
  }

  private extractUnbanData(ban: GuildBan): GuildBanRemoveEventData {
    return {
      userId: ban.user.id,
      username: ban.user.username,
      discriminator: ban.user.discriminator !== '0' 
        ? ban.user.discriminator 
        : undefined,
      globalName: ban.user.globalName || undefined,
      avatar: ban.user.avatar,
      bot: ban.user.bot,
      
      unbannedAt: new Date(),
      
      guildMemberCount: ban.guild.memberCount
    };
  }
}