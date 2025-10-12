import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { GuildMember } from 'discord.js';
import { BotEventDto, EventType, MemberAddEventData } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

/**
 * Listener pour l'événement GUILD_MEMBER_ADD
 * 
 * Déclenché lorsqu'un nouveau membre rejoint le serveur.
 * Capture toutes les informations du membre pour tracking et stats.
 * 
 * @event guildMemberAdd
 */
@ApplyOptions<Listener.Options>({
  event: 'guildMemberAdd'
})
export class GuildMemberAddListener extends Listener {
  
  public override async run(member: GuildMember): Promise<void> {
    if (!isListenerEnabled('GUILD_MEMBER_ADD')) {
      return;
    }

    const eventData = this.extractMemberData(member);

    const event: BotEventDto = {
      type: EventType.GUILD_MEMBER_ADD,
      guildId: member.guild.id,
      userId: member.user.id,
      data: eventData,
      timestamp: Date.now()
    };

    this.container.eventBatcher.addEvent(event);

    this.container.logger.debug(
      `[GUILD_MEMBER_ADD] Guild: ${member.guild.name} | User: ${member.user.tag} | Total: ${member.guild.memberCount}`
    );
  }

  private extractMemberData(member: GuildMember): MemberAddEventData {
    const accountCreatedAt = member.user.createdAt;
    const now = new Date();
    const accountAgeInDays = Math.floor(
      (now.getTime() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      userId: member.user.id,
      username: member.user.username,
      discriminator: member.user.discriminator !== '0' 
        ? member.user.discriminator 
        : undefined,
      globalName: member.user.globalName || undefined,
      avatar: member.user.avatar,
      avatarURL: member.user.displayAvatarURL(),
      bot: member.user.bot,
      
      joinedAt: member.joinedAt || now,
      accountCreatedAt,
      
      accountAgeInDays,
      
      guildMemberCount: member.guild.memberCount
    };
  }
}