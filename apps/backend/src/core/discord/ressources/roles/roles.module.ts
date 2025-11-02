import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { RoleTransformer } from '../../transformers/role.transformer';

/**
 * Module pour la gestion des rôles Discord
 */
@Module({
  controllers: [RolesController],
  providers: [RolesService, RoleTransformer],
  exports: [RolesService, RoleTransformer],
})
export class DiscordRolesModule {}
