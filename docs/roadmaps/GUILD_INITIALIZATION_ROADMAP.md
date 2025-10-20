# 🚀 Guild Initialization - Roadmap Détaillée

> **Objectif :** Offrir des statistiques réelles dès l'ajout du bot, sans dashboard vide  
> **Durée estimée :** 5-7 jours de développement  
> **Dernière mise à jour :** 20 octobre 2025

---

## 📋 Table des Matières

1. [Phase 0 - Préparation](#phase-0---préparation)
2. [Phase 1 - Setup Immédiat](#phase-1---setup-immédiat)
3. [Phase 2 - Backfill Messages](#phase-2---backfill-messages)
4. [Phase 3 - Finalisation](#phase-3---finalisation)
5. [Phase 4 - Frontend UX](#phase-4---frontend-ux)
6. [Phase 5 - Tests & Polish](#phase-5---tests--polish)

---

## Phase 0 - Préparation

**Durée estimée :** 1 jour

### 0.1 Mise à jour du schéma DB

**Fichier :** `apps/backend/prisma/schema.prisma`

- [ ] **Ajouter champs à `GuildSettings`**
  ```prisma
  model GuildSettings {
    // ... existing fields
    
    // Statut d'initialisation
    initialization_status    String    @default("pending")
    // Values: "pending" | "backfilling" | "active" | "error"
    
    // Tracking du backfill
    stats_backfilled         Boolean   @default(false)
    stats_backfill_date      DateTime?
    stats_backfill_period    String?   // "7d", "30d", "90d"
    stats_backfill_messages  Int       @default(0)
    stats_backfill_channels  Int       @default(0)
    
    // Métadonnées
    backfill_started_at      DateTime?
    backfill_completed_at    DateTime?
    backfill_error           String?
  }
  ```

- [ ] **Ajouter champs à `MemberStats`**
  ```prisma
  model MemberStats {
    // ... existing fields
    
    // Tracking backfill
    backfill_complete        Boolean   @default(false)
    backfill_messages_count  Int       @default(0)
  }
  ```

- [ ] **Créer migration**
  ```bash
  npx prisma migrate dev --name add_guild_initialization_tracking
  ```

- [ ] **Appliquer migration**
  ```bash
  npx prisma migrate deploy
  ```

### 0.2 Création des DTOs

**Fichier :** `packages/shared-types/src/events/backfill.dto.ts`

- [ ] **Créer `HistoricalBackfillDto`**
  ```typescript
  export interface HistoricalBackfillDto {
    type: 'messages' | 'voice' | 'reactions';
    guildId: string;
    periodStart: number;  // timestamp
    periodEnd: number;
    
    // Compteurs par membre
    memberCounts: Record<string, {
      messages?: number;
      reactions?: number;
      voiceMinutes?: number;
    }>;
    
    // Métadonnées
    channelsProcessed: number;
    totalItems: number;
    isComplete: boolean;
  }
  ```

- [ ] **Créer `BackfillProgressDto`**
  ```typescript
  export interface BackfillProgressDto {
    guildId: string;
    status: 'running' | 'completed' | 'error';
    progress: {
      current: number;
      total: number;
      percentage: number;
    };
    channelsProgress: Array<{
      channelId: string;
      channelName: string;
      messagesProcessed: number;
      isComplete: boolean;
    }>;
    startedAt: number;
    estimatedTimeRemaining?: number;
  }
  ```

- [ ] **Ajouter les types à l'enum `EventType`**
  ```typescript
  export enum EventType {
    // ... existing
    HISTORICAL_BACKFILL = 'HISTORICAL_BACKFILL',
    BACKFILL_PROGRESS = 'BACKFILL_PROGRESS',
  }
  ```

### 0.3 Configuration BullMQ

**Fichier :** `apps/backend/src/modules/queue/queue.module.ts`

- [ ] **Ajouter queue `guild-initialization`**
  ```typescript
  BullModule.registerQueue({
    name: 'guild-initialization',
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  })
  ```

---

## Phase 1 - Setup Immédiat

**Durée estimée :** 1.5 jours

### 1.1 Backend - GuildInitializationService

**Fichier :** `apps/backend/src/modules/guilds/services/guild-initialization.service.ts`

- [ ] **Créer le service**
  ```typescript
  @Injectable()
  export class GuildInitializationService {
    constructor(
      private prisma: PrismaService,
      @InjectQueue('guild-initialization') private queue: Queue,
    ) {}
  }
  ```

- [ ] **Méthode `initializeGuild()`**
  ```typescript
  async initializeGuild(guildData: GuildCreateEventData): Promise<void>
  ```
  - Créer/Update `GuildSettings` avec status "pending"
  - Retourner immédiatement (ne pas bloquer)

- [ ] **Méthode `registerMembers()`**
  ```typescript
  async registerMembers(guildId: string, members: Array<MemberData>): Promise<void>
  ```
  - Batch upsert des `MemberStats` (tous à 0)
  - Utiliser `prisma.memberStats.createMany()` pour performance
  - Skip les bots

- [ ] **Méthode `startBackfillJob()`**
  ```typescript
  async startBackfillJob(guildId: string): Promise<void>
  ```
  - Ajouter job à la queue `guild-initialization`
  - Update status guild à "backfilling"

### 1.2 Bot - Listener guildCreate

**Fichier :** `apps/bot/src/listeners/guildCreate.ts`

- [ ] **Créer le listener**
  ```typescript
  export class GuildCreateListener extends Listener {
    event = 'guildCreate';
  }
  ```

- [ ] **Dans `run(guild: Guild)`**
  
  **Étape 1 : Envoyer infos guild au backend**
  - [ ] Créer `GuildCreateEventData`
  - [ ] Emit via Gateway : `guild-setup`
  
  **Étape 2 : Fetch et envoyer tous les membres**
  - [ ] `await guild.members.fetch()`
  - [ ] Filtrer les bots
  - [ ] Créer batch de `MemberData`
  - [ ] Emit via Gateway : `members-bulk-register`
  
  **Étape 3 : Déclencher backfill**
  - [ ] Emit via Gateway : `start-backfill`
  
  **Étape 4 : Notification Discord**
  - [ ] Trouver premier text channel accessible
  - [ ] Envoyer embed "Bot configuré ! Analyse en cours..."
  - [ ] Inclure lien vers dashboard

- [ ] **Gestion d'erreurs**
  - Try/catch global
  - Logger les erreurs
  - Ne pas crasher si échec

### 1.3 Backend - Gateway Handler

**Fichier :** `apps/backend/src/modules/gateway/services/botEventHandler.service.ts`

- [ ] **Handler `guild-setup`**
  ```typescript
  async handleGuildSetup(data: GuildCreateEventData): Promise<void>
  ```
  - Appeler `guildInitializationService.initializeGuild(data)`

- [ ] **Handler `members-bulk-register`**
  ```typescript
  async handleMembersBulkRegister(guildId: string, members: MemberData[]): Promise<void>
  ```
  - Appeler `guildInitializationService.registerMembers(guildId, members)`

- [ ] **Handler `start-backfill`**
  ```typescript
  async handleStartBackfill(guildId: string): Promise<void>
  ```
  - Appeler `guildInitializationService.startBackfillJob(guildId)`

### 1.4 Tests Phase 1

- [ ] **Test unitaire** : `GuildInitializationService.initializeGuild()`
- [ ] **Test unitaire** : `GuildInitializationService.registerMembers()`
- [ ] **Test d'intégration** : Simuler `guildCreate` event
- [ ] **Vérifier DB** : guild créée, membres enregistrés

**Résultat attendu Phase 1 :**
- ✅ Bot rejoint serveur
- ✅ Guild créée en DB (status: "pending")
- ✅ Tous les membres enregistrés (stats à 0)
- ✅ Dashboard accessible mais vide
- ✅ Job de backfill créé dans queue

---

## Phase 2 - Backfill Messages

**Durée estimée :** 2.5 jours

### 2.1 Bot - MessageBackfillService

**Fichier :** `apps/bot/src/services/messageBackfill.service.ts`

- [ ] **Créer le service**
  ```typescript
  export class MessageBackfillService {
    private readonly BATCH_SIZE = 100;
    private readonly DELAY_BETWEEN_BATCHES = 1000; // 1s
    private readonly MAX_MESSAGES_PER_CHANNEL = 10000;
    private readonly MAX_HISTORY_DAYS = 30;
  }
  ```

- [ ] **Méthode `backfillGuild(guildId: string)`**
  - Récupérer la guild
  - Identifier channels texte actifs
  - Pour chaque channel, appeler `backfillChannel()`
  - Gérer rate limits
  - Retourner résumé

- [ ] **Méthode `identifyActiveChannels(guild: Guild)`**
  ```typescript
  async identifyActiveChannels(guild: Guild): Promise<TextChannel[]>
  ```
  - Filtrer channels texte
  - Pour chaque channel, fetch 1 message
  - Si lastMessage < 30 jours → "actif"
  - Trier par lastMessageTimestamp DESC
  - Retourner liste triée

- [ ] **Méthode `backfillChannel(channel: TextChannel)`**
  ```typescript
  async backfillChannel(channel: TextChannel): Promise<ChannelBackfillResult>
  ```
  
  **Logique :**
  - Initialiser compteurs Map<userId, count>
  - Variable `lastMessageId: string | undefined`
  - While loop :
    - Fetch 100 messages avec `before: lastMessageId`
    - Si 0 messages → break
    - Pour chaque message :
      - Skip si bot
      - Incrémenter compteur membre
      - Check timestamp (stop si > 30 jours)
    - Update `lastMessageId`
    - Attendre 1s (rate limit)
    - Si compteur > MAX_MESSAGES_PER_CHANNEL → break
  
  - Retourner `ChannelBackfillResult`

- [ ] **Méthode `sendIncrementalSnapshot()`**
  ```typescript
  async sendIncrementalSnapshot(
    guildId: string, 
    memberCounts: Map<string, number>,
    channelId: string,
    channelName: string,
    isComplete: boolean
  ): Promise<void>
  ```
  - Créer `HistoricalBackfillDto`
  - Envoyer via `eventBatcher.addEvent()`

- [ ] **Gestion erreurs**
  - Catch permissions errors (50001, 50013)
  - Catch rate limit errors (429)
  - Logger et continuer (ne pas crasher)

### 2.2 Bot - BackfillProgressTracker

**Fichier :** `apps/bot/src/services/backfillProgressTracker.service.ts`

- [ ] **Créer tracker en mémoire**
  ```typescript
  private progressMap = new Map<string, BackfillProgress>();
  ```

- [ ] **Méthode `startTracking(guildId: string)`**
  - Initialiser progress pour la guild

- [ ] **Méthode `updateChannelProgress()`**
  - Mettre à jour progression d'un channel

- [ ] **Méthode `sendProgressUpdate()`**
  - Créer `BackfillProgressDto`
  - Envoyer au backend via Gateway
  - Fréquence : toutes les 10 secondes

- [ ] **Méthode `completeTracking(guildId: string)`**
  - Marquer comme complet
  - Envoyer update final

### 2.3 Backend - BackfillProcessor

**Fichier :** `apps/backend/src/modules/events/processors/backfill.processor.ts`

- [ ] **Créer le processor**
  ```typescript
  @Processor('guild-initialization')
  export class BackfillProcessor {
    @Process('backfill-guild')
    async handleBackfillJob(job: Job): Promise<void>
  }
  ```

- [ ] **Dans `handleBackfillJob()`**
  - Récupérer `guildId` du job
  - Emit vers Bot via Gateway : `start-message-backfill`
  - Bot lance `messageBackfillService.backfillGuild()`
  - Attendre les snapshots incrémentaux

- [ ] **Méthode `processIncrementalSnapshot()`**
  ```typescript
  async processIncrementalSnapshot(data: HistoricalBackfillDto): Promise<void>
  ```
  - Pour chaque membre dans `memberCounts` :
    - `UPDATE member_stats SET total_messages += count`
  - Update `guild_settings.stats_backfill_messages += total`
  - Si `isComplete` : update status guild

- [ ] **Méthode `processProgressUpdate()`**
  ```typescript
  async processProgressUpdate(data: BackfillProgressDto): Promise<void>
  ```
  - Stocker en Redis (cache temporaire)
  - Clé : `backfill:progress:${guildId}`
  - TTL : 1 heure

### 2.4 Backend - BackfillController (API)

**Fichier :** `apps/backend/src/modules/guilds/controllers/backfill.controller.ts`

- [ ] **Endpoint `GET /guilds/:guildId/backfill/status`**
  ```typescript
  @Get(':guildId/backfill/status')
  async getBackfillStatus(@Param('guildId') guildId: string)
  ```
  - Récupérer status depuis `guild_settings`
  - Récupérer progress depuis Redis
  - Retourner JSON

- [ ] **Endpoint `POST /guilds/:guildId/backfill/restart`** (optionnel)
  ```typescript
  @Post(':guildId/backfill/restart')
  async restartBackfill(@Param('guildId') guildId: string)
  ```
  - Reset status guild
  - Créer nouveau job dans queue
  - Retourner confirmation

### 2.5 Tests Phase 2

- [ ] **Test unitaire** : `MessageBackfillService.identifyActiveChannels()`
- [ ] **Test unitaire** : `MessageBackfillService.backfillChannel()`
- [ ] **Test mock** : Simuler pagination avec 300 messages
- [ ] **Test mock** : Simuler rate limit error
- [ ] **Test d'intégration** : Backfill complet sur serveur test
- [ ] **Vérifier DB** : `member_stats.total_messages` mis à jour

**Résultat attendu Phase 2 :**
- ✅ Bot identifie channels actifs
- ✅ Pagination des messages fonctionne
- ✅ Compteurs incrémentaux envoyés au backend
- ✅ `member_stats` rempli avec vraies données
- ✅ Dashboard affiche vraies stats

---

## Phase 3 - Finalisation

**Durée estimée :** 0.5 jour

### 3.1 Backend - FinalizeBackfill

**Fichier :** `apps/backend/src/modules/guilds/services/guild-initialization.service.ts`

- [ ] **Méthode `finalizeBackfill(guildId: string)`**
  ```typescript
  async finalizeBackfill(guildId: string): Promise<BackfillSummary>
  ```
  
  **Actions :**
  - Calculer métriques :
    - Total messages backfilled
    - Nombre membres actifs (messages > 0)
    - Moyenne messages par membre actif
    - Top 20 membres
  
  - Update `guild_settings` :
    ```typescript
    {
      initialization_status: 'active',
      stats_backfilled: true,
      stats_backfill_date: new Date(),
      stats_backfill_period: '30d',
      backfill_completed_at: new Date()
    }
    ```
  
  - Retourner summary

- [ ] **Méthode `calculateMemberMetrics(guildId: string)`**
  - Query `member_stats` pour la guild
  - Calculer moyenne, médiane, percentiles
  - Identifier top performers

### 3.2 Bot - Notification Finale

**Fichier :** `apps/bot/src/services/messageBackfill.service.ts`

- [ ] **Dans `backfillGuild()`, à la fin :**
  - Créer embed récapitulatif
  - Envoyer dans channel initial
  - Inclure :
    - ✅ Analyse terminée
    - 📊 X messages analysés
    - 👥 X membres actifs
    - 📅 Période couverte
    - 🔗 Lien dashboard

### 3.3 Tests Phase 3

- [ ] **Test unitaire** : `calculateMemberMetrics()`
- [ ] **Test d'intégration** : Vérifier notification Discord
- [ ] **Vérifier DB** : Status guild = "active"

**Résultat attendu Phase 3 :**
- ✅ Guild status = "active"
- ✅ Métriques calculées
- ✅ Notification Discord envoyée
- ✅ Dashboard complet et fonctionnel

---

## Phase 4 - Frontend UX

**Durée estimée :** 1.5 jours

### 4.1 Service Frontend

**Fichier :** `apps/frontend/src/app/services/backfill/backfill-api.service.ts`

- [ ] **Créer le service API**
  ```typescript
  @Injectable({ providedIn: 'root' })
  export class BackfillApiService {
    getBackfillStatus(guildId: string): Observable<BackfillStatus>
    restartBackfill(guildId: string): Observable<void>
  }
  ```

**Fichier :** `apps/frontend/src/app/services/backfill/backfill-data.service.ts`

- [ ] **Créer le data service**
  ```typescript
  export class BackfillDataService {
    private statusSubject = new BehaviorSubject<BackfillStatus | null>(null);
    status$ = this.statusSubject.asObservable();
  }
  ```

**Fichier :** `apps/frontend/src/app/services/backfill/backfill-facade.service.ts`

- [ ] **Créer le facade**
  ```typescript
  export class BackfillFacadeService {
    status = toSignal(this.dataService.status$);
    
    loadStatus(guildId: string): Promise<void>
    startPolling(guildId: string): void
    stopPolling(): void
  }
  ```

### 4.2 Components

**Fichier :** `apps/frontend/src/app/features/dashboard/components/initialization-card/initialization-card.component.ts`

- [ ] **Créer le component**
  ```typescript
  @Component({
    selector: 'app-initialization-card',
    template: '...'
  })
  export class InitializationCardComponent {
    @Input() guildId!: string;
    status = this.backfillFacade.status;
  }
  ```

- [ ] **Template pour status "pending"**
  ```html
  <p-card>
    <div class="flex items-center gap-3">
      <i class="pi pi-spin pi-spinner text-2xl"></i>
      <div>
        <h3>⏳ Initialisation en cours...</h3>
        <p>Le bot analyse votre serveur.</p>
        <p>👥 234 membres détectés</p>
      </div>
    </div>
  </p-card>
  ```

- [ ] **Template pour status "backfilling"**
  ```html
  <p-card>
    <h3>🔄 Analyse de l'historique...</h3>
    
    <p-progressBar 
      [value]="status().progress.percentage"
      [showValue]="true">
    </p-progressBar>
    
    <div class="mt-3">
      <p>{{ status().channelsProgress.length }} channels traités</p>
      <p>{{ status().estimatedTimeRemaining }} min restantes</p>
    </div>
    
    <div class="channel-list mt-3">
      @for (channel of status().channelsProgress; track channel.channelId) {
        <div class="flex justify-between">
          <span>#{{ channel.channelName }}</span>
          <span>{{ channel.messagesProcessed }} msg</span>
        </div>
      }
    </div>
  </p-card>
  ```

- [ ] **Template pour status "active"**
  ```html
  <p-card>
    <div class="success-state">
      <i class="pi pi-check-circle text-green-500 text-3xl"></i>
      <h3>✅ Serveur Actif</h3>
      <div class="stats-grid">
        <div>
          <span>📅 Stats depuis</span>
          <strong>{{ formatDate(status().backfillDate) }}</strong>
        </div>
        <div>
          <span>💬 Messages analysés</span>
          <strong>{{ status().totalMessages | number }}</strong>
        </div>
        <div>
          <span>👥 Membres actifs</span>
          <strong>{{ status().activeMembers }}</strong>
        </div>
      </div>
    </div>
  </p-card>
  ```

### 4.3 Intégration Dashboard

**Fichier :** `apps/frontend/src/app/features/dashboard/dashboard.component.ts`

- [ ] **Ajouter `<app-initialization-card>`**
  - Afficher en haut du dashboard
  - Conditionnel selon status
  - Si "active" : card collapsible ou masquée

- [ ] **Skeleton loaders**
  - Pendant status "pending"
  - Sur les cartes stats
  - Sur les charts

- [ ] **Polling automatique**
  - Si status = "backfilling"
  - Poll toutes les 5 secondes
  - Arrêter quand status = "active"

### 4.4 Tests Phase 4

- [ ] **Test composant** : InitializationCardComponent
- [ ] **Test e2e** : Affichage des 3 états
- [ ] **Test polling** : Vérifier updates automatiques

**Résultat attendu Phase 4 :**
- ✅ Dashboard affiche état initialisation
- ✅ Progress bar pendant backfill
- ✅ Skeleton loaders pendant pending
- ✅ Card récapitulative quand terminé

---

## Phase 5 - Tests & Polish

**Durée estimée :** 1 jour

### 5.1 Tests End-to-End

- [ ] **Scenario 1 : Petit serveur (50 membres, 5 channels)**
  - Ajouter bot
  - Vérifier Phase 1 (< 10s)
  - Vérifier Phase 2 (< 2min)
  - Vérifier Phase 3 (notification)
  - Vérifier dashboard final

- [ ] **Scenario 2 : Serveur moyen (500 membres, 20 channels)**
  - Ajouter bot
  - Vérifier backfill (< 10min)
  - Vérifier updates incrémentales
  - Vérifier dashboard

- [ ] **Scenario 3 : Gros serveur (2000 membres, 50 channels)**
  - Ajouter bot
  - Vérifier limites (10k msg/channel)
  - Vérifier temps total (< 30min)

- [ ] **Scenario 4 : Erreur de permissions**
  - Serveur avec channels privés
  - Vérifier que bot skip les channels inaccessibles
  - Vérifier que backfill continue

- [ ] **Scenario 5 : Rate limit**
  - Simuler rate limit Discord
  - Vérifier attente automatique
  - Vérifier reprise

### 5.2 Performance & Optimisations

- [ ] **Profiling du backfill**
  - Mesurer temps par channel
  - Identifier bottlenecks
  - Optimiser si nécessaire

- [ ] **Optimisation DB**
  - Vérifier indexes sur `member_stats`
  - Tester performance des updates incrémentaux
  - Batch upserts si possible

- [ ] **Memory leaks**
  - Vérifier que Maps sont cleared
  - Vérifier que listeners sont removed
  - Profiler mémoire pendant backfill long

### 5.3 Monitoring & Logs

- [ ] **Ajouter métriques Prometheus**
  ```typescript
  backfill_duration_seconds{guild_id}
  backfill_messages_processed_total{guild_id}
  backfill_errors_total{guild_id, error_type}
  ```

- [ ] **Structured logging**
  - Log start backfill
  - Log progress (every 1000 messages)
  - Log completion
  - Log errors avec context

- [ ] **Alertes**
  - Alert si backfill > 1h
  - Alert si erreur rate limit persistante
  - Alert si échec total

### 5.4 Documentation

- [ ] **Documentation utilisateur**
  - Créer `docs/USER_GUIDE.md`
  - Section "Première utilisation"
  - Expliquer le processus d'initialisation
  - FAQ

- [ ] **Documentation technique**
  - Créer `docs/GUILD_INITIALIZATION.md`
  - Architecture du système
  - Flow des données
  - Schémas Mermaid

- [ ] **Commentaires code**
  - Documenter fonctions complexes
  - Ajouter JSDoc sur services publics

### 5.5 Polish UX

- [ ] **Messages d'erreur user-friendly**
  - Si backfill échoue : "Une erreur s'est produite..."
  - Proposer de réessayer
  - Lien vers support

- [ ] **Animations**
  - Transition smooth entre états
  - Progress bar animée
  - Fade-in des stats

- [ ] **Responsive**
  - Tester sur mobile
  - Adapter cards sur petits écrans

- [ ] **Accessibilité**
  - Vérifier contraste
  - Aria labels
  - Keyboard navigation

---

## 📊 Résumé Timeline

| Phase | Durée | Dépendances |
|-------|-------|-------------|
| **Phase 0** - Préparation | 1 jour | - |
| **Phase 1** - Setup Immédiat | 1.5 jours | Phase 0 |
| **Phase 2** - Backfill Messages | 2.5 jours | Phase 1 |
| **Phase 3** - Finalisation | 0.5 jour | Phase 2 |
| **Phase 4** - Frontend UX | 1.5 jours | Phase 3 |
| **Phase 5** - Tests & Polish | 1 jour | Phase 4 |
| **TOTAL** | **8 jours** | - |

---

## ✅ Checklist Finale

Avant de marquer la feature comme terminée :

- [ ] Tous les tests passent (unit + integration + e2e)
- [ ] Documentation complète et à jour
- [ ] Code review effectué et approuvé
- [ ] Pas de console.log oubliés
- [ ] Pas de TODOs critiques restants
- [ ] Performance validée (backfill < 30min pour serveur moyen)
- [ ] Rate limits respectés (aucun ban Discord)
- [ ] Monitoring en place (métriques + logs)
- [ ] Frontend responsive testé
- [ ] Accessibilité validée (WCAG AA)
- [ ] Erreurs gérées gracefully
- [ ] Déployé en staging et testé
- [ ] Migration DB appliquée en prod
- [ ] Annonce aux utilisateurs (changelog)

---

## 🎯 Objectifs de Qualité

### Performance
- ✅ Phase 1 complète en < 10 secondes
- ✅ Backfill serveur 500 membres en < 10 minutes
- ✅ Updates incrémentales toutes les 500 messages
- ✅ Aucun blocage de l'application pendant backfill
- ✅ Rate limits Discord respectés (1 req/s)

### Fiabilité
- ✅ Gestion des permissions manquantes
- ✅ Gestion des rate limits Discord
- ✅ Retry automatique sur erreurs temporaires
- ✅ Application reste fonctionnelle si backfill échoue
- ✅ Pas de memory leaks sur backfills longs

### UX
- ✅ Dashboard accessible dès 10 secondes
- ✅ Progress bar visible pendant backfill
- ✅ Données apparaissent progressivement
- ✅ Messages d'erreur clairs et actionnables
- ✅ Pas de "0" partout au début

---

## 🔧 Configuration Recommandée

### Variables d'Environnement

Ajouter au `.env` du backend :

```env
# Guild Initialization
BACKFILL_MAX_MESSAGES_PER_CHANNEL=10000
BACKFILL_MAX_HISTORY_DAYS=30
BACKFILL_BATCH_SIZE=100
BACKFILL_DELAY_BETWEEN_BATCHES=1000
BACKFILL_MAX_CONCURRENT_GUILDS=3
```

Ajouter au `.env` du bot :

```env
# Guild Initialization
BACKFILL_ENABLED=true
BACKFILL_RATE_LIMIT_DELAY=1000
BACKFILL_MAX_RETRIES=3
```

### Limites Recommandées

```typescript
const LIMITS = {
  // Messages
  MAX_MESSAGES_PER_CHANNEL: 10_000,
  MAX_HISTORY_DAYS: 30,
  BATCH_SIZE: 100,
  
  // Channels
  MAX_CHANNELS_TO_PROCESS: 50,
  SKIP_CHANNELS_OLDER_THAN_DAYS: 90,
  
  // Performance
  DELAY_BETWEEN_BATCHES_MS: 1_000,
  DELAY_BETWEEN_CHANNELS_MS: 2_000,
  INCREMENTAL_UPDATE_EVERY_N_MESSAGES: 500,
  
  // Timeouts
  MAX_BACKFILL_DURATION_MINUTES: 60,
  PROGRESS_UPDATE_INTERVAL_MS: 10_000,
};
```

---

## 📝 Notes de Développement

### Décisions d'Architecture

#### Pourquoi un job asynchrone ?
- ✅ Ne bloque pas l'ajout du bot
- ✅ Peut prendre 10-30 minutes pour gros serveurs
- ✅ Permet retry en cas d'échec
- ✅ Scalable (plusieurs backfills en parallèle)

#### Pourquoi des updates incrémentales ?
- ✅ Dashboard se remplit progressivement
- ✅ Meilleure UX (pas d'attente de 30min)
- ✅ Résilient (données sauvées même si crash)
- ✅ Monitoring en temps réel possible

#### Pourquoi limiter à 30 jours ?
- ✅ Balance entre données utiles et temps de traitement
- ✅ Évite backfills de plusieurs heures
- ✅ Cohérent avec la plupart des use cases
- ✅ Peut être étendu via commande manuelle

#### Pourquoi ne pas stocker les channels ?
- ✅ Évite désynchronisation avec Discord
- ✅ Réduit taille DB
- ✅ Fetch en temps réel = toujours à jour
- ✅ Respecte philosophy du projet

### Pièges à Éviter

#### ❌ Rate Limits Discord
```typescript
// BAD - Requêtes trop rapides
for (const channel of channels) {
  await channel.messages.fetch();
}

// GOOD - Attendre entre chaque requête
for (const channel of channels) {
  await channel.messages.fetch();
  await sleep(1000);
}
```

#### ❌ Memory Leaks
```typescript
// BAD - Map jamais cleared
const counters = new Map<string, number>();
// ... process millions of messages
// Map grossit indéfiniment

// GOOD - Clear après envoi
const counters = new Map<string, number>();
// ... process batch
await sendSnapshot(counters);
counters.clear(); // Important !
```

#### ❌ Bloquer le Thread
```typescript
// BAD - Bloque tout pendant 30 minutes
await backfillService.backfillGuild(guildId);
await sendNotification();

// GOOD - Non-bloquant
await queue.add('backfill-guild', { guildId });
// Continue immédiatement
await sendNotification("Analyse en cours...");
```

#### ❌ Pas de Gestion d'Erreurs
```typescript
// BAD - Crash si permission manquante
const messages = await channel.messages.fetch();

// GOOD - Skip gracefully
try {
  const messages = await channel.messages.fetch();
} catch (error) {
  if (error.code === 50001) {
    logger.warn(`No access to ${channel.name}`);
    return; // Continue avec le suivant
  }
  throw error;
}
```

---

## 🐛 Debug & Troubleshooting

### Problèmes Courants

#### 1. Backfill ne démarre pas

**Symptômes :**
- Status reste "pending"
- Aucun log de backfill
- Queue ne traite pas le job

**Vérifications :**
- [ ] Redis est connecté ?
- [ ] Queue `guild-initialization` est enregistrée ?
- [ ] Worker BullMQ tourne ?
- [ ] Logs backend : erreurs dans le processor ?

**Solution :**
```bash
# Vérifier Redis
docker ps | grep redis

# Vérifier queue
curl http://localhost:3000/admin/queues/guild-initialization

# Relancer worker
npm run start:dev
```

#### 2. Backfill bloqué à X%

**Symptômes :**
- Progress bar bloquée
- Pas d'updates depuis 5+ minutes
- Status = "backfilling"

**Vérifications :**
- [ ] Bot toujours connecté ?
- [ ] Rate limit Discord atteint ?
- [ ] Channel avec 100k+ messages ?

**Solution :**
```typescript
// Ajouter timeout par channel
const result = await Promise.race([
  backfillChannel(channel),
  sleep(300000) // 5 minutes max
]);

if (!result) {
  logger.warn(`Channel ${channel.name} timeout, skipping`);
}
```

#### 3. Stats incorrectes

**Symptômes :**
- Leaderboard avec nombres bizarres
- Total messages != somme des membres
- Membres fantômes avec 0 messages

**Vérifications :**
- [ ] Bots filtrés correctement ?
- [ ] Compteurs bien incrémentés ?
- [ ] Updates SQL bien appliquées ?

**Solution :**
```sql
-- Vérifier cohérence
SELECT 
  SUM(total_messages) as total_from_members,
  (SELECT stats_backfill_messages FROM guild_settings WHERE guild_id = 'XXX')
FROM member_stats 
WHERE guild_id = 'XXX';

-- Recalculer si nécessaire
UPDATE guild_settings 
SET stats_backfill_messages = (
  SELECT SUM(total_messages) 
  FROM member_stats 
  WHERE guild_id = guild_settings.guild_id
)
WHERE guild_id = 'XXX';
```

#### 4. Frontend ne se met pas à jour

**Symptômes :**
- Progress bar ne bouge pas
- Dashboard reste en "pending"
- Pas d'erreur visible

**Vérifications :**
- [ ] Polling activé ?
- [ ] WebSocket connecté ?
- [ ] API endpoint répond ?

**Solution :**
```typescript
// Vérifier polling
console.log('Polling status:', this.pollingInterval);

// Forcer refresh
this.backfillFacade.loadStatus(guildId);

// Vérifier API
curl http://localhost:3000/api/guilds/XXX/backfill/status
```

---

## 🔄 Maintenance & Évolutions

### Futures Améliorations

#### Court terme (1-2 sprints)

- [ ] **Commande `/backfill-refresh`**
  - Relancer backfill manuellement
  - Étendre période (60 jours, 90 jours)
  - Pour les admins seulement

- [ ] **Dashboard admin système**
  - Voir tous les backfills en cours
  - Statistiques globales
  - Identifier serveurs problématiques

- [ ] **Optimisation performance**
  - Paralléliser 2-3 channels simultanément
  - Batch upserts plus gros (500 au lieu de 1)
  - Compression des snapshots envoyés

#### Moyen terme (3-6 mois)

- [ ] **Backfill vocal historique**
  - Impossibe via API Discord
  - Mais : calculer temps moyen par session
  - Estimation rétroactive basée sur présence

- [ ] **Backfill réactions historiques**
  - Parcourir messages
  - Compter réactions par membre
  - Ajouter à member_stats

- [ ] **Export complet**
  - Générer CSV avec tout l'historique
  - Pour archivage ou analyse externe
  - Feature premium ?

- [ ] **Machine Learning**
  - Prédire activité future
  - Détecter membres inactifs
  - Suggérer actions

#### Long terme (6-12 mois)

- [ ] **Multi-shard support**
  - Distribuer backfills sur plusieurs bots
  - Load balancing intelligent
  - Coordination via Redis

- [ ] **Analyse sémantique**
  - Topics populaires (NLP)
  - Sentiment analysis
  - Trending channels

- [ ] **Comparaison inter-serveurs**
  - Benchmarks anonymisés
  - Insights "Votre serveur vs similaires"
  - Respect RGPD

---

## 📚 Ressources & Références

### Documentation Discord API

- [Get Channel Messages](https://discord.com/developers/docs/resources/channel#get-channel-messages)
- [Rate Limits](https://discord.com/developers/docs/topics/rate-limits)
- [Permissions](https://discord.com/developers/docs/topics/permissions)

### Libraries Utilisées

- **Discord.js** : Pagination messages
- **BullMQ** : Job queues
- **Prisma** : Batch upserts
- **Redis** : Cache progress

### Inspiration

- MEE6 : Système de niveaux rétroactif
- Dyno : Backfill automatique
- Statbot : Analytics historiques

---

## 🎉 Changelog

### Version 1.0.0 (Initial Release)

**Ajouté :**
- ✅ Initialisation automatique au join du bot
- ✅ Backfill messages 30 derniers jours
- ✅ Updates incrémentales temps réel
- ✅ Dashboard avec 3 états (pending/backfilling/active)
- ✅ Progress tracking détaillé
- ✅ Gestion erreurs et rate limits
- ✅ API endpoints backfill status

**Limitations connues :**
- Limité à 10,000 messages par channel
- Limité à 30 jours d'historique
- Pas de backfill vocal/réactions (phase 1)
- Pas de parallelisation channels

**Breaking Changes :**
- Aucun (feature nouvelle)

---

## 👥 Contributeurs

- **Développeur Principal** : [Votre nom]
- **Review** : [Nom reviewer]
- **Tests QA** : [Nom testeur]

---

## 📄 Licence

Ce document fait partie du projet Discord Admin App.  
Propriétaire : [Votre entreprise]  
Dernière mise à jour : 20 octobre 2025

---

## 🔗 Liens Utiles

- [Architecture Globale](./ARCHITECTURE.md)
- [Stats System Documentation](./STATS_ARCHITECTURE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [User Guide](./USER_GUIDE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

---

**FIN DE LA ROADMAP**

---