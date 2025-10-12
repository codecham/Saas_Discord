// Fichier: apps/bot/src/listeners/voice/voiceStateUpdate.ts

import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { VoiceState } from 'discord.js';
import { BotEventDto, EventType, VoiceStateUpdateEventData } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

@ApplyOptions<Listener.Options>({
  event: 'voiceStateUpdate'
})
export class VoiceStateUpdateListener extends Listener {
  
  public override async run(oldState: VoiceState, newState: VoiceState): Promise<void> {
    if (!isListenerEnabled('VOICE_STATE_UPDATE')) {
      return;
    }

    if (!newState.guild?.id) {
      return;
    }

    const eventData = this.extractVoiceStateData(oldState, newState);

    const event: BotEventDto = {
      type: EventType.VOICE_STATE_UPDATE,
      guildId: newState.guild.id,
      userId: newState.member?.user.id || 'unknown',
      channelId: newState.channelId || oldState.channelId || undefined,
      data: eventData,
      timestamp: Date.now()
    };

    this.container.eventBatcher.addEvent(event);

    this.container.logger.debug(
      `[VOICE_STATE_UPDATE] Guild: ${newState.guild.name} | User: ${newState.member?.user.tag} | Action: ${eventData.action}`
    );
  }

  private extractVoiceStateData(oldState: VoiceState, newState: VoiceState): VoiceStateUpdateEventData {
    const changes: VoiceStateUpdateEventData['changes'] = {};
    let action: VoiceStateUpdateEventData['action'] = 'move';

    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;
    const oldChannel = oldState.channel;
    const newChannel = newState.channel;

    // Déterminer l'action principale
    if (!oldChannelId && newChannelId) {
      action = 'join';
    } else if (oldChannelId && !newChannelId) {
      action = 'leave';
    } else if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
      action = 'move';
    } else {
      // Changements d'état dans le même channel
      if (oldState.serverMute !== newState.serverMute) {
        action = newState.serverMute ? 'mute' : 'unmute';
        changes.serverMute = { old: oldState.serverMute || false, new: newState.serverMute || false };
      } else if (oldState.serverDeaf !== newState.serverDeaf) {
        action = newState.serverDeaf ? 'deafen' : 'undeafen';
        changes.serverDeaf = { old: oldState.serverDeaf || false, new: newState.serverDeaf || false };
      } else if (oldState.selfMute !== newState.selfMute) {
        action = newState.selfMute ? 'self_mute' : 'self_unmute';
        changes.selfMute = { old: oldState.selfMute || false, new: newState.selfMute || false };
      } else if (oldState.selfDeaf !== newState.selfDeaf) {
        action = newState.selfDeaf ? 'self_deafen' : 'self_undeafen';
        changes.selfDeaf = { old: oldState.selfDeaf || false, new: newState.selfDeaf || false };
      } else if (oldState.streaming !== newState.streaming) {
        action = newState.streaming ? 'stream_start' : 'stream_stop';
        changes.streaming = { old: oldState.streaming || false, new: newState.streaming || false };
      } else if (oldState.selfVideo !== newState.selfVideo) {
        action = newState.selfVideo ? 'video_start' : 'video_stop';
        changes.selfVideo = { old: oldState.selfVideo || false, new: newState.selfVideo || false };
      }
    }

    // Ajouter tous les autres changements détectés
    if (oldState.serverMute !== newState.serverMute && !changes.serverMute) {
      changes.serverMute = { old: oldState.serverMute || false, new: newState.serverMute || false };
    }
    if (oldState.serverDeaf !== newState.serverDeaf && !changes.serverDeaf) {
      changes.serverDeaf = { old: oldState.serverDeaf || false, new: newState.serverDeaf || false };
    }
    if (oldState.selfMute !== newState.selfMute && !changes.selfMute) {
      changes.selfMute = { old: oldState.selfMute || false, new: newState.selfMute || false };
    }
    if (oldState.selfDeaf !== newState.selfDeaf && !changes.selfDeaf) {
      changes.selfDeaf = { old: oldState.selfDeaf || false, new: newState.selfDeaf || false };
    }
    if (oldState.selfVideo !== newState.selfVideo && !changes.selfVideo) {
      changes.selfVideo = { old: oldState.selfVideo || false, new: newState.selfVideo || false };
    }
    if (oldState.streaming !== newState.streaming && !changes.streaming) {
      changes.streaming = { old: oldState.streaming || false, new: newState.streaming || false };
    }

    return {
      userId: newState.member?.user.id || 'unknown',
      username: newState.member?.user.username || 'Unknown',
      
      oldChannelId: oldChannelId || undefined,
      oldChannelName: oldChannel?.name || undefined,
      newChannelId: newChannelId || undefined,
      newChannelName: newChannel?.name || undefined,
      
      action,
      changes,
      
      currentState: {
        channelId: newChannelId || undefined,
        channelName: newChannel?.name || undefined,
        serverMute: newState.serverMute || false,
        serverDeaf: newState.serverDeaf || false,
        selfMute: newState.selfMute || false,
        selfDeaf: newState.selfDeaf || false,
        selfVideo: newState.selfVideo || false,
        streaming: newState.streaming || false
      }
    };
  }
}