// Fichier: apps/bot/src/listeners/moderation/guildAuditLogEntryCreate.ts

import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { AuditLogEvent, GuildAuditLogsEntry } from 'discord.js';
import { BotEventDto, EventType, AuditLogEntryCreateEventData } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

/**
 * Listener pour l'événement GUILD_AUDIT_LOG_ENTRY_CREATE
 * 
 * 🔥 L'ÉVÉNEMENT LE PLUS IMPORTANT POUR LA MODÉRATION !
 * Capture TOUTES les actions de modération avec leur auteur :
 * - Bans/Unbans/Kicks
 * - Timeouts
 * - Suppressions de messages
 * - Modifications de rôles/channels
 * - Et bien plus !
 * 
 * @event guildAuditLogEntryCreate
 */
@ApplyOptions<Listener.Options>({
  event: 'guildAuditLogEntryCreate'
})
export class GuildAuditLogEntryCreateListener extends Listener {
  
  public override async run(auditLogEntry: GuildAuditLogsEntry, guild: any): Promise<void> {
    if (!isListenerEnabled('GUILD_AUDIT_LOG_ENTRY_CREATE')) {
      return;
    }

    // Le guild est passé en 2e paramètre par Discord.js
    if (!guild?.id) {
      this.container.logger.warn('[AUDIT_LOG] No guild ID found');
      return;
    }

    const eventData = this.extractAuditLogData(auditLogEntry);

    const event: BotEventDto = {
      type: EventType.GUILD_AUDIT_LOG_ENTRY_CREATE,
      guildId: guild.id,
      userId: auditLogEntry.executorId || 'unknown',
      data: eventData,
      timestamp: Date.now()
    };

    this.container.eventBatcher.addEvent(event);

    this.container.logger.info(
      `[AUDIT_LOG] Guild: ${guild.id} | Action: ${AuditLogEvent[auditLogEntry.action]} | Executor: ${auditLogEntry.executor?.tag || 'Unknown'} | Target: ${auditLogEntry.targetId || 'N/A'}`
    );
  }

  private extractAuditLogData(entry: GuildAuditLogsEntry): AuditLogEntryCreateEventData {
    // Déterminer le type de target
    let targetType: string | undefined;
    if (entry.targetType) {
      targetType = entry.targetType.toString().toLowerCase();
    }

    // Extraire les changements
    const changes = entry.changes?.map(change => ({
      key: change.key,
      oldValue: change.old,
      newValue: change.new
    }));

    // Métadonnées extra selon le type d'action
    const extra: AuditLogEntryCreateEventData['extra'] = {};

    // Timeout duration
    if (entry.action === AuditLogEvent.MemberUpdate && entry.changes) {
      const timeoutChange = entry.changes.find(c => c.key === 'communication_disabled_until');
      if (timeoutChange && timeoutChange.new) {
        const timeoutDate = new Date(timeoutChange.new as string);
        const now = new Date();
        extra.timeoutDuration = Math.floor((timeoutDate.getTime() - now.getTime()) / 1000);
      }
    }

    // Message bulk delete
    if (entry.action === AuditLogEvent.MessageBulkDelete && entry.extra) {
      extra.deletedMessageCount = (entry.extra as any).count || 0;
      extra.channelId = (entry.extra as any).channel?.id;
    }

    // Role changes
    if (entry.action === AuditLogEvent.MemberRoleUpdate && entry.extra) {
      const extraData = entry.extra as any;
      if (extraData.$add) {
        extra.roleId = extraData.$add[0]?.id;
        extra.roleName = extraData.$add[0]?.name;
      } else if (extraData.$remove) {
        extra.roleId = extraData.$remove[0]?.id;
        extra.roleName = extraData.$remove[0]?.name;
      }
    }

    // Channel info
    if (entry.action === AuditLogEvent.MessageDelete && entry.extra) {
      extra.channelId = (entry.extra as any).channel?.id;
    }

    return {
      actionType: entry.action,
      actionName: AuditLogEvent[entry.action] || 'Unknown',
      
      executorId: entry.executorId || 'unknown',
      executorUsername: entry.executor?.username || 'Unknown',
      executorBot: entry.executor?.bot || false,
      
      targetId: entry.targetId || undefined,
      targetType,
      
      reason: entry.reason || undefined,
      
      changes,
      
      extra: Object.keys(extra).length > 0 ? extra : undefined,
      
      createdAt: entry.createdAt
    };
  }
}