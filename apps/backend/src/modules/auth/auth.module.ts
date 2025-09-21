import { Module, DynamicModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Services
import { AuthService } from './services/auth.service';
import { AuthJwtService } from './services/jwt.service';
import { OAuthConfigService } from './config/oauth.config';

// Strategies
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { DiscordStrategy } from './strategies/discord.strategy';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { OAuthController } from './controllers/oauth.controller';

// Modules
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({})
export class AuthModule {
  static forRoot(): DynamicModule {
    return {
      module: AuthModule,
      imports: [
        UsersModule,
        PrismaModule,
        PassportModule,
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET'),
            signOptions: {
              expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
            },
          }),
          inject: [ConfigService],
        }),
      ],
      controllers: [AuthController, OAuthController],
      providers: [
        AuthService,
        AuthJwtService,
        OAuthConfigService,
        LocalStrategy,
        JwtStrategy,
        GoogleStrategy,
        DiscordStrategy,
        // Providers OAuth conditionnels
      ],
      exports: [AuthService, AuthJwtService, OAuthConfigService],
    };
  }
}
