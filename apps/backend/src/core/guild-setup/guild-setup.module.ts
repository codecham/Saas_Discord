import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GuildSetupService } from './services/guild-setup.service';
import { GuildSettingsService } from './services/guild-settings.service';
import { GuildSetupController } from './controllers/guild-setup.controller';
import { GuildSettingsController } from './controllers/guild-settings.controller';

/**
 * Module pour la gestion du setup et des settings des guilds
 *
 * Services:
 * - GuildSetupService: Initialisation des guilds
 * - GuildSettingsService: CRUD des settings
 *
 * Controllers:
 * - GuildSetupController: /guilds/:id/setup/*
 * - GuildSettingsController: /guilds/:id/settings
 */
@Module({
  imports: [PrismaModule],
  providers: [GuildSetupService, GuildSettingsService],
  controllers: [GuildSetupController, GuildSettingsController],
  exports: [GuildSetupService, GuildSettingsService],
})
export class GuildSetupModule {}
