import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscordCoreModule } from '../discord/core/discord-core.module';
import { GuildSettingsService } from './services/guild-settings.service';
import { GuildSetupService } from './services/guild-setup.service';
import { QuickStartService } from './services/quick-start.service';
import { GuildSettingsController } from './controllers/guild-settings.controller';
import { GuildSetupController } from './controllers/guild-setup.controller';

/**
 * Module Guild Setup - Gestion de l'onboarding des guilds
 *
 * Responsabilités:
 * - Initialisation des guilds lors de l'ajout du bot
 * - Gestion des settings de guild
 * - Quick Start Wizard
 * - Tracking du status de setup
 *
 * Services:
 * - GuildSetupService: Setup initial et retry
 * - GuildSettingsService: CRUD settings
 * - QuickStartService: Wizard d'onboarding
 */
@Module({
  imports: [
    PrismaModule,
    DiscordCoreModule, // Pour accès à DiscordApiService
  ],
  providers: [GuildSettingsService, GuildSetupService, QuickStartService],
  controllers: [GuildSetupController, GuildSettingsController],
  exports: [GuildSettingsService, GuildSetupService, QuickStartService],
})
export class GuildSetupModule {}
