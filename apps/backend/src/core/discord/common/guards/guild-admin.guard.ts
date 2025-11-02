// apps/backend/src/modules/discord/common/guards/guild-admin.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { DiscordApiService } from '../../core/discord-api.service';
import { DiscordTokenService } from '../../../auth/services/discord-token.service';
import { DISCORD_ENDPOINTS } from '../constants/discord-endpoints.constant';

/**
 * Guard qui vérifie que l'utilisateur a les droits ADMINISTRATOR sur la guild
 */
@Injectable()
export class GuildAdminGuard implements CanActivate {
  private readonly logger = new Logger(GuildAdminGuard.name);
  private readonly CACHE_TTL = 300000; // 5 minutes en millisecondes

  constructor(
    private readonly reflector: Reflector,
    private readonly discordApi: DiscordApiService,
    private readonly discordToken: DiscordTokenService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // L'utilisateur doit être défini par JwtAuthGuard qui s'exécute avant
    if (!request.user) {
      this.logger.error(
        'GuildAdminGuard: request.user is undefined - JwtAuthGuard may not have run',
      );
      throw new ForbiddenException('User not authenticated');
    }

    // Extraire l'userId (ton JwtStrategy retourne { id, discordId, username, role })
    const userId = request.user.id;

    if (!userId) {
      this.logger.warn('GuildAdminGuard: No user ID found in request.user');
      this.logger.debug('Request user object:', JSON.stringify(request.user));
      throw new ForbiddenException('User ID not found in token');
    }

    // Récupérer le guildId depuis les params, query ou body
    const guildId =
      request.params.guildId || request.query.guildId || request.body?.guildId;

    if (!guildId) {
      this.logger.warn(`GuildAdminGuard: No guild ID found for user ${userId}`);
      throw new BadRequestException('Guild ID is required');
    }

    this.logger.debug(
      `Checking admin permissions for user ${userId} on guild ${guildId}`,
    );

    // Vérifier le cache d'abord
    const cacheKey = `guild_admin:${userId}:${guildId}`;
    const cachedPermission = await this.cacheManager.get<boolean>(cacheKey);

    if (cachedPermission !== undefined && cachedPermission !== null) {
      this.logger.debug(`Cache hit for ${cacheKey}: ${cachedPermission}`);

      if (!cachedPermission) {
        this.logger.warn(
          `User ${userId} denied access to guild ${guildId} (cached)`,
        );
        throw new ForbiddenException(
          `You don't have administrator permissions on guild ${guildId}`,
        );
      }

      request.verifiedGuildId = guildId;
      return true;
    }

    // Si pas en cache, vérifier via l'API Discord
    this.logger.debug(`Cache miss for ${cacheKey}, checking Discord API`);
    const hasPermission = await this.checkGuildAdminPermission(userId, guildId);

    // Mettre en cache le résultat
    await this.cacheManager.set(cacheKey, hasPermission, this.CACHE_TTL);
    this.logger.debug(
      `Cached permission result for ${cacheKey}: ${hasPermission}`,
    );

    if (!hasPermission) {
      this.logger.warn(`User ${userId} denied access to guild ${guildId}`);
      throw new ForbiddenException(
        `You don't have administrator permissions on guild ${guildId}`,
      );
    }

    // Stocker le guildId vérifié dans la requête pour usage ultérieur
    request.verifiedGuildId = guildId;
    this.logger.debug(`User ${userId} granted access to guild ${guildId}`);

    return true;
  }

  /**
   * Extrait l'userId de différentes sources possibles dans la requête
   */
  private extractUserId(request: any): string | null {
    // Cas 1: request.user.id (structure classique)
    if (request.user?.id) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return request.user.id;
    }

    // Cas 2: request.user.sub (JWT standard avec "sub" claim)
    if (request.user?.sub) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return request.user.sub;
    }

    // Cas 3: request.user.userId (structure alternative)
    if (request.user?.userId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return request.user.userId;
    }

    // Cas 4: request.userId (directement dans la requête)
    if (request.userId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return request.userId;
    }

    return null;
  }

  /**
   * Vérifie si l'utilisateur a les droits ADMINISTRATOR sur la guild
   */
  private async checkGuildAdminPermission(
    userId: string,
    guildId: string,
  ): Promise<boolean> {
    try {
      // Récupérer le token Discord de l'utilisateur
      const userToken = await this.discordToken.getDiscordAccessToken(userId);

      if (!userToken) {
        this.logger.warn(`No Discord token found for user ${userId}`);
        return false;
      }

      // Récupérer TOUTES les guilds de l'utilisateur
      const endpoint =
        typeof DISCORD_ENDPOINTS.CURRENT_USER_GUILDS === 'function'
          ? DISCORD_ENDPOINTS.CURRENT_USER_GUILDS()
          : DISCORD_ENDPOINTS.CURRENT_USER_GUILDS;

      const guilds = await this.discordApi.get<
        Array<{
          id: string;
          name: string;
          owner: boolean;
          permissions: string;
        }>
      >(endpoint, {
        rateLimitKey: `user:${userId}:guilds:list`,
        customToken: userToken,
        useAuth: true,
      });

      // Chercher la guild spécifique dans la liste
      const guild = guilds.find((g) => g.id === guildId);

      if (!guild) {
        this.logger.debug(`User ${userId} is not a member of guild ${guildId}`);
        return false;
      }

      // Vérifier si l'utilisateur est owner
      if (guild.owner === true) {
        this.logger.debug(`User ${userId} is owner of guild ${guildId}`);
        return true;
      }

      // Vérifier la permission ADMINISTRATOR (0x8)
      const ADMINISTRATOR_PERMISSION = 0x8;
      const permissions = BigInt(guild.permissions);
      const hasAdmin =
        (permissions & BigInt(ADMINISTRATOR_PERMISSION)) !== BigInt(0);

      if (hasAdmin) {
        this.logger.debug(
          `User ${userId} has ADMINISTRATOR permission on guild ${guildId}`,
        );
      } else {
        this.logger.debug(
          `User ${userId} does NOT have ADMINISTRATOR permission on guild ${guildId}`,
        );
      }

      return hasAdmin;
    } catch (error: any) {
      // Si l'utilisateur n'a pas accès à la guild, Discord retourne 404 ou 403
      this.logger.warn(
        `Failed to check permissions for user ${userId} on guild ${guildId}: ${error.message}`,
      );
      return false;
    }
  }
}
