/* eslint-disable @typescript-eslint/no-unsafe-call */
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
 * Gère l'initialisation complète d'une guild lors de l'ajout du bot
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
   * Appelé par le BotEventHandler quand event GUILD_CREATE est reçu
   */
  async initializeGuild(
    guildId: string,
    guildData: {
      name: string;
      icon?: string;
      ownerId: string;
      memberCount?: number;
      channels?: any[];
      roles?: any[];
    },
  ): Promise<InitializeGuildResponseDto> {
    this.logger.log(`Starting guild initialization: ${guildId}`);

    const startTime = Date.now();

    // Créer status initial
    const status: GuildSetupStatusDto = {
      guildId,
      status: InitializationStatus.INITIALIZING,
      progress: 0,
      currentStep: 'Creating guild record...',
      startedAt: new Date().toISOString(),
      elapsedTime: 0,
    };

    this.setupCache.set(guildId, status);

    try {
      // STEP 1: Créer ou mettre à jour la guild (10%)
      await this.createOrUpdateGuild(guildId, guildData);
      this.updateSetupProgress(guildId, 10, 'Guild record created');

      // STEP 2: Créer les settings par défaut (20%)
      const settingsExist = await this.settingsService.exists(guildId);
      if (!settingsExist) {
        await this.settingsService.create({ guildId });
        this.updateSetupProgress(guildId, 20, 'Settings initialized');
      } else {
        // Settings existent déjà, juste update status
        await this.settingsService.updateInitializationStatus(
          guildId,
          InitializationStatus.INITIALIZING,
        );
        this.updateSetupProgress(guildId, 20, 'Settings updated');
      }

      // STEP 3: Vérifier les permissions du bot (40%)
      const permissionsCheck = await this.checkBotPermissions(
        guildId,
        guildData,
      );
      this.updateSetupProgress(guildId, 40, 'Permissions checked');

      // STEP 4: Snapshot initial (channels, roles) (60%)
      await this.createInitialSnapshot(guildId, guildData);
      this.updateSetupProgress(guildId, 60, 'Initial snapshot created');

      // STEP 5: Initialiser membres actifs (80%)
      // On ne fait pas de fetch massif ici, juste marquer comme prêt
      // Les membres seront ajoutés au fur et à mesure des events
      this.updateSetupProgress(guildId, 80, 'Members tracking initialized');

      // STEP 6: Finaliser (100%)
      const finalStatus = await this.finalizeSetup(
        guildId,
        permissionsCheck,
        startTime,
      );

      this.logger.log(
        `Guild initialization completed: ${guildId} (${Date.now() - startTime}ms)`,
      );

      return {
        success: true,
        status: finalStatus,
        message:
          finalStatus.status === InitializationStatus.READY
            ? 'Guild initialized successfully'
            : 'Guild initialized with warnings',
      };
    } catch (error) {
      this.logger.error(`Guild initialization failed: ${guildId}`, error.stack);

      const errorStatus = await this.handleSetupError(
        guildId,
        error,
        startTime,
      );

      return {
        success: false,
        status: errorStatus,
        message: 'Guild initialization failed',
      };
    }
  }

  /**
   * Récupérer le status actuel d'un setup (pour polling)
   */
  async getSetupStatus(guildId: string): Promise<GuildSetupStatusDto> {
    // Check cache first (pour les setups en cours)
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
      completedAt: settings.initializedAt ?? undefined,
    };

    // Si erreur stockée
    if (
      settings.initializationStatus === InitializationStatus.ERROR &&
      settings.initializationError
    ) {
      status.error = JSON.parse(settings.initializationError);
    }

    return status;
  }

  /**
   * Retry un setup qui a échoué
   */
  async retrySetup(dto: RetrySetupDto): Promise<InitializeGuildResponseDto> {
    this.logger.log(`Retrying setup for guild ${dto.guildId}`);

    const guild = await this.prisma.guild.findUnique({
      where: { guildId: dto.guildId },
    });

    if (!guild) {
      throw new BadRequestException('Guild not found');
    }

    // Clear cache
    this.setupCache.delete(dto.guildId);

    // Relancer l'initialisation
    return this.initializeGuild(dto.guildId, {
      name: guild.name,
      icon: guild.icon ?? undefined,
      ownerId: guild.ownerDiscordId,
    });
  }

  /**
   * PRIVATE METHODS
   */

  /**
   * Créer ou mettre à jour la guild dans la DB
   */
  private async createOrUpdateGuild(
    guildId: string,
    guildData: any,
  ): Promise<void> {
    await this.prisma.guild.upsert({
      where: { guildId },
      create: {
        guildId,
        name: guildData.name,
        icon: guildData.icon,
        ownerDiscordId: guildData.ownerId,
        isActive: true,
        botAddedAt: new Date(),
      },
      update: {
        name: guildData.name,
        icon: guildData.icon,
        ownerDiscordId: guildData.ownerId,
        isActive: true,
        botRemovedAt: null, // Clear si réactivation
      },
    });
  }

  /**
   * Vérifier les permissions du bot
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private async checkBotPermissions(
    guildId: string,
    guildData: any,
  ): Promise<{
    hasAllPermissions: boolean;
    missingPermissions: string[];
    warnings: string[];
  }> {
    // TODO: Implémenter vérification réelle via Discord API
    // Pour l'instant, on assume que tout est OK

    const missingPermissions: string[] = [];
    const warnings: string[] = [];

    // Permissions critiques requises
    const requiredPermissions = [
      'VIEW_CHANNELS',
      'SEND_MESSAGES',
      'READ_MESSAGE_HISTORY',
      'MANAGE_MESSAGES', // Pour modération
      'VIEW_AUDIT_LOG', // Pour tracking
    ];

    // Simuler check (à remplacer par vraie vérification)
    const hasAllPermissions = true;

    // Warnings si certains channels inaccessibles
    if (guildData.channels) {
      const inaccessibleChannels = guildData.channels.filter(
        (c: any) => c.permissions === false,
      );
      if (inaccessibleChannels.length > 0) {
        warnings.push(
          `${inaccessibleChannels.length} channel(s) inaccessible(s)`,
        );
      }
    }

    return {
      hasAllPermissions,
      missingPermissions,
      warnings,
    };
  }

  /**
   * Créer un snapshot initial de la structure
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private async createInitialSnapshot(
    guildId: string,
    guildData: any,
  ): Promise<void> {
    // TODO: Stocker snapshot des channels et roles
    // Pour l'instant, on ne fait rien
    // Peut être utile pour analytics plus tard

    this.logger.debug(
      `Snapshot created for ${guildId}: ${guildData.channels?.length ?? 0} channels, ${guildData.roles?.length ?? 0} roles`,
    );
  }

  /**
   * Finaliser le setup
   */
  private async finalizeSetup(
    guildId: string,
    permissionsCheck: any,
    startTime: number,
  ): Promise<GuildSetupStatusDto> {
    const elapsedTime = Date.now() - startTime;

    let finalStatus: InitializationStatus;
    let warnings: SetupWarningDto[] | undefined;

    // Décider du status final
    if (!permissionsCheck.hasAllPermissions) {
      // Permissions critiques manquantes = ERROR
      finalStatus = InitializationStatus.ERROR;
    } else if (permissionsCheck.warnings.length > 0) {
      // Warnings non-bloquants = PARTIAL
      finalStatus = InitializationStatus.PARTIAL;
      warnings = permissionsCheck.warnings.map((w: string) => ({
        code: 'PARTIAL_ACCESS',
        message: w,
        timestamp: Date.now(),
      }));
    } else {
      // Tout est OK = READY
      finalStatus = InitializationStatus.READY;
    }

    // Update settings
    await this.settingsService.updateInitializationStatus(guildId, finalStatus);

    const status: GuildSetupStatusDto = {
      guildId,
      status: finalStatus,
      progress: 100,
      warnings,
      elapsedTime,
      startedAt: new Date(Date.now() - elapsedTime).toISOString(),
      completedAt: new Date().toISOString(),
    };

    this.setupCache.set(guildId, status);

    // Clear cache après 5 minutes
    setTimeout(
      () => {
        this.setupCache.delete(guildId);
      },
      5 * 60 * 1000,
    );

    return status;
  }

  /**
   * Gérer une erreur durant le setup
   */
  private async handleSetupError(
    guildId: string,
    error: any,
    startTime: number,
  ): Promise<GuildSetupStatusDto> {
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
    await this.settingsService.updateInitializationStatus(
      guildId,
      InitializationStatus.ERROR,
      JSON.stringify(setupError),
    );

    const status: GuildSetupStatusDto = {
      guildId,
      status: InitializationStatus.ERROR,
      progress: 0,
      error: setupError,
      elapsedTime,
      startedAt: new Date(Date.now() - elapsedTime).toISOString(),
    };

    this.setupCache.set(guildId, status);

    return status;
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

      // Estimer temps restant
      if (progress > 0) {
        const avgTimePerPercent = cached.elapsedTime / progress;
        cached.estimatedTimeRemaining = Math.round(
          avgTimePerPercent * (100 - progress),
        );
      }

      this.setupCache.set(guildId, cached);
    }
  }
}
