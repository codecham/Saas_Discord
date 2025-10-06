import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './modules/prisma/prisma.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { DiscordModuleV1 } from './modules/discordV1/discord.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { DiscordModule } from './modules/discord/discord.module';
import { AuthModule } from './modules/auth/auth.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      isGlobal: true,
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 300, // 5 minutes par défaut
    }),
    PrismaModule,
    AuthModule,
    DiscordModuleV1,
    GatewayModule,
    DiscordModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
