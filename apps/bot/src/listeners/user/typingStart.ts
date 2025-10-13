import { Listener } from '@sapphire/framework';
import { Events, Typing } from 'discord.js';
import { BotEventDto, TypingStartEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class TypingStartListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.TypingStart,
    });
  }

  public async run(typing: Typing): Promise<void> {
    if (!isListenerEnabled(EventType.TYPING_START)) return;
    if (!typing.guild) return;

    try {
      const eventData: TypingStartEventData = {
        userId: typing.user.id,
        username: typing.user.username ?? 'Unknown',
        userBot: typing.user.bot,
        
        channelId: typing.channel.id,
        channelName: ('name' in typing.channel ? typing.channel.name : 'DM') ?? 'Unknown',
        channelType: typing.channel.type,
        
        startedAt: typing.startedAt,
      };

      const event: BotEventDto = {
        type: EventType.TYPING_START,
        guildId: typing.guild.id,
        userId: typing.user.id,
        channelId: typing.channel.id,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[TypingStartListener] Error processing typing start:', error);
    }
  }
}