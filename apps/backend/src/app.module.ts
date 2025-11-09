import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './core/prisma/prisma.service';
import { PrismaModule } from './core/prisma/prisma.module';
import { GatewayModule } from './core/gateway/gateway.module';
import { DiscordModule } from './core/discord/discord.module';
import { AuthModule } from './core/auth/auth.module';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisModule } from './core/redis/redis.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { GuildSetupModule } from './core/guild-setup/guild-setup.module';
import { ModuleSystemModule } from './core/module-system/module-system.module';
import { WelcomeModule } from './modules/welcome/welcome.module';
import { SubscriptionModule } from './core/subscription/subscription.module';

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
    GuildSetupModule,
    ModuleSystemModule,
    WelcomeModule,
    SubscriptionModule,
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
