# 📊 STATS MODULE - PLAN D'IMPLÉMENTATION COMPLET

**Version** : 1.0  
**Date création** : 07 Novembre 2025  
**Status** : 🔴 Non démarré

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Architecture Technique](#architecture-technique)
3. [Décisions Techniques Clés](#décisions-techniques-clés)
4. [Plan d'Implémentation par Phases](#plan-dimplémentation-par-phases)
5. [Checklist Globale](#checklist-globale)
6. [Annexes](#annexes)

---

## 🎯 Vue d'Ensemble

### Objectif
Créer un **module Stats complet et modulaire** pour Discord Admin App, avec :
- ✅ Architecture basée sur le système de modules (activable/désactivable)
- ✅ Différenciation Free/Premium claire
- ✅ TimescaleDB optimisé pour time-series
- ✅ Dashboard moderne avec graphiques attirants
- ✅ Performance et scalabilité (1000+ serveurs)

### Contexte Business
- **Public cible** : Serveurs communautaires de créateurs de contenu
- **Modèle** : Freemium (version gratuite limitée + premium par serveur)
- **Contrainte** : Utilisateurs Free doivent coûter très peu (optimisation DB)

### Résultat Attendu
- Module Stats production-ready en **Semaine 1** (Backend + Bot)
- Dashboard Frontend moderne en **Semaine 2**
- Code maintenable, testé (>80% coverage), documenté

---

## 🏗️ Architecture Technique

### Stack
- **Backend** : NestJS + Prisma + PostgreSQL + TimescaleDB
- **Bot** : SapphireJS (Discord.js)
- **Frontend** : Angular 20 + PrimeNG + Chart.js/Recharts
- **Cache** : Redis
- **Jobs** : BullMQ (agrégations cron)

### Principe Architectural : Event Sourcing Light

```
Discord Events → Bot Listeners → Gateway WebSocket → Backend EventsService
                                                            ↓
                                                    stats_events (hypertable)
                                                            ↓
                                                    BullMQ Cron Jobs
                                                            ↓
                                    ┌───────────────────────┴──────────────────────┐
                                    ↓                                               ↓
                        stats_aggregated_5min                         stats_aggregated_daily
                        (continuous aggregate)                        (continuous aggregate)
                                    ↓                                               ↓
                                                    ↓
                                        stats_member_cumulative
                                        (compteurs par membre)
                                                    ↓
                                            API REST Endpoints
                                                    ↓
                                            Frontend Dashboard
```

---

## 📊 Structure des Tables

### Table 1 : `stats_events` (Hypertable TimescaleDB)

**Rôle** : Stocker tous les events bruts Discord pour calculs ultérieurs

```prisma
model StatsEvent {
  // Identification
  id          String   @id @default(cuid())
  guildId     String   @map("guild_id")
  
  // Type d'event
  type        String   // MESSAGE_CREATE, VOICE_JOIN, VOICE_LEAVE, MEMBER_JOIN, etc.
  
  // Timestamp (clé de partition TimescaleDB)
  timestamp   DateTime @db.Timestamptz
  
  // Entités Discord (nullable selon type)
  userId      String?  @map("user_id")
  channelId   String?  @map("channel_id")
  messageId   String?  @map("message_id")
  
  // Metadata flexible (JSONB)
  metadata    Json?    @db.JsonB
  
  // Timestamps audit
  createdAt   DateTime @default(now()) @map("created_at")
  
  @@map("stats_events")
  @@index([guildId, timestamp(sort: Desc)])
  @@index([userId, timestamp(sort: Desc)])
  @@index([type, timestamp(sort: Desc)])
}
```

**Exemples de metadata par type** :
```json
// MESSAGE_CREATE
{
  "hasAttachments": true,
  "hasLinks": false,
  "contentLength": 150
}

// VOICE_JOIN / VOICE_LEAVE
{
  "muted": false,
  "deafened": false,
  "channelType": "GUILD_VOICE"
}

// REACTION_ADD
{
  "emoji": "👍",
  "emojiId": null,
  "messageAuthorId": "123456"
}

// MEMBER_JOIN
{
  "inviteCode": "abc123",
  "isBot": false
}
```

**Configuration TimescaleDB** :
```sql
-- Convert to hypertable (partition par jour)
SELECT create_hypertable('stats_events', 'timestamp', 
  chunk_time_interval => INTERVAL '1 day'
);

-- Compression après 7 jours (économie 90-95%)
ALTER TABLE stats_events SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'guild_id',
  timescaledb.compress_orderby = 'timestamp DESC'
);
SELECT add_compression_policy('stats_events', INTERVAL '7 days');

-- Retention policy (différente selon plan)
-- Free: 7 jours
SELECT add_retention_policy('stats_events', INTERVAL '7 days');

-- Premium: 30 jours
-- (sera géré dynamiquement selon guild_modules.config)
```

---

### Table 2 : `stats_aggregated_5min` (Continuous Aggregate)

**Rôle** : Agrégations toutes les 5 minutes pour graphiques "live" (24h)

```prisma
model StatsAggregated5min {
  // Identification
  guildId         String   @map("guild_id")
  
  // Période (bucket de 5 minutes)
  bucket          DateTime @db.Timestamptz
  
  // Métriques agrégées
  messageCount    Int      @default(0) @map("message_count")
  voiceMinutes    Int      @default(0) @map("voice_minutes")
  reactionCount   Int      @default(0) @map("reaction_count")
  activeUsers     Int      @default(0) @map("active_users")
  
  // Timestamps
  createdAt       DateTime @default(now()) @map("created_at")
  
  @@id([guildId, bucket])
  @@map("stats_aggregated_5min")
  @@index([guildId, bucket(sort: Desc)])
}
```

**Configuration TimescaleDB** :
```sql
-- Continuous aggregate (auto-update toutes les 5 min)
CREATE MATERIALIZED VIEW stats_aggregated_5min
WITH (timescaledb.continuous) AS
SELECT 
  guild_id,
  time_bucket('5 minutes', timestamp) AS bucket,
  COUNT(*) FILTER (WHERE type = 'MESSAGE_CREATE') AS message_count,
  COUNT(*) FILTER (WHERE type IN ('VOICE_JOIN', 'VOICE_LEAVE')) AS voice_minutes,
  COUNT(*) FILTER (WHERE type = 'REACTION_ADD') AS reaction_count,
  COUNT(DISTINCT user_id) AS active_users
FROM stats_events
GROUP BY guild_id, bucket;

-- Refresh policy (toutes les 5 min)
SELECT add_continuous_aggregate_policy('stats_aggregated_5min',
  start_offset => INTERVAL '1 hour',
  end_offset => INTERVAL '5 minutes',
  schedule_interval => INTERVAL '5 minutes'
);

-- Retention (7j Free, 90j Premium)
SELECT add_retention_policy('stats_aggregated_5min', INTERVAL '7 days');
```

---

### Table 3 : `stats_aggregated_daily` (Continuous Aggregate)

**Rôle** : Agrégations journalières pour historique (7j, 30j, all time)

```prisma
model StatsAggregatedDaily {
  // Identification
  guildId         String   @map("guild_id")
  
  // Période (jour)
  date            DateTime @db.Date
  
  // Métriques agrégées
  messageCount    Int      @default(0) @map("message_count")
  voiceMinutes    Int      @default(0) @map("voice_minutes")
  reactionCount   Int      @default(0) @map("reaction_count")
  activeUsers     Int      @default(0) @map("active_users")
  newMembers      Int      @default(0) @map("new_members")
  leftMembers     Int      @default(0) @map("left_members")
  
  // Top channels (JSONB array)
  topChannels     Json?    @db.JsonB
  
  // Timestamps
  createdAt       DateTime @default(now()) @map("created_at")
  
  @@id([guildId, date])
  @@map("stats_aggregated_daily")
  @@index([guildId, date(sort: Desc)])
}
```

**Configuration TimescaleDB** :
```sql
-- Continuous aggregate (auto-update chaque jour)
CREATE MATERIALIZED VIEW stats_aggregated_daily
WITH (timescaledb.continuous) AS
SELECT 
  guild_id,
  time_bucket('1 day', timestamp) AS date,
  COUNT(*) FILTER (WHERE type = 'MESSAGE_CREATE') AS message_count,
  -- Note: voice_minutes nécessite calcul spécial (voir ci-dessous)
  COUNT(*) FILTER (WHERE type = 'REACTION_ADD') AS reaction_count,
  COUNT(DISTINCT user_id) AS active_users,
  COUNT(*) FILTER (WHERE type = 'MEMBER_JOIN') AS new_members,
  COUNT(*) FILTER (WHERE type = 'MEMBER_LEAVE') AS left_members
FROM stats_events
GROUP BY guild_id, date;

-- Refresh policy (chaque jour à 1h du matin)
SELECT add_continuous_aggregate_policy('stats_aggregated_daily',
  start_offset => INTERVAL '7 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day'
);

-- Retention (30j Free, illimité Premium)
SELECT add_retention_policy('stats_aggregated_daily', INTERVAL '30 days');
```

---

### Table 4 : `stats_member_cumulative`

**Rôle** : Compteurs cumulatifs par membre pour leaderboards

```prisma
model StatsMemberCumulative {
  // Identification
  id              String   @id @default(cuid())
  guildId         String   @map("guild_id")
  userId          String   @map("user_id")
  
  // Compteurs cumulatifs
  totalMessages   Int      @default(0) @map("total_messages")
  totalVoiceMinutes Int    @default(0) @map("total_voice_minutes")
  totalReactions  Int      @default(0) @map("total_reactions")
  
  // Dernière activité
  lastMessageAt   DateTime? @map("last_message_at") @db.Timestamptz
  lastVoiceAt     DateTime? @map("last_voice_at") @db.Timestamptz
  lastSeenAt      DateTime? @map("last_seen_at") @db.Timestamptz
  
  // Timestamps
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  @@unique([guildId, userId])
  @@map("stats_member_cumulative")
  @@index([guildId, totalMessages(sort: Desc)])
  @@index([guildId, totalVoiceMinutes(sort: Desc)])
  @@index([guildId, totalReactions(sort: Desc)])
}
```

**Mise à jour** : Via cron job (toutes les 5 minutes) qui agrège depuis `stats_events`

---

### Table 5 : `guild_modules` (Déjà existante, ajout config Stats)

**Ajout dans la config du module** :
```typescript
// Config stockée dans guild_modules.config (JSONB)
interface StatsModuleConfig {
  plan: 'free' | 'premium';
  enabled: boolean;
  
  // Retention policies
  eventsRetentionDays: 7 | 30;
  aggregated5minRetentionDays: 7 | 90;
  aggregatedDailyRetentionDays: 30 | null; // null = illimité
  
  // Features
  channelBreakdown: boolean;
  memberLeaderboardLimit: 10 | 50;
  exportData: boolean;
  realTimeUpdates: boolean;
  
  // Vocal tracking
  excludeAfkChannels: boolean;
  trackMutedSeparately: boolean;
}
```

---

## 🔑 Décisions Techniques Clés

### 1. Vocal Tracking - Solution "Snapshot"

**Problème identifié** :
- Ancien système : Sessions Redis → Perte de données si bot/backend reboot pendant une session

**Solution retenue** :
- Enregistrer chaque `VoiceStateUpdate` comme event dans `stats_events`
- Calculer le temps vocal via cron job en comparant les timestamps
- Pas de state en mémoire/Redis

**Avantages** :
- ✅ Résistant aux reboots
- ✅ Source of truth = events bruts
- ✅ Peut recalculer si erreur
- ✅ Précision garantie (timestamps Discord)

**Calcul vocal time** (pseudo-code) :
```typescript
// Cron toutes les 5 minutes
async calculateVoiceTime(guildId: string) {
  // 1. Récupérer tous les events VOICE_* des 5 dernières minutes
  const events = await getVoiceEvents(guildId, last5min);
  
  // 2. Grouper par userId
  const userSessions = groupBy(events, 'userId');
  
  // 3. Pour chaque user, calculer le temps
  for (const [userId, userEvents] of userSessions) {
    let voiceMinutes = 0;
    let currentJoinTime = null;
    
    for (const event of userEvents) {
      if (event.type === 'VOICE_JOIN') {
        currentJoinTime = event.timestamp;
      }
      
      if (event.type === 'VOICE_LEAVE' && currentJoinTime) {
        const duration = event.timestamp - currentJoinTime;
        voiceMinutes += duration / 60000; // ms to minutes
        currentJoinTime = null;
      }
    }
    
    // Si user encore en vocal, compter jusqu'à maintenant
    if (currentJoinTime) {
      const duration = Date.now() - currentJoinTime;
      voiceMinutes += duration / 60000;
    }
    
    // 4. Update stats_member_cumulative
    await updateMemberStats(guildId, userId, { voiceMinutes });
  }
}
```

---

### 2. Optimisation Coûts Free vs Premium

**Stratégie** :
- Free : Rétention réduite (7j events, 7j 5min, 30j daily)
- Premium : Rétention étendue (30j events, 90j 5min, illimité daily)
- Compression TimescaleDB après 7j : Économie 90-95% d'espace

**Impact budget estimé** (1000 serveurs) :
- Free : ~5 GB total
- Premium : ~25 GB total
- **Coût DB** : ~$0.02-0.03/serveur/mois
- **Marge confortable** si premium à $5/mois

**Implémentation** :
```typescript
// Dans StatsModuleService
async applyRetentionPolicies(guildId: string) {
  const config = await this.getModuleConfig(guildId);
  const plan = config.plan; // 'free' | 'premium'
  
  // Adapter les retention policies dynamiquement
  if (plan === 'free') {
    await this.setRetention('stats_events', guildId, '7 days');
    await this.setRetention('stats_aggregated_5min', guildId, '7 days');
    await this.setRetention('stats_aggregated_daily', guildId, '30 days');
  } else {
    await this.setRetention('stats_events', guildId, '30 days');
    await this.setRetention('stats_aggregated_5min', guildId, '90 days');
    await this.setRetention('stats_aggregated_daily', guildId, null); // illimité
  }
}
```

---

### 3. Events Trackés (MVP - Tier 1)

**Priorité maximale** :
```typescript
enum StatsEventType {
  MESSAGE_CREATE = 'MESSAGE_CREATE',
  VOICE_JOIN = 'VOICE_JOIN',
  VOICE_LEAVE = 'VOICE_LEAVE',
  MEMBER_JOIN = 'MEMBER_JOIN',
  MEMBER_LEAVE = 'MEMBER_LEAVE',
  REACTION_ADD = 'REACTION_ADD',
}
```

**Post-MVP (Tier 2)** :
- THREAD_CREATE, THREAD_MESSAGE
- STAGE_SPEAKER_ADD, STAGE_LISTENER_COUNT
- MESSAGE_EDIT, MESSAGE_DELETE

---

### 4. Granularités Dashboard

**Dashboard Overview** :
- Période : 7j ou 30j
- Source : `stats_aggregated_daily`
- Graphiques : Line charts évolution, bar charts top channels

**Graphiques Live** :
- Période : 24h
- Source : `stats_aggregated_5min`
- Graphiques : Line chart temps réel (actualisé toutes les 5min)

---

## 📅 Plan d'Implémentation par Phases

### PHASE 1 : Schema & Infrastructure (Durée : 1 jour)

**Objectif** : Créer la base de données et la structure module

#### Tâche 1.1 : Module Definition ✅ / ❌
**Durée** : 30 min

**Fichier** : `apps/backend/src/modules/stats/stats.definition.ts`

**Contenu** :
```typescript
import { ModuleDefinition, ModuleCategory } from '@my-project/shared-types';

export const STATS_MODULE_DEFINITION: ModuleDefinition = {
  id: 'stats',
  name: 'Statistics & Analytics',
  description: 'Track server activity, member engagement, and vocal time',
  icon: '📊',
  category: ModuleCategory.ANALYTICS,
  
  availability: {
    free: true,
    premium: true,
  },
  
  limits: {
    free: {
      eventsRetentionDays: 7,
      aggregated5minRetentionDays: 7,
      aggregatedDailyRetentionDays: 30,
      memberLeaderboardLimit: 10,
      channelBreakdown: false,
      exportData: false,
      realTimeUpdates: false,
    },
    premium: {
      eventsRetentionDays: 30,
      aggregated5minRetentionDays: 90,
      aggregatedDailyRetentionDays: -1, // illimité
      memberLeaderboardLimit: 50,
      channelBreakdown: true,
      exportData: true,
      realTimeUpdates: true,
    },
  },
  
  defaultConfig: {
    plan: 'free',
    enabled: false,
    excludeAfkChannels: true,
    trackMutedSeparately: false,
  },
  
  runtime: {
    backend: true,
    bot: true,
  },
};
```

**Checklist** :
- [ ] Fichier créé
- [ ] Limites Free/Premium définies
- [ ] Config par défaut définie
- [ ] Commit : `feat(stats): Add module definition`

---

#### Tâche 1.2 : Schema Prisma ✅ / ❌
**Durée** : 1h

**Fichier** : `apps/backend/prisma/schema.prisma`

**Actions** :
1. Ajouter les 4 models (voir section "Structure des Tables")
2. Ajouter les indexes
3. Ajouter les comments

**Commandes** :
```bash
# Créer migration
npx prisma migrate dev --name add_stats_module

# Générer client
npx prisma generate
```

**Checklist** :
- [ ] Model `StatsEvent` ajouté
- [ ] Model `StatsAggregated5min` ajouté
- [ ] Model `StatsAggregatedDaily` ajouté
- [ ] Model `StatsMemberCumulative` ajouté
- [ ] Indexes créés
- [ ] Migration créée
- [ ] Client Prisma généré
- [ ] Commit : `feat(stats): Add Prisma schema for stats module`

---

#### Tâche 1.3 : Migration TimescaleDB ✅ / ❌
**Durée** : 1h

**Fichier** : Créer `apps/backend/prisma/migrations/XXXXXX_add_stats_module/timescaledb.sql`

**Contenu** :
```sql
-- ============================================
-- STATS MODULE - TIMESCALEDB SETUP
-- ============================================

-- 1. Convert stats_events to hypertable
SELECT create_hypertable(
  'stats_events', 
  'timestamp',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- 2. Compression policy (après 7 jours)
ALTER TABLE stats_events SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'guild_id',
  timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy(
  'stats_events',
  INTERVAL '7 days',
  if_not_exists => TRUE
);

-- 3. Retention policy (7 jours par défaut, modifiable par guild)
SELECT add_retention_policy(
  'stats_events',
  INTERVAL '7 days',
  if_not_exists => TRUE
);

-- ============================================
-- CONTINUOUS AGGREGATE: stats_aggregated_5min
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS stats_aggregated_5min
WITH (timescaledb.continuous) AS
SELECT 
  guild_id,
  time_bucket('5 minutes', timestamp) AS bucket,
  
  -- Métriques de base
  COUNT(*) FILTER (WHERE type = 'MESSAGE_CREATE') AS message_count,
  COUNT(*) FILTER (WHERE type = 'REACTION_ADD') AS reaction_count,
  COUNT(DISTINCT user_id) AS active_users,
  
  -- Vocal (estimation basique, sera affiné par cron)
  COUNT(*) FILTER (WHERE type = 'VOICE_JOIN') AS voice_joins,
  COUNT(*) FILTER (WHERE type = 'VOICE_LEAVE') AS voice_leaves,
  
  -- Timestamp de création
  NOW() AS created_at
  
FROM stats_events
GROUP BY guild_id, bucket;

-- Refresh policy (toutes les 5 minutes)
SELECT add_continuous_aggregate_policy(
  'stats_aggregated_5min',
  start_offset => INTERVAL '1 hour',
  end_offset => INTERVAL '5 minutes',
  schedule_interval => INTERVAL '5 minutes',
  if_not_exists => TRUE
);

-- Retention policy (7 jours par défaut)
SELECT add_retention_policy(
  'stats_aggregated_5min',
  INTERVAL '7 days',
  if_not_exists => TRUE
);

-- ============================================
-- CONTINUOUS AGGREGATE: stats_aggregated_daily
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS stats_aggregated_daily
WITH (timescaledb.continuous) AS
SELECT 
  guild_id,
  time_bucket('1 day', timestamp)::date AS date,
  
  -- Métriques de base
  COUNT(*) FILTER (WHERE type = 'MESSAGE_CREATE') AS message_count,
  COUNT(*) FILTER (WHERE type = 'REACTION_ADD') AS reaction_count,
  COUNT(DISTINCT user_id) AS active_users,
  
  -- Members
  COUNT(*) FILTER (WHERE type = 'MEMBER_JOIN') AS new_members,
  COUNT(*) FILTER (WHERE type = 'MEMBER_LEAVE') AS left_members,
  
  -- Vocal (sera affiné par cron)
  COUNT(*) FILTER (WHERE type = 'VOICE_JOIN') AS voice_joins,
  
  -- Top channels (calculé par cron, laissé NULL ici)
  NULL::jsonb AS top_channels,
  
  -- Timestamp de création
  NOW() AS created_at
  
FROM stats_events
GROUP BY guild_id, date;

-- Refresh policy (chaque jour à 1h du matin)
SELECT add_continuous_aggregate_policy(
  'stats_aggregated_daily',
  start_offset => INTERVAL '7 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Retention policy (30 jours par défaut)
SELECT add_retention_policy(
  'stats_aggregated_daily',
  INTERVAL '30 days',
  if_not_exists => TRUE
);

-- ============================================
-- INDEXES ADDITIONNELS
-- ============================================

-- stats_member_cumulative
CREATE INDEX IF NOT EXISTS idx_stats_member_guild_messages 
  ON stats_member_cumulative(guild_id, total_messages DESC);
  
CREATE INDEX IF NOT EXISTS idx_stats_member_guild_voice 
  ON stats_member_cumulative(guild_id, total_voice_minutes DESC);
  
CREATE INDEX IF NOT EXISTS idx_stats_member_guild_reactions 
  ON stats_member_cumulative(guild_id, total_reactions DESC);

-- ============================================
-- DONE
-- ============================================
```

**Checklist** :
- [ ] Fichier SQL créé
- [ ] Hypertable créée
- [ ] Compression policy ajoutée
- [ ] Retention policies ajoutées
- [ ] Continuous aggregates créés
- [ ] Indexes ajoutés
- [ ] Testé manuellement : `psql -d discord_admin -f timescaledb.sql`
- [ ] Commit : `feat(stats): Add TimescaleDB configuration`

---

#### Tâche 1.4 : DTOs TypeScript ✅ / ❌
**Durée** : 1h

**Dossier** : `packages/shared-types/src/dtos/app/stats/`

**Fichiers à créer** :

**1. `stats-event.dto.ts`**
```typescript
// packages/shared-types/src/dtos/app/stats/stats-event.dto.ts

/**
 * Type d'event Stats
 */
export enum StatsEventType {
  MESSAGE_CREATE = 'MESSAGE_CREATE',
  VOICE_JOIN = 'VOICE_JOIN',
  VOICE_LEAVE = 'VOICE_LEAVE',
  VOICE_STATE_CHANGE = 'VOICE_STATE_CHANGE',
  MEMBER_JOIN = 'MEMBER_JOIN',
  MEMBER_LEAVE = 'MEMBER_LEAVE',
  REACTION_ADD = 'REACTION_ADD',
}

/**
 * Event brut à enregistrer dans stats_events
 */
export interface CreateStatsEventDto {
  guildId: string;
  type: StatsEventType;
  timestamp: Date;
  userId?: string;
  channelId?: string;
  messageId?: string;
  metadata?: Record<string, any>;
}

/**
 * Metadata pour MESSAGE_CREATE
 */
export interface MessageEventMetadata {
  hasAttachments: boolean;
  hasLinks: boolean;
  contentLength: number;
}

/**
 * Metadata pour VOICE_* events
 */
export interface VoiceEventMetadata {
  muted: boolean;
  deafened: boolean;
  selfVideo: boolean;
  streaming: boolean;
  channelType: 'GUILD_VOICE' | 'GUILD_STAGE_VOICE';
}

/**
 * Metadata pour REACTION_ADD
 */
export interface ReactionEventMetadata {
  emoji: string;
  emojiId: string | null;
  messageAuthorId: string;
}

/**
 * Metadata pour MEMBER_JOIN
 */
export interface MemberJoinEventMetadata {
  inviteCode?: string;
  isBot: boolean;
}
```

**2. `stats-query.dto.ts`**
```typescript
// packages/shared-types/src/dtos/app/stats/stats-query.dto.ts

/**
 * Périodes disponibles pour les requêtes
 */
export enum StatsPeriod {
  TODAY = '1d',
  WEEK = '7d',
  MONTH = '30d',
  QUARTER = '90d',
  ALL = 'all',
}

/**
 * Granularité des données
 */
export enum StatsGranularity {
  FIVE_MIN = '5min',
  HOURLY = 'hourly',
  DAILY = 'daily',
}

/**
 * Query pour récupérer les stats d'un serveur
 */
export interface GetGuildStatsDto {
  guildId: string;
  period: StatsPeriod;
  granularity?: StatsGranularity;
}

/**
 * Query pour récupérer les stats d'un membre
 */
export interface GetMemberStatsDto {
  guildId: string;
  userId: string;
  period: StatsPeriod;
}

/**
 * Query pour le leaderboard
 */
export interface GetLeaderboardDto {
  guildId: string;
  sortBy: 'messages' | 'voice' | 'reactions';
  limit?: number;
  period?: StatsPeriod;
}
```

**3. `stats-response.dto.ts`**
```typescript
// packages/shared-types/src/dtos/app/stats/stats-response.dto.ts

import { StatsPeriod, StatsGranularity } from './stats-query.dto';

/**
 * Stats overview d'un serveur
 */
export interface GuildStatsOverviewDto {
  guildId: string;
  period: StatsPeriod;
  
  // Métriques principales
  totalMessages: number;
  totalVoiceMinutes: number;
  totalReactions: number;
  activeMembers: number;
  
  // Nouveaux membres
  newMembers: number;
  leftMembers: number;
  
  // Comparaison période précédente
  messagesChange: number; // %
  voiceChange: number; // %
  reactionsChange: number; // %
  
  // Timestamps
  startDate: Date;
  endDate: Date;
}

/**
 * Point de donnée pour graphique
 */
export interface StatsDataPoint {
  timestamp: Date;
  messageCount: number;
  voiceMinutes: number;
  reactionCount: number;
  activeUsers: number;
}

/**
 * Timeline pour graphiques
 */
export interface StatsTimelineDto {
  guildId: string;
  period: StatsPeriod;
  granularity: StatsGranularity;
  dataPoints: StatsDataPoint[];
}

/**
 * Stats d'un membre
 */
export interface MemberStatsDto {
  guildId: string;
  userId: string;
  
  // Compteurs cumulatifs
  totalMessages: number;
  totalVoiceMinutes: number;
  totalReactions: number;
  
  // Dernière activité
  lastMessageAt: Date | null;
  lastVoiceAt: Date | null;
  lastSeenAt: Date | null;
  
  // Rank dans le serveur
  messageRank: number;
  voiceRank: number;
  reactionRank: number;
}

/**
 * Entrée leaderboard
 */
export interface LeaderboardEntryDto {
  userId: string;
  rank: number;
  value: number; // messages, voice minutes, ou reactions selon sortBy
  
  // Info additionnelle
  totalMessages: number;
  totalVoiceMinutes: number;
  totalReactions: number;
}

/**
 * Leaderboard complet
 */
export interface LeaderboardDto {
  guildId: string;
  sortBy: 'messages' | 'voice' | 'reactions';
  period: StatsPeriod;
  entries: LeaderboardEntryDto[];
}

/**
 * Top channels par activité
 */
export interface TopChannelDto {
  channelId: string;
  messageCount: number;
  voiceMinutes: number;
  percentage: number; // % de l'activité totale
}

/**
 * Stats par channel
 */
export interface ChannelBreakdownDto {
  guildId: string;
  period: StatsPeriod;
  channels: TopChannelDto[];
}
```

**4. `index.ts`**
```typescript
// packages/shared-types/src/dtos/app/stats/index.ts

export * from './stats-event.dto';
export * from './stats-query.dto';
export * from './stats-response.dto';
```

**5. Mettre à jour `packages/shared-types/src/dtos/app/index.ts`**
```typescript
export * from './stats';
```

**Checklist** :
- [ ] `stats-event.dto.ts` créé
- [ ] `stats-query.dto.ts` créé
- [ ] `stats-response.dto.ts` créé
- [ ] `index.ts` créé
- [ ] Exports ajoutés dans `dtos/app/index.ts`
- [ ] Build : `cd packages/shared-types && npm run build`
- [ ] Commit : `feat(stats): Add TypeScript DTOs`

---

**✅ PHASE 1 COMPLÈTE** : [ ] Toutes les tâches cochées

---

### PHASE 2 : Backend Services (Durée : 2 jours)

**Objectif** : Créer les services backend pour gérer les events et l'agrégation

#### Tâche 2.1 : Events Service ✅ / ❌
**Durée** : 2h

**Fichier** : `apps/backend/src/modules/stats/services/stats-events.service.ts`

**Responsabilités** :
- Recevoir events du bot (via Gateway)
- Insérer dans `stats_events`
- Validation des données

**Structure** :
```typescript
// apps/backend/src/modules/stats/services/stats-events.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { CreateStatsEventDto, StatsEventType } from '@my-project/shared-types';

@Injectable()
export class StatsEventsService {
  private readonly logger = new Logger(StatsEventsService.name);
  
  constructor(private readonly prisma: PrismaService) {}
  
  /**
   * Enregistrer un event stats
   */
  async createEvent(dto: CreateStatsEventDto): Promise<void> {
    try {
      await this.prisma.statsEvent.create({
        data: {
          guildId: dto.guildId,
          type: dto.type,
          timestamp: dto.timestamp,
          userId: dto.userId,
          channelId: dto.channelId,
          messageId: dto.messageId,
          metadata: dto.metadata,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create stats event: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Enregistrer plusieurs events en batch
   */
  async createEventsBatch(events: CreateStatsEventDto[]): Promise<void> {
    try {
      await this.prisma.statsEvent.createMany({
        data: events.map(e => ({
          guildId: e.guildId,
          type: e.type,
          timestamp: e.timestamp,
          userId: e.userId,
          channelId: e.channelId,
          messageId: e.messageId,
          metadata: e.metadata,
        })),
      });
      
      this.logger.log(`Batch created: ${events.length} events`);
    } catch (error) {
      this.logger.error(`Failed to create events batch: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Récupérer les events d'une guild sur une période
   */
  async getEvents(
    guildId: string,
    startDate: Date,
    endDate: Date,
    type?: StatsEventType,
  ) {
    return this.prisma.statsEvent.findMany({
      where: {
        guildId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        ...(type && { type }),
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }
}
```

**Checklist** :
- [ ] Service créé
- [ ] Méthode `createEvent` implémentée
- [ ] Méthode `createEventsBatch` implémentée
- [ ] Méthode `getEvents` implémentée
- [ ] Error handling ajouté
- [ ] Logging ajouté
- [ ] Commit : `feat(stats): Add StatsEventsService`

---

#### Tâche 2.2 : Aggregation Service ✅ / ❌
**Durée** : 3h

**Fichier** : `apps/backend/src/modules/stats/services/stats-aggregation.service.ts`

**Responsabilités** :
- Calculer les agrégations (5min, daily)
- Mettre à jour `stats_member_cumulative`
- Calculer le temps vocal précis

**Structure** :
```typescript
// apps/backend/src/modules/stats/services/stats-aggregation.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/core/prisma/prisma.service';
import { StatsEventType } from '@my-project/shared-types';

@Injectable()
export class StatsAggregationService {
  private readonly logger = new Logger(StatsAggregationService.name);
  
  constructor(private readonly prisma: PrismaService) {}
  
  /**
   * Cron: Toutes les 5 minutes
   * Agrège les stats des 5 dernières minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async aggregate5min() {
    this.logger.log('🔄 Starting 5-minute aggregation');
    
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Récupérer toutes les guilds actives
    const activeGuilds = await this.getActiveGuilds(fiveMinAgo, now);
    
    for (const guildId of activeGuilds) {
      await this.aggregateGuild5min(guildId, fiveMinAgo, now);
    }
    
    this.logger.log(`✅ 5-minute aggregation complete (${activeGuilds.length} guilds)`);
  }
  
  /**
   * Agrège les stats d'une guild sur 5 minutes
   */
  private async aggregateGuild5min(
    guildId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // Note: Les continuous aggregates font déjà le gros du travail
    // Ici on complète avec le calcul vocal précis
    
    await this.calculateVoiceTime(guildId, startDate, endDate);
    await this.updateMemberCumulativeStats(guildId, startDate, endDate);
  }
  
  /**
   * Calcule le temps vocal précis
   */
  private async calculateVoiceTime(
    guildId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // Récupérer tous les events VOICE_* de la période
    const voiceEvents = await this.prisma.statsEvent.findMany({
      where: {
        guildId,
        type: {
          in: [
            StatsEventType.VOICE_JOIN,
            StatsEventType.VOICE_LEAVE,
            StatsEventType.VOICE_STATE_CHANGE,
          ],
        },
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
    
    // Grouper par userId
    const userEvents = this.groupBy(voiceEvents, 'userId');
    
    // Calculer le temps pour chaque user
    for (const [userId, events] of Object.entries(userEvents)) {
      let voiceMinutes = 0;
      let currentJoinTime: Date | null = null;
      
      for (const event of events) {
        if (event.type === StatsEventType.VOICE_JOIN) {
          currentJoinTime = event.timestamp;
        }
        
        if (
          event.type === StatsEventType.VOICE_LEAVE &&
          currentJoinTime
        ) {
          const duration =
            event.timestamp.getTime() - currentJoinTime.getTime();
          voiceMinutes += duration / 60000; // ms to minutes
          currentJoinTime = null;
        }
      }
      
      // Si user encore en vocal, compter jusqu'à maintenant
      if (currentJoinTime) {
        const duration = endDate.getTime() - currentJoinTime.getTime();
        voiceMinutes += duration / 60000;
      }
      
      // Mettre à jour stats_member_cumulative
      if (voiceMinutes > 0) {
        await this.prisma.statsMemberCumulative.upsert({
          where: {
            guildId_userId: {
              guildId,
              userId: userId!,
            },
          },
          create: {
            guildId,
            userId: userId!,
            totalVoiceMinutes: Math.round(voiceMinutes),
            lastVoiceAt: endDate,
            lastSeenAt: endDate,
          },
          update: {
            totalVoiceMinutes: {
              increment: Math.round(voiceMinutes),
            },
            lastVoiceAt: endDate,
            lastSeenAt: endDate,
          },
        });
      }
    }
  }
  
  /**
   * Met à jour les stats cumulatives des membres
   */
  private async updateMemberCumulativeStats(
    guildId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // Agréger messages
    const messageStats = await this.prisma.statsEvent.groupBy({
      by: ['userId'],
      where: {
        guildId,
        type: StatsEventType.MESSAGE_CREATE,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        userId: {
          not: null,
        },
      },
      _count: {
        userId: true,
      },
    });
    
    // Mettre à jour chaque membre
    for (const stat of messageStats) {
      await this.prisma.statsMemberCumulative.upsert({
        where: {
          guildId_userId: {
            guildId,
            userId: stat.userId!,
          },
        },
        create: {
          guildId,
          userId: stat.userId!,
          totalMessages: stat._count.userId,
          lastMessageAt: endDate,
          lastSeenAt: endDate,
        },
        update: {
          totalMessages: {
            increment: stat._count.userId,
          },
          lastMessageAt: endDate,
          lastSeenAt: endDate,
        },
      });
    }
    
    // Même chose pour reactions
    const reactionStats = await this.prisma.statsEvent.groupBy({
      by: ['userId'],
      where: {
        guildId,
        type: StatsEventType.REACTION_ADD,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        userId: {
          not: null,
        },
      },
      _count: {
        userId: true,
      },
    });
    
    for (const stat of reactionStats) {
      await this.prisma.statsMemberCumulative.upsert({
        where: {
          guildId_userId: {
            guildId,
            userId: stat.userId!,
          },
        },
        create: {
          guildId,
          userId: stat.userId!,
          totalReactions: stat._count.userId,
          lastSeenAt: endDate,
        },
        update: {
          totalReactions: {
            increment: stat._count.userId,
          },
          lastSeenAt: endDate,
        },
      });
    }
  }
  
  /**
   * Récupère les guilds actives sur une période
   */
  private async getActiveGuilds(startDate: Date, endDate: Date): Promise<string[]> {
    const result = await this.prisma.statsEvent.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        guildId: true,
      },
      distinct: ['guildId'],
    });
    
    return result.map(r => r.guildId);
  }
  
  /**
   * Helper: Group array by key
   */
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {} as Record<string, T[]>);
  }
}
```

**Checklist** :
- [ ] Service créé
- [ ] Cron 5 minutes implémenté
- [ ] Calcul vocal time implémenté
- [ ] Update member cumulative implémenté
- [ ] Error handling ajouté
- [ ] Logging ajouté
- [ ] Commit : `feat(stats): Add StatsAggregationService with cron jobs`

---

#### Tâche 2.3 : Query Service ✅ / ❌
**Durée** : 2h

**Fichier** : `apps/backend/src/modules/stats/services/stats-query.service.ts`

**Responsabilités** :
- Récupérer les stats agrégées
- Calculer les leaderboards
- Gérer les limites Free/Premium

**Structure** :
```typescript
// apps/backend/src/modules/stats/services/stats-query.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  GuildStatsOverviewDto,
  StatsTimelineDto,
  MemberStatsDto,
  LeaderboardDto,
  StatsPeriod,
  StatsGranularity,
  GetGuildStatsDto,
  GetMemberStatsDto,
  GetLeaderboardDto,
} from '@my-project/shared-types';

@Injectable()
export class StatsQueryService {
  private readonly logger = new Logger(StatsQueryService.name);
  
  constructor(private readonly prisma: PrismaService) {}
  
  /**
   * Récupère les stats overview d'un serveur
   */
  async getGuildOverview(
    dto: GetGuildStatsDto,
  ): Promise<GuildStatsOverviewDto> {
    const { guildId, period } = dto;
    const { startDate, endDate } = this.getPeriodDates(period);
    
    // Récupérer les stats agrégées daily
    const dailyStats = await this.prisma.statsAggregatedDaily.findMany({
      where: {
        guildId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    
    // Calculer les totaux
    const totalMessages = dailyStats.reduce((sum, s) => sum + s.messageCount, 0);
    const totalVoiceMinutes = dailyStats.reduce((sum, s) => sum + s.voiceMinutes, 0);
    const totalReactions = dailyStats.reduce((sum, s) => sum + s.reactionCount, 0);
    const activeMembers = Math.max(...dailyStats.map(s => s.activeUsers), 0);
    const newMembers = dailyStats.reduce((sum, s) => sum + s.newMembers, 0);
    const leftMembers = dailyStats.reduce((sum, s) => sum + s.leftMembers, 0);
    
    // Calculer les changements vs période précédente
    const previousPeriod = this.getPreviousPeriod(startDate, endDate);
    const previousStats = await this.prisma.statsAggregatedDaily.findMany({
      where: {
        guildId,
        date: {
          gte: previousPeriod.startDate,
          lte: previousPeriod.endDate,
        },
      },
    });
    
    const previousMessages = previousStats.reduce((sum, s) => sum + s.messageCount, 0);
    const previousVoice = previousStats.reduce((sum, s) => sum + s.voiceMinutes, 0);
    const previousReactions = previousStats.reduce((sum, s) => sum + s.reactionCount, 0);
    
    const messagesChange = this.calculatePercentChange(totalMessages, previousMessages);
    const voiceChange = this.calculatePercentChange(totalVoiceMinutes, previousVoice);
    const reactionsChange = this.calculatePercentChange(totalReactions, previousReactions);
    
    return {
      guildId,
      period,
      totalMessages,
      totalVoiceMinutes,
      totalReactions,
      activeMembers,
      newMembers,
      leftMembers,
      messagesChange,
      voiceChange,
      reactionsChange,
      startDate,
      endDate,
    };
  }
  
  /**
   * Récupère la timeline pour graphiques
   */
  async getTimeline(dto: GetGuildStatsDto): Promise<StatsTimelineDto> {
    const { guildId, period, granularity = StatsGranularity.DAILY } = dto;
    const { startDate, endDate } = this.getPeriodDates(period);
    
    let dataPoints;
    
    if (granularity === StatsGranularity.FIVE_MIN) {
      // Récupérer depuis stats_aggregated_5min
      dataPoints = await this.prisma.statsAggregated5min.findMany({
        where: {
          guildId,
          bucket: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          bucket: 'asc',
        },
      });
      
      return {
        guildId,
        period,
        granularity,
        dataPoints: dataPoints.map(d => ({
          timestamp: d.bucket,
          messageCount: d.messageCount,
          voiceMinutes: 0, // TODO: calculer depuis voice_joins/leaves
          reactionCount: d.reactionCount,
          activeUsers: d.activeUsers,
        })),
      };
    } else {
      // Récupérer depuis stats_aggregated_daily
      dataPoints = await this.prisma.statsAggregatedDaily.findMany({
        where: {
          guildId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: 'asc',
        },
      });
      
      return {
        guildId,
        period,
        granularity,
        dataPoints: dataPoints.map(d => ({
          timestamp: d.date,
          messageCount: d.messageCount,
          voiceMinutes: d.voiceMinutes,
          reactionCount: d.reactionCount,
          activeUsers: d.activeUsers,
        })),
      };
    }
  }
  
  /**
   * Récupère les stats d'un membre
   */
  async getMemberStats(dto: GetMemberStatsDto): Promise<MemberStatsDto> {
    const { guildId, userId } = dto;
    
    // Récupérer les stats cumulatives
    const stats = await this.prisma.statsMemberCumulative.findUnique({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
    });
    
    if (!stats) {
      return {
        guildId,
        userId,
        totalMessages: 0,
        totalVoiceMinutes: 0,
        totalReactions: 0,
        lastMessageAt: null,
        lastVoiceAt: null,
        lastSeenAt: null,
        messageRank: 0,
        voiceRank: 0,
        reactionRank: 0,
      };
    }
    
    // Calculer les ranks
    const messageRank = await this.getMemberRank(guildId, userId, 'messages');
    const voiceRank = await this.getMemberRank(guildId, userId, 'voice');
    const reactionRank = await this.getMemberRank(guildId, userId, 'reactions');
    
    return {
      guildId,
      userId,
      totalMessages: stats.totalMessages,
      totalVoiceMinutes: stats.totalVoiceMinutes,
      totalReactions: stats.totalReactions,
      lastMessageAt: stats.lastMessageAt,
      lastVoiceAt: stats.lastVoiceAt,
      lastSeenAt: stats.lastSeenAt,
      messageRank,
      voiceRank,
      reactionRank,
    };
  }
  
  /**
   * Récupère le leaderboard
   */
  async getLeaderboard(dto: GetLeaderboardDto): Promise<LeaderboardDto> {
    const { guildId, sortBy, limit = 10 } = dto;
    
    // Vérifier les limites Free/Premium
    const moduleConfig = await this.getModuleConfig(guildId);
    const maxLimit = moduleConfig.plan === 'premium' ? 50 : 10;
    const effectiveLimit = Math.min(limit, maxLimit);
    
    // Déterminer le champ de tri
    const orderByField =
      sortBy === 'messages'
        ? 'totalMessages'
        : sortBy === 'voice'
        ? 'totalVoiceMinutes'
        : 'totalReactions';
    
    // Récupérer les top membres
    const members = await this.prisma.statsMemberCumulative.findMany({
      where: {
        guildId,
      },
      orderBy: {
        [orderByField]: 'desc',
      },
      take: effectiveLimit,
    });
    
    return {
      guildId,
      sortBy,
      period: StatsPeriod.ALL,
      entries: members.map((m, index) => ({
        userId: m.userId,
        rank: index + 1,
        value:
          sortBy === 'messages'
            ? m.totalMessages
            : sortBy === 'voice'
            ? m.totalVoiceMinutes
            : m.totalReactions,
        totalMessages: m.totalMessages,
        totalVoiceMinutes: m.totalVoiceMinutes,
        totalReactions: m.totalReactions,
      })),
    };
  }
  
  /**
   * Helper: Récupère les dates de début/fin selon la période
   */
  private getPeriodDates(period: StatsPeriod): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case StatsPeriod.TODAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case StatsPeriod.WEEK:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case StatsPeriod.MONTH:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case StatsPeriod.QUARTER:
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case StatsPeriod.ALL:
        startDate = new Date(0); // Epoch
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    return { startDate, endDate: now };
  }
  
  /**
   * Helper: Calcule la période précédente
   */
  private getPreviousPeriod(
    startDate: Date,
    endDate: Date,
  ): { startDate: Date; endDate: Date } {
    const duration = endDate.getTime() - startDate.getTime();
    return {
      startDate: new Date(startDate.getTime() - duration),
      endDate: startDate,
    };
  }
  
  /**
   * Helper: Calcule le pourcentage de changement
   */
  private calculatePercentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }
  
  /**
   * Helper: Récupère le rank d'un membre
   */
  private async getMemberRank(
    guildId: string,
    userId: string,
    type: 'messages' | 'voice' | 'reactions',
  ): Promise<number> {
    const field =
      type === 'messages'
        ? 'totalMessages'
        : type === 'voice'
        ? 'totalVoiceMinutes'
        : 'totalReactions';
    
    const userStats = await this.prisma.statsMemberCumulative.findUnique({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
    });
    
    if (!userStats) return 0;
    
    const count = await this.prisma.statsMemberCumulative.count({
      where: {
        guildId,
        [field]: {
          gt: userStats[field],
        },
      },
    });
    
    return count + 1;
  }
  
  /**
   * Helper: Récupère la config du module pour une guild
   */
  private async getModuleConfig(guildId: string) {
    // TODO: Récupérer depuis guild_modules
    // Pour l'instant, retourner une config par défaut
    return {
      plan: 'free' as const,
      memberLeaderboardLimit: 10,
    };
  }
}
```

**Checklist** :
- [ ] Service créé
- [ ] `getGuildOverview` implémenté
- [ ] `getTimeline` implémenté
- [ ] `getMemberStats` implémenté
- [ ] `getLeaderboard` implémenté
- [ ] Limites Free/Premium gérées
- [ ] Error handling ajouté
- [ ] Commit : `feat(stats): Add StatsQueryService`

---

#### Tâche 2.4 : Controller ✅ / ❌
**Durée** : 1h

**Fichier** : `apps/backend/src/modules/stats/controllers/stats.controller.ts`

**Structure** :
```typescript
// apps/backend/src/modules/stats/controllers/stats.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@/core/auth/guards/auth.guard';
import { StatsEventsService } from '../services/stats-events.service';
import { StatsQueryService } from '../services/stats-query.service';
import {
  CreateStatsEventDto,
  GetGuildStatsDto,
  GetMemberStatsDto,
  GetLeaderboardDto,
  StatsPeriod,
  StatsGranularity,
} from '@my-project/shared-types';

@Controller('stats')
@UseGuards(AuthGuard)
export class StatsController {
  constructor(
    private readonly eventsService: StatsEventsService,
    private readonly queryService: StatsQueryService,
  ) {}
  
  /**
   * POST /stats/events
   * Créer un event stats (appelé par le bot via Gateway)
   */
  @Post('events')
  async createEvent(@Body() dto: CreateStatsEventDto) {
    await this.eventsService.createEvent(dto);
    return { success: true };
  }
  
  /**
   * POST /stats/events/batch
   * Créer plusieurs events en batch
   */
  @Post('events/batch')
  async createEventsBatch(@Body() events: CreateStatsEventDto[]) {
    await this.eventsService.createEventsBatch(events);
    return { success: true, count: events.length };
  }
  
  /**
   * GET /stats/:guildId/overview
   * Récupérer les stats overview d'un serveur
   */
  @Get(':guildId/overview')
  async getOverview(
    @Param('guildId') guildId: string,
    @Query('period') period: StatsPeriod = StatsPeriod.WEEK,
  ) {
    return this.queryService.getGuildOverview({ guildId, period });
  }
  
  /**
   * GET /stats/:guildId/timeline
   * Récupérer la timeline pour graphiques
   */
  @Get(':guildId/timeline')
  async getTimeline(
    @Param('guildId') guildId: string,
    @Query('period') period: StatsPeriod = StatsPeriod.WEEK,
    @Query('granularity') granularity: StatsGranularity = StatsGranularity.DAILY,
  ) {
    return this.queryService.getTimeline({ guildId, period, granularity });
  }
  
  /**
   * GET /stats/:guildId/members/:userId
   * Récupérer les stats d'un membre
   */
  @Get(':guildId/members/:userId')
  async getMemberStats(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Query('period') period: StatsPeriod = StatsPeriod.WEEK,
  ) {
    return this.queryService.getMemberStats({ guildId, userId, period });
  }
  
  /**
   * GET /stats/:guildId/leaderboard
   * Récupérer le leaderboard
   */
  @Get(':guildId/leaderboard')
  async getLeaderboard(
    @Param('guildId') guildId: string,
    @Query('sortBy') sortBy: 'messages' | 'voice' | 'reactions' = 'messages',
    @Query('limit') limit: number = 10,
  ) {
    return this.queryService.getLeaderboard({ guildId, sortBy, limit });
  }
}
```

**Checklist** :
- [ ] Controller créé
- [ ] 5 endpoints implémentés
- [ ] AuthGuard ajouté
- [ ] Validation des query params
- [ ] Commit : `feat(stats): Add StatsController with 5 endpoints`

---

#### Tâche 2.5 : Module NestJS ✅ / ❌
**Durée** : 30 min

**Fichier** : `apps/backend/src/modules/stats/stats.module.ts`

**Structure** :
```typescript
// apps/backend/src/modules/stats/stats.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { StatsEventsService } from './services/stats-events.service';
import { StatsAggregationService } from './services/stats-aggregation.service';
import { StatsQueryService } from './services/stats-query.service';
import { StatsController } from './controllers/stats.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    StatsEventsService,
    StatsAggregationService,
    StatsQueryService,
  ],
  controllers: [StatsController],
  exports: [StatsEventsService, StatsQueryService],
})
export class StatsModule {}
```

**Checklist** :
- [ ] Module créé
- [ ] Services importés
- [ ] Controller importé
- [ ] Services exportés
- [ ] Commit : `feat(stats): Add StatsModule`

---

#### Tâche 2.6 : Enregistrement Module ✅ / ❌
**Durée** : 15 min

**Fichiers à modifier** :

**1. `apps/backend/src/core/module-system/module-system.module.ts`**
```typescript
import { STATS_MODULE_DEFINITION } from '../../modules/stats/stats.definition';

@Module({...})
export class ModuleSystemModule implements OnModuleInit {
  constructor(private readonly moduleRegistry: ModuleRegistry) {}
  
  onModuleInit() {
    this.moduleRegistry.register(WELCOME_MODULE);
    this.moduleRegistry.register(STATS_MODULE_DEFINITION); // ← AJOUTER
    
    console.log('📦 Module System initialized');
  }
}
```

**2. `apps/backend/src/app.module.ts`**
```typescript
import { StatsModule } from './modules/stats/stats.module';

@Module({
  imports: [
    // ... existing imports
    StatsModule, // ← AJOUTER
  ],
})
export class AppModule {}
```

**Checklist** :
- [ ] Module enregistré dans `ModuleSystemModule`
- [ ] Module importé dans `AppModule`
- [ ] Commit : `feat(stats): Register Stats module in app`

---

**✅ PHASE 2 COMPLÈTE** : [ ] Toutes les tâches cochées

---

### PHASE 3 : Bot Integration (Durée : 1 jour)

**Objectif** : Créer les listeners bot pour envoyer les events au backend

#### Tâche 3.1 : Bot Module Structure ✅ / ❌
**Durée** : 30 min

**Créer la structure** :
```bash
mkdir -p apps/bot/src/modules/stats
mkdir -p apps/bot/src/modules/stats/listeners
```

**Fichier** : `apps/bot/src/modules/stats/stats.module.ts`

**Structure** :
```typescript
// apps/bot/src/modules/stats/stats.module.ts

import { BotModule } from '../module-loader/bot-module.interface';

export class StatsModule implements BotModule {
  public readonly id = 'stats';
  public readonly name = 'Statistics & Analytics';
  
  async onLoad(): Promise<void> {
    console.log('📊 Stats Module loaded');
  }
  
  async onUnload(): Promise<void> {
    console.log('📊 Stats Module unloaded');
  }
  
  async onConfigUpdate(guildId: string, config: any): Promise<void> {
    console.log(`📊 Stats config updated for guild ${guildId}`);
  }
}
```

**Checklist** :
- [ ] Dossier créé
- [ ] Module créé
- [ ] Interface `BotModule` implémentée
- [ ] Commit : `feat(stats-bot): Add bot module structure`

---

#### Tâche 3.2 : Message Listener ✅ / ❌
**Durée** : 1h

**Fichier** : `apps/bot/src/modules/stats/listeners/message-create.listener.ts`

**Structure** :
```typescript
// apps/bot/src/modules/stats/listeners/message-create.listener.ts

import { Listener } from '@sapphire/framework';
import { Events, Message } from 'discord.js';
import { WebSocketService } from '../../../services/websocket.service';
import { StatsEventType, CreateStatsEventDto } from '@my-project/shared-types';

export class MessageCreateStatsListener extends Listener {
  public constructor(
    context: Listener.Context,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: Events.MessageCreate,
    });
  }
  
  public async run(message: Message) {
    // Ignorer les bots
    if (message.author.bot) return;
    
    // Ignorer les DMs
    if (!message.guild) return;
    
    // Vérifier si le module Stats est activé pour cette guild
    const isEnabled = await this.isModuleEnabled(message.guild.id);
    if (!isEnabled) return;
    
    // Créer l'event
    const event: CreateStatsEventDto = {
      guildId: message.guild.id,
      type: StatsEventType.MESSAGE_CREATE,
      timestamp: message.createdAt,
      userId: message.author.id,
      channelId: message.channel.id,
      messageId: message.id,
      metadata: {
        hasAttachments: message.attachments.size > 0,
        hasLinks: this.hasLinks(message.content),
        contentLength: message.content.length,
      },
    };
    
    // Envoyer au backend via Gateway
    await this.sendEvent(event);
  }
  
  private hasLinks(content: string): boolean {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return urlRegex.test(content);
  }
  
  private async isModuleEnabled(guildId: string): Promise<boolean> {
    // TODO: Vérifier dans le cache config-sync
    return true; // Pour l'instant
  }
  
  private async sendEvent(event: CreateStatsEventDto): Promise<void> {
    const ws = this.container.resolve(WebSocketService);
    await ws.emit('stats:event', event);
  }
}
```

**Checklist** :
- [ ] Listener créé
- [ ] Event MESSAGE_CREATE géré
- [ ] Metadata correcte
- [ ] Envoi au backend
- [ ] Commit : `feat(stats-bot): Add MessageCreate listener`

---

#### Tâche 3.3 : Voice Listeners ✅ / ❌
**Durée** : 1h 30

**Fichier** : `apps/bot/src/modules/stats/listeners/voice-state-update.listener.ts`

**Structure** :
```typescript
// apps/bot/src/modules/stats/listeners/voice-state-update.listener.ts

import { Listener } from '@sapphire/framework';
import { Events, VoiceState } from 'discord.js';
import { WebSocketService } from '../../../services/websocket.service';
import { StatsEventType, CreateStatsEventDto } from '@my-project/shared-types';

export class VoiceStateUpdateStatsListener extends Listener {
  public constructor(
    context: Listener.Context,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: Events.VoiceStateUpdate,
    });
  }
  
  public async run(oldState: VoiceState, newState: VoiceState) {
    // Ignorer les bots
    if (newState.member?.user.bot) return;
    
    const guildId = newState.guild.id;
    
    // Vérifier si le module est activé
    const isEnabled = await this.isModuleEnabled(guildId);
    if (!isEnabled) return;
    
    // Détermine le type d'event
    const eventType = this.determineEventType(oldState, newState);
    if (!eventType) return;
    
    // Créer l'event
    const event: CreateStatsEventDto = {
      guildId,
      type: eventType,
      timestamp: new Date(),
      userId: newState.member!.id,
      channelId: newState.channel?.id || oldState.channel?.id,
      metadata: {
        muted: newState.mute || newState.selfMute,
        deafened: newState.deaf || newState.selfDeaf,
        selfVideo: newState.selfVideo,
        streaming: newState.streaming,
        channelType: newState.channel?.type || oldState.channel?.type,
      },
    };
    
    // Envoyer au backend
    await this.sendEvent(event);
  }
  
  private determineEventType(
    oldState: VoiceState,
    newState: VoiceState,
  ): StatsEventType | null {
    // User rejoint un channel
    if (!oldState.channel && newState.channel) {
      return StatsEventType.VOICE_JOIN;
    }
    
    // User quitte un channel
    if (oldState.channel && !newState.channel) {
      return StatsEventType.VOICE_LEAVE;
    }
    
    // User change de channel
    if (oldState.channel && newState.channel && oldState.channelId !== newState.channelId) {
      // Enregistrer 2 events : LEAVE + JOIN
      // Pour simplifier, on retourne VOICE_STATE_CHANGE
      return StatsEventType.VOICE_STATE_CHANGE;
    }
    
    // User change mute/deaf/video
    if (
      oldState.mute !== newState.mute ||
      oldState.deaf !== newState.deaf ||
      oldState.selfMute !== newState.selfMute ||
      oldState.selfDeaf !== newState.selfDeaf ||
      oldState.selfVideo !== newState.selfVideo ||
      oldState.streaming !== newState.streaming
    ) {
      return StatsEventType.VOICE_STATE_CHANGE;
    }
    
    return null;
  }
  
  private async isModuleEnabled(guildId: string): Promise<boolean> {
    // TODO: Vérifier dans le cache config-sync
    return true;
  }
  
  private async sendEvent(event: CreateStatsEventDto): Promise<void> {
    const ws = this.container.resolve(WebSocketService);
    await ws.emit('stats:event', event);
  }
}
```

**Checklist** :
- [ ] Listener créé
- [ ] VOICE_JOIN géré
- [ ] VOICE_LEAVE géré
- [ ] VOICE_STATE_CHANGE géré
- [ ] Metadata correcte
- [ ] Commit : `feat(stats-bot): Add VoiceStateUpdate listener`

---

#### Tâche 3.4 : Member & Reaction Listeners ✅ / ❌
**Durée** : 1h

**Fichiers à créer** :

**1. `apps/bot/src/modules/stats/listeners/guild-member-add.listener.ts`**
```typescript
import { Listener } from '@sapphire/framework';
import { Events, GuildMember } from 'discord.js';
import { WebSocketService } from '../../../services/websocket.service';
import { StatsEventType, CreateStatsEventDto } from '@my-project/shared-types';

export class GuildMemberAddStatsListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.GuildMemberAdd,
    });
  }
  
  public async run(member: GuildMember) {
    const isEnabled = await this.isModuleEnabled(member.guild.id);
    if (!isEnabled) return;
    
    const event: CreateStatsEventDto = {
      guildId: member.guild.id,
      type: StatsEventType.MEMBER_JOIN,
      timestamp: new Date(),
      userId: member.id,
      metadata: {
        isBot: member.user.bot,
      },
    };
    
    await this.sendEvent(event);
  }
  
  private async isModuleEnabled(guildId: string): Promise<boolean> {
    return true;
  }
  
  private async sendEvent(event: CreateStatsEventDto): Promise<void> {
    const ws = this.container.resolve(WebSocketService);
    await ws.emit('stats:event', event);
  }
}
```

**2. `apps/bot/src/modules/stats/listeners/guild-member-remove.listener.ts`**
```typescript
// Même structure que guild-member-add.listener.ts
// Event type: MEMBER_LEAVE
```

**3. `apps/bot/src/modules/stats/listeners/message-reaction-add.listener.ts`**
```typescript
import { Listener } from '@sapphire/framework';
import { Events, MessageReaction, User } from 'discord.js';
import { WebSocketService } from '../../../services/websocket.service';
import { StatsEventType, CreateStatsEventDto } from '@my-project/shared-types';

export class MessageReactionAddStatsListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.MessageReactionAdd,
    });
  }
  
  public async run(reaction: MessageReaction, user: User) {
    if (user.bot) return;
    
    const message = reaction.message;
    if (!message.guild) return;
    
    const isEnabled = await this.isModuleEnabled(message.guild.id);
    if (!isEnabled) return;
    
    const event: CreateStatsEventDto = {
      guildId: message.guild.id,
      type: StatsEventType.REACTION_ADD,
      timestamp: new Date(),
      userId: user.id,
      channelId: message.channel.id,
      messageId: message.id,
      metadata: {
        emoji: reaction.emoji.name || '',
        emojiId: reaction.emoji.id,
        messageAuthorId: message.author.id,
      },
    };
    
    await this.sendEvent(event);
  }
  
  private async isModuleEnabled(guildId: string): Promise<boolean> {
    return true;
  }
  
  private async sendEvent(event: CreateStatsEventDto): Promise<void> {
    const ws = this.container.resolve(WebSocketService);
    await ws.emit('stats:event', event);
  }
}
```

**Checklist** :
- [ ] GuildMemberAdd listener créé
- [ ] GuildMemberRemove listener créé
- [ ] MessageReactionAdd listener créé
- [ ] Tous les events envoyés correctement
- [ ] Commit : `feat(stats-bot): Add Member and Reaction listeners`

---

#### Tâche 3.5 : Enregistrement Bot Module ✅ / ❌
**Durée** : 15 min

**Fichier** : `apps/bot/src/modules/module-loader/module-loader.service.ts`

**Action** : Ajouter le module Stats

```typescript
import { StatsModule } from '../stats/stats.module';

@Injectable()
export class ModuleLoaderService {
  private modules: Map<string, BotModule> = new Map();
  
  async loadAllModules() {
    // ... existing modules
    await this.loadModule(new StatsModule());
  }
}
```

**Checklist** :
- [ ] Module Stats importé
- [ ] Module chargé au démarrage
- [ ] Testé : `npm run start:bot:dev`
- [ ] Commit : `feat(stats-bot): Register Stats module in loader`

---

**✅ PHASE 3 COMPLÈTE** : [ ] Toutes les tâches cochées

---

### PHASE 4 : Tests & Validation (Durée : 1 jour)

**Objectif** : Tester l'ensemble du système et valider le fonctionnement

#### Tâche 4.1 : Tests Backend Services ✅ / ❌
**Durée** : 3h

**Créer les fichiers de tests** :

**1. `apps/backend/src/modules/stats/services/stats-events.service.spec.ts`**
```typescript
// Test createEvent, createEventsBatch, getEvents
```

**2. `apps/backend/src/modules/stats/services/stats-aggregation.service.spec.ts`**
```typescript
// Test calculateVoiceTime, updateMemberCumulativeStats
```

**3. `apps/backend/src/modules/stats/services/stats-query.service.spec.ts`**
```typescript
// Test getGuildOverview, getTimeline, getMemberStats, getLeaderboard
```

**Commandes** :
```bash
cd apps/backend
npm run test:cov
```

**Objectif** : Coverage > 80%

**Checklist** :
- [ ] Tests créés pour StatsEventsService
- [ ] Tests créés pour StatsAggregationService
- [ ] Tests créés pour StatsQueryService
- [ ] Coverage > 80%
- [ ] Commit : `test(stats): Add backend services tests`

---

#### Tâche 4.2 : Tests E2E API ✅ / ❌
**Durée** : 2h

**Fichier** : `apps/backend/test/stats.e2e-spec.ts`

**Tests** :
```typescript
describe('Stats API (e2e)', () => {
  it('POST /stats/events - should create event', async () => {
    // ...
  });
  
  it('GET /stats/:guildId/overview - should return overview', async () => {
    // ...
  });
  
  it('GET /stats/:guildId/timeline - should return timeline', async () => {
    // ...
  });
  
  it('GET /stats/:guildId/leaderboard - should return leaderboard', async () => {
    // ...
  });
  
  it('GET /stats/:guildId/leaderboard - should respect Free limits', async () => {
    // ...
  });
});
```

**Checklist** :
- [ ] Tests E2E créés
- [ ] 5 endpoints testés
- [ ] Limites Free/Premium testées
- [ ] Commit : `test(stats): Add E2E API tests`

---

#### Tâche 4.3 : Tests Manuels Intégration ✅ / ❌
**Durée** : 2h

**Procédure** :

1. **Démarrer tous les services** :
```bash
docker-compose up -d
npm run start:backend:dev
npm run start:gateway:dev
npm run start:bot:dev
```

2. **Inviter le bot sur un serveur de test**

3. **Générer des events** :
   - Envoyer des messages
   - Rejoindre/quitter vocal
   - Ajouter des réactions
   - Inviter/kick un membre

4. **Vérifier dans la DB** :
```sql
-- Vérifier les events
SELECT * FROM stats_events ORDER BY timestamp DESC LIMIT 10;

-- Vérifier les agrégations 5min
SELECT * FROM stats_aggregated_5min ORDER BY bucket DESC LIMIT 10;

-- Vérifier les stats cumulatives
SELECT * FROM stats_member_cumulative WHERE guild_id = 'YOUR_GUILD_ID';
```

5. **Tester les API endpoints** :
```bash
# Overview
curl http://localhost:3000/api/stats/YOUR_GUILD_ID/overview?period=7d

# Timeline
curl http://localhost:3000/api/stats/YOUR_GUILD_ID/timeline?period=1d&granularity=5min

# Leaderboard
curl http://localhost:3000/api/stats/YOUR_GUILD_ID/leaderboard?sortBy=messages&limit=10
```

**Checklist** :
- [ ] Events bien enregistrés dans `stats_events`
- [ ] Continuous aggregates fonctionnent (5min, daily)
- [ ] Cron job 5min s'exécute correctement
- [ ] Stats cumulatives mises à jour
- [ ] API endpoints retournent les bonnes données
- [ ] Vocal time calculé correctement (±5 secondes)
- [ ] Commit : `docs(stats): Add manual testing results`

---

**✅ PHASE 4 COMPLÈTE** : [ ] Toutes les tâches cochées

---

### PHASE 5 : Documentation (Durée : 2h)

**Objectif** : Documenter le module pour usage futur

#### Tâche 5.1 : Architecture Document ✅ / ❌
**Durée** : 1h

**Fichier** : `docs/modules/STATS_MODULE.md`

**Contenu** :
- Vue d'ensemble module
- Architecture technique
- Tables et schema
- Flow de données
- Vocal tracking (détaillé)
- API endpoints
- Limites Free/Premium
- Configuration
- Troubleshooting

**Checklist** :
- [ ] Document créé
- [ ] Tous les aspects documentés
- [ ] Commit : `docs(stats): Add comprehensive module documentation`

---

#### Tâche 5.2 : API Documentation ✅ / ❌
**Durée** : 1h

**Ajouter Swagger/OpenAPI** :

**Fichier** : `apps/backend/src/modules/stats/controllers/stats.controller.ts`

**Ajouter les decorators** :
```typescript
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  
  @ApiOperation({ summary: 'Get guild stats overview' })
  @ApiResponse({ status: 200, description: 'Returns guild stats overview' })
  @Get(':guildId/overview')
  async getOverview(...) {
    // ...
  }
}
```

**Checklist** :
- [ ] Swagger decorators ajoutés
- [ ] Documentation accessible sur `/api/docs`
- [ ] Commit : `docs(stats): Add Swagger/OpenAPI documentation`

---

**✅ PHASE 5 COMPLÈTE** : [ ] Toutes les tâches cochées

---

## ✅ Checklist Globale

### Backend
- [ ] Phase 1 : Schema & Infrastructure
- [ ] Phase 2 : Services
- [ ] Phase 3 : Bot Integration
- [ ] Phase 4 : Tests
- [ ] Phase 5 : Documentation

### Validation
- [ ] Module enregistré dans `ModuleRegistry`
- [ ] TimescaleDB correctement configuré
- [ ] Continuous aggregates fonctionnent
- [ ] Cron jobs s'exécutent
- [ ] API endpoints répondent correctement
- [ ] Vocal tracking précis (±5 secondes)
- [ ] Limites Free/Premium appliquées
- [ ] Tests coverage > 80%
- [ ] Documentation complète

### Metrics de Succès
- [ ] Events processed: > 10,000/sec
- [ ] Aggregation 5min: < 10 secondes
- [ ] API latency p95: < 200ms
- [ ] Vocal time précision: ±5 secondes
- [ ] DB size pour 1000 serveurs: < 50 GB

---

## 📊 Suivi Progression

**Date début** : ___________  
**Date fin estimée** : ___________  
**Date fin réelle** : ___________

**Temps estimé total** : 7 jours  
**Temps réel** : ___________

**Phases complétées** : 0 / 5

---

## 📝 Notes & Décisions

### Décisions Prises
- [ ] Architecture Event Sourcing Light validée
- [ ] 4 tables TimescaleDB confirmées
- [ ] Vocal tracking "Snapshot" retenu
- [ ] Events Tier 1 validés (6 types)
- [ ] Limites Free/Premium définies

### Blockers Rencontrés
_Ajouter les blockers ici au fur et à mesure_

### Améliorations Futures (Post-MVP)
- [ ] Tier 2 events (threads, stages)
- [ ] Channel breakdown
- [ ] Export données
- [ ] Real-time WebSocket updates
- [ ] Heatmap activité par heure/jour

---

## 🔗 Annexes

### Ressources Utiles
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [Prisma TimescaleDB Guide](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/customizing-migrations)
- [Discord.js Voice State](https://discord.js.org/#/docs/discord.js/main/class/VoiceState)
- [NestJS Cron Jobs](https://docs.nestjs.com/techniques/task-scheduling)

### Commandes Utiles

```bash
# Backend
npm run start:backend:dev
npm run test
npm run test:cov
npm run test:e2e

# Bot
npm run start:bot:dev

# Gateway
npm run start:gateway:dev

# Database
npx prisma migrate dev
npx prisma studio
psql -d discord_admin

# TimescaleDB queries
SELECT * FROM timescaledb_information.hypertables;
SELECT * FROM timescaledb_information.continuous_aggregates;
```

---

**🎉 Bon courage pour l'implémentation !**