# Discord Admin App - Notes de Contexte Essentielles

## 📋 Document de Contexte pour Conversations Futures

Ce document contient toutes les informations critiques pour comprendre le projet et continuer son développement.

---

## 🎯 Vision & Objectifs du Projet

### Ambition
Créer une application d'administration/moderation Discord **premium** capable de concurrencer MEE6, Carl-Bot et Dyno.

### Différenciateurs Clés
1. **UI/UX supérieure** : Interface web moderne, intuitive (template Sakai + PrimeNG)
2. **Analytics avancées** : Stats détaillées serveur + membre (en temps réel)
3. **Tout-en-un simplifié** : Stats, modération, tickets, automatisations en une seule app
4. **Performance** : Architecture scalable 100 → 100,000+ serveurs

### Modèle Business
- **Freemium** : version gratuite limitée + premium par serveur
- Abonnement mensuel par serveur Discord
- Features premium : stats avancées, automations illimitées, automod, support prioritaire

---

## 🏗️ Architecture Technique

### Stack Technologique

#### Frontend
- **Framework** : Angular 20
- **UI Library** : PrimeNG
- **Styling** : TailwindCSS (No SCSS)
- **Template** : Sakai (exemples dans fichiers `*demo.ts`)
- **Pattern** : Services en facade (facade → api → data)

#### Backend
- **Framework** : NestJS
- **ORM** : Prisma
- **Database** : PostgreSQL + TimescaleDB (extension time-series)
- **Cache** : Redis
- **Jobs** : BullMQ
- **Auth** : Discord OAuth 2.0 + JWT

#### Bot
- **Framework** : SapphireJS (sur Discord.js)
- **Features** : Event listeners, slash commands, batching système
- **Resilience** : Backup SQLite si gateway offline

#### Gateway
- **Framework** : NestJS + Socket.IO
- **Rôle** : Hub WebSocket bidirectionnel Backend ↔ Bot
- **Scaling** : Multi-instances ready

#### Infrastructure
- **Containers** : Docker (PostgreSQL, Redis, Grafana, Loki)
- **Monitoring** : Prometheus + Grafana + Loki
- **Logs** : Structured logging avec Winston

### Principes Architecturaux CRITIQUES

#### 1. **Ne PAS stocker les données Discord**
- ❌ **NE PAS** persister : channels, roles, members (détails)
- ✅ **TOUJOURS** fetch depuis Discord API à la demande
- ✅ **UNIQUEMENT** stocker : 
  - Config app (guild_settings, automations, tickets)
  - Auth users (tokens chiffrés)
  - Stats agrégées (metrics_snapshots, member_stats)
  - Events time-series (30 jours rétention)
- **Raison** : Éviter désynchronisation, respecter guidelines Discord, réduire DB size

#### 2. **Cache Strategy**
- **Redis** : Cache court terme (1-5min) pour données Discord
- **TTL recommandés** :
  - Channels/Roles : 5 min
  - Members list : 1 min
  - Member details : 5 min
  - Stats dashboard : 5 min
  - Leaderboards : 10 min

#### 3. **Sharding-Ready dès le début**
- Tous les DTOs incluent `shardId?: number`
- Bot préparé pour ShardingManager Discord.js
- Gateway route par shardId
- Backend : ShardCoordinatorService (registry Redis)
- **Limite Discord** : 2500 guilds par shard

#### 4. **Event Processing Pipeline**
Bot → Batch (5s ou 100 events) → Gateway → Backend → EventsService → Dispatch modules

#### 5. **Data Retention**
- **Events bruts** : 30 jours (TimescaleDB auto-retention)
- **Metrics snapshots** : 1 an (agrégations horaires/journalières)
- **Member stats** : illimité (compteurs cumulatifs légers)
- **Audit logs** : 1 an (compliance)

---

## 📊 Database Schema (Concepts Clés)

### Tables Principales

#### Transactionnelles (PostgreSQL standard)
```
users               : Auth Discord (tokens chiffrés, metadata)
refresh_tokens      : JWT refresh tokens
guilds              : Config basique (guildId, isActive, botAddedAt)
guild_settings      : Config app (modules enabled, prefix, language)
member_stats        : Donnée et Statistiques relatif à un membre sur un serveur 
subscriptions       : Billing (tier, status, Stripe IDs)
automations         : Workflows custom (trigger, actions, conditions)
tickets             : Support tickets (status, priority, messages)
automod_rules       : Règles modération auto
moderation_logs     : Historique actions modération
warnings            : Avertissements membres
audit_logs          : Logs actions dans l'app
```

#### Time-Series (TimescaleDB)
```
events              : Events bruts Discord (hypertable, 30j retention)
metrics_snapshots   : Agrégations périodiques (JSONB + extracted fields)
member_stats        : Stats cumulatives par membre (counters + resets périodiques)
```

### Indexes Critiques
```sql
-- Events (time-series queries)
CREATE INDEX idx_events_guild_time ON events(guildId, timestamp DESC);
CREATE INDEX idx_events_type_time ON events(type, timestamp DESC);
CREATE INDEX idx_events_user_time ON events(userId, timestamp DESC);

-- Member stats (leaderboards)
CREATE INDEX idx_member_stats_guild_messages ON member_stats(guildId, totalMessages DESC);
CREATE INDEX idx_member_stats_guild_voice ON member_stats(guildId, totalVoiceMinutes DESC);
```

---

## 🔐 Décisions de Sécurité

### Auth Flow
1. User clique "Login with Discord" (Frontend)
2. Redirect Discord OAuth
3. Callback Backend → échange code contre tokens Discord
4. Encrypt Discord tokens (AES-256-GCM avec ENCRYPTION_KEY)
5. Store encrypted tokens + user info en DB
6. Generate JWT access + refresh tokens
7. Return JWT au Frontend
8. Frontend stocke JWT (memory + httpOnly cookie pour refresh)

### Permissions
- **Guild Access** : vérifier via Discord API si user a permissions
  - Owner, Admin, ou roles autorisés dans guild_settings
  - Cache résultat 5min dans Redis
- **Guards NestJS** : `GuildAccessGuard`, `GuildAdminGuard`
- **Frontend** : hide/disable features selon permissions

### Rate Limiting
- Discord API : respecter buckets (50 req/s global)
- Backend API : Redis rate limiter (100 req/min par user)
- Webhooks : IP whitelist + secrets

---

## 🚀 Scaling Strategy

### Bot Sharding (> 2500 guilds)
```
1 shard = 2500 guilds max (Discord limit)
10,000 guilds = 4 shards = 4 bot processes
ShardingManager → spawn shards → each connects to Gateway
```

### Backend Instances (> 70% CPU)
```
Load balancer (Nginx/ALB) → N backend instances
Sticky sessions via Redis (for WebSocket if needed)
All instances share PostgreSQL + Redis
```

### Gateway Instances (> 10K WebSocket connections)
```
Multiple Gateway instances avec sticky sessions
Redis Pub/Sub pour communication inter-gateways
```

### Database Scaling
1. **Vertical** : augmenter vCPU/RAM d'abord
2. **Read replicas** : queries stats sur replicas
3. **Partitioning** : TimescaleDB automatic par date
4. **Connection pooling** : Prisma pool (20-50 connexions)

### Performance Targets
| Métrique | Target | Critical |
|----------|--------|----------|
| API latency p95 | < 200ms | < 500ms |
| Events/sec | 100,000+ | 1,000+ |
| DB query | < 50ms | < 200ms |
| Uptime | > 99.9% | > 99.5% |

---

## 🎨 Frontend Guidelines

### Pattern Services (IMPORTANT)
```
facade.service.ts  : Interface publique (inject dans components)
  └─ api.service.ts     : HTTP calls vers Backend
      └─ data.service.ts    : Transform/cache données
```

### PrimeNG Components
- **Toujours** vérifier doc officielle (Claude pas toujours à jour)
- Préférer : `p-table`, `p-button`, `p-card`, `p-dialog`, `p-chart`
- TailwindCSS pour spacing/colors : `class="p-4 bg-surface-0"`

### Sakai Template
- Exemples dans `*demo.component.ts`
- Layouts : `AppLayoutComponent`, `AppTopBarComponent`, `AppMenuComponent`
- Thèmes : config dans `src/assets/layout/styles/theme/`

### Design Principles
- **Clean & Modern** : inspiration SaaS (Notion, Linear)
- **Responsive** : mobile-first
- **Accessibility** : contraste, keyboard nav
- **Performance** : lazy loading, virtual scroll

---

## 🤖 Bot Specifics

### Event Batching System
- **Batch interval** : 5 secondes OU 100 events max
- **Priority system** : Critical (instant) → High (1s) → Medium (5s) → Low (30s)
- **Backup SQLite** : si Gateway offline, store localement + resend au reconnect

### MetricsCollector (En Mémoire)
- Agrège activity par guild en RAM
- Flush toutes les 5 minutes → snapshot complet
- Calcul top members (score = messages + voice*2 + reactions)
- Gestion sessions voice en cours (calcul durée au flush)

### Commands Structure
```
/setup       : Init bot sur serveur (créer guild_settings)
/sync        : Force resync guild data
/stats       : Afficher stats rapides
/ticket      : Ouvrir ticket support
/warn        : Avertir membre
/automod     : Configurer règles
```

---

## 📝 Conventions de Code

### Naming
- **Services** : `*.service.ts`
- **Controllers** : `*.controller.ts`
- **DTOs** : `*.dto.ts` (dans shared-types)
- **Interfaces** : `*.interface.ts`
- **Guards** : `*.guard.ts`
- **Decorators** : `*.decorator.ts`

### Structure Modules NestJS
```
src/modules/[module-name]/
├── [module-name].module.ts
├── [module-name].controller.ts
├── [module-name].service.ts
├── dto/
│   └── *.dto.ts
└── interfaces/
    └── *.interface.ts
```

### Git Workflow
- **Branches** : `feature/`, `bugfix/`, `hotfix/`
- **Commits** : conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`)
- **PRs** : require review + CI pass

---

## 🔍 Monitoring & Observability

### Métriques Clés (Prometheus)
```
events_processed_total{type}          : Counter events par type
event_processing_duration_seconds{type} : Histogram latency
active_shards                          : Gauge nombre shards actifs
api_requests_total{endpoint, status}   : Counter API calls
db_query_duration_seconds{query}       : Histogram DB latency
redis_operations_total{operation}      : Counter Redis ops
```

### Dashboards Grafana
1. **System Health** : CPU, RAM, DB connections, Redis memory
2. **Events Pipeline** : events/sec, latency p95/p99, error rate
3. **Bot Status** : shards actifs, guilds par shard, uptime
4. **API Performance** : requests/sec, latency, error rate par endpoint
5. **Business Metrics** : guilds actifs, users actifs, premium conversion

### Alertes Critiques
- Service down (health check fail)
- Error rate > 5%
- Latency p95 > 500ms
- DB connections > 90%
- Redis memory > 90%
- Shard offline

---

## 🐛 Common Pitfalls & Solutions

### ❌ Pitfall 1 : Sync DB avec Discord data
**Problème** : Désynchronisation, DB bloat, violation guidelines Discord  
**Solution** : Jamais stocker, toujours fetch API + cache court Redis

### ❌ Pitfall 2 : Rate limits Discord
**Problème** : 429 errors, bot ban temporaire  
**Solution** : Rate limiter service, respect buckets, queue requests

### ❌ Pitfall 3 : Memory leaks bot
**Problème** : RAM augmente indéfiniment  
**Solution** : Clear maps/sets régulièrement, WeakMap si possible, monitoring

### ❌ Pitfall 4 : N+1 queries DB
**Problème** : Latency élevée  
**Solution** : Prisma include/select, batching, dataloader

### ❌ Pitfall 5 : Pas de rollback plan
**Problème** : Deploy cassé = downtime  
**Solution** : CI/CD avec health checks, keep N-1 version, feature flags

---

## 🎯 Priorités MVP (Quick Win)

### Phase 1 Must-Have (3-4 mois)
1. ✅ **Infrastructure scalable** (Phase 0)
2. ✅ **Stats avancées** (Phase 1) ← DIFFÉRENCIATEUR
3. ✅ **Permissions & sync** (Phase 2)
4. ✅ **Member management** (Phase 3)
5. ✅ **Modération basique** (Phase 4)
6. ✅ **Billing Stripe** (Phase 8)
7. ✅ **Polish & launch** (Phase 10)

### Phase 2 Post-Launch
- Tickets, Automations, Channels, Features avancées

**Stratégie** : Lancer rapidement avec **stats exceptionnelles** + UX supérieure = différenciation immédiate

---

## 📚 Ressources & Documentation

### Docs Techniques
- `docs/ARCHITECTURE.md` : Vue ensemble système
- `docs/SCALING.md` : Guide scaling composants
- `docs/MONITORING.md` : Métriques et dashboards
- `docs/STATISTICS.md` : Système stats détaillé
- `docs/SYNC_STRATEGY.md` : Pourquoi pas de sync, comment ça marche
- `docs/PERMISSIONS.md` : Guards, overrides, vérifications

### APIs Externes
- **Discord API** : https://discord.com/developers/docs
- **Discord.js Guide** : https://discordjs.guide/
- **Sapphire Framework** : https://www.sapphirejs.dev/
- **PrimeNG** : https://primeng.org/
- **Stripe** : https://stripe.com/docs

### Communauté
- Discord Dev Server : https://discord.gg/discord-developers
- Discord.js Server : https://discord.gg/djs

---

## 🚨 Notes Critiques pour Future Conversations

### Contexte Déjà Établi
1. ✅ **Toute la partie Auth** est complète et fonctionnelle
2. ✅ **Module Discord** backend opérationnel (endpoints guilds/channels/members/roles/bans)
3. ✅ **Monitoring** en place (Grafana, Loki, Prometheus ready)
4. ✅ **4 conteneurs Docker** fonctionnels (PostgreSQL, Redis, Grafana, Loki)
5. ✅ **Bot event listeners** capturent tous les événements et les envoient en batch
6. ✅ **Gateway** communique bidirectionnellement Backend ↔ Bot

### En Cours / À Faire
- Stats backend + frontend (Phase 1 de la roadmap)
- Sync strategy (Phase 2)
- Member/Role management (Phase 3)
- Puis suivre roadmap séquentiellement

### Quand Démarrer une Nouvelle Conversation
**Fournis** :
1. Ce document (context notes)
2. La roadmap complète (artifact créé)
3. Le point où tu en es ("Je suis à la Phase X, Tâche Y")
4. Fichiers spécifiques concernés si besoin

**Format recommandé** :
```
Je travaille sur mon app Discord Admin.
Context : [lien vers ce document]
Roadmap : [lien artifact]
Actuellement : Phase 1, Tâche 1.1 (MetricsCollector)
Question : [ta question spécifique]
```

---

## 💡 Philosophie du Projet

### Principes de Développement
1. **Architecture first** : Scale-ready dès le début (pas de refacto massive plus tard)
2. **Code quality** : Tests, reviews, monitoring (éviter dette technique)
3. **User-centric** : UX > features (mieux vaut 5 features parfaites que 20 médiocres)
4. **Iterate fast** : MVP rapide, feedback users, amélioration continue
5. **Documentation** : Code autodocumenté + docs à jour (future you will thank you)

### Mindset
- **Done > Perfect** : Ship fast, improve later
- **Measure everything** : Data-driven decisions
- **Fail fast** : Test hypothèses rapidement
- **Stay lean** : Ne pas over-engineer (YAGNI principle)

---

