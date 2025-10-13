import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Role } from 'discord.js';
import { BotEventDto, RoleCreateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

@ApplyOptions<Listener.Options>({
  event: Events.GuildRoleCreate
})
export class RoleCreateListener extends Listener {
  public override async run(role: Role) {
    // 1. Vérification configuration
    if (!isListenerEnabled(EventType.ROLE_CREATE)) return;

    // 2. Vérification que c'est bien un rôle de guild
    if (!role.guild) return;

    try {
      // 3. Extraction des données
      const eventData: RoleCreateEventData = {
        roleId: role.id,
        roleName: role.name,
        color: role.color,
        hoist: role.hoist,
        position: role.position,
        permissions: role.permissions.bitfield.toString(),
        mentionable: role.mentionable,
        managed: role.managed,
        icon: role.icon,
        unicodeEmoji: role.unicodeEmoji,
        createdAt: role.createdAt
      };

      // 4. Création du BotEventDto
      const event: BotEventDto = {
        type: EventType.ROLE_CREATE,
        guildId: role.guild.id,
        roleId: role.id,
        timestamp: Date.now(),
        data: eventData
      };

      // 5. Envoi via le batcher
      this.container.eventBatcher.addEvent(event);

      this.container.logger.debug(
        `[RoleCreate] Role created: ${role.name} (${role.id}) in guild ${role.guild.name}`
      );
    } catch (error) {
      this.container.logger.error('[RoleCreate] Error processing role create:', error);
    }
  }
}
