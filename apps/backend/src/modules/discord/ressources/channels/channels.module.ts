import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { ChannelTransformer } from '../../transformers/channel.transformer';

/**
 * Module pour la gestion des channels Discord
 */
@Module({
  controllers: [ChannelsController],
  providers: [ChannelsService, ChannelTransformer],
  exports: [ChannelsService, ChannelTransformer],
})
export class DiscordChannelsModule {}
