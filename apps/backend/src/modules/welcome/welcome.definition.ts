import { ModuleDefinition, ModuleCategory } from '@my-project/shared-types';

/**
 * 👋 Welcome Module Definition
 *
 * Envoie des messages de bienvenue personnalisés aux nouveaux membres
 */
export const WELCOME_MODULE: ModuleDefinition = {
  id: 'welcome',
  name: 'Welcome Messages',
  description: 'Send personalized welcome messages to new members',
  icon: '👋',
  category: ModuleCategory.ENGAGEMENT,

  availability: {
    free: true,
    premium: true,
    enterprise: true,
  },

  limits: {
    free: {
      messages: 1, // 1 seul message de bienvenue
    },
    premium: {
      messages: -1, // Illimité
    },
    enterprise: {
      messages: -1, // Illimité
    },
  },

  runtime: {
    backend: true, // Configuration via UI
    bot: true, // Envoi des messages
  },

  version: '1.0.0',

  dependencies: [], // Pas de dépendances
};
