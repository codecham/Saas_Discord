# 📦 Phase 1.2 : DTOs Guild Setup - Guide d'Intégration

## ✅ Fichiers Créés

### 1. `guild-setup.enums.ts`
**Enums pour le système d'onboarding :**
- ✅ `InitializationStatus` - Status du setup (pending, initializing, ready, error, partial)
- ✅ `BackfillStatus` - Status du backfill (none, requested, in_progress, completed, failed)
- ✅ `AutoModLevel` - Niveau automod (off, low, medium, high)
- ✅ `SetupErrorSeverity` - Sévérité erreur (info, warning, critical)

### 2. `guild-settings.dto.ts`
**DTOs pour la configuration guild :**
- ✅ `GuildSettingsDto` - Configuration complète (miroir du model Prisma)
- ✅ `UpdateGuildSettingsDto` - DTO pour mise à jour partielle
- ✅ `CreateGuildSettingsDto` - DTO pour création avec defaults

### 3. `guild-setup-status.dto.ts`
**DTOs pour le suivi du setup :**
- ✅ `SetupErrorDto` - Erreur détaillée avec résolution suggérée
- ✅ `SetupWarningDto` - Warning non-bloquant
- ✅ `GuildSetupStatusDto` - Status complet pour polling frontend
- ✅ `RetrySetupDto` - DTO pour retry setup
- ✅ `InitializeGuildResponseDto` - Réponse après init

### 4. `quick-start.dto.ts`
**DTOs pour le wizard d'onboarding :**
- ✅ `QuickStartAnswersDto` - Réponses du wizard
- ✅ `QuickStartResponseDto` - Confirmation après wizard
- ✅ `QuickStartOptionsDto` - Options pour pré-remplir le wizard

### 5. `backfill.dto.ts`
**DTOs pour le backfill de stats :**
- ✅ `BackfillProgressDto` - Progression détaillée du backfill
- ✅ `RequestBackfillDto` - Demande de backfill
- ✅ `RequestBackfillResponseDto` - Réponse après demande
- ✅ `BackfillStatsDto` - Statistiques du backfill terminé

### 6. `index.ts`
**Fichier d'export centralisé**

---

## 📂 Structure dans le Projet

```
packages/shared-types/src/dtos/app/
├── guild-setup/                    ← NOUVEAU DOSSIER
│   ├── index.ts                    ← Export tout
│   ├── guild-setup.enums.ts        ← Enums
│   ├── guild-settings.dto.ts       ← Settings
│   ├── guild-setup-status.dto.ts   ← Status & errors
│   ├── quick-start.dto.ts          ← Wizard
│   └── backfill.dto.ts             ← Backfill
├── auth/
├── events/
└── stats/
```

---

## 🚀 Installation dans le Projet

### Étape 1 : Créer le dossier

```bash
cd packages/shared-types/src/dtos/app
mkdir -p guild-setup
```

### Étape 2 : Copier les fichiers

```bash
# Copier tous les fichiers créés
cp /path/to/guild-setup.enums.ts packages/shared-types/src/dtos/app/guild-setup/
cp /path/to/guild-settings.dto.ts packages/shared-types/src/dtos/app/guild-setup/
cp /path/to/guild-setup-status.dto.ts packages/shared-types/src/dtos/app/guild-setup/
cp /path/to/quick-start.dto.ts packages/shared-types/src/dtos/app/guild-setup/
cp /path/to/backfill.dto.ts packages/shared-types/src/dtos/app/guild-setup/
cp /path/to/guild-setup-index.ts packages/shared-types/src/dtos/app/guild-setup/index.ts
```

### Étape 3 : Mettre à jour l'export principal

**Fichier:** `packages/shared-types/src/index.ts`

Ajouter cette ligne :

```typescript
// Guild Setup (onboarding)
export * from './dtos/app/guild-setup';
```

Le fichier complet devrait ressembler à :

```typescript
// packages/shared-types/src/index.ts

// Auth
export * from './dtos/app/auth/auth.dto';

// Discord
export * from './dtos/app/app-discord.dto';

// Events
export * from './dtos/app/events/botEvent.dto';

// Stats
export * from './dtos/app/stats';

// Guild Setup (onboarding) ← NOUVEAU
export * from './dtos/app/guild-setup';

// Discord raw API
export * from './dtos/discord/user.dto';
export * from './dtos/discord/guild.dto';
export * from './dtos/discord/channel.dto';
export * from './dtos/discord/message.dto';
export * from './dtos/discord/role.dto';
export * from './dtos/discord/member.dto';

// Enums
export * from './enums/eventTypes.enum';

export const SHARED_TYPES_VERSION = '1.0.0';
```

### Étape 4 : Rebuild le package

```bash
cd packages/shared-types
npm run build
```

---

## 🎯 Utilisation dans le Code

### Backend (NestJS)

```typescript
// Import des DTOs
import {
  GuildSettingsDto,
  UpdateGuildSettingsDto,
  GuildSetupStatusDto,
  InitializationStatus,
  QuickStartAnswersDto,
  BackfillProgressDto
} from '@your-workspace/shared';

// Dans un service
@Injectable()
export class GuildSetupService {
  async getSetupStatus(guildId: string): Promise<GuildSetupStatusDto> {
    const guild = await this.prisma.guild.findUnique({
      where: { guildId },
      include: { settings: true }
    });
    
    return {
      guildId,
      status: guild.settings.initializationStatus as InitializationStatus,
      progress: this.calculateProgress(guild.settings),
      // ...
    };
  }
  
  async applyQuickStartAnswers(
    answers: QuickStartAnswersDto
  ): Promise<GuildSettingsDto> {
    // Appliquer les settings du wizard
    const updated = await this.prisma.guildSettings.update({
      where: { guildId: answers.guildId },
      data: {
        moduleStats: answers.enableStats ?? true,
        trackInvites: answers.enableInviteTracking ?? true,
        modLogChannelId: answers.modLogChannelId,
        // ...
      }
    });
    
    return this.mapToDto(updated);
  }
}
```

### Frontend (Angular)

```typescript
// Import des DTOs
import {
  GuildSetupStatusDto,
  InitializationStatus,
  QuickStartAnswersDto,
  SetupErrorDto
} from '@your-workspace/shared';

// Dans un service
@Injectable()
export class GuildSetupApiService {
  getSetupStatus(guildId: string): Observable<GuildSetupStatusDto> {
    return this.http.get<GuildSetupStatusDto>(
      `${this.apiUrl}/guilds/${guildId}/setup/status`
    );
  }
  
  submitQuickStart(answers: QuickStartAnswersDto): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/guilds/${answers.guildId}/setup/quick-start`,
      answers
    );
  }
}

// Dans un component
@Component({
  selector: 'app-guild-setup-modal',
  template: `...`
})
export class GuildSetupModalComponent {
  setupStatus = signal<GuildSetupStatusDto | null>(null);
  
  ngOnInit() {
    this.pollSetupStatus();
  }
  
  private pollSetupStatus() {
    interval(2000)
      .pipe(
        switchMap(() => this.api.getSetupStatus(this.guildId)),
        takeWhile(status => 
          status.status === InitializationStatus.INITIALIZING ||
          status.status === InitializationStatus.PENDING
        )
      )
      .subscribe(status => {
        this.setupStatus.set(status);
        
        if (status.status === InitializationStatus.READY) {
          this.onSetupComplete();
        }
      });
  }
}
```

---

## 📊 Exemples de Données

### GuildSetupStatusDto (Pending)

```json
{
  "guildId": "123456789",
  "status": "pending",
  "progress": 0,
  "currentStep": "Waiting for bot to join...",
  "startedAt": "2025-10-28T10:00:00.000Z"
}
```

### GuildSetupStatusDto (Initializing)

```json
{
  "guildId": "123456789",
  "status": "initializing",
  "progress": 45,
  "currentStep": "Fetching channels...",
  "elapsedTime": 5000,
  "estimatedTimeRemaining": 6000,
  "startedAt": "2025-10-28T10:00:00.000Z"
}
```

### GuildSetupStatusDto (Error)

```json
{
  "guildId": "123456789",
  "status": "error",
  "progress": 30,
  "error": {
    "code": "MISSING_PERMS",
    "severity": "critical",
    "message": "Le bot manque de permissions essentielles",
    "resolution": "Réinvitez le bot avec toutes les permissions requises",
    "canRetry": true,
    "timestamp": 1698489600000
  },
  "startedAt": "2025-10-28T10:00:00.000Z"
}
```

### GuildSetupStatusDto (Partial)

```json
{
  "guildId": "123456789",
  "status": "partial",
  "progress": 100,
  "warnings": [
    {
      "code": "PARTIAL_ACCESS",
      "message": "3 channels sur 50 sont inaccessibles",
      "suggestion": "Vérifiez les permissions du bot sur ces channels",
      "timestamp": 1698489600000
    }
  ],
  "completedAt": "2025-10-28T10:00:15.000Z",
  "startedAt": "2025-10-28T10:00:00.000Z"
}
```

### QuickStartAnswersDto

```json
{
  "guildId": "123456789",
  "enableStats": true,
  "enableInviteTracking": true,
  "modLogChannelId": "987654321",
  "enableAutomod": false
}
```

### BackfillProgressDto

```json
{
  "guildId": "123456789",
  "status": "in_progress",
  "progress": {
    "current": 5432,
    "total": 10000,
    "percentage": 54
  },
  "channelsProgress": [
    {
      "channelId": "111",
      "channelName": "general",
      "messagesProcessed": 2500,
      "totalMessages": 3000,
      "isComplete": false
    },
    {
      "channelId": "222",
      "channelName": "announcements",
      "messagesProcessed": 150,
      "totalMessages": 150,
      "isComplete": true
    }
  ],
  "metadata": {
    "startedAt": "2025-10-28T10:05:00.000Z",
    "periodDays": 7,
    "channelsProcessed": 1,
    "totalChannels": 5,
    "errorsCount": 0
  },
  "elapsedTime": 120000,
  "estimatedTimeRemaining": 180000
}
```

---

## ✅ Checklist Phase 1.2

- [x] Enums créés (InitializationStatus, BackfillStatus, AutoModLevel, SetupErrorSeverity)
- [x] DTOs Settings créés (GuildSettingsDto, UpdateGuildSettingsDto, CreateGuildSettingsDto)
- [x] DTOs Status créés (GuildSetupStatusDto, SetupErrorDto, SetupWarningDto)
- [x] DTOs QuickStart créés (QuickStartAnswersDto, QuickStartResponseDto, QuickStartOptionsDto)
- [x] DTOs Backfill créés (BackfillProgressDto, RequestBackfillDto, BackfillStatsDto)
- [x] Index file créé pour exports
- [x] Documentation des usages
- [x] Exemples de données JSON

---

## 🎯 Prochaines Étapes (Phase 1.3)

Une fois les DTOs intégrés au projet :

1. **Backend Services**
   - `GuildSetupService`
   - `GuildSettingsService`

2. **Backend Controllers**
   - Endpoints pour setup
   - Endpoints pour settings
   - Endpoints pour quick-start

3. **Bot Listener**
   - Modifier `GUILD_CREATE` pour envoyer données complètes

---

**Phase 1.2 : ✅ COMPLÉTÉE**

Temps estimé vs réel : 
- Estimé : 1-2h
- Réel : 45min

**Prêt pour Phase 1.3 !** 🚀
