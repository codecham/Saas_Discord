/**
 * 💳 Subscription DTOs
 * 
 * Types partagés entre Backend et Frontend pour le système d'abonnement.
 */

/**
 * Plans d'abonnement disponibles
 */
export enum SubscriptionPlan {
  FREE = 'FREE',
  PRO = 'PRO',
  MAX = 'MAX',
}

/**
 * Statuts d'abonnement
 */
export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',        // Actif et payé
  CANCELLED = 'CANCELLED',  // Annulé mais actif jusqu'à fin de période
  EXPIRED = 'EXPIRED',      // Expiré, retour au FREE
  SUSPENDED = 'SUSPENDED',  // Suspendu (paiement échoué)
  TRIAL = 'TRIAL',          // En période d'essai
}

/**
 * Abonnement d'une guild
 */
export interface GuildSubscription {
  id: string;
  guildId: string;
  
  // Plan et statut
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  
  // Période (null si FREE)
  startDate: string | null;
  endDate: string | null;
  
  // Propriétaire de l'abonnement
  subscriberDiscordId: string | null;
  
  // Métadonnées paiement (pour le futur)
  paymentProvider: string | null;
  paymentCustomerId: string | null;
  paymentSubscriptionId: string | null;
  
  // Auto-renewal
  autoRenew: boolean;
  
  // Historique
  previousPlan: SubscriptionPlan | null;
  upgradedAt: string | null;
  downgradedAt: string | null;
  cancelledAt: string | null;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Relations (si incluses)
  guild?: {
    guildId: string;
    name: string;
    icon: string | null;
    ownerDiscordId: string;
  };
}

/**
 * Historique de paiement
 */
export interface SubscriptionPaymentHistory {
  id: string;
  subscriptionId: string;
  
  // Paiement
  amount: string; // Decimal en string
  currency: string;
  
  // Statut
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  
  // Provider
  paymentProvider: string | null;
  paymentIntentId: string | null;
  paymentMethod: string | null;
  
  // Période
  periodStart: string;
  periodEnd: string;
  
  // Métadonnées
  failureReason: string | null;
  refundedAt: string | null;
  refundReason: string | null;
  
  // Timestamps
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Features disponibles par plan
 * Utilisé pour afficher les différences dans l'UI
 */
export interface PlanFeatures {
  plan: SubscriptionPlan;
  name: string;
  price: number; // Prix mensuel en euros (0 pour FREE)
  features: {
    maxModules: number; // -1 = illimité
    maxCustomCommands: number;
    statsRetentionDays: number;
    prioritySupport: boolean;
    customBranding: boolean;
    advancedAnalytics: boolean;
    webhookSupport: boolean;
    apiAccess: boolean;
  };
}

/**
 * Comparaison de plans pour l'UI
 */
export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  [SubscriptionPlan.FREE]: {
    plan: SubscriptionPlan.FREE,
    name: 'Free',
    price: 0,
    features: {
      maxModules: 5,
      maxCustomCommands: 10,
      statsRetentionDays: 7,
      prioritySupport: false,
      customBranding: false,
      advancedAnalytics: false,
      webhookSupport: false,
      apiAccess: false,
    },
  },
  [SubscriptionPlan.PRO]: {
    plan: SubscriptionPlan.PRO,
    name: 'Pro',
    price: 9.99,
    features: {
      maxModules: 15,
      maxCustomCommands: 50,
      statsRetentionDays: 30,
      prioritySupport: true,
      customBranding: true,
      advancedAnalytics: true,
      webhookSupport: true,
      apiAccess: false,
    },
  },
  [SubscriptionPlan.MAX]: {
    plan: SubscriptionPlan.MAX,
    name: 'Max',
    price: 29.99,
    features: {
      maxModules: -1, // illimité
      maxCustomCommands: -1,
      statsRetentionDays: -1,
      prioritySupport: true,
      customBranding: true,
      advancedAnalytics: true,
      webhookSupport: true,
      apiAccess: true,
    },
  },
};

/**
 * Helper pour obtenir les features d'un plan
 */
export function getPlanFeatures(plan: SubscriptionPlan): PlanFeatures {
  return PLAN_FEATURES[plan];
}

/**
 * Helper pour savoir si un plan a une feature
 */
export function hasPlanFeature(
  plan: SubscriptionPlan,
  feature: keyof PlanFeatures['features'],
): boolean {
  const planFeatures = PLAN_FEATURES[plan];
  const value = planFeatures.features[feature];
  
  // Si boolean, retourner directement
  if (typeof value === 'boolean') {
    return value;
  }
  
  // Si number, retourner true si > 0 ou -1 (illimité)
  return value > 0 || value === -1;
}

/**
 * Helper pour comparer les plans (hiérarchie)
 */
export function comparePlans(
  planA: SubscriptionPlan,
  planB: SubscriptionPlan,
): number {
  const hierarchy = {
    [SubscriptionPlan.FREE]: 0,
    [SubscriptionPlan.PRO]: 1,
    [SubscriptionPlan.MAX]: 2,
  };
  
  return hierarchy[planA] - hierarchy[planB];
}

/**
 * Helper pour savoir si un plan est supérieur à un autre
 */
export function isPlanHigherThan(
  planA: SubscriptionPlan,
  planB: SubscriptionPlan,
): boolean {
  return comparePlans(planA, planB) > 0;
}