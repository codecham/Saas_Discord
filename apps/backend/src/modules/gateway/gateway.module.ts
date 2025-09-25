import { Module } from '@nestjs/common';
import { GatewayClientService } from './services/gatewayClient.service';

@Module({
  providers: [GatewayClientService],
})
export class GatewayModule {}
