# Discord Admin App - Context Core

**Date création** : Novembre 2025  
**Dernière mise à jour architecture** : Novembre 2025  
**Version** : 1.0  
**Mainteneur** : Développeur solo (évolution vers équipe prévue)

---

## 🎯 Vision en 30 Secondes

**Discord Admin App** est une plateforme web d'administration pour serveurs Discord.

**Proposition de valeur** :
- Interface web centralisée pour gérer son serveur Discord
- Système de modules activables/désactivables par serveur
- Modèle freemium (Free/Premium/Enterprise)
- Architecture scalable et découplée

**Public cible** : Administrateurs de serveurs Discord cherchant une interface web moderne pour remplacer les commandes bot.

---

## 🏗️ Architecture Globale

### Vue Simplifiée

```
┌─────────────┐
│   Discord   │ ← Events, REST API
└──────┬──────┘
       │
┌──────▼──────────┐
│   Bot Discord   │ ← SapphireJS (Discord.js)
│  Event Batching │
└──────┬──────────┘
       │ WebSocket (Socket.IO)
┌──────▼──────────┐
│    Gateway      │ ← Hub central WebSocket
│  Multi-bots    │
└──────┬──────────┘
       │ WebSocket (Socket.IO)
┌──────▼──────────┐
│    Backend      │ ← NestJS, REST API, OAuth
│  Module System  │
└──────┬──────────┘
       │
┌──────┴──────────┬─────────────┬──────────────┐
│   PostgreSQL    │    Redis    │  TimescaleDB │
│  (Prisma ORM)   │   (Cache)   │   (Stats)    │
└─────────────────┴─────────────┴──────────────┘
       │
┌──────▼──────────┐
│  Frontend Sakai │ ← Angular 20, PrimeNG
│  Pattern Facade │
└─────────────────┘
```

### Flux de Données Typiques

#### 1. Action Utilisateur (ex: Kick membre)
```
User (Frontend) 
  → POST /api/guilds/:guildId/members/:userId/kick (Backend)
  → Discord API REST /guilds/:id/members/:userId (Discord)
  → Event to Bot via Gateway (sync)
```

#### 2. Event Discord (ex: Nouveau membre)
```
Discord 
  → Event GuildMemberAdd (Bot listener)
  → Batch events (5s ou 100 events)
  → Send to Backend via Gateway WebSocket
  → Backend process (save DB, trigger module logic)
```

#### 3. Configuration Module
```
User configure Welcome module (Frontend)
  → POST /api/modules/welcome/config (Backend)
  → Save config in PostgreSQL
  → Notify Bot via Gateway: module:change event
  → Bot reloads module config
```

---

## 🗂️ Structure Monorepo

```
discord-admin-app/
├── apps/
│   ├── backend/          # NestJS API REST + OAuth + Discord API client
│   ├── gateway/          # NestJS WebSocket hub (Backend ↔ Bots)
│   ├── bot/              # SapphireJS Discord bot (event listeners)
│   └── frontend/            # Angular 20 frontend (~60% complété)
│
├── packages/
│   └── shared-types/     # Types TypeScript partagés (DTOs, interfaces)
│
├── docs/                 # Documentation technique
└── docker-compose.yml    # PostgreSQL + Redis + TimescaleDB (dev)
```

### Apps - Responsabilités

#### **Backend** (`apps/backend/`)
- API REST pour le frontend
- Authentification Discord OAuth 2.0
- Gestion JWT + refresh tokens
- Client Discord API (REST)
- Logique métier des modules
- Communication WebSocket avec Gateway
- Base de données PostgreSQL via Prisma

**Technologies** : NestJS, Prisma, PostgreSQL, Redis, @nestjs/passport, Discord.js (client)

#### **Gateway** (`apps/gateway/`)
- Hub central WebSocket (Socket.IO)
- Routage Backend ↔ Bots
- Gestion connexions multiples bots
- Events: `register`, `to-backend`, `to-bot`, `module:change`
- Permet scaling horizontal (plusieurs bots)

**Technologies** : NestJS, Socket.IO

#### **Bot** (`apps/bot/`)
- Bot Discord actif sur serveurs
- Listeners Discord events (GuildMemberAdd, MessageCreate, etc.)
- Event batching (5s / 100 events) avant envoi Gateway
- Module loader dynamique
- Backup SQLite en cas de déconnexion Gateway
- Sync config avec Backend via Gateway

**Technologies** : SapphireJS, Discord.js, Socket.IO client, SQLite

#### **Frontend** (`apps/frontend/`)
- Interface web Angular 20
- Template Sakai (PrimeNG)
- Pattern Facade (API + Data + Facade services)
- OAuth Discord login
- Dashboard admin serveur
- Configuration modules

**Technologies** : Angular 20, PrimeNG 20, TailwindCSS, RxJS, Signals

#### **Shared Types** (`packages/shared-types/`)
- DTOs pour API REST
- Interfaces Discord (Guild, Member, Channel, etc.)
- Module definitions
- WebSocket event types
- Partagé entre Backend, Bot, Frontend

---

## 🧩 Système de Modules

### Concept Central

**Chaque fonctionnalité = 1 module** (welcome, stats, automod, tickets, leveling, economy, etc.)

**Caractéristiques** :
- Activable/désactivable par serveur (guild)
- Limites par plan d'abonnement (Free/Premium/Enterprise)
- Configuration stockée en DB (JSON)
- Peut tourner sur Backend, Bot, ou les deux
- Communication Backend ↔ Bot via Gateway

### Structure Type d'un Module

```
Module "Welcome" (exemple)
├── Backend
│   ├── welcome.module.ts           # Module NestJS
│   ├── welcome.service.ts          # Logique métier
│   ├── welcome.controller.ts       # REST API endpoints
│   ├── dto/                        # DTOs validation
│   └── welcome.definition.ts       # Metadata module
│
├── Bot
│   ├── welcome.module.ts           # Module Sapphire
│   └── listeners/
│       └── member-join.listener.ts # Listener GuildMemberAdd
│
├── Frontend
│   ├── pages/
│   │   └── welcome-config/         # Page configuration
│   ├── components/
│   │   ├── message-editor/         # Éditeur message
│   │   └── channel-selector/       # Sélecteur channel
│   └── services/
│       ├── welcome-facade.service.ts
│       ├── welcome-api.service.ts
│       └── welcome-data.service.ts
│
└── Shared Types
    └── modules/welcome/
        └── welcome.dto.ts          # DTOs Welcome
```

### Définition d'un Module

```typescript
// packages/shared-types/src/modules/welcome.definition.ts
export const WELCOME_MODULE: ModuleDefinition = {
  id: 'welcome',
  name: 'Welcome Messages',
  description: 'Send welcome messages to new members',
  category: ModuleCategory.ENGAGEMENT,
  availability: { 
    free: true, 
    premium: true, 
    enterprise: true 
  },
  limits: {
    free: { messagesPerDay: 100 },
    premium: { messagesPerDay: -1 } // illimité
  },
  runtime: { backend: true, bot: true },
  version: '1.0.0'
};
```

### Modules Planifiés

1. ✅ **Welcome** - Messages de bienvenue (Backend ✅, Bot ✅, Frontend ❌)
2. 🔄 **Stats** - Statistiques serveur (Backend 70%, Bot ❌, Frontend 10%)
3. ⏳ **Automod** - Modération automatique
4. ⏳ **Tickets** - Système de support
5. ⏳ **Leveling** - Système XP/niveaux
6. ⏳ **Economy** - Économie virtuelle

---

## 🎨 Frontend Architecture

### Pattern Facade (3 Couches)

**Convention stricte** : Chaque feature a 3 services séparés.

```
Component (UI)
    ↓ inject
Facade Service (Orchestration, logique métier)
    ↓ inject
    ┌──────────────┬────────────────┐
API Service      Data Service
(HTTP calls)     (Signals reactive state)
```

#### Exemple : Guild Services

**1. API Service** (`guild-api.service.ts`)
```typescript
// Responsabilité : Appels HTTP uniquement
@Injectable({ providedIn: 'root' })
export class GuildApiService {
  getGuilds(): Observable<GuildDTO[]> {
    return this.http.get<GuildDTO[]>(`${this.apiUrl}/guilds`);
  }
}
```

**2. Data Service** (`guild-data.service.ts`)
```typescript
// Responsabilité : État réactif avec Signals
@Injectable({ providedIn: 'root' })
export class GuildDataService {
  private _guilds = signal<GuildDTO[]>([]);
  readonly guilds = this._guilds.asReadonly();
  
  setGuilds(guilds: GuildDTO[]): void {
    this._guilds.set(guilds);
  }
}
```

**3. Facade Service** (`guild-facade.service.ts`)
```typescript
// Responsabilité : Orchestration + logique métier
@Injectable({ providedIn: 'root' })
export class GuildFacadeService {
  async loadGuilds(): Promise<void> {
    const guilds = await firstValueFrom(this.guildApi.getGuilds());
    this.guildData.setGuilds(guilds);
  }
}
```

**Utilisation dans Component**
```typescript
@Component({ /* ... */ })
export class ServerListComponent {
  protected readonly guildFacade = inject(GuildFacadeService);
  
  ngOnInit() {
    void this.guildFacade.loadGuilds();
  }
}
```

### Structure Frontend

```
apps/frontend/src/app/
├── features/                    # Pages principales (lazy loaded)
│   ├── auth/                    # Login + OAuth callback
│   ├── dashboard/               # Vue d'ensemble serveur
│   ├── server-list/             # Sélection serveur
│   ├── server-info/             # Détails serveur
│   ├── members/                 # Gestion membres
│   └── [feature]/
│
├── services/                    # Pattern Facade
│   ├── auth/
│   │   ├── auth-facade.service.ts
│   │   ├── auth-api.service.ts
│   │   └── auth-data.service.ts
│   ├── guild/
│   ├── member/
│   ├── channel/
│   └── [feature]/
│
├── components/                  # Composants réutilisables
│   └── core/
│       ├── member-roles.component.ts
│       └── member-action-modals.component.ts
│
├── guards/                      # Route guards
│   ├── auth.guard.ts            # Vérifie JWT
│   ├── guest.guard.ts           # Redirige si connecté
│   └── guild.guard.ts           # Vérifie serveur sélectionné
│
├── interceptors/
│   └── auth.interceptor.ts      # Auto-inject JWT
│
├── layout/                      # Template Sakai
│   ├── topbar/
│   ├── menu/
│   └── footer/
│
├── app.routes.ts                # Routing
└── app.config.ts                # Config globale
```

---

## 🔐 Authentification

### Flow OAuth Discord

```
1. User clique "Login with Discord"
   → GET /api/auth/discord/login (Backend)

2. Backend génère CSRF state token
   → Redis: oauth:state:{state} = {userId, timestamp} (TTL: 10min)
   → Redirect: https://discord.com/oauth2/authorize?...

3. User autorise sur Discord

4. Discord callback
   → GET /api/auth/discord/callback?code=xxx&state=yyy

5. Backend vérifie state + échange code → tokens
   → POST https://discord.com/api/oauth2/token
   → GET https://discord.com/api/users/@me
   → Encrypt tokens + save DB

6. Backend génère JWT + session temporaire
   → Redis: oauth:session:{sessionId} = {jwt, userId} (TTL: 5min)
   → Redirect: http://frontend/auth/callback?session=xxx

7. Frontend échange session → JWT
   → POST /api/auth/exchange-session {sessionId}
   → Store JWT (localStorage)
   → Store refresh token (httpOnly cookie - sécurité)

8. Frontend charge user data + guilds
   → Navigate /server-list
```

### Tokens

**Access Token (JWT)** :
- Stocké : localStorage (frontend)
- Durée : 7 jours
- Contenu : `{ sub: userId, discordId, username }`
- Usage : Authorization header

**Refresh Token** :
- Stocké : httpOnly cookie (sécurité renforcée)
- Durée : 30 jours
- Usage : Renouveler access token

**Discord Tokens** :
- Stockés : DB (encrypted)
- Usage : Appels Discord API côté backend

### Guards Frontend

```typescript
// auth.guard.ts - Protège routes authentifiées
canActivate(): boolean {
  if (!this.authFacade.isAuthenticated()) {
    this.router.navigate(['/auth/login']);
    return false;
  }
  return true;
}

// guild.guard.ts - Vérifie serveur sélectionné
canActivate(): boolean {
  if (!this.guildFacade.selectedGuildId()) {
    this.router.navigate(['/server-list']);
    return false;
  }
  return true;
}
```

---

## 📚 Technologies & Versions

### Backend
- **NestJS** - Framework Node.js
- **Prisma** - ORM PostgreSQL
- **PostgreSQL** - Base de données principale
- **Redis** - Cache & sessions
- **TimescaleDB** - Extension PostgreSQL pour time-series (stats)
- **@nestjs/jwt** - JWT tokens
- **@nestjs/passport** - OAuth strategies
- **Discord.js** - Client Discord API REST

### Gateway
- **NestJS** - Framework
- **Socket.IO** - WebSocket bidirectionnel

### Bot
- **SapphireJS** - Framework Discord.js
- **Discord.js** - SDK Discord
- **Socket.IO client** - Communication Gateway
- **SQLite** - Backup offline events

### Frontend
- **Angular 20** - Framework (standalone components)
- **PrimeNG 20** - UI components
- **TailwindCSS** - Utility CSS
- **RxJS** - Async operations
- **Signals** - Reactive state (Angular moderne)

### Shared
- **TypeScript** - Langage (strict mode)
- **ESLint** - Linter (strict)
- **Prettier** - Formatage

---

## 🛠️ Conventions de Code

### TypeScript Strict

```typescript
// ✅ BIEN - Typage fort
async loadGuilds(): Promise<void> {
  const guilds: GuildDTO[] = await firstValueFrom(
    this.guildApi.getGuilds()
  );
}

// ❌ MAL - any interdit
async loadGuilds(): Promise<any> {
  const guilds = await this.guildApi.getGuilds();
}
```

### Clean Code

**Règles** :
- Méthodes < 50 lignes
- Une responsabilité par fonction
- Nommage explicite (pas d'abbréviations cryptiques)
- JSDoc sur méthodes publiques
- Pas de duplication (DRY)

```typescript
// ✅ BIEN - Méthode courte, claire
async kickMember(guildId: string, userId: string, reason?: string): Promise<void> {
  await this.discordApi.kickMember(guildId, userId, reason);
  this.memberData.removeMember(userId);
  this.showSuccessToast('Membre expulsé');
}

// ❌ MAL - Trop long, fait plusieurs choses
async kickMember(guildId: string, userId: string, reason?: string): Promise<void> {
  // ... 80 lignes de code ...
}
```

### Naming Conventions

**Services** :
```typescript
GuildFacadeService      // Orchestration
GuildApiService         // HTTP
GuildDataService        // State
```

**DTOs** :
```typescript
CreateGuildDTO          // Input
GuildResponseDTO        // Output
UpdateGuildDTO          // Partial update
```

**Components** :
```typescript
MemberListComponent     // Smart (container)
MemberCardComponent     // Dumb (presentational)
```

**Fichiers** :
```
guild-facade.service.ts
guild-api.service.ts
guild-data.service.ts
member-list.component.ts
```

---

## 📂 Où Trouver Quoi

### Backend

```
apps/backend/src/
├── main.ts                      # Bootstrap NestJS
├── app.module.ts                # Import modules
├── core/
│   ├── auth/                    # Authentification OAuth
│   └── guards/                  # Guards JWT
├── modules/
│   ├── [feature]/               # Modules métier
│   │   ├── [feature].module.ts
│   │   ├── [feature].service.ts
│   │   ├── [feature].controller.ts
│   │   └── dto/
│   └── module-system/           # Registry des modules
├── integrations/
│   └── discord/                 # Client Discord API
│       ├── discord.service.ts
│       ├── resources/           # Guilds, Members, Channels, etc.
│       └── rate-limit/
└── common/
    ├── decorators/
    ├── filters/
    └── interceptors/
```

### Frontend

```
apps/frontend/src/app/
├── features/
│   └── [feature]/               # Pages feature
│       ├── [feature].component.ts
│       └── components/          # Composants locaux
├── services/
│   └── [feature]/               # Pattern Facade
│       ├── [feature]-facade.service.ts
│       ├── [feature]-api.service.ts
│       └── [feature]-data.service.ts
├── components/
│   └── core/                    # Composants réutilisables
├── guards/
├── interceptors/
└── layout/                      # Template Sakai
```

### Bot

```
apps/bot/src/
├── index.ts                     # Bootstrap Sapphire
├── gateway/
│   └── gateway-client.ts        # WebSocket client
├── modules/
│   └── [feature]/
│       ├── [feature].module.ts
│       └── listeners/           # Discord event listeners
│           └── *.listener.ts
└── lib/
    ├── setup.ts
    └── backup/                  # SQLite backup
```

### Gateway

```
apps/gateway/src/
├── main.ts
├── gateway/
│   ├── gateway.gateway.ts       # Socket.IO server
│   └── bot-connection.service.ts
```

### Shared Types

```
packages/shared-types/src/
├── dtos/
│   ├── auth/                    # DTOs auth
│   ├── bot-events/              # Events Discord
│   └── modules/                 # DTOs modules
├── enums/
│   ├── subscription.enum.ts
│   └── module-category.enum.ts
├── interfaces/
│   ├── discord/                 # Guild, Member, Channel, etc.
│   └── modules/                 # Module definitions
└── modules/
    └── [module]/
        └── [module].definition.ts
```

---

## 🔑 Points d'Entrée Importants

### Backend
- `apps/backend/src/main.ts` - Bootstrap app
- `apps/backend/src/app.module.ts` - Import tous les modules
- `apps/backend/prisma/schema.prisma` - Schéma DB
- `apps/backend/.env` - Variables environnement

### Frontend
- `apps/frontend/src/app.routes.ts` - Configuration routing
- `apps/frontend/src/app.config.ts` - Configuration globale
- `apps/frontend/src/environments/environment.ts` - Variables env
- `apps/frontend/src/main.ts` - Bootstrap Angular

### Bot
- `apps/bot/src/index.ts` - Bootstrap Sapphire client
- `apps/bot/src/gateway/gateway-client.ts` - Connexion Gateway
- `apps/bot/.env` - Token Discord bot

### Gateway
- `apps/gateway/src/main.ts` - Bootstrap WebSocket server
- `apps/gateway/src/gateway/gateway.gateway.ts` - Hub Socket.IO

---

## 🎯 Décisions Techniques Clés

### Pourquoi Gateway Séparé ?

**Raisons** :
1. **Scaling horizontal** : Plusieurs bots peuvent se connecter au même Gateway
2. **Isolation** : Logique WebSocket séparée du backend
3. **Debugging** : Plus facile de tracer les events
4. **Flexibilité** : Remplacer bot ou backend sans tout casser

### Pourquoi Pattern Facade Frontend ?

**Raisons** :
1. **Séparation des responsabilités** : HTTP ≠ State ≠ Logic
2. **Testabilité** : Chaque couche testable isolément
3. **Maintenabilité** : Changement d'API ? Modifier uniquement API service
4. **Simplicité composants** : Components deviennent dumb et légers

### Pourquoi Signals Au Lieu de BehaviorSubject Partout ?

**Raisons** :
1. **Simplicité** : Moins de `.subscribe()` manuels à gérer
2. **Performance** : Fine-grained reactivity (re-render uniquement ce qui change)
3. **Futur d'Angular** : Angular pousse Signals comme standard
4. **Computed values** : Plus simple que `combineLatest`

### Pourquoi TimescaleDB ?

**Raisons** :
1. **Optimisé time-series** : Stats avec millions de rows
2. **Compatible PostgreSQL** : Pas de DB supplémentaire
3. **Continuous aggregates** : Agrégations automatiques
4. **Compression** : Stockage efficace des vieilles données

### Pourquoi Monorepo ?

**Raisons** :
1. **Types partagés** : Un seul package `shared-types` pour tout
2. **Code sync** : Backend + Frontend + Bot toujours cohérents
3. **Refactoring** : Renommer un DTO = mise à jour partout automatique
4. **DX** : Un seul `npm install` pour tout

---

## 📖 Documentation Complémentaire

Pour des détails **spécifiques**, consulter :

### Par Thème
- **État d'avancement** : `STATUS.md` (mis à jour régulièrement)
- **Architecture détaillée** : `docs/DISCORD_ADMIN_APP_OVERVIEW.md`
- **Frontend audit** : `docs/FRONTEND_SAKAI_AUDIT.md`

### Par Module
- **Module Welcome** : `docs/modules/welcome/`
- **Module Stats** : `docs/modules/stats/`
- **Module System** : `docs/modules/PHASE_1_COMPLETE.md`

### Par Système
- **Discord API** : `docs/backend/discord_API/DISCORD_MODULE_DOC.md`
- **Base de données** : `docs/database/`
- **Authentification** : Voir section Auth dans `DISCORD_ADMIN_APP_OVERVIEW.md`

---

## 🚫 Ce Fichier NE Contient PAS

Pour garder ce fichier **stable et léger**, il ne contient **JAMAIS** :

❌ **État d'avancement détaillé** → Voir `STATUS.md`  
❌ **TODO lists actuelles** → Voir `STATUS.md`  
❌ **Bugs connus** → Voir `STATUS.md` ou GitHub Issues  
❌ **Code complet** → Voir fichiers sources  
❌ **Snippets longs** → Voir docs/ spécifiques  
❌ **Historique des changes** → Voir Git commits  

---

## 📝 Usage de Ce Fichier

### Pour Claude (LLM)
```
Au début de chaque conversation :
1. Lire CONTEXT.md (ce fichier) - Contexte global stable
2. Lire STATUS.md - État actuel du projet
3. Demander fichiers spécifiques si besoin
```

### Pour Développeurs Humains
```
Première fois sur le projet ?
1. Lire CONTEXT.md - Comprendre l'architecture
2. Lire STATUS.md - Savoir où on en est
3. Setup env (voir README.md)
4. Lancer en dev (voir DISCORD_ADMIN_APP_OVERVIEW.md)
```

### Quand Mettre à Jour Ce Fichier ?

**Uniquement si** :
- ✅ Changement d'architecture majeur (ex: ajout d'une app)
- ✅ Nouveau pattern adopté (ex: remplacer Facade par autre chose)
- ✅ Migration technologique (ex: Angular → React)
- ✅ Changement de stack (ex: PostgreSQL → MongoDB)

**Jamais pour** :
- ❌ Nouveau module créé (normal, c'est le but)
- ❌ Feature complétée (mettre à jour STATUS.md)
- ❌ Bug découvert (mettre à jour STATUS.md)
- ❌ Refactoring local (pas d'impact architecture)

---

**Dernière révision** : Novembre 2025  
**Prochaine révision prévue** : Uniquement si changement architectural majeur