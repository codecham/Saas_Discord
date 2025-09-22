import {
  Controller,
  Get,
  UseGuards,
  Request,
  Logger,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DiscordService } from '../services/discord.service';
import { UserDto } from '@my-project/shared-types';
import type {
  DiscordPingResultDto,
  DiscordUserDto,
  DiscordGuildDto,
} from '@my-project/shared-types';

// Interface pour typer la requête authentifiée
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string | null;
    accounts?: Array<{
      provider: string;
      accessToken: string | null;
      providerAccountId: string;
    }>;
  };
}

@Controller('/api/discord')
export class DiscordController {
  private readonly logger = new Logger(DiscordController.name);

  constructor(private readonly discordService: DiscordService) {}

  /**
   * Test de ping simple à l'API Discord (pas d'auth requise)
   * GET /api/discord/ping
   */
  @Get('ping')
  async ping(): Promise<DiscordPingResultDto> {
    this.logger.log('Discord ping endpoint called');
    return await this.discordService.ping();
  }

  /**
   * Récupère les infos de l'utilisateur Discord connecté
   * GET /api/discord/user
   */
  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getAuthenticatedUser(
    @Request() req: AuthenticatedRequest,
  ): Promise<DiscordUserDto> {
    this.logger.log(`Getting Discord user info for: ${req.user.email}`);

    const discordAccount = req.user.accounts?.find(
      (account) => account.provider === 'discord',
    );

    if (!discordAccount?.accessToken) {
      // NestJS transformera automatiquement cette exception en réponse HTTP 400
      throw new Error('No Discord account linked or token expired');
    }

    return await this.discordService.getAuthenticatedUser(
      discordAccount.accessToken,
    );
  }

  /**
   * Récupère les informations d'un utilisateur Discord par son ID (bot token)
   * GET /api/discord/user/:userId
   */
  @Get('user/:userId')
  async getDiscordUser(
    @Param('userId') userId: string,
  ): Promise<DiscordUserDto & { avatarUrl: string }> {
    this.logger.log(`Getting Discord user info for ID: ${userId}`);

    const user = await this.discordService.getUser(userId);
    const avatarUrl = this.discordService.formatUserAvatar(user);

    return {
      ...user,
      avatarUrl,
    };
  }

  /**
   * Récupère tous les serveurs de l'utilisateur Discord connecté
   * GET /api/discord/guilds
   */
  @UseGuards(JwtAuthGuard)
  @Get('guilds')
  async getUserGuilds(
    @Request() req: AuthenticatedRequest,
  ): Promise<DiscordGuildDto[]> {
    this.logger.log(`Getting Discord guilds for user: ${req.user.email}`);

    const discordAccount = req.user.accounts?.find(
      (account) => account.provider === 'discord',
    );

    if (!discordAccount?.accessToken) {
      throw new Error('No Discord account linked or token expired');
    }

    return await this.discordService.getUserGuilds(discordAccount.accessToken);
  }

  /**
   * Récupère seulement les serveurs où l'utilisateur a des droits admin
   * GET /api/discord/guilds/admin
   */
  @UseGuards(JwtAuthGuard)
  @Get('guilds/admin')
  async getUserAdminGuilds(
    @Request() req: AuthenticatedRequest,
  ): Promise<DiscordGuildDto[]> {
    this.logger.log(`Getting Discord admin guilds for user: ${req.user.email}`);

    const discordAccount = req.user.accounts?.find(
      (account) => account.provider === 'discord',
    );

    if (!discordAccount?.accessToken) {
      throw new Error('No Discord account linked or token expired');
    }

    return await this.discordService.getUserAdminGuilds(
      discordAccount.accessToken,
    );
  }

  /**
   * Info sur l'utilisateur connecté de notre app (pour debug)
   * GET /api/discord/debug/user-info
   */
  @UseGuards(JwtAuthGuard)
  @Get('debug/user-info')
  getUserInfo(@Request() req: AuthenticatedRequest): UserDto & {
    linkedAccounts: Array<{
      provider: string;
      hasToken: boolean;
      providerId: string;
    }>;
  } {
    return {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name || '',
      role: 'USER', // Valeur par défaut, tu peux ajuster selon ton modèle
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      linkedAccounts:
        req.user.accounts?.map((account) => ({
          provider: account.provider,
          hasToken: !!account.accessToken,
          providerId: account.providerAccountId,
        })) || [],
    };
  }
}
