import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { MemberTransformer } from '../../transformers/member.transformer';

/**
 * Module pour la gestion des membres des guilds Discord
 */
@Module({
  controllers: [MembersController],
  providers: [MembersService, MemberTransformer],
  exports: [MembersService, MemberTransformer],
})
export class DiscordMembersModule {}
