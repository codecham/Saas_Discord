import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './modules/prisma/prisma.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { DemoService } from './modules/demo/demo.service';
import { DemoController } from './modules/demo/demo.controller';
import { DemoModule } from './modules/demo/demo.module';
import { UsersService } from './modules/users/users.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { DiscordModule } from './modules/discord/discord.module';
import { GatewayModule } from './modules/gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      isGlobal: true,
    }),
    PrismaModule,
    DemoModule,
    UsersModule,
    AuthModule.forRoot(),
    DiscordModule,
    GatewayModule,
  ],
  controllers: [AppController, DemoController],
  providers: [AppService, PrismaService, DemoService, UsersService],
})
export class AppModule {}
