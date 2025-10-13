import { Listener } from '@sapphire/framework';
import { Events, AutoModerationRule } from 'discord.js';
import { BotEventDto, AutoModerationRuleUpdateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class AutoModerationRuleUpdateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.AutoModerationRuleUpdate,
    });
  }

  public async run(oldRule: AutoModerationRule | null, newRule: AutoModerationRule): Promise<void> {
    if (!isListenerEnabled(EventType.AUTO_MODERATION_RULE_UPDATE)) return;
    if (!newRule.guild) return;
    if (!oldRule) return; // Pas de comparaison possible

    try {
      const changes: AutoModerationRuleUpdateEventData['changes'] = {};

      if (oldRule.name !== newRule.name) {
        changes.name = {
          old: oldRule.name,
          new: newRule.name,
        };
      }

      if (oldRule.enabled !== newRule.enabled) {
        changes.enabled = {
          old: oldRule.enabled,
          new: newRule.enabled,
        };
      }

      if (oldRule.eventType !== newRule.eventType) {
        changes.eventType = {
          old: oldRule.eventType,
          new: newRule.eventType,
        };
      }

      if (JSON.stringify(oldRule.triggerMetadata) !== JSON.stringify(newRule.triggerMetadata)) {
        changes.triggerMetadata = {
          old: oldRule.triggerMetadata,
          new: newRule.triggerMetadata,
        };
      }

      if (JSON.stringify(oldRule.actions) !== JSON.stringify(newRule.actions)) {
        changes.actions = {
          old: oldRule.actions.map(action => ({
            type: action.type,
            metadata: action.metadata,
          })),
          new: newRule.actions.map(action => ({
            type: action.type,
            metadata: action.metadata,
          })),
        };
      }

      const oldExemptRoles = oldRule.exemptRoles.map(role => role.id).sort();
      const newExemptRoles = newRule.exemptRoles.map(role => role.id).sort();
      if (JSON.stringify(oldExemptRoles) !== JSON.stringify(newExemptRoles)) {
        changes.exemptRoles = {
          old: oldExemptRoles,
          new: newExemptRoles,
          added: newExemptRoles.filter(id => !oldExemptRoles.includes(id)),
          removed: oldExemptRoles.filter(id => !newExemptRoles.includes(id)),
        };
      }

      const oldExemptChannels = oldRule.exemptChannels.map(channel => channel.id).sort();
      const newExemptChannels = newRule.exemptChannels.map(channel => channel.id).sort();
      if (JSON.stringify(oldExemptChannels) !== JSON.stringify(newExemptChannels)) {
        changes.exemptChannels = {
          old: oldExemptChannels,
          new: newExemptChannels,
          added: newExemptChannels.filter(id => !oldExemptChannels.includes(id)),
          removed: oldExemptChannels.filter(id => !newExemptChannels.includes(id)),
        };
      }

      if (Object.keys(changes).length === 0) return;

      const eventData: AutoModerationRuleUpdateEventData = {
        ruleId: newRule.id,
        ruleName: newRule.name,
        changes,
        updatedAt: new Date(),
      };

      const event: BotEventDto = {
        type: EventType.AUTO_MODERATION_RULE_UPDATE,
        guildId: newRule.guild.id,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[AutoModerationRuleUpdateListener] Error processing auto moderation rule update:', error);
    }
  }
}