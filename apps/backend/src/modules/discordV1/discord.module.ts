import { Module } from '@nestjs/common';
import { DiscordControllerV1 } from './controller/discordV1.controller';
import { DiscordServiceV1 } from './services/discordV1.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DiscordServiceV1],
  controllers: [DiscordControllerV1],
  exports: [DiscordServiceV1],
})
export class DiscordModuleV1 {}
