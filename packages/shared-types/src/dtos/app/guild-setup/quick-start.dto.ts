// packages/shared-types/src/dtos/app/guild-setup/quick-start.dto.ts

/**
 * Réponses du Quick Start Wizard
 * Utilisé pour configurer les settings initiaux de la guild
 */
export interface QuickStartAnswersDto {
  /** ID de la guild */
  guildId: string;
  
  /** Activer le module stats ? */
  enableStats?: boolean;
  
  /** Activer le tracking des invites ? */
  enableInviteTracking?: boolean;
  
  /** ID du channel pour les logs de modération */
  modLogChannelId?: string | null;
  
  /** Créer automatiquement un channel de logs ? */
  createModLogChannel?: boolean;
  
  /** Nom du channel de logs (si createModLogChannel = true) */
  modLogChannelName?: string;
  
  /** Activer l'automod ? */
  enableAutomod?: boolean;
  
  /** Niveau d'automod si activé */
  automodLevel?: 'low' | 'medium' | 'high';
  
  /** Activer le message de bienvenue ? */
  enableWelcome?: boolean;
  
  /** ID du channel pour les messages de bienvenue */
  welcomeChannelId?: string | null;
}

/**
 * Réponse après soumission du wizard
 */
export interface QuickStartResponseDto {
  /** Succès ou non */
  success: boolean;
  
  /** Settings appliqués */
  settings: {
    /** Modules activés */
    modulesEnabled: string[];
    
    /** Channel de logs créé (si applicable) */
    modLogChannelCreated?: boolean;
    modLogChannelId?: string;
    
    /** Config appliquée */
    configApplied: boolean;
  };
  
  /** Message de confirmation */
  message: string;
  
  /** Prochaines étapes suggérées */
  nextSteps?: string[];
}

/**
 * Options du wizard pour le frontend
 * Retourné par le backend pour pré-remplir les options
 */
export interface QuickStartOptionsDto {
  /** Channels disponibles pour les logs */
  availableChannels: Array<{
    id: string;
    name: string;
    type: number; // 0 = text, 2 = voice, etc.
  }>;
  
  /** User peut créer des channels ? */
  canCreateChannels: boolean;
  
  /** Recommendations basées sur la guild */
  recommendations: {
    /** Stats recommandées ? */
    stats: boolean;
    
    /** Invite tracking recommandé ? */
    inviteTracking: boolean;
    
    /** Automod recommandé ? */
    automod: boolean;
    
    /** Niveau automod recommandé */
    automodLevel: 'low' | 'medium' | 'high';
  };
}