# 📚 Documentation - Application d'Administration/Modération Discord

> **Version:** 1.0.0  
> **Dernière mise à jour:** Octobre 2025  
> **Stack:** Angular 20 · NestJS · SapphireJS · PostgreSQL · Redis

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture du Projet](#architecture-du-projet)
3. [Technologies Utilisées](#technologies-utilisées)
4. [Structure du Monorepo](#structure-du-monorepo)
5. [Composants Détaillés](#composants-détaillés)
6. [Installation et Configuration](#installation-et-configuration)
7. [Développement](#développement)
8. [Base de Données](#base-de-données)
9. [Authentification & Sécurité](#authentification--sécurité)
10. [Communication Inter-Services](#communication-inter-services)
11. [Intégration Discord API](#intégration-discord-api)
12. [Déploiement](#déploiement)
13. [Maintenance et Monitoring](#maintenance-et-monitoring)

---

## 🎯 Vue d'ensemble

### Objectif

Application web complète permettant l'administration et la modération de serveurs Discord avec une interface moderne et intuitive.

### Caractéristiques Principales

- ✅ **Authentification Discord OAuth 2.0** - Connexion sécurisée via Discord
- ✅ **Gestion Multi-Serveurs** - Administration de plusieurs serveurs Discord
- ✅ **Communication Temps Réel** - Synchronisation bidirectionnelle entre le bot et le backend
- ✅ **Architecture Scalable** - Supporte plusieurs instances de bot et backend
- ✅ **Interface Moderne** - UI responsive basée sur PrimeNG et TailwindCSS
- ✅ **Système d'Events** - Écoute et traitement d'événements Discord
- ✅ **Batch Processing** - Envoi optimisé d'événements par paquets
- ✅ **Persistance Locale** - Sauvegarde SQLite en cas de perte de connexion

---

## 🏗️ Architecture du Projet

Le projet suit une architecture **microservices** avec 4 composants principaux :

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│                    (Angular 20 + PrimeNG)                    │
│                      Port: 4200                              │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST
                       │ WebSocket (futur)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                              │
│                      (NestJS + Prisma)                       │
│              Auth · API · Business Logic                     │
│                      Port: 3000                              │
└──────┬──────────────────────────────┬───────────────────────┘
       │ PostgreSQL                   │ Socket.io
       │                              │
       ▼                              ▼
┌──────────────┐         ┌────────────────────────────────────┐
│  PostgreSQL  │         │          GATEWAY                   │
│   Database   │         │         (NestJS)                   │
│              │         │   WebSocket Hub & Router           │
│              │         │        Port: 3001                  │
└──────────────┘         └──────────┬─────────────────────────┘
       ▲                            │ Socket.io
       │                            │
       │                            ▼
       │                 ┌────────────────────────────────────┐
       │                 │           BOT                      │
       │                 │        (SapphireJS)                │
       └─────────────────┤  Event Listener · Commands         │
                 SQLite  │  Batcher · Offline Backup          │
                         └────────────────────────────────────┘
```

### Flux de Données

#### 1. Authentification
```
Frontend → Backend (OAuth) → Discord API → Backend → PostgreSQL
                           ↓
                      JWT Tokens → Frontend
```

#### 2. Événements Discord
```
Discord → Bot → EventBatcher → Gateway → Backend → PostgreSQL
                    ↓ (si déconnecté)
                 SQLite
```

#### 3. Commandes vers Bot
```
Frontend → Backend → Gateway → Bot → Discord
```

---

## 🛠️ Technologies Utilisées

### Frontend (`apps/frontend`)
| Technologie | Version | Usage |
|------------|---------|-------|
| **Angular** | 20 | Framework principal |
| **PrimeNG** | 20 | Composants UI |
| **TailwindCSS** | - | Styling utilitaire |
| **Sakai Template** | - | Template de base |
| **RxJS** | - | Gestion réactive |
| **TypeScript** | 5+ | Typage fort |

### Backend (`apps/backend`)
| Technologie | Version | Usage |
|------------|---------|-------|
| **NestJS** | 10+ | Framework backend |
| **Prisma** | 5+ | ORM PostgreSQL |
| **Passport** | - | Auth Discord OAuth |
| **JWT** | - | Gestion tokens |
| **Socket.io Client** | 4+ | Communication Gateway |
| **Redis** | 7+ | Cache & Sessions OAuth |
| **bcrypt** | - | Hashing |
| **crypto** | - | Encryption tokens |

### Gateway (`apps/gateway`)
| Technologie | Version | Usage |
|------------|---------|-------|
| **NestJS** | 10+ | Framework |
| **Socket.io** | 4+ | WebSocket Server |

### Bot (`apps/bot`)
| Technologie | Version | Usage |
|------------|---------|-------|
| **SapphireJS** | 5+ | Framework Discord.js |
| **Discord.js** | 14+ | Bibliothèque Discord |
| **Socket.io Client** | 4+ | Communication Gateway |
| **better-sqlite3** | - | Base locale événements |
| **TypeScript** | 5+ | Typage fort |

### Shared (`packages/shared-types`)
| Technologie | Usage |
|------------|-------|
| **TypeScript** | DTOs partagés |

### Base de Données
| Technologie | Usage |
|------------|-------|
| **PostgreSQL** | Base principale (Users, Guilds, etc.) |
| **Redis** | Sessions OAuth & Cache tokens |
| **SQLite** | Backup local événements (Bot) |

---

## 📁 Structure du Monorepo

```
discord-admin-app/
│
├── apps/
│   ├── frontend/                    # Application Angular
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout/         # Composants layout (header, menu, footer)
│   │   │   │   ├── pages/          # Pages de l'application
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── auth/       # Login, callback
│   │   │   │   │   └── guilds/     # Gestion serveurs
│   │   │   │   ├── services/       # Services (Auth, API)
│   │   │   │   ├── interceptors/   # HTTP interceptors
│   │   │   │   ├── guards/         # Route guards
│   │   │   │   └── models/         # Interfaces TypeScript
│   │   │   └── assets/
│   │   │       ├── layout/         # SCSS layout Sakai
│   │   │       └── demo/           # Assets demo
│   │   └── ...
│   │
│   ├── backend/                     # API NestJS
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/           # Auth OAuth Discord
│   │   │   │   │   ├── controllers/
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   │   ├── discord-oauth.service.ts
│   │   │   │   │   │   ├── oauth-state.service.ts (Redis)
│   │   │   │   │   │   ├── oauth-session.service.ts (Redis)
│   │   │   │   │   │   ├── discord-token.service.ts
│   │   │   │   │   │   └── encryption.service.ts
│   │   │   │   │   ├── guards/
│   │   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   │   └── guild-admin.guard.ts
│   │   │   │   │   └── strategies/
│   │   │   │   ├── discord/        # Intégration Discord API
│   │   │   │   │   ├── core/       # Services de base
│   │   │   │   │   ├── common/     # Constants, exceptions
│   │   │   │   │   ├── resources/  # Guilds, Channels, Members, etc.
│   │   │   │   │   └── config/
│   │   │   │   ├── gateway/        # Client Gateway
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── gatewayClient.service.ts
│   │   │   │   │   │   ├── bot-event-handler.service.ts
│   │   │   │   │   │   └── bot-command-sender.service.ts
│   │   │   │   │   └── controllers/
│   │   │   │   ├── guilds/         # Gestion Guilds DB
│   │   │   │   │   └── guilds-db.service.ts
│   │   │   │   ├── prisma/         # Prisma ORM
│   │   │   │   └── redis/          # Redis connexion
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma       # Schéma base de données
│   │   └── ...
│   │
│   ├── gateway/                     # Hub WebSocket
│   │   ├── src/
│   │   │   ├── bot/
│   │   │   │   └── bot.gateway.ts  # WebSocket Gateway
│   │   │   ├── services/
│   │   │   │   └── bot-connection.service.ts
│   │   │   └── main.ts
│   │   └── ...
│   │
│   └── bot/                         # Bot Discord
│       ├── src/
│       │   ├── commands/            # Commandes slash
│       │   ├── listeners/           # Event listeners
│       │   │   ├── ready.ts
│       │   │   ├── guildCreate.ts
│       │   │   ├── guildUpdate.ts
│       │   │   ├── guildDelete.ts
│       │   │   └── messageCreate.ts
│       │   ├── services/
│       │   │   ├── websocket.service.ts
│       │   │   └── eventBatcher.service.ts
│       │   ├── lib/
│       │   │   ├── setup.ts
│       │   │   └── constants.ts
│       │   └── index.ts
│       ├── data/
│       │   └── events.db           # SQLite backup
│       └── ...
│
├── packages/
│   └── shared-types/                # DTOs partagés
│       ├── src/
│       │   ├── auth/               # Auth DTOs
│       │   ├── discord/            # Discord DTOs
│       │   │   ├── guild.dto.ts
│       │   │   ├── channel.dto.ts
│       │   │   ├── member.dto.ts
│       │   │   ├── message.dto.ts
│       │   │   ├── role.dto.ts
│       │   │   └── user.dto.ts
│       │   ├── events/             # Event DTOs
│       │   │   └── bot-event.dto.ts
│       │   └── index.ts
│       └── package.json
│
├── docker-compose.yml
├── package.json
└── README.md
```

---

## 🔧 Composants Détaillés

### 1️⃣ Frontend (Angular 20)

#### Architecture Frontend

**Pattern Facade**: Les services utilisent un pattern en 3 couches :
- **Facade Service** : Interface publique pour les composants
- **API Service** : Gestion des appels HTTP
- **Data Service** : Gestion de l'état et du cache

```typescript
// Exemple: AuthFacadeService
export class AuthFacadeService {
  constructor(
    private authApiService: AuthApiService,
    private authDataService: AuthDataService
  ) {}

  login() { /* ... */ }
  getCurrentUser() { return this.authDataService.currentUser$; }
}
```

#### Template Sakai

Le frontend est basé sur le template **Sakai** de PrimeNG :
- **Layout** : `apps/frontend/src/app/layout/`
- **Composants démo** : Fichiers suffixés par `*demo.ts`
- **Styles** : `src/assets/layout/`

#### Guards et Interceptors

- **AuthGuard** : Protège les routes authentifiées
- **GuildGuard** : Vérifie les permissions sur une guild
- **AuthInterceptor** : Ajoute le JWT aux requêtes HTTP

#### Routes Principales

```typescript
{
  path: '',
  component: AppLayoutComponent,
  children: [
    { path: 'dashboard', component: DashboardComponent },
    { path: 'guilds', component: GuildsComponent },
    { path: 'guilds/:id', component: GuildDetailComponent }
  ]
},
{
  path: 'auth',
  children: [
    { path: 'login', component: LoginComponent },
    { path: 'callback', component: CallbackComponent }
  ]
}
```

---

### 2️⃣ Backend (NestJS)

#### Responsabilités

- **Cerveau de l'application**
- Authentification OAuth Discord
- Gestion des tokens (JWT + Discord)
- Appels à l'API Discord
- Communication bidirectionnelle avec le Bot via Gateway
- Gestion de la base PostgreSQL

#### Modules Principaux

##### 📦 Module Auth

**Services clés** :

1. **AuthService** (`auth.service.ts`)
   - Gère le flux OAuth complet
   - Création/refresh des JWT
   - CRUD utilisateurs

2. **DiscordOAuthService** (`discord-oauth.service.ts`)
   - Échange code OAuth contre tokens
   - Refresh tokens Discord
   - Récupération profil utilisateur

3. **OAuthStateService** (`oauth-state.service.ts`)
   - Protection CSRF via state tokens
   - Stockage Redis (TTL: 10 min)
   - One-time use validation

4. **OAuthSessionService** (`oauth-session.service.ts`)
   - Sessions temporaires OAuth
   - Échange sécurisé sessionId → tokens
   - TTL: 5 minutes

5. **DiscordTokenService** (`discord-token.service.ts`)
   - Cache tokens Discord en mémoire
   - Refresh automatique si expirés
   - Décryptage à la demande

6. **EncryptionService** (`encryption.service.ts`)
   - Chiffrement AES-256-GCM
   - Protection tokens Discord en DB

**Guards** :
- `JwtAuthGuard` : Vérifie JWT valide
- `GuildAdminGuard` : Vérifie droits ADMINISTRATOR sur guild

##### 📦 Module Discord

Intégration complète de l'API Discord avec rate limiting :

**Structure** :
```
discord/
├── core/
│   ├── discord-api.service.ts        # Service HTTP principal
│   └── discord-rate-limiter.service.ts # Gestion rate limits
├── common/
│   ├── constants/                     # Endpoints, error codes
│   ├── exceptions/                    # Custom exceptions
│   ├── filters/                       # Exception filters
│   └── interceptors/                  # Response interceptors
├── resources/
│   ├── guilds/                        # Guilds endpoints
│   ├── channels/                      # Channels endpoints
│   ├── members/                       # Members endpoints
│   ├── roles/                         # Roles endpoints
│   ├── bans/                          # Bans endpoints
│   └── users/                         # Users endpoints
└── config/
    └── discord.config.ts
```

**Rate Limiting** :
- Par bucket (guild, channel, user)
- Respect des limites Discord
- Retry automatique avec backoff

##### 📦 Module Gateway

**Services** :

1. **GatewayClientService** (`gatewayClient.service.ts`)
   - Client Socket.io vers Gateway
   - Enregistrement comme "backend"
   - Envoi commandes vers bots
   - Réception événements des bots

2. **BotEventHandlerService** (`bot-event-handler.service.ts`)
   - Traitement des événements reçus
   - Mise à jour PostgreSQL
   - Gestion des types :
     - `GuildSync` : Synchronisation complète
     - `GuildCreate` : Nouveau serveur
     - `GuildUpdate` : Mise à jour serveur
     - `GuildDelete` : Retrait serveur
     - `MessageCreate` : Nouveau message

3. **BotCommandSenderService** (`bot-command-sender.service.ts`)
   - Envoi de commandes aux bots
   - Ping, status, actions...

##### 📦 Module Guilds DB

**GuildsDbService** :
- Requêtes PostgreSQL pour Guilds
- Vérification permissions utilisateur
- CRUD Guilds

##### 📦 Module Prisma

Service de connexion à PostgreSQL via Prisma ORM.

##### 📦 Module Redis

Service de connexion Redis pour :
- Sessions OAuth
- State tokens CSRF
- Cache tokens Discord

---

### 3️⃣ Gateway (NestJS)

#### Responsabilités

- **Hub central de communication WebSocket**
- Routage messages Backend ↔ Bots
- Gestion connexions multiples
- Support multi-instances

#### Architecture

```typescript
@WebSocketGateway({
  cors: { origin: '*' }  // À restreindre en prod
})
export class BotGateway {
  @SubscribeMessage('register')
  handleRegister() { /* ... */ }

  @SubscribeMessage('to-backend')
  handleBotToBackend() { /* ... */ }

  @SubscribeMessage('to-bot')
  handleBackendToBot() { /* ... */ }

  @SubscribeMessage('broadcast-to-bots')
  handleBroadcastToBots() { /* ... */ }
}
```

#### BotConnectionService

Gestion des connexions actives :
```typescript
interface ConnectedBot {
  id: string;
  name: string;
  socket: Socket;
  connectedAt: Date;
  lastHeartbeat: Date;
}
```

Méthodes :
- `registerBot()`
- `unregisterBot()`
- `sendToBot()`
- `broadcastToAllBots()`
- `getAllBots()`

#### Flux de Messages

**Bot → Backend** :
```
Bot emit('to-backend', event)
  → Gateway reçoit
  → Gateway emit vers backendSocket
  → Backend reçoit et traite
```

**Backend → Bot** :
```
Backend emit('to-bot', {botId, data})
  → Gateway reçoit
  → Gateway trouve bot socket
  → Gateway emit vers bot
  → Bot reçoit et exécute
```

---

### 4️⃣ Bot (SapphireJS)

#### Responsabilités

- **Écouter les événements Discord**
- Exécuter des commandes
- Envoyer événements au Backend via Gateway
- Batch processing des événements
- Backup local si Gateway déconnectée

#### Architecture SapphireJS

**Framework** : Basé sur Discord.js avec structure organisée

**Container** : Injection de dépendances globale
```typescript
this.container.client    // Client Discord.js
this.container.logger    // Logger
this.container.ws        // WebSocketService
this.container.eventBatcher  // EventBatcher
```

#### Services Principaux

##### WebSocketService (`websocket.service.ts`)

Gère la connexion à la Gateway :

```typescript
export class WebSocketService {
  private socket: Socket;
  private eventBatcher: EventBatcher;

  connect() {
    this.socket = io(GATEWAY_URL);
    
    this.socket.on('connect', () => {
      this.socket.emit('register', {
        type: 'bot',
        botId: process.env.BOT_ID,
        botName: 'Discord Bot'
      });
    });

    this.socket.on('from-backend', (data) => {
      // Traiter commandes du backend
    });
  }

  sendToBackend(events: BotEventDto[]) {
    if (this.socket.connected) {
      this.socket.emit('to-backend', events);
    } else {
      this.eventBatcher.saveOffline(events);
    }
  }
}
```

##### EventBatcher (`eventBatcher.service.ts`)

Optimise l'envoi d'événements :

**Caractéristiques** :
- Batch toutes les 5 secondes
- Maximum 100 événements par batch
- Sauvegarde SQLite si Gateway déconnectée
- Restauration automatique à la reconnexion

**Schema SQLite** :
```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  guildId TEXT,
  userId TEXT,
  channelId TEXT,
  data TEXT,
  timestamp INTEGER NOT NULL,
  sent INTEGER DEFAULT 0
);
```

**Méthodes** :
```typescript
addEvent(event: BotEventDto)
flushBatch()
saveOffline(events: BotEventDto[])
restoreOfflineEvents()
```

#### Listeners Principaux

##### ready.ts

Démarrage du bot :
- Affichage banner
- Log des stores chargés
- Initialisation EventBatcher
- Envoi `GuildSync` avec toutes les guilds

##### guildCreate.ts

Nouveau serveur :
```typescript
run(guild: Guild) {
  const event: BotEventDto = {
    type: EventType.GuildCreate,
    guildId: guild.id,
    data: {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      ownerId: guild.ownerId,
      memberCount: guild.memberCount
    },
    timestamp: Date.now()
  };
  this.container.ws.sendToBackend([event]);
}
```

##### guildUpdate.ts

Mise à jour serveur :
- Détecte changements (nom, icon, owner, memberCount)
- Envoie `GuildUpdate` avec nouvelles données
- Log des changements pour debug

##### guildDelete.ts

Retrait du serveur :
- Envoie `GuildDelete`
- Backend marque guild comme `isActive: false`

##### messageCreate.ts

Nouveau message :
- Filtre : ignore bots, DMs, messages système
- Envoie `MessageCreate` avec contenu message
- Peut être étendu pour modération automatique

#### Configuration Intents

Tous les intents nécessaires sont activés :
```typescript
intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildBans,
  // ... tous les autres
]
```

---

### 5️⃣ Shared Types (`packages/shared-types`)

#### Objectif

Centraliser les **DTOs** (Data Transfer Objects) partagés entre tous les services du monorepo.

#### Structure

```
shared-types/src/
├── auth/
│   ├── user.dto.ts
│   ├── jwt-payload.dto.ts
│   └── auth-response.dto.ts
├── discord/
│   ├── guild.dto.ts
│   ├── channel.dto.ts
│   ├── member.dto.ts
│   ├── message.dto.ts
│   ├── role.dto.ts
│   └── user.dto.ts
├── events/
│   └── bot-event.dto.ts
└── index.ts
```

#### Exemples de DTOs

**GuildDTO** :
```typescript
export interface GuildDTO {
  id: string;
  name: string;
  icon: string | null;
  ownerId: string;
  memberCount?: number;
  joined_at?: Date;
}
```

**BotEventDto** :
```typescript
export enum EventType {
  GuildSync = 'guild_sync',
  GuildCreate = 'guild_create',
  GuildUpdate = 'guild_update',
  GuildDelete = 'guild_delete',
  MessageCreate = 'message_create'
}

export interface BotEventDto {
  type: EventType;
  guildId: string;
  userId?: string;
  channelId?: string;
  data: any;
  timestamp: number;
}
```

**UserDTO** :
```typescript
export interface UserDTO {
  id: string;
  discordId: string;
  username: string;
  discriminator: string | null;
  globalName: string | null;
  avatar: string | null;
  email: string | null;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  createdAt: string;
  lastLoginAt: string;
}
```

---

## ⚙️ Installation et Configuration

### Prérequis

- **Node.js** : v20+
- **npm** ou **yarn**
- **PostgreSQL** : 15+
- **Redis** : 7+
- **Discord Bot** : Application Discord créée

### 1. Cloner le Repository

```bash
git clone <repo-url>
cd discord-admin-app
npm install
```

### 2. Configuration Discord

#### Créer une Application Discord

1. Aller sur [Discord Developer Portal](https://discord.com/developers/applications)
2. "New Application" → Nommer votre app
3. Onglet "OAuth2" :
   - **Redirect URLs** : `http://localhost:3000/api/auth/discord/callback`
   - **Scopes** : `identify`, `guilds`, `email`
4. Onglet "Bot" :
   - Activer "Message Content Intent"
   - Récupérer le Token

### 3. Variables d'Environnement

#### Backend (`.env`)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/discord_admin?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Discord OAuth
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_CALLBACK_URL=http://localhost:3000/api/auth/discord/callback
DISCORD_OAUTH_SCOPES=identify guilds email
DISCORD_BOT_TOKEN=your_bot_token

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=your_64_char_hex_encryption_key

# Gateway
GATEWAY_URL=http://localhost:3001

# Frontend
FRONTEND_URL=http://localhost:4200

# Bot Command ID
BOT_COMMAND_ID=0
```

#### Gateway (`.env`)

```env
PORT=3001
```

#### Bot (`.env`)

```env
DISCORD_TOKEN=your_bot_token
GATEWAY_URL=http://localhost:3001
BOT_ID=0
NODE_ENV=development
```

#### Frontend (`environment.ts`)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  discordClientId: 'your_client_id'
};
```

### 4. Démarrer PostgreSQL et Redis

**Option 1 : Docker Compose**

```bash
docker-compose up -d postgres redis
```

**Option 2 : Installation locale**

PostgreSQL :
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Ubuntu
sudo apt install postgresql-15
sudo systemctl start postgresql
```

Redis :
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt install redis-server
sudo systemctl start redis
```

### 5. Initialiser la Base de Données

```bash
# Depuis apps/backend/
npx prisma migrate dev --name init
npx prisma generate
```

### 6. Lancer l'Application

**Option 1 : Mode Développement (recommandé)**

Ouvrir 4 terminaux différents :

```bash
# Terminal 1 - Backend
cd apps/backend
npm run start:dev

# Terminal 2 - Gateway
cd apps/gateway
npm run start:dev

# Terminal 3 - Bot
cd apps/bot
npm run dev

# Terminal 4 - Frontend
cd apps/frontend
npm start
```

**Option 2 : Script Global (si configuré)**

```bash
npm run dev:all
```

### 7. Accéder à l'Application

- **Frontend** : http://localhost:4200
- **Backend API** : http://localhost:3000
- **Gateway** : http://localhost:3001

---

## 💻 Développement

### Structure des Commandes

```bash
# Installation dépendances
npm install

# Linting
npm run lint
npm run lint:fix

# Build
npm run build

# Tests
npm run test
npm run test:watch
npm run test:cov

# Prisma
npx prisma studio          # UI base de données
npx prisma migrate dev     # Créer migration
npx prisma generate        # Générer client
npx prisma db push         # Push sans migration
```

### Workflow de Développement

#### Ajouter une Nouvelle Feature

1. **Créer le DTO** dans `packages/shared-types`

```typescript
// packages/shared-types/src/discord/webhook.dto.ts
export interface WebhookDTO {
  id: string;
  name: string;
  channelId: string;
  token?: string;
}
```

2. **Backend : Créer le Service**

```typescript
// apps/backend/src/modules/discord/resources/webhooks/webhooks.service.ts
@Injectable()
export class WebhooksService {
  constructor(private discordApi: DiscordApiService) {}

  async getChannelWebhooks(channelId: string) {
    return this.discordApi.get(
      `/channels/${channelId}/webhooks`,
      { rateLimitKey: `channel:${channelId}:webhooks` }
    );
  }
}
```

3. **Backend : Créer le Controller**

```typescript
// apps/backend/src/modules/discord/resources/webhooks/webhooks.controller.ts
@Controller('discord/channels/:channelId/webhooks')
@UseGuards(JwtAuthGuard, GuildAdminGuard)
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Get()
  async getWebhooks(@Param('channelId') channelId: string) {
    return this.webhooksService.getChannelWebhooks(channelId);
  }
}
```

4. **Frontend : Créer le Service API**

```typescript
// apps/frontend/src/app/services/webhooks/webhooks-api.service.ts
@Injectable()
export class WebhooksApiService {
  constructor(private http: HttpClient) {}

  getChannelWebhooks(channelId: string): Observable<WebhookDTO[]> {
    return this.http.get<WebhookDTO[]>(
      `${environment.apiUrl}/discord/channels/${channelId}/webhooks`
    );
  }
}
```

5. **Frontend : Utiliser dans un Component**

```typescript
// apps/frontend/src/app/pages/webhooks/webhooks.component.ts
export class WebhooksComponent implements OnInit {
  webhooks: WebhookDTO[] = [];

  constructor(private webhooksApi: WebhooksApiService) {}

  ngOnInit() {
    this.webhooksApi.getChannelWebhooks(this.channelId)
      .subscribe(webhooks => this.webhooks = webhooks);
  }
}
```

#### Ajouter un Nouvel Événement Bot

1. **Ajouter le type d'événement**

```typescript
// packages/shared-types/src/events/bot-event.dto.ts
export enum EventType {
  // ... existing
  MemberJoin = 'member_join',
  MemberLeave = 'member_leave'
}
```

2. **Créer le Listener**

```typescript
// apps/bot/src/listeners/guildMemberAdd.ts
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { GuildMember } from 'discord.js';

@ApplyOptions<Listener.Options>({
  event: 'guildMemberAdd'
})
export class GuildMemberAddListener extends Listener {
  public override run(member: GuildMember) {
    const event: BotEventDto = {
      type: EventType.MemberJoin,
      guildId: member.guild.id,
      userId: member.user.id,
      data: {
        username: member.user.username,
        joinedAt: member.joinedAt
      },
      timestamp: Date.now()
    };
    
    this.container.ws.sendToBackend([event]);
  }
}
```

3. **Traiter l'événement dans le Backend**

```typescript
// apps/backend/src/modules/gateway/services/bot-event-handler.service.ts
async processEvent(event: BotEventDto) {
  switch (event.type) {
    // ... existing cases
    case EventType.MemberJoin:
      await this.handleMemberJoin(event.data);
      break;
  }
}

private async handleMemberJoin(data: any) {
  // Logique métier
  this.logger.log(`Member joined: ${data.username}`);
}
```

### Bonnes Pratiques

#### Code Style

- **TypeScript** : Utiliser types stricts
- **ESLint** : Respecter les règles configurées
- **Prettier** : Format automatique
- **Naming** :
  - Services : `*.service.ts`
  - Controllers : `*.controller.ts`
  - DTOs : `*.dto.ts`
  - Interfaces : `*.interface.ts`

#### Architecture

- **Séparation des responsabilités** : Un service = une responsabilité
- **Injection de dépendances** : Utiliser les DI de NestJS/Angular
- **DTOs partagés** : Toujours dans `packages/shared-types`
- **Validation** : Utiliser `class-validator` côté backend
- **Error handling** : Toujours gérer les erreurs

#### Sécurité

- **Jamais de secrets en dur** : Utiliser `.env`
- **Validation input** : Toujours valider les données entrantes
- **Guards** : Protéger les routes sensibles
- **Rate limiting** : Respecter les limites Discord
- **Encryption** : Chiffrer les tokens sensibles

---

## 🗄️ Base de Données

### Schéma PostgreSQL

```prisma
// apps/backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// User - Utilisateur de l'application
// ============================================
model User {
  id            String   @id @default(cuid())
  
  // Identité Discord
  discordId     String   @unique
  username      String
  discriminator String?
  globalName    String?
  avatar        String?
  email         String?
  
  // Tokens Discord (chiffrés AES-256-GCM)
  accessToken       String
  refreshToken      String
  tokenExpiresAt    DateTime
  tokenScope        String
  
  // Métadonnées
  isActive      Boolean  @default(true)
  role          Role     @default(USER)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  lastLoginAt   DateTime @default(now())
  
  // Relations
  refreshTokens RefreshToken[]
  
  @@map("users")
}

// ============================================
// RefreshToken - JWT Refresh Tokens
// ============================================
model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique  // Hash SHA-256
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("refresh_tokens")
}

// ============================================
// Guild - Serveur Discord
// ============================================
model Guild {
  id             String   @id @default(cuid())
  guildId        String   @unique @map("discord_guild_id")
  name           String
  icon           String?
  ownerDiscordId String   @map("owner_discord_id")
  
  // Status
  botAddedAt DateTime @default(now()) @map("bot_added_at")
  isActive   Boolean  @default(true) @map("is_active")
  
  // Métadonnées
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@map("guilds")
}

// ============================================
// Enums
// ============================================
enum Role {
  USER
  ADMIN
  MODERATOR
}
```

### Migrations

#### Créer une Migration

```bash
npx prisma migrate dev --name add_guild_settings
```

#### Appliquer les Migrations

```bash
# Développement
npx prisma migrate dev

# Production
npx prisma migrate deploy
```

#### Réinitialiser la Base

```bash
npx prisma migrate reset
```

### Redis

#### Structure des Données

**OAuth States** :
```
Key: oauth:state:{state}
Value: {
  "createdAt": 1234567890,
  "used": false
}
TTL: 600 secondes
```

**OAuth Sessions** :
```
Key: oauth:session:{sessionId}
Value: {
  "accessToken": "...",
  "refreshToken": "...",
  "userId": "...",
  "createdAt": 1234567890
}
TTL: 300 secondes
```

**Discord Token Cache** (en mémoire dans le service, pas Redis actuellement)

#### Commandes Utiles

```bash
# Connexion Redis CLI
redis-cli

# Lister toutes les clés
KEYS *

# Voir une clé
GET oauth:state:abc123

# Voir TTL
TTL oauth:state:abc123

# Supprimer une clé
DEL oauth:state:abc123

# Flush toutes les données
FLUSHDB
```

### SQLite (Bot)

Base locale pour backup événements :

**Schema** :
```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  guildId TEXT,
  userId TEXT,
  channelId TEXT,
  data TEXT,
  timestamp INTEGER NOT NULL,
  sent INTEGER DEFAULT 0
);

CREATE INDEX idx_sent ON events(sent);
CREATE INDEX idx_timestamp ON events(timestamp);
```

**Fichier** : `apps/bot/data/events.db`

---

## 🔐 Authentification & Sécurité

### Flux OAuth Discord

```
1. User clique "Login with Discord"
   ↓
2. Frontend → Backend GET /api/auth/discord/login
   ↓
3. Backend génère state (Redis)
   ↓
4. Backend redirige vers Discord OAuth
   ↓
5. User autorise sur Discord
   ↓
6. Discord → Backend GET /api/auth/discord/callback?code=xxx&state=yyy
   ↓
7. Backend valide state (Redis)
   ↓
8. Backend échange code contre tokens Discord
   ↓
9. Backend récupère profil Discord
   ↓
10. Backend crée/update User (PostgreSQL)
    ↓
11. Backend chiffre tokens Discord
    ↓
12. Backend génère JWT (access + refresh)
    ↓
13. Backend crée session temporaire (Redis)
    ↓
14. Backend redirige → Frontend /callback?session=xxx
    ↓
15. Frontend échange session contre JWT (POST /api/auth/exchange-session)
    ↓
16. Frontend stocke JWT (localStorage)
    ↓
17. ✅ User authentifié
```

### Sécurité Implémentée

#### ✅ Protection CSRF

**OAuthStateService** :
- State token aléatoire (64 hex)
- Stocké dans Redis (TTL 10 min)
- One-time use
- Validation stricte

#### ✅ Tokens Jamais dans l'URL

Session temporaire pour éviter :
- Logs serveur
- Historique navigateur
- Referer headers

#### ✅ Chiffrement Tokens Discord

**AES-256-GCM** :
- Clé 256-bit
- IV unique par token
- Auth tag pour intégrité
- Stockage format : `iv:authTag:encrypted`

#### ✅ JWT Sécurisés

**Access Token** :
- Durée courte (15 min)
- Payload minimal
- Signature HMAC SHA-256

**Refresh Token** :
- Hash SHA-256 en DB
- Rotation automatique
- Durée 7 jours
- Révocation possible

#### ✅ Guards & Permissions

**JwtAuthGuard** :
- Vérifie signature JWT
- Vérifie expiration
- Charge user en request

**GuildAdminGuard** :
- Vérifie permission ADMINISTRATOR
- Appelle API Discord avec token user
- Cache résultat

### Variables Sensibles

**CRITICAL** :
```env
ENCRYPTION_KEY=...        # 64 hex chars
JWT_SECRET=...            # Min 32 chars
JWT_REFRESH_SECRET=...    # Min 32 chars
DISCORD_CLIENT_SECRET=... # Depuis Discord Portal
DISCORD_BOT_TOKEN=...     # Depuis Discord Portal
```

**Génération** :
```bash
# Encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🔄 Communication Inter-Services

### Architecture WebSocket

```
┌──────────┐              ┌──────────┐              ┌──────────┐
│  Backend │◄────────────►│  Gateway │◄────────────►│   Bot    │
└──────────┘   Socket.io  └──────────┘   Socket.io  └──────────┘
     │                          │                         │
     │ register                 │                         │ register
     │ type: 'backend'          │                         │ type: 'bot'
     │──────────────────────────►                         │
     │                          │◄────────────────────────│
     │                          │                         │
     │ to-bot                   │                         │
     │ {botId, data}            │ from-backend            │
     │──────────────────────────►─────────────────────────►
     │                          │                         │
     │                          │ to-backend              │
     │ to-backend               │ [events]                │
     │◄─────────────────────────◄─────────────────────────│
     │ [events]                 │                         │
```

### Events Socket.io

#### Gateway Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `register` | Bot/Backend → Gateway | `{type, botId?, name?}` | Enregistrement |
| `registered` | Gateway → Bot/Backend | `{success, botId?}` | Confirmation |
| `to-backend` | Bot → Gateway → Backend | `BotEventDto[]` | Événements |
| `to-bot` | Backend → Gateway → Bot | `{botId, data}` | Commande |
| `broadcast-to-bots` | Backend → Gateway → Bots | `data` | Broadcast |
| `from-backend` | Gateway → Bot | `data` | Commande reçue |
| `backend-ack` | Gateway → Bot | `{received, timestamp}` | Accusé réception |

#### Exemple : Ping Bot

**Backend** :
```typescript
// Controller
@Get('ping')
async pingBot() {
  const botId = process.env.BOT_COMMAND_ID;
  const sent = this.gatewayClient.sendToBot(botId, {
    type: 'ping',
    message: 'Ping depuis le backend',
    timestamp: new Date().toISOString()
  });
  
  return { success: sent };
}

// Service
sendToBot(botId: string, data: any) {
  this.socket.emit('to-bot', { botId, data });
}
```

**Gateway** :
```typescript
@SubscribeMessage('to-bot')
handleBackendToBot(
  @MessageBody() data: { botId: string; data: any }
) {
  const sent = this.botConnectionService.sendToBot(
    data.botId,
    'from-backend',
    data.data
  );
}
```

**Bot** :
```typescript
// WebSocketService
this.socket.on('from-backend', (data) => {
  if (data.type === 'ping') {
    this.logger.info('Ping received from backend!');
    // Répondre avec pong...
  }
});
```

### Event Batching

Le bot utilise un système de **batch** pour optimiser :

**Configuration** :
```typescript
const BATCH_INTERVAL = 5000;  // 5 secondes
const MAX_BATCH_SIZE = 100;   // 100 événements max
```

**Fonctionnement** :
1. Événement Discord → `addEvent()`
2. Stockage en mémoire dans tableau
3. Toutes les 5s OU si 100 événements → `flushBatch()`
4. Si Gateway connectée → `emit('to-backend')`
5. Sinon → Sauvegarde SQLite

**Restauration** :
```typescript
// Au reconnect
restoreOfflineEvents() {
  const events = db.prepare('SELECT * FROM events WHERE sent = 0').all();
  if (events.length > 0) {
    this.sendBatch(events);
    db.prepare('UPDATE events SET sent = 1 WHERE sent = 0').run();
  }
}
```

---

## 🌐 Intégration Discord API

### Architecture Discord Module

Le module Discord dans le backend fournit une abstraction complète de l'API Discord :

**Composants clés** :
- `DiscordApiService` : Client HTTP principal
- `DiscordRateLimiterService` : Gestion rate limits
- Resources : Guilds, Channels, Members, Roles, Bans, Users

### Rate Limiting

#### Discord Limits

- **Global** : 50 requêtes/seconde
- **Per Route** : Varie selon endpoint
- **Buckets** : Regroupement par ressource

#### Implémentation

```typescript
// discord-rate-limiter.service.ts
interface RateLimitBucket {
  limit: number;
  remaining: number;
  reset: number;
  queue: Array<() => void>;
}

async checkRateLimit(key: string): Promise<void> {
  const bucket = this.buckets.get(key) || this.createBucket();
  
  if (bucket.remaining === 0) {
    const waitTime = bucket.reset - Date.now();
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  bucket.remaining--;
}
```

**Usage** :
```typescript
return this.discordApi.get(endpoint, {
  rateLimitKey: `guild:${guildId}:channels`
});
```

### Endpoints Principaux

#### Guilds

```typescript
// GET /discord/guilds/:guildId
getGuild(guildId: string)

// GET /discord/guilds/:guildId/channels
getGuildChannels(guildId: string)

// GET /discord/guilds/:guildId/members
listGuildMembers(guildId: string, limit: number)

// GET /discord/guilds/:guildId/roles
getGuildRoles(guildId: string)
```

#### Channels

```typescript
// GET /discord/channels/:channelId
getChannel(channelId: string)

// POST /discord/channels/:channelId/messages
createMessage(channelId: string, content: CreateMessageDTO)

// GET /discord/channels/:channelId/messages
getChannelMessages(channelId: string, limit: number)

// DELETE /discord/channels/:channelId/messages/:messageId
deleteMessage(channelId: string, messageId: string)
```

#### Members

```typescript
// GET /discord/guilds/:guildId/members/:userId
getGuildMember(guildId: string, userId: string)

// PATCH /discord/guilds/:guildId/members/:userId
modifyGuildMember(guildId: string, userId: string, data: ModifyGuildMemberDTO)

// PUT /discord/guilds/:guildId/members/:userId/roles/:roleId
addGuildMemberRole(guildId: string, userId: string, roleId: string)

// DELETE /discord/guilds/:guildId/members/:userId/roles/:roleId
removeGuildMemberRole(guildId: string, userId: string, roleId: string)

// PATCH /discord/guilds/:guildId/members/:userId/timeout
timeoutMember(guildId: string, userId: string, until: string)
```

#### Bans

```typescript
// GET /discord/guilds/:guildId/bans
getGuildBans(guildId: string)

// PUT /discord/guilds/:guildId/bans/:userId
createGuildBan(guildId: string, userId: string, reason?: string)

// DELETE /discord/guilds/:guildId/bans/:userId
removeGuildBan(guildId: string, userId: string, reason?: string)
```

### Error Handling

```typescript
// discord-api.exception.ts
export class DiscordApiException extends HttpException {
  constructor(
    public readonly discordCode: number,
    public readonly discordMessage: string,
    statusCode: number
  ) {
    super({
      statusCode,
      message: discordMessage,
      discordCode
    }, statusCode);
  }
}

// discord-exception.filter.ts
@Catch(DiscordApiException)
export class DiscordExceptionFilter implements ExceptionFilter {
  catch(exception: DiscordApiException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    response.status(exception.getStatus()).json({
      error: 'Discord API Error',
      message: exception.discordMessage,
      code: exception.discordCode
    });
  }
}
```

---

## 🚀 Déploiement

### Environnements

#### Développement

```bash
# Docker Compose local
docker-compose up -d

# Services individuels
npm run dev:backend
npm run dev:gateway
npm run dev:bot
npm run dev:frontend
```

#### Production

### Option 1 : Docker

**Dockerfile Backend** :
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY apps/backend/dist ./dist
COPY apps/backend/prisma ./prisma

RUN npx prisma generate

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

**docker-compose.prod.yml** :
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: discord_admin
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    environment:
      DATABASE_URL: postgresql://admin:${DB_PASSWORD}@postgres:5432/discord_admin
      REDIS_HOST: redis
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  gateway:
    build:
      context: .
      dockerfile: apps/gateway/Dockerfile
    ports:
      - "3001:3001"
    restart: unless-stopped

  bot:
    build:
      context: .
      dockerfile: apps/bot/Dockerfile
    environment:
      GATEWAY_URL: http://gateway:3001
    depends_on:
      - gateway
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
    ports:
      - "80:80"
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Option 2 : VPS / Serveur Dédié

**Setup Ubuntu 22.04** :

```bash
# 1. Installer Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Installer PostgreSQL
sudo apt install postgresql postgresql-contrib

# 3. Installer Redis
sudo apt install redis-server

# 4. Installer PM2
sudo npm install -g pm2

# 5. Cloner le repo
git clone <repo-url>
cd discord-admin-app
npm install
npm run build

# 6. Configurer .env production

# 7. Lancer avec PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**ecosystem.config.js** :
```javascript
module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'apps/backend/dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'gateway',
      script: 'apps/gateway/dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'bot',
      script: 'apps/bot/dist/index.js',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

### Option 3 : Cloud (AWS/GCP/Azure)

**Architecture recommandée** :
- **Frontend** : S3 + CloudFront (AWS) ou Cloud Storage + CDN (GCP)
- **Backend** : ECS/Kubernetes ou App Engine
- **Gateway** : ECS/Kubernetes avec Load Balancer
- **Bot** : ECS/Kubernetes
- **PostgreSQL** : RDS (AWS) ou Cloud SQL (GCP)
- **Redis** : ElastiCache (AWS) ou Memorystore (GCP)

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/discord-admin

# Frontend
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/discord-admin/frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket Gateway
    location /socket.io/ {
        proxy_pass http://localhost:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

# SSL avec Let's Encrypt
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # ... même config que ci-dessus
}
```

### Checklist Déploiement

- [ ] Variables d'environnement configurées
- [ ] Base de données migrée
- [ ] Redis configuré et sécurisé
- [ ] Discord Bot invité sur serveurs
- [ ] SSL/TLS activé
- [ ] Firewall configuré
- [ ] Logs configurés
- [ ] Monitoring activé
- [ ] Backups automatiques configurés
- [ ] CORS configuré correctement
- [ ] Rate limiting activé
- [ ] Secrets rotations planifiées

---

## 📊 Maintenance et Monitoring

### Logs

#### Backend (NestJS)

```typescript
// Logger personnalisé
import { Logger } from '@nestjs/common';

const logger = new Logger('ServiceName');
logger.log('Info message');
logger.warn('Warning message');
logger.error('Error message', trace);
logger.debug('Debug message');
```

#### Bot (Sapphire)

```typescript
this.container.logger.info('Message');
this.container.logger.warn('Warning');
this.container.logger.error('Error');
this.container.logger.debug('Debug');
```

### Monitoring Recommandé

#### Application Performance

**Sentry** :
```bash
npm install @sentry/node @sentry/integrations
```

```typescript
// main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});
```

#### Infrastructure

- **PM2 Monitoring** : `pm2 monit`
- **PostgreSQL** : pg_stat_statements
- **Redis** : redis-cli INFO
- **Disk/CPU/RAM** : htop, netdata

### Backups

#### PostgreSQL

**Backup automatique quotidien** :
```bash
#!/bin/bash
# /opt/scripts/backup-postgres.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/postgresql"
DB_NAME="discord_admin"

pg_dump -U admin $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Garder seulement les 30 derniers jours
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

**Cron** :
```bash
# crontab -e
0 2 * * * /opt/scripts/backup-postgres.sh
```

#### Redis

**Backup automatique** :
```bash
# redis.conf
save 900 1      # Sauvegarde après 900s si 1 clé changée
save 300 10     # Sauvegarde après 300s si 10 clés changées
save 60 10000   # Sauvegarde après 60s si 10000 clés changées

dir /var/lib/redis
dbfilename dump.rdb
```

**Backup manuel** :
```bash
redis-cli SAVE
cp /var/lib/redis/dump.rdb /var/backups/redis/dump_$(date +%Y%m%d).rdb
```

#### SQLite (Bot)

**Backup automatique** :
```bash
#!/bin/bash
# Copie du fichier events.db
cp apps/bot/data/events.db apps/bot/data/events_backup_$(date +%Y%m%d).db

# Garder 7 jours
find apps/bot/data -name "events_backup_*.db" -mtime +7 -delete
```

### Maintenance Régulière

#### Hebdomadaire

- [ ] Vérifier les logs d'erreurs
- [ ] Analyser les performances
- [ ] Vérifier l'espace disque
- [ ] Tester les backups
- [ ] Vérifier les mises à jour de sécurité

#### Mensuel

- [ ] Rotation des secrets
- [ ] Nettoyage base de données
- [ ] Analyse des métriques
- [ ] Revue des permissions Discord
- [ ] Test de restauration backup

#### Commandes Utiles

**PostgreSQL** :
```sql
-- Taille de la base
SELECT pg_size_pretty(pg_database_size('discord_admin'));

-- Tables les plus volumineuses
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Connexions actives
SELECT * FROM pg_stat_activity;

-- Vacuum (maintenance)
VACUUM ANALYZE;
```

**Redis** :
```bash
# Info mémoire
redis-cli INFO memory

# Nombre de clés
redis-cli DBSIZE

# Clés les plus utilisées
redis-cli --bigkeys

# Nettoyer les clés expirées
redis-cli --scan --pattern "oauth:*" | xargs redis-cli DEL
```

**PM2** :
```bash
# Status
pm2 status

# Logs
pm2 logs backend --lines 100

# Monitoring
pm2 monit

# Redémarrer
pm2 restart all

# Recharger config
pm2 reload ecosystem.config.js

# Flush logs
pm2 flush
```

---

## 🔍 Troubleshooting

### Problèmes Courants

#### 1. Bot ne se connecte pas à la Gateway

**Symptômes** :
```
[Bot] Gateway connection error
```

**Solutions** :
1. Vérifier que la Gateway est démarrée : `pm2 status gateway`
2. Vérifier `GATEWAY_URL` dans `.env` du bot
3. Vérifier les logs Gateway : `pm2 logs gateway`
4. Tester la connexion : `curl http://localhost:3001`

#### 2. Erreur "Invalid or expired authentication session"

**Symptômes** :
```
UnauthorizedException: Invalid or expired authentication session
```

**Causes** :
- SessionId expiré (> 5 min)
- Redis déconnecté
- SessionId invalide

**Solutions** :
1. Vérifier Redis : `redis-cli PING` → doit retourner `PONG`
2. Relancer le login OAuth
3. Vérifier les logs : `pm2 logs backend | grep session`

#### 3. Erreur "Failed to refresh Discord token"

**Symptômes** :
```
Error: Failed to refresh Discord token
```

**Causes** :
- Refresh token Discord révoqué
- User a révoqué l'autorisation
- Token corrompu en DB

**Solutions** :
1. User doit se reconnecter
2. Vérifier encryption key : `.env` → `ENCRYPTION_KEY`
3. Logs : `pm2 logs backend | grep refresh`

#### 4. Rate Limit Discord

**Symptômes** :
```
DiscordApiException: You are being rate limited
```

**Solutions** :
1. Le système attend automatiquement
2. Réduire le nombre de requêtes
3. Vérifier rate limit keys dans les logs
4. Augmenter les délais entre requêtes

#### 5. Events Bot non reçus dans Backend

**Symptômes** :
- Events Discord non synchronisés
- Base de données non à jour

**Solutions** :
1. Vérifier connexion Gateway : `pm2 logs bot | grep Gateway`
2. Vérifier SQLite : `ls -lh apps/bot/data/events.db`
3. Vérifier EventBatcher : `pm2 logs bot | grep batch`
4. Restaurer events offline : redémarrer le bot

#### 6. Frontend ne peut pas se connecter au Backend

**Symptômes** :
```
CORS error / Network error
```

**Solutions** :
1. Vérifier `FRONTEND_URL` dans Backend `.env`
2. Vérifier CORS configuration :
```typescript
// main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true
});
```
3. Vérifier `apiUrl` dans `environment.ts`

#### 7. Base de données migration failed

**Symptômes** :
```
Error: P3009 - Migration failed
```

**Solutions** :
```bash
# Réinitialiser la base (DEV ONLY)
npx prisma migrate reset

# Forcer la migration
npx prisma migrate deploy --force

# Vérifier l'état
npx prisma migrate status
```

#### 8. Mémoire élevée

**Symptômes** :
- PM2 affiche high memory
- Application lente

**Solutions** :
1. Redémarrer services : `pm2 restart all`
2. Analyser : `pm2 monit`
3. Vérifier cache : peut-être trop de tokens en cache
4. Augmenter RAM ou optimiser

### Debug Mode

#### Backend

```bash
# Mode verbose
DEBUG=* npm run start:dev

# Logs Prisma
DATABASE_URL="postgresql://...?connection_limit=1" npm run start:dev
```

#### Bot

```typescript
// src/index.ts
const client = new SapphireClient({
  logger: {
    level: LogLevel.Debug  // Trace, Debug, Info, Warn, Error
  }
});
```

#### Frontend

```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  debug: true  // Active console.log
};
```

---

## 📚 Ressources et Références

### Documentation Officielle

#### Frameworks
- [NestJS Documentation](https://docs.nestjs.com/)
- [Angular Documentation](https://angular.io/docs)
- [SapphireJS Documentation](https://www.sapphirejs.dev/)
- [Discord.js Guide](https://discordjs.guide/)
- [Prisma Documentation](https://www.prisma.io/docs)

#### UI/UX
- [PrimeNG Components](https://primeng.org/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Sakai Template Demo](https://sakai.primeng.org/)

#### APIs
- [Discord API Documentation](https://discord.com/developers/docs)
- [Discord OAuth2](https://discord.com/developers/docs/topics/oauth2)
- [Discord Rate Limits](https://discord.com/developers/docs/topics/rate-limits)

### Outils de Développement

#### Testing
- [Jest](https://jestjs.io/)
- [Supertest](https://github.com/visionmedia/supertest)
- [Karma](https://karma-runner.github.io/)
- [Jasmine](https://jasmine.github.io/)

#### Monitoring
- [Sentry](https://sentry.io/)
- [PM2](https://pm2.keymetrics.io/)
- [Grafana](https://grafana.com/)
- [Prometheus](https://prometheus.io/)

#### Database
- [Prisma Studio](https://www.prisma.io/studio)
- [pgAdmin](https://www.pgadmin.org/)
- [Redis Commander](https://www.npmjs.com/package/redis-commander)

### Standards et Best Practices

#### Sécurité
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

#### Code Style
- [TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Angular Style Guide](https://angular.io/guide/styleguide)
- [NestJS Best Practices](https://docs.nestjs.com/techniques/performance)

---

## 🗺️ Roadmap

### Phase 1 - MVP ✅ (Actuel)

- [x] Authentification Discord OAuth
- [x] Gestion utilisateurs
- [x] Communication Backend ↔ Gateway ↔ Bot
- [x] Sync guilds automatique
- [x] Event batching
- [x] Backup SQLite événements
- [x] Interface frontend basique
- [x] Intégration API Discord (Guilds, Channels, Members)

### Phase 2 - Fonctionnalités Core 🚧 (En cours)

- [ ] Dashboard avec statistiques
- [ ] Gestion complète des membres
  - [ ] Kick, ban, timeout
  - [ ] Attribution de rôles
  - [ ] Historique des actions
- [ ] Gestion des channels
  - [ ] Création, modification, suppression
  - [ ] Permissions
- [ ] Système de modération
  - [ ] Logs d'audit
  - [ ] Filtres de messages
  - [ ] Auto-modération
- [ ] Notifications en temps réel (WebSocket Frontend)

### Phase 3 - Fonctionnalités Avancées 📋 (Planifié)

- [ ] Système de tickets
- [ ] Commandes custom bot
- [ ] Auto-roles
- [ ] Welcome/Goodbye messages
- [ ] Levels & XP system
- [ ] Système de warns
- [ ] Backup/Restore serveur
- [ ] Analytics avancés
- [ ] Multi-langue

### Phase 4 - Optimisation & Scale 🔮 (Futur)

- [ ] Cache Redis optimisé
- [ ] Sharding bot Discord
- [ ] Load balancing
- [ ] CDN pour assets
- [ ] API publique
- [ ] Webhooks
- [ ] Plugin system
- [ ] Mobile app

---

## 🤝 Contributing

### Comment Contribuer

1. **Fork** le repository
2. **Créer** une branche feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** les changements (`git commit -m 'Add AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrir** une Pull Request

### Guidelines

#### Code Style

- Respecter ESLint/Prettier
- Commenter le code complexe
- Écrire des tests
- Mettre à jour la documentation

#### Commits

Format : `type(scope): description`

Types :
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Refactoring
- `test`: Tests
- `chore`: Maintenance

Exemples :
```bash
feat(auth): add OAuth Discord login
fix(bot): resolve event batching issue
docs(readme): update installation guide
refactor(backend): improve rate limiting
```

#### Pull Requests

- Titre clair et descriptif
- Description détaillée des changements
- Screenshots si UI
- Tests passants
- Documentation à jour

---

## 📝 License

Ce projet est sous licence **MIT**.

```
MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 👥 Auteurs et Remerciements

### Équipe de Développement

- **Développeur Principal** : [Votre Nom]

### Technologies Utilisées

Merci aux créateurs et mainteneurs de :
- Angular Team
- NestJS Team
- Sapphire Framework Team
- Discord.js Team
- PrimeNG Team
- Prisma Team
- Et tous les contributeurs open-source

---

## 📞 Support et Contact

### Questions et Support

- **Issues** : [GitHub Issues](lien-vers-repo/issues)
- **Discussions** : [GitHub Discussions](lien-vers-repo/discussions)
- **Discord** : [Serveur Discord](lien-invite)

### Signaler un Bug

Utilisez le template GitHub Issue avec :
- Description du problème
- Étapes pour reproduire
- Comportement attendu vs actuel
- Screenshots si applicable
- Environnement (OS, Node version, etc.)

### Demander une Feature

Ouvrez une Discussion GitHub avec :
- Description de la feature
- Use case / pourquoi c'est utile
- Proposition d'implémentation (optionnel)

---

## 📊 Statistiques du Projet

### Métriques Techniques

- **Lignes de code** : ~15,000+
- **Fichiers** : ~150+
- **Modules** : 4 applications + 1 package
- **Technologies** : 10+ frameworks/bibliothèques
- **Endpoints API** : 30+
- **Event Types** : 5+

### Performance Cible

- **Temps de réponse API** : < 200ms (95e percentile)
- **Temps de chargement Frontend** : < 2s
- **Événements traités/s** : 100+
- **Uptime** : > 99.5%

---

## 🎓 Glossaire

### Termes Techniques

**Bot** : Application Discord automatisée qui écoute les événements et exécute des commandes.

**DTO (Data Transfer Object)** : Objet utilisé pour transférer des données entre couches/services.

**Gateway** : Hub central de communication WebSocket entre Backend et Bot.

**Guild** : Terme Discord pour "serveur".

**Intent** : Permission Discord pour recevoir certains types d'événements.

**JWT (JSON Web Token)** : Standard de token pour l'authentification.

**OAuth 2.0** : Protocole d'autorisation utilisé par Discord.

**ORM (Object-Relational Mapping)** : Prisma, pour mapper objets ↔ base de données.

**Rate Limiting** : Limitation du nombre de requêtes API par période.

**Sharding** : Division du bot en plusieurs instances pour gérer plus de serveurs.

**WebSocket** : Protocole de communication bidirectionnelle en temps réel.

### Acronymes

- **API** : Application Programming Interface
- **CORS** : Cross-Origin Resource Sharing
- **CRUD** : Create, Read, Update, Delete
- **DI** : Dependency Injection
- **HTTP** : HyperText Transfer Protocol
- **REST** : Representational State Transfer
- **SQL** : Structured Query Language
- **SSL/TLS** : Secure Sockets Layer / Transport Layer Security
- **TTL** : Time To Live
- **UI/UX** : User Interface / User Experience
- **VPS** : Virtual Private Server

---

## 🔄 Changelog

### Version 1.0.0 (Octobre 2025)

**Initial Release**

#### ✨ Features
- Authentification Discord OAuth 2.0 complète
- Système de gestion des tokens sécurisé
- Architecture Gateway pour communication Backend ↔ Bot
- Event batching avec backup SQLite
- Intégration API Discord (Guilds, Channels, Members, Roles, Bans)
- Interface Frontend avec PrimeNG
- Rate limiting Discord intelligent
- Guards de permissions

#### 🛠️ Infrastructure
- Monorepo avec 4 applications
- PostgreSQL + Redis + SQLite
- Docker Compose pour développement
- PM2 pour production
- Prisma ORM

#### 📚 Documentation
- Guide d'installation complet
- Documentation API
- Architecture détaillée
- Troubleshooting guide

---

## 🎯 Quick Reference

### Commandes Essentielles

```bash
# Installation
npm install

# Développement
npm run dev:backend
npm run dev:gateway
npm run dev:bot
npm run dev:frontend

# Build
npm run build

# Production
pm2 start ecosystem.config.js

# Database
npx prisma migrate dev
npx prisma studio
npx prisma generate

# Logs
pm2 logs
pm2 logs backend
pm2 monit

# Backup
pg_dump discord_admin > backup.sql
redis-cli SAVE
```

### Ports par Défaut

| Service | Port | URL |
|---------|------|-----|
| Frontend | 4200 | http://localhost:4200 |
| Backend | 3000 | http://localhost:3000 |
| Gateway | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | - |
| Redis | 6379 | - |

### Variables Critiques

```env
DATABASE_URL=postgresql://...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_BOT_TOKEN=...
JWT_SECRET=...
ENCRYPTION_KEY=...
REDIS_HOST=...
GATEWAY_URL=...
```

### Endpoints Principaux

```
POST   /api/auth/discord/login
GET    /api/auth/discord/callback
POST   /api/auth/exchange-session
POST   /api/auth/refresh
GET    /api/auth/me

GET    /api/discord/guilds/:id
GET    /api/discord/guilds/:id/channels
GET    /api/discord/guilds/:id/members
GET    /api/discord/guilds/:id/roles

GET    /api/gateway/ping
```

---

## ✅ Checklist Mise en Production

### Avant Déploiement

- [ ] Tous les tests passent
- [ ] Variables d'environnement de production configurées
- [ ] Secrets générés et sécurisés
- [ ] Base de données migrée
- [ ] Discord Bot créé et configuré
- [ ] SSL/TLS configuré
- [ ] CORS configuré correctement
- [ ] Rate limiting activé
- [ ] Logs configurés
- [ ] Monitoring activé
- [ ] Backups automatiques configurés

### Après Déploiement

- [ ] Tester authentification
- [ ] Tester sync guilds
- [ ] Tester événements bot
- [ ] Vérifier les logs
- [ ] Tester backup/restore
- [ ] Vérifier monitoring
- [ ] Tester performance
- [ ] Documentation utilisateur disponible

---

**🎉 Félicitations ! Vous avez maintenant une documentation complète de votre application d'administration Discord !**

Pour toute question ou suggestion d'amélioration de cette documentation, n'hésitez pas à ouvrir une issue sur GitHub.

---

**Dernière mise à jour :** Octobre 2025  
**Version de la documentation :** 1.0.0  
**Maintenu par :** L'équipe de développement