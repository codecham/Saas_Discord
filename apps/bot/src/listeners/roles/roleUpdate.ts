import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Role, PermissionsBitField } from 'discord.js';
import { BotEventDto, RoleUpdateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

@ApplyOptions<Listener.Options>({
  event: Events.GuildRoleUpdate
})
export class RoleUpdateListener extends Listener {
  public override async run(oldRole: Role, newRole: Role) {
    // 1. Vérification configuration
    if (!isListenerEnabled(EventType.ROLE_UPDATE)) return;

    // 2. Vérification que c'est bien un rôle de guild
    if (!newRole.guild) return;

    try {
      // 3. Détection des changements
      const changes: RoleUpdateEventData['changes'] = {};

      // Changement de nom
      if (oldRole.name !== newRole.name) {
        changes.name = {
          old: oldRole.name,
          new: newRole.name
        };
      }

      // Changement de couleur
      if (oldRole.color !== newRole.color) {
        changes.color = {
          old: oldRole.color,
          new: newRole.color
        };
      }

      // Changement de hoist
      if (oldRole.hoist !== newRole.hoist) {
        changes.hoist = {
          old: oldRole.hoist,
          new: newRole.hoist
        };
      }

      // Changement de position
      if (oldRole.position !== newRole.position) {
        changes.position = {
          old: oldRole.position,
          new: newRole.position
        };
      }

      // Changement de mentionable
      if (oldRole.mentionable !== newRole.mentionable) {
        changes.mentionable = {
          old: oldRole.mentionable,
          new: newRole.mentionable
        };
      }

      // Changement d'icon
      if (oldRole.icon !== newRole.icon) {
        changes.icon = {
          old: oldRole.icon,
          new: newRole.icon
        };
      }

      // Changement d'unicode emoji
      if (oldRole.unicodeEmoji !== newRole.unicodeEmoji) {
        changes.unicodeEmoji = {
          old: oldRole.unicodeEmoji,
          new: newRole.unicodeEmoji
        };
      }

      // Changement de permissions
      if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
        const oldPermissions = new PermissionsBitField(oldRole.permissions.bitfield);
        const newPermissions = new PermissionsBitField(newRole.permissions.bitfield);

        // Permissions ajoutées
        const addedPermissions: string[] = [];
        newPermissions.toArray().forEach(permission => {
          if (!oldPermissions.has(permission)) {
            addedPermissions.push(permission);
          }
        });

        // Permissions retirées
        const removedPermissions: string[] = [];
        oldPermissions.toArray().forEach(permission => {
          if (!newPermissions.has(permission)) {
            removedPermissions.push(permission);
          }
        });

        changes.permissions = {
          old: oldRole.permissions.bitfield.toString(),
          new: newRole.permissions.bitfield.toString(),
          addedPermissions,
          removedPermissions
        };
      }

      // Si aucun changement détecté, on n'envoie pas l'événement
      if (Object.keys(changes).length === 0) return;

      // 4. Extraction des données
      const eventData: RoleUpdateEventData = {
        roleId: newRole.id,
        roleName: newRole.name,
        changes,
        updatedAt: new Date()
      };

      // 5. Création du BotEventDto
      const event: BotEventDto = {
        type: EventType.ROLE_UPDATE,
        guildId: newRole.guild.id,
        roleId: newRole.id,
        timestamp: Date.now(),
        data: eventData
      };

      // 6. Envoi via le batcher
      this.container.eventBatcher.addEvent(event);

      this.container.logger.debug(
        `[RoleUpdate] Role updated: ${newRole.name} (${newRole.id}) - Changes: ${Object.keys(changes).join(', ')}`
      );
    } catch (error) {
      this.container.logger.error('[RoleUpdate] Error processing role update:', error);
    }
  }
}