import { Module } from '@nestjs/common';
import { GuildsController } from './guilds.controller';
import { GuildsService } from './guilds.service';

/**
 * Module pour la gestion des guilds (serveurs Discord)
 */
@Module({
  controllers: [GuildsController],
  providers: [GuildsService],
  exports: [GuildsService],
})
export class DiscordGuildsModule {}
