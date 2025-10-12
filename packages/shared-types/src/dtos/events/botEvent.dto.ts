// packages/shared-types/src/dtos/gateway.dto.ts
import { EventType } from "../../enums/eventTypes.enum";

export interface BotEventDto {
  type: EventType;           // Type d'événement
  guildId?: string;        // Index obligatoire
  userId?: string;        // Index pour recherches utilisateur
  channelId?: string;     // Index pour recherches channel  
  messageId?: string;     // Pour les événements de message
  roleId?: string;        // Pour les événements de rôles
  timestamp: number;        // Index pour tri chronologique
  data?: any;            // Données supplémentaires non-recherchables
}
