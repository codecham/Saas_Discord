import { Listener } from '@sapphire/framework';
import { Events, AutoModerationRule } from 'discord.js';
import { BotEventDto, AutoModerationRuleDeleteEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class AutoModerationRuleDeleteListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.AutoModerationRuleDelete,
    });
  }

  public async run(rule: AutoModerationRule): Promise<void> {
    if (!isListenerEnabled(EventType.AUTO_MODERATION_RULE_DELETE)) return;
    if (!rule.guild) return;

    try {
      const deletedAt = new Date();

      const eventData: AutoModerationRuleDeleteEventData = {
        ruleId: rule.id,
        ruleName: rule.name,
        
        creatorId: rule.creatorId,
        creatorUsername: rule.guild.members.cache.get(rule.creatorId)?.user.username ?? 'Unknown',
        
        eventType: rule.eventType,
        triggerType: rule.triggerType,
        
        enabled: rule.enabled,
        
        actionsCount: rule.actions.length,
        exemptRolesCount: rule.exemptRoles.size,
        exemptChannelsCount: rule.exemptChannels.size,
        
        deletedAt,
      };

      const event: BotEventDto = {
        type: EventType.AUTO_MODERATION_RULE_DELETE,
        guildId: rule.guild.id,
        userId: rule.creatorId,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[AutoModerationRuleDeleteListener] Error processing auto moderation rule delete:', error);
    }
  }
}