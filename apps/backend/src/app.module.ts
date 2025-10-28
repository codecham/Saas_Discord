import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './modules/prisma/prisma.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { DiscordModule } from './modules/discord/discord.module';
import { AuthModule } from './modules/auth/auth.module';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisModule } from './modules/redis/redis.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { EventsModule } from './modules/events/events.module';
import { GuildSetupModule } from './modules/guild-setup/guild-setup.module';

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
    // 🔒 AJOUT: Configuration du rate limiting global
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 secondes
        limit: 100, // 100 requêtes par défaut
      },
    ]),
    PrismaModule,
    AuthModule,
    GatewayModule,
    DiscordModule,
    RedisModule,
    EventsModule,
    GuildSetupModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    // 🔒 AJOUT: Guard global pour le rate limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
