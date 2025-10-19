// apps/backend/src/modules/events/controllers/events-test.controller.ts

import { Controller, Post, Param, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

/**
 * ⚠️ CONTROLLER DE TEST - À SUPPRIMER EN PRODUCTION
 *
 * Permet de tester manuellement les jobs BullMQ
 */
@Controller('events/test')
export class EventsTestController {
  private readonly logger = new Logger(EventsTestController.name);

  constructor(
    @InjectQueue('stats-aggregation')
    private readonly statsQueue: Queue,
  ) {}

  /**
   * Test d'un job aggregate-5min
   *
   * Usage: POST /events/test/aggregate-5min/123456789
   */
  @Post('aggregate-5min/:guildId')
  async testAggregate5Min(@Param('guildId') guildId: string) {
    this.logger.log(`🧪 Test job aggregate-5min pour guild ${guildId}`);

    const now = Date.now();
    const startTime = now - 5 * 60 * 1000; // Il y a 5 minutes
    const endTime = now;

    // Ajouter un job dans la queue
    const job = await this.statsQueue.add('aggregate-5min', {
      guildId,
      startTime,
      endTime,
    });

    return {
      message: 'Job aggregate-5min créé',
      jobId: job.id,
      guildId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    };
  }

  /**
   * Test d'un job aggregate-5min sur les dernières 24h
   *
   * Usage: POST /events/test/aggregate-last-24h/123456789
   */
  @Post('aggregate-last-24h/:guildId')
  async testAggregateLast24h(@Param('guildId') guildId: string) {
    this.logger.log(
      `🧪 Test job aggregate-daily pour guild ${guildId} (dernières 24h)`,
    );

    const now = Date.now();
    const startTime = now - 24 * 60 * 60 * 1000; // Il y a 24h
    const endTime = now;

    // Ajouter un job dans la queue
    const job = await this.statsQueue.add('aggregate-daily', {
      guildId,
      startTime,
      endTime,
    });

    return {
      message: 'Job aggregate-daily créé (dernières 24h)',
      jobId: job.id,
      guildId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    };
  }

  /**
   * Test d'un job aggregate-hourly
   *
   * Usage: POST /events/test/aggregate-hourly/123456789
   */
  @Post('aggregate-hourly/:guildId')
  async testAggregateHourly(@Param('guildId') guildId: string) {
    this.logger.log(`🧪 Test job aggregate-hourly pour guild ${guildId}`);

    const now = Date.now();
    const startTime = now - 60 * 60 * 1000; // Il y a 1h
    const endTime = now;

    const job = await this.statsQueue.add('aggregate-hourly', {
      guildId,
      startTime,
      endTime,
    });

    return {
      message: 'Job aggregate-hourly créé',
      jobId: job.id,
      guildId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    };
  }

  /**
   * Obtenir les stats de la queue
   *
   * Usage: GET /events/test/queue-stats
   */
  @Post('queue-stats')
  async getQueueStats() {
    const jobCounts = await this.statsQueue.getJobCounts();
    const waiting = await this.statsQueue.getWaiting();
    const active = await this.statsQueue.getActive();
    const completed = await this.statsQueue.getCompleted();
    const failed = await this.statsQueue.getFailed();

    return {
      counts: jobCounts,
      jobs: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      },
    };
  }
}
