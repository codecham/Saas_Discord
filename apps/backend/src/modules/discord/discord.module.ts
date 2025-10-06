import { Module } from '@nestjs/common';
import { DiscordCoreModule } from './core/discord-core.module';
import { DiscordGuildsModule } from './ressources/guilds/guilds.module';
import { DiscordChannelsModule } from './ressources/channels/channels.module';
import { DiscordUsersModule } from './ressources/users/users.module';
import { DiscordMembersModule } from './ressources/members/members.module';
import { DiscordRolesModule } from './ressources/roles/roles.module';
import { BansController } from './ressources/ban/ban.controller';

/**
 * Module principal Discord
 * Importe le module core et tous les modules de ressources
 */
@Module({
  imports: [
    DiscordCoreModule,
    DiscordGuildsModule,
    DiscordChannelsModule,
    DiscordUsersModule,
    DiscordMembersModule,
    DiscordRolesModule,
  ],
  controllers: [BansController], // BansController utilise MembersService
  exports: [
    DiscordCoreModule,
    DiscordGuildsModule,
    DiscordChannelsModule,
    DiscordUsersModule,
    DiscordMembersModule,
    DiscordRolesModule,
  ],
})
export class DiscordModule {}
