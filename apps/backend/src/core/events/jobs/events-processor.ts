import { Processor, Process, OnQueueError, OnQueueFailed } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { BotEventDto, EventType } from '@my-project/shared-types';
import { MessageEventsProcessor } from '../processors/message-events.processor';
import { VoiceEventsProcessor } from '../processors/voice-events.processor';
import { ReactionEventsProcessor } from '../processors/reaction-events.processor';
import { MemberEventsProcessor } from '../processors/member-events.processor';

/**
 * 🔄 Events Processor - Traite les events depuis la queue BullMQ
 *
 * Responsabilités :
 * - Récupérer les events depuis la queue 'events-processing'
 * - Dispatcher vers les processors appropriés selon le type
 * - Gérer les erreurs et retries
 *
 * Performance :
 * - Concurrency: 10 (traite 10 jobs en parallèle)
 * - Retry: 3 fois avec backoff exponentiel
 */
@Processor('events-processing')
@Injectable()
export class EventsJobProcessor {
  private readonly logger = new Logger(EventsJobProcessor.name);

  constructor(
    private readonly messageProcessor: MessageEventsProcessor,
    private readonly voiceProcessor: VoiceEventsProcessor,
    private readonly reactionProcessor: ReactionEventsProcessor,
    private readonly memberProcessor: MemberEventsProcessor,
  ) {}

  /**
   * Traite un event individuel depuis la queue
   *
   * @param job - Job BullMQ contenant un BotEventDto
   */
  @Process({ name: 'process-event', concurrency: 10 })
  async handleEvent(job: Job<BotEventDto>): Promise<void> {
    const event = job.data;

    this.logger.debug(`🔄 Traitement event ${event.type} (Job ID: ${job.id})`);

    try {
      // Dispatcher selon le type d'event
      switch (event.type) {
        case EventType.MESSAGE_CREATE:
          await this.messageProcessor.processMessageCreate(event);
          break;

        case EventType.MESSAGE_UPDATE:
          await this.messageProcessor.processMessageUpdate(event);
          break;

        case EventType.MESSAGE_DELETE:
          await this.messageProcessor.processMessageDelete(event);
          break;

        case EventType.VOICE_STATE_UPDATE:
          await this.voiceProcessor.processVoiceStateUpdate(event);
          break;

        case EventType.MESSAGE_REACTION_ADD:
          await this.reactionProcessor.processReactionAdd(event);
          break;

        case EventType.MESSAGE_REACTION_REMOVE:
          await this.reactionProcessor.processReactionRemove(event);
          break;

        case EventType.GUILD_MEMBER_ADD:
          await this.memberProcessor.processMemberAdd(event);
          break;

        case EventType.GUILD_MEMBER_REMOVE:
          await this.memberProcessor.processMemberRemove(event);
          break;

        case EventType.GUILD_MEMBER_UPDATE:
          await this.memberProcessor.processMemberUpdate(event);
          break;

        // Autres types d'events
        default:
          this.logger.debug(
            `Event type ${event.type} pas encore géré par les processors`,
          );
          break;
      }

      this.logger.debug(
        `✅ Event ${event.type} traité avec succès (Job ID: ${job.id})`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur traitement event ${event.type} (Job ID: ${job.id}): ${error.message}`,
        error.stack,
      );

      // Throw pour que BullMQ puisse retry
      throw error;
    }
  }

  /**
   * Callback appelé quand un job échoue définitivement (après tous les retries)
   */
  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    const event = job.data as BotEventDto;
    this.logger.error(
      `💥 Job ${job.id} échoué définitivement après ${job.attemptsMade} tentatives`,
    );
    this.logger.error(
      `Event: ${event.type} | Guild: ${event.guildId} | User: ${event.userId}`,
    );
    this.logger.error(`Erreur: ${error.message}`, error.stack);

    // TODO: Envoyer alerte (email, Slack, etc.)
    // TODO: Stocker dans une table "failed_events" pour investigation
  }

  /**
   * Callback appelé pour toute erreur de queue
   */
  @OnQueueError()
  onError(error: Error) {
    this.logger.error(
      `❌ Erreur globale de la queue: ${error.message}`,
      error.stack,
    );
  }
}
