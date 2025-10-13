import { Listener } from '@sapphire/framework';
import { Events, AutoModerationRule } from 'discord.js';
import { BotEventDto, AutoModerationRuleCreateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class AutoModerationRuleCreateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.AutoModerationRuleCreate,
    });
  }

  public async run(rule: AutoModerationRule): Promise<void> {
    if (!isListenerEnabled(EventType.AUTO_MODERATION_RULE_CREATE)) return;
    if (!rule.guild) return;

    try {
      const eventData: AutoModerationRuleCreateEventData = {
        ruleId: rule.id,
        ruleName: rule.name,
        
        creatorId: rule.creatorId,
        creatorUsername: rule.guild.members.cache.get(rule.creatorId)?.user.username ?? 'Unknown',
        
        eventType: rule.eventType,
        triggerType: rule.triggerType,
        
        triggerMetadata: rule.triggerMetadata ? {
		keywordFilter: rule.triggerMetadata.keywordFilter ? [...rule.triggerMetadata.keywordFilter] : undefined,
		regexPatterns: rule.triggerMetadata.regexPatterns ? [...rule.triggerMetadata.regexPatterns] : undefined,
		presets: rule.triggerMetadata.presets ? [...rule.triggerMetadata.presets] : undefined,
		allowList: rule.triggerMetadata.allowList ? [...rule.triggerMetadata.allowList] : undefined,
		mentionTotalLimit: rule.triggerMetadata.mentionTotalLimit ?? undefined,
		mentionRaidProtectionEnabled: rule.triggerMetadata.mentionRaidProtectionEnabled ?? undefined,
		} : undefined,
        
        actions: rule.actions.map(action => ({
          type: action.type,
          metadata: action.metadata ? {
            channelId: action.metadata.channelId ?? undefined,
            durationSeconds: action.metadata.durationSeconds ?? undefined,
            customMessage: action.metadata.customMessage ?? undefined,
          } : undefined,
        })),
        
        enabled: rule.enabled,
        
        exemptRoles: rule.exemptRoles.map(role => role.id),
        exemptChannels: rule.exemptChannels.map(channel => channel.id),
        
        createdAt: new Date(),
      };

      const event: BotEventDto = {
        type: EventType.AUTO_MODERATION_RULE_CREATE,
        guildId: rule.guild.id,
        userId: rule.creatorId,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[AutoModerationRuleCreateListener] Error processing auto moderation rule create:', error);
    }
  }
}