import { Module } from '@nestjs/common';
import { BotGateway } from './bot/bot.gateway';
import { BotConnectionService } from './services/bot-connection/bot-connection.service';

@Module({
  providers: [BotGateway, BotConnectionService],
  exports: [BotConnectionService],
})
export class BotGatewayModule {}
