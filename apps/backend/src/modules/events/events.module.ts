import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsService } from './core/events.service';
import { MetricsAggregationService } from './core/metrics-aggregation.service';
import { StatsAggregationProcessor } from './jobs/stats-aggregation.processor';
import { EventsTestController } from './controllers/events-test.controller';
import { StatsSchedulerService } from './core/stats-scheduler.service';
import { StatsQueryService } from './core/stats-query.service';
import { ScheduleModule } from '@nestjs/schedule';
import { MessageEventsProcessor } from './processors/message-events.processor';
import { VoiceEventsProcessor } from './processors/voice-events.processor';
import { ReactionEventsProcessor } from './processors/reaction-events.processor';
import { EventsController } from './controllers/events.controller';

/**
 * 📊 Module Events - Gestion des événements Discord et statistiques
 *
 * Responsabilités :
 * - Recevoir les events du bot via Gateway
 * - Valider et persister dans TimescaleDB
 * - Dispatcher vers les processors appropriés
 * - Calculer les métriques temps réel
 * - Gérer les jobs d'agrégation (BullMQ)
 *
 * Architecture :
 * - core/        : Services principaux (persistance, validation, métriques)
 * - processors/  : Traitement par type d'event (moderation, messages, voice, etc.)
 * - jobs/        : BullMQ processors pour agrégations périodiques
 * - controllers/ : API endpoints pour stats & dashboards
 */
@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    // 🆕 Configuration BullMQ
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        db: parseInt(process.env.REDIS_BULL_DB || '1', 10), // DB séparée pour BullMQ
      },
      defaultJobOptions: {
        attempts: 3, // Retry 3 fois en cas d'échec
        backoff: {
          type: 'exponential', // Attente exponentielle entre retries (1s, 2s, 4s)
          delay: 1000,
        },
        removeOnComplete: 100, // Garder les 100 derniers jobs complétés (pour monitoring)
        removeOnFail: 1000, // Garder les 1000 derniers jobs échoués (pour debug)
      },
    }),

    // 🆕 Enregistrement des queues
    BullModule.registerQueue(
      {
        name: 'stats-aggregation',
        defaultJobOptions: {
          priority: 1, // Priorité normale
        },
      },
      {
        name: 'cleanup',
        defaultJobOptions: {
          priority: 5, // Basse priorité (moins urgent)
        },
      },
      {
        name: 'sync-metrics',
        defaultJobOptions: {
          priority: 2, // Priorité moyenne-haute
        },
      },
    ),
  ],
  providers: [
    EventsService,
    StatsAggregationProcessor, // 🆕 Processor BullMQ
    MetricsAggregationService,
    MessageEventsProcessor,
    VoiceEventsProcessor,
    ReactionEventsProcessor,
    StatsSchedulerService,
    StatsQueryService,
  ],
  controllers: [
    EventsTestController, // ⚠️ Controller de test (à supprimer en prod)
    EventsController,
  ],
  exports: [
    EventsService, // Rend le service disponible pour d'autres modules (Gateway)
  ],
})
export class EventsModule {}
