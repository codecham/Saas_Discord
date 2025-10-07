import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Module Redis global
 * Fournit une instance Redis partagée dans toute l'application
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redis = new Redis({
          host: configService.getOrThrow<string>('REDIS_HOST', 'localhost'),
          port: configService.getOrThrow<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),

          // Configuration de sécurité et performance
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          enableOfflineQueue: true,

          // Reconnexion automatique
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });

        // Logs de connexion
        redis.on('connect', () => {
          console.log('✅ Redis connected');
        });

        redis.on('error', (err) => {
          console.error('❌ Redis connection error:', err);
        });

        redis.on('ready', () => {
          console.log('🚀 Redis ready');
        });

        return redis;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
