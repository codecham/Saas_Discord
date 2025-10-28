import { BackfillStatus } from './guild-setup.enums';

/**
 * Progression du backfill de stats
 */
export interface BackfillProgressDto {
  /** ID de la guild */
  guildId: string;
  
  /** Status du backfill */
  status: BackfillStatus;
  
  /** Progression globale */
  progress: {
    /** Messages traités */
    current: number;
    
    /** Total estimé de messages */
    total: number;
    
    /** Pourcentage (0-100) */
    percentage: number;
  };
  
  /** Progression par channel */
  channelsProgress: Array<{
    /** ID du channel */
    channelId: string;
    
    /** Nom du channel */
    channelName: string;
    
    /** Messages traités dans ce channel */
    messagesProcessed: number;
    
    /** Total messages dans ce channel */
    totalMessages?: number;
    
    /** Channel terminé ? */
    isComplete: boolean;
    
    /** Erreur éventuelle */
    error?: string;
  }>;
  
  /** Métadonnées du backfill */
  metadata: {
    /** Date de début */
    startedAt: string; // ISO date
    
    /** Date de fin (si terminé) */
    completedAt?: string; // ISO date
    
    /** Période couverte (en jours) */
    periodDays: number;
    
    /** Nombre de channels traités */
    channelsProcessed: number;
    
    /** Nombre total de channels */
    totalChannels: number;
    
    /** Erreurs rencontrées */
    errorsCount: number;
  };
  
  /** Temps écoulé (ms) */
  elapsedTime: number;
  
  /** Estimation temps restant (ms) */
  estimatedTimeRemaining?: number;
}

/**
 * Requête pour demander un backfill
 */
export interface RequestBackfillDto {
  /** ID de la guild */
  guildId: string;
  
  /** Nombre de jours à backfill */
  days: 7 | 30 | 60 | 90;
  
  /** Limiter aux top N channels les plus actifs */
  topChannelsOnly?: number;
  
  /** IDs de channels spécifiques (optionnel) */
  specificChannels?: string[];
}

/**
 * Réponse après demande de backfill
 */
export interface RequestBackfillResponseDto {
  /** Succès ou non */
  success: boolean;
  
  /** Message de confirmation */
  message: string;
  
  /** Job ID pour tracking */
  jobId?: string;
  
  /** Estimation durée (minutes) */
  estimatedDuration?: number;
  
  /** Limitation free/premium */
  limitation?: {
    isPremiumRequired: boolean;
    maxDaysFree: number;
    reason: string;
  };
}

/**
 * Statistiques du backfill terminé
 */
export interface BackfillStatsDto {
  /** ID de la guild */
  guildId: string;
  
  /** Période couverte */
  period: {
    /** Date de début */
    from: string; // ISO date
    
    /** Date de fin */
    to: string; // ISO date
    
    /** Nombre de jours */
    days: number;
  };
  
  /** Stats collectées */
  stats: {
    /** Total messages importés */
    totalMessages: number;
    
    /** Membres avec activité */
    activeMembers: number;
    
    /** Channels traités */
    channelsProcessed: number;
    
    /** Top 5 membres les plus actifs */
    topMembers: Array<{
      userId: string;
      username: string;
      messageCount: number;
    }>;
    
    /** Top 5 channels les plus actifs */
    topChannels: Array<{
      channelId: string;
      channelName: string;
      messageCount: number;
    }>;
  };
  
  /** Durée du backfill */
  duration: {
    /** Durée totale (ms) */
    total: number;
    
    /** Début */
    startedAt: string; // ISO date
    
    /** Fin */
    completedAt: string; // ISO date
  };
}