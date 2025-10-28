# 🚀 GUILD ONBOARDING - MASTER DOCUMENT

> **Document de référence pour l'implémentation du système d'ajout de bot et d'onboarding**  
> **Version:** 1.0  
> **Dernière mise à jour:** 28 Octobre 2025  
> **Status:** DESIGN PHASE - Prêt pour implémentation

---

## 📍 CONTEXTE DU PROJET

### Application Discord Admin
- **Stack:** Angular 20 + NestJS + SapphireJS + PostgreSQL + Redis
- **Architecture:** Monorepo avec 4 apps (Frontend, Backend, Gateway, Bot) + shared types
- **Objectif:** Application d'administration/modération de serveurs Discord
- **Scale target:** Dizaines de milliers de serveurs

### Frontend
- **Framework:** Angular 20
- **UI Kit:** PrimeNG + Sakai template + TailwindCSS
- **Pattern:** Facades (facade, api, data)
- **Responsive:** Mobile-first
- **Template:** Inline dans component .ts

### Backend
- **Framework:** NestJS
- **Database:** PostgreSQL + Prisma ORM
- **Cache:** Redis
- **Auth:** Discord OAuth 2.0 + JWT
- **API:** REST + WebSocket (via Gateway)

### Bot
- **Framework:** SapphireJS (Discord.js)
- **Communication:** WebSocket via Gateway
- **Event batching:** Système avec backup SQLite
- **Listeners:** Capture tous les events Discord

### Gateway
- **Framework:** NestJS
- **Rôle:** Hub WebSocket Backend ↔ Bot
- **Scalabilité:** Multi-instances ready

---

## 🎯 OBJECTIF DE CETTE PHASE

**Implémenter le flow complet d'ajout du bot sur un serveur Discord**

### User Journey Cible
```
1. User se connecte sur l'app
2. User voit ses serveurs Discord divisés en 3 catégories:
   - ✅ Actifs (bot présent)
   - 💤 Inactifs (bot était là, plus maintenant)
   - ➕ Non configurés (bot jamais ajouté)
3. User clique sur serveur "Non configuré"
4. Génération lien OAuth Discord avec guild_id pré-rempli
5. User autorise le bot sur Discord
6. Bot rejoint serveur → Event GUILD_CREATE
7. Backend setup automatique (Guild, GuildSettings, init data)
8. Frontend détecte setup terminé
9. Redirect automatique vers dashboard du serveur
```

### Durée cible
- Setup technique: **10-30 secondes max**
- Expérience utilisateur fluide et rassurante

---

## 📐 DÉCISIONS D'ARCHITECTURE

### 1. Stratégie de Backfill (Messages Historiques)

**❌ PAS de backfill automatique au setup initial**

**Raisons:**
- Rate limit Discord (1 req/s recommandé)
- Gros serveurs = plusieurs heures de traitement
- Risque timeout et mauvaise UX
- Coût API élevé

**✅ Stratégie adoptée:**

```
┌─────────────────────────────────────────────┐
│ Setup Immédiat (10-30 sec)                  │
│  → Guild + GuildSettings créés              │
│  → Snapshot structure (channels, roles)     │
│  → Stats temps réel commencent              │
│  → Dashboard accessible immédiatement       │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ Backfill Léger Optionnel (2-5 min)         │
│  → Proposition: "Importer 7 derniers jours?"│
│  → Top 10 channels actifs seulement         │
│  → Max 1000 messages/channel                │
│  → Progress bar visible, skippable          │
│  → [Feature FREE]                           │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ Backfill Complet (Background)              │
│  → Historique 30/60/90 jours                │
│  → Tous les channels                        │
│  → Notification quand terminé               │
│  → [Feature PREMIUM] 💎                     │
└─────────────────────────────────────────────┘
```

**Argument conversion premium:**
- Free: Stats temps réel + snapshot 7j
- Premium: Historique complet + analytics avancées

---

### 2. Flow d'Onboarding UX

**Objectif:** Maximiser taux de conversion vers premium

```
┌──────────────────────────────────────────────┐
│ ÉTAPE 1: Sélection serveur (5 sec)          │
│  → Liste serveurs avec statut               │
│  → CTA clair "Configurer [Nom Serveur]"    │
└──────────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────────┐
│ ÉTAPE 2: OAuth Discord (10 sec)             │
│  → Permissions pré-cochées                   │
│  → Guild pré-sélectionnée                   │
│  → User clique "Autoriser"                  │
└──────────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────────┐
│ ÉTAPE 3: Setup automatique (10-30 sec)      │
│  → Progress indicator                        │
│  → Messages rassurants                       │
│  → "Analyse du serveur..."                  │
│  → "Configuration des permissions..."       │
│  → "Initialisation des statistiques..."     │
└──────────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────────┐
│ ÉTAPE 4: Quick Start Wizard (30 sec)        │
│  → 2-3 questions simples                    │
│  → "Activer stats membres?"                 │
│  → "Activer tracking invites?"              │
│  → "Canal logs modération?" (dropdown)      │
│  → [Skip] disponible                        │
└──────────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────────┐
│ ÉTAPE 5: Dashboard avec Premium Teaser      │
│                                              │
│  🎉 Serveur configuré avec succès!          │
│  📊 Stats temps réel activées               │
│                                              │
│  ┌──────────────────────────────┐           │
│  │ 💎 Débloquez Plus             │           │
│  │ ✓ Historique 90 jours         │           │
│  │ ✓ Analytics avancées          │           │
│  │ ✓ Alertes intelligentes       │           │
│  │ ✓ Export PDF/CSV              │           │
│  │ [Essai gratuit 14j] [4.99€/m] │           │
│  └──────────────────────────────┘           │
└──────────────────────────────────────────────┘
```

**Taux de conversion attendu:** 5-8% (vs 2-3% sans onboarding)

---

### 3. Gestion d'Erreurs

**Architecture multi-niveaux**

#### Status du Setup
```typescript
enum GuildSetupStatus {
  PENDING = 'pending',           // En attente bot
  INITIALIZING = 'initializing', // Setup en cours
  READY = 'ready',               // ✅ Tout bon
  ERROR = 'error',               // ❌ Erreur bloquante
  PARTIAL = 'partial'            // ⚠️ Erreur non-bloquante
}
```

#### Erreurs Typées
```typescript
interface SetupError {
  code: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;              // User-facing
  resolution: string;           // Action suggérée
  canRetry: boolean;
  technicalDetails?: string;    // Pour logs
}
```

#### Catalogue d'Erreurs

**MISSING_PERMISSIONS**
- Severity: `critical`
- Message: "Le bot manque de permissions essentielles"
- Resolution: "Réinvitez le bot avec toutes les permissions"
- Retry: `true`

**BOT_NOT_DETECTED**
- Severity: `critical`
- Message: "Bot non détecté après 30 secondes"
- Resolution: "Vérifiez que le bot est en ligne"
- Retry: `true`

**PARTIAL_CHANNEL_ACCESS**
- Severity: `warning`
- Message: "3 channels sur 50 inaccessibles"
- Resolution: "Le bot fonctionne, mais certains salons sont bloqués"
- Retry: `false`

**RATE_LIMITED**
- Severity: `info`
- Message: "Limitation API Discord détectée"
- Resolution: "Setup prendra 2-3 minutes supplémentaires"
- Retry: `false`

#### Timeouts et Retry

**Setup Timeout:** 30 secondes max
- Après 30s sans réponse → Erreur `BOT_NOT_DETECTED`
- Option "Réessayer" disponible

**Retry Automatique:**
- 3 tentatives avec exponential backoff (1s, 3s, 10s)
- Si échec après 3 essais → Montrer erreur à l'user
- Option manuelle "Réessayer maintenant" toujours présente

---

### 4. Réactivation Bot (isActive: false → true)

**Cas d'usage:** Bot était sur le serveur, a été retiré, puis réinvité

#### Flow Backend
```typescript
async handleBotRejoined(guildId: string) {
  const guild = await prisma.guild.findUnique({
    where: { guildId },
    include: { settings: true }
  });
  
  if (!guild) {
    // Nouveau serveur
    return this.setupNewGuild(guildId);
  }
  
  // Réactivation
  if (!guild.isActive) {
    await prisma.guild.update({
      where: { guildId },
      data: {
        isActive: true,
        botRemovedAt: null,
        updatedAt: new Date()
      }
    });
    
    // Décider si re-setup complet ou sync rapide
    const daysSinceLeft = differenceInDays(
      new Date(), 
      guild.botRemovedAt
    );
    
    if (daysSinceLeft > 90) {
      // Trop ancien, refresh complet
      await this.refreshGuildData(guildId);
    } else {
      // Récent, quick sync
      await this.quickSync(guildId);
    }
    
    // Notifier frontend si user connecté
    this.notifyGuildReactivated(guildId);
  }
}
```

#### Flow Frontend
- Badge "Réactiver" sur cartes inactives
- Clic → Génère nouveau lien OAuth
- Polling pour détecter quand bot rejoint
- Auto-redirect vers dashboard une fois détecté

---

## 🗄️ SCHÉMA DATABASE

### Modifications Prisma Schema

#### Table `Guild` (existante, modifiée)
```prisma
model Guild {
  id             String   @id @default(cuid())
  guildId        String   @unique @map("discord_guild_id")
  name           String
  icon           String?
  ownerDiscordId String   @map("owner_discord_id")
  
  // Status
  botAddedAt     DateTime @default(now()) @map("bot_added_at")
  botRemovedAt   DateTime? @map("bot_removed_at")
  isActive       Boolean  @default(true) @map("is_active")
  
  // Relation
  settings       GuildSettings?
  
  // Métadonnées
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@map("guilds")
}
```

#### Table `GuildSettings` (nouvelle)
```prisma
model GuildSettings {
  id                    String   @id @default(cuid())
  guildId               String   @unique @map("guild_id")
  
  // ═══════════════════════════════════════
  // INITIALISATION
  // ═══════════════════════════════════════
  initializationStatus  String   @default("pending") @map("initialization_status")
  // Values: "pending" | "initializing" | "ready" | "error" | "partial"
  
  initializationError   String?  @map("initialization_error")
  initializedAt         DateTime? @map("initialized_at")
  
  // ═══════════════════════════════════════
  // MODULES ACTIVÉS
  // ═══════════════════════════════════════
  moduleStats           Boolean  @default(true) @map("module_stats")
  moduleModeration      Boolean  @default(false) @map("module_moderation")
  moduleInvites         Boolean  @default(true) @map("module_invites")
  moduleAutomod         Boolean  @default(false) @map("module_automod")
  moduleWelcome         Boolean  @default(false) @map("module_welcome")
  
  // ═══════════════════════════════════════
  // CONFIGURATION STATS
  // ═══════════════════════════════════════
  statsBackfillDays     Int      @default(0) @map("stats_backfill_days")
  // 0 = pas de backfill, 7 = optionnel free, 30/60/90 = premium
  
  statsBackfillStatus   String   @default("none") @map("stats_backfill_status")
  // Values: "none" | "requested" | "in_progress" | "completed" | "failed"
  
  statsBackfillProgress Int      @default(0) @map("stats_backfill_progress")
  // Pourcentage 0-100
  
  statsRetentionDays    Int      @default(90) @map("stats_retention_days")
  statsBackfilledAt     DateTime? @map("stats_backfilled_at")
  
  // ═══════════════════════════════════════
  // CONFIGURATION MODÉRATION
  // ═══════════════════════════════════════
  modLogChannelId       String?  @map("mod_log_channel_id")
  autoModLevel          String   @default("medium") @map("automod_level")
  // Values: "off" | "low" | "medium" | "high"
  
  // ═══════════════════════════════════════
  // CONFIGURATION INVITES
  // ═══════════════════════════════════════
  trackInvites          Boolean  @default(true) @map("track_invites")
  inviteAnalytics       Boolean  @default(true) @map("invite_analytics")
  
  // ═══════════════════════════════════════
  // LOCALE & TIMEZONE
  // ═══════════════════════════════════════
  locale                String   @default("en") @map("locale")
  timezone              String   @default("UTC") @map("timezone")
  
  // ═══════════════════════════════════════
  // PERMISSIONS (Role IDs)
  // ═══════════════════════════════════════
  adminRoleIds          String[] @default([]) @map("admin_role_ids")
  modRoleIds            String[] @default([]) @map("mod_role_ids")
  
  // ═══════════════════════════════════════
  // MÉTADONNÉES
  // ═══════════════════════════════════════
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")
  
  // Relation
  guild                 Guild    @relation(fields: [guildId], references: [guildId], onDelete: Cascade)
  
  @@map("guild_settings")
}
```

**Pourquoi cette structure?**
- `initializationStatus`: Tracking précis du setup
- Modules toggleables: Activer features progressivement
- Config centralisée: Évite dispersion dans plusieurs tables
- Évolutif: Facile d'ajouter nouveaux modules
- Séparation concerns: Guild = identité, Settings = configuration

---

## 🔄 FLOW TECHNIQUE COMPLET

### Séquence Diagram

```
USER          FRONTEND              BACKEND              BOT              DISCORD
 |               |                     |                  |                  |
 |--Login OAuth->|                     |                  |                  |
 |               |--Fetch guilds------>|                  |                  |
 |               |<-Guild list---------|                  |                  |
 |               |  (avec status)      |                  |                  |
 |               |                     |                  |                  |
 |--Select       |                     |                  |                  |
 | "not added"-->|                     |                  |                  |
 |               |                     |                  |                  |
 |               |--Generate OAuth---->|                  |                  |
 |               |   URL               |                  |                  |
 |               |<-OAuth URL----------|                  |                  |
 |               |                     |                  |                  |
 |--Click OAuth->|                     |                  |                  |
 | link          |                     |                  |                  |
 |               |                     |                  |                  |
 |--------------Redirect to Discord----------------------------------->|
 |                                                                     |
 |<-Discord authorization page----------------------------------------|
 |                                                                     |
 |--Authorize bot---------------------------------------------------->|
 |                                                                     |
 |                                     |<--Bot joins------------------|
 |                                     |   guild                      |
 |                                     |                              |
 |                                     |<--GUILD_CREATE event---------|
 |                               <--Event via Gateway--|              |
 |                                     |                              |
 |                                     |--Process setup               |
 |                                     |  · Create Guild              |
 |                                     |  · Create GuildSettings      |
 |                                     |  · Fetch channels            |
 |                                     |  · Fetch roles               |
 |                                     |  · Fetch members (sample)    |
 |                                     |  · Check permissions         |
 |                                     |                              |
 |               |<--Poll status-------|<--Status update              |
 |               | (every 2 sec)       |                              |
 |               |                     |                              |
 |               |<--"initializing"----|                              |
 |               |<--"initializing"----|                              |
 |               |<--"ready"-----------|                              |
 |               |                     |                              |
 |<--Redirect to dashboard-------------|                              |
```

---

## 📝 CHECKLIST IMPLÉMENTATION

### Phase 1: Backend Setup (2-3 jours)

#### 1.1 Database Migration
- [x] Ajouter `botRemovedAt` à `Guild`
- [x] Créer table `GuildSettings` complète
- [x] Créer migration Prisma
- [x] Tester migration sur DB de dev
- [x] Seed data pour tests

#### 1.2 DTOs & Interfaces
**Fichier:** `packages/shared-types/src/guild/`
- [x] `GuildSetupStatusDto` (status enum + error)
- [x] `GuildSettingsDto` (full settings)
- [x] `SetupProgressDto` (pour polling)
- [x] `QuickStartAnswersDto` (wizard data)

#### 1.3 Backend Services
**Fichier:** `apps/backend/src/modules/guild-setup/`
- [x] `GuildSetupService`
  - [x] `initializeGuild(guildId)` → Setup initial
  - [x] `checkSetupStatus(guildId)` → Pour polling
  - [x] `validatePermissions(guildId)` → Vérif perms
  - [x] `quickSync(guildId)` → Sync léger (réactivation)
  - [x] `refreshGuildData(guildId)` → Sync complet

- [x] `GuildSettingsService`
  - [x] `create(guildId, defaults)` → Settings par défaut
  - [x] `update(guildId, data)` → MAJ settings
  - [x] `get(guildId)` → Récup settings
  - [x] `applyQuickStartAnswers(guildId, answers)` → Apply wizard

#### 1.4 Backend Controllers
**Fichier:** `apps/backend/src/modules/guild-setup/`
- [x] `POST /api/guilds/:guildId/setup/initialize` → Trigger setup
- [x] `GET /api/guilds/:guildId/setup/status` → Polling endpoint
- [x] `POST /api/guilds/:guildId/setup/quick-start` → Save wizard
- [x] `GET /api/guilds/:guildId/invite-url` → Generate OAuth link

#### 1.5 Bot Event Handler
**Fichier:** `apps/bot/src/listeners/guild/`
- [x] Listener `GUILD_CREATE`
  - [x] Check si nouvelle guild ou réactivation
  - [x] Fetch guild data complet (channels, roles, members)
  - [x] Envoyer event via Gateway
  - [x] Gérer erreurs (permissions, rate limit)

#### 1.6 Backend Event Handler
**Fichier:** `apps/backend/src/modules/gateway/`
- [x] Handler event `GUILD_CREATE` du bot
  - [x] Router vers `GuildSetupService`
  - [x] Gérer timeouts (30s max)
  - [x] Retry logic (3 attempts)
  - [x] Emit status updates (WebSocket)

---

### Phase 2: Frontend (2-3 jours)

#### 2.1 Services
**Fichier:** `apps/sakai/src/app/services/guild-setup/`
- [x] `GuildSetupFacadeService`
  - [x] `startSetup(guildId)` → Trigger + polling
  - [x] `pollStatus(guildId)` → Check every 2s
  - [x] `submitQuickStart(guildId, answers)` → Save wizard
  - [x] Signals: `setupStatus$`, `error$`, `progress$`

- [x] `GuildSetupApiService`
  - [x] API calls vers endpoints backend

#### 2.2 Components

**ServerList Component** (déjà existe, à modifier)
**Fichier:** `apps/sakai/src/app/features/server-list/`
- [x] Ajouter badge "Configurer" sur guilds not added
- [x] Handler clic → Open setup modal
- [x] Générer OAuth URL avec guild_id

**GuildSetupModal Component** (nouveau)
**Fichier:** `apps/sakai/src/app/features/guild-setup/`
- [x] Modal PrimeNG `p-dialog`
- [x] Étapes:
  - [x] Loading state (spinner + messages)
  - [x] Error state (message + retry button)
  - [x] Partial state (warnings + continue anyway)
  - [x] Success state (auto-close + redirect)
- [x] Polling automatique status
- [x] Timeouts (30s → show error)

**QuickStartWizard Component** (nouveau)
**Fichier:** `apps/sakai/src/app/features/guild-setup/`
- [x] Wizard PrimeNG `p-steps`
- [x] 2-3 questions simples:
  - [x] Toggle: Activer stats?
  - [x] Toggle: Tracker invites?
  - [x] Dropdown: Canal logs? (liste channels)
- [x] Skip button
- [x] Submit → Save settings

#### 2.3 Routing & Guards
- [ ] Route `/guild-setup/:guildId` → Setup flow
- [ ] Guard `GuildSetupGuard` → Vérifier status avant dashboard
- [ ] Redirect auto vers dashboard si `status === 'ready'`

---

### Phase 3: Quick Start Wizard (1-2 jours)

#### 3.1 UI/UX
- [ ] Design wizard (2-3 étapes max)
- [ ] Questions claires et concises
- [ ] Preview des choix
- [ ] Skippable (valeurs par défaut)

#### 3.2 Questions Suggérées
1. **Stats membres**
   - Toggle ON/OFF
   - Tooltip: "Suivre activité, messages, vocal"

2. **Tracking invitations**
   - Toggle ON/OFF
   - Tooltip: "Savoir qui invite des membres"

3. **Canal de logs**
   - Dropdown channels
   - Option "Créer nouveau channel"
   - Tooltip: "Où envoyer les logs de modération"

#### 3.3 Premium Teaser
- [ ] Bandeau en bas du wizard
- [ ] "✨ Avec Premium: Historique 90j, Analytics avancées"
- [ ] Lien vers pricing (ouvre modal)

---

### Phase 4: Premium Onboarding (1 jour)

#### 4.1 Dashboard First Load
- [ ] Banner "🎉 Serveur configuré!"
- [ ] Card Premium teaser:
  - [ ] Liste benefits clairs
  - [ ] Bouton "Essai gratuit 14j"
  - [ ] Bouton secondaire "En savoir plus"
- [ ] Dismissible (cookie: ne plus afficher)

#### 4.2 Empty States Intelligent
- [ ] Dashboard avec sections "Coming soon" si pas de data
- [ ] Graphs vides avec message "Stats disponibles sous 24h"
- [ ] Call-to-action "Importer historique" (premium)

---

### Phase 5: Gestion Erreurs UX (1 jour)

#### 5.1 Messages d'Erreur
- [ ] Design error cards (icon + message + CTA)
- [ ] Copier technique: UserFacing ET technique
- [ ] Boutons d'action clairs:
  - [ ] "Réessayer"
  - [ ] "Contacter support"
  - [ ] "Voir documentation"

#### 5.2 Timeout Handling
- [ ] Après 30s: "Le bot met plus de temps que prévu"
- [ ] Option "Continuer d'attendre" ou "Annuler"
- [ ] Logs backend pour debug

#### 5.3 Partial Setup
- [ ] Warning card: "3 channels inaccessibles"
- [ ] Liste détaillée des problèmes
- [ ] CTA: "Continuer quand même" (accès dashboard)
- [ ] CTA secondaire: "Corriger maintenant" (guide perms)

---

### Phase 6: Réactivation Bot (1 jour)

#### 6.1 Backend
- [ ] Détecter réactivation dans event handler
- [ ] Update `isActive = true`
- [ ] Clear `botRemovedAt`
- [ ] Décider sync (quick vs full) selon durée absence

#### 6.2 Frontend
- [ ] Badge "Réactiver" sur cards inactives
- [ ] Clic → Generate nouveau OAuth URL
- [ ] Polling pour détecter rejoin
- [ ] Notification "Bot réactivé!" + redirect

---

### Phase 7: Testing (2 jours)

#### 7.1 Tests Unitaires
- [ ] Backend services (setup, settings)
- [ ] Frontend services (facades, api)
- [ ] Bot event handlers

#### 7.2 Tests E2E
- [ ] Flow complet: add bot → setup → dashboard
- [ ] Flow réactivation
- [ ] Gestion erreurs (timeout, perms manquantes)
- [ ] Quick start wizard

#### 7.3 Tests Manuels
- [ ] Serveur vide (0 membres)
- [ ] Gros serveur (1000+ membres)
- [ ] Serveur avec perms limitées
- [ ] Bot offline pendant setup

---

### Phase 8: Monitoring & Logs (1 jour)

#### 8.1 Métriques
- [ ] Nombre de setups réussis/échoués
- [ ] Temps moyen de setup
- [ ] Taux d'erreur par type
- [ ] Taux de skip wizard
- [ ] Conversion vers premium (après X jours)

#### 8.2 Logs
- [ ] Logger chaque étape du setup
- [ ] Logger erreurs avec context (guildId, step, error)
- [ ] Alert si taux d'échec > 10%

#### 8.3 Dashboard Admin
- [ ] Vue temps réel des setups en cours
- [ ] Historique setups (succès/échecs)
- [ ] Drill-down par guild

---

## 🚨 POINTS D'ATTENTION

### Sécurité
- ✅ Valider `guildId` (user a bien accès à cette guild)
- ✅ Rate limiting sur endpoints setup (éviter spam)
- ✅ Vérifier bot a bien rejoint avant considérer succès

### Performance
- ✅ Timeout setup: 30s max
- ✅ Polling frontend: max 15 tentatives (30s)
- ✅ Batch fetches Discord (channels, roles en 1 call si possible)

### UX
- ✅ Messages rassurants pendant loading
- ✅ Pas de jargon technique dans erreurs
- ✅ Toujours offrir action de récupération

### Scalabilité
- ✅ Queue system pour setups (BullMQ) si >100 setups/min
- ✅ Cache Redis pour OAuth URLs (TTL 5min)
- ✅ Debounce polling frontend (éviter spam)

---

## 📊 MÉTRIQUES DE SUCCÈS

### Performance
- ⏱️ Setup technique: < 30 secondes (p95)
- ⏱️ Dashboard accessible: < 10 secondes
- ✅ Taux de succès: > 95%

### UX
- ✅ Taux de complétion wizard: > 60%
- ✅ Taux de skip wizard: < 40%
- ⏱️ Time to value: < 2 minutes (login → dashboard)

### Business
- 💰 Conversion premium (30j): 5-8%
- 📈 Rétention (7j): > 70%
- 📈 Guilds actives (30j): > 80%

---

## 🔗 RESSOURCES

### Documentation Externe
- [Discord OAuth2](https://discord.com/developers/docs/topics/oauth2)
- [Discord Bot Permissions](https://discord.com/developers/docs/topics/permissions)
- [Discord API Rate Limits](https://discord.com/developers/docs/topics/rate-limits)

### Documentation Interne
- `README.md` - Overview projet
- `docs/roadmaps/COMPLETE_ROADMAP.md` - Roadmap complète
- `apps/backend/prisma/schema.prisma` - Schéma DB
- `packages/shared-types/` - DTOs partagés

### Outils
- Prisma Studio: `npx prisma studio`
- Discord Developer Portal: https://discord.com/developers/applications
- Postman Collection: (à créer pour tester endpoints)

---

## 📞 SUPPORT & QUESTIONS

### En cas de blocage
1. Vérifier les logs backend (`apps/backend/logs/`)
2. Vérifier les logs bot (`apps/bot/logs/`)
3. Tester endpoint manuellement (Postman)
4. Consulter Discord API status: https://discordstatus.com

### Questions d'architecture
- Créer issue GitHub avec label `architecture`
- Discuter sur Discord équipe dev

---

## 🎯 PROCHAINES ÉTAPES APRÈS CETTE PHASE

### Court terme (Sprint suivant)
1. **Backfill léger optionnel** (7 jours)
   - Feature free avec progress bar
   - Limité aux top channels

2. **Premium onboarding amélioré**
   - Email drip campaign (J+1, J+3, J+7)
   - In-app messaging ciblé
   - A/B testing CTAs

### Moyen terme
1. **Backfill complet background** (premium)
   - Job queue avec retry
   - Notification quand terminé
   - Export CSV/PDF

2. **Analytics setup**
   - Tracking events setup (GA4, Mixpanel)
   - Funnel analysis
   - Cohort analysis

---

## ✅ CHECKLIST AVANT DE COMMENCER À CODER

- [ ] Lire ce document en entier
- [ ] Vérifier que DB est à jour (migrations appliquées)
- [ ] Vérifier que bot est en ligne
- [ ] Vérifier que gateway fonctionne
- [ ] Créer branche git: `feature/guild-onboarding`
- [ ] Setup environnement de dev
- [ ] Créer issues GitHub pour chaque phase
- [ ] Estimer temps par phase
- [ ] Communiquer roadmap à l'équipe

---

**🚀 Ready to ship!**

*Document vivant - MAJ après chaque décision d'architecture majeure*

---

**FIN DU MASTER DOCUMENT**