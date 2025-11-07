# 🗺️ Discord Admin App - Roadmap Complète

## 📊 Vue d'ensemble

Cette roadmap définit les étapes pour développer une application d'administration Discord scalable, capable de gérer des dizaines de milliers de serveurs avec centaines de milliers d'événements par seconde.

**Objectifs principaux** :
- UI/UX supérieure aux concurrents (MEE6, Carl-Bot, Dyno)
- Analytics avancées par serveur et par membre
- Tout-en-un : stats, modération, tickets, automatisations
- Architecture scalable : 100 à 100,000+ serveurs
- Modèle freemium (features premium par serveur)

---

## 🎯 PHASE 0 : Fondations Scale-Ready (2-3 semaines)

**Objectif** : Préparer l'infrastructure pour le scaling dès le départ

### Semaine 1 : Database & Architecture

#### 0.1 Migration vers TimescaleDB (1 jour)
- Installer l'extension TimescaleDB sur PostgreSQL existant
- Créer table `events` avec structure time-series (type, guildId, userId, channelId, shardId, data, timestamp)
- Convertir `events` en hypertable avec partitioning automatique par jour
- Créer politique de rétention : 30 jours pour events bruts
- Créer table `metrics_snapshots` pour agrégations (par période : heure/jour)
- Créer table `member_stats` pour statistiques cumulées par membre
- Ajouter indexes optimisés : (guildId, timestamp), (type, timestamp), (userId, timestamp)
- Tests de performance : INSERT 10K events + requête agrégée < 100ms

#### 0.2 Sharding-Ready Architecture (2 jours)
- Ajouter champ `shardId` dans tous les DTOs (BotEventDto, etc.)
- Backend : créer `ShardCoordinatorService` pour gérer registry des shards
  - Enregistrement shard (shardId, botId, totalShards, status)
  - Calcul du shard pour une guild (formule Discord standard)
  - Heartbeat système pour détecter shards offline
  - Stocker registry dans Redis avec TTL
- Gateway : ajouter routing par shardId
  - Map shardId → botId pour routing intelligent
  - Support multi-shards simultanés
- Bot : structure pour sharding (1 instance = 1 shard pour l'instant)
  - Ajouter shardId dans tous les events émis
  - Préparer ShardingManager (sans activer multi-shards encore)
  - Enregistrement du shard auprès de Gateway au démarrage

#### 0.3 Job Queue System (1 jour)
- Installer et configurer BullMQ avec Redis
- Créer module `queues` dans Backend
- Définir queues principales :
  - `stats-aggregation` : calculs horaires/journaliers
  - `cleanup` : purge old data
  - `sync` : synchronisation Discord
- Créer processors de base (structure seulement, logique plus tard)
- Tester création et exécution de jobs

### Semaine 2 : Event Processing Pipeline

#### 0.4 Events Module Complet (3 jours)
- Backend : créer module `events` dédié
- Service `EventsService` comme point d'entrée unique pour tous les events
  - Validation des events reçus
  - Persistance dans TimescaleDB (table `events`)
  - Dispatcher vers modules concernés (stats, moderation, audit)
- Créer handlers par type d'événement :
  - Messages (create, update, delete)
  - Voice (join, leave, state update)
  - Members (add, remove, update)
  - Reactions (add, remove)
  - Roles, Channels, Guilds (CRUD)
- Intégrer avec Gateway : router les batches d'events vers `EventsService`
- Gestion d'erreurs robuste : log sans crasher
- Tests : traiter 1000+ events en parallèle sans erreur

#### 0.5 Monitoring & Observability (1 jour)
- Installer Prometheus metrics dans Backend
- Ajouter métriques custom :
  - `events_processed_total` (counter par type)
  - `event_processing_duration_seconds` (histogram par type)
  - `queue_jobs_total` (counter par queue)
  - `active_shards` (gauge)
- Créer dashboards Grafana :
  - Events Pipeline : events/sec, latency p95/p99
  - System Health : CPU, RAM, DB queries/sec
  - Shards Status : nombre actifs, guilds par shard
- Configurer alertes : erreurs critiques, latency > 500ms

### Semaine 3 : Tests & Documentation

#### 0.6 Tests de Charge (2 jours)
- Créer script de génération d'events de test (socket.io vers Gateway)
- Simuler charge : 1000 events/sec pendant 60 secondes
- Mesurer performance :
  - Events/sec traités sans perte
  - Latency p95 < 200ms, p99 < 500ms
  - CPU < 50%, Memory stable
  - Database queries < 50ms
- Identifier bottlenecks et optimiser si nécessaire
- Documenter résultats et limites actuelles

#### 0.7 Documentation Phase 0 (1 jour)
- `docs/ARCHITECTURE.md` : vue d'ensemble composants, flux de données, sharding strategy
- `docs/SCALING.md` : quand et comment scaler (bot, backend, gateway, databases)
- `docs/MONITORING.md` : métriques clés, dashboards, alertes
- Mettre à jour README principal avec liens vers docs
- Schémas architecture (mermaid ou draw.io)

---

## 🎯 PHASE 1 : Statistics Core (3-4 semaines)

**Objectif** : Système de statistiques avancées temps réel par serveur et par membre

### Semaine 4 : Bot - Activity Collectors

#### 1.1 Metrics Collector Service (2 jours)
- Bot : créer `MetricsCollectorService` qui agrège en mémoire
- Structures de données par guild :
  - Compteurs messages (total, par channel, par user)
  - Sessions voice actives + durées cumulées (par user, par channel)
  - Compteurs réactions (total, par user)
  - Set membres actifs dans la période
  - Map memberData avec détails (messages, voice, reactions, lastSeen)
- Logique de flush périodique (ex: toutes les 5 minutes)
- Calcul top members actifs (score = messages + voice*2 + reactions)
- Calcul top channels (par nombre de messages)
- Gestion sessions voice en cours (calculer durée au flush)

#### 1.2 Listeners Enrichis (2 jours)
- Listener `messageCreate` : appeler `metricsCollector.trackMessage()`
- Listener `voiceStateUpdate` : détecter join/leave/move
  - Join : `trackVoiceJoin()`
  - Leave : `trackVoiceLeave()` avec calcul durée
  - Move : traiter comme leave+join
- Listener `messageReactionAdd` : `trackReaction()`
- Tous les listeners émettent events normaux + trackent metrics
- Tests : vérifier que métriques s'accumulent correctement

#### 1.3 Snapshot Emission (1 jour)
- Connecter MetricsCollector au WebSocketService
- Au flush, construire objet `MetricsSnapshot` complet
- Émettre event `METRICS_SNAPSHOT` vers Gateway
- Inclure : period (start, end, duration), metrics (messages, voice, reactions), topMembers, topChannels
- Gateway transmet snapshot au Backend

### Semaine 5 : Backend - Stats Processing

#### 1.4 Statistics Module (2 jours)
- Backend : créer module `statistics`
- Service `StatisticsService` avec méthodes :
  - `handleSnapshot()` : traiter snapshot reçu du bot
  - `getGuildStats()` : récupérer stats d'une guild (API)
  - `getMemberStats()` : récupérer stats d'un membre (API)
- Handler pour event `METRICS_SNAPSHOT` :
  - Persister snapshot complet dans `metrics_snapshots` (JSONB)
  - Upsert `member_stats` pour chaque membre actif (increment compteurs)
  - Gérer reset périodiques (daily/weekly/monthly counters)

#### 1.5 Stats API Endpoints (2 jours)
- `GET /api/guilds/:id/stats` : overview complet
  - Compteurs actuels : members, messages today, voice today
  - Graphiques : messages/day (7j, 30j), voice/day
  - Top channels par activité
  - Croissance : % change vs période précédente
- `GET /api/guilds/:id/stats/members/:userId` : stats membre spécifique
  - Compteurs cumulés : totalMessages, totalVoiceMinutes, totalReactions
  - Périodes : daily, weekly, monthly
  - Rank dans le serveur (leaderboard position)
  - Channels préférés (où il est le plus actif)
  - Graphique activité dans le temps
- `GET /api/guilds/:id/leaderboard` : top membres
  - Paramètres : metric (messages/voice/reactions), period (day/week/month/all)
  - Pagination (50 membres par page)
- Tests endpoints : réponses < 200ms

#### 1.6 Aggregation Jobs (1 jour)
- Job `aggregate-hourly` (cron : toutes les heures)
  - Query events de la dernière heure par guild
  - Calculer métriques agrégées
  - Créer snapshot horaire si pas reçu du bot
- Job `aggregate-daily` (cron : minuit)
  - Agrégations journalières plus détaillées
  - Reset compteurs daily dans `member_stats`
- Job `reset-weekly` (cron : lundi minuit)
  - Reset compteurs weekly
- Job `reset-monthly` (cron : 1er du mois)
  - Reset compteurs monthly
- Job `cleanup-old-events` (cron : quotidien)
  - Vérifier rétention TimescaleDB (automatique normalement)

### Semaine 6 : Frontend - Dashboard Stats

#### 1.7 Services & Models Frontend (1 jour)
- Angular : créer `StatisticsService` (pattern facade)
  - Méthodes : `getGuildStats()`, `getMemberStats()`, `getLeaderboard()`
- Models TypeScript : `GuildStats`, `MemberStats`, `LeaderboardEntry`
- HTTP calls vers Backend API
- Cache local court terme (5 minutes)

#### 1.8 Dashboard Overview Components (3 jours)
- Page `DashboardComponent` principale
- Cards d'overview :
  - `TotalMembersCard` : nombre total + croissance
  - `ActiveMembersCard` : actifs derniers 7j
  - `MessagesTodayCard` : messages aujourd'hui + trend
  - `VoiceTodayCard` : minutes vocales aujourd'hui
- Charts (utiliser PrimeNG Chart ou Recharts) :
  - `ActivityLineChart` : messages/jour sur 7j ou 30j (sélecteur)
  - `VoiceLineChart` : minutes voice/jour
  - `ChannelDistributionChart` : pie chart top channels
- Tableau `TopMembersTable` : leaderboard top 10
  - Colonnes : rank, avatar, username, messages, voice, reactions
  - Lien vers profil membre détaillé
- Design : suivre template Sakai, PrimeNG components, Tailwind

#### 1.9 Member Stats Page (2 jours)
- Page `MemberStatsComponent` (route `/guilds/:id/members/:userId`)
- Header : avatar, username, rank badge
- Stats cards :
  - Total messages (avec comparaison moyenne serveur)
  - Total voice minutes
  - Total reactions
- Charts :
  - Activity over time (messages/day last 30 days)
  - Channel distribution (où il est actif)
- Période selector : today, week, month, all time
- Refresh auto toutes les 30s (optionnel)

### Semaine 7 : Real-time & Polish

#### 1.10 WebSocket Stats Updates (2 jours)
- Backend : créer Gateway WebSocket pour Frontend
- Rooms par guild : Frontend subscribe à `guild:{guildId}`
- Événements émis :
  - `stats:update` : quand nouveau snapshot reçu
  - `member:activity` : quand membre actif détecté
- Frontend : `StatsRealtimeService`
  - Connexion WebSocket
  - Subscribe aux updates
  - Update charts sans refresh
- Tests : observer updates en temps réel dans le dashboard

#### 1.11 Optimisations & Cache (1 jour)
- Backend : Redis cache pour stats fréquemment demandées
  - Cache key : `stats:guild:{id}:{period}` TTL 5min
  - Cache leaderboards : TTL 10min
- Query optimizations : indexes vérifiés, explain analyze
- Frontend : optimistic updates (afficher changement immédiatement)
- Tests de charge : 100 requêtes stats simultanées < 200ms p95

#### 1.12 Tests & Documentation Phase 1 (1 jour)
- Tests end-to-end : créer events → vérifier stats frontend
- Documentation `docs/STATISTICS.md` :
  - Architecture du système de stats
  - Période de collecte et agrégation
  - Métriques disponibles
  - Comment ajouter nouvelles métriques
- Update roadmap frontend avec ✅ Dashboard terminé

---

## 🎯 PHASE 2 : Sync & Data Management (2 semaines)

**Objectif** : Synchronisation complète Discord → DB, ne stocker que la config, pas les données Discord

### Semaine 8 : Sync Strategy & Implementation

#### 2.1 Sync Module Architecture (1 jour)
- Backend : créer module `sync`
- Service `SyncService` responsable orchestration
- Stratégie : **ne pas stocker données Discord** (channels, roles, members)
  - Stocker uniquement : Guild config (settings app), User (auth), Subscriptions
  - Toujours fetch from Discord API pour données live
- Créer table `guild_sync_status` :
  - lastSyncAt, lastSyncType (full/partial), status, errorMessage
- Créer table `guild_settings` pour config app :
  - Prefix commandes, modules activés, language, timezone, etc.

#### 2.2 Discord API Abstraction (2 jours)
- Utiliser module Discord existant, étendre si nécessaire
- Créer wrappers avec cache Redis court terme (1-5min) :
  - `getGuildChannels(guildId)` : fetch + cache 5min
  - `getGuildRoles(guildId)` : fetch + cache 5min
  - `getGuildMembers(guildId)` : fetch + cache 1min
  - `getGuildMember(guildId, userId)` : fetch + cache 5min
- Rate limiting intelligent : respecter buckets Discord
- Fallback : si API Discord down, utiliser cache expiré si disponible
- Tests : vérifier cache hit/miss, rate limits respectés

#### 2.3 Guild Configuration System (2 jours)
- Table `guild_settings` avec champs :
  - Modules actifs : `statsEnabled`, `moderationEnabled`, `ticketsEnabled`, etc.
  - Customization : `prefix`, `language`, `timezone`
  - Permissions : qui peut utiliser l'interface web (roles autorisés)
- API endpoints :
  - `GET /api/guilds/:id/settings`
  - `PATCH /api/guilds/:id/settings`
- Frontend : page Settings pour chaque guild
  - Toggles pour activer/désactiver modules
  - Input prefix, language dropdown
- Validation : vérifier user a permissions avant modifier settings

#### 2.4 Bot Setup Flow (2 jours)
- Commande slash `/setup` dans le bot :
  - Check permissions bot (admin)
  - Créer entry `guild_settings` avec defaults
  - Envoyer message welcome avec lien vers web interface
- Backend : endpoint `POST /api/guilds/:id/initialize`
  - Créé par bot lors du `/setup` OU lors du premier accès web
  - Créer settings defaults
  - Marquer guild comme `isActive`
- Frontend : page Welcome première visite
  - Wizard onboarding : choisir modules, configurer basique
- Tests : flow complet bot setup → accès web

### Semaine 9 : Data Consistency & Permissions

#### 2.5 Permissions System (3 jours)
- Backend : `PermissionsService`
  - Vérifier si user Discord a permissions sur guild (owner, admin, roles autorisés)
  - Check via Discord API : `getGuildMember()` puis vérifier roles/permissions
  - Cache résultats dans Redis (5min)
- Guards NestJS : `GuildAccessGuard`, `GuildAdminGuard`
  - Appliquer sur routes sensibles
  - Return 403 si pas autorisé
- Frontend : cacher/afficher features selon permissions
  - Service `PermissionsService` fetch user permissions
  - Directives Angular `*hasPermission="'admin'"`
- Table `guild_permissions` pour overrides spécifiques (optionnel)
  - Autoriser user spécifique même sans role Discord
- Tests : vérifier accès autorisé/refusé

#### 2.6 Data Refresh Strategy (1 jour)
- Jamais stale data : toujours fetch from Discord quand user ouvre page
- Loading states : skeleton loaders pendant fetch
- Refresh button sur chaque page pour forcer refetch
- Auto-refresh optionnel : toutes les 30s si page active
- Error handling : message clair si Discord API down
- Optimistic updates : pour actions user (ex: kick member), update UI puis confirmer

#### 2.7 Audit Logs (1 jour)
- Table `audit_logs` pour tracer actions dans l'app :
  - Qui (userId), quoi (action), quand (timestamp), guild, détails (JSON)
- Logger automatiquement :
  - Settings changes
  - Member kicks/bans via interface
  - Role assignments
  - Config changes
- API endpoint : `GET /api/guilds/:id/audit-logs` (paginated)
- Frontend : page Audit Logs (admin only)
  - Tableau avec filtres : action type, user, date range

#### 2.8 Documentation Phase 2 (1 jour)
- `docs/SYNC_STRATEGY.md` : expliquer pourquoi pas de sync, comment ça marche
- `docs/PERMISSIONS.md` : système de permissions, guards, overrides
- `docs/DATA_FLOW.md` : schémas flux données Discord → App → Frontend
- Update README avec nouvelles features

---

## 🎯 PHASE 3 : Member & Role Management (2-3 semaines)

**Objectif** : Interface complète pour gérer membres et rôles via web

### Semaine 10-11 : Members Management

#### 3.1 Members List Backend (2 jours)
- Backend : module `members`
- Endpoints :
  - `GET /api/guilds/:id/members` : liste paginée, fetch Discord API
    - Filtres : role, status (online/offline), search username
    - Tri : par join date, username, activity
    - Pagination : 50 membres par page
  - `GET /api/guilds/:id/members/:userId` : détails membre
    - Info Discord : username, avatar, roles, joinedAt
    - Stats app : via StatisticsService
- Cache : liste membres 1min, détails 5min
- Tests : pagination, filtres, performance

#### 3.2 Member Actions Backend (2 jours)
- Endpoints actions modération :
  - `POST /api/guilds/:id/members/:userId/kick` : kick via Discord API
  - `POST /api/guilds/:id/members/:userId/ban` : ban
  - `DELETE /api/guilds/:id/bans/:userId` : unban
  - `PUT /api/guilds/:id/members/:userId/timeout` : timeout (mute temporaire)
  - `POST /api/guilds/:id/members/:userId/roles` : add/remove roles
- Vérifications :
  - Permissions user (via guard)
  - Hiérarchie roles (ne pas kick quelqu'un avec role supérieur)
  - Bot permissions (vérifier bot peut effectuer action)
- Audit logging : chaque action loggée
- Discord API calls avec gestion erreurs

#### 3.3 Members Frontend (3 jours)
- Page `MembersListComponent`
  - PrimeNG Table avec virtualScroll (performance)
  - Colonnes : avatar, username, roles (badges), joinedAt, status, actions
  - Filtres : search bar, role filter dropdown, status filter
  - Tri : par colonne
  - Pagination server-side
- Sidebar `MemberDetailsComponent` :
  - Affiché au clic sur membre
  - Sections : Info, Stats, Roles, Actions
  - Boutons : Kick, Ban, Timeout, Manage Roles
- Modals confirmation : avant actions destructives
- Toasts : succès/erreur après action
- Design : suivre Sakai template, responsive

#### 3.4 Bulk Actions (1 jour)
- Backend : endpoints bulk
  - `POST /api/guilds/:id/members/bulk-kick` : array de userIds
  - `POST /api/guilds/:id/members/bulk-ban`
  - `POST /api/guilds/:id/members/bulk-roles` : assigner role à multiple
- Frontend : checkboxes dans table membres
  - Sélection multiple → bulk actions toolbar apparaît
  - Confirmation modal : liste membres concernés
- Limits : max 50 membres par bulk action (éviter abus)

### Semaine 12 : Roles Management

#### 3.5 Roles Backend (2 jours)
- Endpoints :
  - `GET /api/guilds/:id/roles` : liste roles (fetch Discord)
  - `POST /api/guilds/:id/roles` : créer role
  - `PATCH /api/guilds/:id/roles/:roleId` : modifier (name, color, permissions)
  - `DELETE /api/guilds/:id/roles/:roleId` : supprimer
  - `PUT /api/guilds/:id/roles/:roleId/position` : réorganiser hiérarchie
- Validation : respecter hiérarchie (ne pas modifier role au-dessus du sien)
- Permissions calculator : service pour calculer permissions effectives
- Cache : 5min

#### 3.6 Roles Frontend (2 jours)
- Page `RolesListComponent`
  - Liste roles avec drag & drop pour réorganiser
  - Cards par role : color badge, name, member count
  - Boutons : Edit, Delete
- Modal `RoleEditorComponent` :
  - Inputs : name, color picker
  - Permissions : checklist (PrimeNG Tree pour organisation)
  - Preview : voir aperçu role
- Validation frontend : hiérarchie, permissions compatibles
- Feedback visuel : highlighting quand drag & drop

#### 3.7 Documentation Phase 3 (1 jour)
- `docs/MODERATION.md` : guide actions modération, best practices
- `docs/ROLES.md` : système roles, permissions Discord, hiérarchie
- Screenshots pour docs user-facing

---

## 🎯 PHASE 4 : Moderation Tools (2 semaines)

**Objectif** : Outils modération avancés, logs, automod basique

### Semaine 13 : Moderation Logs & History

#### 4.1 Moderation Logs Backend (2 jours)
- Table `moderation_logs` :
  - guildId, moderatorId, targetUserId, action (kick/ban/timeout/warn), reason, timestamp, metadata (JSON)
- Endpoints :
  - `GET /api/guilds/:id/moderation/logs` : liste paginée, filtres (action, moderator, target, date range)
  - `GET /api/guilds/:id/moderation/logs/:userId` : historique d'un membre
- Auto-logging : intercepter actions modération, créer entry
- Sync avec Discord Audit Log : fetch périodiquement, compléter nos logs
- Stats : dashboard modération (actions/day, top moderators)

#### 4.2 Warnings System (2 jours)
- Table `warnings` : guildId, userId, moderatorId, reason, createdAt, isActive
- Endpoints :
  - `POST /api/guilds/:id/warnings` : créer warning
  - `GET /api/guilds/:id/warnings/:userId` : liste warnings d'un membre
  - `DELETE /api/guilds/:id/warnings/:id` : supprimer warning
- Logique : X warnings → action auto (configurable dans settings)
  - Ex: 3 warnings = timeout 1h, 5 warnings = kick
- Bot : commande `/warn @user reason`
- Frontend : afficher warnings dans member details, gérer via interface

#### 4.3 Moderation Dashboard Frontend (2 jours)
- Page `ModerationDashboardComponent`
  - Stats cards : actions today, warnings actifs, bans totaux
  - Chart : actions over time
  - Recent logs : table 20 dernières actions
- Page `ModerationLogsComponent` : full logs
  - Table avec filtres avancés
  - Export CSV
- Integration warnings dans member details
- Design : sections claires, color coding (kick=orange, ban=red)

### Semaine 14 : Automod Basique

#### 4.4 Automod Rules System (3 jours)
- Table `automod_rules` :
  - guildId, name, enabled, triggerType (spam/caps/links/words), action (delete/warn/timeout/kick), config (JSON)
- Backend : `AutomodService`
  - Évaluer rules sur events (MESSAGE_CREATE principalement)
  - Détecter patterns : spam (messages répétés), caps (% uppercase), links (regex), banned words
  - Exécuter action si rule match
- Bot : intégration automod
  - Listener priority : automod avant metrics
  - Supprimer message, timeout user, log action
- Endpoints :
  - `GET /api/guilds/:id/automod/rules`
  - `POST/PATCH/DELETE` pour CRUD rules
- Tests : simuler messages, vérifier détection

#### 4.5 Automod Frontend (2 jours)
- Page `AutomodSettingsComponent`
  - Liste rules avec toggle enable/disable
  - Bouton Add Rule → modal
- Modal `AutomodRuleEditorComponent` :
  - Input name
  - Select trigger type + config (ex: spam = X messages in Y seconds)
  - Select action + params (ex: timeout duration)
  - Exemptions : roles/channels ignorés
- Preview : tester rule avec exemples
- Presets : templates rules communs (anti-spam, anti-caps)

#### 4.6 Documentation Phase 4 (1 jour)
- `docs/AUTOMOD.md` : règles disponibles, exemples configurations
- User guide : comment configurer modération efficace
- Best practices : équilibrer automatisation et modération humaine

---

## 🎯 PHASE 5 : Channels Management (1 semaine)

**Objectif** : Gérer channels et permissions via interface web

### Semaine 15 : Channels & Permissions

#### 5.1 Channels Backend (2 jours)
- Endpoints :
  - `GET /api/guilds/:id/channels` : liste avec catégories (fetch Discord)
  - `POST /api/guilds/:id/channels` : créer channel (text/voice/category)
  - `PATCH /api/guilds/:id/channels/:channelId` : modifier (name, topic, slowmode, nsfw)
  - `DELETE /api/guilds/:id/channels/:channelId` : supprimer
  - `GET/PUT /api/guilds/:id/channels/:channelId/permissions` : permission overwrites (roles/members)
- Cache : 5min
- Validation : vérifier structure (categories, limits)

#### 5.2 Channels Frontend (3 jours)
- Page `ChannelsListComponent`
  - Tree view (PrimeNG Tree) : categories → channels
  - Drag & drop pour réorganiser
  - Icons par type (text/voice/announcement)
  - Boutons : Edit, Delete, Permissions
- Modal `ChannelEditorComponent` :
  - Inputs : name, type, category, topic (si text), bitrate (si voice)
  - Settings : slowmode, nsfw, user limit
- Modal `ChannelPermissionsComponent` :
  - Liste roles avec permission toggles (view, send, connect, speak, etc.)
  - Override members spécifiques
  - Preview : qui peut accéder/parler
- Design : visual channel structure, facile à comprendre

#### 5.3 Documentation Phase 5 (1 jour)
- `docs/CHANNELS.md` : types channels, permissions système
- Guide : organiser channels efficacement

---

## 🎯 PHASE 6 : Ticket System (2 semaines)

**Objectif** : Système de tickets support complet

### Semaine 16 : Tickets Core

#### 6.1 Tickets Backend (3 jours)
- Tables :
  - `tickets` : id, guildId, userId, channelId (Discord), subject, status (open/closed/resolved), priority, createdAt, closedAt
  - `ticket_messages` : ticketId, userId, content, timestamp
  - `ticket_categories` : guildId, name, color, description (ex: Support, Bug, Suggestion)
- Endpoints :
  - `GET /api/guilds/:id/tickets` : liste (filtres status, priority, category)
  - `POST /api/guilds/:id/tickets` : créer (via web ou bot)
  - `PATCH /api/guilds/:id/tickets/:ticketId` : update status/priority
  - `POST /api/guilds/:id/tickets/:ticketId/messages` : ajouter message
- Bot : système automatique
  - Commande `/ticket` ou bouton → créer channel privé Discord
  - Channel lié à ticket DB
  - Sync messages Discord ↔ DB pour historique
  - Fermer ticket → archive channel

#### 6.2 Tickets Frontend (2 jours)
- Page `TicketsListComponent`
  - Kanban board : colonnes Open/In Progress/Resolved
  - Filtres : category, priority, assigned to
  - Cards : ticket summary avec user avatar
- Page `TicketDetailsComponent`
  - Header : subject, status badge, priority, timestamps
  - Messages thread : afficher historique
  - Actions : Reply, Change Status, Assign, Close
  - Sidebar : metadata (category, user info, linked messages)
- Notifications : quand nouveau ticket ou réponse

### Semaine 17 : Tickets Advanced

#### 6.3 Ticket Automation (2 jours)
- Auto-assignment : distribuer tickets aux staff disponibles (round-robin ou par category)
- Auto-close : fermer tickets inactifs après X jours
- Templates réponses : réponses pré-écrites communes
- Tags : ajouter tags custom sur tickets (ex: urgent, billing, technical)
- SLA tracking : temps de première réponse, temps de résolution
- Escalation : auto-escalate si pas de réponse après X heures
- Frontend : settings tickets, templates editor, automation rules

#### 6.4 Ticket Analytics (1 jour)
- Stats dashboard tickets :
  - Tickets ouverts/résolus par période
  - Temps moyen de résolution
  - Satisfaction (optionnel : feedback après fermeture)
  - Top categories
- Export rapports
- Frontend : graphiques et métriques claires

#### 6.5 Documentation Phase 6 (1 jour)
- `docs/TICKETS.md` : guide setup système tickets
- User guide : comment créer et gérer tickets
- Best practices : organiser support efficacement

---

## 🎯 PHASE 7 : Automation & Workflows (2-3 semaines)

**Objectif** : Système d'automatisations visuelles inspiré de Zapier/n8n

### Semaine 18-19 : Automation Engine

#### 7.1 Automation Core Backend (3 jours)
- Tables :
  - `automations` : id, guildId, name, enabled, triggerType, actions (JSON array), conditions (JSON), createdBy, createdAt
  - `automation_executions` : automationId, timestamp, success, error, metadata
- Trigger types :
  - Member join/leave
  - Message in channel (with filters)
  - Role assigned/removed
  - Voice join/leave
  - Reaction added
  - Time-based (cron)
  - Webhook trigger
- Action types :
  - Send message (channel, DM)
  - Assign/remove role
  - Create channel
  - Send webhook
  - Add to database (custom data)
  - Wait (delay)
  - Conditional branch
- Backend : `AutomationEngine`
  - Écouter events relevants
  - Évaluer conditions (if/else)
  - Exécuter actions séquentiellement
  - Logger executions
  - Error handling : retry logic

#### 7.2 Automation API (2 jours)
- Endpoints :
  - `GET /api/guilds/:id/automations` : liste
  - `POST /api/guilds/:id/automations` : créer
  - `PATCH /api/guilds/:id/automations/:id` : modifier
  - `DELETE /api/guilds/:id/automations/:id` : supprimer
  - `POST /api/guilds/:id/automations/:id/test` : tester avec données mock
  - `GET /api/guilds/:id/automations/:id/executions` : historique exécutions
- Validation : vérifier structure workflow valide
- Limits : max X automations par guild (freemium vs premium)

#### 7.3 Visual Workflow Builder Frontend (4 jours)
- Page `AutomationsListComponent` : liste automations avec status
- Page `AutomationBuilderComponent` : éditeur visuel
  - Canvas drag & drop (utiliser bibliothèque type react-flow ou custom)
  - Nodes : Trigger (début), Actions (middle), Conditions (branches)
  - Connections entre nodes
  - Configuration panel : clic sur node → sidebar config
  - Variables : injecter données du trigger dans actions (ex: `{user.username}`)
  - Preview : simuler avec données test
- Templates : workflows pré-configurés
  - Welcome message + assign role
  - Auto-moderation advanced
  - Reaction roles
  - Scheduled announcements
- Sauvegarde auto : ne pas perdre travail
- Design : intuitive, colorée, inspirée de n8n

#### 7.4 Common Automations (2 jours)
- Implémenter use cases populaires :
  - **Welcome Messages** : trigger memberJoin → send message (channel + DM) + assign role
  - **Reaction Roles** : trigger reactionAdd → assign role si emoji match
  - **Auto-Roles** : trigger memberJoin → assign role après X minutes
  - **Scheduled Posts** : trigger cron → send message
  - **Level Up** : trigger stats threshold → send congratulations + assign role
- Bot : handlers spécifiques pour reaction roles (performant)
- Tests : chaque automation fonctionnelle

### Semaine 20 : Advanced Features

#### 7.5 Conditions & Variables (2 jours)
- Conditions avancées :
  - If user has role X
  - If message contains word
  - If time between X and Y
  - If custom variable equals
  - Logical operators : AND, OR, NOT
- Variables système :
  - `{user.*}` : username, id, discriminator, avatar
  - `{guild.*}` : name, memberCount
  - `{channel.*}` : name, id
  - `{message.*}` : content, attachments
  - `{date.*}` : now, timestamp
- Custom variables : stocker/récupérer données entre exécutions
- Frontend : condition builder UI (dropdowns + inputs)

#### 7.6 Webhooks & External Integration (2 jours)
- Trigger webhook : générer URL unique par automation
  - `POST /webhooks/:automationId/:secret` → déclenche automation
  - Payload JSON disponible en variables
- Action webhook : appeler URL externe
  - POST/GET/PUT/DELETE
  - Headers custom
  - Body template avec variables
- Use cases : intégrer Stripe, Google Sheets, autres apps
- Security : secrets, rate limiting, IP whitelist

#### 7.7 Documentation Phase 7 (1 jour)
- `docs/AUTOMATIONS.md` : guide complet système
- Exemples workflows : screenshots + explications
- Variables reference : liste complète
- Best practices : performance, éviter boucles infinies

---

## 🎯 PHASE 8 : Billing & Premium (2 semaines)

**Objectif** : Système de facturation freemium, gestion abonnements

### Semaine 21 : Billing Infrastructure

#### 8.1 Subscription System Backend (3 jours)
- Tables :
  - `subscriptions` : id, guildId, tier (free/premium/enterprise), status (active/cancelled/expired), startDate, endDate, stripeSubscriptionId
  - `payments` : id, subscriptionId, amount, currency, status, timestamp, stripePaymentIntentId
  - `features` : définir features par tier
- Tiers :
  - **Free** : stats basiques, 3 automations, 50 tickets/mois
  - **Premium** : stats avancées, automations illimitées, tickets illimités, automod avancé, support prioritaire
  - **Enterprise** : white-label, API access, dedicated support, custom features
- Backend : `BillingService`
  - Check feature access : `canUseFeature(guildId, feature)`
  - Upgrade/downgrade subscription
  - Webhooks Stripe (payment success/failed, subscription updated)
- Endpoints :
  - `GET /api/guilds/:id/subscription` : current plan
  - `POST /api/guilds/:id/subscription/checkout` : créer session Stripe
  - `POST /api/guilds/:id/subscription/cancel` : annuler
  - `POST /api/guilds/:id/subscription/upgrade` : changer tier

#### 8.2 Stripe Integration (2 jours)
- Installer Stripe SDK
- Créer products & prices dans Stripe dashboard
- Webhook endpoint : `/api/webhooks/stripe`
  - Écouter events : checkout.session.completed, invoice.paid, subscription.deleted
  - Update DB accordingly
- Test mode : utiliser test keys, simuler paiements
- Security : vérifier signature Stripe webhooks

#### 8.3 Feature Flags & Limits (1 jour)
- Service `FeatureFlagsService`
  - Check si feature disponible pour guild tier
  - Enforce limits : automations count, tickets/month, API calls
- Guards : `@RequiresPremium()` decorator sur routes
- Frontend : afficher badges Premium, disable features si free
- Grace period : 7 jours après expiration avant hard disable

### Semaine 22 : Billing Frontend & UX

#### 8.4 Pricing Page (2 jours)
- Page `PricingComponent` : tableau comparatif tiers
  - Features list avec checkmarks
  - Prix par mois/an
  - CTA : "Upgrade to Premium"
- Modal checkout : redirection vers Stripe Checkout
- Page success : retour après paiement réussi
- Design : attractif, clair, inspiré de SaaS modernes

#### 8.5 Subscription Management (2 jours)
- Page `SubscriptionComponent` dans settings guild
  - Current plan : badge + features incluses
  - Usage actuel : automations used / limit, tickets used / limit
  - Boutons : Upgrade, Downgrade, Cancel
  - Historique paiements : table avec invoices
  - Manage billing : lien Stripe Customer Portal
- Notifications : avant expiration, payment failed
- UX : transitions smooth, feedback clair

#### 8.6 Premium Features UX (1 jour)
- Afficher "Premium" badges sur features avancées
- Lock icon + tooltip si feature premium et user free
- Upsell modals : clic sur feature locked → présentation benefits + CTA upgrade
- Trial : optionnel, 14 jours gratuit Premium
- Design : non intrusif mais incitatif

#### 8.7 Documentation Phase 8 (1 jour)
- `docs/BILLING.md` : système facturation, tiers, intégration Stripe
- User docs : comment upgrader, gérer abonnement, FAQ
- Legal : Terms of Service, Privacy Policy (templates à adapter)

---

## 🎯 PHASE 9 : Advanced Features (2-3 semaines)

**Objectif** : Features additionnelles pour se démarquer

### Semaine 23 : Welcome/Goodbye & Custom Commands

#### 9.1 Welcome/Goodbye System (2 jours)
- Table `welcome_goodbye_config` : guildId, welcomeEnabled, goodbyeEnabled, welcomeChannelId, goodbyeChannelId, welcomeMessage (template), goodbyeMessage
- Variables dans messages : `{user}`, `{guild}`, `{memberCount}`, etc.
- Embed support : custom colors, image, fields
- Bot : listeners memberAdd/Remove → send configured message
- Frontend : page settings Welcome/Goodbye
  - Toggle enable
  - Channel selector
  - Message editor avec preview
  - Variables helper (clic pour insérer)

#### 9.2 Custom Commands (3 jours)
- Table `custom_commands` : guildId, trigger (command name), response (text/embed), permissions (qui peut use)
- Types :
  - Simple text response
  - Embed response
  - Random response (liste de réponses)
  - Variables : `{user}`, `{args}`, etc.
- Bot : handler custom commands (priority après slash commands natives)
- Endpoints : CRUD custom commands
- Frontend : page Custom Commands
  - Liste commands avec edit/delete
  - Modal editor : trigger, response, permissions
  - Test command : preview résultat
- Limits : X commands par guild (free vs premium)

### Semaine 24 : Leveling & Economy (optionnel)

#### 9.3 Leveling System (3 jours)
- Table `user_levels` : guildId, userId, xp, level, lastMessageAt
- Logique XP :
  - Gain XP par message (avec cooldown 60s)
  - Gain XP par temps vocal
  - Formule level : level = floor(sqrt(xp / 100))
- Role rewards : auto-assign role au level X
- Leaderboard : endpoint stats top levels
- Bot : tracker XP, level up notifications
- Frontend : page Leaderboard, settings leveling (enable/disable, XP rates, role rewards)

#### 9.4 Economy System (optionnel, 2 jours)
- Table `user_economy` : guildId, userId, coins, bank
- Commandes bot : `/balance`, `/daily`, `/give`, `/shop`
- Shop : items custom avec prix
- Use cases : tickets coûtent coins, membres achètent roles
- Frontend : config economy (enable, daily amount, shop items)

### Semaine 25 : Giveaways & Polls

#### 9.5 Giveaways (2 jours)
- Table `giveaways` : guildId, messageId, channelId, prize, winnersCount, endsAt, status
- Bot : message avec bouton "Enter", track participants, tirer gagnants à fin
- Endpoints : create, end early, reroll winner
- Frontend : page Giveaways
  - Actifs : liste avec countdown
  - Créer : modal (prize, duration, winners count, channel)
  - Historique : passés avec winners

#### 9.6 Polls System (1 jour)
- Bot : commande `/poll question option1 option2...`
- Message avec reactions ou boutons pour voter
- Timer optionnel
- Résultats : chart avec % par option
- Frontend : viewer polls actifs (optionnel)

#### 9.7 Documentation Phase 9 (1 jour)
- `docs/FEATURES.md` : guide toutes features avancées
- User tutorials : how-to pour chaque feature
- Video demos (optionnel)

---

## 🎯 PHASE 10 : Polish & Production Ready (2 semaines)

**Objectif** : Optimisations, tests, sécurité, déploiement

### Semaine 26 : Performance & Security

#### 10.1 Performance Audit (2 jours)
- Backend :
  - Analyser slow queries (enable slow query log)
  - Optimiser indexes manquants
  - Cache strategy review : augmenter TTL si pertinent
  - Connection pooling : ajuster limits Prisma/Redis
- Frontend :
  - Lazy loading modules Angular
  - Image optimization
  - Bundle size analysis (webpack-bundle-analyzer)
  - Code splitting
- Load tests : K6 ou Artillery
  - Simuler 1000 users concurrents
  - Target : p95 < 200ms, p99 < 500ms

#### 10.2 Security Hardening (2 jours)
- Backend :
  - Rate limiting sur toutes routes sensibles (Redis)
  - CSRF protection (si non-SPA)
  - Input validation strict (class-validator partout)
  - SQL injection : vérifier Prisma queries
  - Secrets rotation : plan pour JWT, encryption keys
- Frontend :
  - XSS prevention : sanitize user inputs
  - CSP headers
  - HTTPS only (HSTS)
- Audit : npm audit, Snyk pour vulnérabilités dépendances
- Penetration testing : tests intrusion basiques

#### 10.3 Error Handling & Logging (1 jour)
- Backend : centraliser error handling
  - Global exception filter
  - Structured logging (Winston + Loki déjà en place)
  - Error tracking : Sentry integration
- Frontend : global error handler
  - Catch Angular errors
  - Display user-friendly messages
  - Send errors à Sentry
- Monitoring : alertes sur error rate > seuil

### Semaine 27 : Testing & Documentation

#### 10.4 Testing Suite (3 jours)
- Backend :
  - Unit tests : services critiques (auth, billing, stats)
  - Integration tests : endpoints API
  - E2E tests : flows complets (signup, create automation, etc.)
  - Coverage target : >70% sur modules core
- Frontend :
  - Component tests : composants clés
  - E2E tests : Cypress ou Playwright (login, dashboard, actions)
- Bot :
  - Tests listeners avec mocks Discord events
  - Tests commands
- CI/CD : GitHub Actions
  - Run tests sur chaque PR
  - Lint + format check
  - Build success

#### 10.5 Documentation Finale (2 jours)
- User documentation complète :
  - Getting Started guide
  - Feature guides détaillés avec screenshots
  - FAQ
  - Video tutorials (optionnel)
- Developer documentation :
  - API reference (OpenAPI/Swagger)
  - Architecture overview update
  - Contribution guide
- Deployment guide :
  - Infrastructure requirements
  - Environment variables
  - Scaling guide
  - Backup & disaster recovery

#### 10.6 Beta Testing (2 jours)
- Recruter beta testers : 10-20 serveurs Discord
- Feedback form : Google Forms ou TypeForm
- Bug tracking : GitHub Issues
- Itérer sur feedback : fix bugs critiques
- Monitoring : observer métriques production-like

---

## 🎯 PHASE 11 : Launch & Growth (Continu)

**Objectif** : Déploiement production, marketing, croissance

### Semaine 28 : Deployment

#### 11.1 Infrastructure Setup (3 jours)
- Choisir provider : AWS, GCP, DigitalOcean, Hetzner
- Architecture initiale :
  - Backend : 1-2 instances (Docker + PM2 ou Kubernetes)
  - Gateway : 1 instance
  - Bot : 1 shard
  - PostgreSQL : managed service ou self-hosted (avec réplication)
  - Redis : managed service (ElastiCache, Redis Cloud, etc.)
  - TimescaleDB : extension sur PostgreSQL
- Load balancer : Nginx ou AWS ALB
- SSL : Let's Encrypt (Certbot) ou managed
- Domain : acheter domaine + DNS setup
- CDN : Cloudflare pour assets frontend

#### 11.2 CI/CD Pipeline (2 jours)
- GitHub Actions workflows :
  - Build & test sur push
  - Deploy automatique sur merge to main (staging)
  - Deploy production : manuel trigger avec approval
- Docker images : build et push to registry
- Secrets management : GitHub Secrets ou Vault
- Rollback strategy : garder N dernières versions
- Health checks : endpoints `/health` pour monitoring

#### 11.3 Monitoring Production (1 jour)
- APM : setup complet Prometheus + Grafana
- Dashboards : overview, backend, bot, database
- Alerting : PagerDuty ou OpsGenie
  - Critical : service down, error rate > 5%
  - Warning : latency p95 > 500ms, CPU > 80%
- Log aggregation : Loki + queries pertinentes
- Uptime monitoring : UptimeRobot ou Pingdom

### Semaine 29-30 : Marketing & Launch

#### 11.4 Landing Page (3 jours)
- Site vitrine : landing page attractive
  - Hero section : proposition valeur claire
  - Features showcase : screenshots
  - Pricing : tableau clair
  - Testimonials (beta testers)
  - CTA : Add to Discord button
- SEO : meta tags, sitemap, robots.txt
- Analytics : Google Analytics ou Plausible
- Design : moderne, performant, responsive

#### 11.5 Discord Bot Listing (1 jour)
- Soumettre bot sur :
  - top.gg
  - discordbotlist.com
  - discord.bots.gg
- Description attractive : features, screenshots
- Tags pertinents : moderation, stats, utility
- Inviter facilement : lien OAuth2 avec permissions

#### 11.6 Community & Support (2 jours)
- Créer Discord serveur support
  - Channels : announcements, support, suggestions, bugs
  - Bot de support : tickets, FAQ auto-response
  - Staff : modérateurs pour aider users
- Documentation accessible : docs.votreapp.com
- Social media : Twitter, Reddit (r/discordapp)
- Changelog : communiquer updates régulièrement

#### 11.7 Launch Strategy (1 jour)
- Soft launch : beta users + communities ciblées
- Hard launch : annonce large
  - Posts Reddit, Discord servers lists
  - Product Hunt (optionnel)
  - Paid ads (Google, Facebook) si budget
- Monitor : métriques d'adoption (guilds added/day, active users)
- Itérer : feedback users, fix bugs urgents

### Continu : Croissance & Maintenance

#### 11.8 Metrics & KPIs
- Suivre :
  - Guilds actifs : total, nouveaux/jour, churn
  - Users actifs : DAU, MAU
  - Premium conversion rate
  - MRR (Monthly Recurring Revenue)
  - NPS (Net Promoter Score)
- Analytics : dashboard business (Metabase, Grafana)
- Goals : définir OKRs trimestriels

#### 11.9 Feature Requests & Roadmap
- Collecter feedback : Discord, forms, tickets
- Prioritiser : impact vs effort matrix
- Roadmap publique : Trello ou GitHub Projects
- Release cycle : sprints 2 semaines
- Communicate : changelog, blog posts

#### 11.10 Scaling Operations
- Monitoring : anticiper scaling needs
- Auto-scaling : si Kubernetes, HPA (Horizontal Pod Autoscaler)
- Database : vertical scaling puis read replicas
- Bot sharding : activer quand > 2000 guilds
- Backend : add instances quand CPU > 70%
- Costs optimization : analyser et réduire waste

---

## 📊 Récapitulatif Timeline

| Phase | Durée | Objectif Principal |
|-------|-------|-------------------|
| **Phase 0** | 2-3 semaines | Infrastructure scalable (TimescaleDB, sharding, monitoring) |
| **Phase 1** | 3-4 semaines | Statistiques avancées (serveur + membres) |
| **Phase 2** | 2 semaines | Sync & data management (config, permissions) |
| **Phase 3** | 2-3 semaines | Gestion membres & rôles |
| **Phase 4** | 2 semaines | Modération (logs, warnings, automod) |
| **Phase 5** | 1 semaine | Gestion channels & permissions |
| **Phase 6** | 2 semaines | Système tickets complet |
| **Phase 7** | 2-3 semaines | Automatisations visuelles |
| **Phase 8** | 2 semaines | Billing & premium (Stripe) |
| **Phase 9** | 2-3 semaines | Features avancées (welcome, commands, leveling) |
| **Phase 10** | 2 semaines | Polish & production ready |
| **Phase 11** | 2-3 semaines | Launch & croissance |

**TOTAL : ~6-8 mois** pour MVP production-ready avec toutes les features principales

---

## 🎯 Priorités Initiales (Recommandation)

Pour un lancement rapide avec impact maximal :

### MVP Minimal (3-4 mois)
1. **Phase 0** : Infrastructure (CRITIQUE)
2. **Phase 1** : Stats (DIFFÉRENCIATEUR)
3. **Phase 2** : Sync & permissions (NÉCESSAIRE)
4. **Phase 3** : Members management (CORE)
5. **Phase 4** : Modération basique (CORE)
6. **Phase 8** : Billing simple (MONÉTISATION)
7. **Phase 10** : Polish & launch (QUALITÉ)

### Features Phase 2 (après MVP)
- Phase 5 : Channels management
- Phase 6 : Tickets
- Phase 7 : Automations
- Phase 9 : Features avancées

**Stratégie** : Lancer avec stats exceptionnelles + modération solide + UX supérieure = différenciation immédiate. Ajouter features progressivement selon feedback users.

---

## 🔑 Points Critiques de Succès

### Architecture
- ✅ Scalable dès le début (sharding, jobs, cache)
- ✅ Monitoring complet (métriques, logs, alertes)
- ✅ Performance targets respectés (< 200ms p95)

### Produit
- ✅ UX intuitive et moderne (Sakai design system)
- ✅ Stats riches et exploitables (avantage concurrentiel)
- ✅ Modération efficace (automod + outils manuels)
- ✅ Freemium équilibré (valeur gratuite + incentive premium)

### Business
- ✅ Growth metrics suivis (guilds, users, MRR)
- ✅ Support réactif (community Discord, docs)
- ✅ Iterate rapidement sur feedback

### Technique
- ✅ Code quality (tests, reviews, linting)
- ✅ Security (audits, updates)
- ✅ Reliability (uptime > 99.5%)

---

## 📝 Notes Finales

**Cette roadmap est évolutive** : ajuster selon feedback, ressources, et opportunités. Les phases peuvent se chevaucher si équipe multiple.

**Principe clé** : **Done is better than perfect**. Lancer MVP rapidement, itérer en continu.

**Focus différenciateur** : Stats avancées + UX supérieure + Tout-en-un simplifié = valeur unique vs concurrents.
