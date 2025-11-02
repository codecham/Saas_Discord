import { Module } from '@nestjs/common';
import { GatewayClientService } from './services/gatewayClient.service';
import { GatewayController } from './controllers/gateway.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BotCommandSenderService } from './services/bot-command-sender.service';
import { BotEventHandlerService } from './services/bot-event-handler.service';
import { EventsModule } from '../events/events.module';
import { GuildSetupModule } from '../guild-setup/guild-setup.module';

@Module({
  imports: [PrismaModule, EventsModule, GuildSetupModule],
  providers: [
    GatewayClientService,
    BotCommandSenderService,
    BotEventHandlerService,
  ],
  controllers: [GatewayController],
})
export class GatewayModule {}
