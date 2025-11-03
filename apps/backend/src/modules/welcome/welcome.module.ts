import { Module } from '@nestjs/common';
import { WelcomeService } from './welcome.service';
import { WelcomeController } from './welcome.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { ModuleSystemModule } from '../../core/module-system/module-system.module';
import { GatewayModule } from '../../core/gateway/gateway.module';

/**
 * 👋 Welcome Module
 */
@Module({
  imports: [PrismaModule, ModuleSystemModule, GatewayModule],
  providers: [WelcomeService],
  controllers: [WelcomeController],
  exports: [WelcomeService],
})
export class WelcomeModule {}
