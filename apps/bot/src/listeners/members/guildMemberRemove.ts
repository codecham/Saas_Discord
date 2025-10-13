import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { GuildMember, PartialGuildMember } from 'discord.js';
import { BotEventDto, EventType, MemberRemoveEventData } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

/**
 * Listener pour l'événement GUILD_MEMBER_REMOVE
 * 
 * Déclenché lorsqu'un membre quitte le serveur (leave, kick ou ban).
 * Note: Pour savoir si c'est un kick/ban, utiliser GUILD_AUDIT_LOG_ENTRY_CREATE.
 * 
 * @event guildMemberRemove
 */
@ApplyOptions<Listener.Options>({
  event: 'guildMemberRemove'
})
export class GuildMemberRemoveListener extends Listener {
  
  public override async run(member: GuildMember | PartialGuildMember): Promise<void> {
    if (!isListenerEnabled('GUILD_MEMBER_REMOVE')) {
      return;
    }

    const eventData = this.extractMemberData(member);

    const event: BotEventDto = {
      type: EventType.GUILD_MEMBER_REMOVE,
      guildId: member.guild.id,
      userId: member.user.id,
      data: eventData,
      timestamp: Date.now()
    };

    this.container.eventBatcher.addEvent(event);

    this.container.logger.debug(
      `[GUILD_MEMBER_REMOVE] Guild: ${member.guild.name} | User: ${member.user.tag} | Total: ${member.guild.memberCount}`
    );
  }

  private extractMemberData(member: GuildMember | PartialGuildMember): MemberRemoveEventData {
    const leftAt = new Date();
    
    let membershipDurationInDays: number | undefined;
    if (member.joinedAt) {
      membershipDurationInDays = Math.floor(
        (leftAt.getTime() - member.joinedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    const roles = member.roles?.cache 
      ? Array.from(member.roles.cache.keys())
      : undefined;

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
      
      joinedAt: member.joinedAt || undefined,
      roles,
      nickname: member.nickname || undefined,
      
      membershipDurationInDays,
      
      guildMemberCount: member.guild.memberCount,
      leftAt
    };
  }
}