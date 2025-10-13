import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { ChannelType, GuildChannel } from 'discord.js';
import { BotEventDto, ChannelUpdateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

@ApplyOptions<Listener.Options>({
  event: Events.ChannelUpdate
})
export class ChannelUpdateListener extends Listener {
  public override async run(oldChannel: GuildChannel, newChannel: GuildChannel) {
    // 1. Vérification configuration
    if (!isListenerEnabled(EventType.CHANNEL_UPDATE)) return;

    // 2. Vérification que c'est bien un channel de guild
    if (!newChannel.guild) return;

    try {
      // 3. Détection des changements
      const changes: ChannelUpdateEventData['changes'] = {};

      // Changement de nom
      if (oldChannel.name !== newChannel.name) {
        changes.name = {
          old: oldChannel.name,
          new: newChannel.name
        };
      }

      // Changement de position
      if (oldChannel.position !== newChannel.position) {
        changes.position = {
          old: oldChannel.position,
          new: newChannel.position
        };
      }

      // Changement de parent (catégorie)
      if (oldChannel.parentId !== newChannel.parentId) {
        changes.parent = {
          oldId: oldChannel.parentId ?? undefined,
          oldName: oldChannel.parent?.name ?? undefined,
          newId: newChannel.parentId ?? undefined,
          newName: newChannel.parent?.name ?? undefined
        };
      }

      // Changements spécifiques aux text channels
      if (newChannel.isTextBased() && oldChannel.isTextBased()) {
        if ('topic' in oldChannel && 'topic' in newChannel && oldChannel.topic !== newChannel.topic) {
          changes.topic = {
            old: oldChannel.topic ?? undefined,
            new: newChannel.topic ?? undefined
          };
        }

        if ('nsfw' in oldChannel && 'nsfw' in newChannel && oldChannel.nsfw !== newChannel.nsfw) {
          changes.nsfw = {
            old: oldChannel.nsfw,
            new: newChannel.nsfw
          };
        }

        if ('rateLimitPerUser' in oldChannel && 'rateLimitPerUser' in newChannel && 
            oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
          changes.rateLimitPerUser = {
            old: oldChannel.rateLimitPerUser ?? 0,
            new: newChannel.rateLimitPerUser ?? 0
          };
        }
      }

      // Changements spécifiques aux voice channels
      if ((oldChannel.type === ChannelType.GuildVoice || oldChannel.type === ChannelType.GuildStageVoice) &&
          (newChannel.type === ChannelType.GuildVoice || newChannel.type === ChannelType.GuildStageVoice)) {
        
        if ('bitrate' in oldChannel && 'bitrate' in newChannel && oldChannel.bitrate !== newChannel.bitrate) {
          changes.bitrate = {
            old: oldChannel.bitrate as number,
            new: newChannel.bitrate as number
          };
        }

        if ('userLimit' in oldChannel && 'userLimit' in newChannel && oldChannel.userLimit !== newChannel.userLimit) {
          changes.userLimit = {
            old: oldChannel.userLimit as number,
            new: newChannel.userLimit as number
          };
        }
      }

      // Changements de permissions
      const oldOverwrites = oldChannel.permissionOverwrites.cache;
      const newOverwrites = newChannel.permissionOverwrites.cache;

      const added: Array<{
        id: string;
        type: number;
        allow: string;
        deny: string;
      }> = [];
      
      const removed: Array<{
        id: string;
        type: number;
      }> = [];
      
      const updated: Array<{
        id: string;
        type: number;
        oldAllow: string;
        newAllow: string;
        oldDeny: string;
        newDeny: string;
      }> = [];

      // Permissions ajoutées
      newOverwrites.forEach(newOverwrite => {
        if (!oldOverwrites.has(newOverwrite.id)) {
          added.push({
            id: newOverwrite.id,
            type: newOverwrite.type,
            allow: newOverwrite.allow.bitfield.toString(),
            deny: newOverwrite.deny.bitfield.toString()
          });
        }
      });

      // Permissions retirées
      oldOverwrites.forEach(oldOverwrite => {
        if (!newOverwrites.has(oldOverwrite.id)) {
          removed.push({
            id: oldOverwrite.id,
            type: oldOverwrite.type
          });
        }
      });

      // Permissions modifiées
      newOverwrites.forEach(newOverwrite => {
        const oldOverwrite = oldOverwrites.get(newOverwrite.id);
        if (oldOverwrite && 
            (oldOverwrite.allow.bitfield !== newOverwrite.allow.bitfield || 
             oldOverwrite.deny.bitfield !== newOverwrite.deny.bitfield)) {
          updated.push({
            id: newOverwrite.id,
            type: newOverwrite.type,
            oldAllow: oldOverwrite.allow.bitfield.toString(),
            newAllow: newOverwrite.allow.bitfield.toString(),
            oldDeny: oldOverwrite.deny.bitfield.toString(),
            newDeny: newOverwrite.deny.bitfield.toString()
          });
        }
      });

      if (added.length > 0 || removed.length > 0 || updated.length > 0) {
        changes.permissionOverwrites = { added, removed, updated };
      }

      // Si aucun changement détecté, on n'envoie pas l'événement
      if (Object.keys(changes).length === 0) return;

      // 4. Extraction des données
      const eventData: ChannelUpdateEventData = {
        channelId: newChannel.id,
        channelName: newChannel.name,
        channelType: newChannel.type,
        changes,
        updatedAt: new Date()
      };

      // 5. Création du BotEventDto
      const event: BotEventDto = {
        type: EventType.CHANNEL_UPDATE,
        guildId: newChannel.guild.id,
        channelId: newChannel.id,
        timestamp: Date.now(),
        data: eventData
      };

      // 6. Envoi via le batcher
      this.container.eventBatcher.addEvent(event);

      this.container.logger.debug(
        `[ChannelUpdate] Channel updated: ${newChannel.name} (${newChannel.id}) - Changes: ${Object.keys(changes).join(', ')}`
      );
    } catch (error) {
      this.container.logger.error('[ChannelUpdate] Error processing channel update:', error);
    }
  }
}