# Fullstack Template - Documentation Complète

Un template de projet fullstack professionnel avec NestJS, Angular, PostgreSQL et Redis, conçu pour être cloné et utilisé immédiatement pour tout nouveau projet.

## 🎯 Objectif du Template

Ce template résout les problèmes récurrents lors du démarrage d'un nouveau projet :
- Configuration initiale longue et répétitive
- Connexion entre frontend et backend
- Gestion des types partagés
- Configuration de la base de données
- Structure de projet maintenable

## 🚀 Quick Start (5 minutes)

```bash
# 1. Cloner le projet
git clone <votre-repo-url>
cd fullstack-template

# 2. Configuration automatique complète
npm run setup

# 3. Lancer tout en mode développement
npm run dev:all

# 4. Tester que ça marche
# Ouvrir http://localhost:4200 -> Page de demo
# Tous les tests doivent être verts ✅
```

### Que fait `npm run setup` ?
1. **Installe** toutes les dépendances (root + apps + packages)
2. **Lance** PostgreSQL et Redis via Docker
3. **Applique** les migrations de base de données
4. **Insère** des données de test (3 utilisateurs)

## 🔧 Après clonage d'un projet existant

Si vous clonez ce template depuis un autre projet :
```bash
# Nettoyer les volumes Docker précédents
docker volume prune -f

# Setup complet
npm run setup

## 📊 Vérification que tout fonctionne

Une fois lancé, vous devriez voir :

### ✅ Frontend (http://localhost:4200)
- Page de demo accessible
- Tests "Health Check", "Base de données", "Types Partagés" tous verts
- Aucune erreur dans la console du navigateur

### ✅ Backend (http://localhost:3000)
- API accessible
- Endpoints de demo répondent :
  - `GET /api/demo/health` 
  - `GET /api/demo/database`
  - `GET /api/demo/shared-types`

### ✅ Base de données (http://localhost:8080)
- Adminer accessible (serveur: postgres, user: devuser, password: devpassword)
- Tables `users`, `accounts`, `_prisma_migrations` présentes
- 3 utilisateurs de test créés

## 🏗️ Architecture du Projet

### Structure des dossiers
```
fullstack-template/
├── apps/                           # Applications principales
│   ├── backend/                    # API NestJS
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   └── demo/          # Module de démonstration
│   │   │   ├── prisma/            # Service Prisma
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Modèles de données
│   │   │   └── seed.ts            # Données de test
│   │   ├── .env.development       # Variables d'environnement dev
│   │   ├── .env.production        # Variables d'environnement prod
│   │   └── .env.example           # Template des variables
│   │
│   └── frontend/                   # Application Angular
│       ├── src/
│       │   ├── app/
│       │   │   ├── pages/
│       │   │   │   └── demo/      # Page de démonstration
│       │   │   ├── services/      # Services Angular
│       │   │   └── environments/  # Configuration par environnement
│       │   └── styles.scss
│       └── angular.json
│
├── packages/                       # Code partagé
│   └── shared-types/              # Types TypeScript partagés
│       ├── src/
│       │   ├── dtos/              # Objets de transfert de données
│       │   ├── enums/             # Énumérations
│       │   ├── constants/         # Constantes
│       │   └── index.ts           # Point d'entrée
│       ├── package.json
│       └── tsconfig.json
│
├── infrastructure/                 # Infrastructure et DevOps
│   └── docker/
│       ├── docker-compose.dev.yml # Services pour développement
│       ├── .env.dev               # Variables Docker
│       └── .env.example
│
├── docs/                          # Documentation projet
├── scripts/                       # Scripts d'automatisation
├── package.json                   # Configuration workspace
└── README.md
```

### Flux de données
```
Frontend (Angular) 
    ↕ HTTP + Types partagés
Backend (NestJS) 
    ↕ Prisma ORM
Base de données (PostgreSQL)
```

## 🛠️ Technologies et Versions

### Frontend
- **Angular 20** : Framework web moderne
- **Standalone Components** : Architecture modulaire sans NgModules
- **Signals** : Gestion d'état réactive native
- **TypeScript Strict** : Typage fort

### Backend  
- **NestJS 10+** : Framework Node.js inspiré d'Angular
- **Prisma** : ORM moderne pour TypeScript
- **Variables d'environnement** : Configuration par fichiers .env

### Base de données
- **PostgreSQL 16** : Base de données relationnelle
- **Redis 7** : Cache et sessions (prêt à utiliser)

### DevOps et Outils
- **Docker** : PostgreSQL + Redis pour développement
- **npm workspaces** : Monorepo sans complexity supplémentaire
- **dotenv-cli** : Gestion des environnements

## 🔧 Commandes Détaillées

### Développement quotidien
```bash
# Tout lancer d'un coup (recommandé)
npm run dev:all

# Ou séparément
npm run dev:backend          # NestJS sur port 3000
npm run dev:frontend         # Angular sur port 4200

# Base de données
npm run db:up               # Démarrer PostgreSQL + Redis
npm run db:down             # Arrêter les services
npm run db:logs             # Voir les logs
npm run db:reset            # Redémarrer proprement
```

### Base de données et Prisma
```bash
# Migrations (depuis apps/backend)
npm run prisma:migrate      # Créer/appliquer migration
npm run prisma:generate     # Générer client Prisma
npm run prisma:studio       # Interface graphique
npm run prisma:reset        # Reset complet + seeds

# Seeds de données
npm run prisma:seed         # Insérer données de test
```

### Compilation et build
```bash
# Types partagés (depuis packages/shared-types)
npm run build               # Compiler les types TS -> JS
npm run dev                 # Mode watch (recompile auto)

# Applications
npm run build:backend       # Build NestJS
npm run build:frontend      # Build Angular
npm run build               # Build tout
```

### Maintenance
```bash
npm run clean               # Supprimer node_modules
npm run clean:all           # DB + node_modules
npm run install:all         # Réinstaller tout
```

## 🔐 Gestion des Environnements

### Structure des fichiers de configuration

**Backend** (`apps/backend/`)
- `.env.development` : Variables pour développement local
- `.env.production` : Variables pour production
- `.env.example` : Template avec toutes les variables nécessaires

**Frontend** (`apps/frontend/src/environments/`)
- `environment.ts` : Configuration développement
- `environment.prod.ts` : Configuration production

**Docker** (`infrastructure/docker/`)
- `.env.dev` : Variables pour les conteneurs de développement
- `.env.example` : Template pour Docker

### Variables importantes

**Backend (.env.development)**
```env
# Base de données
DATABASE_URL="postgresql://devuser:devpassword@localhost:5432/myproject_dev"
REDIS_URL="redis://localhost:6379"

# Serveur
PORT=3000
NODE_ENV=development

# CORS et sécurité
FRONTEND_URL=http://localhost:4200
JWT_SECRET=dev-jwt-secret-change-in-production
```

**Frontend (environment.ts)**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  appName: 'My Project Template',
  version: '1.0.0'
};
```

## 🗃️ Base de Données

### Modèles inclus

Le template inclut des modèles User et Account optimisés pour l'authentification moderne :

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  avatar    String?
  password  String?              // Auth locale optionnelle
  isActive  Boolean  @default(true)
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  accounts  Account[]           // Connexions OAuth
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  provider          String  // "google", "discord", etc.
  providerAccountId String
  type              String  // "oauth", "email"
  accessToken       String?
  refreshToken      String?
  expiresAt         Int?
  user User @relation(fields: [userId], references: [id])
}

enum Role {
  USER
  ADMIN
  MODERATOR
}
```

### Données de test incluses
- **Admin User** (admin@example.com) - Rôle ADMIN
- **Regular User** (user@example.com) - Rôle USER  
- **OAuth User** (oauth@example.com) - Avec compte Google lié

## 🔗 Types Partagés

### Comment ça fonctionne

1. **Définition** : Types créés dans `packages/shared-types/`
2. **Compilation** : TypeScript → JavaScript + fichiers .d.ts
3. **Import** : Backend et frontend importent depuis `@my-project/shared-types`
4. **Synchronisation** : Un seul endroit pour définir les contrats d'API

### Structure recommandée

```typescript
// packages/shared-types/src/dtos/user.dto.ts
export interface CreateUserDto {
  email: string;
  name: string;
  password?: string;
}

export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
}

// packages/shared-types/src/enums/user-role.enum.ts
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR'
}

// packages/shared-types/src/constants/validation.constants.ts
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  EMAIL_MAX_LENGTH: 255,
  NAME_MAX_LENGTH: 100
} as const;
```

### Utilisation dans le code

**Backend (NestJS)**
```typescript
import { Controller, Post, Body } from '@nestjs/common';
import type { CreateUserDto, UserResponseDto } from '@my-project/shared-types';

@Controller('users')
export class UsersController {
  @Post()
  async createUser(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    // Auto-complétion et vérification de types garanties
    return this.usersService.create(dto);
  }
}
```

**Frontend (Angular)**
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { CreateUserDto, UserResponseDto } from '@my-project/shared-types';

@Injectable()
export class UsersService {
  createUser(userData: CreateUserDto): Observable<UserResponseDto> {
    // Même types, même auto-complétion
    return this.http.post<UserResponseDto>('/api/users', userData);
  }
}
```

## 🧪 Module de Démonstration

Le template inclut un module `demo` complet pour tester toutes les fonctionnalités.

### Endpoints de test inclus

**GET /api/demo/health**
- Teste la connexion à la base de données
- Vérifie les temps de réponse
- Statut général du système

**GET /api/demo/database**  
- Compte les utilisateurs et comptes
- Vérifie la connectivité Prisma
- Informations sur les migrations

**GET /api/demo/shared-types**
- Teste les types partagés entre front/back
- Vérifie la compilation et les imports

### Page de démonstration frontend

Accessible sur `http://localhost:4200/demo` :
- Tests automatiques au chargement
- Interface graphique pour tester chaque endpoint
- Affichage des résultats en temps réel
- Section debug avec données brutes JSON

## 🚀 Déploiement

### Préparation pour la production

1. **Variables d'environnement**
   - Copier `.env.example` vers `.env.production`
   - Configurer les vraies URLs et secrets

2. **Base de données**
   - Utiliser une base PostgreSQL de production
   - Appliquer les migrations : `npm run prisma:migrate -- deploy`

3. **Build des applications**
   ```bash
   npm run build
   ```

4. **Docker** (optionnel)
   - Utiliser `docker-compose.prod.yml` pour l'orchestration complète

## 🔧 Personnalisation

### Adapter à votre projet

1. **Renommer le projet**
   - Changer `@my-project/shared-types` dans tous les package.json
   - Mettre à jour les noms de conteneurs Docker

2. **Ajouter des modèles de données**
   - Modifier `apps/backend/prisma/schema.prisma`
   - Créer migration : `npm run prisma:migrate`
   - Mettre à jour les seeds si nécessaire

3. **Ajouter des types partagés**
   - Créer dans `packages/shared-types/src/`
   - Exporter dans `index.ts`
   - Compiler : `npm run build`

4. **Supprimer le module demo**
   - Une fois en confiance, supprimer `apps/backend/src/modules/demo/`
   - Supprimer `apps/frontend/src/app/pages/demo/`
   - Nettoyer les routes et imports

## 🐛 Dépannage

### Problèmes courants

**"Cannot reach database server"**
- Vérifier que Docker tourne : `docker ps`
- Relancer la DB : `npm run db:reset`
- Vérifier les variables dans `.env.development`

**"Module not found: @my-project/shared-types"**
- Compiler les types : `cd packages/shared-types && npm run build`
- Réinstaller : `npm run install:all`

**"Port already in use"**
- Changer les ports dans les fichiers de configuration
- Ou arrêter les processus : `lsof -ti:3000 | xargs kill`

**Erreurs TypeScript avec Prisma**
- Régénérer le client : `npm run prisma:generate`
- Vérifier que DATABASE_URL est correct

### Logs et debug

```bash
# Logs des services Docker
npm run db:logs

# Logs du backend NestJS
cd apps/backend && npm run start:dev

# Tests manuels de l'API
curl http://localhost:3000/api/demo/health
```

## 🎯 Bonnes Pratiques

### Structure de code
- **Modules métier** : Organisez par domaine (users, products, etc.)
- **Types partagés** : Préfixez par le nom du module (UserCreateDto vs CreateDto)
- **Variables d'env** : Toujours des exemples dans .env.example

### Sécurité
- **Jamais** commiter les vrais .env de production
- **Toujours** utiliser des secrets forts en production
- **Valider** les entrées utilisateur avec des DTOs

### Développement
- **Migrations** : Nommez explicitement vos migrations
- **Seeds** : Gardez des données de test cohérentes
- **Tests** : Utilisez la page demo pour valider les changements

## 📚 Ressources

- [Documentation NestJS](https://docs.nestjs.com/)
- [Documentation Angular](https://angular.io/docs)
- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation Docker](https://docs.docker.com/)

# Système d'Authentification Complet

Ce template inclut un système d'authentification moderne et modulaire avec support OAuth, conçu pour être réutilisable sur tous vos projets.

## Architecture du Système

### Backend (NestJS)

**Structure modulaire par providers :**
```
apps/backend/src/modules/auth/
├── config/
│   └── oauth.config.ts           # Configuration centralisée OAuth
├── controllers/
│   ├── auth.controller.ts        # Endpoints auth locale
│   └── oauth.controller.ts       # Endpoints OAuth
├── services/
│   ├── auth.service.ts           # Logique auth principale
│   └── jwt.service.ts            # Gestion JWT et refresh tokens
├── strategies/
│   ├── local.strategy.ts         # Authentification email/password
│   ├── jwt.strategy.ts           # Validation des tokens JWT
│   ├── google.strategy.ts        # OAuth Google
│   └── discord.strategy.ts       # OAuth Discord
├── guards/
│   ├── jwt-auth.guard.ts         # Protection des routes
│   └── local-auth.guard.ts       # Guard pour login local
├── interfaces/
│   └── auth-request.interface.ts # Types pour les requêtes authentifiées
└── auth.module.ts                # Module principal avec import conditionnel
```

### Frontend (Angular)

**Pattern Facade avec séparation des responsabilités :**
```
apps/frontend/src/app/services/auth/
├── auth-data.service.ts          # Gestion d'état avec signaux
├── auth-api.service.ts           # Appels API HTTP
└── auth-facade.service.ts        # Interface publique (facade)

apps/frontend/src/app/guards/
├── auth.guard.ts                 # Protection routes privées
└── guest.guard.ts                # Redirection si déjà connecté

apps/frontend/src/app/interceptors/
└── auth.interceptor.ts           # Injection automatique tokens + refresh

apps/frontend/src/app/pages/
├── login/                        # Page de connexion
├── dashboard/                    # Page protégée
└── auth-callback/                # Callback OAuth
```

## Configuration des Providers

### Variables d'Environnement

**Backend (`apps/backend/.env.development`) :**
```env
# Auth Providers Configuration
AUTH_PROVIDERS=local,google,discord
LOCAL_ENABLED=true

# Google OAuth
GOOGLE_ENABLED=false
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Discord OAuth  
DISCORD_ENABLED=false
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Server URLs
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:4200

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Activation/Désactivation des Providers

Le système utilise des **feature flags** pour activer/désactiver les providers OAuth :

1. **Lister les providers** dans `AUTH_PROVIDERS`
2. **Activer individuellement** avec `PROVIDER_ENABLED=true`
3. **Configurer les credentials** OAuth

**Exemples :**
```env
# Seulement auth locale
AUTH_PROVIDERS=local
LOCAL_ENABLED=true

# Auth locale + Google
AUTH_PROVIDERS=local,google
LOCAL_ENABLED=true
GOOGLE_ENABLED=true

# Tous les providers
AUTH_PROVIDERS=local,google,discord
LOCAL_ENABLED=true
GOOGLE_ENABLED=true
DISCORD_ENABLED=true
```

## API Endpoints

### Authentification Locale

| Endpoint | Method | Description | Body |
|----------|--------|-------------|------|
| `/api/auth/register` | POST | Inscription | `{email, password, name}` |
| `/api/auth/login` | POST | Connexion | `{email, password}` |
| `/api/auth/refresh` | POST | Renouveler tokens | `{refreshToken}` |
| `/api/auth/logout` | POST | Déconnexion | `{refreshToken}` |
| `/api/auth/logout-all` | POST | Déconnexion tous appareils | Headers: `Authorization` |
| `/api/auth/profile` | GET | Profil utilisateur | Headers: `Authorization` |

### OAuth

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/providers` | GET | Liste des providers actifs |
| `/api/auth/google` | GET | Redirection vers Google |
| `/api/auth/google/callback` | GET | Callback Google |
| `/api/auth/discord` | GET | Redirection vers Discord |
| `/api/auth/discord/callback` | GET | Callback Discord |

### Réponses Type

**Connexion réussie :**
```json
{
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "role": "USER",
    "isActive": true,
    "emailVerified": true,
    "createdAt": "2025-01-15T..."
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

## Flow d'Authentification

### 1. Authentification Locale

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as Database

    U->>F: Login (email/password)
    F->>B: POST /api/auth/login
    B->>DB: Validate credentials
    DB-->>B: User data
    B->>B: Generate JWT + Refresh Token
    B->>DB: Store refresh token
    B-->>F: {user, accessToken, refreshToken}
    F->>F: Store tokens in localStorage
    F-->>U: Redirect to dashboard
```

### 2. OAuth (Google/Discord)

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant O as OAuth Provider
    participant DB as Database

    U->>F: Click "Login with Google"
    F->>B: GET /api/auth/google
    B-->>O: Redirect to OAuth provider
    O-->>U: OAuth consent screen
    U->>O: Approve access
    O->>B: GET /api/auth/google/callback
    B->>O: Exchange code for profile
    O-->>B: User profile data
    B->>DB: findOrCreateOAuthUser()
    DB-->>B: User data
    B->>B: Generate JWT + Refresh Token
    B-->>F: Redirect to /auth/callback?token=...
    F->>F: Extract tokens from URL
    F->>B: GET /api/auth/profile (with token)
    B-->>F: User profile
    F-->>U: Redirect to dashboard
```

### 3. Gestion Automatique des Tokens

L'**intercepteur HTTP** gère automatiquement :

- **Injection des tokens** : Ajoute `Authorization: Bearer <token>` à toutes les requêtes
- **Refresh automatique** : Intercepte les erreurs 401 et renouvelle les tokens
- **Déconnexion forcée** : Redirige vers login si le refresh échoue

## Sécurité

### Tokens JWT

- **Access Token** : Durée courte (15min par défaut)
- **Refresh Token** : Durée longue (7 jours par défaut) 
- **Stockage** : localStorage avec fallback mémoire
- **Révocation** : Possibilité de révoquer tous les tokens d'un utilisateur

### Validation

- **Mots de passe** : Hashés avec bcryptjs (rounds: 12)
- **Email** : Validation d'unicité
- **OAuth** : Email automatiquement vérifié
- **Guards** : Protection des routes sensibles

## Modèles de Données

### User
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  avatar        String?
  password      String?              // Auth locale optionnelle
  emailVerified DateTime?
  isActive      Boolean  @default(true)
  role          Role     @default(USER)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  accounts      Account[]            // Comptes OAuth liés
  refreshTokens RefreshToken[]
}
```

### Account (OAuth)
```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  provider          String  // "google", "discord"
  providerAccountId String
  type              String  // "oauth"
  accessToken       String?
  refreshToken      String?
  idToken           String?
  expiresAt         Int?
  
  user User @relation(fields: [userId], references: [id])
  @@unique([provider, providerAccountId])
}
```

## Utilisation dans les Composants

### Injection de la Facade

```typescript
@Component({...})
export class MyComponent {
  private authFacade = inject(AuthFacadeService);
  
  // Signaux reactifs
  isAuthenticated = this.authFacade.isAuthenticated;
  currentUser = this.authFacade.user;
  loading = this.authFacade.loading;
  error = this.authFacade.error;
}
```

### Méthodes Disponibles

```typescript
// Authentification
await this.authFacade.login({email, password});
await this.authFacade.register({email, password, name});
await this.authFacade.logout();

// OAuth
this.authFacade.redirectToGoogle();
this.authFacade.redirectToDiscord();

// Gestion des providers
const providers = await this.authFacade.getAvailableProviders();
```

### Protection des Routes

```typescript
// Routes publiques (redirection si connecté)
{
  path: 'login',
  component: LoginComponent,
  canActivate: [publicGuard]
}

// Routes protégées
{
  path: 'dashboard',
  component: DashboardComponent,
  canActivate: [authGuard]
}
```

## Configuration OAuth

### Google OAuth

1. **Google Cloud Console** : https://console.cloud.google.com/
2. **Créer un projet** et activer "Google Identity Services API"
3. **Configurer l'écran de consentement** (nom app + emails)
4. **Créer ID client OAuth 2.0** :
   - Origines autorisées : `https://your-ngrok-url.com`
   - URI de redirection : `https://your-ngrok-url.com/api/auth/google/callback`
5. **Copier CLIENT_ID et CLIENT_SECRET** dans `.env.development`

### Discord OAuth

1. **Discord Developer Portal** : https://discord.com/developers/applications
2. **Créer une application**
3. **Section OAuth2** :
   - Redirect URI : `https://your-ngrok-url.com/api/auth/discord/callback`
   - Scopes : `identify` + `email`
4. **Copier CLIENT_ID et CLIENT_SECRET** dans `.env.development`

### Développement Local avec Ngrok

Pour contourner les restrictions localhost des providers OAuth :

```bash
# Installer ngrok
npm install -g ngrok

# Exposer le backend
ngrok http 3000

# Utiliser l'URL HTTPS fournie dans la configuration OAuth
```

## Données de Test

Le système inclut des utilisateurs de test (via seeds) :

| Email | Password | Type | Description |
|-------|----------|------|-------------|
| `admin@example.com` | `password123` | Local + Admin | Compte administrateur |
| `user@example.com` | `password123` | Local | Utilisateur standard |
| `google@example.com` | - | OAuth Google | Compte lié à Google |
| `discord@example.com` | - | OAuth Discord | Compte lié à Discord |

## Extensibilité

### Ajouter un Nouveau Provider OAuth

1. **Installer la dépendance** : `npm install passport-newprovider`
2. **Créer la stratégie** : `new-provider.strategy.ts`
3. **Ajouter la configuration** dans `oauth.config.ts`
4. **Étendre le controller** OAuth avec les endpoints
5. **Configurer les variables** d'environnement

### Pattern Répétable

Le système suit un pattern cohérent facilement extensible :
- Configuration centralisée avec feature flags
- Strategies conditionnelles selon la config
- Endpoints uniformes pour tous les providers
- Gestion automatique des comptes utilisateurs

Cette architecture permet d'ajouter facilement GitHub, LinkedIn, Apple, etc. en suivant le même pattern que Google et Discord.

# Module Discord API - Documentation

Cette section décrit l'intégration complète du module Discord API dans le template fullstack, permettant de créer des applications d'administration Discord.

## Architecture du Module Discord

### Structure Backend (NestJS)

```
apps/backend/src/modules/discord/
├── controllers/
│   └── discord.controller.ts     # Endpoints API Discord
├── services/
│   └── discord.service.ts        # Service principal Discord
└── discord.module.ts             # Module NestJS
```

### Types Partagés

```
packages/shared-types/src/dtos/
└── discord.dto.ts                # DTOs Discord avec nomenclature cohérente
```

### Frontend (Angular)

```
apps/frontend/src/app/
├── services/
│   └── endpoint-tester.service.ts   # Service de test des APIs
├── pages/
│   └── endpoint-tester/             # Page de test interactive
├── config/
│   └── test-endpoints.config.ts    # Configuration des endpoints
└── types/
    └── endpoint-tester.types.ts     # Types pour le testeur
```

## Configuration Discord

### Variables d'Environnement

**Backend (`.env.development`)** :
```env
# Discord OAuth (existant)
DISCORD_ENABLED=true
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Discord Bot Token (nouveau)
DISCORD_BOT_TOKEN=your-discord-bot-token
```

### Scopes Discord OAuth

Modifiez les scopes dans `apps/backend/src/modules/auth/strategies/discord.strategy.ts` :

```typescript
scope: ['identify', 'email', 'guilds'], // Ajout du scope 'guilds'
```

**Scopes supportés** :
- `identify` - Informations utilisateur de base
- `email` - Adresse email
- `guilds` - Liste des serveurs Discord
- `guilds.join` - Ajouter l'utilisateur à un serveur
- `guilds.members.read` - Lire les membres des serveurs

## API Endpoints Discord

### Endpoints de Diagnostic

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/discord/ping` | GET | Non | Test de connectivité Discord API |

### Endpoints Utilisateur

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/discord/user` | GET | Oui | Profil Discord de l'utilisateur connecté |
| `/api/discord/user/:userId` | GET | Bot | Informations d'un utilisateur par ID |

### Endpoints Serveurs

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/discord/guilds` | GET | Oui | Tous les serveurs de l'utilisateur |
| `/api/discord/guilds/admin` | GET | Oui | Serveurs avec droits admin seulement |

### Endpoints Debug

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/discord/debug/user-info` | GET | Oui | Infos utilisateur app + comptes liés |

## Gestion des Permissions Discord

### Détection des Droits Admin

Le système détecte automatiquement les droits d'administration sur les serveurs Discord :

```typescript
// Un utilisateur a des droits admin s'il est :
- Propriétaire du serveur (owner: true)
- A la permission ADMINISTRATOR (0x8)
- A la permission MANAGE_GUILD (0x20)
```

### Structure des DTOs

**Nomenclature cohérente** : Tous les DTOs suivent le pattern `NomDto`

```typescript
// Types de base
DiscordUserDto        // Utilisateur Discord
DiscordGuildDto       // Serveur Discord avec infos admin
DiscordGatewayDto     // Gateway Discord

// Types de diagnostic (gardés pour métadonnées)
DiscordPingResultDto  // Résultat ping avec latence
```

## Service Discord

### Méthodes Principales

```typescript
class DiscordService {
  // Test de connectivité
  async ping(): Promise
  
  // Utilisateurs
  async getAuthenticatedUser(token: string): Promise
  async getUser(userId: string): Promise
  
  // Serveurs
  async getUserGuilds(token: string): Promise
  async getUserAdminGuilds(token: string): Promise
  
  // Utilitaires
  formatUserAvatar(user: DiscordUserDto): string
}
```

### Gestion d'Erreurs

- **DTOs directs** pour les données métier
- **Exceptions NestJS** pour les erreurs (pas de wrapper `{success, error}`)
- **DTOs Result** seulement pour les endpoints de diagnostic avec métadonnées

## Testeur d'Endpoints Intégré

### Configuration des Tests

Tous les endpoints sont configurés dans `test-endpoints.config.ts` :

```typescript
const TEST_ENDPOINTS: ApiEndpoint[] = [
  {
    id: 'discord-ping',
    name: 'Discord API Ping',
    method: 'GET',
    url: '/api/discord/ping',
    requiresAuth: false,
    category: 'Discord - Diagnostic',
    expectedResponse: 'DiscordPingResultDto'
  },
  // ... autres endpoints
];
```

### Fonctionnalités

- **Test unitaire** - Chaque endpoint individuellement
- **Test par catégorie** - Tous les endpoints d'une catégorie
- **Gestion automatique de l'auth** - Désactive les endpoints auth si non connecté
- **Historique des résultats** - 50 derniers tests conservés
- **Interface intuitive** - Groupage par catégorie, temps de réponse, statuts visuels

### Accès

```
http://localhost:4200/endpoint-tester
```

## Intégration Dashboard

### Profil Discord

Le dashboard affiche automatiquement :
- **Avatar Discord** (priorité sur l'avatar app)
- **Nom d'utilisateur Discord** avec discriminator
- **Statut de connexion** Discord dans les informations personnelles

### Configuration AuthFacade

```typescript
// Le signal discordUser est automatiquement chargé lors de la connexion
discordUser = signal(null);
```

## Installation et Configuration

### 1. Ajouter le Module Discord

```typescript
// apps/backend/src/app.module.ts
import { DiscordModule } from './modules/discord/discord.module';

@Module({
  imports: [
    // ... autres modules
    DiscordModule,
  ],
})
export class AppModule {}
```

### 2. Compiler les Types Partagés

```bash
cd packages/shared-types
npm run build
```

### 3. Ajouter les Routes Frontend

```typescript
// apps/frontend/src/app/app.routes.ts
{
  path: 'endpoint-tester',
  component: EndpointTesterComponent,
  title: 'API Endpoint Tester'
}
```

### 4. Configurer les Scopes Discord

1. **Modifier la stratégie Discord** pour inclure le scope `guilds`
2. **Se reconnecter via Discord OAuth** pour obtenir les nouvelles permissions
3. **Vérifier en base** que les tokens Discord sont sauvegardés

## Configuration Bot Discord (Optionnel)

Pour utiliser l'endpoint `/api/discord/user/:userId` :

### 1. Créer un Bot Discord

1. Aller sur https://discord.com/developers/applications
2. Sélectionner votre application
3. Aller dans "Bot" → "Add Bot"
4. Copier le token

### 2. Configurer le Token

```env
DISCORD_BOT_TOKEN=your-bot-token-here
```

### 3. Permissions Bot

Le bot n'a besoin d'aucune permission spéciale pour les endpoints actuels.

## Sécurité

### Tokens

- **User Tokens** : Utilisés pour les actions au nom de l'utilisateur (serveurs, profil)
- **Bot Token** : Utilisé pour récupérer des informations publiques Discord
- **Refresh automatique** : Géré par l'intercepteur Angular existant

### Scopes Minimum

Pour une app d'administration Discord de base :
```typescript
scope: ['identify', 'email', 'guilds']
```

### Variables Sensibles

- `DISCORD_CLIENT_SECRET` et `DISCORD_BOT_TOKEN` ne doivent jamais être exposés côté client
- Utiliser des variables d'environnement séparées pour production

## Développement et Debug

### Tests Rapides

1. **Page testeur** - `http://localhost:4200/endpoint-tester`
2. **Test ping** - Vérifier la connectivité Discord
3. **Test auth** - Vérifier les tokens utilisateur
4. **Test serveurs** - Lister les serveurs avec permissions

### Logs Utiles

```typescript
// Debug token bot
console.log('Bot token configured:', !!this.botToken);

// Debug scopes utilisateur
console.log('User accounts:', req.user.accounts);
```

### Erreurs Communes

**"Discord bot token not configured"**
- Vérifier `DISCORD_BOT_TOKEN` dans `.env.development`
- Redémarrer le backend après modification

**"No Discord account linked"**
- Se reconnecter via Discord OAuth
- Vérifier que les tokens sont sauvegardés en base

**Scopes insuffisants**
- Ajouter le scope `guilds` dans la stratégie Discord
- Se reconnecter pour obtenir les nouvelles permissions

## Extensibilité

### Ajouter de Nouveaux Endpoints

1. **Créer la méthode** dans `DiscordService`
2. **Ajouter l'endpoint** dans `DiscordController`
3. **Définir les types** dans `discord.dto.ts`
4. **Configurer le test** dans `test-endpoints.config.ts`

### Pattern Répétable

```typescript
// Service
async getGuildMembers(guildId: string): Promise {
  return this.makeDiscordRequest(
    `/guilds/${guildId}/members`,
    this.getBotHeaders()
  );
}

// Controller
@Get('guild/:guildId/members')
async getGuildMembers(@Param('guildId') guildId: string): Promise {
  return await this.discordService.getGuildMembers(guildId);
}

// Test config
{
  id: 'discord-guild-members',
  name: 'Membres du serveur',
  url: '/api/discord/guild/123456789/members',
  requiresAuth: false,
  category: 'Discord - Serveurs'
}
```

Ce module Discord fournit une base solide et extensible pour créer des applications d'administration Discord complètes.

# Système Discord Bot - Documentation

Cette section décrit l'architecture complète du système Discord Bot intégré au template, permettant la création d'applications d'administration et de modération Discord.

## Architecture du Système

### Structure des Applications

```
apps/
├── backend/                    # API NestJS principal
├── frontend/                   # Application Angular
├── gateway/                    # Gateway NestJS WebSocket
└── discord-bot/               # Bot Discord SapphireJS
```

### Flux de Communication

```
Discord ↔ Bot SapphireJS ↔ Gateway NestJS ↔ Backend Principal ↔ Base de données
                                ↕
                         Frontend Angular (WebSocket optionnel)
```

## Architecture Technique

### Gateway NestJS (Port 3001)

**Rôle** : Hub de communication WebSocket entre les bots Discord et le backend principal.

```
apps/gateway/
├── src/
│   ├── modules/bot-gateway/
│   │   ├── bot.gateway.ts              # WebSocket Gateway principal
│   │   ├── services/
│   │   │   └── bot-connection.service.ts # Gestion des connexions bots
│   │   └── bot-gateway.module.ts
│   ├── app.module.ts
│   └── main.ts
├── .env.development
└── package.json
```

**Fonctionnalités** :
- Gestion des connexions WebSocket multiples
- Routage des messages Bot ↔ Backend
- Monitoring des bots connectés
- Support multi-bots (extensible)

### Bot Discord SapphireJS

**Rôle** : Bot Discord qui capture les événements et les transmet à la Gateway.

```
apps/discord-bot/
├── src/
│   ├── services/
│   │   ├── gateway-client.service.ts   # Connexion WebSocket à la Gateway
│   │   └── event-storage.service.ts    # Stockage SQLite événements hors-ligne
│   ├── listeners/                      # Listeners Discord (guildCreate, messageCreate...)
│   ├── config/
│   │   └── bot.config.ts              # Configuration centralisée
│   └── index.ts
├── .env
└── data/events.sqlite                 # Base SQLite pour événements offline
```

**Fonctionnalités** :
- Écoute des événements Discord temps réel
- Transmission via WebSocket à la Gateway
- Stockage local SQLite en cas de déconnexion
- Reconnexion automatique avec envoi en batch

### Backend Principal

**Extensions pour Discord** :

```
apps/backend/src/modules/
├── gateway/
│   ├── controllers/gateway.controller.ts    # Endpoints test/contrôle
│   └── services/gateway-client.service.ts   # Client WebSocket vers Gateway
├── guild/
│   ├── services/guild-sync.service.ts       # Synchronisation guilds Discord
│   └── controllers/guild.controller.ts      # API gestion des serveurs
└── discord/                                 # Module API Discord existant
```

## Configuration et Variables d'Environnement

### Gateway (`apps/gateway/.env.development`)

```env
# Gateway Configuration
GATEWAY_PORT=3001
NODE_ENV=development

# CORS et sécurité
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4200

# Connexion avec le backend principal
BACKEND_URL=http://localhost:3000
```

### Bot Discord (`apps/discord-bot/.env`)

```env
# Discord Bot Configuration
DISCORD_TOKEN=your-discord-bot-token-here
BOT_ID=main-discord-bot
BOT_NAME=Discord Bot Principal

# Gateway Connection
GATEWAY_URL=http://localhost:3001
GATEWAY_RECONNECT_INTERVAL=5000

# Stockage local
SERVICE_NAME=discord-bot
LOG_LEVEL=debug
```

### Backend (`apps/backend/.env.development`)

```env
# Gateway WebSocket (nouveau)
GATEWAY_URL=http://localhost:3001

# Variables Discord existantes
DISCORD_ENABLED=true
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_BOT_TOKEN=your-discord-bot-token
```

## Modèles de Données

### Guild (Serveurs Discord)

```prisma
model Guild {
  id             String  @id @default(cuid())
  discordGuildId String  @unique @map("discord_guild_id")
  name           String
  icon           String?
  ownerDiscordId String  @map("owner_discord_id")
  
  // Status
  botAddedAt DateTime @default(now()) @map("bot_added_at")
  isActive   Boolean  @default(true) @map("is_active")
  
  // Métadonnées
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("guilds")
}
```

### Types Partagés

```typescript
// packages/shared-types/src/dtos/gateway.dto.ts
export interface BotEventDto {
  type: EventType;           // Type d'événement Discord
  guildId: string;          // ID du serveur Discord
  userId?: string;          // ID utilisateur (optionnel)
  channelId?: string;       // ID channel (optionnel)
  messageId?: string;       // ID message (optionnel)
  roleId?: string;          // ID rôle (optionnel)
  timestamp: Date;          // Horodatage
  data?: any;              // Données supplémentaires
}
```

## Démarrage et Développement

### Scripts NPM Mis à Jour

```json
{
  "scripts": {
    "dev:backend": "npm run start:dev --workspace=apps/backend",
    "dev:frontend": "npm run start --workspace=apps/frontend",
    "dev:gateway": "cd apps/gateway && npm run start:dev",
    "dev:bot": "cd apps/discord-bot && npm run dev",
    "dev:all": "npm run db:up && concurrently \"npm run dev:backend\" \"npm run dev:frontend\" \"npm run dev:gateway\" \"npm run dev:bot\"",
    
    "build:gateway": "cd apps/gateway && npm run build",
    "build:bot": "cd apps/discord-bot && npm run build"
  }
}
```

### Démarrage du Système Complet

```bash
# 1. Setup initial (base de données, migrations)
npm run setup

# 2. Démarrer tous les services
npm run dev:all

# Ou démarrage séquentiel pour debug :
npm run dev:gateway    # Port 3001
npm run dev:backend    # Port 3000  
npm run dev:frontend   # Port 4200
npm run dev:bot        # Se connecte à la Gateway
```

### Ordre de Démarrage Recommandé

1. **Base de données** (PostgreSQL + Redis via Docker)
2. **Gateway** - Hub de communication
3. **Backend** - Se connecte à la Gateway
4. **Bot Discord** - Se connecte à la Gateway
5. **Frontend** - Interface utilisateur

## API Endpoints Discord

### Gestion des Serveurs

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `GET /api/guilds` | GET | Liste des serveurs où le bot est présent |
| `GET /api/guilds/stats` | GET | Statistiques des serveurs |
| `POST /api/guilds/sync` | POST | Force la synchronisation des serveurs |

### Test de la Gateway

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `GET /api/gateway/ping` | GET | Test communication Backend → Gateway → Bot |
| `GET /api/gateway/status` | GET | Statut de connexion Gateway |
| `POST /api/gateway/send-to-bot/:botId` | POST | Envoyer message à un bot spécifique |
| `POST /api/gateway/broadcast` | POST | Diffuser message à tous les bots |

## Fonctionnalités Clés

### Gestion des Événements Discord

- **Temps réel** : Transmission immédiate des événements Discord
- **Offline resilience** : Stockage SQLite local en cas de déconnexion
- **Batch processing** : Envoi par batch lors de la reconnexion
- **Configuration flexible** : Événements activés/désactivés via config

### Synchronisation des Serveurs

- **Sync automatique** : Lors des événements `guildCreate`/`guildDelete`
- **Sync complète** : Au démarrage du bot
- **Gestion des états** : Serveurs actifs/inactifs selon présence du bot
- **API de contrôle** : Endpoints pour forcer la synchronisation

### Communication Multi-Services

- **WebSocket bidirectionnel** : Communication temps réel
- **Support multi-bots** : Architecture extensible pour plusieurs bots
- **Monitoring** : Suivi des connexions et heartbeat
- **Commandes à distance** : Envoi de commandes aux bots depuis le backend

## Tests et Debug

### Test de Connectivité

```bash
# Test ping complet Backend → Gateway → Bot
curl http://localhost:3000/api/gateway/ping

# Test statut Gateway
curl http://localhost:3000/api/gateway/status

# Test liste des serveurs
curl http://localhost:3000/api/guilds
```

### Logs et Monitoring

- **Gateway** : Logs des connexions WebSocket et routage des messages
- **Bot** : Logs des événements Discord et connexion Gateway
- **Backend** : Logs de traitement des événements et synchronisation
- **Stockage** : SQLite pour persistance des événements offline

## Architecture Extensible

Le système est conçu pour supporter :

- **Multiple bots Discord** sur différents serveurs
- **Événements personnalisés** via la configuration
- **Intégrations tierces** via l'API Gateway
- **Scaling horizontal** avec load balancing des bots

Cette architecture fournit une base robuste pour créer des applications Discord complètes avec administration, modération et monétisation des serveurs Discord.

