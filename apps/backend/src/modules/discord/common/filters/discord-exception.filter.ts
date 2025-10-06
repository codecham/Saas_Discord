import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { Response } from 'express';
import {
  DiscordApiException,
  DiscordRateLimitException,
  DiscordApiTimeoutException,
  DiscordApiNetworkException,
} from '../exceptions/discord-api.exception';

/**
 * Filtre global pour gérer les exceptions liées à l'API Discord
 */
@Catch(
  DiscordApiException,
  DiscordRateLimitException,
  DiscordApiTimeoutException,
  DiscordApiNetworkException,
)
export class DiscordExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DiscordExceptionFilter.name);

  catch(
    exception:
      | DiscordApiException
      | DiscordRateLimitException
      | DiscordApiTimeoutException
      | DiscordApiNetworkException,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Log l'erreur
    this.logger.error(
      `Discord API Error: ${exception.message}`,
      exception.stack,
    );

    // Récupérer le statut et la réponse selon le type d'exception
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Construire la réponse
    const errorResponse = {
      ...(typeof exceptionResponse === 'object'
        ? exceptionResponse
        : { message: exceptionResponse }),
      path: request.url,
      method: request.method,
    };

    // Ajouter des headers spécifiques pour les rate limits
    if (exception instanceof DiscordRateLimitException) {
      response.setHeader('Retry-After', Math.ceil(exception.retryAfter / 1000));
      response.setHeader('X-RateLimit-Global', exception.global.toString());
    }

    response.status(status).json(errorResponse);
  }
}
