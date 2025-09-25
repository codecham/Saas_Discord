import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotGatewayModule } from './modules/bot-gateway/bot-gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      isGlobal: true,
    }),
    BotGatewayModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
