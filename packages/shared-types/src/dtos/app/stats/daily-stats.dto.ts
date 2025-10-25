/**
 * ==========================================
 * DAILY STATS DTOs - Bot → Backend
 * ==========================================
 * DTOs pour la transmission des statistiques quotidiennes
 * du Bot vers le Backend (flush toutes les 5 minutes)
 */

/**
 * Stats quotidiennes d'un membre dans un channel
 * 
 * Ces stats sont accumulées par le Bot en mémoire (MetricsCollector)
 * et envoyées en batch toutes les 5 minutes vers le Backend.
 * 
 * Le Backend fait un UPSERT dans StatsDaily :
 * - Si l'entrée existe déjà → additionner les compteurs
 * - Sinon → créer nouvelle entrée
 */
export interface DailyStatsDto {
  /** ID du serveur Discord */
  guildId: string;
  
  /** ID du membre */
  userId: string;
  
  /** ID du channel (ou "__voice__" pour les stats vocales) */
  channelId: string;
  
  /** Date au format 'YYYY-MM-DD' */
  date: string;
  
  // ============================================================================
  // MESSAGES
  // ============================================================================
  
  /** Nombre de messages envoyés */
  messagesSent: number;
  
  /** Nombre de messages supprimés */
  messagesDeleted: number;
  
  /** Nombre de messages édités */
  messagesEdited: number;
  
  /** Nombre de messages supprimés par le membre lui-même */
  deletedBySelf: number;
  
  /** Nombre de messages supprimés par un modérateur */
  deletedByMod: number;
  
  // ============================================================================
  // VOCAL
  // ============================================================================
  
  /** Nombre de minutes en vocal (arrondi) */
  voiceMinutes: number;
  
  // ============================================================================
  // RÉACTIONS
  // ============================================================================
  
  /** Nombre de réactions données par le membre */
  reactionsGiven: number;
  
  /** Nombre de réactions reçues par le membre (sur ses messages) */
  reactionsReceived: number;
  
  // ============================================================================
  // MÉTADONNÉES
  // ============================================================================
  
  /** Heure de pointe (0-23) - heure avec le plus de messages */
  peakHour?: number;
  
  /** Timestamp du premier message de la journée */
  firstMessageAt?: number;
  
  /** Timestamp du dernier message de la journée */
  lastMessageAt?: number;
}

/**
 * Batch de stats quotidiennes
 * 
 * Envoyé toutes les 5 minutes par le Bot via WebSocket
 * vers la Gateway, qui le transmet au Backend.
 * 
 * Format du message WebSocket :
 * Event: 'stats:daily:batch'
 * Payload: DailyStatsBatchDto
 */
export interface DailyStatsBatchDto {
  /** Tableau de stats quotidiennes */
  stats: DailyStatsDto[];
  
  /** Timestamp de l'envoi */
  timestamp: number;
  
  /** ID du bot qui envoie (pour debug multi-instances) */
  botId: string;
}

/**
 * Réponse du Backend après traitement du batch
 */
export interface DailyStatsBatchResponseDto {
  /** Nombre d'entrées traitées avec succès */
  processed: number;
  
  /** Nombre d'entrées créées */
  created: number;
  
  /** Nombre d'entrées mises à jour */
  updated: number;
  
  /** Erreurs rencontrées (si applicable) */
  errors?: Array<{
    index: number;
    error: string;
  }>;
}