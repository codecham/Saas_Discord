// apps/backend/src/modules/discord/common/decorators/verified-guild.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator pour récupérer le guildId qui a été vérifié par le GuildAdminGuard
 */
export const VerifiedGuild = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return request.verifiedGuildId;
  },
);
