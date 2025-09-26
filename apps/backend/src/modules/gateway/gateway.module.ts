import { Module } from '@nestjs/common';
import { GatewayClientService } from './services/gatewayClient.service';
import { GatewayController } from './controllers/gateway.controller';

@Module({
  providers: [GatewayClientService],
  controllers: [GatewayController],
})
export class GatewayModule {}
