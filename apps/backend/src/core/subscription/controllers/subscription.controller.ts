import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SubscriptionService } from '../services/subscription.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * 💳 Subscription Controller (Core Service)
 *
 * Endpoints pour gérer les abonnements des guilds.
 *
 * NOTE: Ce contrôleur fait partie du core de l'application,
 * pas des modules activables (Welcome, Stats, etc.).
 *
 * Pour l'instant : GET pour récupérer le plan
 * Plus tard : POST pour upgrade/downgrade avec paiement
 */
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * GET /subscriptions/guilds/:guildId
   *
   * Récupère l'abonnement complet d'une guild.
   * Utilisé par le frontend pour afficher le plan actif.
   *
   * @param guildId - ID Discord de la guild
   * @returns Subscription avec guild info
   *
   * @example
   * GET /subscriptions/guilds/123456789
   * Response:
   * {
   *   "id": "clxxx",
   *   "guildId": "123456789",
   *   "plan": "FREE",
   *   "status": "ACTIVE",
   *   "subscriberDiscordId": null,
   *   "autoRenew": false,
   *   "createdAt": "2025-01-01T00:00:00.000Z",
   *   "updatedAt": "2025-01-01T00:00:00.000Z",
   *   "guild": {
   *     "guildId": "123456789",
   *     "name": "My Discord Server",
   *     "icon": "abc123",
   *     "ownerDiscordId": "987654321"
   *   }
   * }
   */
  @Get('guilds/:guildId')
  async getGuildSubscription(@Param('guildId') guildId: string) {
    return this.subscriptionService.getGuildSubscription(guildId);
  }

  /**
   * GET /subscriptions/guilds/:guildId/plan
   *
   * Récupère uniquement le plan d'une guild (FREE, PRO, MAX).
   * Endpoint léger pour les vérifications rapides.
   *
   * @param guildId - ID Discord de la guild
   * @returns Plan d'abonnement
   *
   * @example
   * GET /subscriptions/guilds/123456789/plan
   * Response:
   * {
   *   "plan": "FREE"
   * }
   */
  @Get('guilds/:guildId/plan')
  async getGuildPlan(@Param('guildId') guildId: string) {
    const plan = await this.subscriptionService.getGuildPlan(guildId);
    return { plan };
  }

  // TODO: Endpoints futurs pour la gestion des paiements

  /**
   * POST /subscriptions/guilds/:guildId/upgrade
   * Body: { plan: 'PRO' | 'MAX', paymentMethod: 'stripe' | 'paypal' }
   *
   * Initie un upgrade de plan avec paiement.
   * Redirige vers Stripe/PayPal checkout.
   */
  // async upgradeSubscription() {}

  /**
   * POST /subscriptions/guilds/:guildId/cancel
   *
   * Annule l'abonnement (reste actif jusqu'à la fin de période).
   */
  // async cancelSubscription() {}

  /**
   * GET /subscriptions/guilds/:guildId/payment-history
   *
   * Récupère l'historique des paiements.
   * Accessible uniquement par le subscriber.
   */
  // async getPaymentHistory() {}

  /**
   * POST /subscriptions/webhooks/stripe
   *
   * Webhook Stripe pour les events de paiement.
   */
  // async stripeWebhook() {}
}
