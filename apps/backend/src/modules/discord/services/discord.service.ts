import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  DiscordUserDto,
  DiscordGuildDto,
  DiscordPingResultDto,
  DiscordGatewayDto,
} from '@my-project/shared-types';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private readonly botToken: string | null;
  private readonly discordApiUrl = 'https://discord.com/api/v10';

  constructor(private configService: ConfigService) {
    this.botToken = this.configService.get<string>('DISCORD_BOT_TOKEN') || null;
  }

  /**
   * Headers pour les requêtes Discord API avec le token du bot
   */
  private getBotHeaders(): Record<string, string> {
    if (!this.botToken) {
      throw new HttpException(
        'Discord bot token not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      Authorization: `Bot ${this.botToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'MyDiscordApp/1.0.0',
    };
  }

  /**
   * Headers pour les requêtes Discord API avec le token utilisateur
   */
  private getUserHeaders(userToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'MyDiscordApp/1.0.0',
    };
  }

  /**
   * Effectue une requête à l'API Discord avec gestion d'erreurs centralisée
   */
  private async makeDiscordRequest<T>(
    endpoint: string,
    headers: Record<string, string>,
  ): Promise<T> {
    try {
      const url = `${this.discordApiUrl}${endpoint}`;
      this.logger.debug(`Making Discord API request: ${url}`);

      const response = await fetch(url, {
        headers,
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Discord API Error ${response.status}: ${errorText}`);

        throw new HttpException(
          `Discord API Error: ${response.status} ${response.statusText}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const data = (await response.json()) as T;
      this.logger.debug(`Discord API request successful: ${endpoint}`);

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Discord API request failed:', error);
      throw new HttpException(
        'Failed to fetch data from Discord API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Test de ping simple à l'API Discord (endpoint public)
   * Garde le format Result car c'est un endpoint de diagnostic avec métadonnées
   */
  async ping(): Promise<DiscordPingResultDto> {
    const startTime = Date.now();

    try {
      this.logger.log('Testing Discord API connectivity...');

      const gateway = await this.makeDiscordRequest<DiscordGatewayDto>(
        '/gateway',
        {
          'User-Agent': 'MyDiscordApp/1.0.0',
        },
      );

      const latency = Date.now() - startTime;

      this.logger.log(`Discord API ping successful - Latency: ${latency}ms`);

      return {
        success: true,
        latency,
        gateway: gateway.url,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage =
        error instanceof HttpException ? error.message : 'Unknown error';

      this.logger.error(
        `Discord API ping failed after ${latency}ms: ${errorMessage}`,
      );

      return {
        success: false,
        latency,
        error: errorMessage,
      };
    }
  }

  /**
   * Récupère les informations de l'utilisateur Discord connecté
   * Retourne directement l'utilisateur ou lance une exception
   */
  async getAuthenticatedUser(userToken: string): Promise<DiscordUserDto> {
    this.logger.log('Fetching authenticated Discord user...');

    return this.makeDiscordRequest<DiscordUserDto>(
      '/users/@me',
      this.getUserHeaders(userToken),
    );
  }

  /**
   * Récupère les informations d'un utilisateur Discord par son ID
   * Utilise le token du bot
   */
  async getUser(userId: string): Promise<DiscordUserDto> {
    this.logger.log(`Fetching Discord user info for ID: ${userId}`);

    return this.makeDiscordRequest<DiscordUserDto>(
      `/users/${userId}`,
      this.getBotHeaders(),
    );
  }

  /**
   * Récupère les serveurs Discord de l'utilisateur
   * Retourne directement les guilds ou lance une exception
   */
  async getUserGuilds(userToken: string): Promise<DiscordGuildDto[]> {
    this.logger.log('Fetching user Discord guilds...');

    const guildsFromApi = await this.makeDiscordRequest<
      Array<{
        id: string;
        name: string;
        icon: string | null;
        owner: boolean;
        permissions: string;
        features: string[];
        approximate_member_count?: number;
      }>
    >('/users/@me/guilds', this.getUserHeaders(userToken));

    // Transformer les données de l'API en DTOs avec les infos calculées
    const guilds = guildsFromApi.map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      iconUrl: this.formatGuildIcon(guild),
      owner: guild.owner,
      permissions: guild.permissions,
      hasAdminRights: this.hasAdminPermissions(guild),
      memberCount: guild.approximate_member_count,
      features: guild.features,
    }));

    this.logger.log(`Found ${guilds.length} guilds`);
    return guilds;
  }

  /**
   * Récupère seulement les serveurs où l'utilisateur a des droits admin
   */
  async getUserAdminGuilds(userToken: string): Promise<DiscordGuildDto[]> {
    const allGuilds = await this.getUserGuilds(userToken);
    const adminGuilds = allGuilds.filter((guild) => guild.hasAdminRights);

    this.logger.log(`Found ${adminGuilds.length} guilds with admin rights`);
    return adminGuilds;
  }

  /**
   * Vérifie si l'utilisateur a des permissions d'administration sur un serveur
   */
  private hasAdminPermissions(guild: {
    owner: boolean;
    permissions: string;
  }): boolean {
    if (guild.owner) {
      return true;
    }

    const permissions = BigInt(guild.permissions);
    const ADMINISTRATOR = BigInt(0x8);
    const MANAGE_GUILD = BigInt(0x20);

    return (
      (permissions & ADMINISTRATOR) === ADMINISTRATOR ||
      (permissions & MANAGE_GUILD) === MANAGE_GUILD
    );
  }

  /**
   * Utilitaire pour formater l'icône d'un serveur Discord
   */
  private formatGuildIcon(guild: {
    id: string;
    icon: string | null;
  }): string | null {
    if (!guild.icon) return null;
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
  }

  /**
   * Utilitaire pour formater l'avatar d'un utilisateur Discord
   */
  formatUserAvatar(user: DiscordUserDto): string {
    if (user.avatar) {
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
    }

    const defaultAvatarNum = parseInt(user.discriminator) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNum}.png`;
  }
}
