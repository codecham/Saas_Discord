# 🚀 TimescaleDB Setup - Documentation Complète

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Pourquoi TimescaleDB ?](#pourquoi-timescaledb-)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [Configuration Docker](#configuration-docker)
6. [Configuration Prisma](#configuration-prisma)
7. [Migration SQL](#migration-sql)
8. [Vérification](#vérification)
9. [Troubleshooting](#troubleshooting)
10. [Commandes utiles](#commandes-utiles)

---

## 🎯 Vue d'ensemble

Ce document décrit l'installation et la configuration de **TimescaleDB** dans notre application Discord Admin. TimescaleDB est une extension PostgreSQL optimisée pour les données time-series (séries temporelles).

### Ce qui a été mis en place

- ✅ TimescaleDB installé via image Docker officielle
- ✅ 2 Hypertables créées : `events` et `metrics_snapshots`
- ✅ Politique de rétention automatique (30 jours pour events, 1 an pour snapshots)
- ✅ Index optimisés pour les requêtes temporelles
- ✅ Table `member_stats` pour les statistiques cumulatives
- ✅ Intégration complète avec Prisma

---

## 🤔 Pourquoi TimescaleDB ?

### Problème à résoudre

Notre application doit gérer :
- **Centaines de milliers d'événements Discord par seconde** (messages, voice, reactions, etc.)
- **Requêtes analytiques complexes** sur des périodes de temps
- **Agrégations périodiques** (stats horaires, journalières, mensuelles)
- **Rétention automatique** des données (supprimer les vieux events)

### Solution TimescaleDB

TimescaleDB offre :
- **Hypertables** : Partitionnement automatique par période (chunks de 1 jour pour events)
- **Compression automatique** : Réduction de 90%+ de l'espace disque sur les vieux chunks
- **Retention policies** : Suppression automatique des données expirées
- **Performance** : 10-100x plus rapide que PostgreSQL standard pour les time-series
- **Compatibilité** : 100% compatible PostgreSQL (fonctionne avec Prisma sans problème)

---

## 🏗️ Architecture

### Structure des tables

```
┌─────────────────────────────────────────────────────────────┐
│                    TimescaleDB Layer                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │     events       │  │ metrics_snapshots│  │  member_  │ │
│  │  (hypertable)    │  │   (hypertable)   │  │   stats   │ │
│  ├──────────────────┤  ├──────────────────┤  └───────────┘ │
│  │ - Events bruts   │  │ - Agrégations    │       │        │
│  │ - 30j rétention  │  │ - 1 an rétention │       │        │
│  │ - Partitionné    │  │ - Partitionné    │  Stats cumulées│
│  │   par jour       │  │   par semaine    │  (non partitionné)
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
                  ┌─────────┴─────────┐
                  │   Prisma Client   │
                  └───────────────────┘
```

### Flux de données

```
Bot → Gateway → Backend → EventsService → TimescaleDB
                                              │
                                              ├─→ events (brut)
                                              ├─→ metrics_snapshots (agrégé)
                                              └─→ member_stats (cumulé)
```

---

## 📦 Installation

### Prérequis

- Docker & Docker Compose
- Node.js 20+
- PostgreSQL client (inclus dans l'image Docker)

### Étapes d'installation

#### 1. Image Docker TimescaleDB

**Fichier** : `infrastructure/docker/docker-compose.dev.yml`

```yaml
services:
  postgres:
    image: timescale/timescaledb:latest-pg16
    container_name: ${POSTGRES_CONTAINER:-myproject-postgres-dev}
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d

volumes:
  postgres_data:
```

**Pourquoi cette image ?**
- Contient PostgreSQL 16 + TimescaleDB préinstallé
- `shared_preload_libraries=timescaledb` déjà configuré
- Prête à l'emploi

#### 2. Script d'initialisation

**Fichier** : `infrastructure/docker/init-scripts/01-enable-timescale.sql`

```sql
-- Active TimescaleDB dans la DB principale
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
```

**Pourquoi ce script ?**
- S'exécute automatiquement au premier démarrage du container
- Active l'extension TimescaleDB dans `myproject_dev`
- Idempotent (peut être exécuté plusieurs fois sans erreur)

#### 3. Démarrage

```bash
# Démarrer les containers
npm run db:up

# Vérifier que TimescaleDB est actif
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';"

# Devrait afficher : 2.22.1 (ou version récente)
```

---

## ⚙️ Configuration Docker

### Variables d'environnement

**Fichier** : `infrastructure/docker/.env.dev`

```env
POSTGRES_DB=myproject_dev
POSTGRES_USER=devuser
POSTGRES_PASSWORD=devpassword
POSTGRES_CONTAINER=myproject-postgres-dev
```

### Volumes persistants

```bash
# Lister les volumes
docker volume ls

# Inspecter le volume PostgreSQL
docker volume inspect docker_postgres_data

# Supprimer le volume (⚠️ PERTE DE DONNÉES)
docker volume rm docker_postgres_data
```

---

## 🔧 Configuration Prisma

### Schema Prisma

**Fichier** : `apps/backend/prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// TimescaleDB Tables
// ============================================

/// Events bruts Discord (Hypertable TimescaleDB)
/// Rétention : 30 jours
model Event {
  id        BigInt   @default(autoincrement())
  
  // Métadonnées obligatoires
  type      String
  guildId   String   @map("guild_id") @db.VarChar(20)
  timestamp DateTime @db.Timestamptz
  
  // Métadonnées optionnelles
  userId    String?  @map("user_id") @db.VarChar(20)
  channelId String?  @map("channel_id") @db.VarChar(20)
  messageId String?  @map("message_id") @db.VarChar(20)
  roleId    String?  @map("role_id") @db.VarChar(20)
  shardId   Int?     @map("shard_id")
  
  // Données complètes
  data      Json?    @db.JsonB
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@id([id, timestamp])  // ← PK composite OBLIGATOIRE pour hypertable
  @@map("events")
  // ⚠️ PAS de @@index ici - gérés dans la migration SQL
}

/// Snapshots de métriques agrégées (Hypertable TimescaleDB)
/// Rétention : 1 an
model MetricsSnapshot {
  // Identification
  guildId   String   @map("guild_id") @db.VarChar(20)
  
  // Période
  periodStart DateTime @map("period_start") @db.Timestamptz
  periodEnd   DateTime @map("period_end") @db.Timestamptz
  periodType  String   @map("period_type") @db.VarChar(10)
  
  // Données agrégées
  data      Json     @db.JsonB
  
  // Compteurs extraits
  totalMessages      Int? @default(0) @map("total_messages")
  totalVoiceMinutes  Int? @default(0) @map("total_voice_minutes")
  totalReactions     Int? @default(0) @map("total_reactions")
  uniqueActiveUsers  Int? @default(0) @map("unique_active_users")
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@id([guildId, periodType, periodStart])  // ← PK composite avec timestamp
  @@map("metrics_snapshots")
  // ⚠️ PAS de @@index ici - gérés dans la migration SQL
}

/// Statistiques cumulatives par membre
model MemberStats {
  id        String   @id @default(cuid())
  
  // Identification
  guildId   String   @map("guild_id") @db.VarChar(20)
  userId    String   @map("user_id") @db.VarChar(20)
  
  // Compteurs cumulatifs
  totalMessages          Int      @default(0) @map("total_messages")
  totalVoiceMinutes      Int      @default(0) @map("total_voice_minutes")
  totalReactionsGiven    Int      @default(0) @map("total_reactions_given")
  totalReactionsReceived Int      @default(0) @map("total_reactions_received")
  
  // Dernière activité
  lastMessageAt DateTime? @map("last_message_at") @db.Timestamptz
  lastVoiceAt   DateTime? @map("last_voice_at") @db.Timestamptz
  lastSeen      DateTime? @map("last_seen") @db.Timestamptz
  
  // Metadata
  joinedAt  DateTime? @map("joined_at") @db.Timestamptz
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  @@map("member_stats")
  @@unique([guildId, userId], name: "idx_member_stats_unique")
  // ⚠️ PAS de @@index ici - gérés dans la migration SQL
}
```

### Points importants

1. **PK composite avec timestamp** : Obligatoire pour les hypertables
   ```prisma
   @@id([id, timestamp])  // events
   @@id([guildId, periodType, periodStart])  // metrics_snapshots
   ```

2. **Pas de @@index dans le schema** : Les index sont créés dans la migration SQL pour éviter les conflits avec TimescaleDB

3. **Types PostgreSQL spécifiques** :
   - `@db.Timestamptz` pour les timestamps avec timezone
   - `@db.JsonB` pour les données JSON (plus performant que JSON)
   - `@db.VarChar(20)` pour les IDs Discord

---

## 📝 Migration SQL

### Création de la migration

```bash
cd apps/backend

# Créer une migration vide
npx prisma migrate dev --name add_timescaledb_tables --create-only

# Le fichier sera créé dans :
# prisma/migrations/XXXXXX_add_timescaledb_tables/migration.sql
```

### Contenu de la migration

**Fichier** : `prisma/migrations/XXXXXX_add_timescaledb_tables/migration.sql`

```sql
-- Active TimescaleDB (peut déjà être activé, on ignore l'erreur)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'TimescaleDB already loaded, continuing...';
END
$$;

-- CreateTable : Events (TimescaleDB Hypertable)
CREATE TABLE IF NOT EXISTS "events" (
    "id" BIGSERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "guild_id" VARCHAR(20) NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "user_id" VARCHAR(20),
    "channel_id" VARCHAR(20),
    "message_id" VARCHAR(20),
    "role_id" VARCHAR(20),
    "shard_id" INTEGER,
    "data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "events_pkey" PRIMARY KEY ("id", "timestamp")
);

-- Convertir en Hypertable (ignore si déjà fait)
DO $$
BEGIN
  PERFORM create_hypertable('events', 'timestamp', if_not_exists => TRUE);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Hypertable events already exists';
END
$$;

-- Politique de rétention (ignore si existe)
DO $$
BEGIN
  PERFORM add_retention_policy('events', INTERVAL '30 days', if_not_exists => TRUE);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Retention policy already exists for events';
END
$$;

-- Index optimisés
CREATE INDEX IF NOT EXISTS "idx_events_guild_time" ON "events" ("guild_id", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_events_type_time" ON "events" ("type", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_events_user_time" ON "events" ("user_id", "timestamp" DESC) WHERE "user_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_events_channel_time" ON "events" ("channel_id", "timestamp" DESC) WHERE "channel_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_events_shard" ON "events" ("shard_id") WHERE "shard_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_events_data_gin" ON "events" USING GIN ("data");

-- CreateTable : Metrics Snapshots
CREATE TABLE IF NOT EXISTS "metrics_snapshots" (
    "guild_id" VARCHAR(20) NOT NULL,
    "period_start" TIMESTAMPTZ NOT NULL,
    "period_end" TIMESTAMPTZ NOT NULL,
    "period_type" VARCHAR(10) NOT NULL,
    "data" JSONB NOT NULL,
    "total_messages" INTEGER DEFAULT 0,
    "total_voice_minutes" INTEGER DEFAULT 0,
    "total_reactions" INTEGER DEFAULT 0,
    "unique_active_users" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "metrics_snapshots_pkey" PRIMARY KEY ("guild_id", "period_type", "period_start")
);

-- Convertir en Hypertable
DO $$
BEGIN
  PERFORM create_hypertable('metrics_snapshots', 'period_start', if_not_exists => TRUE);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Hypertable metrics_snapshots already exists';
END
$$;

-- Politique de rétention
DO $$
BEGIN
  PERFORM add_retention_policy('metrics_snapshots', INTERVAL '1 year', if_not_exists => TRUE);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Retention policy already exists for metrics_snapshots';
END
$$;

-- Index
CREATE INDEX IF NOT EXISTS "idx_snapshots_guild_period" ON "metrics_snapshots" ("guild_id", "period_start" DESC);
CREATE INDEX IF NOT EXISTS "idx_snapshots_period_type" ON "metrics_snapshots" ("period_type", "period_start" DESC);
CREATE INDEX IF NOT EXISTS "idx_snapshots_data_gin" ON "metrics_snapshots" USING GIN ("data");

-- CreateTable : Member Stats
CREATE TABLE IF NOT EXISTS "member_stats" (
    "id" TEXT NOT NULL,
    "guild_id" VARCHAR(20) NOT NULL,
    "user_id" VARCHAR(20) NOT NULL,
    "total_messages" INTEGER NOT NULL DEFAULT 0,
    "total_voice_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_reactions_given" INTEGER NOT NULL DEFAULT 0,
    "total_reactions_received" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMPTZ,
    "last_voice_at" TIMESTAMPTZ,
    "last_seen" TIMESTAMPTZ,
    "joined_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "member_stats_pkey" PRIMARY KEY ("id")
);

-- Index pour leaderboards
CREATE INDEX IF NOT EXISTS "idx_member_stats_guild_messages" ON "member_stats" ("guild_id", "total_messages" DESC);
CREATE INDEX IF NOT EXISTS "idx_member_stats_guild_voice" ON "member_stats" ("guild_id", "total_voice_minutes" DESC);
CREATE INDEX IF NOT EXISTS "idx_member_stats_guild_reactions" ON "member_stats" ("guild_id", "total_reactions_given" DESC);
CREATE INDEX IF NOT EXISTS "idx_member_stats_last_seen" ON "member_stats" ("guild_id", "last_seen" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_member_stats_unique" ON "member_stats" ("guild_id", "user_id");
```

### Appliquer la migration

```bash
cd apps/backend

# Appliquer la migration
npx prisma migrate dev

# OU forcer sans validation
npx prisma db push --accept-data-loss

# Générer le client Prisma
npx prisma generate
```

---

## ✅ Vérification

### 1. Extension TimescaleDB

```bash
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';"
```

**Résultat attendu** :
```
  extname   | extversion 
------------+------------
 timescaledb| 2.22.1
```

### 2. Hypertables créées

```bash
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "SELECT hypertable_name, num_dimensions FROM timescaledb_information.hypertables;"
```

**Résultat attendu** :
```
 hypertable_name   | num_dimensions 
-------------------+----------------
 events            |              1
 metrics_snapshots |              1
```

### 3. Retention policies

```bash
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "SELECT hypertable_name, drop_after FROM timescaledb_information.jobs WHERE proc_name = 'policy_retention';"
```

**Résultat attendu** :
```
 hypertable_name   | drop_after 
-------------------+------------
 events            | 30 days
 metrics_snapshots | 1 year
```

### 4. Test d'insertion

```bash
# Insérer un event
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "INSERT INTO events (type, guild_id, timestamp) VALUES ('MESSAGE_CREATE', '123456789', NOW()) RETURNING *;"

# Lire les events
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "SELECT * FROM events LIMIT 5;"
```

### 5. Vérifier les index

```bash
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "\d events"
```

**Résultat attendu** : Doit lister tous les index créés

---

## 🔧 Troubleshooting

### Problème : "function create_hypertable does not exist"

**Cause** : TimescaleDB n'est pas activé dans la base de données

**Solution** :
```bash
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"
```

### Problème : "table is not empty"

**Cause** : La table contient déjà des données et ne peut pas être convertie en hypertable

**Solution** :
```bash
# Option 1 : Vider la table
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "TRUNCATE events;"

# Option 2 : Migrer les données existantes
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "SELECT create_hypertable('events', 'timestamp', migrate_data => true);"
```

### Problème : "cannot create unique index without timestamp"

**Cause** : Les index uniques ou PRIMARY KEY n'incluent pas la colonne de partitionnement

**Solution** : S'assurer que toutes les contraintes UNIQUE incluent la colonne timestamp :
```sql
-- ❌ MAuvais
PRIMARY KEY (id)

-- ✅ BON
PRIMARY KEY (id, timestamp)
```

### Problème : Migration échoue avec "index already exists"

**Cause** : Les index existent déjà suite à une tentative précédente

**Solution** :
```bash
# Supprimer manuellement les tables et index
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "DROP TABLE IF EXISTS events CASCADE;"

# Réappliquer la migration
cd apps/backend
npx prisma migrate dev
```

### Problème : Scripts d'init ne s'exécutent pas

**Cause** : Le volume Docker existe déjà

**Solution** :
```bash
# Supprimer le volume et redémarrer
npm run db:down
docker volume rm docker_postgres_data
npm run db:up
```

---

## 🛠️ Commandes utiles

### Docker

```bash
# Démarrer les containers
npm run db:up

# Arrêter les containers
npm run db:down

# Voir les logs PostgreSQL
docker logs myproject-postgres-dev -f

# Se connecter à PostgreSQL
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev

# Lister les volumes
docker volume ls

# Supprimer le volume (⚠️ perte de données)
docker volume rm docker_postgres_data

# Reset complet
npm run db:down && docker volume rm docker_postgres_data && npm run db:up
```

### Prisma

```bash
# Créer une migration
npx prisma migrate dev --name nom_migration

# Créer une migration vide
npx prisma migrate dev --name nom_migration --create-only

# Appliquer les migrations
npx prisma migrate deploy

# Reset complet (⚠️ perte de données)
npx prisma migrate reset

# Forcer la DB sans migration
npx prisma db push

# Générer le client
npx prisma generate

# Ouvrir Prisma Studio
npx prisma studio
```

### PostgreSQL / TimescaleDB

```bash
# Lister les extensions
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "\dx"

# Lister les tables
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "\dt"

# Voir la structure d'une table
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "\d events"

# Lister les hypertables
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "SELECT * FROM timescaledb_information.hypertables;"

# Lister les chunks
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "SELECT * FROM timescaledb_information.chunks WHERE hypertable_name = 'events';"

# Lister les jobs (retention, compression, etc.)
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "SELECT * FROM timescaledb_information.jobs;"

# Vider une table
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "TRUNCATE events;"

# Supprimer une table
docker exec -it myproject-postgres-dev psql -U devuser -d myproject_dev -c "DROP TABLE events CASCADE;"
```

---

## 📊 Performance Tips

### Compression

TimescaleDB peut compresser automatiquement les vieux chunks :

```sql
-- Activer la compression sur events
ALTER TABLE events SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'guild_id'
);

-- Ajouter une politique de compression (compresser après 7 jours)
SELECT add_compression_policy('events', INTERVAL '7 days');
```

### Continuous Aggregates

Pour des agrégations temps réel :

```sql
CREATE MATERIALIZED VIEW events_hourly
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 hour', timestamp) AS hour,
  guild_id,
  type,
  COUNT(*) as event_count
FROM events
GROUP BY hour, guild_id, type;

-- Refresh automatique
SELECT add_continuous_aggregate_policy('events_hourly',
  start_offset => INTERVAL '1 day',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');
```

---

## 🎯 Prochaines étapes

Maintenant que TimescaleDB est en place, voici les étapes suivantes de la roadmap :

1. **EventsService (Backend)** : Créer le service qui reçoit les events du bot et les stocke
2. **Job Queue (BullMQ)** : Mettre en place les jobs d'agrégation
3. **MetricsService** : Calculer les métriques et remplir `metrics_snapshots`
4. **Stats API** : Endpoints pour récupérer les stats
5. **Frontend Dashboard** : Afficher les stats dans l'interface Angular

---

## 📚 Ressources

- [TimescaleDB Documentation](https://docs.timescale.com/)
- [Hypertables Guide](https://docs.timescale.com/use-timescale/latest/hypertables/)
- [Retention Policies](https://docs.timescale.com/use-timescale/latest/data-retention/)
- [Compression](https://docs.timescale.com/use-timescale/latest/compression/)
- [Continuous Aggregates](https://docs.timescale.com/use-timescale/latest/continuous-aggregates/)
- [Prisma + TimescaleDB](https://www.prisma.io/docs/concepts/database-connectors/postgresql)

---

**Date de création** : Octobre 2025  
**Version** : 1.0  
**Auteur** : Documentation générée lors de la mise en place de TimescaleDB

Ce document est **vivant** : à mettre à jour si des modifications sont apportées à la configuration TimescaleDB.