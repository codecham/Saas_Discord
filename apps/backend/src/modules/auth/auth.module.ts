import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { DiscordOAuthService } from './services/discord-oauth.service';
import { DiscordTokenService } from './services/discord-token.service';
import { EncryptionService } from './services/encryption.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtOptionalGuard } from './guards/jwt-optional.guard';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Module d'authentification Discord OAuth
 */
@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn:
            configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    DiscordOAuthService,
    DiscordTokenService,
    EncryptionService,
    JwtStrategy,
    JwtAuthGuard,
    JwtOptionalGuard,
  ],
  exports: [
    AuthService,
    DiscordTokenService,
    EncryptionService,
    JwtAuthGuard,
    JwtOptionalGuard,
  ],
})
export class AuthModule {}
