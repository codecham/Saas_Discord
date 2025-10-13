import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { GuildMember, PartialGuildMember } from 'discord.js';
import { BotEventDto, EventType, MemberUpdateEventData } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

/**
 * Listener pour l'événement GUILD_MEMBER_UPDATE
 * 
 * Déclenché lorsqu'un membre est modifié (nickname, rôles, timeout, etc.).
 * Détecte tous les changements et les rapporte de manière structurée.
 * 
 * @event guildMemberUpdate
 */
@ApplyOptions<Listener.Options>({
  event: 'guildMemberUpdate'
})
export class GuildMemberUpdateListener extends Listener {
  
  public override async run(
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember
  ): Promise<void> {
    if (!isListenerEnabled('GUILD_MEMBER_UPDATE')) {
      return;
    }

    const eventData = this.extractMemberUpdateData(oldMember, newMember);

    // Ne pas envoyer si aucun changement détecté
    if (Object.keys(eventData.changes).length === 0) {
      return;
    }

    const event: BotEventDto = {
      type: EventType.GUILD_MEMBER_UPDATE,
      guildId: newMember.guild.id,
      userId: newMember.user.id,
      data: eventData,
      timestamp: Date.now()
    };

    this.container.eventBatcher.addEvent(event);

    this.container.logger.debug(
      `[GUILD_MEMBER_UPDATE] Guild: ${newMember.guild.name} | User: ${newMember.user.tag} | Changes: ${Object.keys(eventData.changes).join(', ')}`
    );
  }

  private extractMemberUpdateData(
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember
  ): MemberUpdateEventData {
    const changes: MemberUpdateEventData['changes'] = {};

    // Changement de nickname
    if (oldMember.nickname !== newMember.nickname) {
      changes.nickname = {
        old: oldMember.nickname || undefined,
        new: newMember.nickname || undefined
      };
    }

    // Changement de rôles
    const oldRoles = oldMember.roles?.cache 
      ? Array.from(oldMember.roles.cache.keys())
      : [];
    const newRoles = Array.from(newMember.roles.cache.keys());

    const addedRoleIds = newRoles.filter(id => !oldRoles.includes(id));
    const removedRoleIds = oldRoles.filter(id => !newRoles.includes(id));

    if (addedRoleIds.length > 0 || removedRoleIds.length > 0) {
      changes.roles = {
        added: addedRoleIds.map(id => {
          const role = newMember.guild.roles?.cache?.get(id);
          return {
            id,
            name: role?.name || 'Unknown Role'
          };
        }),
        removed: removedRoleIds.map(id => {
          const role = newMember.guild.roles?.cache?.get(id);
          return {
            id,
            name: role?.name || 'Unknown Role'
          };
        })
      };
    }

    // Changement d'avatar de serveur
    if (oldMember.avatar !== newMember.avatar) {
      changes.avatar = {
        old: oldMember.avatar || undefined,
        new: newMember.avatar || undefined
      };
    }

    // Changement de timeout (communication disabled)
    const oldTimeout = oldMember.communicationDisabledUntil;
    const newTimeout = newMember.communicationDisabledUntil;
    if (oldTimeout?.getTime() !== newTimeout?.getTime()) {
      changes.communicationDisabledUntil = {
        old: oldTimeout || undefined,
        new: newTimeout || undefined
      };
    }

    // Changement de pending (membre en attente)
    if (oldMember.pending !== newMember.pending) {
      changes.pending = {
        old: oldMember.pending || false,
        new: newMember.pending || false
      };
    }

    return {
      userId: newMember.user.id,
      username: newMember.user.username,
      bot: newMember.user.bot,
      
      changes,
      
      currentNickname: newMember.nickname || undefined,
      currentRoles: newRoles,
      isCommunicationDisabled: typeof newMember.isCommunicationDisabled === 'function' 
        ? newMember.isCommunicationDisabled() 
        : false,
      communicationDisabledUntil: newMember.communicationDisabledUntil || undefined
    };
  }
}