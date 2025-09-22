import { Module } from '@nestjs/common';
import { DiscordController } from './controller/discord.controller';
import { DiscordService } from './services/discord.service';

@Module({
  providers: [DiscordService],
  controllers: [DiscordController],
  exports: [DiscordService],
})
export class DiscordModule {}
