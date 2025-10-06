/* eslint-disable @typescript-eslint/require-await */
import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { DiscordOAuthService } from '../services/discord-oauth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  RefreshTokenResponseDTO,
  UserDTO,
  AuthStatusDTO,
} from '@my-project/shared-types';
import type { RefreshTokenRequestDTO } from '@my-project/shared-types';
import { CurrentUser } from '../decorators/current-user.decorator';

/**
 * Controller pour l'authentification Discord OAuth
 */
@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly authService: AuthService,
    private readonly discordOAuth: DiscordOAuthService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
  }

  /**
   * GET /api/auth/discord
   * Redirige vers Discord OAuth
   */
  @Get('discord')
  discordLogin(@Res() res: Response) {
    const authUrl = this.discordOAuth.getAuthorizationUrl();
    this.logger.log('Redirecting to Discord OAuth');
    return res.redirect(authUrl);
  }

  /**
   * GET /api/auth/discord/callback
   * Callback Discord OAuth
   */
  @Get('discord/callback')
  async discordCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    // Gérer les erreurs OAuth
    if (error) {
      this.logger.error(`Discord OAuth error: ${error}`);
      return res.redirect(`${this.frontendUrl}/auth/error?error=${error}`);
    }

    if (!code) {
      this.logger.error('No code provided in Discord callback');
      return res.redirect(`${this.frontendUrl}/auth/error?error=no_code`);
    }

    try {
      // Authentifier l'utilisateur
      const authResponse = await this.authService.handleDiscordCallback(code);

      // Rediriger vers le frontend avec les tokens
      const params = new URLSearchParams({
        access_token: authResponse.accessToken,
        refresh_token: authResponse.refreshToken,
      });

      return res.redirect(
        `${this.frontendUrl}/auth/callback?${params.toString()}`,
      );
    } catch (error) {
      this.logger.error('Error in Discord callback', error);
      return res.redirect(
        `${this.frontendUrl}/auth/error?error=authentication_failed`,
      );
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh les tokens JWT
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: RefreshTokenRequestDTO,
  ): Promise<RefreshTokenResponseDTO> {
    if (!body.refresh_token) {
      throw new Error('Refresh token required');
    }

    return this.authService.refreshTokens(body.refresh_token);
  }

  /**
   * POST /api/auth/logout
   * Déconnexion
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser('id') userId: string,
    @Body('refresh_token') refreshToken?: string,
  ) {
    await this.authService.logout(userId, refreshToken);
  }

  /**
   * POST /api/auth/logout-all
   * Déconnexion de tous les appareils
   */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@CurrentUser('id') userId: string) {
    await this.authService.logout(userId);
  }

  /**
   * GET /api/auth/me
   * Récupère l'utilisateur actuel
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser('id') userId: string): Promise<UserDTO> {
    return this.authService.getCurrentUser(userId);
  }

  /**
   * GET /api/auth/status
   * Vérifie si l'utilisateur est connecté
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@CurrentUser() user: any): Promise<AuthStatusDTO> {
    return {
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }
}
