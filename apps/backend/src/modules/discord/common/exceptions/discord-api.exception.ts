import { HttpException, HttpStatus } from '@nestjs/common';
import { DISCORD_ERROR_TO_HTTP_STATUS } from '../constants/discord-error-codes.constant';

export interface DiscordApiErrorResponse {
  code: number;
  message: string;
  errors?: Record<string, any>;
}

export class DiscordApiException extends HttpException {
  constructor(
    public readonly discordCode: number,
    public readonly discordMessage: string,
    public readonly discordErrors?: Record<string, any>,
    httpStatus?: number,
  ) {
    const status =
      httpStatus ||
      DISCORD_ERROR_TO_HTTP_STATUS[discordCode] ||
      HttpStatus.INTERNAL_SERVER_ERROR;

    super(
      {
        statusCode: status,
        message: discordMessage,
        discordError: {
          code: discordCode,
          message: discordMessage,
          errors: discordErrors,
        },
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }

  static fromDiscordError(
    error: DiscordApiErrorResponse,
    httpStatus?: number,
  ): DiscordApiException {
    return new DiscordApiException(
      error.code,
      error.message,
      error.errors,
      httpStatus,
    );
  }
}

export class DiscordRateLimitException extends HttpException {
  constructor(
    public readonly retryAfter: number,
    public readonly global: boolean = false,
  ) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Rate limited. Retry after ${retryAfter}ms`,
        retryAfter,
        global,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class DiscordApiTimeoutException extends HttpException {
  constructor(endpoint: string) {
    super(
      {
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: `Request to Discord API timed out: ${endpoint}`,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.REQUEST_TIMEOUT,
    );
  }
}

export class DiscordApiNetworkException extends HttpException {
  constructor(message: string, originalError?: any) {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: `Discord API network error: ${message}`,
        originalError: originalError?.message,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
