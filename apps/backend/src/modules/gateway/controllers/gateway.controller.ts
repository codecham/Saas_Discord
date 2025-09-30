import { Controller, Get, Logger } from '@nestjs/common';
import { GatewayClientService } from '../services/gatewayClient.service';

@Controller('/api/gateway')
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);

  constructor(private readonly gatewayClientService: GatewayClientService) {}

  @Get('ping')
  // eslint-disable-next-line @typescript-eslint/require-await
  async pingBot() {
    const botId = process.env.BOT_COMMAND_ID || '0';
    try {
      // Envoyer un message de ping au bot via la gateway
      const sent = this.gatewayClientService.sendToBot(botId, {
        type: 'ping',
        message: 'Ping depuis le backend!',
        timestamp: new Date().toISOString(),
      });

      if (sent) {
        return {
          success: true,
          message: 'Ping envoyé au bot via la gateway',
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          success: false,
          message: 'Gateway non connectée ou bot non trouvé',
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Erreur: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
