import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Role } from 'discord.js';
import { BotEventDto, RoleDeleteEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

@ApplyOptions<Listener.Options>({
  event: Events.GuildRoleDelete
})
export class RoleDeleteListener extends Listener {
  public override async run(role: Role) {
    // 1. Vérification configuration
    if (!isListenerEnabled(EventType.ROLE_DELETE)) return;

    // 2. Vérification que c'est bien un rôle de guild
    if (!role.guild) return;

    try {
      // 3. Calcul du nombre de membres avec ce rôle (si disponible en cache)
      let memberCount: number | undefined;
      try {
        memberCount = role.members.size;
      } catch {
        // Si le cache n'est pas disponible, on laisse undefined
        memberCount = undefined;
      }

      // 4. Extraction des données
      const eventData: RoleDeleteEventData = {
        roleId: role.id,
        roleName: role.name,
        color: role.color,
        hoist: role.hoist,
        position: role.position,
        permissions: role.permissions.bitfield.toString(),
        mentionable: role.mentionable,
        managed: role.managed,
        memberCount,
        deletedAt: new Date()
      };

      // 5. Création du BotEventDto
      const event: BotEventDto = {
        type: EventType.ROLE_DELETE,
        guildId: role.guild.id,
        roleId: role.id,
        timestamp: Date.now(),
        data: eventData
      };

      // 6. Envoi via le batcher
      this.container.eventBatcher.addEvent(event);

      this.container.logger.debug(
        `[RoleDelete] Role deleted: ${role.name} (${role.id}) in guild ${role.guild.name}${memberCount !== undefined ? ` - ${memberCount} members affected` : ''}`
      );
    } catch (error) {
      this.container.logger.error('[RoleDelete] Error processing role delete:', error);
    }
  }
}