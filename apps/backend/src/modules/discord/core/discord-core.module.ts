import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { DiscordApiService } from './discord-api.service';
import { DiscordRateLimiterService } from './discord-rate-limiter.service';
import discordConfig from '../config/discord.config';
import { GuildsDbService } from '../common/services/guild-db.service';
import { PrismaService } from 'src/modules/prisma/prisma.service';

/**
 * Module global pour les services core de Discord
 * Ce module est marqué comme @Global pour être disponible dans toute l'application
 */
@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 15000,
      maxRedirects: 5,
    }),
    ConfigModule.forFeature(discordConfig),
  ],
  providers: [
    DiscordApiService,
    DiscordRateLimiterService,
    GuildsDbService,
    PrismaService,
  ],
  exports: [
    DiscordApiService,
    DiscordRateLimiterService,
    GuildsDbService,
    PrismaService,
  ],
})
export class DiscordCoreModule {}
