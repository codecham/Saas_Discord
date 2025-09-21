import {
  Controller,
  Get,
  UseGuards,
  Request,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthJwtService } from '../services/jwt.service';
import { ConfigService } from '@nestjs/config';
import { OAuthConfigService } from '../config/oauth.config';
import type { AuthenticatedRequest } from '../interfaces/auth-request.interface';

@Controller('api/auth')
export class OAuthController {
  constructor(
    private readonly jwtService: AuthJwtService,
    private readonly configService: ConfigService,
    private readonly oauthConfig: OAuthConfigService,
  ) {}

  // Google OAuth
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(): Promise<void> {
    if (!this.oauthConfig.isProviderEnabled('google')) {
      throw new BadRequestException('Google OAuth is not enabled');
    }
    // Déclenche la redirection vers Google
    await Promise.resolve(); //PLACEHOLDER - NEED TO DELETE
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const tokens = await this.jwtService.generateTokens(req.user);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`;

    res.redirect(redirectUrl);
  }

  // Discord OAuth
  @Get('discord')
  @UseGuards(AuthGuard('discord'))
  async discordAuth(): Promise<void> {
    if (!this.oauthConfig.isProviderEnabled('discord')) {
      throw new BadRequestException('Discord OAuth is not enabled');
    }
    // Déclenche la redirection vers Discord
    await Promise.resolve(); //PLACEHOLDER - NEED TO DELETE
  }

  @Get('discord/callback')
  @UseGuards(AuthGuard('discord'))
  async discordCallback(
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const tokens = await this.jwtService.generateTokens(req.user);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`;

    res.redirect(redirectUrl);
  }

  // Endpoint pour lister les providers disponibles
  @Get('providers')
  getAvailableProviders(): { providers: string[] } {
    return {
      providers: this.oauthConfig.getEnabledProviders(),
    };
  }
}
