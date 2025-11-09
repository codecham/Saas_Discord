# 📚 Discord Admin App - Documentation Complète du Projet

> **Version** : 1.0  
> **Date** : 07 Novembre 2025  
> **Status** : En développement actif  
> **Architecture** : Monorepo NestJS + SapphireJS + Angular

---

## 📋 Table des Matières

1. [Vue d'ensemble](#-vue-densemble)
2. [Architecture globale](#-architecture-globale)
3. [Stack technique](#-stack-technique)
4. [Système de modules](#-système-de-modules)
5. [Communication Gateway](#-communication-gateway)
6. [Modules implémentés](#-modules-implémentés)
7. [Base de données](#-base-de-données)
8. [Authentification & Sécurité](#-authentification--sécurité)
9. [Monitoring](#-monitoring)
10. [État actuel du projet](#-état-actuel-du-projet)
11. [Guide de développement](#-guide-de-développement)

---

## 🎯 Vue d'ensemble

### Qu'est-ce que Discord Admin App ?

**Discord Admin App** est une plateforme complète d'administration pour serveurs Discord, construite avec une **architecture modulaire** permettant d'activer/désactiver des fonctionnalités par serveur.

### Objectifs principaux

- ✅ **Modularity** : Système de modules activables/désactivables par guild
- ✅ **Business Model** : Différenciation Free/Premium avec limites configurables
- ✅ **Scalability** : Architecture découplée supportant multi-instances
- ✅ **Type Safety** : Types partagés entre tous les composants
- ✅ **Real-time** : Synchronisation instantanée Backend ↔ Bot

### Valeur ajoutée

- **Pour les admins Discord** : Interface web centralisée pour gérer leur serveur
- **Pour les développeurs** : Framework modulaire pour créer de nouvelles features
- **Business** : Modèle freemium avec limitations par plan d'abonnement

---

## 🏗️ Architecture globale

### Schéma d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                         DISCORD API                              │
│                    (Events, REST API)                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   Bot Discord    │
                    │  (SapphireJS)    │
                    │                  │
                    │  • Listeners     │
                    │  • Commands      │
                    │  • Events batch  │
                    │  • SQLite backup │
                    └────────┬─────────┘
                             │ Socket.IO
                    ┌────────▼─────────┐
                    │     Gateway      │
                    │  (NestJS + WS)   │
                    │                  │
                    │  • Hub central   │
                    │  • Routing       │
                    │  • Multi-bots    │
                    └────────┬─────────┘
                             │ Socket.IO
                    ┌────────▼─────────┐
                    │     Backend      │
                    │    (NestJS)      │
                    │                  │
                    │  • REST API      │
                    │  • Module logic  │
                    │  • OAuth         │
                    └────────┬─────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
    ┌───────▼───────┐ ┌─────▼─────┐ ┌───────▼───────┐
    │  PostgreSQL   │ │   Redis   │ │  TimescaleDB  │
    │   (Prisma)    │ │  (Cache)  │ │    (Stats)    │
    └───────────────┘ └───────────┘ └───────────────┘
                             │
                    ┌────────▼─────────┐
                    │    Frontend      │
                    │   (Angular 20)   │
                    │                  │
                    │  • Dashboard     │
                    │  • Module configs│
                    │  • Analytics     │
                    └──────────────────┘
```

### Flux de données typiques

#### 1. Event Discord → Backend

```
Discord (MEMBER_JOIN)
  → Bot listener détecte
  → Bot batch l'event (5s ou 100 events)
  → Bot emit('to-backend', events[])
  → Gateway reçoit
  → Gateway emit vers Backend socket
  → Backend traite + sauvegarde DB
```

#### 2. Configuration Backend → Bot

```
Admin change config (Frontend)
  → API POST /welcome/:guildId
  → Backend sauvegarde DB
  → Backend emit('module:change', {guildId, moduleId, config})
  → Gateway reçoit
  → Gateway broadcast vers tous les bots
  → Bot reçoit + applique config
```

#### 3. Commande Backend → Bot spécifique

```
Backend veut pinger un bot
  → Backend emit('to-bot', {botId, data})
  → Gateway reçoit
  → Gateway trouve bot socket
  → Gateway emit vers bot
  → Bot reçoit + répond (optionnel)
```

---

## 🛠️ Stack technique

### Applications (Monorepo)

```
discord-admin-app/
├── apps/
│   ├── backend/          # NestJS - API REST
│   ├── gateway/          # NestJS - WebSocket Hub
│   ├── bot/              # SapphireJS - Discord Bot
│   └── frontend/         # Angular 20 - UI Admin
├── packages/
│   └── shared-types/     # Types TypeScript partagés
└── docs/                 # Documentation
```

### Technologies par composant

#### Backend (NestJS)

- **Framework** : NestJS 10+
- **ORM** : Prisma
- **Validation** : class-validator, class-transformer
- **Auth** : Passport.js (JWT + Discord OAuth)
- **Queue** : BullMQ (optionnel, pour tâches async)
- **Logger** : Winston → Loki

**Modules principaux :**
```typescript
apps/backend/src/
├── core/
│   ├── auth/              # OAuth Discord, JWT, Guards
│   ├── discord/           # Client API Discord
│   ├── gateway/           # Client Gateway (Socket.IO)
│   ├── module-system/     # Registry, Manager, Limits
│   ├── prisma/            # Service Prisma
│   └── redis/             # Service Redis
├── modules/
│   ├── welcome/           # Module Welcome
│   ├── stats/             # Module Stats (WIP)
│   └── [autres modules]/
└── app.module.ts
```

#### Gateway (NestJS + Socket.IO)

- **Framework** : NestJS (standalone)
- **WebSocket** : Socket.IO 4+
- **Logger** : Winston → Loki

**Responsabilités :**
- Hub central de communication
- Gestion connexions multiples (1 backend, N bots)
- Routage messages bidirectionnels
- Heartbeat & reconnexion automatique

**Events gérés :**
```typescript
// Bot/Backend → Gateway
'register'              → Enregistrement initial
'to-backend'            → Bot envoie events au Backend
'to-bot'                → Backend envoie commande à un bot
'broadcast-to-bots'     → Backend diffuse à tous les bots
'module:change'         → Backend notifie changement config

// Gateway → Bot/Backend
'registered'            → Confirmation enregistrement
'from-backend'          → Commande reçue du Backend
'backend-ack'           → Accusé réception event
```

#### Bot (SapphireJS)

- **Framework** : SapphireJS (sur Discord.js 14+)
- **WebSocket** : Socket.IO client
- **Backup** : SQLite (events offline)
- **Logger** : Winston → Loki

**Structure :**
```typescript
apps/bot/src/
├── listeners/            # Discord event listeners
├── commands/             # Slash commands (si nécessaire)
├── modules/
│   ├── module-loader/    # Système de chargement modules
│   ├── config-sync/      # Sync config avec Backend
│   ├── welcome/          # Module Welcome
│   └── stats/            # Module Stats (WIP)
├── services/
│   ├── websocket.service.ts    # Connexion Gateway
│   ├── event-batch.service.ts  # Batching events
│   └── backup.service.ts       # SQLite backup
└── index.ts
```

**Event Batching :**
```typescript
// Configuration
BATCH_INTERVAL = 5000ms  // Envoi toutes les 5s
MAX_BATCH_SIZE = 100     // Ou si 100 events atteints

// Backup offline
Si Gateway déconnectée → SQLite
Au reconnect → Restore + send batch
```

#### Frontend (Angular 20)

- **Framework** : Angular 20
- **UI Library** : PrimeNG 17+
- **CSS** : TailwindCSS
- **State** : Services + RxJS
- **Auth** : JWT Interceptor

**Structure (prévue) :**
```typescript
apps/frontend/src/app/
├── core/
│   ├── services/         # API clients
│   ├── guards/           # Auth guards
│   ├── interceptors/     # HTTP interceptors
│   └── models/           # Interfaces
├── shared/
│   ├── components/       # Composants réutilisables
│   └── pipes/            # Pipes custom
├── features/
│   ├── auth/             # Login, callback
│   ├── dashboard/        # Dashboard principal
│   ├── guilds/           # Liste serveurs
│   └── modules/
│       ├── welcome/      # Config Welcome
│       ├── stats/        # Config Stats
│       └── [autres]/
└── layouts/              # Layouts globaux
```

#### Shared Types (Package)

```typescript
packages/shared-types/src/
├── dtos/
│   ├── auth/             # Login, tokens
│   ├── bot-events/       # Events Discord
│   └── modules/          # Module configs
├── enums/
│   ├── subscription.enum.ts
│   └── module-category.enum.ts
└── interfaces/
    ├── module-definition.interface.ts
    └── guild-module-config.interface.ts
```

### Bases de données

#### PostgreSQL (via Prisma)

**Usage** : Données principales de l'application

**Tables principales :**
```sql
-- Guilds Discord
guilds (
  guildId, name, icon, ownerId,
  memberCount, subscription, joinedAt
)

-- Utilisateurs
users (
  id, discordId, username, discriminator,
  avatar, accessToken, refreshToken
)

-- Modules par guild
guild_modules (
  id, guildId, moduleId, enabled,
  enabledAt, disabledAt, config (JSON)
)

-- Config module Welcome
welcome_configs (
  id, guildId, channelId,
  messageType, messageContent,
  embedTitle, embedDescription, embedColor
)
```

#### Redis

**Usage** : Cache & sessions

**Clés utilisées :**
```
oauth:state:{state}        → State CSRF OAuth (TTL 10min)
oauth:session:{session}    → Session après callback (TTL 5min)
discord:token:{userId}     → Cache tokens Discord (TTL 1h)
guild:cache:{guildId}      → Cache infos guild (TTL 5min)
```

#### SQLite (Bot uniquement)

**Usage** : Backup offline des events quand Gateway déconnectée

```sql
events (
  id, guildId, type, data (JSON),
  timestamp, sent (BOOLEAN)
)
```

---

## 🧩 Système de modules

### Concept central

Le **système de modules** est le cœur de l'architecture. Chaque fonctionnalité (Welcome, Stats, Automod, etc.) est un **module indépendant** qui peut être :

- ✅ Activé/désactivé par guild
- ✅ Configuré individuellement
- ✅ Soumis à des limites selon le plan (Free/Premium)
- ✅ Dépendant d'autres modules

### Structure d'un module

Chaque module est défini par une **ModuleDefinition** :

```typescript
// Exemple : Module Welcome
export const WELCOME_MODULE: ModuleDefinition = {
  // Identification
  id: 'welcome',
  name: 'Welcome Messages',
  description: 'Send personalized welcome messages to new members',
  icon: '👋',
  category: ModuleCategory.ENGAGEMENT,

  // Disponibilité par plan
  availability: {
    free: true,
    premium: true,
    max: true,
  },

  // Limites par plan (-1 = illimité)
  limits: {
    free: {
      messages: 1,           // 1 seul message
    },
    premium: {
      messages: -1,          // Illimité
      embeds: -1,            // Support embeds
    },
  },

  // Où le module s'exécute
  runtime: {
    backend: true,  // Config via API
    bot: true,      // Listeners Discord
  },

  // Dépendances
  dependencies: [],  // Aucune dépendance

  // Metadata
  version: '1.0.0',
  author: 'Discord Admin App',
};
```

### Catégories de modules

```typescript
enum ModuleCategory {
  MODERATION = 'moderation',    // Automod, Bans, Logs
  ENGAGEMENT = 'engagement',    // Welcome, Leveling, Rewards
  UTILITY = 'utility',          // Tickets, Polls, Reminders
  ANALYTICS = 'analytics',      // Stats, Insights
  ECONOMY = 'economy',          // Currency, Shop, Gambling
}
```

### Plans d'abonnement

```typescript
enum SubscriptionPlan {
  FREE = 'free',
  PREMIUM = 'premium',
  max = 'max',
}
```

### Composants d'un module complet

Un module se compose de **3 parties** :

#### 1. Définition (Shared)

```typescript
// packages/shared-types/src/modules/welcome.definition.ts
export const WELCOME_MODULE: ModuleDefinition = { ... };
```

#### 2. Backend (NestJS)

```typescript
// apps/backend/src/modules/welcome/

welcome.module.ts           // Module NestJS
welcome.definition.ts       // Définition du module
welcome.service.ts          // Logique métier
welcome.controller.ts       // Endpoints API
dto/
  ├── create-welcome.dto.ts
  └── update-welcome.dto.ts
```

**Responsabilités :**
- CRUD configuration
- Validation données
- Vérification limites Free/Premium
- Notification bot via Gateway

**Endpoints typiques :**
```typescript
GET    /welcome/:guildId        → Récupérer config
POST   /welcome/:guildId        → Créer/modifier config
DELETE /welcome/:guildId        → Supprimer config
PUT    /welcome/:guildId/toggle → Activer/désactiver
```

#### 3. Bot (SapphireJS)

```typescript
// apps/bot/src/modules/welcome/

welcome.module.ts           // Module bot
listeners/
  └── member-join.listener.ts
```

**Responsabilités :**
- Écouter événements Discord
- Appliquer configuration reçue du Backend
- Exécuter actions (ex: envoyer message)

### Cycle de vie d'un module

#### Activation

```
1. Admin active via Frontend
   └─> POST /modules/:guildId/enable {moduleId: 'welcome'}

2. Backend vérifie :
   ✓ Module existe ?
   ✓ Disponible pour le plan ?
   ✓ Dépendances satisfaites ?
   ✓ Limites respectées ?

3. Backend sauvegarde en DB
   └─> guild_modules: {guildId, moduleId, enabled: true}

4. Backend notifie Bot
   └─> emit('module:change', {
         guildId, moduleId, action: 'enabled', config
       })

5. Gateway broadcast → tous les bots

6. Bot reçoit + active
   └─> moduleLoader.enableModule(guildId, moduleId, config)
   └─> Module charge listeners Discord
```

#### Configuration

```
1. Admin change config via Frontend
   └─> POST /welcome/:guildId {channelId: '123', message: 'Hello'}

2. Backend valide + sauvegarde

3. Backend notifie Bot
   └─> emit('module:change', {
         guildId, moduleId, action: 'config_updated', config
       })

4. Bot reçoit + met à jour
   └─> welcomeModule.onConfigUpdate(guildId, config)
```

#### Désactivation

```
1. Admin désactive via Frontend
   └─> DELETE /modules/:guildId/disable {moduleId: 'welcome'}

2. Backend sauvegarde
   └─> guild_modules: {enabled: false, disabledAt: NOW()}

3. Backend notifie Bot
   └─> emit('module:change', {action: 'disabled'})

4. Bot décharge module
   └─> moduleLoader.disableModule(guildId, moduleId)
   └─> Supprime listeners Discord
```

### Module Registry (Backend)

**Service central** qui enregistre tous les modules disponibles :

```typescript
// apps/backend/src/core/module-system/registry/module.registry.ts

@Injectable()
export class ModuleRegistry {
  private modules = new Map<string, ModuleDefinition>();

  // Enregistrer un module
  register(module: ModuleDefinition) {
    this.modules.set(module.id, module);
  }

  // Récupérer un module
  getModule(id: string): ModuleDefinition | undefined {
    return this.modules.get(id);
  }

  // Liste tous les modules
  getAllModules(): ModuleDefinition[] {
    return Array.from(this.modules.values());
  }

  // Filtre par plan
  getAvailableModules(plan: SubscriptionPlan): ModuleDefinition[] {
    return this.getAllModules().filter(m => m.availability[plan]);
  }

  // Vérifie si limite atteinte
  checkLimit(
    moduleId: string,
    plan: SubscriptionPlan,
    resource: string,
    currentValue: number
  ): boolean {
    const module = this.getModule(moduleId);
    const limit = module?.limits?.[plan]?.[resource];
    
    if (limit === undefined || limit === -1) return true; // Illimité
    return currentValue < limit;
  }
}
```

### Module Manager (Backend)

**Service qui gère l'activation/config des modules** :

```typescript
// apps/backend/src/core/module-system/services/module-manager.service.ts

@Injectable()
export class ModuleManagerService {
  constructor(
    private prisma: PrismaService,
    private moduleRegistry: ModuleRegistry,
    private gatewayClient: GatewayClientService,
  ) {}

  // Active un module
  async enableModule(
    guildId: string,
    moduleId: string,
    plan: SubscriptionPlan,
    config?: any
  ) {
    // 1. Vérifier existence
    const module = this.moduleRegistry.getModule(moduleId);
    if (!module) throw new NotFoundException('Module not found');

    // 2. Vérifier disponibilité pour le plan
    if (!module.availability[plan]) {
      throw new ForbiddenException('Module not available for this plan');
    }

    // 3. Vérifier dépendances
    if (module.dependencies?.length > 0) {
      const enabledModules = await this.getGuildModules(guildId);
      const enabledIds = enabledModules.map(m => m.moduleId);
      
      for (const depId of module.dependencies) {
        if (!enabledIds.includes(depId)) {
          throw new BadRequestException(`Dependency ${depId} not enabled`);
        }
      }
    }

    // 4. Sauvegarder en DB
    const guildModule = await this.prisma.guildModule.upsert({
      where: { guildId_moduleId: { guildId, moduleId } },
      create: {
        guildId, moduleId, enabled: true,
        enabledAt: new Date(), config: config || {}
      },
      update: {
        enabled: true, enabledAt: new Date(),
        disabledAt: null, config: config || {}
      },
    });

    // 5. Notifier Bot
    await this.gatewayClient.notifyModuleChange({
      guildId, moduleId, action: 'enabled', config
    });

    return guildModule;
  }

  // Désactive un module
  async disableModule(guildId: string, moduleId: string) {
    const guildModule = await this.prisma.guildModule.update({
      where: { guildId_moduleId: { guildId, moduleId } },
      data: { enabled: false, disabledAt: new Date() },
    });

    await this.gatewayClient.notifyModuleChange({
      guildId, moduleId, action: 'disabled'
    });

    return guildModule;
  }
}
```

### Module Loader (Bot)

**Service qui charge/décharge les modules côté bot** :

```typescript
// apps/bot/src/modules/module-loader/module-loader.service.ts

export class ModuleLoaderService {
  private modules = new Map<string, BotModule>();
  private enabledModules = new Map<string, Set<string>>(); // guildId → Set<moduleId>

  // Enregistrer un module bot
  register(module: BotModule) {
    this.modules.set(module.id, module);
    logger.info(`[ModuleLoader] Module registered: ${module.name}`);
  }

  // Activer un module pour une guild
  async enableModule(guildId: string, moduleId: string, config?: any) {
    const module = this.modules.get(moduleId);
    if (!module) {
      logger.warn(`[ModuleLoader] Module ${moduleId} not found`);
      return;
    }

    // Ajouter aux modules actifs
    if (!this.enabledModules.has(guildId)) {
      this.enabledModules.set(guildId, new Set());
    }
    this.enabledModules.get(guildId)!.add(moduleId);

    // Callback module
    await module.onLoad?.(guildId, config);
    
    logger.info(`[ModuleLoader] Module ${moduleId} enabled for guild ${guildId}`);
  }

  // Désactiver un module pour une guild
  async disableModule(guildId: string, moduleId: string) {
    const module = this.modules.get(moduleId);
    
    this.enabledModules.get(guildId)?.delete(moduleId);
    
    await module.onUnload?.(guildId);
    
    logger.info(`[ModuleLoader] Module ${moduleId} disabled for guild ${guildId}`);
  }

  // Vérifier si module activé
  isModuleEnabled(guildId: string, moduleId: string): boolean {
    return this.enabledModules.get(guildId)?.has(moduleId) || false;
  }

  // Charger tous les modules au démarrage bot
  async loadAllModules() {
    for (const [moduleId] of this.modules) {
      // Charger configs depuis Backend
      await configSync.loadModuleConfigs(moduleId);
      
      // Activer pour chaque guild
      const guilds = configSync.getGuildsForModule(moduleId);
      for (const guildId of guilds) {
        const config = configSync.getConfig(moduleId, guildId);
        if (config?.enabled !== false) {
          await this.enableModule(guildId, moduleId, config);
        }
      }
    }
  }
}
```

### Interface BotModule

Tous les modules bot doivent implémenter cette interface :

```typescript
// apps/bot/src/modules/module-loader/bot-module.interface.ts

export interface BotModule {
  id: string;
  name: string;
  
  onLoad?(guildId: string, config?: any): Promise<void>;
  onUnload?(guildId: string): Promise<void>;
  onConfigUpdate?(guildId: string, config: any): Promise<void>;
}
```

---

## 🔌 Communication Gateway

### Architecture WebSocket

Le **Gateway** est le hub central qui gère toutes les communications WebSocket entre le Backend et les Bots.

```
┌─────────────┐
│   Backend   │ (1 connexion)
└──────┬──────┘
       │ Socket.IO
┌──────▼──────────────┐
│     Gateway         │
│  (NestJS + WS)      │
└──────┬──────────────┘
       │ Socket.IO
       ├──────┬──────┬──────┐
┌──────▼──┐ ┌─▼─────┐ ┌─▼─────┐
│  Bot 1  │ │ Bot 2 │ │ Bot N │ (N connexions)
└─────────┘ └───────┘ └───────┘
```

### Enregistrement des clients

#### Backend

```typescript
// apps/backend/src/core/gateway/services/gatewayClient.service.ts

this.socket = io('http://gateway:3001');

this.socket.on('connect', () => {
  this.socket.emit('register', {
    type: 'backend',
    name: 'Backend Principal'
  });
});

this.socket.on('registered', (data) => {
  logger.log('Backend registered on Gateway');
});
```

#### Bot

```typescript
// apps/bot/src/services/websocket.service.ts

this.socket = io('http://gateway:3001');

this.socket.on('connect', () => {
  this.socket.emit('register', {
    type: 'bot',
    botId: process.env.BOT_ID,
    botName: 'Discord Bot #1'
  });
});

this.socket.on('registered', (data) => {
  logger.log(`Bot registered: ${data.botId}`);
});
```

### Events WebSocket

#### 1. `to-backend` (Bot → Backend)

```typescript
// Bot envoie des events au Backend
bot.socket.emit('to-backend', [
  {
    type: 'MEMBER_JOIN',
    guildId: '123456789',
    userId: '987654321',
    timestamp: new Date(),
    metadata: { username: 'John' }
  },
  // ... autres events (batch)
]);

// Gateway reçoit et route
gateway.on('to-backend', (events) => {
  backendSocket.emit('to-backend', events);
});

// Backend reçoit
backend.socket.on('to-backend', async (events) => {
  for (const event of events) {
    await botEventHandler.processEvent(event);
  }
});
```

#### 2. `to-bot` (Backend → Bot spécifique)

```typescript
// Backend envoie commande à un bot précis
backend.socket.emit('to-bot', {
  botId: 'bot-12345',
  data: {
    type: 'ping',
    message: 'Ping from backend'
  }
});

// Gateway route vers le bon bot
gateway.on('to-bot', ({botId, data}) => {
  const botSocket = connectedBots.get(botId);
  if (botSocket) {
    botSocket.emit('from-backend', data);
  }
});

// Bot reçoit
bot.socket.on('from-backend', (data) => {
  if (data.type === 'ping') {
    logger.info('Ping received!');
  }
});
```

#### 3. `broadcast-to-bots` (Backend → Tous les bots)

```typescript
// Backend diffuse à tous les bots
backend.socket.emit('broadcast-to-bots', {
  type: 'announcement',
  message: 'Maintenance in 5 minutes'
});

// Gateway diffuse
gateway.on('broadcast-to-bots', (data) => {
  for (const [botId, socket] of connectedBots) {
    socket.emit('from-backend', data);
  }
});
```

#### 4. `module:change` (Backend → Bots)

**Event spécial pour synchroniser les configs de modules :**

```typescript
// Backend notifie changement de config
backend.socket.emit('module:change', {
  guildId: '123456789',
  moduleId: 'welcome',
  action: 'enabled' | 'disabled' | 'config_updated',
  config: { channelId: '111', message: 'Welcome!' },
  timestamp: new Date()
});

// Gateway broadcast
gateway.on('module:change', (data) => {
  botConnectionService.broadcastToAllBots('module:change', data);
});

// Bot reçoit et applique
bot.socket.on('module:change', async (data) => {
  const { guildId, moduleId, action, config } = data;

  switch (action) {
    case 'enabled':
      await moduleLoader.enableModule(guildId, moduleId, config);
      break;
    case 'disabled':
      await moduleLoader.disableModule(guildId, moduleId);
      break;
    case 'config_updated':
      const module = moduleLoader.getModule(moduleId);
      await module?.onConfigUpdate(guildId, config);
      break;
  }
});
```

### Gestion des connexions (Gateway)

```typescript
// apps/gateway/src/modules/bot-gateway/services/bot-connection.service.ts

interface ConnectedBot {
  id: string;
  name: string;
  socket: Socket;
  connectedAt: Date;
  lastHeartbeat: Date;
}

@Injectable()
export class BotConnectionService {
  private bots = new Map<string, ConnectedBot>();

  registerBot(id: string, name: string, socket: Socket) {
    this.bots.set(id, {
      id, name, socket,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    });
  }

  unregisterBot(id: string) {
    this.bots.delete(id);
  }

  sendToBot(botId: string, event: string, data: any): boolean {
    const bot = this.bots.get(botId);
    if (bot?.socket.connected) {
      bot.socket.emit(event, data);
      return true;
    }
    return false;
  }

  broadcastToAllBots(event: string, data: any) {
    for (const bot of this.bots.values()) {
      if (bot.socket.connected) {
        bot.socket.emit(event, data);
      }
    }
  }

  getAllBots() {
    return Array.from(this.bots.values());
  }
}
```

### Event Batching (Bot)

Pour optimiser les performances, le bot **groupe les events** avant envoi :

```typescript
// apps/bot/src/services/event-batch.service.ts

export class EventBatchService {
  private batch: BotEventDto[] = [];
  private timer: NodeJS.Timeout | null = null;

  private readonly BATCH_INTERVAL = 5000;  // 5 secondes
  private readonly MAX_BATCH_SIZE = 100;   // 100 events max

  addEvent(event: BotEventDto) {
    this.batch.push(event);

    // Envoi immédiat si batch plein
    if (this.batch.length >= this.MAX_BATCH_SIZE) {
      this.flushBatch();
    }
    // Sinon, timer pour envoi groupé
    else if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flushBatch();
      }, this.BATCH_INTERVAL);
    }
  }

  private flushBatch() {
    if (this.batch.length === 0) return;

    const eventsToSend = [...this.batch];
    this.batch = [];

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Envoyer au Gateway
    if (websocketService.isConnected()) {
      websocketService.emit('to-backend', eventsToSend);
      logger.debug(`Sent batch of ${eventsToSend.length} events`);
    } else {
      // Backup en SQLite si déconnecté
      backupService.saveEvents(eventsToSend);
    }
  }
}
```

### Backup Offline (Bot)

Si le Gateway est déconnecté, le bot sauvegarde les events en **SQLite local** :

```typescript
// apps/bot/src/services/backup.service.ts

export class BackupService {
  private db: Database;

  constructor() {
    this.db = new Database('./bot-backup.db');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guildId TEXT,
        type TEXT,
        data TEXT,
        timestamp TEXT,
        sent INTEGER DEFAULT 0
      )
    `);
  }

  saveEvents(events: BotEventDto[]) {
    const stmt = this.db.prepare(`
      INSERT INTO events (guildId, type, data, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    for (const event of events) {
      stmt.run(
        event.guildId,
        event.type,
        JSON.stringify(event),
        event.timestamp
      );
    }

    logger.info(`Saved ${events.length} events to backup`);
  }

  // Restaurer les events non envoyés
  restoreEvents(): BotEventDto[] {
    const events = this.db.prepare(`
      SELECT * FROM events WHERE sent = 0 ORDER BY timestamp ASC
    `).all();

    return events.map(row => JSON.parse(row.data));
  }

  // Marquer comme envoyé
  markAsSent(eventIds: number[]) {
    const stmt = this.db.prepare(`
      UPDATE events SET sent = 1 WHERE id = ?
    `);

    for (const id of eventIds) {
      stmt.run(id);
    }
  }
}

// Lors de la reconnexion
websocketService.on('connect', async () => {
  const events = backupService.restoreEvents();
  if (events.length > 0) {
    websocketService.emit('to-backend', events);
    backupService.markAsSent(events.map(e => e.id));
    logger.info(`Restored ${events.length} events from backup`);
  }
});
```

---

## 📦 Modules implémentés

### Module Welcome ✅ (Complet)

**Status** : Backend + Bot opérationnels, Frontend à implémenter

#### Description

Envoie des messages de bienvenue personnalisés aux nouveaux membres qui rejoignent le serveur Discord.

#### Features

- ✅ Message de bienvenue personnalisable
- ✅ Choix du channel de destination
- ✅ Variables dynamiques : `{user}`, `{server}`, `{memberCount}`
- ✅ Support messages texte (Free)
- ✅ Support embeds (Premium)

#### Limites

```typescript
limits: {
  free: {
    messages: 1,  // 1 seul message de bienvenue
  },
  premium: {
    messages: -1,  // Illimité
    embeds: -1,    // Support embeds Discord
  },
}
```

#### Configuration

```typescript
interface WelcomeConfig {
  guildId: string;
  enabled: boolean;
  channelId: string | null;
  messageType: 'text' | 'embed';
  messageContent: string;
  // Pour embeds (Premium)
  embedTitle?: string;
  embedDescription?: string;
  embedColor?: string;
  embedThumbnail?: boolean;
  embedFooter?: string;
}
```

#### Backend

**Fichiers :**
```
apps/backend/src/modules/welcome/
├── welcome.module.ts
├── welcome.definition.ts
├── welcome.service.ts
├── welcome.controller.ts
└── dto/
    ├── create-welcome.dto.ts
    └── update-welcome.dto.ts
```

**API Endpoints :**
```typescript
GET    /welcome/:guildId        // Récupérer config
POST   /welcome/:guildId        // Créer/modifier config
DELETE /welcome/:guildId        // Supprimer config
PUT    /welcome/:guildId/toggle // Activer/désactiver
```

**Service principal :**
```typescript
@Injectable()
export class WelcomeService {
  async upsertConfig(guildId: string, dto: CreateWelcomeDto) {
    // 1. Valider
    // 2. Vérifier limites Free/Premium
    // 3. Sauvegarder en DB
    // 4. Notifier Bot via Gateway
  }

  async toggleEnabled(guildId: string, enabled: boolean) {
    // 1. Update DB
    // 2. Notifier Bot
  }
}
```

#### Bot

**Fichiers :**
```
apps/bot/src/modules/welcome/
├── welcome.module.ts
└── listeners/
    └── member-join.listener.ts
```

**Listener :**
```typescript
export class WelcomeMemberJoinListener extends Listener {
  public constructor(context, options) {
    super(context, {
      event: Events.GuildMemberAdd,
    });
  }

  public async run(member: GuildMember) {
    // 1. Vérifier si module activé
    const config = welcomeModule.getConfig(member.guild.id);
    if (!config) return;

    // 2. Récupérer le channel
    const channel = member.guild.channels.cache.get(config.channelId);
    if (!channel?.isTextBased()) return;

    // 3. Remplacer variables
    const message = this.replaceVariables(config.messageContent, member);

    // 4. Envoyer message
    if (config.messageType === 'text') {
      await channel.send(message);
    } else {
      const embed = new EmbedBuilder()
        .setTitle(config.embedTitle)
        .setDescription(message)
        .setColor(config.embedColor)
        .setThumbnail(member.user.displayAvatarURL());
      
      await channel.send({ embeds: [embed] });
    }
  }

  private replaceVariables(text: string, member: GuildMember): string {
    return text
      .replace(/{user}/g, member.user.toString())
      .replace(/{server}/g, member.guild.name)
      .replace(/{memberCount}/g, member.guild.memberCount.toString());
  }
}
```

#### Frontend (À implémenter)

**Composants prévus :**
```
apps/frontend/src/app/features/modules/welcome/
├── pages/
│   └── welcome-config/
├── components/
│   ├── message-editor/       # Éditeur avec preview
│   ├── message-preview/      # Aperçu du message
│   └── channel-selector/     # Sélecteur de channel
└── services/
    ├── welcome-facade.service.ts
    └── welcome-api.service.ts
```

---

### Module Stats 🔄 (Backend ~70%, Bot à faire)

**Status** : Backend en cours d'implémentation, Bot non commencé

#### Description

Système d'analytics avancé pour tracker l'activité du serveur : messages, vocal, réactions, membres.

#### Features prévues

- 📊 Tracking événements : `MESSAGE_CREATE`, `VOICE_JOIN/LEAVE`, `REACTION_ADD`, `MEMBER_JOIN/LEAVE`
- 📈 Agrégations : 5 minutes, quotidienne, cumulative par membre
- 🏆 Leaderboards : messages, temps vocal, réactions
- 📉 Timeline historique : graphiques d'activité
- 🎯 Filtres : par channel, par membre, par période

#### Limites

```typescript
limits: {
  free: {
    retention_days: 7,        // Rétention 7 jours
    leaderboard_size: 10,     // Top 10 seulement
    metrics: ['messages'],    // Messages uniquement
  },
  premium: {
    retention_days: 90,       // Rétention 90 jours
    leaderboard_size: -1,     // Leaderboard complet
    metrics: ['messages', 'voice', 'reactions'], // Toutes métriques
    export: true,             // Export CSV
  },
}
```

#### Base de données (TimescaleDB)

**Hypertable des events :**
```sql
CREATE TABLE stats_events (
  time TIMESTAMPTZ NOT NULL,
  guild_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  user_id TEXT,
  channel_id TEXT,
  message_id TEXT,
  metadata JSONB,
  PRIMARY KEY (time, guild_id, event_type)
);

SELECT create_hypertable('stats_events', 'time');
```

**Agrégations 5 minutes (Continuous Aggregate) :**
```sql
CREATE MATERIALIZED VIEW stats_aggregated_5min
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('5 minutes', time) AS bucket,
  guild_id,
  channel_id,
  COUNT(*) FILTER (WHERE event_type = 'MESSAGE_CREATE') AS message_count,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(*) FILTER (WHERE event_type = 'REACTION_ADD') AS reaction_count
FROM stats_events
GROUP BY bucket, guild_id, channel_id;
```

**Stats cumulatives par membre :**
```sql
CREATE TABLE stats_member_cumulative (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  total_messages BIGINT DEFAULT 0,
  total_voice_minutes INTEGER DEFAULT 0,
  total_reactions BIGINT DEFAULT 0,
  join_date TIMESTAMPTZ,
  last_active TIMESTAMPTZ,
  PRIMARY KEY (guild_id, user_id)
);
```

#### Backend (En cours)

**Fichiers créés :**
```
apps/backend/src/modules/stats/
├── stats.module.ts              ✅
├── stats.definition.ts          ✅
├── services/
│   ├── stats-events.service.ts      ✅
│   ├── stats-aggregation.service.ts ✅
│   └── stats-query.service.ts       ✅
└── controllers/
    └── stats.controller.ts          ✅
```

**Services :**

1. **StatsEventsService** : Ingestion des events
```typescript
async createEvent(dto: CreateStatsEventDto)
async createEventsBatch(events: CreateStatsEventDto[])
async getEvents(filter: GetEventsDto)
```

2. **StatsAggregationService** : Calculs agrégés
```typescript
async aggregateMessages5Min(guildId, start, end)
async aggregateDaily(guildId, date)
async updateMemberCumulativeStats(guildId, userId, increment)
```

3. **StatsQueryService** : Requêtes analytics
```typescript
async getGuildOverview(guildId, period)
async getTimeline(guildId, metric, period)
async getMemberStats(guildId, userId, period)
async getLeaderboard(guildId, sortBy, limit)
```

**API Endpoints :**
```typescript
POST   /stats/events                  // Créer event(s)
GET    /stats/:guildId/overview       // Vue d'ensemble
GET    /stats/:guildId/timeline       // Timeline graphique
GET    /stats/:guildId/members/:userId // Stats d'un membre
GET    /stats/:guildId/leaderboard    // Leaderboard
```

#### Bot (À faire)

**Structure prévue :**
```
apps/bot/src/modules/stats/
├── stats.module.ts
└── listeners/
    ├── message-create.listener.ts
    ├── voice-state-update.listener.ts
    ├── reaction-add.listener.ts
    ├── member-join.listener.ts
    └── member-leave.listener.ts
```

**Exemple listener :**
```typescript
export class MessageCreateStatsListener extends Listener {
  public async run(message: Message) {
    if (!message.guildId || message.author.bot) return;

    // Vérifier si module activé
    const config = statsModule.getConfig(message.guildId);
    if (!config) return;

    // Créer l'event
    const event: CreateStatsEventDto = {
      guildId: message.guildId,
      eventType: 'MESSAGE_CREATE',
      userId: message.author.id,
      channelId: message.channelId,
      messageId: message.id,
      metadata: {
        contentLength: message.content.length,
        hasAttachments: message.attachments.size > 0,
      },
      timestamp: new Date(),
    };

    // Ajouter au batch
    eventBatchService.addEvent(event);
  }
}
```

### ✅ Frontend Angular (~60% complété)

#### Infrastructure & Core ✅
- [x] Architecture routing complète avec lazy loading
- [x] Auth guard + Guest guard + Guild guard
- [x] JWT Interceptor avec auto-injection tokens
- [x] Template Sakai intégré (layout, navigation, thèmes dark/light)
- [x] Pattern Facade (API + Data + Facade services)
- [x] Angular 20 Signals pour réactivité
- [x] Error handling global avec toasts
- [x] Loading states (skeleton) partout

#### Authentification ✅ (100%)
- [x] Login Discord OAuth avec state CSRF
- [x] Callback handler sécurisé
- [x] JWT + Refresh tokens (httpOnly cookies pour sécurité)
- [x] Auto-refresh tokens avant expiration
- [x] Guards protection routes (auth + guest + guild)
- [x] Pages : `/auth/login`, `/auth/callback`

#### Gestion Serveurs (Guilds) ✅ (100%)
- [x] Liste serveurs Discord de l'utilisateur
- [x] Sélection serveur actif avec persistence
- [x] Informations détaillées serveur (icône, nom, membres, etc.)
- [x] Cache intelligent avec TTL (5 min)
- [x] Auto-loading au login
- [x] Pages : `/server-list`, `/server-info`, `/dashboard`
- [x] Services complets : `guild-facade`, `guild-api`, `guild-data`

#### Gestion Membres ✅ (90%)
- [x] Liste complète membres avec pagination
- [x] Filtres rapides (tous, admins, bots, timeout)
- [x] Recherche temps réel (nom, username, nickname)
- [x] Lazy loading des membres restants
- [x] Actions de modération via modals PrimeNG élégantes :
  - [x] Kick membre avec raison
  - [x] Ban membre avec raison + delete message days
  - [x] Timeout membre avec sélection durée (60s, 5min, 10min, 1h, 1j, 1 semaine)
  - [x] Change nickname avec validation
- [x] Affichage rôles membres
- [x] Statistiques par catégorie (admins, bots, timeout, etc.)
- [x] Cache avec TTL
- [x] Pages : `/members`
- [x] Services complets : `member-facade`, `member-api`, `member-data`
- [x] Composants : `member-roles`, `member-action-modals`

#### Gestion Channels ✅ (80%)
- [x] Liste complète channels (text, voice, category, forum, etc.)
- [x] Filtrage par type de channel
- [x] Filtrage par catégorie
- [x] Recherche temps réel
- [x] Channels groupés par catégorie et triés
- [x] Actions CRUD complètes :
  - [x] Create channel
  - [x] Modify channel (nom, topic, nsfw, slowmode, etc.)
  - [x] Delete channel
  - [x] Clone channel
  - [x] Edit permissions (rôles/membres)
  - [x] Delete permissions
- [x] Statistiques globales (total par type)
- [x] Cache avec TTL
- [x] Services complets : `channel-facade`, `channel-api`, `channel-data`

#### Gestion Utilisateur ✅ (100%)
- [x] Profil utilisateur Discord
- [x] Avatar, username, discriminator
- [x] Auto-loading au login
- [x] Cache en mémoire
- [x] Services complets : `user-facade`, `user-api`, `user-data`

#### Outils Développement ✅
- [x] Endpoint Tester (test manuel des endpoints API)
- [x] Error Handler global avec MessageService
- [x] Toast notifications PrimeNG
- [x] Documentation component

### 🔄 En cours (~15%)

#### Module Welcome (Frontend)
- [x] Backend 100% opérationnel
- [ ] Frontend 0% implémenté
- [ ] À faire :
  - [ ] Page configuration `/modules/welcome/config`
  - [ ] Message editor avec variables `{user}`, `{server}`, etc.
  - [ ] Channel selector (dropdown)
  - [ ] Preview message temps réel
  - [ ] Embed builder (Premium)
  - [ ] Services : `welcome-facade`, `welcome-api`, `welcome-data`

#### Module Stats (Frontend)
- [x] Backend ~70% opérationnel
- [x] Frontend structure créée (10%)
- [ ] À compléter :
  - [ ] Dashboard stats serveur
  - [ ] Charts timeline (messages, vocal)
  - [ ] Leaderboards membres actifs
  - [ ] Métriques temps réel
  - [ ] Composants réutilisables :
    - [ ] `MetricCard` - Affichage KPI
    - [ ] `TimelineChart` - Graphique temporel
    - [ ] `LeaderboardTable` - Classement membres
  - [ ] Services : `statistics-facade` (structure vide actuellement)

#### Statistiques Membres
- [x] Structure page `/members/:userId/stats` (20%)
- [x] Layout basique
- [ ] Connexion backend Stats
- [ ] Charts activité membre
- [ ] Historique rôles
- [ ] Timeline messages/vocal

### ⏳ À faire (~25%)

#### Modules Additionnels (Frontend)
Aucune implémentation frontend pour :
- [ ] Module Automod (0%)
- [ ] Module Tickets (0%)
- [ ] Module Leveling (0%)
- [ ] Module Economy (0%)

#### Fonctionnalités Manquantes

##### Gestion des Rôles (0%)
- [ ] Liste des rôles du serveur
- [ ] Création/modification/suppression rôles
- [ ] Attribution de rôles aux membres (bulk)
- [ ] Gestion permissions rôles
- [ ] Hiérarchie et couleurs des rôles
- [ ] Services : `role-facade`, `role-api`, `role-data`

##### Logs d'Audit (0%)
- [ ] Liste des actions modération
- [ ] Filtres par type d'action (kick, ban, timeout, etc.)
- [ ] Filtres par modérateur
- [ ] Timeline des événements
- [ ] Export des logs (CSV, JSON)
- [ ] Services : `audit-facade`, `audit-api`, `audit-data`

##### Paramètres Serveur (0%)
- [ ] Modifier nom/icône/banner serveur
- [ ] Gestion des régions
- [ ] Niveaux de vérification
- [ ] Notifications système
- [ ] Permissions par défaut
- [ ] Services : `settings-facade`, `settings-api`, `settings-data`

##### Dashboard Analytics Avancé (20%)
- [ ] Vue d'ensemble serveur avec KPIs
- [ ] Graphiques activité (messages, membres, vocal)
- [ ] Stats temps réel
- [ ] Tendances (croissance, engagement)
- [ ] Prédictions AI (optionnel)

##### WebSocket Real-Time (0%)
- [ ] Connexion Socket.IO frontend ↔ Gateway
- [ ] Notifications temps réel (nouveaux membres, etc.)
- [ ] Updates membres/channels en direct
- [ ] Status bot connecté (vert/rouge)
- [ ] Service : `websocket.service.ts`

##### Tests (0%)
- [ ] Tests unitaires services (Jest/Jasmine)
- [ ] Tests guards et interceptors
- [ ] Tests E2E (Cypress/Playwright)
- [ ] Coverage > 70%

---

### Modules prévus ⏳

#### Module Automod (Modération)
- Filtrage automatique messages (spam, insultes, liens)
- Actions : warn, mute, kick, ban
- Logs des actions
- Whitelist/blacklist mots

#### Module Tickets (Support)
- Système de tickets support
- Catégories personnalisables
- Transcripts
- Statistiques temps de réponse

#### Module Leveling (Engagement)
- XP par message/vocal
- Niveaux et rôles automatiques
- Leaderboard
- Cartes de profil

#### Module Economy (Jeu)
- Monnaie virtuelle
- Système de gains (daily, work)
- Shop items/rôles
- Transactions entre membres

---

## 💾 Base de données

### Schéma PostgreSQL (Prisma)

#### Modèle complet

```prisma
// apps/backend/prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ============================================
// GUILDS (Serveurs Discord)
// ============================================

model Guild {
  guildId       String   @id @map("guild_id")
  name          String
  icon          String?
  ownerId       String   @map("owner_id")
  memberCount   Int      @default(0) @map("member_count")
  subscription  String   @default("free") // 'free' | 'premium' | 'max'
  joinedAt      DateTime @default(now()) @map("joined_at")
  leftAt        DateTime? @map("left_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  modules       GuildModule[]
  welcomeConfig WelcomeConfig?

  @@index([ownerId])
  @@index([subscription])
  @@map("guilds")
}

// ============================================
// USERS (Utilisateurs Discord)
// ============================================

model User {
  id            String   @id @default(cuid())
  discordId     String   @unique @map("discord_id")
  username      String
  discriminator String
  avatar        String?
  email         String?
  accessToken   String?  @map("access_token")
  refreshToken  String?  @map("refresh_token")
  tokenExpiry   DateTime? @map("token_expiry")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@index([discordId])
  @@map("users")
}

// ============================================
// MODULE SYSTEM
// ============================================

model GuildModule {
  id         String    @id @default(cuid())
  guildId    String    @map("guild_id")
  moduleId   String    @map("module_id")
  enabled    Boolean   @default(false)
  enabledAt  DateTime? @map("enabled_at")
  disabledAt DateTime? @map("disabled_at")
  config     Json?
  createdAt  DateTime  @default(now()) @map("created_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")

  guild Guild @relation(fields: [guildId], references: [guildId], onDelete: Cascade)

  @@unique([guildId, moduleId])
  @@index([guildId])
  @@index([enabled])
  @@map("guild_modules")
}

// ============================================
// MODULE WELCOME
// ============================================

model WelcomeConfig {
  id               String   @id @default(cuid())
  guildId          String   @unique @map("guild_id")
  channelId        String?  @map("channel_id")
  messageType      String   @default("text") @map("message_type") // 'text' | 'embed'
  messageContent   String   @map("message_content") @db.Text
  embedTitle       String?  @map("embed_title")
  embedDescription String?  @map("embed_description") @db.Text
  embedColor       String?  @map("embed_color")
  embedThumbnail   Boolean  @default(false) @map("embed_thumbnail")
  embedFooter      String?  @map("embed_footer")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  guild Guild @relation(fields: [guildId], references: [guildId], onDelete: Cascade)

  @@index([guildId])
  @@map("welcome_configs")
}

// ============================================
// À AJOUTER : Autres modules (Automod, Tickets, etc.)
// ============================================
```

### Migrations Prisma

**Créer une migration :**
```bash
cd apps/backend
npx prisma migrate dev --name nom_migration
```

**Appliquer en production :**
```bash
npx prisma migrate deploy
```

**Générer le client :**
```bash
npx prisma generate
```

### Schéma TimescaleDB (Stats)

À créer manuellement après installation TimescaleDB :

```sql
-- Extension TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================
-- STATS EVENTS (Hypertable)
-- ============================================

CREATE TABLE stats_events (
  time TIMESTAMPTZ NOT NULL,
  guild_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  user_id TEXT,
  channel_id TEXT,
  message_id TEXT,
  metadata JSONB,
  PRIMARY KEY (time, guild_id, event_type)
);

SELECT create_hypertable('stats_events', 'time');

-- Index pour requêtes fréquentes
CREATE INDEX idx_stats_events_guild ON stats_events (guild_id, time DESC);
CREATE INDEX idx_stats_events_user ON stats_events (guild_id, user_id, time DESC);
CREATE INDEX idx_stats_events_type ON stats_events (event_type, time DESC);

-- ============================================
-- CONTINUOUS AGGREGATE : 5 Minutes
-- ============================================

CREATE MATERIALIZED VIEW stats_aggregated_5min
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('5 minutes', time) AS bucket,
  guild_id,
  channel_id,
  COUNT(*) FILTER (WHERE event_type = 'MESSAGE_CREATE') AS message_count,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(*) FILTER (WHERE event_type = 'REACTION_ADD') AS reaction_count
FROM stats_events
GROUP BY bucket, guild_id, channel_id
WITH NO DATA;

-- Refresh policy (auto-update toutes les 5 min)
SELECT add_continuous_aggregate_policy('stats_aggregated_5min',
  start_offset => INTERVAL '1 hour',
  end_offset => INTERVAL '5 minutes',
  schedule_interval => INTERVAL '5 minutes');

-- ============================================
-- AGGREGATED DAILY
-- ============================================

CREATE TABLE stats_aggregated_daily (
  bucket DATE NOT NULL,
  guild_id TEXT NOT NULL,
  total_messages BIGINT DEFAULT 0,
  total_voice_minutes INTEGER DEFAULT 0,
  unique_active_users INTEGER DEFAULT 0,
  total_reactions BIGINT DEFAULT 0,
  new_members INTEGER DEFAULT 0,
  left_members INTEGER DEFAULT 0,
  PRIMARY KEY (bucket, guild_id)
);

-- Index
CREATE INDEX idx_stats_daily_guild ON stats_aggregated_daily (guild_id, bucket DESC);

-- ============================================
-- MEMBER CUMULATIVE STATS
-- ============================================

CREATE TABLE stats_member_cumulative (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  total_messages BIGINT DEFAULT 0,
  total_voice_minutes INTEGER DEFAULT 0,
  total_reactions BIGINT DEFAULT 0,
  join_date TIMESTAMPTZ,
  last_active TIMESTAMPTZ,
  PRIMARY KEY (guild_id, user_id)
);

-- Index pour leaderboards
CREATE INDEX idx_stats_member_messages ON stats_member_cumulative (guild_id, total_messages DESC);
CREATE INDEX idx_stats_member_voice ON stats_member_cumulative (guild_id, total_voice_minutes DESC);
CREATE INDEX idx_stats_member_reactions ON stats_member_cumulative (guild_id, total_reactions DESC);

-- ============================================
-- RETENTION POLICIES
-- ============================================

-- Free : 7 jours
SELECT add_retention_policy('stats_events', INTERVAL '7 days');

-- À ajuster selon plan (Free: 7j, Premium: 90j)
```

### Redis

**Structure des clés :**

```typescript
// OAuth
'oauth:state:{state}'           // State CSRF (TTL 10min)
'oauth:session:{sessionId}'     // Session temporaire (TTL 5min)

// Tokens Discord
'discord:token:{userId}'        // Cache token (TTL 1h)

// Guild cache
'guild:cache:{guildId}'         // Infos guild (TTL 5min)
'guild:members:{guildId}'       // Liste membres (TTL 10min)

// Rate limiting
'ratelimit:discord:{endpoint}'  // Rate limit Discord API
'ratelimit:api:{userId}'        // Rate limit API user

// Module configs (cache)
'module:config:{guildId}:{moduleId}' // Config module (TTL 1h)
```

**Exemple utilisation :**

```typescript
// apps/backend/src/core/redis/redis.service.ts

@Injectable()
export class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
    });
  }

  async set(key: string, value: any, ttl?: number) {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.client.setex(key, ttl, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }
}
```

---

## 🔐 Authentification & Sécurité

### OAuth Discord

**Flow complet :**

```
1. User clique "Login with Discord" (Frontend)
   └─> GET /auth/discord/login

2. Backend génère state CSRF + redirige Discord
   └─> Redis: oauth:state:{state} = {userId, timestamp}
   └─> Redirect: https://discord.com/oauth2/authorize?...

3. User autorise sur Discord

4. Discord callback
   └─> GET /auth/discord/callback?code=xxx&state=yyy

5. Backend vérifie state + échange code → tokens
   └─> POST https://discord.com/api/oauth2/token
   └─> GET https://discord.com/api/users/@me
   └─> Récupère guilds user

6. Backend crée/update user en DB
   └─> Encrypt access_token + refresh_token
   └─> Génère JWT

7. Backend crée session temporaire
   └─> Redis: oauth:session:{sessionId} = {jwt, userId}
   └─> Redirect: http://frontend/auth/callback?session=xxx

8. Frontend récupère JWT
   └─> POST /auth/exchange-session {sessionId}
   └─> Stocke JWT en localStorage
   └─> Redirige vers dashboard
```

### Backend Auth

**Fichiers :**
```
apps/backend/src/core/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── discord.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── guild-admin.guard.ts
└── dto/
    ├── login.dto.ts
    └── token.dto.ts
```

**JWT Strategy :**
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
```

**Guards :**

1. **JwtAuthGuard** : Vérifie JWT valide
```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// Usage
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@Request() req) {
  return req.user;
}
```

2. **GuildAdminGuard** : Vérifie permissions admin sur guild
```typescript
@Injectable()
export class GuildAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const guildId = request.params.guildId;

    // Vérifier si user est admin de la guild
    const guilds = await this.discordService.getUserGuilds(user.id);
    const guild = guilds.find(g => g.id === guildId);

    if (!guild) return false;

    // Vérifier permissions ADMINISTRATOR
    const permissions = BigInt(guild.permissions);
    const ADMINISTRATOR = 1n << 3n;
    
    return (permissions & ADMINISTRATOR) === ADMINISTRATOR;
  }
}

// Usage
@UseGuards(JwtAuthGuard, GuildAdminGuard)
@Post('guilds/:guildId/modules/enable')
enableModule(@Param('guildId') guildId: string, @Body() dto: any) {
  // User est authentifié ET admin de la guild
}
```

### Encryption des tokens

```typescript
// apps/backend/src/core/auth/encryption.service.ts

import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private algorithm = 'aes-256-cbc';
  private key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(encrypted: string): string {
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Usage
async saveTokens(userId: string, accessToken: string, refreshToken: string) {
  const encryptedAccess = this.encryption.encrypt(accessToken);
  const encryptedRefresh = this.encryption.encrypt(refreshToken);
  
  await this.prisma.user.update({
    where: { id: userId },
    data: {
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
    },
  });
}
```

### Variables d'environnement sensibles

```env
# apps/backend/.env

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRATION=7d

# Encryption
ENCRYPTION_KEY=64_character_hex_key_here

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_CALLBACK_URL=http://localhost:3000/api/auth/discord/callback

# Discord Bot
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_BOT_INTENTS=32767  # All intents

# Frontend
FRONTEND_URL=http://localhost:4200
```

**Générer clés :**
```bash
# JWT Secret (256 bits)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Encryption Key (256 bits hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### CORS

```typescript
// apps/backend/src/main.ts

app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

---

## 📊 Monitoring

### Stack Grafana Loki

**Architecture :**

```
Winston Logger (NestJS)
  → Loki Transport
  → Loki (Aggregation)
  → Grafana (Visualization)
```

### Configuration Winston

```typescript
// apps/backend/src/core/logging/winston.config.ts

import winston from 'winston';
import LokiTransport from 'winston-loki';

export const createLogger = (app: string) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: app },
    transports: [
      // Console (dev)
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
      
      // Loki (prod)
      new LokiTransport({
        host: process.env.LOKI_HOST,
        labels: { app },
        json: true,
        batching: true,
        interval: 5,
      }),
    ],
  });
};
```

### Labels Loki

**Structure des logs :**
```json
{
  "app": "backend" | "gateway" | "bot",
  "level": "info" | "warn" | "error",
  "context": "ModuleService" | "AuthController" | "GatewayClient",
  "guildId": "123456789",
  "userId": "987654321",
  "message": "Module enabled",
  "timestamp": "2025-11-07T10:30:00.000Z"
}
```

### Requêtes LogQL

**Exemples de requêtes :**

```logql
# Tous les logs d'un app
{app="backend"}

# Erreurs backend
{app="backend"} |= "level=error"

# Logs d'un module
{app="backend", context="WelcomeService"}

# Events d'une guild
{app="bot"} | json | guildId="123456789"

# Rate d'erreurs (15min)
rate({app="backend"} |= "level=error" [15m])

# Top 10 contextes avec erreurs
topk(10, sum by (context) (count_over_time({app="backend"} |= "level=error" [1h])))
```

### Dashboard Grafana

**Panels recommandés :**

1. **Logs Stream** : Flux temps réel des logs
2. **Error Rate** : Taux d'erreurs par app
3. **Request Duration** : Latence API p50/p95/p99
4. **Active Guilds** : Nombre de guilds actives
5. **Module Activations** : Activations de modules
6. **Gateway Connections** : Bots connectés

---

## 🚀 État actuel du projet

### ✅ Complété

#### Infrastructure
- [x] Monorepo configuré (NestJS + SapphireJS + Angular)
- [x] PostgreSQL + Prisma ORM
- [x] Redis pour cache
- [x] TimescaleDB pour stats
- [x] Docker Compose pour dev
- [x] Winston + Loki pour logs

#### Backend
- [x] Architecture modulaire
- [x] Module System (Registry, Manager)
- [x] Auth Discord OAuth 2.0
- [x] JWT + Guards
- [x] Discord API client (Guilds, Channels, Members, Roles, Bans)
- [x] Rate limiting Discord
- [x] Gateway WebSocket client

#### Gateway
- [x] Hub Socket.IO
- [x] Gestion connexions multiples
- [x] Routage Backend ↔ Bots
- [x] Events : register, to-backend, to-bot, module:change
- [x] BotConnectionService

#### Bot
- [x] SapphireJS framework
- [x] WebSocket client Gateway
- [x] Event batching (5s / 100 events)
- [x] Backup SQLite offline
- [x] Module Loader
- [x] Config Sync Backend ↔ Bot

#### Module Welcome
- [x] Backend complet (Service, Controller, DTO)
- [x] Bot complet (Module, Listener)
- [x] Config sync opérationnelle
- [x] End-to-end testé
- [x] Documentation

#### Module Stats
- [x] Définition module
- [x] Schéma TimescaleDB
- [x] Backend : StatsEventsService (~80%)
- [x] Backend : StatsAggregationService (~70%)
- [x] Backend : StatsQueryService (~60%)
- [x] Backend : StatsController (5 endpoints)

### 🔄 En cours

#### Module Stats
- [ ] Tests Backend (StatsEventsService, StatsAggregationService, StatsQueryService)
- [ ] Tests E2E API
- [ ] Bot : Listeners (MESSAGE_CREATE, VOICE_STATE_UPDATE, REACTION_ADD, etc.)
- [ ] Bot : Integration avec Backend
- [ ] Frontend : Dashboard stats
- [ ] Frontend : Timeline charts
- [ ] Frontend : Leaderboards

### ⏳ À faire

#### Frontend Angular
- [ ] Architecture routing
- [ ] Auth guard + JWT interceptor
- [ ] Dashboard principal
- [ ] Liste guilds
- [ ] Page configuration module Welcome
- [ ] Page configuration module Stats
- [ ] Composants réutilisables (MessageEditor, ChannelSelector, MetricCard, etc.)

#### Modules additionnels
- [ ] Module Automod (Modération)
- [ ] Module Tickets (Support)
- [ ] Module Leveling (Engagement)
- [ ] Module Economy (Jeu)

#### Déploiement
- [ ] Scripts de déploiement
- [ ] CI/CD GitHub Actions
- [ ] Docker production
- [ ] Reverse proxy Nginx
- [ ] SSL/TLS
- [ ] Monitoring Prometheus
- [ ] Backups automatiques

---

## 🛠️ Guide de développement

### Installation

```bash
# Clone le repo
git clone https://github.com/your-username/discord-admin-app.git
cd discord-admin-app

# Installer dépendances
npm install

# Copier .env.example vers .env dans chaque app
cp apps/backend/.env.example apps/backend/.env
cp apps/gateway/.env.example apps/gateway/.env
cp apps/bot/.env.example apps/bot/.env
cp apps/frontend/src/environments/environment.example.ts apps/frontend/src/environments/environment.ts

# Configurer les variables d'environnement
# Éditer les fichiers .env avec vos valeurs

# Démarrer PostgreSQL + Redis + TimescaleDB
docker-compose up -d

# Migrations Prisma
cd apps/backend
npx prisma migrate dev
npx prisma generate
cd ../..

# Créer tables TimescaleDB
psql -U postgres -d discord_admin -f docs/database/timescaledb-setup.sql
```

### Développement

**Démarrer tous les services :**

```bash
# Terminal 1 : Backend
npm run dev:backend

# Terminal 2 : Gateway
npm run dev:gateway

# Terminal 3 : Bot
npm run dev:bot

# Terminal 4 : Frontend
npm run dev:frontend
```

**Ou avec PM2 :**
```bash
pm2 start ecosystem.config.js
pm2 logs
```

### Créer un nouveau module

**1. Créer la définition (Shared Types) :**
```typescript
// packages/shared-types/src/modules/my-module.definition.ts
export const MY_MODULE: ModuleDefinition = {
  id: 'my-module',
  name: 'My Module',
  description: 'Description',
  category: ModuleCategory.UTILITY,
  availability: { free: true, premium: true, max: true },
  limits: {
    free: { resource: 10 },
    premium: { resource: -1 },
  },
  runtime: { backend: true, bot: true },
  version: '1.0.0',
};
```

**2. Créer le Backend :**
```bash
cd apps/backend/src/modules
mkdir my-module
cd my-module

# Créer les fichiers
touch my-module.module.ts
touch my-module.definition.ts
touch my-module.service.ts
touch my-module.controller.ts
mkdir dto
touch dto/create-my-module.dto.ts
```

**3. Implémenter Service + Controller :**
```typescript
// my-module.service.ts
@Injectable()
export class MyModuleService {
  constructor(
    private prisma: PrismaService,
    private gatewayClient: GatewayClientService,
  ) {}

  async upsertConfig(guildId: string, dto: CreateMyModuleDto) {
    // 1. Valider
    // 2. Sauvegarder DB
    const config = await this.prisma.myModuleConfig.upsert({...});
    
    // 3. Notifier Bot
    await this.gatewayClient.notifyModuleChange({
      guildId,
      moduleId: 'my-module',
      action: 'config_updated',
      config,
    });
    
    return config;
  }
}

// my-module.controller.ts
@Controller('my-module')
@UseGuards(JwtAuthGuard, GuildAdminGuard)
export class MyModuleController {
  constructor(private service: MyModuleService) {}

  @Get(':guildId')
  getConfig(@Param('guildId') guildId: string) {
    return this.service.getConfig(guildId);
  }

  @Post(':guildId')
  upsertConfig(@Param('guildId') guildId: string, @Body() dto: CreateMyModuleDto) {
    return this.service.upsertConfig(guildId, dto);
  }
}
```

**4. Enregistrer dans ModuleSystemModule :**
```typescript
// apps/backend/src/core/module-system/module-system.module.ts
import { MY_MODULE } from 'src/modules/my-module/my-module.definition';

@Module({...})
export class ModuleSystemModule implements OnModuleInit {
  onModuleInit() {
    this.moduleRegistry.register(WELCOME_MODULE);
    this.moduleRegistry.register(MY_MODULE); // ← AJOUTER
  }
}
```

**5. Créer le Bot Module :**
```bash
cd apps/bot/src/modules
mkdir my-module
cd my-module

touch my-module.module.ts
mkdir listeners
touch listeners/example.listener.ts
```

```typescript
// my-module.module.ts
import { BotModule } from '../module-loader/bot-module.interface';

export class MyModuleBotModule implements BotModule {
  public readonly id = 'my-module';
  public readonly name = 'My Module';
  
  private configs = new Map<string, any>();

  async onLoad(guildId: string, config?: any) {
    if (config) {
      this.configs.set(guildId, config);
    }
    console.log(`[MY_MODULE] Loaded for guild ${guildId}`);
  }

  async onUnload(guildId: string) {
    this.configs.delete(guildId);
    console.log(`[MY_MODULE] Unloaded for guild ${guildId}`);
  }

  async onConfigUpdate(guildId: string, config: any) {
    this.configs.set(guildId, config);
    console.log(`[MY_MODULE] Config updated for guild ${guildId}`);
  }

  getConfig(guildId: string) {
    return this.configs.get(guildId);
  }
}

export const myModuleBotModule = new MyModuleBotModule();
```

**6. Créer les Listeners (si nécessaire) :**
```typescript
// listeners/example.listener.ts
import { Listener } from '@sapphire/framework';
import { Events, Message } from 'discord.js';
import { myModuleBotModule } from '../my-module.module';

export class ExampleListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.MessageCreate,
    });
  }

  public async run(message: Message) {
    if (!message.guildId) return;

    const config = myModuleBotModule.getConfig(message.guildId);
    if (!config) return;

    // Ta logique ici
    console.log(`[MY_MODULE] Message received in guild ${message.guildId}`);
  }
}
```

**7. Enregistrer dans le Bot :**
```typescript
// apps/bot/src/services/bot-startup.service.ts
import { myModuleBotModule } from './modules/my-module/my-module.module';

private async registerModules() {
  moduleLoader.register(welcomeModule);
  moduleLoader.register(myModuleBotModule); // ← AJOUTER
  
  await moduleLoader.loadAllModules();
}
```

**8. Tester End-to-End :**
```bash
# Démarrer Backend, Gateway, Bot

# Activer le module
curl -X POST http://localhost:3000/modules/YOUR_GUILD_ID/enable \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"moduleId": "my-module"}'

# Configurer
curl -X POST http://localhost:3000/my-module/YOUR_GUILD_ID \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"setting": "value"}'

# Vérifier logs Bot
# Devrait afficher : [MY_MODULE] Config updated for guild YOUR_GUILD_ID
```

### Tests

```bash
# Tests unitaires Backend
cd apps/backend
npm run test
npm run test:cov

# Tests E2E Backend
npm run test:e2e

# Tests Bot
cd apps/bot
npm run test

# Tests Frontend
cd apps/frontend
npm run test
```

### Commandes utiles

```bash
# Prisma
npx prisma studio              # UI pour explorer DB
npx prisma migrate dev         # Créer migration
npx prisma migrate deploy      # Appliquer en prod
npx prisma generate            # Générer client

# PM2
pm2 start ecosystem.config.js  # Démarrer tous les services
pm2 logs                       # Voir logs
pm2 logs backend               # Logs d'un service
pm2 monit                      # Monitoring
pm2 restart all                # Redémarrer
pm2 stop all                   # Arrêter

# Docker
docker-compose up -d           # Démarrer DB
docker-compose down            # Arrêter DB
docker-compose logs -f         # Logs

# Build
npm run build                  # Build tous les apps
npm run build:backend          # Build backend uniquement
```

---

## 📚 Ressources

### Documentation officielle

- [NestJS](https://docs.nestjs.com/)
- [Prisma](https://www.prisma.io/docs/)
- [SapphireJS](https://www.sapphirejs.dev/)
- [Discord.js](https://discord.js.org/)
- [Angular](https://angular.dev/)
- [PrimeNG](https://primeng.org/)
- [Socket.IO](https://socket.io/docs/)
- [TimescaleDB](https://docs.timescale.com/)

### Documentation interne

- `README.md` - Vue d'ensemble projet
- `docs/modules/MODULE_CREATION_GUIDE.md` - Guide création module
- `docs/modules/config-sync/CONFIG_SYNC_SYSTEM.md` - Système sync config
- `docs/monitoring/MONITORING_DOC.md` - Setup Grafana Loki
- `docs/modules/welcome/WELCOME_FRONTEDN_GUIDE.md` - Frontend Welcome
- `docs/modules/stats/STATS_MODULE_IMPLEMENTATION.md` - Implémentation Stats

---

## 🎯 Prochaines étapes recommandées

### Court terme (1-2 semaines)

1. **Finaliser Module Stats**
   - Compléter tests Backend (80%)
   - Implémenter listeners Bot (0%)
   - Créer Frontend dashboard (0%)

2. **Frontend Welcome**
   - Page configuration Welcome
   - Composants MessageEditor, ChannelSelector
   - Preview message en temps réel

3. **Tests E2E**
   - Tests Module Welcome end-to-end
   - Tests Module Stats end-to-end
   - Tests Gateway communication

### Moyen terme (1 mois)

4. **Module Automod**
   - Backend + Bot
   - Filtrage spam/insultes/liens
   - Actions automatiques (warn, mute, kick, ban)

5. **Module Tickets**
   - Système de tickets support
   - Transcripts
   - Stats temps de réponse

6. **Dashboard Frontend**
   - Vue d'ensemble guilds
   - Statistiques générales
   - Navigation modules

### Long terme (2-3 mois)

7. **Module Leveling**
   - XP par message/vocal
   - Niveaux et rôles automatiques
   - Cartes de profil

8. **Module Economy**
   - Monnaie virtuelle
   - Gains (daily, work)
   - Shop items/rôles

9. **Production**
   - CI/CD
   - Déploiement VPS
   - Monitoring production
   - Backups automatiques

---

## 💡 Notes importantes

### Points d'attention

- **Rate Limiting Discord** : Ne pas dépasser 50 req/s global
- **Intents Bot** : Nécessite `GUILD_MEMBERS` et `MESSAGE_CONTENT` (privilégiés)
- **Encryption** : Toujours encrypt les tokens Discord en DB
- **CORS** : Bien restreindre en production
- **Limites Free/Premium** : Toujours vérifier avant activation module

### Conventions de code

- **Naming** : camelCase pour variables/méthodes, PascalCase pour classes
- **Commits** : `feat(module): description` / `fix(module): description`
- **Branches** : `feature/nom-feature` / `bugfix/nom-bug`
- **Logs** : Utiliser Winston avec contexte approprié
- **Errors** : Toujours throw des HttpException NestJS

### Performance

- **Batching** : Bot envoie events par batch (5s / 100)
- **Cache** : Redis pour guilds/tokens (TTL 5min)
- **DB Indexes** : Toujours indexer guildId, userId, timestamp
- **TimescaleDB** : Continuous Aggregates pour stats
- **Rate Limiting** : Implémenter sur API publiques

---

**Document créé le** : 07 Novembre 2025  
**Version** : 1.0  
**Auteur** : Discord Admin App Team

**Ce document doit être fourni à Claude au début de chaque conversation pour garantir une compréhension complète du projet et faciliter la collaboration.**