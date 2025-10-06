# Guide d'intégration - Discord API Service

## 📦 Fichiers créés

Voici tous les fichiers qui ont été générés pour ton `DiscordApiService` :

### Configuration
- ✅ `config/discord.config.ts` - Configuration Discord depuis .env

### Core (Services principaux)
- ✅ `core/discord-core.module.ts` - Module @Global pour les services core
- ✅ `core/discord-api.service.ts` - Service HTTP principal ⭐
- ✅ `core/discord-rate-limiter.service.ts` - Gestion du rate limiting

### Common (Utilitaires partagés)
- ✅ `common/constants/discord-endpoints.constant.ts` - Tous les endpoints Discord
- ✅ `common/constants/discord-error-codes.constant.ts` - Codes d'erreur Discord
- ✅ `common/exceptions/discord-api.exception.ts` - Exceptions personnalisées
- ✅ `common/filters/discord-exception.filter.ts` - Filtre pour gérer les erreurs
- ✅ `common/interceptors/discord-response.interceptor.ts` - Logging des réponses
- ✅ `common/interfaces/rate-limit-bucket.interface.ts` - Interfaces rate limiting

### Module principal
- ✅ `discord.module.ts` - Module principal Discord

### Exemple de ressource (Guilds)
- ✅ `resources/guilds/guilds.module.ts` - Module Guilds
- ✅ `resources/guilds/guilds.controller.ts` - Controller REST pour guilds
- ✅ `resources/guilds/guilds.service.ts` - Service métier pour guilds

### Documentation
- ✅ `README.md` - Documentation complète
- ✅ `INTEGRATION_GUIDE.md` - Ce fichier !

---

## 🚀 Étapes d'intégration

### Étape 1 : Copier les fichiers

Copie tous les fichiers générés dans ton projet selon l'arborescence suivante :

```
apps/backend/src/discord/
├── discord.module.ts
├── config/
│   └── discord.config.ts
├── common/
│   ├── constants/
│   │   ├── discord-endpoints.constant.ts
│   │   └── discord-error-codes.constant.ts
│   ├── exceptions/
│   │   └── discord-api.exception.ts
│   ├── filters/
│   │   └── discord-exception.filter.ts
│   ├── interceptors/
│   │   └── discord-response.interceptor.ts
│   └── interfaces/
│       └── rate-limit-bucket.interface.ts
├── core/
│   ├── discord-core.module.ts
│   ├── discord-api.service.ts
│   └── discord-rate-limiter.service.ts
└── resources/
    └── guilds/
        ├── guilds.module.ts
        ├── guilds.controller.ts
        └── guilds.service.ts
```

### Étape 2 : Installer les dépendances manquantes

Vérifie que tu as bien ces dépendances dans ton `package.json` :

```bash
npm install @nestjs/axios axios rxjs
```

Ou avec yarn :

```bash
yarn add @nestjs/axios axios rxjs
```

### Étape 3 : Importer le module Discord dans AppModule

Dans `apps/backend/src/app.module.ts` :

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DiscordModule } from './discord/discord.module';
import { GuildsModule } from './discord/resources/guilds/guilds.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DiscordModule,
    GuildsModule, // Ajoute les modules de ressources au fur et à mesure
  ],
})
export class AppModule {}
```

### Étape 4 : Vérifier les variables d'environnement


### Étape 5 : Tester l'intégration

Démarre ton backend :

```bash
npm run start:dev
```

Teste un endpoint :

```bash
# Récupérer les infos d'une guild
curl http://localhost:3000/discord/guilds/YOUR_GUILD_ID

# Récupérer les channels d'une guild
curl http://localhost:3000/discord/guilds/YOUR_GUILD_ID/channels
```

---

## 🔄 Créer d'autres ressources

Pour créer un nouveau module de ressource (ex: Channels), suis ce pattern :

### 1. Créer le dossier et les fichiers

```
resources/channels/
├── channels.module.ts
├── channels.controller.ts
└── channels.service.ts
```

### 2. Service (`channels.service.ts`)

```typescript
import { Injectable } from '@nestjs/common';
import { DiscordApiService } from '../../core/discord-api.service';
import { DISCORD_ENDPOINTS } from '../../common/constants/discord-endpoints.constant';

@Injectable()
export class ChannelsService {
  constructor(private readonly discordApi: DiscordApiService) {}

  async getChannel(channelId: string) {
    return this.discordApi.get(
      DISCORD_ENDPOINTS.CHANNEL(channelId),
      {
        rateLimitKey: `channel:${channelId}`,
      },
    );
  }

  async modifyChannel(channelId: string, data: any) {
    return this.discordApi.patch(
      DISCORD_ENDPOINTS.CHANNEL(channelId),
      data,
      {
        rateLimitKey: `channel:${channelId}:modify`,
      },
    );
  }

  async deleteChannel(channelId: string) {
    return this.discordApi.delete(
      DISCORD_ENDPOINTS.CHANNEL(channelId),
      {
        rateLimitKey: `channel:${channelId}:delete`,
      },
    );
  }

  // ... autres méthodes
}
```

### 3. Controller (`channels.controller.ts`)

```typescript
import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseFilters,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { DiscordExceptionFilter } from '../../common/filters/discord-exception.filter';
import { DiscordResponseInterceptor } from '../../common/interceptors/discord-response.interceptor';

@Controller('discord/channels')
@UseFilters(DiscordExceptionFilter)
@UseInterceptors(DiscordResponseInterceptor)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get(':channelId')
  async getChannel(@Param('channelId') channelId: string) {
    return this.channelsService.getChannel(channelId);
  }

  @Patch(':channelId')
  async modifyChannel(
    @Param('channelId') channelId: string,
    @Body() data: any,
  ) {
    return this.channelsService.modifyChannel(channelId, data);
  }

  @Delete(':channelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteChannel(@Param('channelId') channelId: string) {
    return this.channelsService.deleteChannel(channelId);
  }
}
```

### 4. Module (`channels.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';

@Module({
  controllers: [ChannelsController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
```

### 5. Importer dans AppModule

```typescript
import { ChannelsModule } from './discord/resources/channels/channels.module';

@Module({
  imports: [
    // ...
    ChannelsModule,
  ],
})
export class AppModule {}
```

---

## 📝 Checklist de migration

- [ ] Copier tous les fichiers dans le bon dossier
- [ ] Installer les dépendances (`@nestjs/axios`, `axios`, `rxjs`)
- [ ] Importer `DiscordModule` dans `AppModule`
- [ ] Vérifier les variables d'environnement
- [ ] Tester avec un endpoint simple (ex: GET guild)
- [ ] Supprimer l'ancien service discord si nécessaire
- [ ] Migrer les endpoints existants vers la nouvelle structure
- [ ] Créer les modules de ressources manquants (channels, users, members, roles, messages)
- [ ] Définir les interfaces/DTOs dans `/packages`
- [ ] Ajouter les tests unitaires
- [ ] Documenter les nouveaux endpoints dans Swagger (optionnel)

---

## 🎯 Prochaines ressources à implémenter

### Ordre recommandé

1. **Channels** (déjà commencé ci-dessus)
   - GET, PATCH, DELETE channel
   - Messages dans channels
   - Permissions
   - Webhooks

2. **Users**
   - GET user
   - GET current user
   - Modify current user
   - Get user guilds

3. **Members**
   - List guild members
   - Add/remove guild member
   - Modify guild member
   - Search guild members

4. **Roles**
   - Create/modify/delete roles
   - Add/remove member roles
   - Modify role positions

5. **Messages**
   - Create message
   - Edit/delete message
   - Get message
   - Reactions
   - Bulk delete

---

## 💡 Tips et bonnes pratiques

### 1. Utiliser les constantes

```typescript
// ✅ TOUJOURS utiliser les constantes
import { DISCORD_ENDPOINTS } from '../../common/constants/discord-endpoints.constant';
const endpoint = DISCORD_ENDPOINTS.GUILD(guildId);

// ❌ JAMAIS hardcoder les endpoints
const endpoint = `/guilds/${guildId}`;
```

### 2. Définir des rate limit keys cohérentes

```typescript
// Pattern recommandé: resource:id:action
rateLimitKey: `guild:${guildId}`
rateLimitKey: `guild:${guildId}:channels`
rateLimitKey: `guild:${guildId}:members`
rateLimitKey: `guild:${guildId}:member:${userId}:modify`
rateLimitKey: `channel:${channelId}:messages`
```

### 3. Gérer les erreurs spécifiques

```typescript
try {
  const guild = await this.guildsService.getGuild(guildId);
  return guild;
} catch (error) {
  if (error instanceof DiscordApiException) {
    // Erreur spécifique Discord
    if (error.discordCode === DISCORD_ERROR_CODES.UNKNOWN_GUILD) {
      throw new NotFoundException('Guild not found');
    }
  }
  throw error;
}
```

### 4. Créer des DTOs dans /packages

```typescript
// packages/shared/src/discord/dto/modify-guild.dto.ts
export interface ModifyGuildDTO {
  name?: string;
  verification_level?: number;
  default_message_notifications?: number;
  explicit_content_filter?: number;
  afk_channel_id?: string | null;
  afk_timeout?: number;
  icon?: string | null;
  owner_id?: string;
  splash?: string | null;
  banner?: string | null;
  system_channel_id?: string | null;
  rules_channel_id?: string | null;
  public_updates_channel_id?: string | null;
  preferred_locale?: string;
}
```

### 5. Utiliser les decorators NestJS

```typescript
import { Body, ValidationPipe } from '@nestjs/common';
import { IsString, IsOptional, IsNumber } from 'class-validator';

// Créer un vrai DTO avec validation
export class ModifyGuildDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  verification_level?: number;
}

// L'utiliser dans le controller
@Patch(':guildId')
async modifyGuild(
  @Param('guildId') guildId: string,
  @Body(ValidationPipe) data: ModifyGuildDto,
) {
  return this.guildsService.modifyGuild(guildId, data);
}
```

---

## 🔍 Debugging

### Activer tous les logs

Dans `main.ts` :

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  await app.listen(3000);
  Logger.log('Application is running on: http://localhost:3000');
}
bootstrap();
```

### Créer un endpoint de debug

```typescript
// guilds.controller.ts
@Get(':guildId/debug/rate-limit')
async getRateLimitDebug(@Param('guildId') guildId: string) {
  return {
    guildId,
    rateLimitInfo: this.discordApi.getRateLimitInfo(`guild:${guildId}`),
    isRateLimited: this.discordApi.isRateLimited(`guild:${guildId}`),
    waitTime: this.discordApi.getWaitTime(`guild:${guildId}`),
  };
}
```

### Logger les requêtes détaillées

```typescript
// Dans un service
async getGuild(guildId: string) {
  const startTime = Date.now();
  
  try {
    const result = await this.discordApi.get(
      DISCORD_ENDPOINTS.GUILD(guildId),
      { rateLimitKey: `guild:${guildId}` },
    );
    
    console.log(`[GUILD] Get guild ${guildId} took ${Date.now() - startTime}ms`);
    return result;
  } catch (error) {
    console.error(`[GUILD] Error getting guild ${guildId}:`, error.message);
    throw error;
  }
}
```

---

## 🧪 Tests recommandés

### Test unitaire du service

```typescript
// guilds.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GuildsService } from './guilds.service';
import { DiscordApiService } from '../../core/discord-api.service';

describe('GuildsService', () => {
  let service: GuildsService;
  let discordApi: DiscordApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildsService,
        {
          provide: DiscordApiService,
          useValue: {
            get: jest.fn(),
            patch: jest.fn(),
            post: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GuildsService>(GuildsService);
    discordApi = module.get<DiscordApiService>(DiscordApiService);
  });

  it('should get guild', async () => {
    const mockGuild = { id: '123', name: 'Test Guild' };
    jest.spyOn(discordApi, 'get').mockResolvedValue(mockGuild);

    const result = await service.getGuild('123');

    expect(result).toEqual(mockGuild);
    expect(discordApi.get).toHaveBeenCalledWith(
      '/guilds/123',
      expect.objectContaining({
        rateLimitKey: 'guild:123',
      }),
    );
  });
});
```

### Test E2E

```typescript
// guilds.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('GuildsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/discord/guilds/:guildId (GET)', () => {
    return request(app.getHttpServer())
      .get('/discord/guilds/123456789')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('name');
      });
  });
});
```

---

## 🚨 Problèmes courants et solutions

### Problème 1: "Cannot find module @nestjs/axios"

**Solution:**
```bash
npm install @nestjs/axios axios
```

### Problème 2: Rate limit atteint constamment

**Solution:**
- Vérifier que tu utilises des `rateLimitKey` cohérentes
- Augmenter les délais entre les requêtes
- Vérifier les logs du `DiscordRateLimiterService`

```typescript
// Vérifier l'état des buckets
const buckets = this.rateLimiter.getAllBuckets();
console.log('Active buckets:', buckets);
```

### Problème 3: Timeout sur certaines requêtes

**Solution:**
- Augmenter le timeout pour certains endpoints spécifiques
```typescript
await this.discordApi.get(endpoint, {
  timeout: 30000, // 30 secondes
});
```

### Problème 4: Headers manquants dans les réponses

**Solution:**
- S'assurer que `DiscordRateLimiterService` est bien injecté
- Vérifier que `updateBucket` est appelé après chaque requête

### Problème 5: Erreur "Discord API error: Invalid Form Body"

**Solution:**
- Vérifier que les DTOs sont corrects
- Ajouter la validation avec `class-validator`
```bash
npm install class-validator class-transformer
```

---

## 📚 Ressources utiles

### Documentation Discord

- **API Reference:** https://discord.com/developers/docs/reference
- **Rate Limits:** https://discord.com/developers/docs/topics/rate-limits
- **Error Codes:** https://discord.com/developers/docs/topics/opcodes-and-status-codes

### NestJS

- **HTTP Module:** https://docs.nestjs.com/techniques/http-module
- **Exception Filters:** https://docs.nestjs.com/exception-filters
- **Interceptors:** https://docs.nestjs.com/interceptors

---

## 🎉 C'est tout !

Tu as maintenant tout ce qu'il faut pour :

1. ✅ Un `DiscordApiService` robuste et évolutif
2. ✅ Une gestion intelligente du rate limiting
3. ✅ Une gestion d'erreurs propre et cohérente
4. ✅ Un exemple complet avec le module Guilds
5. ✅ Une architecture scalable pour ajouter d'autres ressources

### Prochaines étapes suggérées

1. **Tester l'intégration** avec le module Guilds
2. **Créer les autres modules** (Channels, Users, Members, Roles, Messages)
3. **Définir les DTOs** dans `/packages` pour la cohérence avec le frontend
4. **Ajouter le cache** si nécessaire (Redis ou en mémoire)
5. **Implémenter les tests** unitaires et E2E
6. **Documenter avec Swagger** (optionnel mais recommandé)

---

**Bon courage pour l'implémentation ! 🚀**

N'hésite pas si tu as des questions ou si tu veux qu'on implémente d'autres ressources ensemble !