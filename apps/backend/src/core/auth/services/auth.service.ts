import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { DiscordOAuthService } from './discord-oauth.service';
import { DiscordTokenService } from './discord-token.service';
import {
  LoginResponseDTO,
  UserDTO,
  JwtPayloadDTO,
  UserRole,
} from '@my-project/shared-types';
import * as crypto from 'crypto';
import { InternalTokenRefreshResult } from 'src/core/interfaces/InternalTokenRefreshResult.interface';

/**
 * Service principal d'authentification
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokenExpiration: string;
  private readonly refreshTokenExpiration: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly discordOAuth: DiscordOAuthService,
    private readonly discordToken: DiscordTokenService,
  ) {
    this.accessTokenExpiration =
      this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m';
    this.refreshTokenExpiration =
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';
  }

  /**
   * Traite le callback Discord OAuth
   */
  async handleDiscordCallback(code: string): Promise<LoginResponseDTO> {
    // 1. Échanger le code contre des tokens Discord
    const tokens = await this.discordOAuth.exchangeCode(code);

    // 2. Récupérer les infos utilisateur Discord
    const discordUser = await this.discordOAuth.getDiscordUser(
      tokens.access_token,
    );

    // 3. Créer ou mettre à jour l'utilisateur en DB
    const user = await this.discordOAuth.upsertUser(discordUser, tokens);

    // 4. Générer les JWT pour notre app
    const { accessToken, refreshToken } = await this.generateTokens(user);

    this.logger.log(`User ${user.username} logged in successfully`);

    const userDTO: UserDTO = {
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      discriminator: user.discriminator,
      globalName: user.globalName,
      avatar: user.avatar,
      email: user.email,
      role: user.role as UserRole,
    };

    return {
      accessToken,
      refreshToken,
      user: userDTO,
    };
  }

  /**
   * Génère les tokens JWT (access + refresh)
   */
  private async generateTokens(user: any): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload: JwtPayloadDTO = {
      sub: user.id,
      discordId: user.discordId,
      username: user.username,
      role: user.role,
    };

    // Générer access token
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiration,
    });

    // Générer refresh token
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.refreshTokenExpiration,
    });

    // Stocker le refresh token en DB
    await this.storeRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  /**
   * Stocke un refresh token en DB
   */
  private async storeRefreshToken(
    userId: string,
    token: string,
  ): Promise<void> {
    // Hasher le token avant de le stocker
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Calculer la date d'expiration
    const expiresAt = new Date();
    const days = parseInt(this.refreshTokenExpiration.replace('d', ''));
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: {
        token: hashedToken,
        userId,
        expiresAt,
      },
    });
  }

  /**
   * Refresh les tokens JWT
   */
  async refreshTokens(
    refreshToken: string,
  ): Promise<InternalTokenRefreshResult> {
    try {
      // Vérifier le refresh token
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      // Vérifier que le token existe en DB
      const hashedToken = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: hashedToken },
        include: { user: true },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Vérifier l'expiration
      if (storedToken.expiresAt < new Date()) {
        await this.prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
        throw new UnauthorizedException('Refresh token expired');
      }

      // Supprimer l'ancien refresh token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      // Générer de nouveaux tokens
      const newTokens = await this.generateTokens(storedToken.user);

      return {
        access_token: newTokens.accessToken,
        refresh_token: newTokens.refreshToken,
      };
    } catch (error) {
      this.logger.error('Error refreshing tokens', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Déconnexion
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    // Supprimer le refresh token spécifique ou tous les tokens de l'utilisateur
    if (refreshToken) {
      const hashedToken = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          token: hashedToken,
        },
      });
    } else {
      // Logout de tous les appareils
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }

    // Invalider le cache du token Discord
    this.discordToken.invalidateCache(userId);

    this.logger.log(`User ${userId} logged out`);
  }

  /**
   * Récupère l'utilisateur actuel
   */
  async getCurrentUser(userId: string): Promise<UserDTO> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        discordId: true,
        username: true,
        discriminator: true,
        globalName: true,
        avatar: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      discriminator: user.discriminator,
      globalName: user.globalName,
      avatar: user.avatar,
      email: user.email,
      role: user.role as any,
      createdAt: user.createdAt.toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      lastLoginAt: user.lastLoginAt.toISOString(),
    };
  }

  /**
   * Valide un JWT payload
   */
  async validateUser(payload: JwtPayloadDTO): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        discordId: true,
        username: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }
}
