import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Invite } from 'discord.js';
import { BotEventDto, InviteCreateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

@ApplyOptions<Listener.Options>({
  event: Events.InviteCreate
})
export class InviteCreateListener extends Listener {
  public override async run(invite: Invite) {
    // 1. Vérification configuration
    if (!isListenerEnabled(EventType.INVITE_CREATE)) return;

    // 2. Vérification que c'est bien une invitation de guild
    if (!invite.guild) return;

    try {
      // 3. Calcul de la date d'expiration si maxAge est défini
      let expiresAt: Date | undefined;
      if (invite.maxAge && invite.maxAge > 0 && invite.createdAt) {
        expiresAt = new Date(invite.createdAt.getTime() + invite.maxAge * 1000);
      }

      // 4. Extraction des données
      const eventData: InviteCreateEventData = {
        code: invite.code,
        channelId: invite.channel?.id ?? '',
        channelName: invite.channel?.name ?? 'Unknown',
        inviterId: invite.inviter?.id,
        inviterUsername: invite.inviter?.username,
        inviterBot: invite.inviter?.bot,
        maxAge: invite.maxAge ?? 0,
        maxUses: invite.maxUses ?? 0,
        temporary: invite.temporary ?? false,
        createdAt: invite.createdAt ?? new Date(),
        expiresAt,
        targetType: invite.targetType ?? undefined,
        targetUserId: invite.targetUser?.id,
        targetUsername: invite.targetUser?.username,
        targetApplicationId: invite.targetApplication?.id
      };

      // 5. Création du BotEventDto
      const event: BotEventDto = {
        type: EventType.INVITE_CREATE,
        guildId: invite.guild.id,
        userId: invite.inviter?.id,
        channelId: invite.channel?.id,
        timestamp: Date.now(),
        data: eventData
      };

      // 6. Envoi via le batcher
      this.container.eventBatcher.addEvent(event);

      this.container.logger.debug(
        `[InviteCreate] Invite created: ${invite.code} by ${invite.inviter?.username ?? 'Unknown'} in channel ${invite.channel?.name ?? 'Unknown'}`
      );
    } catch (error) {
      this.container.logger.error('[InviteCreate] Error processing invite create:', error);
    }
  }
}