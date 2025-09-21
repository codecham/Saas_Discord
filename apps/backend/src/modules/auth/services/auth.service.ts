import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { AuthJwtService } from './jwt.service';
import type {
  RegisterDto,
  AuthResponseDto,
  RefreshTokenDto,
} from '@my-project/shared-types';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: AuthJwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    try {
      const user = await this.usersService.create(dto);
      // Récupérer l'utilisateur complet pour générer les tokens
      const fullUser = await this.usersService.findByEmail(user.email);

      if (!fullUser) {
        throw new Error('User creation failed');
      }

      return this.jwtService.generateTokens(fullUser);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error?.code === 'P2002') {
        // Prisma unique constraint error
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async login(user: User): Promise<AuthResponseDto> {
    // L'utilisateur est déjà validé par LocalStrategy
    const fullUser = await this.usersService.findByEmail(user.email);

    if (!fullUser) {
      throw new UnauthorizedException('User not found');
    }

    return this.jwtService.generateTokens(fullUser);
  }

  async refreshTokens(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    try {
      return await this.jwtService.refreshTokens(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    await this.jwtService.revokeRefreshToken(refreshToken);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.jwtService.revokeAllUserTokens(userId);
  }
}
