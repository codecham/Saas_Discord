# 📦 Phase 1.3 : Backend Services - Guide Complet

## ✅ Fichiers Créés

### 1. `guild-settings.service.ts`
**Service CRUD pour les settings de guild**

**Méthodes principales:**
- ✅ `create(dto)` - Créer settings avec defaults
- ✅ `get(guildId)` - Récupérer settings
- ✅ `exists(guildId)` - Vérifier existence
- ✅ `update(dto)` - Mise à jour partielle
- ✅ `updateInitializationStatus()` - MAJ status setup
- ✅ `updateBackfillProgress()` - MAJ progression backfill
- ✅ `delete(guildId)` - Supprimer settings
- ✅ `mapToDto()` - Mapper Prisma → DTO

**Dépendances:**
- `PrismaService` - Accès DB
- DTOs de `@my-project/shared-types`

---

### 2. `guild-setup.service.ts`
**Service principal pour l'initialisation des guilds**

**Méthodes principales:**
- ✅ `initializeGuild()` - Setup complet d'une guild
  - Créer/Update guild
  - Créer settings
  - Vérifier permissions
  - Snapshot initial
  - Finaliser
- ✅ `getSetupStatus()` - Status pour polling (cache + DB)
- ✅ `retrySetup()` - Relancer setup échoué

**Méthodes privées:**
- ✅ `createOrUpdateGuild()` - Upsert guild
- ✅ `checkBotPermissions()` - Vérif perms
- ✅ `createInitialSnapshot()` - Snapshot structure
- ✅ `finalizeSetup()` - Finaliser et décider status
- ✅ `handleSetupError()` - Gérer erreurs
- ✅ `updateSetupProgress()` - MAJ cache progression

**Features:**
- Cache en mémoire pour setups en cours
- Calcul auto du temps restant
- Gestion des warnings non-bloquants
- Support retry

**Dépendances:**
- `PrismaService` - Accès DB
- `GuildSettingsService` - CRUD settings
- DTOs de `@my-project/shared-types`

---

### 3. `quick-start.service.ts`
**Service pour le wizard d'onboarding**

**Méthodes principales:**
- ✅ `getOptions(guildId)` - Options du wizard
  - Fetch channels disponibles
  - Vérif permissions
  - Générer recommendations
- ✅ `applyAnswers(answers)` - Appliquer config wizard
  - Update settings
  - Créer mod log channel si demandé
  - Générer next steps

**Méthodes privées:**
- ✅ `createModLogChannel()` - Créer channel via Discord API
- ✅ `generateNextSteps()` - Suggestions next steps

**Dépendances:**
- `GuildSettingsService` - MAJ settings
- `DiscordApiService` - Fetch channels, create channel
- DTOs de `@my-project/shared-types`

---

### 4. `guild-setup.module.ts`
**Module NestJS qui regroupe tout**

**Imports:**
- `PrismaModule` - Accès DB
- `DiscordCoreModule` - Discord API

**Providers:**
- `GuildSettingsService`
- `GuildSetupService`
- `QuickStartService`

**Exports:**
- Tous les services (pour usage dans autres modules)

**Controllers:** À ajouter en Phase 1.4

---

## 📂 Structure dans le Projet

```
apps/backend/src/modules/
├── guild-setup/                      ← NOUVEAU MODULE
│   ├── services/
│   │   ├── guild-settings.service.ts  ← CRUD settings
│   │   ├── guild-setup.service.ts     ← Setup principal
│   │   └── quick-start.service.ts     ← Wizard
│   ├── controllers/                   ← Phase 1.4
│   │   ├── guild-setup.controller.ts
│   │   └── guild-settings.controller.ts
│   └── guild-setup.module.ts          ← Module
├── prisma/
├── discord/
├── auth/
└── ...
```

---

## 🚀 Installation dans le Projet

### Étape 1 : Créer la structure

```bash
cd apps/backend/src/modules
mkdir -p guild-setup/services guild-setup/controllers
```

### Étape 2 : Copier les fichiers

```bash
# Services
cp /path/to/guild-settings.service.ts apps/backend/src/modules/guild-setup/services/
cp /path/to/guild-setup.service.ts apps/backend/src/modules/guild-setup/services/
cp /path/to/quick-start.service.ts apps/backend/src/modules/guild-setup/services/

# Module
cp /path/to/guild-setup.module.ts apps/backend/src/modules/guild-setup/
```

### Étape 3 : Enregistrer le module dans AppModule

**Fichier:** `apps/backend/src/app.module.ts`

```typescript
import { GuildSetupModule } from './modules/guild-setup/guild-setup.module';

@Module({
  imports: [
    // ... existing imports
    GuildSetupModule, // ← AJOUTER
  ],
  // ...
})
export class AppModule {}
```

### Étape 4 : Vérifier les imports

Assurez-vous que `@my-project/shared-types` est bien configuré dans `package.json`:

```json
{
  "dependencies": {
    "@my-project/shared-types": "*"
  }
}
```

### Étape 5 : Build et tester

```bash
cd apps/backend

# Install dependencies si besoin
npm install

# Build
npm run build

# Lancer en dev
npm run start:dev
```

---

## 🎯 Utilisation des Services

### Exemple 1 : Initialiser une guild (appelé depuis BotEventHandler)

```typescript
// apps/backend/src/modules/gateway/services/bot-event-handler.service.ts

import { GuildSetupService } from '../../guild-setup/services/guild-setup.service';

@Injectable()
export class BotEventHandlerService {
  constructor(
    private readonly guildSetup: GuildSetupService,
  ) {}

  async processEvent(event: BotEventDto) {
    if (event.type === EventType.GUILD_CREATE) {
      // Bot a rejoint une guild
      const result = await this.guildSetup.initializeGuild(
        event.guildId,
        {
          name: event.data.name,
          icon: event.data.icon,
          ownerId: event.data.ownerId,
          memberCount: event.data.memberCount,
          channels: event.data.channels,
          roles: event.data.roles,
        },
      );
      
      this.logger.log(
        `Guild ${event.guildId} initialized: ${result.status.status}`,
      );
    }
  }
}
```

### Exemple 2 : Récupérer le status (pour API endpoint)

```typescript
// Dans un futur controller
@Get(':guildId/setup/status')
async getSetupStatus(
  @Param('guildId') guildId: string,
): Promise<GuildSetupStatusDto> {
  return this.guildSetup.getSetupStatus(guildId);
}
```

### Exemple 3 : Appliquer le wizard

```typescript
// Dans un futur controller
@Post(':guildId/setup/quick-start')
async submitQuickStart(
  @Param('guildId') guildId: string,
  @Body() answers: QuickStartAnswersDto,
): Promise<QuickStartResponseDto> {
  return this.quickStart.applyAnswers(answers);
}
```

---

## 🔄 Flow Complet

```
BOT EVENT (GUILD_CREATE)
     ↓
BotEventHandlerService.processEvent()
     ↓
GuildSetupService.initializeGuild()
     ↓
   [0%] Start
     ↓
  [10%] GuildSettingsService.create()
     ↓
  [20%] Create/Update Guild DB
     ↓
  [40%] Check bot permissions
     ↓
  [60%] Create initial snapshot
     ↓
  [80%] Initialize members tracking
     ↓
 [100%] Finalize → READY/PARTIAL/ERROR
     ↓
Status cached + stored in DB
     ↓
Frontend polls getSetupStatus()
     ↓
Redirect to dashboard
```

---

## 📊 Exemples de Logs

### Setup Réussi

```
[GuildSetupService] Starting guild initialization: 123456789
[GuildSettingsService] Creating settings for guild 123456789
[GuildSettingsService] Settings created for guild 123456789
[GuildSetupService] Guild initialization completed: 123456789 (1543ms)
```

### Setup avec Warnings

```
[GuildSetupService] Starting guild initialization: 987654321
[GuildSettingsService] Creating settings for guild 987654321
[GuildSetupService] 3 channel(s) inaccessible(s)
[GuildSetupService] Guild initialization completed: 987654321 (1821ms) - PARTIAL
```

### Setup en Erreur

```
[GuildSetupService] Starting guild initialization: 555555555
[GuildSettingsService] Creating settings for guild 555555555
[GuildSetupService] Guild initialization failed: 555555555
[GuildSettingsService] Updating initialization status for guild 555555555: ERROR
```

---

## ✅ Checklist Phase 1.3

- [x] GuildSettingsService créé avec tous les CRUD
- [x] GuildSetupService créé avec logique d'initialisation
- [x] QuickStartService créé pour le wizard
- [x] GuildSetupModule créé et configuré
- [x] Cache en mémoire pour tracking setups
- [x] Calcul automatique temps restant
- [x] Gestion erreurs et warnings
- [x] Support retry
- [x] Logging complet
- [x] Mapper Prisma → DTO
- [x] Documentation complète

---

## 🐛 Points d'Attention

### 1. Timeout du Setup

Le setup doit être **< 30 secondes**. Si ça prend plus:
- Réduire les fetches Discord API
- Faire certaines étapes en async (background)
- Implémenter circuit breaker

### 2. Permissions Discord

La vérification des permissions est actuellement **mockée**.  
À implémenter en Phase 1.5:
- Fetch bot member de la guild
- Vérifier permissions réelles
- Stocker permissions manquantes

### 3. Cache Memory

Le cache des setups en cours est **en mémoire locale**.  
Problème si plusieurs instances backend:
- Utiliser Redis pour le cache partagé
- Ou utiliser WebSocket push au lieu de polling

### 4. Rate Limiting Discord

Les appels à Discord API doivent respecter les limites:
- `DiscordApiService` gère déjà le rate limiting
- Mais attention aux fetches massifs de channels/roles
- Limiter à top 50 channels par exemple

---

## 🎯 Prochaines Étapes (Phase 1.4)

1. **Créer les Controllers**
   - `GuildSetupController`
   - `GuildSettingsController`

2. **Endpoints à créer:**
   - `POST /api/guilds/:guildId/setup/initialize`
   - `GET /api/guilds/:guildId/setup/status`
   - `POST /api/guilds/:guildId/setup/retry`
   - `GET /api/guilds/:guildId/setup/quick-start/options`
   - `POST /api/guilds/:guildId/setup/quick-start`
   - `GET /api/guilds/:guildId/settings`
   - `PATCH /api/guilds/:guildId/settings`

3. **Guards à ajouter:**
   - `JwtAuthGuard` - Authentification
   - `GuildMemberGuard` - Vérif user dans guild
   - `GuildAdminGuard` - Vérif user admin

---

**Phase 1.3 : ✅ COMPLÉTÉE**

**Temps estimé vs réel:**
- Estimé : 3-4h
- Réel : 2h

**Code prêt pour Phase 1.4 (Controllers) !** 🚀
