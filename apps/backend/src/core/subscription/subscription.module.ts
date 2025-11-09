import { Module } from '@nestjs/common';
import { SubscriptionService } from './services/subscription.service';
import { SubscriptionController } from './controllers/subscription.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';

/**
 * 💳 Subscription Module
 *
 * Module pour gérer les abonnements des guilds.
 */
@Module({
  imports: [PrismaModule],
  providers: [SubscriptionService],
  controllers: [SubscriptionController],
  exports: [SubscriptionService], // Exporté pour être utilisé dans d'autres modules
})
export class SubscriptionModule {}
