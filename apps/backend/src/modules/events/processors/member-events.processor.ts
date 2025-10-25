import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BotEventDto } from '@my-project/shared-types';

/**
 * 👥 Processor pour les events liés aux membres
 *
 * Events traités :
 * - GUILD_MEMBER_ADD (arrivée)
 * - GUILD_MEMBER_REMOVE (départ)
 * - GUILD_MEMBER_UPDATE (changement roles/pseudo)
 */
@Injectable()
export class MemberEventsProcessor {
  private readonly logger = new Logger(MemberEventsProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Traite un event GUILD_MEMBER_ADD (arrivée d'un membre)
   */
  async processMemberAdd(event: BotEventDto): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { guildId, userId, timestamp, data } = event;

    if (!userId) {
      this.logger.warn('GUILD_MEMBER_ADD sans userId ignoré');
      return;
    }

    const joinedAt = new Date(timestamp);

    try {
      // Créer ou mettre à jour MemberStats avec joinedAt
      await this.prisma.memberStats.upsert({
        where: {
          idx_member_stats_unique: { guildId, userId },
        },
        update: {
          joinedAt, // Update si membre était là avant (rejoin)
          updatedAt: joinedAt,
        },
        create: {
          guildId,
          userId,
          totalMessages: 0,
          totalVoiceMinutes: 0,
          totalReactionsGiven: 0,
          totalReactionsReceived: 0,
          joinedAt,
          lastSeen: null,
          lastMessageAt: null,
          lastVoiceAt: null,
        },
      });

      this.logger.debug(
        `✅ Membre ajouté: ${userId} dans guild ${guildId} (joinedAt: ${joinedAt.toISOString()})`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur traitement GUILD_MEMBER_ADD: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Traite un event GUILD_MEMBER_REMOVE (départ d'un membre)
   */
  async processMemberRemove(event: BotEventDto): Promise<void> {
    const { guildId, userId, timestamp } = event;

    if (!userId) {
      this.logger.warn('GUILD_MEMBER_REMOVE sans userId ignoré');
      return;
    }

    const leftAt = new Date(timestamp);

    try {
      // On ne supprime PAS les stats (pour historique)
      // On marque juste la date de départ
      const memberStats = await this.prisma.memberStats.findUnique({
        where: {
          idx_member_stats_unique: { guildId, userId },
        },
      });

      if (memberStats) {
        await this.prisma.memberStats.update({
          where: {
            idx_member_stats_unique: { guildId, userId },
          },
          data: {
            updatedAt: leftAt,
            // Note: on pourrait ajouter un champ `leftAt` si besoin
          },
        });

        this.logger.debug(
          `✅ Membre retiré: ${userId} de guild ${guildId} (leftAt: ${leftAt.toISOString()})`,
        );
      } else {
        this.logger.warn(
          `⚠️ GUILD_MEMBER_REMOVE: membre ${userId} n'existe pas dans MemberStats`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Erreur traitement GUILD_MEMBER_REMOVE: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Traite un event GUILD_MEMBER_UPDATE (changement roles/pseudo)
   *
   * Pour l'instant, on log juste (pas de tracking dans stats)
   * Peut être utile plus tard pour historique des rôles
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async processMemberUpdate(event: BotEventDto): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { guildId, userId, timestamp, data } = event;

    if (!userId) {
      this.logger.warn('GUILD_MEMBER_UPDATE sans userId ignoré');
      return;
    }

    // Pour l'instant, on ne fait rien de particulier
    // Mais on pourrait tracker les changements de rôles, nickname, etc.
    this.logger.debug(
      `ℹ️ Membre mis à jour: ${userId} dans guild ${guildId}`,
      data,
    );

    // TODO: Si besoin, créer une table RoleHistory pour tracker les changements
  }
}
