/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, Logger } from '@nestjs/common';
import {
  DiscordChannelDTO,
  DiscordChannelType,
  GuildChannelDTO,
  ChannelPermissionOverwriteDTO,
  DiscordRoleDTO,
  DiscordPermissions,
} from '@my-project/shared-types';

/**
 * Transformer pour convertir les channels Discord bruts en channels enrichis
 *
 * Responsabilités:
 * - Calculer les champs computed (isText, isVoice, isLocked, categoryPath, etc.)
 * - Enrichir les permission overwrites avec noms
 * - Catégoriser les channels
 * - Décoder les timestamps depuis snowflakes
 */
@Injectable()
export class ChannelTransformer {
  private readonly logger = new Logger(ChannelTransformer.name);

  /**
   * Transforme un channel Discord brut en channel enrichi
   *
   * @param raw - DTO Discord brut depuis l'API
   * @param guildId - ID de la guild
   * @param roles - Tous les rôles de la guild (pour enrichir permissions)
   * @param channels - Tous les channels (pour résoudre parentName)
   * @param memberNames - Map userId -> memberName (optionnel)
   */
  transform(
    raw: DiscordChannelDTO,
    guildId: string,
    roles: DiscordRoleDTO[] = [],
    channels: DiscordChannelDTO[] = [],
    memberNames?: Map<string, string>,
  ): GuildChannelDTO {
    // Catégorisation
    const isText = this.isTextChannel(raw.type);
    const isVoice = this.isVoiceChannel(raw.type);
    const isCategory = raw.type === DiscordChannelType.GUILD_CATEGORY;
    const isThread = this.isThreadChannel(raw.type);
    const isForum = raw.type === DiscordChannelType.GUILD_FORUM;
    const isAnnouncement = raw.type === DiscordChannelType.GUILD_ANNOUNCEMENT;
    const isStage = raw.type === DiscordChannelType.GUILD_STAGE_VOICE;

    // Hiérarchie
    const parent = raw.parent_id
      ? channels.find((c) => c.id === raw.parent_id)
      : undefined;
    const parentName = parent?.name;
    const categoryPath = this.computeCategoryPath(raw, channels);

    // Permission overwrites enrichies
    const permissionOverwrites = this.enrichPermissionOverwrites(
      raw.permission_overwrites || [],
      roles,
      memberNames,
    );

    // États computed
    const isLocked = this.checkIsLocked(permissionOverwrites, guildId);
    const isPrivate = this.checkIsPrivate(permissionOverwrites, guildId);
    const hasSlowmode = (raw.rate_limit_per_user ?? 0) > 0;

    // Timestamp depuis snowflake
    const createdAt = this.snowflakeToDate(raw.id);

    return {
      // ===== Identifiants =====
      id: raw.id,
      guildId,

      // ===== Informations de base =====
      name: raw.name || 'Unknown Channel',
      type: raw.type,
      position: raw.position ?? 0,

      // ===== Hiérarchie =====
      parentId: raw.parent_id ?? undefined,
      parentName: parentName ?? undefined,
      categoryPath,

      // ===== Permissions =====
      permissionOverwrites,

      // ===== Propriétés Text Channels =====
      topic: raw.topic ?? undefined,
      nsfw: raw.nsfw ?? false,
      rateLimitPerUser: raw.rate_limit_per_user ?? undefined,
      lastMessageId: raw.last_message_id ?? undefined,
      lastPinTimestamp: raw.last_pin_timestamp ?? undefined,

      // ===== Propriétés Voice Channels =====
      bitrate: raw.bitrate ?? undefined,
      userLimit: raw.user_limit ?? undefined,
      rtcRegion: raw.rtc_region ?? undefined,
      videoQualityMode: raw.video_quality_mode ?? undefined,

      // ===== Propriétés Forum Channels =====
      defaultAutoArchiveDuration:
        raw.default_auto_archive_duration ?? undefined,

      // ===== Propriétés Thread Channels =====
      threadMetadata: raw.thread_metadata
        ? {
            archived: raw.thread_metadata.archived ?? false,
            autoArchiveDuration:
              raw.thread_metadata.auto_archive_duration ?? 1440,
            archiveTimestamp:
              raw.thread_metadata.archive_timestamp ?? undefined,
            locked: raw.thread_metadata.locked ?? false,
            invitable: raw.thread_metadata.invitable ?? undefined,
          }
        : undefined,
      messageCount: raw.message_count ?? undefined,
      memberCount: raw.member_count ?? undefined,
      totalMessageSent: raw.total_message_sent ?? undefined,

      // ===== Flags =====
      flags: raw.flags ?? undefined,

      // ===== Computed - Catégorisation =====
      isText,
      isVoice,
      isCategory,
      isThread,
      isForum,
      isAnnouncement,
      isStage,

      // ===== Computed - États =====
      isLocked,
      isPrivate,
      hasSlowmode,

      // ===== Métadonnées =====
      createdAt,
    };
  }

  /**
   * Transforme plusieurs channels en batch
   *
   * @param rawChannels - Array de channels Discord bruts
   * @param guildId - ID de la guild
   * @param roles - Rôles de la guild
   * @param memberNames - Map userId -> memberName (optionnel)
   */
  transformMany(
    rawChannels: DiscordChannelDTO[],
    guildId: string,
    roles: DiscordRoleDTO[] = [],
    memberNames?: Map<string, string>,
  ): GuildChannelDTO[] {
    this.logger.debug(
      `Transforming ${rawChannels.length} channels for guild ${guildId}`,
    );

    const transformed = rawChannels
      .map((raw) => {
        try {
          return this.transform(raw, guildId, roles, rawChannels, memberNames);
        } catch (error) {
          this.logger.error(
            `Failed to transform channel ${raw.id} in guild ${guildId}:`,
            error,
          );
          return null;
        }
      })
      .filter((channel): channel is GuildChannelDTO => channel !== null);

    this.logger.debug(
      `Successfully transformed ${transformed.length}/${rawChannels.length} channels`,
    );

    return transformed;
  }

  // =========================================================================
  // MÉTHODES PRIVÉES - CALCULS
  // =========================================================================

  /**
   * Vérifie si un type de channel est un channel de texte
   */
  private isTextChannel(type: DiscordChannelType): boolean {
    return [
      DiscordChannelType.GUILD_TEXT,
      DiscordChannelType.GUILD_ANNOUNCEMENT,
      DiscordChannelType.GUILD_FORUM,
    ].includes(type);
  }

  /**
   * Vérifie si un type de channel est un channel vocal
   */
  private isVoiceChannel(type: DiscordChannelType): boolean {
    return [
      DiscordChannelType.GUILD_VOICE,
      DiscordChannelType.GUILD_STAGE_VOICE,
    ].includes(type);
  }

  /**
   * Vérifie si un type de channel est un thread
   */
  private isThreadChannel(type: DiscordChannelType): boolean {
    return [
      DiscordChannelType.PUBLIC_THREAD,
      DiscordChannelType.PRIVATE_THREAD,
      DiscordChannelType.ANNOUNCEMENT_THREAD,
    ].includes(type);
  }

  /**
   * Calcule le chemin de catégorie complet
   * Ex: "Général / canaux-textuels"
   */
  private computeCategoryPath(
    channel: DiscordChannelDTO,
    allChannels: DiscordChannelDTO[],
  ): string | undefined {
    if (!channel.parent_id) return undefined;

    const parent = allChannels.find((c) => c.id === channel.parent_id);
    if (!parent) return undefined;

    // Si le parent est une catégorie
    if (parent.type === DiscordChannelType.GUILD_CATEGORY) {
      return parent.name ?? undefined;
    }

    // Si le parent a lui-même un parent (cas rare mais possible)
    if (parent.parent_id) {
      const grandParent = allChannels.find((c) => c.id === parent.parent_id);
      if (grandParent) {
        return `${grandParent.name} / ${parent.name}`;
      }
    }

    return parent.name ?? undefined;
  }

  /**
   * Enrichit les permission overwrites avec les noms des roles/membres
   */
  private enrichPermissionOverwrites(
    overwrites: any[],
    roles: DiscordRoleDTO[],
    memberNames?: Map<string, string>,
  ): ChannelPermissionOverwriteDTO[] {
    return overwrites.map((overwrite) => {
      const targetType = overwrite.type === 0 ? 'role' : 'member';
      let targetName: string | undefined;

      if (targetType === 'role') {
        const role = roles.find((r) => r.id === overwrite.id);
        targetName = role?.name;
      } else if (targetType === 'member' && memberNames) {
        targetName = memberNames.get(overwrite.id);
      }

      return {
        id: overwrite.id,
        type: overwrite.type,
        allow: overwrite.allow,
        deny: overwrite.deny,
        targetName,
        targetType,
      };
    });
  }

  /**
   * Vérifie si le channel est verrouillé
   * Un channel est verrouillé si @everyone a SEND_MESSAGES deny
   */
  private checkIsLocked(
    overwrites: ChannelPermissionOverwriteDTO[],
    guildId: string,
  ): boolean {
    const everyoneOverwrite = overwrites.find(
      (o) => o.id === guildId && o.targetType === 'role',
    );

    if (!everyoneOverwrite) return false;

    const denyPerms = BigInt(everyoneOverwrite.deny);
    return (denyPerms & DiscordPermissions.SEND_MESSAGES) !== 0n;
  }

  /**
   * Vérifie si le channel est privé
   * Un channel est privé si @everyone a VIEW_CHANNEL deny
   */
  private checkIsPrivate(
    overwrites: ChannelPermissionOverwriteDTO[],
    guildId: string,
  ): boolean {
    const everyoneOverwrite = overwrites.find(
      (o) => o.id === guildId && o.targetType === 'role',
    );

    if (!everyoneOverwrite) return false;

    const denyPerms = BigInt(everyoneOverwrite.deny);
    return (denyPerms & DiscordPermissions.VIEW_CHANNEL) !== 0n;
  }

  /**
   * Convertit un snowflake Discord en date ISO
   */
  private snowflakeToDate(snowflake: string): string {
    const DISCORD_EPOCH = 1420070400000n;
    const timestamp = (BigInt(snowflake) >> 22n) + DISCORD_EPOCH;
    return new Date(Number(timestamp)).toISOString();
  }
}
