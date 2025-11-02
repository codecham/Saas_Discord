/* eslint-disable @typescript-eslint/require-await */
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import express from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { DiscordOAuthService } from '../services/discord-oauth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import * as sharedTypes from '@my-project/shared-types';
import { OAuthSessionService } from '../services/oauth-session.service';
// 🔒 AJOUT: Imports pour le rate limiting
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ExchangeSessionDTO } from '../dto/exchange-session.dto';

/**
 * Contrôleur d'authentification
 */
@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly frontendUrl: string;
  private readonly nodeEnv: string;

  constructor(
    private readonly authService: AuthService,
    private readonly oauthSessionService: OAuthSessionService,
    private readonly discordOAuth: DiscordOAuthService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    this.nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
  }

  /**
   * 🔒 Utilitaire: Configuration des cookies httpOnly
   */
  private getCookieOptions(): express.CookieOptions {
    return {
      httpOnly: true, // ✅ Pas accessible en JavaScript
      secure: this.nodeEnv === 'production', // ✅ HTTPS uniquement en prod
      sameSite: 'lax', // ✅ Protection CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      path: '/api/auth', // ✅ Limiter le scope aux endpoints auth
    };
  }

  /**
   * GET /api/auth/discord
   * Redirige vers Discord OAuth
   */
  @Get('discord')
  async discordAuth(@Res() res: express.Response) {
    const discordAuthUrl = await this.discordOAuth.getAuthorizationUrl();
    return res.redirect(discordAuthUrl);
  }

  /**
   * GET /api/auth/discord/callback
   * Callback Discord OAuth
   * 🔒 AJOUT: Rate limit modéré pour éviter les attaques sur le callback
   */
  @Get('discord/callback')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req/min
  async discordCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: express.Response,
  ) {
    try {
      if (!code) {
        this.logger.error('No code provided in Discord callback');
        return res.redirect(
          `${this.frontendUrl}/auth/error?error=missing_code`,
        );
      }

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

      const authResponse = await this.authService.handleDiscordCallback(code);

      const sessionId = await this.oauthSessionService.createSession(
        authResponse.accessToken,
        authResponse.refreshToken,
        authResponse.user.id,
      );

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
   * 🔒 MODIFIÉ: Échange un sessionId contre les tokens JWT + cookie httpOnly
   * 🔒 AJOUT: Rate limit strict + Validation stricte du sessionId
   */
  @Post('exchange-session')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req/min
  async exchangeSession(
    @Body() body: ExchangeSessionDTO, // ✅ DTO validé automatiquement
    @Res() res: express.Response,
  ) {
    // Plus besoin de vérifier sessionId manuellement, c'est fait par le ValidationPipe
    try {
      const session = await this.oauthSessionService.exchangeSession(
        body.sessionId,
      );
      const user = await this.authService.getCurrentUser(session.userId);

      // 🔒 NOUVEAU: Stocker le refresh token dans un cookie httpOnly
      res.cookie(
        'refresh_token',
        session.refreshToken,
        this.getCookieOptions(),
      );

      this.logger.log(
        `Session exchanged successfully for user ${user.id}, refresh token set in httpOnly cookie`,
      );

      // ✅ Retourner SEULEMENT l'access token et l'utilisateur
      return res.json({
        access_token: session.accessToken,
        user,
      });
    } catch (error) {
      this.logger.error('Failed to exchange session', error);
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  /**
   * POST /api/auth/refresh
   * 🔒 MODIFIÉ: Refresh les tokens JWT via cookie httpOnly
   * 🔒 AJOUT: Rate limit TRÈS strict: 5 req/min pour éviter les tentatives de vol de tokens
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 req/min - TRÈS STRICT
  async refresh(@Req() req: express.Request, @Res() res: express.Response) {
    // 🔒 NOUVEAU: Lire le refresh token depuis le cookie
    const refreshToken = req.cookies['refresh_token'];

    if (!refreshToken) {
      this.logger.warn('No refresh token found in cookies');
      throw new UnauthorizedException('No refresh token provided');
    }

    try {
      const tokens = await this.authService.refreshTokens(refreshToken);

      // 🔒 NOUVEAU: Mettre à jour le cookie avec le nouveau refresh token
      res.cookie(
        'refresh_token',
        tokens.refresh_token,
        this.getCookieOptions(),
      );

      this.logger.log(
        'Tokens refreshed successfully, new refresh token set in cookie',
      );

      // ✅ Retourner SEULEMENT le nouvel access token
      return res.json({
        access_token: tokens.access_token,
      });
    } catch (error) {
      this.logger.error('Token refresh failed', error);

      // 🔒 NOUVEAU: Supprimer le cookie invalide
      res.clearCookie('refresh_token', { path: '/api/auth' });

      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * POST /api/auth/logout
   * 🔒 MODIFIÉ: Déconnexion avec suppression du cookie
   * 🔒 AJOUT: Rate limit modéré: 20 req/min
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 req/min
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];

    try {
      await this.authService.logout(userId, refreshToken);
    } catch (error) {
      this.logger.warn('Logout failed but continuing', error);
    }

    // 🔒 NOUVEAU: Supprimer le cookie
    res.clearCookie('refresh_token', { path: '/api/auth' });

    this.logger.log(`User ${userId} logged out, cookie cleared`);
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  /**
   * POST /api/auth/logout-all
   * 🔒 MODIFIÉ: Déconnexion de tous les appareils avec suppression du cookie
   * 🔒 AJOUT: Rate limit modéré: 20 req/min
   */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 req/min
  async logoutAll(
    @CurrentUser('id') userId: string,
    @Res() res: express.Response,
  ) {
    try {
      await this.authService.logout(userId);
    } catch (error) {
      this.logger.warn('Logout-all failed but continuing', error);
    }

    // 🔒 NOUVEAU: Supprimer le cookie
    res.clearCookie('refresh_token', { path: '/api/auth' });

    this.logger.log(
      `User ${userId} logged out from all devices, cookie cleared`,
    );
    return res.status(HttpStatus.NO_CONTENT).send();
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
   * Health check pour Redis et les sessions
   * 🔒 AJOUT: Pas de rate limit sur health check
   */
  @Get('health')
  @SkipThrottle() // Pas de limite sur health check
  async healthCheck() {
    const redisHealth = await this.oauthSessionService.healthCheck();

    return {
      status: redisHealth.connected ? 'healthy' : 'unhealthy',
      redis: redisHealth,
      timestamp: new Date().toISOString(),
    };
  }
}
