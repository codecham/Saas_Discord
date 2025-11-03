/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GuildSettingsService } from './guild-settings.service';
import {
  GuildSetupStatusDto,
  InitializationStatus,
  SetupErrorDto,
  SetupWarningDto,
  SetupErrorSeverity,
  InitializeGuildResponseDto,
  RetrySetupDto,
} from '@my-project/shared-types';

/**
 * Service principal pour le setup des guilds
 * Gère l'initialisation simplifiée d'une guild lors de l'ajout du bot
 */
@Injectable()
export class GuildSetupService {
  private readonly logger = new Logger(GuildSetupService.name);

  // Cache temporaire des setups en cours (guildId => status)
  private readonly setupCache = new Map<string, GuildSetupStatusDto>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: GuildSettingsService,
  ) {}

  /**
   * Initialiser une guild après que le bot l'ait rejointe
   * Version simplifiée - 4 étapes rapides
   */
  async initializeGuild(
    guildId: string,
    guildData: {
      name: string;
      icon?: string;
      ownerId: string;
      memberCount?: number;
    },
  ): Promise<InitializeGuildResponseDto> {
    const startTime = Date.now();

    this.logger.log(`🚀 Initializing guild ${guildId} (${guildData.name})...`);

    try {
      // Créer status initial
      const initialStatus: GuildSetupStatusDto = {
        guildId,
        status: InitializationStatus.INITIALIZING,
        progress: 0,
        currentStep: 'Starting initialization...',
        startedAt: new Date().toISOString(),
      };
      this.setupCache.set(guildId, initialStatus);

      // [25%] Étape 1 : Créer/Update Guild
      this.updateSetupProgress(guildId, 25, 'Creating guild record...');
      await this.upsertGuild(guildId, guildData);

      // [50%] Étape 2 : Créer Settings avec defaults
      this.updateSetupProgress(guildId, 50, 'Creating default settings...');
      const settingsExists = await this.settingsService.exists(guildId);

      if (!settingsExists) {
        await this.settingsService.create({
          guildId,
          locale: 'en',
          timezone: 'UTC',
        });
      }

      // [75%] Étape 3 : Vérifier que tout est OK
      this.updateSetupProgress(guildId, 75, 'Verifying setup...');
      // Rien de spécial à vérifier pour l'instant
      // Le bot a envoyé l'event donc il est bien dans la guild

      // [100%] Étape 4 : Finaliser
      this.updateSetupProgress(guildId, 100, 'Setup complete!');
      await this.settingsService.updateInitializationStatus(
        guildId,
        InitializationStatus.READY,
      );

      const elapsedTime = Date.now() - startTime;

      const finalStatus: GuildSetupStatusDto = {
        guildId,
        status: InitializationStatus.READY,
        progress: 100,
        elapsedTime,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
      };

      this.setupCache.set(guildId, finalStatus);

      // Clear cache après 5 minutes
      setTimeout(
        () => {
          this.setupCache.delete(guildId);
        },
        5 * 60 * 1000,
      );

      this.logger.log(
        `✅ Guild ${guildId} initialized successfully in ${elapsedTime}ms`,
      );

      return {
        success: true,
        status: finalStatus,
        message: 'Guild initialized successfully',
      };
    } catch (error) {
      this.logger.error(`❌ Error initializing guild ${guildId}:`, error);
      return await this.handleSetupError(guildId, error, startTime);
    }
  }

  /**
   * Récupérer le status du setup d'une guild
   * Utilisé pour le polling côté frontend
   */
  async getSetupStatus(guildId: string): Promise<GuildSetupStatusDto> {
    // Vérifier le cache en premier
    const cached = this.setupCache.get(guildId);
    if (cached) {
      return cached;
    }

    // Sinon, récupérer depuis la DB
    const settings = await this.settingsService.get(guildId);

    const status: GuildSetupStatusDto = {
      guildId,
      status: settings.initializationStatus,
      progress:
        settings.initializationStatus === InitializationStatus.READY ? 100 : 0,
      startedAt: settings.createdAt,
      completedAt: settings.initializedAt ?? undefined,
    };

    // Si erreur, parser l'erreur depuis settings
    if (
      settings.initializationStatus === InitializationStatus.ERROR &&
      settings.initializationError
    ) {
      try {
        status.error = JSON.parse(settings.initializationError);
      } catch {
        status.error = {
          code: 'UNKNOWN_ERROR',
          severity: SetupErrorSeverity.CRITICAL,
          message: settings.initializationError,
          resolution: 'Please try again or contact support',
          canRetry: true,
          timestamp: Date.now(),
        };
      }
    }

    return status;
  }

  /**
   * Retry un setup qui a échoué
   */
  async retrySetup(dto: RetrySetupDto): Promise<InitializeGuildResponseDto> {
    this.logger.log(`Retrying setup for guild ${dto.guildId}`);

    // Vérifier que la guild existe
    const guild = await this.prisma.guild.findUnique({
      where: { guildId: dto.guildId },
    });

    if (!guild) {
      throw new BadRequestException('Guild not found');
    }

    // Clear le cache si force
    if (dto.force) {
      this.setupCache.delete(dto.guildId);
    }

    // Relancer l'initialisation
    return this.initializeGuild(dto.guildId, {
      name: guild.name,
      icon: guild.icon ?? undefined,
      ownerId: guild.ownerDiscordId,
    });
  }

  /**
   * Créer ou mettre à jour une guild dans la DB
   */
  private async upsertGuild(
    guildId: string,
    guildData: {
      name: string;
      icon?: string;
      ownerId: string;
      memberCount?: number;
    },
  ): Promise<void> {
    await this.prisma.guild.upsert({
      where: { guildId },
      create: {
        guildId,
        name: guildData.name,
        icon: guildData.icon,
        ownerDiscordId: guildData.ownerId,
        botAddedAt: new Date(),
        isActive: true,
      },
      update: {
        name: guildData.name,
        icon: guildData.icon,
        ownerDiscordId: guildData.ownerId,
        isActive: true,
        botRemovedAt: null, // Reset si le bot rejoint à nouveau
      },
    });

    this.logger.log(`Guild ${guildId} upserted in database`);
  }

  /**
   * Gérer une erreur durant le setup
   */
  private async handleSetupError(
    guildId: string,
    error: any,
    startTime: number,
  ): Promise<InitializeGuildResponseDto> {
    const elapsedTime = Date.now() - startTime;

    const setupError: SetupErrorDto = {
      code: 'SETUP_ERROR',
      severity: SetupErrorSeverity.CRITICAL,
      message: 'An error occurred during guild setup',
      resolution: 'Please try again or contact support',
      canRetry: true,
      technicalDetails: error.message,
      timestamp: Date.now(),
    };

    // Stocker l'erreur dans settings
    try {
      await this.settingsService.updateInitializationStatus(
        guildId,
        InitializationStatus.ERROR,
        JSON.stringify(setupError),
      );
    } catch (settingsError) {
      this.logger.error('Failed to update settings with error:', settingsError);
    }

    const status: GuildSetupStatusDto = {
      guildId,
      status: InitializationStatus.ERROR,
      progress: 0,
      error: setupError,
      elapsedTime,
      startedAt: new Date(Date.now() - elapsedTime).toISOString(),
    };

    this.setupCache.set(guildId, status);

    return {
      success: false,
      status,
      message: 'Guild setup failed',
    };
  }

  /**
   * Mettre à jour la progression dans le cache
   */
  private updateSetupProgress(
    guildId: string,
    progress: number,
    step: string,
  ): void {
    const cached = this.setupCache.get(guildId);
    if (cached) {
      cached.progress = progress;
      cached.currentStep = step;
      cached.elapsedTime = Date.now() - new Date(cached.startedAt!).getTime();
      this.setupCache.set(guildId, cached);
    }

    this.logger.log(`[${guildId}] ${progress}% - ${step}`);
  }
}
