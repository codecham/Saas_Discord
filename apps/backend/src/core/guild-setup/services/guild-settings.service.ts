/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GuildSettingsDto,
  UpdateGuildSettingsDto,
  CreateGuildSettingsDto,
  InitializationStatus,
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

        // Locale
        locale: dto.locale ?? 'en',
        timezone: dto.timezone ?? 'UTC',
      },
    });

    return this.mapToDto(settings);
  }

  /**
   * Récupérer les settings d'une guild
   */
  async get(guildId: string): Promise<GuildSettingsDto> {
    this.logger.log(`Getting settings for guild ${guildId}`);

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

    const { guildId, ...data } = dto;

    const settings = await this.prisma.guildSettings.update({
      where: { guildId },
      data,
    });

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
   * Supprimer les settings (cascade delete normalement géré par Prisma)
   */
  async delete(guildId: string): Promise<void> {
    this.logger.log(`Deleting settings for guild ${guildId}`);

    await this.prisma.guildSettings.delete({
      where: { guildId },
    });

    this.logger.log(`Settings deleted for guild ${guildId}`);
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

      // Locale & timezone
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
}
