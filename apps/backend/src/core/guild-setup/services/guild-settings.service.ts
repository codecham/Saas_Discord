/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GuildSettingsDto,
  UpdateGuildSettingsDto,
  CreateGuildSettingsDto,
  InitializationStatus,
  BackfillStatus,
  AutoModLevel,
} from '@my-project/shared-types';

/**
 * Service de gestion des settings de guild
 * CRUD sur la table guild_settings
 */
@Injectable()
export class GuildSettingsService {
  private readonly logger = new Logger(GuildSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Créer les settings par défaut pour une nouvelle guild
   */
  async create(dto: CreateGuildSettingsDto): Promise<GuildSettingsDto> {
    this.logger.log(`Creating settings for guild ${dto.guildId}`);

    const settings = await this.prisma.guildSettings.create({
      data: {
        guildId: dto.guildId,

        // Initialisation
        initializationStatus: InitializationStatus.PENDING,

        // Modules (avec overrides du DTO si fournis)
        moduleStats: dto.moduleStats ?? true,
        moduleModeration: false,
        moduleInvites: dto.moduleInvites ?? true,
        moduleAutomod: false,
        moduleWelcome: false,

        // Config stats
        statsBackfillDays: 0,
        statsBackfillStatus: BackfillStatus.NONE,
        statsBackfillProgress: 0,
        statsRetentionDays: 90,

        // Config modération
        autoModLevel: AutoModLevel.MEDIUM,

        // Config invites
        trackInvites: true,
        inviteAnalytics: true,

        // Locale
        locale: dto.locale ?? 'en',
        timezone: dto.timezone ?? 'UTC',

        // Permissions (vides par défaut)
        adminRoleIds: [],
        modRoleIds: [],
      },
    });

    this.logger.log(`Settings created for guild ${dto.guildId}`);
    return this.mapToDto(settings);
  }

  /**
   * Récupérer les settings d'une guild
   */
  async get(guildId: string): Promise<GuildSettingsDto> {
    const settings = await this.prisma.guildSettings.findUnique({
      where: { guildId },
    });

    if (!settings) {
      throw new NotFoundException(`Settings not found for guild ${guildId}`);
    }

    return this.mapToDto(settings);
  }

  /**
   * Vérifier si les settings existent
   */
  async exists(guildId: string): Promise<boolean> {
    const count = await this.prisma.guildSettings.count({
      where: { guildId },
    });
    return count > 0;
  }

  /**
   * Mettre à jour les settings (partiel)
   */
  async update(dto: UpdateGuildSettingsDto): Promise<GuildSettingsDto> {
    this.logger.log(`Updating settings for guild ${dto.guildId}`);

    // Vérifier que les settings existent
    const exists = await this.exists(dto.guildId);
    if (!exists) {
      throw new NotFoundException(
        `Settings not found for guild ${dto.guildId}`,
      );
    }

    // Préparer les données à update (enlever guildId)
    const { guildId, ...updateData } = dto;

    const settings = await this.prisma.guildSettings.update({
      where: { guildId },
      data: updateData,
    });

    this.logger.log(`Settings updated for guild ${dto.guildId}`);
    return this.mapToDto(settings);
  }

  /**
   * Mettre à jour le status d'initialisation
   */
  async updateInitializationStatus(
    guildId: string,
    status: InitializationStatus,
    error?: string,
  ): Promise<GuildSettingsDto> {
    this.logger.log(
      `Updating initialization status for guild ${guildId}: ${status}`,
    );

    const data: any = {
      initializationStatus: status,
      initializationError: error ?? null,
    };

    // Si status = READY, set initializedAt
    if (status === InitializationStatus.READY) {
      data.initializedAt = new Date();
    }

    const settings = await this.prisma.guildSettings.update({
      where: { guildId },
      data,
    });

    return this.mapToDto(settings);
  }

  /**
   * Mettre à jour la progression du backfill
   */
  async updateBackfillProgress(
    guildId: string,
    status: BackfillStatus,
    progress: number,
  ): Promise<GuildSettingsDto> {
    const data: any = {
      statsBackfillStatus: status,
      statsBackfillProgress: progress,
    };

    // Si terminé, set date
    if (status === BackfillStatus.COMPLETED) {
      data.statsBackfilledAt = new Date();
    }

    const settings = await this.prisma.guildSettings.update({
      where: { guildId },
      data,
    });

    return this.mapToDto(settings);
  }

  /**
   * Mapper le model Prisma vers DTO
   */
  private mapToDto(settings: any): GuildSettingsDto {
    return {
      id: settings.id,
      guildId: settings.guildId,

      // Initialisation
      initializationStatus:
        settings.initializationStatus as InitializationStatus,
      initializationError: settings.initializationError,
      initializedAt: settings.initializedAt?.toISOString() ?? null,

      // Modules
      moduleStats: settings.moduleStats,
      moduleModeration: settings.moduleModeration,
      moduleInvites: settings.moduleInvites,
      moduleAutomod: settings.moduleAutomod,
      moduleWelcome: settings.moduleWelcome,

      // Config stats
      statsBackfillDays: settings.statsBackfillDays,
      statsBackfillStatus: settings.statsBackfillStatus as BackfillStatus,
      statsBackfillProgress: settings.statsBackfillProgress,
      statsRetentionDays: settings.statsRetentionDays,
      statsBackfilledAt: settings.statsBackfilledAt?.toISOString() ?? null,

      // Config modération
      modLogChannelId: settings.modLogChannelId,
      autoModLevel: settings.autoModLevel as AutoModLevel,

      // Config invites
      trackInvites: settings.trackInvites,
      inviteAnalytics: settings.inviteAnalytics,

      // Locale
      locale: settings.locale,
      timezone: settings.timezone,

      // Permissions
      adminRoleIds: settings.adminRoleIds,
      modRoleIds: settings.modRoleIds,

      // Métadonnées
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  /**
   * Supprimer les settings (cascade delete normalement géré par Prisma)
   */
  async delete(guildId: string): Promise<void> {
    this.logger.log(`Deleting settings for guild ${guildId}`);

    await this.prisma.guildSettings.delete({
      where: { guildId },
    });

    this.logger.log(`Settings deleted for guild ${guildId}`);
  }
}
