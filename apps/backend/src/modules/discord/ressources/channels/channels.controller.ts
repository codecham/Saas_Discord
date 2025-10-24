/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseFilters,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { DiscordExceptionFilter } from '../../common/filters/discord-exception.filter';
import { DiscordResponseInterceptor } from '../../common/interceptors/discord-response.interceptor';

/**
 * Controller pour les endpoints liés aux channels Discord
 */
@Controller('discord/channels')
@UseFilters(DiscordExceptionFilter)
@UseInterceptors(DiscordResponseInterceptor)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  /**
   * GET /discord/channels/:channelId
   * Récupère les informations d'un channel
   */
  @Get(':channelId')
  async getChannel(@Param('channelId') channelId: string) {
    return this.channelsService.getChannel(channelId);
  }

  /**
   * PATCH /discord/channels/:channelId
   * Modifie un channel
   */
  @Patch(':channelId')
  async modifyChannel(
    @Param('channelId') channelId: string,
    @Body() data: any,
  ) {
    return this.channelsService.modifyChannel(channelId, data);
  }

  /**
   * DELETE /discord/channels/:channelId
   * Supprime un channel
   */
  @Delete(':channelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteChannel(@Param('channelId') channelId: string) {
    return this.channelsService.deleteChannel(channelId);
  }

  /**
   * GET /discord/channels/:channelId/messages
   * Récupère les messages d'un channel
   */
  @Get(':channelId/messages')
  async getChannelMessages(
    @Param('channelId') channelId: string,
    @Query('around') around?: string,
    @Query('before') before?: string,
    @Query('after') after?: string,
    @Query('limit') limit?: number,
  ) {
    return this.channelsService.getChannelMessages(channelId, {
      around,
      before,
      after,
      limit,
    });
  }

  /**
   * POST /discord/channels/:channelId/messages
   * Crée un message dans un channel
   */
  @Post(':channelId/messages')
  @HttpCode(HttpStatus.CREATED)
  async createMessage(
    @Param('channelId') channelId: string,
    @Body() data: any,
  ) {
    return this.channelsService.createMessage(channelId, data);
  }

  /**
   * POST /discord/channels/:channelId/messages/bulk-delete
   * Supprime plusieurs messages en une seule fois
   */
  // @Post(':channelId/messages/bulk-delete')
  // @HttpCode(HttpStatus.NO_CONTENT)
  // async bulkDeleteMessages(
  //   @Param('channelId') channelId: string,
  //   @Body('messages') messageIds: string[],
  // ) {
  //   return this.channelsService.bulkDeleteMessages(channelId, messageIds);
  // }

  /**
   * GET /discord/channels/:channelId/messages/:messageId
   * Récupère un message spécifique
   */
  @Get(':channelId/messages/:messageId')
  async getChannelMessage(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.channelsService.getChannelMessage(channelId, messageId);
  }

  /**
   * PATCH /discord/channels/:channelId/messages/:messageId
   * Modifie un message
   */
  @Patch(':channelId/messages/:messageId')
  async editMessage(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @Body() data: any,
  ) {
    return this.channelsService.editMessage(channelId, messageId, data);
  }

  /**
   * DELETE /discord/channels/:channelId/messages/:messageId
   * Supprime un message
   */
  @Delete(':channelId/messages/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.channelsService.deleteMessage(channelId, messageId);
  }

  /**
   * PUT /discord/channels/:channelId/permissions/:overwriteId
   * Modifie les permissions d'un channel
   */
  @Put(':channelId/permissions/:overwriteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async editChannelPermissions(
    @Param('channelId') channelId: string,
    @Param('overwriteId') overwriteId: string,
    @Body() data: any,
  ) {
    return this.channelsService.editChannelPermissions(
      channelId,
      overwriteId,
      data,
    );
  }

  /**
   * DELETE /discord/channels/:channelId/permissions/:overwriteId
   * Supprime les permissions d'un channel
   */
  @Delete(':channelId/permissions/:overwriteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteChannelPermission(
    @Param('channelId') channelId: string,
    @Param('overwriteId') overwriteId: string,
  ) {
    return this.channelsService.deleteChannelPermission(channelId, overwriteId);
  }

  /**
   * GET /discord/channels/:channelId/invites
   * Récupère les invitations d'un channel
   */
  @Get(':channelId/invites')
  async getChannelInvites(@Param('channelId') channelId: string) {
    return this.channelsService.getChannelInvites(channelId);
  }

  /**
   * POST /discord/channels/:channelId/invites
   * Crée une invitation pour un channel
   */
  @Post(':channelId/invites')
  @HttpCode(HttpStatus.CREATED)
  async createChannelInvite(
    @Param('channelId') channelId: string,
    @Body() data?: any,
  ) {
    return this.channelsService.createChannelInvite(channelId, data);
  }

  /**
   * GET /discord/channels/:channelId/pins
   * Récupère les messages épinglés d'un channel
   */
  @Get(':channelId/pins')
  async getPinnedMessages(@Param('channelId') channelId: string) {
    return this.channelsService.getPinnedMessages(channelId);
  }

  /**
   * PUT /discord/channels/:channelId/pins/:messageId
   * Épingle un message
   */
  @Put(':channelId/pins/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async pinMessage(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.channelsService.pinMessage(channelId, messageId);
  }

  /**
   * DELETE /discord/channels/:channelId/pins/:messageId
   * Désépingle un message
   */
  @Delete(':channelId/pins/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unpinMessage(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.channelsService.unpinMessage(channelId, messageId);
  }

  /**
   * GET /discord/channels/:channelId/webhooks
   * Récupère les webhooks d'un channel
   */
  @Get(':channelId/webhooks')
  async getChannelWebhooks(@Param('channelId') channelId: string) {
    return this.channelsService.getChannelWebhooks(channelId);
  }

  /**
   * POST /discord/channels/:channelId/webhooks
   * Crée un webhook dans un channel
   */
  @Post(':channelId/webhooks')
  @HttpCode(HttpStatus.CREATED)
  async createWebhook(
    @Param('channelId') channelId: string,
    @Body() data: any,
  ) {
    return this.channelsService.createWebhook(channelId, data);
  }

  /**
   * POST /discord/channels/:channelId/typing
   * Déclenche l'indicateur de saisie
   */
  @Post(':channelId/typing')
  @HttpCode(HttpStatus.NO_CONTENT)
  async triggerTypingIndicator(@Param('channelId') channelId: string) {
    return this.channelsService.triggerTypingIndicator(channelId);
  }
}
