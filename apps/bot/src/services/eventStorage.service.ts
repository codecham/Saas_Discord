// src/services/event-storage.service.ts
import Database from 'better-sqlite3';
import { container } from '@sapphire/framework';
import type { BotEventDto } from '@my-project/shared-types';
import { BOT_CONFIG } from '../config/bot.config';

export class EventStorageService {
  private db: Database.Database;

  constructor() {
    this.db = new Database(BOT_CONFIG.storage.databaseFile);
    this.initDatabase();
  }

  private initDatabase() {
    // Créer la table selon votre DTO
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pending_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        user_id TEXT,
        channel_id TEXT,
        message_id TEXT,
        role_id TEXT,
        timestamp TEXT NOT NULL,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Index pour optimiser les requêtes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_guild_id ON pending_events(guild_id);
      CREATE INDEX IF NOT EXISTS idx_user_id ON pending_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_channel_id ON pending_events(channel_id);
      CREATE INDEX IF NOT EXISTS idx_created_at ON pending_events(created_at);
    `);
  }

  /**
   * Sauvegarder un array d'événements
   */
  saveEvents(events: BotEventDto[]): void {
    if (events.length === 0) return;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO pending_events (type, guild_id, user_id, channel_id, message_id, role_id, timestamp, data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Transaction pour insérer tous les événements d'un coup
      const insertMany = this.db.transaction((events: BotEventDto[]) => {
        for (const event of events) {
          stmt.run(
            event.type,
            event.guildId,
            event.userId || null,
            event.channelId || null,
            event.messageId || null,
            event.roleId || null,
            event.timestamp.toString(),
            event.data ? JSON.stringify(event.data) : null
          );
        }
      });
      
      insertMany(events);
      container.logger.debug(`${events.length} événements sauvegardés en SQLite`);
      
    } catch (error) {
      container.logger.error('Erreur sauvegarde événements SQLite:', error);
    }
  }

  /**
   * Récupérer les événements par batch
   */
  getEventsBatch(batchSize: number = 50, offset: number = 0): BotEventDto[] {
    try {
      const stmt = this.db.prepare(`
        SELECT type, guild_id, user_id, channel_id, message_id, role_id, timestamp, data
        FROM pending_events
        ORDER BY created_at ASC
        LIMIT ? OFFSET ?
      `);
      
      const rows = stmt.all(batchSize, offset) as Array<{
        type: string;
        guild_id: string;
        user_id: string | null;
        channel_id: string | null;
        message_id: string | null;
        role_id: string | null;
        timestamp: string;
        data: string | null;
      }>;
      
      return rows.map(row => ({
        type: row.type as any, // Cast vers EventType
        guildId: row.guild_id,
        userId: row.user_id || undefined,
        channelId: row.channel_id || undefined,
        messageId: row.message_id || undefined,
        roleId: row.role_id || undefined,
        timestamp: row.timestamp.toString() as any,
        data: row.data ? JSON.parse(row.data) : undefined
      }));
      
    } catch (error) {
      container.logger.error('Erreur récupération événements:', error);
      return [];
    }
  }

  /**
   * Compter le nombre total d'événements en attente
   */
  countPendingEvents(): number {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM pending_events');
      const result = stmt.get() as { count: number };
      return result.count;
    } catch (error) {
      container.logger.error('Erreur comptage événements:', error);
      return 0;
    }
  }

  /**
   * Supprimer les événements traités
   */
  deleteProcessedEvents(count: number): void {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM pending_events
        WHERE id IN (
          SELECT id FROM pending_events
          ORDER BY created_at ASC
          LIMIT ?
        )
      `);
      
      stmt.run(count);
      
    } catch (error) {
      container.logger.error('Erreur suppression événements:', error);
    }
  }

  /**
   * Nettoyer les anciens événements (garde seulement les N plus récents)
   */
  cleanupOldEvents(maxEvents: number = BOT_CONFIG.storage.maxPendingEvents): void {
    try {
      const count = this.countPendingEvents();
      
      if (count > maxEvents) {
        const toDelete = count - maxEvents;
        this.deleteProcessedEvents(toDelete);
        container.logger.info(`Supprimé ${toDelete} anciens événements`);
      }
    } catch (error) {
      container.logger.error('Erreur nettoyage événements:', error);
    }
  }

  /**
   * Vider complètement la table (pour debug)
   */
  clearAllEvents(): void {
    try {
      this.db.exec('DELETE FROM pending_events');
      container.logger.info('Tous les événements en attente supprimés');
    } catch (error) {
      container.logger.error('Erreur vidage événements:', error);
    }
  }

  /**
   * Fermer la base de données proprement
   */
  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}