/* eslint-disable @typescript-eslint/require-await */
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import express from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { DiscordOAuthService } from '../services/discord-oauth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import * as sharedTypes from '@my-project/shared-types';
import { OAuthSessionService } from '../services/oauth-session.service';

/**
 * Interface pour la requête d'échange de session
 */
interface ExchangeSessionDTO {
  sessionId: string;
}

/**
 * Contrôleur d'authentification
 */
@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly authService: AuthService,
    private readonly oauthSessionService: OAuthSessionService,
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
  async discordAuth(@Res() res: express.Response) {
    // 🔒 MODIFIÉ: getAuthorizationUrl() est maintenant async et génère un state
    const discordAuthUrl = await this.discordOAuth.getAuthorizationUrl();
    return res.redirect(discordAuthUrl);
  }

  /**
   * GET /api/auth/discord/callback
   * Callback Discord OAuth
   *
   * 🔒 SÉCURISÉ:
   * - Valide le state CSRF
   * - Ne retourne PLUS les tokens dans l'URL
   * - Crée une session temporaire dans Redis
   */
  @Get('discord/callback')
  async discordCallback(
    @Query('code') code: string,
    @Query('state') state: string, // 👈 NOUVEAU
    @Res() res: express.Response,
  ) {
    try {
      if (!code) {
        this.logger.error('No code provided in Discord callback');
        return res.redirect(
          `${this.frontendUrl}/auth/error?error=missing_code`,
        );
      }

      // 🔒 NOUVEAU: Valider le state CSRF
      if (!state) {
        this.logger.error('No state provided in Discord callback');
        return res.redirect(
          `${this.frontendUrl}/auth/error?error=missing_state`,
        );
      }

      try {
        await this.oauthSessionService.validateState(state);
      } catch (error) {
        this.logger.error('State validation failed', error);
        return res.redirect(
          `${this.frontendUrl}/auth/error?error=invalid_state`,
        );
      }

      // Échanger le code Discord contre nos tokens JWT
      const authResponse = await this.authService.handleDiscordCallback(code);

      // 🔒 Créer une session temporaire dans Redis
      const sessionId = await this.oauthSessionService.createSession(
        authResponse.accessToken,
        authResponse.refreshToken,
        authResponse.user.id,
      );

      // Rediriger avec SEULEMENT le sessionId (pas les tokens)
      this.logger.log(`Redirecting to frontend with sessionId: ${sessionId}`);
      return res.redirect(
        `${this.frontendUrl}/auth/callback?session=${sessionId}`,
      );
    } catch (error) {
      this.logger.error('Error in Discord callback', error);
      return res.redirect(
        `${this.frontendUrl}/auth/error?error=authentication_failed`,
      );
    }
  }

  /**
   * POST /api/auth/exchange-session
   * 🔒 NOUVEAU: Échange un sessionId contre les tokens JWT
   *
   * La session est détruite après utilisation (one-time use)
   *
   * @param body { sessionId: string }
   * @returns { access_token, refresh_token, user }
   */
  @Post('exchange-session')
  @HttpCode(HttpStatus.OK)
  async exchangeSession(@Body() body: ExchangeSessionDTO) {
    const { sessionId } = body;

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Échanger le sessionId contre les tokens
    const session = await this.oauthSessionService.exchangeSession(sessionId);

    // Récupérer les infos utilisateur
    const user = await this.authService.getCurrentUser(session.userId);

    return {
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
      user,
    };
  }

  /**
   * POST /api/auth/refresh
   * Refresh les tokens JWT
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: sharedTypes.RefreshTokenRequestDTO,
  ): Promise<sharedTypes.RefreshTokenResponseDTO> {
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
  async getCurrentUser(
    @CurrentUser('id') userId: string,
  ): Promise<sharedTypes.UserDTO> {
    return this.authService.getCurrentUser(userId);
  }

  /**
   * GET /api/auth/status
   * Vérifie si l'utilisateur est connecté
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(
    @CurrentUser() user: any,
  ): Promise<sharedTypes.AuthStatusDTO> {
    return {
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  /**
   * GET /api/auth/health
   * 🔒 NOUVEAU: Health check pour Redis et les sessions
   */
  @Get('health')
  async healthCheck() {
    const redisHealth = await this.oauthSessionService.healthCheck();

    return {
      status: redisHealth.connected ? 'healthy' : 'unhealthy',
      redis: redisHealth,
      timestamp: new Date().toISOString(),
    };
  }
}
