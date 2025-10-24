# 🚀 ROADMAP - Système Stats & Métriques v2.0

**Objectif** : Architecture ultra-solide pour gérer dizaines de milliers de serveurs avec effet "WOW"

**Durée estimée** : 5-7 jours  
**Philosophie** : Code propre, scalable, maintenable

---

## 📐 Architecture Globale

### Stratégie 3 niveaux
1. **Events raw** (7j) : audit/debug
2. **Daily aggregates** (90j) : stats quotidiennes détaillées
3. **Monthly aggregates** (∞) : historique compressé

### Stack
- **DB** : TimescaleDB (hypertables + continuous aggregates)
- **Cache** : Redis (TTL 5-10min)
- **Calcul** : Worker cron quotidien + materialized views
- **API** : 2 endpoints (guild stats, member stats)

---

## 🗄️ Phase 1 : Schema TimescaleDB (2h)

**Objectif** : Tables optimisées pour scale + faible coût storage

### 1.1 Créer les Hypertables (1h)

**Fichier** : `prisma/migrations/XXX_stats_v2_schema.sql`

```sql
-- ============================================
-- EVENTS RAW (Retention 7 jours)
-- ============================================
CREATE TABLE events_raw (
    id BIGSERIAL,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20),
    channel_id VARCHAR(20),
    event_type VARCHAR(50) NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, timestamp)
);

SELECT create_hypertable('events_raw', 'timestamp', 
    chunk_time_interval => INTERVAL '1 day');

-- Retention automatique : supprimer après 7 jours
SELECT add_retention_policy('events_raw', INTERVAL '7 days');

-- Index
CREATE INDEX idx_events_guild ON events_raw(guild_id, timestamp DESC);
CREATE INDEX idx_events_user ON events_raw(user_id, timestamp DESC);


-- ============================================
-- STATS DAILY (Retention 90 jours)
-- ============================================
CREATE TABLE stats_daily (
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20),
    date DATE NOT NULL,
    
    -- Compteurs messages
    messages_sent INT DEFAULT 0,
    messages_deleted INT DEFAULT 0,
    messages_edited INT DEFAULT 0,
    deleted_by_self INT DEFAULT 0,
    deleted_by_mod INT DEFAULT 0,
    
    -- Compteurs voice
    voice_minutes INT DEFAULT 0,
    
    -- Compteurs reactions
    reactions_given INT DEFAULT 0,
    reactions_received INT DEFAULT 0,
    
    -- Metadata
    peak_hour SMALLINT, -- 0-23
    first_message_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    
    PRIMARY KEY (guild_id, user_id, date, channel_id)
);

SELECT create_hypertable('stats_daily', 'date',
    chunk_time_interval => INTERVAL '7 days');

SELECT add_retention_policy('stats_daily', INTERVAL '90 days');

-- Index pour queries fréquentes
CREATE INDEX idx_daily_guild_date ON stats_daily(guild_id, date DESC);
CREATE INDEX idx_daily_user_date ON stats_daily(guild_id, user_id, date DESC);


-- ============================================
-- STATS MONTHLY (Pas de retention)
-- ============================================
CREATE TABLE stats_monthly (
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    month DATE NOT NULL, -- Premier jour du mois
    
    -- Totaux mensuels
    total_messages INT DEFAULT 0,
    total_voice_minutes INT DEFAULT 0,
    total_reactions_given INT DEFAULT 0,
    total_reactions_received INT DEFAULT 0,
    
    -- Moyennes
    avg_messages_per_day DECIMAL(10,2),
    avg_voice_per_day DECIMAL(10,2),
    
    -- Top channels ce mois
    top_channels JSONB, -- [{"channel_id": "...", "count": 123}, ...]
    
    PRIMARY KEY (guild_id, user_id, month)
);

SELECT create_hypertable('stats_monthly', 'month',
    chunk_time_interval => INTERVAL '1 month');

CREATE INDEX idx_monthly_guild ON stats_monthly(guild_id, month DESC);


-- ============================================
-- MEMBER ROLES HISTORY (Simple, pas hypertable)
-- ============================================
CREATE TABLE member_roles_history (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    role_id VARCHAR(20) NOT NULL,
    action VARCHAR(10) NOT NULL, -- 'added' | 'removed'
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_roles_user ON member_roles_history(guild_id, user_id, timestamp DESC);


-- ============================================
-- CONTINUOUS AGGREGATES (Calcul auto background)
-- ============================================

-- Vue agrégée : totaux par serveur par jour
CREATE MATERIALIZED VIEW stats_guild_daily
WITH (timescaledb.continuous) AS
SELECT 
    guild_id,
    time_bucket('1 day', date) AS day,
    SUM(messages_sent) as total_messages,
    SUM(voice_minutes) as total_voice,
    SUM(reactions_given) as total_reactions,
    COUNT(DISTINCT user_id) as active_members
FROM stats_daily
GROUP BY guild_id, day
WITH NO DATA;

-- Refresh automatique toutes les heures
SELECT add_continuous_aggregate_policy('stats_guild_daily',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');


-- ============================================
-- MATERIALIZED VIEW : Top membres par métrique
-- ============================================
CREATE MATERIALIZED VIEW leaderboard_messages AS
SELECT 
    guild_id,
    user_id,
    SUM(messages_sent) as total_messages,
    RANK() OVER (PARTITION BY guild_id ORDER BY SUM(messages_sent) DESC) as rank
FROM stats_daily
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY guild_id, user_id;

CREATE INDEX idx_leaderboard_msg ON leaderboard_messages(guild_id, rank);

-- Refresh quotidien à 2h du matin
CREATE OR REPLACE FUNCTION refresh_leaderboards()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_messages;
END;
$$ LANGUAGE plpgsql;
```

**Tâches :**
- [ ] Créer le fichier SQL
- [ ] Tester en local : `psql -U myproject -d myproject -f migration.sql`
- [ ] Vérifier hypertables : `SELECT * FROM timescaledb_information.hypertables;`
- [ ] Vérifier retention policies : `SELECT * FROM timescaledb_information.jobs;`
- [ ] Commit : `feat(db): add TimescaleDB schema for stats v2`

### 1.2 Mettre à jour Prisma (30 min)

**Fichier** : `prisma/schema.prisma`

```prisma
model EventsRaw {
  id         BigInt   @id @default(autoincrement())
  guildId    String   @map("guild_id") @db.VarChar(20)
  userId     String?  @map("user_id") @db.VarChar(20)
  channelId  String?  @map("channel_id") @db.VarChar(20)
  eventType  String   @map("event_type") @db.VarChar(50)
  metadata   Json?
  timestamp  DateTime @default(now()) @db.Timestamptz

  @@map("events_raw")
  @@index([guildId, timestamp(sort: Desc)])
}

model StatsDaily {
  guildId           String    @map("guild_id") @db.VarChar(20)
  userId            String    @map("user_id") @db.VarChar(20)
  channelId         String?   @map("channel_id") @db.VarChar(20)
  date              DateTime  @db.Date
  
  messagesSent      Int       @default(0) @map("messages_sent")
  messagesDeleted   Int       @default(0) @map("messages_deleted")
  messagesEdited    Int       @default(0) @map("messages_edited")
  deletedBySelf     Int       @default(0) @map("deleted_by_self")
  deletedByMod      Int       @default(0) @map("deleted_by_mod")
  
  voiceMinutes      Int       @default(0) @map("voice_minutes")
  
  reactionsGiven    Int       @default(0) @map("reactions_given")
  reactionsReceived Int       @default(0) @map("reactions_received")
  
  peakHour          Int?      @map("peak_hour") @db.SmallInt
  firstMessageAt    DateTime? @map("first_message_at") @db.Timestamptz
  lastMessageAt     DateTime? @map("last_message_at") @db.Timestamptz

  @@id([guildId, userId, date, channelId])
  @@map("stats_daily")
  @@index([guildId, date(sort: Desc)])
  @@index([guildId, userId, date(sort: Desc)])
}

model StatsMonthly {
  guildId             String   @map("guild_id") @db.VarChar(20)
  userId              String   @map("user_id") @db.VarChar(20)
  month               DateTime @db.Date
  
  totalMessages       Int      @default(0) @map("total_messages")
  totalVoiceMinutes   Int      @default(0) @map("total_voice_minutes")
  totalReactionsGiven Int      @default(0) @map("total_reactions_given")
  totalReactionsReceived Int   @default(0) @map("total_reactions_received")
  
  avgMessagesPerDay   Decimal  @map("avg_messages_per_day") @db.Decimal(10, 2)
  avgVoicePerDay      Decimal  @map("avg_voice_per_day") @db.Decimal(10, 2)
  
  topChannels         Json?    @map("top_channels")

  @@id([guildId, userId, month])
  @@map("stats_monthly")
  @@index([guildId, month(sort: Desc)])
}

model MemberRolesHistory {
  id        BigInt   @id @default(autoincrement())
  guildId   String   @map("guild_id") @db.VarChar(20)
  userId    String   @map("user_id") @db.VarChar(20)
  roleId    String   @map("role_id") @db.VarChar(20)
  action    String   @db.VarChar(10) // 'added' | 'removed'
  timestamp DateTime @default(now()) @db.Timestamptz

  @@map("member_roles_history")
  @@index([guildId, userId, timestamp(sort: Desc)])
}
```

**Tâches :**
- [ ] Ajouter les models dans `schema.prisma`
- [ ] Générer client : `npx prisma generate`
- [ ] Commit : `feat(prisma): add stats v2 models`

### 1.3 Nettoyer anciennes tables (30 min)

**Optionnel mais recommandé pour fresh start**

```sql
-- Backup d'abord si nécessaire
-- pg_dump ...

-- Supprimer anciennes tables stats
DROP TABLE IF EXISTS old_stats_table_1 CASCADE;
DROP TABLE IF EXISTS old_stats_table_2 CASCADE;
-- etc.
```

**Tâches :**
- [ ] Identifier tables obsolètes
- [ ] Créer script de nettoyage
- [ ] Exécuter en local
- [ ] Commit : `chore(db): remove old stats tables`

---

## 🤖 Phase 2 : Bot - Events Listeners (3h)

**Objectif** : Tracker events Discord + batching intelligent

### 2.1 Créer le StatsCollector (1h30)

**Fichier** : `apps/bot/src/services/StatsCollector.ts`

```typescript
import { container } from '@sapphire/framework';
import { Collection } from 'discord.js';

interface DailyStats {
  guildId: string;
  userId: string;
  channelId: string | null;
  date: string; // YYYY-MM-DD
  
  messagesSent: number;
  messagesDeleted: number;
  messagesEdited: number;
  deletedBySelf: number;
  deletedByMod: number;
  
  voiceMinutes: number;
  
  reactionsGiven: number;
  reactionsReceived: number;
  
  peakHour: number | null;
  firstMessageAt: Date | null;
  lastMessageAt: Date | null;
}

export class StatsCollector {
  private cache = new Collection<string, DailyStats>(); // key: guildId-userId-channelId-date
  private voiceSessions = new Collection<string, Date>(); // key: guildId-userId
  
  /**
   * Génère une clé unique pour le cache
   */
  private getCacheKey(guildId: string, userId: string, channelId: string | null, date: string): string {
    return `${guildId}-${userId}-${channelId || 'null'}-${date}`;
  }
  
  /**
   * Récupère ou crée une entrée stats
   */
  private getOrCreate(guildId: string, userId: string, channelId: string | null): DailyStats {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const key = this.getCacheKey(guildId, userId, channelId, date);
    
    if (!this.cache.has(key)) {
      this.cache.set(key, {
        guildId,
        userId,
        channelId,
        date,
        messagesSent: 0,
        messagesDeleted: 0,
        messagesEdited: 0,
        deletedBySelf: 0,
        deletedByMod: 0,
        voiceMinutes: 0,
        reactionsGiven: 0,
        reactionsReceived: 0,
        peakHour: null,
        firstMessageAt: null,
        lastMessageAt: null
      });
    }
    
    return this.cache.get(key)!;
  }
  
  /**
   * Track message envoyé
   */
  public trackMessage(guildId: string, userId: string, channelId: string): void {
    const stats = this.getOrCreate(guildId, userId, channelId);
    stats.messagesSent++;
    
    const now = new Date();
    if (!stats.firstMessageAt) stats.firstMessageAt = now;
    stats.lastMessageAt = now;
    stats.peakHour = now.getHours();
  }
  
  /**
   * Track message supprimé
   */
  public trackMessageDeleted(
    guildId: string, 
    userId: string, 
    channelId: string,
    deletedBy: 'self' | 'mod'
  ): void {
    const stats = this.getOrCreate(guildId, userId, channelId);
    stats.messagesDeleted++;
    
    if (deletedBy === 'self') {
      stats.deletedBySelf++;
    } else {
      stats.deletedByMod++;
    }
  }
  
  /**
   * Track message édité
   */
  public trackMessageEdited(guildId: string, userId: string, channelId: string): void {
    const stats = this.getOrCreate(guildId, userId, channelId);
    stats.messagesEdited++;
  }
  
  /**
   * Track voice join
   */
  public trackVoiceJoin(guildId: string, userId: string): void {
    const key = `${guildId}-${userId}`;
    this.voiceSessions.set(key, new Date());
  }
  
  /**
   * Track voice leave
   */
  public trackVoiceLeave(guildId: string, userId: string): void {
    const key = `${guildId}-${userId}`;
    const joinedAt = this.voiceSessions.get(key);
    
    if (joinedAt) {
      const now = new Date();
      const durationMs = now.getTime() - joinedAt.getTime();
      const durationMinutes = Math.floor(durationMs / 60000);
      
      const stats = this.getOrCreate(guildId, userId, null); // Voice stats sans channel spécifique
      stats.voiceMinutes += durationMinutes;
      
      this.voiceSessions.delete(key);
    }
  }
  
  /**
   * Track reaction donnée
   */
  public trackReactionGiven(guildId: string, userId: string, channelId: string): void {
    const stats = this.getOrCreate(guildId, userId, channelId);
    stats.reactionsGiven++;
  }
  
  /**
   * Track reaction reçue (sur message de targetUserId)
   */
  public trackReactionReceived(guildId: string, targetUserId: string, channelId: string): void {
    const stats = this.getOrCreate(guildId, targetUserId, channelId);
    stats.reactionsReceived++;
  }
  
  /**
   * Flush : envoie le batch au backend
   */
  public async flush(): Promise<void> {
    if (this.cache.size === 0) {
      container.logger.info('[StatsCollector] Nothing to flush');
      return;
    }
    
    const batch = Array.from(this.cache.values());
    
    try {
      const response = await fetch(`${process.env.BACKEND_URL}/stats/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GATEWAY_TOKEN}`
        },
        body: JSON.stringify(batch)
      });
      
      if (response.ok) {
        container.logger.info(`[StatsCollector] Flushed ${batch.length} entries`);
        this.cache.clear();
      } else {
        container.logger.error(`[StatsCollector] Flush failed: ${response.status}`);
      }
    } catch (error) {
      container.logger.error('[StatsCollector] Flush error:', error);
    }
  }
  
  /**
   * Flush au shutdown
   */
  public async shutdown(): Promise<void> {
    // Calculer durées voice pour sessions en cours
    for (const [key, joinedAt] of this.voiceSessions.entries()) {
      const [guildId, userId] = key.split('-');
      this.trackVoiceLeave(guildId, userId);
    }
    
    await this.flush();
  }
}

// Singleton
export const statsCollector = new StatsCollector();
```

**Tâches :**
- [ ] Créer le fichier
- [ ] Ajouter au container Sapphire dans `index.ts`
- [ ] Commit : `feat(bot): add StatsCollector service`

### 2.2 Créer les Listeners (1h)

**Fichier** : `apps/bot/src/listeners/stats/MessageCreateStats.ts`

```typescript
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Message } from 'discord.js';
import { statsCollector } from '../../services/StatsCollector';

@ApplyOptions<Listener.Options>({
  event: Events.MessageCreate
})
export class MessageCreateStatsListener extends Listener {
  public run(message: Message): void {
    if (!message.guild || message.author.bot) return;
    
    statsCollector.trackMessage(
      message.guild.id,
      message.author.id,
      message.channel.id
    );
  }
}
```

**Fichier** : `apps/bot/src/listeners/stats/MessageDeleteStats.ts`

```typescript
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Message, PartialMessage } from 'discord.js';
import { statsCollector } from '../../services/StatsCollector';

@ApplyOptions<Listener.Options>({
  event: Events.MessageDelete
})
export class MessageDeleteStatsListener extends Listener {
  public async run(message: Message | PartialMessage): Promise<void> {
    if (!message.guild || !message.author || message.author.bot) return;
    
    // Récupérer audit log pour savoir qui a supprimé
    const auditLogs = await message.guild.fetchAuditLogs({
      type: 72, // MESSAGE_DELETE
      limit: 1
    });
    
    const auditEntry = auditLogs.entries.first();
    const deletedBy = auditEntry?.executor?.id === message.author.id ? 'self' : 'mod';
    
    statsCollector.trackMessageDeleted(
      message.guild.id,
      message.author.id,
      message.channel.id,
      deletedBy
    );
  }
}
```

**Fichier** : `apps/bot/src/listeners/stats/MessageUpdateStats.ts`

```typescript
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Message, PartialMessage } from 'discord.js';
import { statsCollector } from '../../services/StatsCollector';

@ApplyOptions<Listener.Options>({
  event: Events.MessageUpdate
})
export class MessageUpdateStatsListener extends Listener {
  public run(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage): void {
    if (!newMessage.guild || !newMessage.author || newMessage.author.bot) return;
    if (oldMessage.content === newMessage.content) return; // Embed update
    
    statsCollector.trackMessageEdited(
      newMessage.guild.id,
      newMessage.author.id,
      newMessage.channel.id
    );
  }
}
```

**Fichier** : `apps/bot/src/listeners/stats/VoiceStateUpdateStats.ts`

```typescript
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { VoiceState } from 'discord.js';
import { statsCollector } from '../../services/StatsCollector';

@ApplyOptions<Listener.Options>({
  event: Events.VoiceStateUpdate
})
export class VoiceStateUpdateStatsListener extends Listener {
  public run(oldState: VoiceState, newState: VoiceState): void {
    if (!newState.guild || !newState.member || newState.member.user.bot) return;
    
    const wasInChannel = !!oldState.channel;
    const isInChannel = !!newState.channel;
    
    // Join
    if (!wasInChannel && isInChannel) {
      statsCollector.trackVoiceJoin(newState.guild.id, newState.member.id);
    }
    
    // Leave
    if (wasInChannel && !isInChannel) {
      statsCollector.trackVoiceLeave(newState.guild.id, newState.member.id);
    }
  }
}
```

**Fichier** : `apps/bot/src/listeners/stats/MessageReactionAddStats.ts`

```typescript
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { MessageReaction, User } from 'discord.js';
import { statsCollector } from '../../services/StatsCollector';

@ApplyOptions<Listener.Options>({
  event: Events.MessageReactionAdd
})
export class MessageReactionAddStatsListener extends Listener {
  public async run(reaction: MessageReaction, user: User): Promise<void> {
    if (!reaction.message.guild || user.bot) return;
    
    // Track reaction donnée
    statsCollector.trackReactionGiven(
      reaction.message.guild.id,
      user.id,
      reaction.message.channel.id
    );
    
    // Track reaction reçue par l'auteur du message
    if (reaction.message.author && !reaction.message.author.bot) {
      statsCollector.trackReactionReceived(
        reaction.message.guild.id,
        reaction.message.author.id,
        reaction.message.channel.id
      );
    }
  }
}
```

**Fichier** : `apps/bot/src/listeners/stats/GuildMemberAddStats.ts`

```typescript
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { GuildMember } from 'discord.js';

@ApplyOptions<Listener.Options>({
  event: Events.GuildMemberAdd
})
export class GuildMemberAddStatsListener extends Listener {
  public run(member: GuildMember): void {
    // Juste logger pour l'instant, pas besoin de stats
    this.container.logger.info(`[Stats] Member joined: ${member.user.tag} in ${member.guild.name}`);
  }
}
```

**Fichier** : `apps/bot/src/listeners/stats/GuildMemberUpdateStats.ts`

```typescript
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { GuildMember } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@ApplyOptions<Listener.Options>({
  event: Events.GuildMemberUpdate
})
export class GuildMemberUpdateStatsListener extends Listener {
  public async run(oldMember: GuildMember, newMember: GuildMember): Promise<void> {
    // Détecter changements de rôles
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;
    
    // Rôles ajoutés
    const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
    for (const [roleId] of addedRoles) {
      await prisma.memberRolesHistory.create({
        data: {
          guildId: newMember.guild.id,
          userId: newMember.id,
          roleId,
          action: 'added'
        }
      });
    }
    
    // Rôles retirés
    const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));
    for (const [roleId] of removedRoles) {
      await prisma.memberRolesHistory.create({
        data: {
          guildId: newMember.guild.id,
          userId: newMember.id,
          roleId,
          action: 'removed'
        }
      });
    }
  }
}
```

**Tâches :**
- [ ] Créer les 7 fichiers listeners
- [ ] Commit : `feat(bot): add stats event listeners`

### 2.3 Système de Flush Automatique (30 min)

**Fichier** : `apps/bot/src/index.ts` (mettre à jour)

```typescript
import { statsCollector } from './services/StatsCollector';

// Flush toutes les heures
setInterval(() => {
  statsCollector.flush();
}, 60 * 60 * 1000); // 1h

// Flush au shutdown propre
process.on('SIGTERM', async () => {
  await statsCollector.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await statsCollector.shutdown();
  process.exit(0);
});
```

**Tâches :**
- [ ] Ajouter le code dans `index.ts`
- [ ] Tester flush manuel : `statsCollector.flush()`
- [ ] Commit : `feat(bot): add auto-flush system for stats`

---

## 🔙 Phase 3 : Backend - StatsService Unifié (4h)

**Objectif** : 1 service simple et performant

### 3.1 Créer DTOs Partagés (30 min)

**Fichier** : `libs/shared/src/dto/stats/DailyStatsDto.ts`

```typescript
export interface DailyStatsDto {
  guildId: string;
  userId: string;
  channelId: string | null;
  date: string; // YYYY-MM-DD
  
  messagesSent: number;
  messagesDeleted: number;
  messagesEdited: number;
  deletedBySelf: number;
  deletedByMod: number;
  
  voiceMinutes: number;
  
  reactionsGiven: number;
  reactionsReceived: number;
  
  peakHour: number | null;
  firstMessageAt: Date | null;
  lastMessageAt: Date | null;
}
```

**Fichier** : `libs/shared/src/dto/stats/GuildStatsDto.ts`

```typescript
export interface GuildStatsDto {
  current: {
    totalMessages: number;
    totalVoiceMinutes: number;
    totalReactions: number;
    activeMembers: number;
  };
  
  previous: {
    totalMessages: number;
    totalVoiceMinutes: number;
    totalReactions: number;
    activeMembers: number;
  };
  
  changes: {
    messagesChange: number; // pourcentage
    voiceChange: number;
    reactionsChange: number;
    membersChange: number;
  };
  
  timeline: Array<{
    date: string;
    messages: number;
    voice: number;
    activeMembers: number;
  }>;
  
  topMembers: {
    messages: Array<{ userId: string; count: number }>;
    voice: Array<{ userId: string; minutes: number }>;
  };
  
  insights: string[];
  healthScore: number; // 0-100
}
```

**Fichier** : `libs/shared/src/dto/stats/MemberStatsDto.ts`

```typescript
export interface MemberStatsDto {
  userId: string;
  guildId: string;
  
  totals: {
    messages: number;
    messagesDeleted: number;
    messagesEdited: number;
    voiceMinutes: number;
    reactionsGiven: number;
    reactionsReceived: number;
  };
  
  timeline: Array<{
    date: string;
    messages: number;
    voice: number;
  }>;
  
  channelBreakdown: Array<{
    channelId: string;
    messages: number;
    voiceMinutes: number;
  }>;
  
  peakHours: number[]; // Heures les plus actives (0-23)
  
  ranks: {
    messages: number; // Rank dans le serveur
    voice: number;
  };
  
  consistency: number; // 0-1 (régularité activité)
  
  moderationFlags: {
    highDeleteRate: boolean;
    suspiciousActivity: boolean;
    newAccountHighActivity: boolean;
  };
  
  rolesHistory: Array<{
    roleId: string;
    action: 'added' | 'removed';
    timestamp: Date;
  }>;
}
```

**Tâches :**
- [ ] Créer les 3 DTOs
- [ ] Exporter dans `libs/shared/src/dto/stats/index.ts`
- [ ] Commit : `feat(shared): add stats DTOs`

### 3.2 Créer le StatsService (2h)

**Fichier** : `apps/backend/src/modules/stats/stats.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DailyStatsDto, GuildStatsDto, MemberStatsDto } from '@repo/shared/dto/stats';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}
  
  /**
   * Upsert batch de stats quotidiennes depuis le bot
   */
  async upsertDailyStats(batch: DailyStatsDto[]): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;
    
    for (const stats of batch) {
      const result = await this.prisma.statsDaily.upsert({
        where: {
          guildId_userId_date_channelId: {
            guildId: stats.guildId,
            userId: stats.userId,
            date: new Date(stats.date),
            channelId: stats.channelId || ''
          }
        },
        update: {
          messagesSent: { increment: stats.messagesSent },
          messagesDeleted: { increment: stats.messagesDeleted },
          messagesEdited: { increment: stats.messagesEdited },
          deletedBySelf: { increment: stats.deletedBySelf },
          deletedByMod: { increment: stats.deletedByMod },
          voiceMinutes: { increment: stats.voiceMinutes },
          reactionsGiven: { increment: stats.reactionsGiven },
          reactionsReceived: { increment: stats.reactionsReceived },
          peakHour: stats.peakHour,
          lastMessageAt: stats.lastMessageAt
        },
        create: {
          guildId: stats.guildId,
          userId: stats.userId,
          channelId: stats.channelId,
          date: new Date(stats.date),
          messagesSent: stats.messagesSent,
          messagesDeleted: stats.messagesDeleted,
          messagesEdited: stats.messagesEdited,
          deletedBySelf: stats.deletedBySelf,
          deletedByMod: stats.deletedByMod,
          voiceMinutes: stats.voiceMinutes,
          reactionsGiven: stats.reactionsGiven,
          reactionsReceived: stats.reactionsReceived,
          peakHour: stats.peakHour,
          firstMessageAt: stats.firstMessageAt,
          lastMessageAt: stats.lastMessageAt
        }
      });
      
      result ? updated++ : inserted++;
    }
    
    return { inserted, updated };
  }
  
  /**
   * Récupérer stats d'un serveur
   */
  async getGuildStats(guildId: string, period: '7d' | '30d' | '90d'): Promise<GuildStatsDto> {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const previousStartDate = new Date();
    previousStartDate.setDate(previousStartDate.getDate() - (days * 2));
    const previousEndDate = new Date();
    previousEndDate.setDate(previousEndDate.getDate() - days);
    
    // Stats période actuelle
    const currentStats = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COALESCE(SUM(messages_sent), 0)::int as total_messages,
        COALESCE(SUM(voice_minutes), 0)::int as total_voice_minutes,
        COALESCE(SUM(reactions_given), 0)::int as total_reactions,
        COUNT(DISTINCT user_id)::int as active_members
      FROM stats_daily
      WHERE guild_id = ${guildId}
        AND date >= ${startDate}
    `;
    
    // Stats période précédente
    const previousStats = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COALESCE(SUM(messages_sent), 0)::int as total_messages,
        COALESCE(SUM(voice_minutes), 0)::int as total_voice_minutes,
        COALESCE(SUM(reactions_given), 0)::int as total_reactions,
        COUNT(DISTINCT user_id)::int as active_members
      FROM stats_daily
      WHERE guild_id = ${guildId}
        AND date >= ${previousStartDate}
        AND date < ${previousEndDate}
    `;
    
    // Timeline
    const timeline = await this.prisma.$queryRaw<any[]>`
      SELECT 
        date::text,
        COALESCE(SUM(messages_sent), 0)::int as messages,
        COALESCE(SUM(voice_minutes), 0)::int as voice,
        COUNT(DISTINCT user_id)::int as active_members
      FROM stats_daily
      WHERE guild_id = ${guildId}
        AND date >= ${startDate}
      GROUP BY date
      ORDER BY date ASC
    `;
    
    // Top membres messages
    const topMessages = await this.prisma.$queryRaw<any[]>`
      SELECT 
        user_id as "userId",
        SUM(messages_sent)::int as count
      FROM stats_daily
      WHERE guild_id = ${guildId}
        AND date >= ${startDate}
      GROUP BY user_id
      ORDER BY count DESC
      LIMIT 10
    `;
    
    // Top membres voice
    const topVoice = await this.prisma.$queryRaw<any[]>`
      SELECT 
        user_id as "userId",
        SUM(voice_minutes)::int as minutes
      FROM stats_daily
      WHERE guild_id = ${guildId}
        AND date >= ${startDate}
      GROUP BY user_id
      ORDER BY minutes DESC
      LIMIT 10
    `;
    
    const current = currentStats[0];
    const previous = previousStats[0];
    
    return {
      current: {
        totalMessages: current.total_messages,
        totalVoiceMinutes: current.total_voice_minutes,
        totalReactions: current.total_reactions,
        activeMembers: current.active_members
      },
      previous: {
        totalMessages: previous.total_messages,
        totalVoiceMinutes: previous.total_voice_minutes,
        totalReactions: previous.total_reactions,
        activeMembers: previous.active_members
      },
      changes: {
        messagesChange: this.calculateChange(current.total_messages, previous.total_messages),
        voiceChange: this.calculateChange(current.total_voice_minutes, previous.total_voice_minutes),
        reactionsChange: this.calculateChange(current.total_reactions, previous.total_reactions),
        membersChange: this.calculateChange(current.active_members, previous.active_members)
      },
      timeline,
      topMembers: {
        messages: topMessages,
        voice: topVoice
      },
      insights: this.generateInsights(current, previous),
      healthScore: this.calculateHealthScore(current)
    };
  }
  
  /**
   * Récupérer stats d'un membre
   */
  async getMemberStats(guildId: string, userId: string, period: '30d' | '90d'): Promise<MemberStatsDto> {
    const days = period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Totaux
    const totals = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COALESCE(SUM(messages_sent), 0)::int as messages,
        COALESCE(SUM(messages_deleted), 0)::int as messages_deleted,
        COALESCE(SUM(messages_edited), 0)::int as messages_edited,
        COALESCE(SUM(voice_minutes), 0)::int as voice_minutes,
        COALESCE(SUM(reactions_given), 0)::int as reactions_given,
        COALESCE(SUM(reactions_received), 0)::int as reactions_received
      FROM stats_daily
      WHERE guild_id = ${guildId}
        AND user_id = ${userId}
        AND date >= ${startDate}
    `;
    
    // Timeline
    const timeline = await this.prisma.$queryRaw<any[]>`
      SELECT 
        date::text,
        SUM(messages_sent)::int as messages,
        SUM(voice_minutes)::int as voice
      FROM stats_daily
      WHERE guild_id = ${guildId}
        AND user_id = ${userId}
        AND date >= ${startDate}
      GROUP BY date
      ORDER BY date ASC
    `;
    
    // Breakdown par channel
    const channelBreakdown = await this.prisma.$queryRaw<any[]>`
      SELECT 
        channel_id as "channelId",
        SUM(messages_sent)::int as messages,
        SUM(voice_minutes)::int as "voiceMinutes"
      FROM stats_daily
      WHERE guild_id = ${guildId}
        AND user_id = ${userId}
        AND date >= ${startDate}
        AND channel_id IS NOT NULL
      GROUP BY channel_id
      ORDER BY messages DESC
      LIMIT 10
    `;
    
    // Peak hours
    const peakHours = await this.prisma.$queryRaw<any[]>`
      SELECT peak_hour as hour, COUNT(*) as count
      FROM stats_daily
      WHERE guild_id = ${guildId}
        AND user_id = ${userId}
        AND date >= ${startDate}
        AND peak_hour IS NOT NULL
      GROUP BY peak_hour
      ORDER BY count DESC
      LIMIT 5
    `;
    
    // Ranks
    const messageRank = await this.prisma.$queryRaw<any[]>`
      WITH ranked AS (
        SELECT 
          user_id,
          RANK() OVER (ORDER BY SUM(messages_sent) DESC) as rank
        FROM stats_daily
        WHERE guild_id = ${guildId}
          AND date >= ${startDate}
        GROUP BY user_id
      )
      SELECT rank::int FROM ranked WHERE user_id = ${userId}
    `;
    
    const voiceRank = await this.prisma.$queryRaw<any[]>`
      WITH ranked AS (
        SELECT 
          user_id,
          RANK() OVER (ORDER BY SUM(voice_minutes) DESC) as rank
        FROM stats_daily
        WHERE guild_id = ${guildId}
          AND date >= ${startDate}
        GROUP BY user_id
      )
      SELECT rank::int FROM ranked WHERE user_id = ${userId}
    `;
    
    // Roles history (90 derniers jours max)
    const rolesHistory = await this.prisma.memberRolesHistory.findMany({
      where: {
        guildId,
        userId,
        timestamp: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    });
    
    const t = totals[0];
    
    return {
      userId,
      guildId,
      totals: {
        messages: t.messages,
        messagesDeleted: t.messages_deleted,
        messagesEdited: t.messages_edited,
        voiceMinutes: t.voice_minutes,
        reactionsGiven: t.reactions_given,
        reactionsReceived: t.reactions_received
      },
      timeline,
      channelBreakdown,
      peakHours: peakHours.map(h => h.hour),
      ranks: {
        messages: messageRank[0]?.rank || 0,
        voice: voiceRank[0]?.rank || 0
      },
      consistency: this.calculateConsistency(timeline),
      moderationFlags: {
        highDeleteRate: t.messages_deleted / (t.messages || 1) > 0.2,
        suspiciousActivity: false, // TODO: implémenter logique
        newAccountHighActivity: false // TODO: implémenter logique
      },
      rolesHistory: rolesHistory.map(r => ({
        roleId: r.roleId,
        action: r.action as 'added' | 'removed',
        timestamp: r.timestamp
      }))
    };
  }
  
  // ===== HELPERS =====
  
  private calculateChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }
  
  private calculateHealthScore(stats: any): number {
    // Simple formule : activité vs moyenne attendue
    const expectedMessages = 100; // À ajuster
    const expectedVoice = 60;
    const expectedMembers = 10;
    
    const messageScore = Math.min((stats.total_messages / expectedMessages) * 40, 40);
    const voiceScore = Math.min((stats.total_voice_minutes / expectedVoice) * 30, 30);
    const memberScore = Math.min((stats.active_members / expectedMembers) * 30, 30);
    
    return Math.round(messageScore + voiceScore + memberScore);
  }
  
  private generateInsights(current: any, previous: any): string[] {
    const insights: string[] = [];
    
    const msgChange = this.calculateChange(current.total_messages, previous.total_messages);
    if (msgChange > 20) {
      insights.push(`🚀 Activité messages en hausse de ${msgChange}% !`);
    } else if (msgChange < -20) {
      insights.push(`📉 Activité messages en baisse de ${Math.abs(msgChange)}%`);
    }
    
    if (current.total_voice_minutes > previous.total_voice_minutes * 1.5) {
      insights.push(`🎤 Utilisation vocale en forte augmentation`);
    }
    
    if (current.active_members < 5) {
      insights.push(`⚠️ Peu de membres actifs récemment`);
    }
    
    return insights;
  }
  
  private calculateConsistency(timeline: any[]): number {
    if (timeline.length < 2) return 0;
    
    const values = timeline.map(t => t.messages);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Plus la variance est faible, plus la consistance est élevée
    const consistency = Math.max(0, 1 - (stdDev / (avg || 1)));
    return Math.round(consistency * 100) / 100;
  }
}
```

**Tâches :**
- [ ] Créer le fichier
- [ ] Tester requêtes SQL séparément
- [ ] Commit : `feat(backend): add StatsService with queries`

### 3.3 Créer le Controller (1h)

**Fichier** : `apps/backend/src/modules/stats/stats.controller.ts`

```typescript
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { DailyStatsDto, GuildStatsDto, MemberStatsDto } from '@repo/shared/dto/stats';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('stats')
export class StatsController {
  constructor(private statsService: StatsService) {}
  
  /**
   * POST /stats/batch - Appelé par le bot
   */
  @Post('batch')
  @UseGuards(JwtAuthGuard) // Vérifier token gateway
  async upsertBatch(@Body() batch: DailyStatsDto[]) {
    return this.statsService.upsertDailyStats(batch);
  }
  
  /**
   * GET /stats/guild/:guildId
   */
  @Get('guild/:guildId')
  @UseGuards(JwtAuthGuard)
  async getGuildStats(
    @Param('guildId') guildId: string,
    @Query('period') period: '7d' | '30d' | '90d' = '7d'
  ): Promise<GuildStatsDto> {
    return this.statsService.getGuildStats(guildId, period);
  }
  
  /**
   * GET /stats/member/:guildId/:userId
   */
  @Get('member/:guildId/:userId')
  @UseGuards(JwtAuthGuard)
  async getMemberStats(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Query('period') period: '30d' | '90d' = '30d'
  ): Promise<MemberStatsDto> {
    return this.statsService.getMemberStats(guildId, userId, period);
  }
}
```

**Tâches :**
- [ ] Créer le controller
- [ ] Créer module : `stats.module.ts`
- [ ] Importer dans `app.module.ts`
- [ ] Commit : `feat(backend): add stats REST controller`

### 3.4 Cache Redis (30 min)

**Fichier** : `apps/backend/src/modules/stats/stats-cache.interceptor.ts`

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class StatsCacheInterceptor implements NestInterceptor {
  constructor(private redis: RedisService) {}
  
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = `stats:${request.url}`;
    
    // Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return of(JSON.parse(cached));
    }
    
    // Execute et cache
    return next.handle().pipe(
      tap(async (data) => {
        await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 300); // 5min TTL
      })
    );
  }
}
```

**Utilisation dans controller :**

```typescript
@UseInterceptors(StatsCacheInterceptor)
@Get('guild/:guildId')
async getGuildStats(...) {
  ...
}
```

**Tâches :**
- [ ] Créer interceptor
- [ ] Appliquer sur endpoints GET
- [ ] Commit : `feat(backend): add Redis cache for stats`

---

## 🎨 Phase 4 : Frontend - Services & UI (3h)

**Objectif** : Consommer API proprement avec UI responsive

### 4.1 Services Façade (1h)

**Fichier** : `apps/frontend/src/app/services/stats/stats-api.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GuildStatsDto, MemberStatsDto } from '@repo/shared/dto/stats';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StatsApiService {
  private readonly apiUrl = `${environment.apiUrl}/stats`;
  
  constructor(private http: HttpClient) {}
  
  getGuildStats(guildId: string, period: '7d' | '30d' | '90d' = '7d'): Observable<GuildStatsDto> {
    return this.http.get<GuildStatsDto>(`${this.apiUrl}/guild/${guildId}?period=${period}`);
  }
  
  getMemberStats(guildId: string, userId: string, period: '30d' | '90d' = '30d'): Observable<MemberStatsDto> {
    return this.http.get<MemberStatsDto>(`${this.apiUrl}/member/${guildId}/${userId}?period=${period}`);
  }
}
```

**Fichier** : `apps/frontend/src/app/services/stats/stats-data.service.ts`

```typescript
import { Injectable, signal } from '@angular/core';
import { GuildStatsDto, MemberStatsDto } from '@repo/shared/dto/stats';

@Injectable({ providedIn: 'root' })
export class StatsDataService {
  // Signals
  guildStats = signal<GuildStatsDto | null>(null);
  memberStats = signal<MemberStatsDto | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  
  setGuildStats(stats: GuildStatsDto) {
    this.guildStats.set(stats);
  }
  
  setMemberStats(stats: MemberStatsDto) {
    this.memberStats.set(stats);
  }
  
  setLoading(loading: boolean) {
    this.loading.set(loading);
  }
  
  setError(error: string | null) {
    this.error.set(error);
  }
  
  reset() {
    this.guildStats.set(null);
    this.memberStats.set(null);
    this.loading.set(false);
    this.error.set(null);
  }
}
```

**Fichier** : `apps/frontend/src/app/services/stats/stats-facade.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { StatsApiService } from './stats-api.service';
import { StatsDataService } from './stats-data.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StatsFacadeService {
  constructor(
    private api: StatsApiService,
    private data: StatsDataService
  ) {}
  
  async loadGuildStats(guildId: string, period: '7d' | '30d' | '90d' = '7d') {
    this.data.setLoading(true);
    this.data.setError(null);
    
    try {
      const stats = await firstValueFrom(this.api.getGuildStats(guildId, period));
      this.data.setGuildStats(stats);
    } catch (error: any) {
      this.data.setError(error.message);
    } finally {
      this.data.setLoading(false);
    }
  }
  
  async loadMemberStats(guildId: string, userId: string, period: '30d' | '90d' = '30d') {
    this.data.setLoading(true);
    this.data.setError(null);
    
    try {
      const stats = await firstValueFrom(this.api.getMemberStats(guildId, userId, period));
      this.data.setMemberStats(stats);
    } catch (error: any) {
      this.data.setError(error.message);
    } finally {
      this.data.setLoading(false);
    }
  }
  
  // Getters
  get guildStats() {
    return this.data.guildStats();
  }
  
  get memberStats() {
    return this.data.memberStats();
  }
  
  get loading() {
    return this.data.loading();
  }
  
  get error() {
    return this.data.error();
  }
}
```

**Tâches :**
- [ ] Créer les 3 services
- [ ] Commit : `feat(frontend): add stats facade services`

### 4.2 Composants UI (2h)

**Fichier** : `apps/frontend/src/app/components/stats/guild-dashboard/guild-dashboard.component.ts`

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { StatsFacadeService } from '../../../services/stats/stats-facade.service';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'app-guild-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, ChartModule],
  template: `
    <div class="grid p-4">
      <!-- Period Selector -->
      <div class="col-12 mb-4">
        <p-button 
          label="7 jours" 
          [outlined]="period() !== '7d'"
          (onClick)="setPeriod('7d')"
          class="mr-2"
        />
        <p-button 
          label="30 jours" 
          [outlined]="period() !== '30d'"
          (onClick)="setPeriod('30d')"
          class="mr-2"
        />
        <p-button 
          label="90 jours" 
          [outlined]="period() !== '90d'"
          (onClick)="setPeriod('90d')"
        />
      </div>
      
      <!-- Stats Cards -->
      @if (stats()) {
        <div class="col-12 md:col-3">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold text-primary">{{ stats()!.current.totalMessages | number }}</div>
              <div class="text-sm text-gray-600 mt-2">Messages</div>
              <div class="text-xs mt-1" [class.text-green-500]="stats()!.changes.messagesChange > 0" [class.text-red-500]="stats()!.changes.messagesChange < 0">
                {{ stats()!.changes.messagesChange > 0 ? '+' : '' }}{{ stats()!.changes.messagesChange }}%
              </div>
            </div>
          </p-card>
        </div>
        
        <div class="col-12 md:col-3">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold text-primary">{{ stats()!.current.totalVoiceMinutes | number }}</div>
              <div class="text-sm text-gray-600 mt-2">Minutes vocales</div>
              <div class="text-xs mt-1" [class.text-green-500]="stats()!.changes.voiceChange > 0" [class.text-red-500]="stats()!.changes.voiceChange < 0">
                {{ stats()!.changes.voiceChange > 0 ? '+' : '' }}{{ stats()!.changes.voiceChange }}%
              </div>
            </div>
          </p-card>
        </div>
        
        <div class="col-12 md:col-3">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold text-primary">{{ stats()!.current.activeMembers }}</div>
              <div class="text-sm text-gray-600 mt-2">Membres actifs</div>
              <div class="text-xs mt-1" [class.text-green-500]="stats()!.changes.membersChange > 0" [class.text-red-500]="stats()!.changes.membersChange < 0">
                {{ stats()!.changes.membersChange > 0 ? '+' : '' }}{{ stats()!.changes.membersChange }}%
              </div>
            </div>
          </p-card>
        </div>
        
        <div class="col-12 md:col-3">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold text-primary">{{ stats()!.healthScore }}</div>
              <div class="text-sm text-gray-600 mt-2">Score santé</div>
            </div>
          </p-card>
        </div>
        
        <!-- Timeline Chart -->
        <div class="col-12 lg:col-8">
          <p-card>
            <div class="text-xl font-bold mb-4">Activité</div>
            <p-chart type="line" [data]="chartData()" [options]="chartOptions" />
          </p-card>
        </div>
        
        <!-- Insights -->
        <div class="col-12 lg:col-4">
          <p-card>
            <div class="text-xl font-bold mb-4">Insights</div>
            @for (insight of stats()!.insights; track $index) {
              <div class="mb-2 p-2 bg-blue-50 rounded">{{ insight }}</div>
            }
          </p-card>
        </div>
        
        <!-- Top Members -->
        <div class="col-12 md:col-6">
          <p-card>
            <div class="text-xl font-bold mb-4">Top Messages</div>
            @for (member of stats()!.topMembers.messages; track member.userId) {
              <div class="flex justify-between mb-2">
                <span>{{ member.userId }}</span>
                <span class="font-bold">{{ member.count }}</span>
              </div>
            }
          </p-card>
        </div>
        
        <div class="col-12 md:col-6">
          <p-card>
            <div class="text-xl font-bold mb-4">Top Vocal</div>
            @for (member of stats()!.topMembers.voice; track member.userId) {
              <div class="flex justify-between mb-2">
                <span>{{ member.userId }}</span>
                <span class="font-bold">{{ member.minutes }}min</span>
              </div>
            }
          </p-card>
        </div>
      }
      
      @if (loading()) {
        <div class="col-12 text-center">
          <i class="pi pi-spin pi-spinner text-4xl"></i>
        </div>
      }
    </div>
  `
})
export class GuildDashboardComponent implements OnInit {
  period = signal<'7d' | '30d' | '90d'>('7d');
  guildId!: string;
  
  constructor(
    private route: ActivatedRoute,
    public statsFacade: StatsFacadeService
  ) {}
  
  ngOnInit() {
    this.guildId = this.route.snapshot.params['guildId'];
    this.loadStats();
  }
  
  setPeriod(period: '7d' | '30d' | '90d') {
    this.period.set(period);
    this.loadStats();
  }
  
  loadStats() {
    this.statsFacade.loadGuildStats(this.guildId, this.period());
  }
  
  get stats() {
    return this.statsFacade.data.guildStats;
  }
  
  get loading() {
    return this.statsFacade.data.loading;
  }
  
  chartData = signal<any>({
    labels: [],
    datasets: []
  });
  
  chartOptions = {
    responsive: true,
    maintainAspectRatio: false
  };
  
  ngOnChanges() {
    const s = this.stats();
    if (s) {
      this.chartData.set({
        labels: s.timeline.map(t => t.date),
        datasets: [
          {
            label: 'Messages',
            data: s.timeline.map(t => t.messages),
            borderColor: '#3B82F6',
            tension: 0.4
          },
          {
            label: 'Membres actifs',
            data: s.timeline.map(t => t.activeMembers),
            borderColor: '#10B981',
            tension: 0.4
          }
        ]
      });
    }
  }
}
```

**Fichier** : `apps/frontend/src/app/components/stats/member-detail/member-detail.component.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { StatsFacadeService } from '../../../services/stats/stats-facade.service';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-member-detail',
  standalone: true,
  imports: [CommonModule, CardModule, ChartModule, TagModule],
  template: `
    <div class="grid p-4">
      @if (stats()) {
        <!-- Totals -->
        <div class="col-12 md:col-4">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold">{{ stats()!.totals.messages | number }}</div>
              <div class="text-sm text-gray-600">Messages</div>
            </div>
          </p-card>
        </div>
        
        <div class="col-12 md:col-4">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold">{{ stats()!.totals.voiceMinutes | number }}</div>
              <div class="text-sm text-gray-600">Minutes vocales</div>
            </div>
          </p-card>
        </div>
        
        <div class="col-12 md:col-4">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold">{{ stats()!.consistency * 100 | number:'1.0-0' }}%</div>
              <div class="text-sm text-gray-600">Régularité</div>
            </div>
          </p-card>
        </div>
        
        <!-- Moderation Flags -->
        @if (stats()!.moderationFlags.highDeleteRate || stats()!.moderationFlags.suspiciousActivity) {
          <div class="col-12">
            <p-card>
              <div class="text-xl font-bold mb-3">⚠️ Alertes modération</div>
              @if (stats()!.moderationFlags.highDeleteRate) {
                <p-tag severity="warning" value="Taux suppression élevé" class="mr-2" />
              }
              @if (stats()!.moderationFlags.suspiciousActivity) {
                <p-tag severity="danger" value="Activité suspecte" class="mr-2" />
              }
            </p-card>
          </div>
        }
        
        <!-- Timeline -->
        <div class="col-12">
          <p-card>
            <div class="text-xl font-bold mb-4">Activité</div>
            <p-chart type="line" [data]="chartData" />
          </p-card>
        </div>
        
        <!-- Channel Breakdown -->
        <div class="col-12 md:col-6">
          <p-card>
            <div class="text-xl font-bold mb-4">Channels favoris</div>
            @for (channel of stats()!.channelBreakdown.slice(0, 5); track channel.channelId) {
              <div class="flex justify-between mb-2">
                <span>{{ channel.channelId }}</span>
                <span class="font-bold">{{ channel.messages }} msg</span>
              </div>
            }
          </p-card>
        </div>
        
        <!-- Ranks -->
        <div class="col-12 md:col-6">
          <p-card>
            <div class="text-xl font-bold mb-4">Classements</div>
            <div class="mb-3">
              <span class="text-gray-600">Messages :</span>
              <span class="font-bold ml-2">#{{ stats()!.ranks.messages }}</span>
            </div>
            <div>
              <span class="text-gray-600">Vocal :</span>
              <span class="font-bold ml-2">#{{ stats()!.ranks.voice }}</span>
            </div>
          </p-card>
        </div>
      }
      
      @if (loading()) {
        <div class="col-12 text-center">
          <i class="pi pi-spin pi-spinner text-4xl"></i>
        </div>
      }
    </div>
  `
})
export class MemberDetailComponent implements OnInit {
  guildId!: string;
  userId!: string;
  
  constructor(
    private route: ActivatedRoute,
    public statsFacade: StatsFacadeService
  ) {}
  
  ngOnInit() {
    this.guildId = this.route.snapshot.params['guildId'];
    this.userId = this.route.snapshot.params['userId'];
    this.statsFacade.loadMemberStats(this.guildId, this.userId);
  }
  
  get stats() {
    return this.statsFacade.data.memberStats;
  }
  
  get loading() {
    return this.statsFacade.data.loading;
  }
  
  get chartData() {
    const s = this.stats();
    if (!s) return {};
    
    return {
      labels: s.timeline.map(t => t.date),
      datasets: [
        {
          label: 'Messages',
          data: s.timeline.map(t => t.messages),
          borderColor: '#3B82F6'
        }
      ]
    };
  }
}
```

**Tâches :**
- [ ] Créer les 2 composants
- [ ] Ajouter routes dans routing
- [ ] Tester affichage responsive
- [ ] Commit : `feat(frontend): add stats UI components`

---

## 🧪 Phase 5 : Tests End-to-End (2h)

**Objectif** : Valider le flux complet

### 5.1 Test Backend (30 min)

**Utiliser Postman/Insomnia**

```json
POST http://localhost:3000/stats/batch
Authorization: Bearer <token>
Content-Type: application/json

[
  {
    "guildId": "123456",
    "userId": "789012",
    "channelId": "345678",
    "date": "2025-10-24",
    "messagesSent": 50,
    "messagesDeleted": 2,
    "messagesEdited": 5,
    "deletedBySelf": 1,
    "deletedByMod": 1,
    "voiceMinutes": 120,
    "reactionsGiven": 10,
    "reactionsReceived": 15,
    "peakHour": 18,
    "firstMessageAt": "2025-10-24T08:00:00Z",
    "lastMessageAt": "2025-10-24T20:00:00Z"
  }
]
```

Vérifier :
- [ ] 200 OK
- [ ] Données dans `stats_daily`

```json
GET http://localhost:3000/stats/guild/123456?period=7d
```

Vérifier :
- [ ] Retourne GuildStatsDto correct
- [ ] Timeline remplie
- [ ] Top members

**Tâches :**
- [ ] Tester tous les endpoints
- [ ] Vérifier temps réponse (<200ms)
- [ ] Commit : `test(backend): validate stats endpoints`

### 5.2 Test Bot (1h)

- [ ] Lancer bot en dev
- [ ] Envoyer messages Discord
- [ ] Rejoindre/quitter vocal
- [ ] Attendre flush (1h ou forcer)
- [ ] Vérifier logs backend
- [ ] Vérifier DB

**Tâches :**
- [ ] Valider tous les listeners
- [ ] Commit : `test(bot): validate stats collection`

### 5.3 Test Frontend (30 min)

- [ ] Lancer frontend
- [ ] Naviguer dashboard serveur
- [ ] Changer période
- [ ] Voir profil membre
- [ ] Tester responsive mobile

**Tâches :**
- [ ] Screenshots
- [ ] Commit : `test(frontend): validate stats UI`

---

## 🚀 Phase 6 : Optimisations & Worker (2h)

**Objectif** : Agrégation mensuelle + cleanup

### 6.1 Worker Agrégation Mensuelle (1h)

**Fichier** : `apps/backend/src/modules/stats/stats-aggregation.worker.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsAggregationWorker {
  private readonly logger = new Logger(StatsAggregationWorker.name);
  
  constructor(private prisma: PrismaService) {}
  
  /**
   * Run tous les 1er du mois à 3h du matin
   */
  @Cron('0 3 1 * *')
  async aggregateMonthlyStats() {
    this.logger.log('Starting monthly aggregation...');
    
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const monthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const monthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
    
    // Agréger par guild + user
    const aggregates = await this.prisma.$queryRaw<any[]>`
      SELECT 
        guild_id,
        user_id,
        SUM(messages_sent)::int as total_messages,
        SUM(voice_minutes)::int as total_voice_minutes,
        SUM(reactions_given)::int as total_reactions_given,
        SUM(reactions_received)::int as total_reactions_received,
        AVG(messages_sent)::decimal(10,2) as avg_messages_per_day,
        AVG(voice_minutes)::decimal(10,2) as avg_voice_per_day,
        jsonb_object_agg(channel_id, messages_sent) FILTER (WHERE channel_id IS NOT NULL) as top_channels
      FROM stats_daily
      WHERE date >= ${monthStart}
        AND date <= ${monthEnd}
      GROUP BY guild_id, user_id
    `;
    
    // Insérer dans stats_monthly
    for (const agg of aggregates) {
      await this.prisma.statsMonthly.upsert({
        where: {
          guildId_userId_month: {
            guildId: agg.guild_id,
            userId: agg.user_id,
            month: monthStart
          }
        },
        update: {
          totalMessages: agg.total_messages,
          totalVoiceMinutes: agg.total_voice_minutes,
          totalReactionsGiven: agg.total_reactions_given,
          totalReactionsReceived: agg.total_reactions_received,
          avgMessagesPerDay: agg.avg_messages_per_day,
          avgVoicePerDay: agg.avg_voice_per_day,
          topChannels: agg.top_channels
        },
        create: {
          guildId: agg.guild_id,
          userId: agg.user_id,
          month: monthStart,
          totalMessages: agg.total_messages,
          totalVoiceMinutes: agg.total_voice_minutes,
          totalReactionsGiven: agg.total_reactions_given,
          totalReactionsReceived: agg.total_reactions_received,
          avgMessagesPerDay: agg.avg_messages_per_day,
          avgVoicePerDay: agg.avg_voice_per_day,
          topChannels: agg.top_channels
        }
      });
    }
    
    this.logger.log(`Monthly aggregation done: ${aggregates.length} entries`);
  }
  
  /**
   * Refresh materialized views (quotidien à 2h)
   */
  @Cron('0 2 * * *')
  async refreshMaterializedViews() {
    this.logger.log('Refreshing materialized views...');
    
    await this.prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_messages`;
    
    this.logger.log('Materialized views refreshed');
  }
}
```

**Tâches :**
- [ ] Créer worker
- [ ] Ajouter dans module
- [ ] Tester manuellement
- [ ] Commit : `feat(backend): add stats aggregation worker`

### 6.2 Métriques Monitoring (1h)

**Optionnel mais recommandé**

```typescript
// Logger temps requêtes
import { Logger } from '@nestjs/common';

@Injectable()
export class StatsPerformanceInterceptor implements NestInterceptor {
  private logger = new Logger('StatsPerformance');
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(`Query took ${duration}ms`);
        
        if (duration > 500) {
          this.logger.warn(`Slow query detected: ${duration}ms`);
        }
      })
    );
  }
}
```

**Tâches :**
- [ ] Ajouter monitoring
- [ ] Logger métriques
- [ ] Commit : `feat(backend): add performance monitoring`

---

## 📚 Phase 7 : Documentation (1h)

### 7.1 Doc Architecture

**Fichier** : `docs/architecture/STATS_SYSTEM.md`

```markdown
# Système de Stats & Métriques

## Architecture

### 3 Niveaux de données
- **Events raw** (7j) : Audit/Debug
- **Daily aggregates** (90j) : Stats quotidiennes
- **Monthly aggregates** (∞) : Historique compressé

### Stack
- TimescaleDB (hypertables + continuous aggregates)
- Redis (cache 5min)
- Worker cron (agrégation mensuelle)

## Flux de données

Bot → StatsCollector (cache) → Flush 1h → Backend /stats/batch → TimescaleDB

Frontend → Backend /stats/guild ou /member → Redis cache → Postgres

## Tables

### stats_daily
- Partition par date (chunks 7j)
- Retention 90j auto
- Index : guild_id, user_id, date

### stats_monthly
- Agrégation 1er du mois (worker)
- Pas de retention

## Performances

- Requêtes < 200ms
- Cache Redis 5min
- Continuous aggregates
- Materialized views refresh quotidien

## Évolution

- Support multi-instances bot
- Sharding par guild_id si >100k serveurs
- Archive cold storage (S3) pour historique >1 an
```

**Tâches :**
- [ ] Créer doc
- [ ] Diagrammes si besoin
- [ ] Commit : `docs: add stats system architecture`

### 7.2 Guide Développeur

**Fichier** : `docs/dev/STATS_DEV_GUIDE.md`

```markdown
# Guide Dev - Stats

## Ajouter une nouvelle métrique

1. **Bot** : Tracker event dans `StatsCollector`
2. **Schema** : Ajouter colonne dans `stats_daily`
3. **Backend** : Mettre à jour queries dans `StatsService`
4. **DTO** : Ajouter field dans DTOs
5. **Frontend** : Afficher dans UI

## Débug

### Vérifier flush bot
```bash
docker logs bot | grep StatsCollector
```

### Vérifier DB
```sql
SELECT * FROM stats_daily WHERE guild_id = '123' ORDER BY date DESC LIMIT 10;
```

### Tester endpoint
```bash
curl http://localhost:3000/stats/guild/123?period=7d
```

## Performances

- Toujours utiliser index (guild_id, date)
- Limiter scans full table
- Profiler queries lentes : `EXPLAIN ANALYZE`
```

**Tâches :**
- [ ] Créer guide
- [ ] Commit : `docs: add stats developer guide`

---

## ✅ Phase 8 : Déploiement (1h)

### 8.1 Pre-deployment

- [ ] Review code complet
- [ ] Tous tests passent
- [ ] Doc à jour
- [ ] Backup DB prod

### 8.2 Déploiement

**Migration DB**
```bash
# Prod
psql -h <host> -U <user> -d <db> -f prisma/migrations/XXX_stats_v2.sql
npx prisma generate
```

**Backend**
```bash
docker-compose restart backend
```

**Bot**
```bash
docker-compose restart bot
```

**Frontend**
```bash
npm run build:frontend
# Deploy Vercel/Netlify
```

### 8.3 Post-deployment

- [ ] Vérifier logs
- [ ] Tester endpoints prod
- [ ] Monitoring actif
- [ ] 🎉 **DONE!**

---

## 📊 Checklist Finale

### Backend
- [ ] Schema TimescaleDB créé
- [ ] StatsService implémenté
- [ ] Controller + routes
- [ ] Cache Redis
- [ ] Worker agrégation

### Bot
- [ ] StatsCollector créé
- [ ] 7 listeners actifs
- [ ] Flush automatique
- [ ] Logs clairs

### Frontend
- [ ] Services façade
- [ ] GuildDashboard component
- [ ] MemberDetail component
- [ ] Responsive mobile

### Infrastructure
- [ ] Migrations DB
- [ ] Tests E2E
- [ ] Documentation
- [ ] Monitoring

---

## 🔮 Améliorations Futures (Post-MVP)

### Features Premium (Version Payante)
- Historique illimité (>90j)
- Export CSV/PDF
- Alertes custom
- Comparaisons inter-serveurs
- Prédictions ML

### Modération Auto
- Détection spam patterns
- Alertes raid
- Scores membres automatiques

### Gamification
- Badges auto ("Night Owl", "Most Active")
- Leaderboards publics
- Achievements

### Performance
- Sharding DB par guild
- Read replicas
- Archive S3 (>1 an)

---

**Temps total estimé : 5-7 jours**
