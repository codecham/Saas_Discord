import { Module } from '@nestjs/common';
import { GuildsController } from './guilds.controller';
import { GuildsService } from './guilds.service';
import { AuthModule } from 'src/modules/auth/auth.module';

/**
 * Module pour la gestion des guilds (serveurs Discord)
 */
@Module({
  imports: [AuthModule],
  controllers: [GuildsController],
  providers: [GuildsService],
  exports: [GuildsService],
})
export class DiscordGuildsModule {}
