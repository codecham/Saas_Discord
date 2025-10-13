import { Listener } from '@sapphire/framework';
import { Events, Interaction } from 'discord.js';
import { BotEventDto, InteractionCreateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class InteractionCreateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.InteractionCreate,
    });
  }

  public async run(interaction: Interaction): Promise<void> {
    if (!isListenerEnabled(EventType.INTERACTION_CREATE)) return;
    if (!interaction.guild) return;

    try {
      const eventData: InteractionCreateEventData = {
        interactionId: interaction.id,
        interactionType: interaction.type,
        
        userId: interaction.user.id,
        username: interaction.user.username,
        userBot: interaction.user.bot,
        
        channelId: interaction.channelId ?? undefined,
        channelName: interaction.channel && 'name' in interaction.channel 
          ? interaction.channel.name ?? undefined 
          : undefined,
        channelType: interaction.channel?.type,
        
        commandName: interaction.isChatInputCommand() || interaction.isContextMenuCommand()
          ? interaction.commandName
          : undefined,
        commandType: interaction.isChatInputCommand() || interaction.isContextMenuCommand()
          ? interaction.commandType
          : undefined,
        
        customId: interaction.isButton() || 
                  interaction.isAnySelectMenu() || 
                  interaction.isModalSubmit()
          ? interaction.customId
          : undefined,
        componentType: interaction.isMessageComponent()
          ? interaction.componentType
          : undefined,
        
        values: interaction.isAnySelectMenu()
          ? interaction.values
          : undefined,
        
        deferred: 'deferred' in interaction ? interaction.deferred : false,
		replied: 'replied' in interaction ? interaction.replied : false,
		ephemeral: 'ephemeral' in interaction ? interaction.ephemeral ?? undefined : undefined,
        
        locale: interaction.locale,
        guildLocale: interaction.guildLocale ?? undefined,
        
        createdAt: interaction.createdAt,
      };

      const event: BotEventDto = {
        type: EventType.INTERACTION_CREATE,
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        channelId: interaction.channelId ?? undefined,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[InteractionCreateListener] Error processing interaction create:', error);
    }
  }
}