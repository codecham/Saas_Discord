# 📘 Documentation Module Discord - Backend

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Services Core](#services-core)
4. [Resources (Endpoints REST)](#resources-endpoints-rest)
5. [Gestion des erreurs](#gestion-des-erreurs)
6. [Rate Limiting](#rate-limiting)
7. [Sécurité & Guards](#sécurité--guards)
8. [Utilisation](#utilisation)
9. [Tests](#tests)
10. [Bonnes pratiques](#bonnes-pratiques)
11. [Roadmap & Améliorations](#roadmap--améliorations)

---

## 🎯 Vue d'ensemble

Le **module Discord** fournit une abstraction complète et robuste de l'API Discord v10. Il gère automatiquement :

- ✅ Rate limiting intelligent (global + par bucket)
- ✅ Retry automatique avec backoff exponentiel
- ✅ Gestion d'erreurs typée
- ✅ Support tokens Bot et OAuth2 User
- ✅ Cache Redis pour les buckets de rate limit
- ✅ Guards de permissions (JWT + Admin Guild)
- ✅ Intercepteurs pour logging
- ✅ Documentation Swagger complète

---

## 🏗️ Architecture

### Structure des dossiers

```
apps/backend/src/modules/discord/
├── discord.module.ts                    # Module principal
├── config/
│   └── discord.config.ts               # Configuration depuis .env
├── core/                               # Services globaux (@Global)
│   ├── discord-core.module.ts
│   ├── discord-api.service.ts          # Service HTTP principal ⭐
│   └── discord-rate-limiter.service.ts # Gestion rate limits
├── common/
│   ├── constants/
│   │   ├── discord-endpoints.constant.ts    # Tous les endpoints Discord
│   │   └── discord-error-codes.constant.ts  # Codes erreur Discord
│   ├── exceptions/
│   │   └── discord-api.exception.ts         # Exceptions personnalisées
│   ├── filters/
│   │   └── discord-exception.filter.ts      # Filtre erreurs global
│   ├── guards/
│   │   └── guild-admin.guard.ts            # Vérif permissions admin
│   ├── interceptors/
│   │   └── discord-response.interceptor.ts  # Logging réponses
│   ├── interfaces/
│   │   └── rate-limit-bucket.interface.ts   # Types rate limiting
│   └── services/
│       └── guild-db.service.ts             # Requêtes DB guilds
└── resources/                          # Endpoints REST par ressource
    ├── guilds/
    │   ├── guilds.module.ts
    │   ├── guilds.controller.ts
    │   └── guilds.service.ts
    ├── channels/
    │   ├── channels.module.ts
    │   ├── channels.controller.ts
    │   └── channels.service.ts
    ├── members/
    │   ├── members.module.ts
    │   ├── members.controller.ts
    │   └── members.service.ts
    ├── roles/
    │   ├── roles.module.ts
    │   ├── roles.controller.ts
    │   └── roles.service.ts
    ├── users/
    │   ├── users.module.ts
    │   ├── users.controller.ts
    │   └── users.service.ts
    └── bans/
        └── ban.controller.ts           # Utilise MembersService
```

### Flux de requêtes

```
Client Frontend
    ↓
Controller (avec Guards JWT + GuildAdmin)
    ↓
Service de ressource (ex: GuildsService)
    ↓
DiscordApiService (core)
    ↓
DiscordRateLimiterService (vérif + attente si besoin)
    ↓
HttpService (Axios)
    ↓
API Discord
    ↓
Mise à jour buckets rate limit (Redis + mémoire)
    ↓
Retour au client
```

---

## 🛠️ Services Core

### DiscordApiService

**Responsabilités :**
- Client HTTP principal pour l'API Discord
- Gestion authentification (Bot token / OAuth2 token)
- Retry automatique avec backoff exponentiel
- Timeout configurable
- Transformation des erreurs Axios en exceptions typées
- Mise à jour automatique des buckets de rate limiting

**Méthodes principales :**

```typescript
// GET request
async get<T>(endpoint: string, options?: DiscordApiRequestOptions): Promise<T>

// POST request
async post<T>(endpoint: string, data?: any, options?: DiscordApiRequestOptions): Promise<T>

// PATCH request
async patch<T>(endpoint: string, data?: any, options?: DiscordApiRequestOptions): Promise<T>

// PUT request
async put<T>(endpoint: string, data?: any, options?: DiscordApiRequestOptions): Promise<T>

// DELETE request
async delete<T>(endpoint: string, options?: DiscordApiRequestOptions): Promise<T>

// Requête avec métadonnées complètes
async requestWithMetadata<T>(
  method: string,
  endpoint: string,
  options?: DiscordApiRequestOptions
): Promise<DiscordApiResponse<T>>
```

**Options de requête :**

```typescript
interface DiscordApiRequestOptions {
  data?: any;                    // Corps de la requête
  headers?: Record<string, string>; // Headers supplémentaires
  rateLimitKey?: string;         // Clé bucket rate limit
  params?: Record<string, any>;  // Query params
  timeout?: number;              // Timeout (défaut: 15000ms)
  retries?: number;              // Nb tentatives (défaut: 3)
  useAuth?: boolean;             // Utiliser auth (défaut: true)
  customToken?: string;          // Token OAuth2 user (override bot token)
}
```

**Exemple d'utilisation :**

```typescript
// Simple GET avec bot token
const guild = await this.discordApi.get('/guilds/123456789');

// GET avec token utilisateur OAuth2
const userGuilds = await this.discordApi.get('/users/@me/guilds', {
  customToken: userAccessToken
});

// POST avec données
const channel = await this.discordApi.post('/guilds/123/channels', {
  name: 'nouveau-salon',
  type: 0
}, {
  rateLimitKey: 'guild:123:channels:create'
});

// PATCH avec retry personnalisé
const member = await this.discordApi.patch('/guilds/123/members/456', {
  nick: 'Nouveau pseudo'
}, {
  rateLimitKey: 'guild:123:member:456:modify',
  retries: 5,
  timeout: 20000
});
```

### DiscordRateLimiterService

**Responsabilités :**
- Gestion des buckets de rate limiting Discord
- Cache hybride (Redis + mémoire locale)
- Attente automatique si rate limit atteint
- Support global rate limit
- Nettoyage automatique des buckets expirés

**Méthodes principales :**

```typescript
// Attend si rate limit actif
async waitForRateLimit(key: string): Promise<void>

// Met à jour un bucket depuis headers Discord
async updateBucket(key: string, headers: Record<string, string>): Promise<void>

// Récupère les infos d'un bucket
async getBucket(key: string): Promise<RateLimitBucket | null>

// Vérifie si un endpoint est rate limité
async isRateLimited(key: string): Promise<boolean>

// Retourne le temps d'attente avant prochaine requête
async getWaitTime(key: string): Promise<number>

// Nettoie les buckets expirés
cleanupExpiredBuckets(): void
```

**Structure d'un bucket :**

```typescript
interface RateLimitBucket {
  remaining: number;      // Requêtes restantes
  limit: number;          // Limite totale
  resetAt: number;        // Timestamp reset (ms)
  resetAfter: number;     // Durée avant reset (s)
  bucket?: string;        // Hash bucket Discord
  global?: boolean;       // Rate limit global
}
```

**Exemple d'utilisation :**

```typescript
// Vérifier si rate limité
const isLimited = await this.rateLimiter.isRateLimited('guild:123');

if (isLimited) {
  const waitTime = await this.rateLimiter.getWaitTime('guild:123');
  console.log(`Rate limited. Wait ${waitTime}ms`);
}

// Récupérer infos bucket
const bucket = await this.rateLimiter.getBucket('guild:123:channels');
console.log(`${bucket.remaining}/${bucket.limit} requests remaining`);
```

---

## 📡 Resources (Endpoints REST)

### 1. Guilds

**Service:** `GuildsService`  
**Controller:** `GuildsController`  
**Route:** `/discord/guilds`

#### Endpoints

| Méthode | Route | Description | Guard |
|---------|-------|-------------|-------|
| GET | `/:guildId` | Récupérer une guild | GuildAdmin |
| GET | `/:guildId/with-metadata` | Guild + metadata rate limit | GuildAdmin |
| PATCH | `/:guildId` | Modifier une guild | GuildAdmin |
| GET | `/:guildId/channels` | Lister les channels | GuildAdmin |
| POST | `/:guildId/channels` | Créer un channel | GuildAdmin |
| GET | `/:guildId/members` | Lister les membres | GuildAdmin |
| GET | `/:guildId/roles` | Lister les rôles | GuildAdmin |
| POST | `/:guildId/roles` | Créer un rôle | GuildAdmin |

**Exemples de requêtes :**

```typescript
// Récupérer une guild
GET /api/discord/guilds/123456789
Authorization: Bearer <JWT_TOKEN>

// Modifier une guild
PATCH /api/discord/guilds/123456789
Content-Type: application/json
{
  "name": "Nouveau nom",
  "description": "Nouvelle description"
}

// Créer un channel
POST /api/discord/guilds/123456789/channels
{
  "name": "nouveau-salon",
  "type": 0,
  "topic": "Discussion générale"
}
```

### 2. Channels

**Service:** `ChannelsService`  
**Controller:** `ChannelsController`  
**Route:** `/discord/channels`

#### Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/:channelId` | Récupérer un channel |
| PATCH | `/:channelId` | Modifier un channel |
| DELETE | `/:channelId` | Supprimer un channel |
| GET | `/:channelId/messages` | Lister les messages |
| POST | `/:channelId/messages` | Envoyer un message |
| GET | `/:channelId/messages/:messageId` | Récupérer un message |
| PATCH | `/:channelId/messages/:messageId` | Modifier un message |
| DELETE | `/:channelId/messages/:messageId` | Supprimer un message |

**Exemples :**

```typescript
// Envoyer un message
POST /api/discord/channels/123456789/messages
{
  "content": "Hello World!",
  "tts": false
}

// Récupérer les 50 derniers messages
GET /api/discord/channels/123456789/messages?limit=50

// Modifier un message
PATCH /api/discord/channels/123456789/messages/987654321
{
  "content": "Message modifié"
}
```

### 3. Members

**Service:** `MembersService`  
**Controller:** `MembersController`  
**Route:** `/discord/guilds/:guildId/members`

#### Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Lister les membres |
| GET | `/search` | Rechercher des membres |
| PATCH | `/@me` | Modifier le bot |
| GET | `/:userId` | Récupérer un membre |
| PUT | `/:userId` | Ajouter un membre |
| PATCH | `/:userId` | Modifier un membre |
| DELETE | `/:userId` | Kick un membre |
| PATCH | `/:userId/timeout` | Timeout un membre |
| DELETE | `/:userId/timeout` | Retirer timeout |

**Exemples :**

```typescript
// Modifier un membre
PATCH /api/discord/guilds/123/members/456
{
  "nick": "Nouveau pseudo",
  "roles": ["role1", "role2"],
  "mute": false,
  "deaf": false
}

// Timeout un membre pour 1 heure
PATCH /api/discord/guilds/123/members/456/timeout
{
  "duration": "PT1H",
  "reason": "Spam"
}

// Rechercher des membres
GET /api/discord/guilds/123/members/search?query=john&limit=10
```

### 4. Roles

**Service:** `RolesService`  
**Controller:** `RolesController`  
**Route:** `/discord/guilds/:guildId/roles`

#### Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Lister les rôles |
| POST | `/` | Créer un rôle |
| PATCH | `/:roleId` | Modifier un rôle |
| DELETE | `/:roleId` | Supprimer un rôle |
| PUT | `/members/:userId/roles/:roleId` | Ajouter rôle à membre |
| DELETE | `/members/:userId/roles/:roleId` | Retirer rôle |

**Exemples :**

```typescript
// Créer un rôle
POST /api/discord/guilds/123/roles
{
  "name": "Moderator",
  "color": 3447003,
  "hoist": true,
  "permissions": "8",
  "mentionable": true
}

// Ajouter un rôle à un membre
PUT /api/discord/guilds/123/members/456/roles/789
```

### 5. Bans

**Controller:** `BansController` (utilise MembersService)  
**Route:** `/discord/guilds/:guildId/bans`

#### Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Lister les bans |
| GET | `/:userId` | Récupérer un ban |
| PUT | `/:userId` | Bannir un membre |
| DELETE | `/:userId` | Révoquer un ban |

**Exemples :**

```typescript
// Bannir un membre
PUT /api/discord/guilds/123/bans/456
{
  "deleteMessageDays": 7,
  "reason": "Violation des règles"
}

// Lister tous les bans
GET /api/discord/guilds/123/bans

// Révoquer un ban
DELETE /api/discord/guilds/123/bans/456
```

### 6. Users

**Service:** `UsersService`  
**Controller:** `UsersController`  
**Route:** `/discord/users`

#### Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/@me` | Récupérer l'utilisateur actuel (bot) |
| GET | `/@me/guilds` | Guilds de l'utilisateur |
| GET | `/:userId` | Récupérer un utilisateur |

---

## ⚠️ Gestion des erreurs

### Exceptions personnalisées

```typescript
// Exception de base Discord
class DiscordApiException extends HttpException {
  constructor(
    public discordCode: number,
    message: string,
    public errors?: any,
    public httpStatus: number = HttpStatus.BAD_REQUEST
  )
}

// Rate limit
class DiscordRateLimitException extends DiscordApiException {
  constructor(
    public retryAfter: number,
    public global: boolean = false
  )
}

// Timeout
class DiscordApiTimeoutException extends DiscordApiException

// Erreur réseau
class DiscordApiNetworkException extends DiscordApiException
```

### Codes d'erreur Discord

```typescript
export const DISCORD_ERROR_CODES = {
  GENERAL_ERROR: 0,
  UNKNOWN_ACCOUNT: 10001,
  UNKNOWN_APPLICATION: 10002,
  UNKNOWN_CHANNEL: 10003,
  UNKNOWN_GUILD: 10004,
  UNKNOWN_INTEGRATION: 10005,
  UNKNOWN_INVITE: 10006,
  UNKNOWN_MEMBER: 10007,
  UNKNOWN_MESSAGE: 10008,
  UNKNOWN_PERMISSION_OVERWRITE: 10009,
  UNKNOWN_PROVIDER: 10010,
  UNKNOWN_ROLE: 10011,
  // ... etc
} as const;
```

### Exception Filter

Le filtre `DiscordExceptionFilter` transforme les exceptions Discord en réponses HTTP appropriées :

```typescript
@Catch(DiscordApiException)
export class DiscordExceptionFilter implements ExceptionFilter {
  catch(exception: DiscordApiException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    // Rate limit
    if (exception instanceof DiscordRateLimitException) {
      return response.status(429).json({
        statusCode: 429,
        message: 'Rate limit exceeded',
        retryAfter: exception.retryAfter,
        global: exception.global
      });
    }
    
    // Autres erreurs Discord
    return response.status(exception.httpStatus).json({
      statusCode: exception.httpStatus,
      message: exception.message,
      discordCode: exception.discordCode,
      errors: exception.errors
    });
  }
}
```

---

## 🚦 Rate Limiting

### Fonctionnement

Discord implémente un système de rate limiting à deux niveaux :

1. **Global Rate Limit** : 50 requêtes/seconde max pour tout le bot
2. **Per-Route Rate Limits** : Limites spécifiques par endpoint

### Buckets

Discord utilise des "buckets" pour regrouper les endpoints similaires :

```
Bucket Key Pattern: resource:id:action

Exemples:
- guild:123456789
- guild:123456789:channels
- guild:123456789:member:987654321
- channel:123456789:messages
```

### Stratégie d'attente

1. Vérification bucket avant chaque requête
2. Si `remaining === 0`, attente jusqu'au `resetAt`
3. Si global rate limit, attente prioritaire
4. Après la requête, mise à jour du bucket depuis headers

### Configuration

```typescript
// Dans DiscordRateLimiterService
private readonly USE_CACHE = true;  // Active Redis
private readonly CACHE_PREFIX = 'ratelimit:';
private readonly GLOBAL_CACHE_KEY = 'ratelimit:global';
```

### Monitoring

```typescript
// Vérifier l'état d'un bucket
const info = await this.discordApi.getRateLimitInfo('guild:123');
console.log(`${info.remaining}/${info.limit} remaining`);
console.log(`Reset in ${(info.resetAt - Date.now()) / 1000}s`);

// Vérifier si rate limité
const isLimited = await this.discordApi.isRateLimited('guild:123');
```

---

## 🔐 Sécurité & Guards

### JwtAuthGuard

Vérifie que l'utilisateur est authentifié via JWT :

```typescript
@UseGuards(JwtAuthGuard)
@Controller('discord/guilds')
export class GuildsController {
  // Tous les endpoints nécessitent un JWT valide
}
```

### GuildAdminGuard

Vérifie que l'utilisateur a les permissions ADMINISTRATOR sur la guild :

```typescript
@Get(':guildId')
@UseGuards(JwtAuthGuard, GuildAdminGuard)
async getGuild(@Param('guildId') guildId: string) {
  // Seulement si admin de la guild
}
```

**Fonctionnement :**
1. Récupère `userId` depuis le JWT
2. Récupère `guildId` depuis les params de la route
3. Vérifie dans la DB PostgreSQL que l'utilisateur a les droits admin sur cette guild
4. Autorise ou rejette la requête (403 Forbidden)

```typescript
@Injectable()
export class GuildAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.id; // Depuis JWT
    const guildId = request.params.guildId;
    
    // Vérification en DB
    const hasPermission = await this.guildsDbService.userHasAdminPermission(
      userId,
      guildId
    );
    
    if (!hasPermission) {
      throw new ForbiddenException('Admin permissions required');
    }
    
    return true;
  }
}
```

### Tokens

**Bot Token :**
- Utilisé par défaut pour toutes les requêtes
- Stocké dans `DISCORD_BOT_TOKEN`
- Format header : `Authorization: Bot <token>`

**OAuth2 User Token :**
- Utilisé pour les actions au nom d'un utilisateur
- Passé via `customToken` dans les options
- Format header : `Authorization: Bearer <token>`

**Exemple :**

```typescript
// Requête avec bot token (par défaut)
const guild = await this.discordApi.get('/guilds/123');

// Requête avec user token
const userToken = await this.discordTokenService.getDecryptedToken(userId);
const userGuilds = await this.discordApi.get('/users/@me/guilds', {
  customToken: userToken
});
```

---

## 💼 Utilisation

### Installation des dépendances

```bash
npm install @nestjs/axios axios rxjs class-validator class-transformer
```

### Configuration

**1. Variables d'environnement (.env) :**

```env
# Discord API
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token

# Base de données
DATABASE_URL=postgresql://user:pass@localhost:5432/discord_admin

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

**2. Import du module dans AppModule :**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { DiscordModule } from './modules/discord/discord.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT),
          },
        }),
        ttl: 60 * 1000, // 1 minute par défaut
      }),
    }),
    DiscordModule, // ✅ Tout est inclus !
  ],
})
export class AppModule {}
```

### Utilisation dans un service

```typescript
import { Injectable } from '@nestjs/common';
import { DiscordApiService } from '../discord/core/discord-api.service';
import { DISCORD_ENDPOINTS } from '../discord/common/constants/discord-endpoints.constant';

@Injectable()
export class MyCustomService {
  constructor(private readonly discordApi: DiscordApiService) {}
  
  async getGuildInfo(guildId: string) {
    try {
      const guild = await this.discordApi.get(
        DISCORD_ENDPOINTS.GUILD(guildId),
        {
          rateLimitKey: `guild:${guildId}`,
          timeout: 10000,
        }
      );
      
      return guild;
    } catch (error) {
      if (error instanceof DiscordApiException) {
        // Gérer erreur Discord
        console.error(`Discord error: ${error.discordCode}`);
      }
      throw error;
    }
  }
  
  async sendMessageToChannel(channelId: string, content: string) {
    return this.discordApi.post(
      DISCORD_ENDPOINTS.CHANNEL_MESSAGES(channelId),
      { content },
      {
        rateLimitKey: `channel:${channelId}:messages:create`,
        retries: 5,
      }
    );
  }
}
```

### Utilisation dans un controller

```typescript
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GuildAdminGuard } from '../discord/common/guards/guild-admin.guard';
import { GuildsService } from '../discord/resources/guilds/guilds.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('custom')
@ApiBearerAuth('JWT-auth')
@Controller('custom')
@UseGuards(JwtAuthGuard)
export class CustomController {
  constructor(private readonly guildsService: GuildsService) {}
  
  @Get('guild/:guildId/summary')
  @UseGuards(GuildAdminGuard)
  @ApiOperation({ summary: 'Résumé complet d\'une guild' })
  async getGuildSummary(@Param('guildId') guildId: string) {
    // Récupérer plusieurs infos en parallèle
    const [guild, channels, roles, members] = await Promise.all([
      this.guildsService.getGuild(guildId),
      this.guildsService.getGuildChannels(guildId),
      this.guildsService.getGuildRoles(guildId),
      this.guildsService.getGuildMembers(guildId, { limit: 100 }),
    ]);
    
    return {
      guild,
      stats: {
        channelCount: channels.length,
        roleCount: roles.length,
        memberCount: members.length,
      },
    };
  }
}
```

---

## 🧪 Tests

### Tests unitaires

**Lancer les tests :**

```bash
# Tous les tests
npm run test

# Tests du module Discord uniquement
npm run test -- discord

# Avec coverage
npm run test:cov

# Watch mode
npm run test:watch
```

**Structure des tests :**

```
discord/
├── core/
│   ├── discord-api.service.spec.ts
│   └── discord-rate-limiter.service.spec.ts
└── resources/
    ├── guilds/
    │   ├── guilds.service.spec.ts
    │   └── guilds.controller.spec.ts
    ├── channels/
    │   └── channels.service.spec.ts
    └── members/
        └── members.service.spec.ts
```

**Exemple de test :**

```typescript
describe('DiscordApiService', () => {
  it('should handle rate limit errors correctly', async () => {
    const rateLimitError = {
      response: {
        status: 429,
        headers: {
          'retry-after': '2',
          'x-ratelimit-global': 'false',
        },
      },
    };
    
    jest.spyOn(httpService, 'request')
      .mockReturnValue(throwError(() => rateLimitError));
    
    await expect(service.get('/test'))
      .rejects
      .toThrow(DiscordRateLimitException);
  });
});
```

### Tests E2E

```typescript
// test/discord.e2e-spec.ts
describe('Discord Module (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  
  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = moduleFixture.createNestApplication();
    await app.init();
    
    // Obtenir un token pour les tests
    accessToken = await getTestToken();
  });
  
  it('/discord/guilds/:guildId (GET)', () => {
    return request(app.getHttpServer())
      .get('/discord/guilds/123456789')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('name');
      });
  });
  
  afterAll(async () => {
    await app.close();
  });
});
```

---

## ✨ Bonnes pratiques

### 1. Toujours utiliser les constantes d'endpoints

```typescript
// ✅ BON
import { DISCORD_ENDPOINTS } from '../common/constants/discord-endpoints.constant';
const endpoint = DISCORD_ENDPOINTS.GUILD_CHANNELS(guildId);

// ❌ MAUVAIS
const endpoint = `/guilds/${guildId}/channels`;
```

### 2. Définir des rate limit keys cohérentes

**Pattern recommandé :** `resource:id:action`

```typescript
// Exemples corrects
rateLimitKey: 'guild:123456789'
rateLimitKey: 'guild:123456789:channels'
rateLimitKey: 'guild:123456789:members:list'
rateLimitKey: 'guild:123456789:member:987654321:modify'
rateLimitKey: 'channel:123456789:messages:create'
```

### 3. Gérer les erreurs spécifiquement

```typescript
try {
  const guild = await this.discordApi.get(endpoint);
  return guild;
} catch (error) {
  if (error instanceof DiscordRateLimitException) {
    // Attendre et réessayer
    await new Promise(r => setTimeout(r, error.retryAfter));
    return this.getGuild(guildId);
  }
  
  if (error instanceof DiscordApiException) {
    if (error.discordCode === DISCORD_ERROR_CODES.UNKNOWN_GUILD) {
      throw new NotFoundException('Guild not found');
    }
    if (error.discordCode === DISCORD_ERROR_CODES.MISSING_PERMISSIONS) {
      throw new ForbiddenException('Missing permissions');
    }
  }
  
  throw error;
}
```

### 4. Utiliser les DTOs pour la validation

```typescript
// ✅ BON
@Patch(':guildId')
async modifyGuild(
  @Param('guildId') guildId: string,
  @Body() data: ModifyGuildDto, // DTO typé
) {
  return this.guildsService.modifyGuild(guildId, data);
}

// ❌ MAUVAIS
@Patch(':guildId')
async modifyGuild(
  @Param('guildId') guildId: string,
  @Body() data: any, // Pas de validation
) {
  return this.guildsService.modifyGuild(guildId, data);
}
```

### 5. Optimiser les requêtes parallèles

```typescript
// ✅ BON - Requêtes en parallèle
const [guild, channels, roles] = await Promise.all([
  this.getGuild(guildId),
  this.getGuildChannels(guildId),
  this.getGuildRoles(guildId),
]);

// ❌ MAUVAIS - Requêtes séquentielles
const guild = await this.getGuild(guildId);
const channels = await this.getGuildChannels(guildId);
const roles = await this.getGuildRoles(guildId);
```

### 6. Logger les opérations importantes

```typescript
@Injectable()
export class GuildsService {
  private readonly logger = new Logger(GuildsService.name);
  
  async modifyGuild(guildId: string, data: ModifyGuildDto) {
    this.logger.log(`Modifying guild ${guildId}`);
    
    try {
      const result = await this.discordApi.patch(
        DISCORD_ENDPOINTS.GUILD(guildId),
        data
      );
      
      this.logger.log(`Guild ${guildId} modified successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to modify guild ${guildId}`, error.stack);
      throw error;
    }
  }
}
```

### 7. Documenter avec Swagger

```typescript
@ApiOperation({ 
  summary: 'Modifier une guild',
  description: 'Met à jour les paramètres d\'un serveur Discord'
})
@ApiParam({ name: 'guildId', description: 'ID du serveur' })
@ApiBody({ type: ModifyGuildDto })
@ApiResponse({ status: 200, description: 'Guild modifiée' })
@ApiResponse({ status: 403, description: 'Permissions insuffisantes' })
@ApiResponse({ status: 404, description: 'Guild non trouvée' })
@Patch(':guildId')
async modifyGuild(...) { }
```

---

## 🚀 Roadmap & Améliorations

### ✅ Implémenté

- [x] Service HTTP robuste avec retry
- [x] Rate limiting intelligent avec cache Redis
- [x] Gestion d'erreurs typée
- [x] Guards de sécurité (JWT + GuildAdmin)
- [x] Support tokens Bot et OAuth2
- [x] Resources : Guilds, Channels, Members, Roles, Bans, Users
- [x] Intercepteurs de logging
- [x] Exception filters
- [x] Tests unitaires

### 🔄 En cours

- [ ] DTOs complets pour toutes les ressources
- [ ] Documentation Swagger complète
- [ ] Tests E2E
- [ ] Métriques et monitoring (Prometheus)

### 📋 À faire

#### Court terme (1-2 semaines)

- [ ] **DTOs manquants** : Créer tous les DTOs dans `/packages/shared-types`
- [ ] **Validation globale** : Activer ValidationPipe dans main.ts
- [ ] **Swagger** : Documenter tous les endpoints avec décorateurs
- [ ] **Tests E2E** : Couvrir tous les endpoints critiques
- [ ] **Error tracking** : Intégrer Sentry pour tracking erreurs

#### Moyen terme (1 mois)

- [ ] **Cache intelligent** : 
  - Cache des guilds en Redis (TTL: 5 min)
  - Cache des channels (TTL: 2 min)
  - Invalidation cache sur modifications
  
- [ ] **Webhooks Discord** :
  - Module pour créer/gérer webhooks
  - Envoi de messages via webhooks
  
- [ ] **Audit logs** :
  - Endpoint pour récupérer audit logs Discord
  - Synchronisation avec DB locale
  
- [ ] **Permissions avancées** :
  - Guard pour permissions spécifiques (MANAGE_CHANNELS, etc.)
  - Calcul de permissions effectives
  
- [ ] **Pagination** :
  - DTOs de pagination réutilisables
  - Helper pour itérer sur toutes les pages

#### Long terme (2-3 mois)

- [ ] **GraphQL API** :
  - Exposer les données Discord via GraphQL
  - Subscriptions temps réel
  
- [ ] **Rate limit prediction** :
  - Prédire les rate limits avant envoi
  - Optimiser l'ordonnancement des requêtes
  
- [ ] **Multi-bot support** :
  - Supporter plusieurs bots simultanément
  - Répartition de charge entre bots
  
- [ ] **Analytics** :
  - Dashboard de métriques d'utilisation API
  - Alertes si rate limits fréquents
  
- [ ] **SDK TypeScript** :
  - Package NPM autonome
  - Utilisable hors NestJS

### 🐛 Bugs connus

Aucun bug critique identifié pour le moment.

### 💡 Suggestions d'amélioration

1. **Batch requests** : Grouper plusieurs requêtes similaires en une seule
2. **Request deduplication** : Éviter les requêtes identiques simultanées
3. **Circuit breaker** : Arrêter temporairement les requêtes en cas d'erreurs répétées
4. **Health checks** : Endpoint pour vérifier la santé du module Discord
5. **Rate limit dashboard** : Interface pour visualiser l'état des buckets

---

## 📚 Ressources

### Documentation officielle

- **Discord API** : https://discord.com/developers/docs/intro
- **Rate Limits** : https://discord.com/developers/docs/topics/rate-limits
- **Error Codes** : https://discord.com/developers/docs/topics/opcodes-and-status-codes

### Outils de développement

- **Discord Developer Portal** : https://discord.com/developers/applications
- **Discord API Explorer** : https://discord.com/developers/docs/game-sdk/discord
- **Postman Collection** : (À créer)

### NestJS

- **Documentation** : https://docs.nestjs.com
- **HTTP Module** : https://docs.nestjs.com/techniques/http-module
- **Guards** : https://docs.nestjs.com/guards
- **Interceptors** : https://docs.nestjs.com/interceptors

---

## 🤝 Contribution

### Ajouter une nouvelle ressource

**Exemple : Messages**

1. **Créer la structure :**

```bash
mkdir -p apps/backend/src/modules/discord/resources/messages
cd apps/backend/src/modules/discord/resources/messages
```

2. **Créer le service :**

```typescript
// messages.service.ts
@Injectable()
export class MessagesService {
  constructor(private readonly discordApi: DiscordApiService) {}
  
  async getChannelMessages(channelId: string, options?: { limit?: number }) {
    return this.discordApi.get(
      DISCORD_ENDPOINTS.CHANNEL_MESSAGES(channelId),
      {
        params: { limit: options?.limit || 50 },
        rateLimitKey: `channel:${channelId}:messages:list`,
      }
    );
  }
  
  async createMessage(channelId: string, data: CreateMessageDto) {
    return this.discordApi.post(
      DISCORD_ENDPOINTS.CHANNEL_MESSAGES(channelId),
      data,
      {
        rateLimitKey: `channel:${channelId}:messages:create`,
      }
    );
  }
}
```

3. **Créer le controller :**

```typescript
// messages.controller.ts
@Controller('discord/channels/:channelId/messages')
@UseGuards(JwtAuthGuard)
@UseFilters(DiscordExceptionFilter)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}
  
  @Get()
  async getMessages(
    @Param('channelId') channelId: string,
    @Query('limit') limit?: number,
  ) {
    return this.messagesService.getChannelMessages(channelId, { limit });
  }
  
  @Post()
  async createMessage(
    @Param('channelId') channelId: string,
    @Body() data: CreateMessageDto,
  ) {
    return this.messagesService.createMessage(channelId, data);
  }
}
```

4. **Créer le module :**

```typescript
// messages.module.ts
@Module({
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class DiscordMessagesModule {}
```

5. **Importer dans DiscordModule :**

```typescript
@Module({
  imports: [
    // ...
    DiscordMessagesModule,
  ],
  exports: [
    // ...
    DiscordMessagesModule,
  ],
})
export class DiscordModule {}
```

6. **Créer les DTOs** dans `/packages/shared-types`

7. **Écrire les tests**

8. **Documenter avec Swagger**

**Version de la documentation :** 1.0.0  
**Dernière mise à jour :** Octobre 2025  