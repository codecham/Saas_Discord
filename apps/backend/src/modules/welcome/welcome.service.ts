/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// apps/backend/src/modules/welcome/welcome.service.ts

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ModuleManagerService } from '../../core/module-system/services/module-manager.service';
import { SubscriptionPlan } from '@my-project/shared-types';
import { WelcomeConfig } from '@prisma/client';
import { GatewayClientService } from '../../core/gateway/services/gatewayClient.service';

/**
 * 👋 Welcome Service
 *
 * Gère la configuration des messages de bienvenue
 */
@Injectable()
export class WelcomeService {
  private readonly logger = new Logger(WelcomeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleManager: ModuleManagerService,
    private readonly gatewayClient: GatewayClientService,
  ) {}

  /**
   * Récupère la config d'une guild
   */
  async getConfig(guildId: string): Promise<WelcomeConfig> {
    const config = await this.prisma.welcomeConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      throw new NotFoundException(
        `Welcome config not found for guild ${guildId}`,
      );
    }

    return config;
  }

  /**
   * Crée ou met à jour la config
   */
  async upsertConfig(
    guildId: string,
    data: {
      enabled?: boolean;
      channelId?: string | null;
      messageType?: 'text' | 'embed';
      messageContent?: string;
      embedColor?: string;
      embedTitle?: string;
      embedDescription?: string;
      embedThumbnail?: string;
      embedFooter?: string;
    },
  ): Promise<WelcomeConfig> {
    // Vérifier si le module est activé
    const isModuleEnabled = await this.moduleManager.isModuleEnabled(
      guildId,
      'welcome',
    );
    if (!isModuleEnabled) {
      throw new BadRequestException(
        'Welcome module is not enabled for this guild',
      );
    }

    // TODO: Récupérer le plan réel depuis la DB
    const plan = SubscriptionPlan.FREE;

    // Vérifier les limites (embeds = premium only)
    if (data.messageType === 'embed' && plan === SubscriptionPlan.FREE) {
      throw new BadRequestException(
        'Embed messages are only available in Premium plan',
      );
    }

    // Valider le contenu du message
    if (data.messageContent !== undefined && !data.messageContent.trim()) {
      throw new BadRequestException('Message content cannot be empty');
    }

    // Upsert la config
    const config = await this.prisma.welcomeConfig.upsert({
      where: { guildId },
      create: {
        guildId,
        enabled: data.enabled ?? true,
        channelId: data.channelId,
        messageType: data.messageType ?? 'text',
        messageContent: data.messageContent ?? 'Welcome {user} to {server}! 🎉',
        embedColor: data.embedColor,
        embedTitle: data.embedTitle,
        embedDescription: data.embedDescription,
        embedThumbnail: data.embedThumbnail,
        embedFooter: data.embedFooter,
      },
      update: {
        enabled: data.enabled,
        channelId: data.channelId,
        messageType: data.messageType,
        messageContent: data.messageContent,
        embedColor: data.embedColor,
        embedTitle: data.embedTitle,
        embedDescription: data.embedDescription,
        embedThumbnail: data.embedThumbnail,
        embedFooter: data.embedFooter,
        updatedAt: new Date(),
      },
    });

    try {
      this.gatewayClient.notifyModuleChange({
        guildId,
        moduleId: 'welcome',
        action: 'config_updated',
        config: {
          id: config.id,
          enabled: config.enabled,
          channelId: config.channelId,
          messageType: config.messageType,
          messageContent: config.messageContent,
          embedColor: config.embedColor,
          embedTitle: config.embedTitle,
          embedDescription: config.embedDescription,
          embedThumbnail: config.embedThumbnail,
          embedFooter: config.embedFooter,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('[Welcome] Failed to notify gateway:', error);
    }
    return config;
  }

  /**
   * Active/désactive le module
   */
  async toggleEnabled(
    guildId: string,
    enabled: boolean,
  ): Promise<WelcomeConfig> {
    const config = await this.prisma.welcomeConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      throw new NotFoundException(
        `Welcome config not found for guild ${guildId}`,
      );
    }

    const updated = await this.prisma.welcomeConfig.update({
      where: { guildId },
      data: { enabled, updatedAt: new Date() },
    });

    // ✅ Notifier le bot
    try {
      this.gatewayClient.notifyModuleChange({
        guildId,
        moduleId: 'welcome',
        action: enabled ? 'config_updated' : 'disabled',
        config: enabled
          ? {
              id: updated.id,
              enabled: updated.enabled,
              channelId: updated.channelId,
              messageType: updated.messageType,
              messageContent: updated.messageContent,
              embedColor: updated.embedColor,
              embedTitle: updated.embedTitle,
              embedDescription: updated.embedDescription,
              embedThumbnail: updated.embedThumbnail,
              embedFooter: updated.embedFooter,
            }
          : undefined,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('[Welcome] Failed to notify gateway:', error);
    }
    return updated;
  }

  /**
   * Supprime la config
   */
  async deleteConfig(
    guildId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.prisma.welcomeConfig.delete({
        where: { guildId },
      });
      return { success: true, message: 'Welcome config deleted' };
    } catch {
      throw new NotFoundException(
        `Welcome config not found for guild ${guildId}`,
      );
    }
  }

  /**
   * Vérifie si la config existe
   */
  async configExists(guildId: string): Promise<boolean> {
    const count = await this.prisma.welcomeConfig.count({
      where: { guildId },
    });
    return count > 0;
  }

  /**
   * Récupère toutes les guilds avec welcome activé
   * (Utile pour le bot au démarrage)
   */
  async getAllEnabledGuilds(): Promise<string[]> {
    const configs = await this.prisma.welcomeConfig.findMany({
      where: { enabled: true },
      select: { guildId: true },
    });

    return configs.map((c) => c.guildId);
  }
}
