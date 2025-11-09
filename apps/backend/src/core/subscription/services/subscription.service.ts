import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

/**
 * 💳 Subscription Service (Core Service)
 *
 * Service d'infrastructure pour gérer les abonnements des guilds.
 *
 * Ce service est utilisé par le ModuleManagerService pour vérifier
 * les plans d'abonnement et les limites des modules.
 *
 * Features actuelles :
 * - Récupérer le plan d'une guild
 * - Créer un abonnement FREE par défaut
 * - Upgrade/Downgrade manuel (pour dev)
 *
 * Features futures (avec paiement) :
 * - Intégration Stripe/PayPal
 * - Webhook de paiement
 * - Auto-renewal
 * - Historique des paiements
 */
@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupère le plan d'abonnement actif d'une guild
   * Si aucun abonnement n'existe, crée un FREE par défaut
   *
   * @param guildId - ID Discord de la guild
   * @returns Plan d'abonnement (FREE, PRO, MAX)
   */
  async getGuildPlan(guildId: string): Promise<SubscriptionPlan> {
    const subscription = await this.prisma.guildSubscription.findUnique({
      where: { guildId },
    });

    // Si pas d'abonnement, créer un FREE par défaut
    if (!subscription) {
      await this.createDefaultSubscription(guildId);
      return SubscriptionPlan.FREE;
    }

    // Vérifier si l'abonnement est expiré
    if (this.isSubscriptionExpired(subscription)) {
      await this.expireSubscription(guildId);
      return SubscriptionPlan.FREE;
    }

    return subscription.plan;
  }

  /**
   * Récupère l'abonnement complet d'une guild
   *
   * @param guildId - ID Discord de la guild
   * @returns Subscription complète ou null
   */
  async getGuildSubscription(guildId: string) {
    let subscription = await this.prisma.guildSubscription.findUnique({
      where: { guildId },
      include: {
        guild: {
          select: {
            guildId: true,
            name: true,
            icon: true,
            ownerDiscordId: true,
          },
        },
      },
    });

    // Si pas d'abonnement, créer un FREE par défaut
    if (!subscription) {
      subscription = await this.createDefaultSubscription(guildId);
    }

    return subscription;
  }

  /**
   * Crée un abonnement FREE par défaut pour une guild
   *
   * @param guildId - ID Discord de la guild
   * @returns Subscription créée
   */
  async createDefaultSubscription(guildId: string) {
    // Vérifier que la guild existe
    const guild = await this.prisma.guild.findUnique({
      where: { guildId },
    });

    if (!guild) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }

    return this.prisma.guildSubscription.create({
      data: {
        guildId,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        autoRenew: false,
      },
      include: {
        guild: {
          select: {
            guildId: true,
            name: true,
            icon: true,
            ownerDiscordId: true,
          },
        },
      },
    });
  }

  /**
   * Upgrade/Downgrade manuel d'un plan (pour dev)
   *
   * TODO: Plus tard, cette méthode sera appelée après un paiement réussi
   *
   * @param guildId - ID Discord de la guild
   * @param newPlan - Nouveau plan (PRO, MAX)
   * @param subscriberDiscordId - ID Discord de celui qui paie (optionnel pour l'instant)
   */
  async changePlan(
    guildId: string,
    newPlan: SubscriptionPlan,
    subscriberDiscordId?: string,
  ) {
    const subscription = await this.getGuildSubscription(guildId);
    const currentPlan = subscription.plan;

    // Si même plan, ne rien faire
    if (currentPlan === newPlan) {
      return subscription;
    }

    const isUpgrade = this.isUpgrade(currentPlan, newPlan);
    const now = new Date();

    return this.prisma.guildSubscription.update({
      where: { guildId },
      data: {
        plan: newPlan,
        previousPlan: currentPlan,
        subscriberDiscordId:
          subscriberDiscordId ?? subscription.subscriberDiscordId,

        // Si upgrade, mettre à jour upgradedAt
        ...(isUpgrade && { upgradedAt: now }),

        // Si downgrade, mettre à jour downgradedAt
        ...(!isUpgrade && { downgradedAt: now }),

        // Pour l'instant, pas de dates de période
        // TODO: Ajouter startDate/endDate lors de l'intégration paiement
      },
      include: {
        guild: {
          select: {
            guildId: true,
            name: true,
            icon: true,
            ownerDiscordId: true,
          },
        },
      },
    });
  }

  /**
   * Vérifie si un changement de plan est un upgrade
   *
   * @param currentPlan - Plan actuel
   * @param newPlan - Nouveau plan
   * @returns true si upgrade, false si downgrade
   */
  private isUpgrade(
    currentPlan: SubscriptionPlan,
    newPlan: SubscriptionPlan,
  ): boolean {
    const planHierarchy = {
      [SubscriptionPlan.FREE]: 0,
      [SubscriptionPlan.PRO]: 1,
      [SubscriptionPlan.MAX]: 2,
    };

    return planHierarchy[newPlan] > planHierarchy[currentPlan];
  }

  /**
   * Vérifie si un abonnement est expiré
   *
   * @param subscription - Subscription à vérifier
   * @returns true si expiré
   */
  private isSubscriptionExpired(subscription: any): boolean {
    if (!subscription.endDate) {
      return false;
    }

    return new Date() > subscription.endDate;
  }

  /**
   * Expire un abonnement et le repasse en FREE
   *
   * @param guildId - ID Discord de la guild
   */
  private async expireSubscription(guildId: string) {
    return this.prisma.guildSubscription.update({
      where: { guildId },
      data: {
        previousPlan: SubscriptionPlan.FREE,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.EXPIRED,
      },
    });
  }

  /**
   * Vérifie si un utilisateur peut gérer l'abonnement d'une guild
   *
   * Pour l'instant : owner de la guild OU subscriber
   * Plus tard : utilisé pour les pages de gestion de paiement
   *
   * @param guildId - ID Discord de la guild
   * @param userDiscordId - ID Discord de l'utilisateur
   * @returns true si autorisé
   */
  async canManageSubscription(
    guildId: string,
    userDiscordId: string,
  ): Promise<boolean> {
    const subscription = await this.getGuildSubscription(guildId);
    const guild = subscription.guild;

    // Owner de la guild peut toujours gérer
    if (guild.ownerDiscordId === userDiscordId) {
      return true;
    }

    // Subscriber peut gérer même s'il n'est plus dans la guild
    if (subscription.subscriberDiscordId === userDiscordId) {
      return true;
    }

    return false;
  }
}
