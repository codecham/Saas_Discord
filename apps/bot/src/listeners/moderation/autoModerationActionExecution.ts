import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { AutoModerationActionExecution } from 'discord.js';
import { BotEventDto, EventType, AutoModerationActionExecutionEventData } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

/**
 * Listener pour l'événement AUTO_MODERATION_ACTION_EXECUTION
 * 
 * Déclenché lorsqu'une règle d'auto-modération s'exécute.
 * Capture les infractions aux règles d'auto-mod (mots interdits, spam, etc.).
 * 
 * @event autoModerationActionExecution
 */
@ApplyOptions<Listener.Options>({
  event: 'autoModerationActionExecution'
})
export class AutoModerationActionExecutionListener extends Listener {
  
  public override async run(execution: AutoModerationActionExecution): Promise<void> {
    if (!isListenerEnabled('AUTO_MODERATION_ACTION_EXECUTION')) {
      return;
    }

    const eventData = this.extractExecutionData(execution);

    const event: BotEventDto = {
      type: EventType.AUTO_MODERATION_ACTION_EXECUTION,
      guildId: execution.guild.id,
      userId: execution.userId,
      channelId: execution.channelId || undefined,
      data: eventData,
      timestamp: Date.now()
    };

    this.container.eventBatcher.addEvent(event);

    this.container.logger.info(
      `[AUTO_MOD_EXECUTION] Guild: ${execution.guild.name} | User: ${execution.user?.tag || execution.userId} | Rule: ${execution.ruleTriggerType} | Keyword: ${execution.matchedKeyword || 'N/A'}`
    );
  }

  private extractExecutionData(execution: AutoModerationActionExecution): AutoModerationActionExecutionEventData {
    return {
      ruleId: execution.ruleId,
      ruleName: execution.autoModerationRule?.name || undefined,
      ruleTriggerType: execution.ruleTriggerType,
      
      ruleActionType: execution.action.type,
      
      userId: execution.userId,
      username: execution.user?.username || 'Unknown User',
      
      channelId: execution.channelId || undefined,
      messageId: execution.messageId || undefined,
      alertSystemMessageId: execution.alertSystemMessageId || undefined,
      
      content: execution.content,
      matchedKeyword: execution.matchedKeyword || undefined,
      matchedContent: execution.matchedContent || undefined,
      
      executedAt: new Date()
    };
  }
}