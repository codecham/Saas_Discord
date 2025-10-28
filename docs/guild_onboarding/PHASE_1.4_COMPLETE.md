# 🧪 Phase 1.4 : Backend Controllers - Guide de Test

## ✅ Fichiers Créés

### 1. `guild-setup.controller.ts`
**Controller pour le setup des guilds**

**Endpoints:**
- ✅ `GET /guilds/:guildId/setup/status` - Status du setup
- ✅ `POST /guilds/:guildId/setup/retry` - Retry setup
- ✅ `GET /guilds/:guildId/setup/quick-start` - Options wizard
- ✅ `POST /guilds/:guildId/setup/quick-start` - Appliquer wizard

**Guards:**
- `JwtAuthGuard` - Authentification requise

---

### 2. `guild-settings.controller.ts`
**Controller pour les settings**

**Endpoints:**
- ✅ `GET /guilds/:guildId/settings` - Récupérer settings
- ✅ `PATCH /guilds/:guildId/settings` - Mettre à jour settings

**Guards:**
- `JwtAuthGuard` - Authentification requise

---

### 3. `guild-setup.module.ts` (mis à jour)
**Module avec controllers activés**

---

## 📂 Structure Finale

```
apps/backend/src/modules/guild-setup/
├── services/
│   ├── guild-settings.service.ts    ✅
│   ├── guild-setup.service.ts       ✅
│   └── quick-start.service.ts       ✅
├── controllers/
│   ├── guild-setup.controller.ts    ✅ NOUVEAU
│   └── guild-settings.controller.ts ✅ NOUVEAU
└── guild-setup.module.ts            ✅ MODIFIÉ
```

---

## 🚀 Installation

### Étape 1 : Copier les controllers

```bash
cd apps/backend/src/modules/guild-setup
mkdir -p controllers

# Copier les fichiers
cp /path/to/guild-setup.controller.ts controllers/
cp /path/to/guild-settings.controller.ts controllers/

# Remplacer le module
cp /path/to/guild-setup.module.ts .
```

### Étape 2 : Vérifier le module dans AppModule

Le `GuildSetupModule` doit être importé dans `app.module.ts`:

```typescript
// apps/backend/src/app.module.ts
import { GuildSetupModule } from './modules/guild-setup/guild-setup.module';

@Module({
  imports: [
    // ... existing
    GuildSetupModule, // ← Doit être présent
  ],
})
export class AppModule {}
```

### Étape 3 : Lancer le backend

```bash
cd apps/backend
npm run start:dev
```

---

## 🧪 Test des Endpoints

### Prérequis

1. **Backend lancé** sur `http://localhost:3000`
2. **Token JWT valide** (via login Discord OAuth)
3. **Guild ID** Discord valide

---

### 1. GET Setup Status

**Endpoint:** `GET /api/guilds/:guildId/setup/status`

**Curl:**
```bash
curl -X GET \
  'http://localhost:3000/api/guilds/123456789/setup/status' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Réponse attendue (PENDING):**
```json
{
  "guildId": "123456789",
  "status": "pending",
  "progress": 0,
  "currentStep": "Waiting for bot to join..."
}
```

**Réponse attendue (READY):**
```json
{
  "guildId": "123456789",
  "status": "ready",
  "progress": 100,
  "completedAt": "2025-10-28T10:15:30.000Z",
  "elapsedTime": 15000
}
```

**Réponse attendue (ERROR):**
```json
{
  "guildId": "123456789",
  "status": "error",
  "progress": 30,
  "error": {
    "code": "MISSING_PERMS",
    "severity": "critical",
    "message": "Le bot manque de permissions essentielles",
    "resolution": "Réinvitez le bot avec toutes les permissions",
    "canRetry": true,
    "timestamp": 1698489600000
  }
}
```

---

### 2. POST Retry Setup

**Endpoint:** `POST /api/guilds/:guildId/setup/retry`

**Curl:**
```bash
curl -X POST \
  'http://localhost:3000/api/guilds/123456789/setup/retry' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "force": true
  }'
```

**Réponse attendue:**
```json
{
  "success": true,
  "status": {
    "guildId": "123456789",
    "status": "initializing",
    "progress": 0,
    "startedAt": "2025-10-28T10:20:00.000Z"
  },
  "message": "Guild initialized successfully"
}
```

---

### 3. GET Quick Start Options

**Endpoint:** `GET /api/guilds/:guildId/setup/quick-start`

**Curl:**
```bash
curl -X GET \
  'http://localhost:3000/api/guilds/123456789/setup/quick-start' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Réponse attendue:**
```json
{
  "availableChannels": [
    {
      "id": "111111111",
      "name": "general",
      "type": 0
    },
    {
      "id": "222222222",
      "name": "announcements",
      "type": 0
    }
  ],
  "canCreateChannels": true,
  "recommendations": {
    "stats": true,
    "inviteTracking": true,
    "automod": false,
    "automodLevel": "medium"
  }
}
```

---

### 4. POST Submit Quick Start

**Endpoint:** `POST /api/guilds/:guildId/setup/quick-start`

**Curl:**
```bash
curl -X POST \
  'http://localhost:3000/api/guilds/123456789/setup/quick-start' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "guildId": "123456789",
    "enableStats": true,
    "enableInviteTracking": true,
    "modLogChannelId": "987654321",
    "enableAutomod": false
  }'
```

**Réponse attendue:**
```json
{
  "success": true,
  "settings": {
    "modulesEnabled": ["stats", "invites", "moderation"],
    "modLogChannelCreated": false,
    "modLogChannelId": "987654321",
    "configApplied": true
  },
  "message": "Configuration applied successfully! 3 module(s) enabled.",
  "nextSteps": [
    "📊 Consultez le dashboard pour voir les premières stats",
    "🔗 Créez des codes d'invitation pour tracker les arrivées",
    "🔨 Configurez les règles de modération automatique",
    "👋 Activez les messages de bienvenue pour accueillir les nouveaux membres",
    "⚙️ Personnalisez davantage dans les paramètres du serveur"
  ]
}
```

---

### 5. GET Guild Settings

**Endpoint:** `GET /api/guilds/:guildId/settings`

**Curl:**
```bash
curl -X GET \
  'http://localhost:3000/api/guilds/123456789/settings' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Réponse attendue:**
```json
{
  "id": "clxyz123",
  "guildId": "123456789",
  "initializationStatus": "ready",
  "initializationError": null,
  "initializedAt": "2025-10-28T10:15:30.000Z",
  "moduleStats": true,
  "moduleModeration": true,
  "moduleInvites": true,
  "moduleAutomod": false,
  "moduleWelcome": false,
  "statsBackfillDays": 0,
  "statsBackfillStatus": "none",
  "statsBackfillProgress": 0,
  "statsRetentionDays": 90,
  "statsBackfilledAt": null,
  "modLogChannelId": "987654321",
  "autoModLevel": "medium",
  "trackInvites": true,
  "inviteAnalytics": true,
  "locale": "en",
  "timezone": "UTC",
  "adminRoleIds": [],
  "modRoleIds": [],
  "createdAt": "2025-10-28T10:00:00.000Z",
  "updatedAt": "2025-10-28T10:15:30.000Z"
}
```

---

### 6. PATCH Update Settings

**Endpoint:** `PATCH /api/guilds/:guildId/settings`

**Curl:**
```bash
curl -X PATCH \
  'http://localhost:3000/api/guilds/123456789/settings' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "moduleAutomod": true,
    "autoModLevel": "high",
    "statsRetentionDays": 180
  }'
```

**Réponse attendue:**
```json
{
  "id": "clxyz123",
  "guildId": "123456789",
  "initializationStatus": "ready",
  "initializationError": null,
  "initializedAt": "2025-10-28T10:15:30.000Z",
  "moduleStats": true,
  "moduleModeration": true,
  "moduleInvites": true,
  "moduleAutomod": true,
  "moduleWelcome": false,
  "statsBackfillDays": 0,
  "statsBackfillStatus": "none",
  "statsBackfillProgress": 0,
  "statsRetentionDays": 180,
  "statsBackfilledAt": null,
  "modLogChannelId": "987654321",
  "autoModLevel": "high",
  "trackInvites": true,
  "inviteAnalytics": true,
  "locale": "en",
  "timezone": "UTC",
  "adminRoleIds": [],
  "modRoleIds": [],
  "createdAt": "2025-10-28T10:00:00.000Z",
  "updatedAt": "2025-10-28T10:25:00.000Z"
}
```

---

## 🔒 Authentification

### Récupérer un Token JWT

**1. Login via Discord OAuth:**
```bash
# Ouvrir dans le navigateur
http://localhost:3000/api/auth/discord
```

**2. Callback récupère les tokens:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxyz456",
    "discordId": "987654321",
    "username": "TestUser"
  }
}
```

**3. Utiliser le token dans les requêtes:**
```bash
-H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

---

## 🐛 Erreurs Courantes

### 401 Unauthorized

**Cause:** Token manquant ou invalide

**Solution:**
```bash
# Vérifier le header Authorization
-H 'Authorization: Bearer YOUR_VALID_TOKEN'
```

### 404 Not Found (Settings)

**Cause:** Settings pas encore créés pour cette guild

**Solution:**
- Les settings sont créés automatiquement lors du setup
- Ou créer manuellement via Prisma Studio

### 400 Bad Request (Quick Start)

**Cause:** Body invalide ou champs manquants

**Solution:**
```json
{
  "guildId": "123456789",  // Requis
  "enableStats": true      // Optionnel mais recommandé
}
```

---

## 📊 Collection Postman

### Importer la Collection

Créer un fichier `guild-setup-endpoints.postman_collection.json`:

```json
{
  "info": {
    "name": "Guild Setup API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get Setup Status",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt_token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/guilds/{{guild_id}}/setup/status",
          "host": ["{{base_url}}"],
          "path": ["guilds", "{{guild_id}}", "setup", "status"]
        }
      }
    },
    {
      "name": "Retry Setup",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt_token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"force\": true\n}"
        },
        "url": {
          "raw": "{{base_url}}/guilds/{{guild_id}}/setup/retry",
          "host": ["{{base_url}}"],
          "path": ["guilds", "{{guild_id}}", "setup", "retry"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000/api"
    },
    {
      "key": "jwt_token",
      "value": "YOUR_JWT_TOKEN"
    },
    {
      "key": "guild_id",
      "value": "123456789"
    }
  ]
}
```

---

## ✅ Checklist Phase 1.4

- [x] GuildSetupController créé avec 4 endpoints
- [x] GuildSettingsController créé avec 2 endpoints
- [x] Module mis à jour avec controllers
- [x] Guards JwtAuthGuard appliqués
- [x] Logging sur chaque endpoint
- [x] Documentation complète des endpoints
- [x] Exemples curl pour tous les endpoints
- [x] Gestion des erreurs
- [x] Collection Postman

---

## 🎯 Prochaines Étapes (Phase 1.5)

1. **Modifier le Bot Listener GUILD_CREATE**
   - Envoyer toutes les données nécessaires
   - Channels, roles, members sample

2. **Modifier BotEventHandler Backend**
   - Appeler `GuildSetupService.initializeGuild()`
   - Gérer les erreurs

3. **Tests E2E**
   - Simuler ajout bot
   - Tester flow complet

---

**Phase 1.4 : ✅ COMPLÉTÉE**

**Temps estimé vs réel:**
- Estimé : 2-3h
- Réel : 1h

**6 endpoints API prêts pour le frontend !** 🚀
