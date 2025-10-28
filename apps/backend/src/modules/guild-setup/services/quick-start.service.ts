import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GuildSettingsService } from './guild-settings.service';
import {
  QuickStartAnswersDto,
  QuickStartResponseDto,
  QuickStartOptionsDto,
  AutoModLevel,
} from '@my-project/shared-types';
import { DiscordApiService } from '../../discord/core/discord-api.service';

/**
 * Service pour gérer le Quick Start Wizard
 * Applique les réponses du wizard aux settings de la guild
 */
@Injectable()
export class QuickStartService {
  private readonly logger = new Logger(QuickStartService.name);

  constructor(
    private readonly settingsService: GuildSettingsService,
    private readonly discordApi: DiscordApiService,
  ) {}

  /**
   * Récupérer les options disponibles pour le wizard
   * Fetch les channels disponibles et les recommendations
   */
  async getOptions(guildId: string): Promise<QuickStartOptionsDto> {
    this.logger.log(`Getting quick start options for guild ${guildId}`);

    try {
      // Fetch channels de la guild via Discord API
      const channelsResponse = await this.discordApi.get(
        `/guilds/${guildId}/channels`,
        {
          rateLimitKey: `guild:${guildId}:channels`,
        },
      );

      const channels = channelsResponse as any[];
      // Filtrer pour ne garder que les text channels
      const textChannels = channels
        .filter((c: any) => c.type === 0) // 0 = GUILD_TEXT
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.type,
        }));

      // Vérifier si le bot peut créer des channels
      // TODO: Check permissions réelles
      const canCreateChannels = true;

      // Recommendations basiques
      const recommendations = {
        stats: true, // Toujours recommandé
        inviteTracking: true, // Toujours recommandé
        automod: textChannels.length > 10, // Si grosse guild
        automodLevel:
          textChannels.length > 20 ? 'high' : ('medium' as 'high' | 'medium'),
      };

      return {
        availableChannels: textChannels,
        canCreateChannels,
        recommendations,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get quick start options for ${guildId}`,
        error.stack,
      );
      throw new BadRequestException('Failed to fetch guild data');
    }
  }

  /**
   * Appliquer les réponses du wizard
   */
  async applyAnswers(
    answers: QuickStartAnswersDto,
  ): Promise<QuickStartResponseDto> {
    this.logger.log(
      `Applying quick start answers for guild ${answers.guildId}`,
    );

    const modulesEnabled: string[] = [];
    let modLogChannelCreated = false;
    let modLogChannelId: string | undefined;

    try {
      // STEP 1: Update settings basiques
      const updateData: any = {
        guildId: answers.guildId,
      };

      // Modules
      if (answers.enableStats !== undefined) {
        updateData.moduleStats = answers.enableStats;
        if (answers.enableStats) modulesEnabled.push('stats');
      }

      if (answers.enableInviteTracking !== undefined) {
        updateData.trackInvites = answers.enableInviteTracking;
        updateData.moduleInvites = answers.enableInviteTracking;
        if (answers.enableInviteTracking) modulesEnabled.push('invites');
      }

      if (answers.enableAutomod !== undefined) {
        updateData.moduleAutomod = answers.enableAutomod;
        if (answers.enableAutomod) {
          modulesEnabled.push('automod');
          updateData.autoModLevel = answers.automodLevel ?? AutoModLevel.MEDIUM;
        }
      }

      if (answers.enableWelcome !== undefined) {
        updateData.moduleWelcome = answers.enableWelcome;
        if (answers.enableWelcome) modulesEnabled.push('welcome');
      }

      // STEP 2: Gérer le mod log channel
      if (answers.modLogChannelId) {
        // Channel existant fourni
        updateData.modLogChannelId = answers.modLogChannelId;
        updateData.moduleModeration = true;
        modulesEnabled.push('moderation');
        modLogChannelId = answers.modLogChannelId;
      } else if (answers.createModLogChannel) {
        // Créer un nouveau channel
        const channelName = answers.modLogChannelName ?? 'mod-logs';

        try {
          const createdChannel = await this.createModLogChannel(
            answers.guildId,
            channelName,
          );

          updateData.modLogChannelId = createdChannel.id;
          updateData.moduleModeration = true;
          modulesEnabled.push('moderation');
          modLogChannelCreated = true;
          modLogChannelId = createdChannel.id;
        } catch (error) {
          this.logger.warn(
            `Failed to create mod log channel for ${answers.guildId}`,
            error.stack,
          );
          // Continue sans channel de logs
        }
      }

      // STEP 3: Appliquer les updates
      await this.settingsService.update(updateData);

      this.logger.log(
        `Quick start applied for ${answers.guildId}: ${modulesEnabled.join(', ')}`,
      );

      // STEP 4: Générer les next steps
      const nextSteps = this.generateNextSteps(answers, modulesEnabled);

      return {
        success: true,
        settings: {
          modulesEnabled,
          modLogChannelCreated,
          modLogChannelId,
          configApplied: true,
        },
        message: `Configuration applied successfully! ${modulesEnabled.length} module(s) enabled.`,
        nextSteps,
      };
    } catch (error) {
      this.logger.error(
        `Failed to apply quick start for ${answers.guildId}`,
        error.stack,
      );
      throw new BadRequestException('Failed to apply configuration');
    }
  }

  /**
   * Créer un channel de mod logs
   */
  private async createModLogChannel(
    guildId: string,
    name: string,
  ): Promise<any> {
    this.logger.log(`Creating mod log channel "${name}" in guild ${guildId}`);

    const channelResponse = await this.discordApi.post(
      `/guilds/${guildId}/channels`,
      {
        name,
        type: 0, // GUILD_TEXT
        topic: '🔨 Logs de modération automatique',
        permission_overwrites: [
          {
            id: guildId, // @everyone
            type: 0, // role
            deny: '1024', // VIEW_CHANNEL permission
          },
        ],
      },
      {
        rateLimitKey: `guild:${guildId}:channels:create`,
      },
    );

    const channel = channelResponse as any;
    this.logger.log(
      `Mod log channel created: ${channel.id} in guild ${guildId}`,
    );

    return channel;
  }

  /**
   * Générer les suggestions de prochaines étapes
   */
  private generateNextSteps(
    answers: QuickStartAnswersDto,
    modulesEnabled: string[],
  ): string[] {
    const steps: string[] = [];

    if (modulesEnabled.includes('stats')) {
      steps.push('📊 Consultez le dashboard pour voir les premières stats');
    }

    if (modulesEnabled.includes('invites')) {
      steps.push("🔗 Créez des codes d'invitation pour tracker les arrivées");
    }

    if (modulesEnabled.includes('moderation')) {
      steps.push('🔨 Configurez les règles de modération automatique');
    }

    if (modulesEnabled.includes('automod')) {
      steps.push("🛡️ Ajustez le niveau d'automodération si besoin");
    }

    if (!modulesEnabled.includes('welcome')) {
      steps.push(
        '👋 Activez les messages de bienvenue pour accueillir les nouveaux membres',
      );
    }

    // Step général
    steps.push('⚙️ Personnalisez davantage dans les paramètres du serveur');

    return steps;
  }
}
