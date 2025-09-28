import { Module } from '@nestjs/common';
import { GatewayClientService } from './services/gatewayClient.service';
import { GatewayController } from './controllers/gateway.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [GatewayClientService],
  controllers: [GatewayController],
})
export class GatewayModule {}
