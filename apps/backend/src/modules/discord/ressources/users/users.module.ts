import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../../../auth/auth.module';

/**
 * Module pour la gestion des utilisateurs Discord
 */
@Module({
  imports: [AuthModule], // Import pour avoir accès à DiscordTokenService
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class DiscordUsersModule {}
