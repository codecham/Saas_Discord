import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Invite } from 'discord.js';
import { BotEventDto, InviteDeleteEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

@ApplyOptions<Listener.Options>({
  event: Events.InviteDelete
})
export class InviteDeleteListener extends Listener {
  public override async run(invite: Invite) {
    // 1. Vérification configuration
    if (!isListenerEnabled(EventType.INVITE_DELETE)) return;

    // 2. Vérification que c'est bien une invitation de guild
    if (!invite.guild) return;

    try {
      // 3. Détermination de la raison de la suppression (si possible)
      let reason: 'expired' | 'max_uses' | 'manual' | 'unknown' = 'unknown';
      
      if (invite.maxAge !== null && invite.maxAge > 0 && invite.createdAt) {
        const expirationTime = invite.createdAt.getTime() + invite.maxAge * 1000;
        const now = Date.now();
        // Si l'invitation a expiré (avec marge de 1 minute)
        if (now >= expirationTime - 60000) {
          reason = 'expired';
        }
      }
      
      if (invite.uses !== null && invite.maxUses !== null && invite.uses >= invite.maxUses && invite.maxUses > 0) {
        reason = 'max_uses';
      }
      
      // Si ni expiré ni max uses atteint, c'est probablement manuel
      if (reason === 'unknown' && invite.uses !== null && invite.maxUses !== null) {
        if (invite.maxUses === 0 || invite.uses < invite.maxUses) {
          if (invite.maxAge === null || invite.maxAge === 0 || !invite.createdAt || Date.now() < invite.createdAt.getTime() + invite.maxAge * 1000) {
            reason = 'manual';
          }
        }
      }

      // 4. Extraction des données
      const eventData: InviteDeleteEventData = {
        code: invite.code,
        channelId: invite.channel?.id ?? '',
        channelName: invite.channel?.name ?? 'Unknown',
        inviterId: invite.inviter?.id,
        inviterUsername: invite.inviter?.username,
        uses: invite.uses ?? undefined,
        maxUses: invite.maxUses ?? undefined,
        createdAt: invite.createdAt ?? undefined,
        deletedAt: new Date(),
        reason
      };

      // 5. Création du BotEventDto
      const event: BotEventDto = {
        type: EventType.INVITE_DELETE,
        guildId: invite.guild.id,
        userId: invite.inviter?.id,
        channelId: invite.channel?.id,
        timestamp: Date.now(),
        data: eventData
      };

      // 6. Envoi via le batcher
      this.container.eventBatcher.addEvent(event);

      this.container.logger.debug(
        `[InviteDelete] Invite deleted: ${invite.code} (reason: ${reason}) - Uses: ${invite.uses ?? 'unknown'}/${invite.maxUses ?? 'unlimited'}`
      );
    } catch (error) {
      this.container.logger.error('[InviteDelete] Error processing invite delete:', error);
    }
  }
}