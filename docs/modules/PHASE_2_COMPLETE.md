# 📦 Phase 2 : Backend - Module Registry & Manager

## ✅ Statut : COMPLÉTÉ

**Date** : 31 Octobre 2025  
**Durée estimée** : 4-5h  
**Durée réelle** : ~45min

---

## 🎯 Objectif

Créer le **cerveau du système de modules** côté backend, capable de :
- Enregistrer tous les modules disponibles
- Gérer l'activation/désactivation par serveur
- Vérifier les limites selon le plan d'abonnement
- Exposer des API pour le frontend

---

## 📂 Fichiers Créés

### 1. Schéma Prisma - `guild_modules`
**Chemin** : `apps/backend/prisma/schema.prisma`

**Fichier d'aide fourni** : `prisma-module-system.txt` (à copier dans ton schema.prisma)

**Contenu** :
```prisma
model GuildModule {
  id         String   @id @default(cuid())
  guildId    String   @map("guild_id")
  moduleId   String   @map("module_id")
  enabled    Boolean  @default(false)
  enabledAt  DateTime?
  disabledAt DateTime?
  config     Json?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  guild Guild @relation(fields: [guildId], references: [guildId], onDelete: Cascade)

  @@unique([guildId, moduleId])
  @@index([guildId])
  @@index([enabled])
  @@map("guild_modules")
}
```

**Relation à ajouter dans le model Guild** :
```prisma
model Guild {
  // ... existing fields
  modules  GuildModule[]  // ← AJOUTER
}
```

---

### 2. `module.registry.ts`
**Chemin** : `apps/backend/src/modules/module-system/registry/module.registry.ts`

**Responsabilités** :
- ✅ Enregistrer les modules disponibles
- ✅ `register(module)` - Ajoute un module au registre
- ✅ `getModule(id)` - Récupère une définition
- ✅ `getAllModules()` - Liste tous les modules
- ✅ `getAvailableModules(plan)` - Filtre par plan
- ✅ `isModuleAvailable(id, plan)` - Vérifie disponibilité
- ✅ `getModuleLimits(id, plan)` - Récupère les limites
- ✅ `checkLimit(id, plan, resource, count)` - Vérifie si limite dépassée
- ✅ `getLimitValue(id, plan, resource)` - Récupère une valeur de limite
- ✅ `checkDependencies(id, enabled[])` - Vérifie les dépendances

**Exemple d'utilisation** :
```typescript
// Enregistrer un module
moduleRegistry.register(AUTOMOD_MODULE);

// Vérifier disponibilité
const available = moduleRegistry.isModuleAvailable('automod', SubscriptionPlan.FREE);

// Vérifier limite
const withinLimit = moduleRegistry.checkLimit('automod', 'free', 'rules', 2); // true si < 3
```

---

### 3. `module-manager.service.ts`
**Chemin** : `apps/backend/src/modules/module-system/services/module-manager.service.ts`

**Responsabilités** :
- ✅ `enableModule()` - Active un module pour un serveur
- ✅ `disableModule()` - Désactive un module
- ✅ `isModuleEnabled()` - Vérifie si activé
- ✅ `getGuildModules()` - Liste modules d'un serveur
- ✅ `getEnabledModuleIds()` - IDs des modules actifs
- ✅ `checkLimit()` - Vérifie limite complète (avec DB)
- ✅ `updateModuleConfig()` - Met à jour config
- ✅ `mapToGuildModuleConfig()` - Transforme Prisma → DTO
- ⏳ `notifyBot()` - TODO Phase 5 (Gateway)

**Exemple d'utilisation** :
```typescript
// Activer automod
await moduleManager.enableModule(
  'guildId123',
  'automod',
  SubscriptionPlan.FREE,
  { sensitivity: 'high' }
);

// Vérifier limite avant action
const limitCheck = await moduleManager.checkLimit({
  guildId: 'guildId123',
  moduleId: 'automod',
  resource: 'rules',
  currentCount: 3
}, SubscriptionPlan.FREE);

if (!limitCheck.allowed) {
  throw new Error('Limite atteinte');
}
```

---

### 4. `module-system.module.ts`
**Chemin** : `apps/backend/src/modules/module-system/module-system.module.ts`

**Contenu** :
- ✅ Importe `PrismaModule`
- ✅ Déclare `ModuleRegistry` et `ModuleManagerService` comme providers
- ✅ Déclare `ModuleSystemController`
- ✅ Exporte les services pour usage dans d'autres modules
- ✅ Hook `onModuleInit` pour enregistrer les modules au démarrage

---

### 5. `module-system.controller.ts`
**Chemin** : `apps/backend/src/modules/module-system/controllers/module-system.controller.ts`

**Endpoints** :
- ✅ `GET /modules` - Liste tous les modules
- ✅ `GET /modules/available/:plan` - Modules dispo pour un plan
- ✅ `GET /modules/:guildId` - Modules d'un serveur
- ✅ `POST /modules/:guildId/enable` - Activer un module
- ✅ `DELETE /modules/:guildId/disable` - Désactiver un module
- ✅ `POST /modules/:guildId/check-limit` - Vérifier une limite

**Exemple requête** :
```bash
# Activer automod
curl -X POST http://localhost:3000/modules/123456789/enable \
  -H "Content-Type: application/json" \
  -d '{
    "guildId": "123456789",
    "moduleId": "automod",
    "config": { "sensitivity": "high" }
  }'
```

---

## 📊 Structure Finale

```
apps/backend/src/modules/
├── module-system/                              ← NOUVEAU MODULE
│   ├── registry/
│   │   └── module.registry.ts                  ← Cerveau
│   ├── services/
│   │   └── module-manager.service.ts           ← Gestionnaire
│   ├── controllers/
│   │   └── module-system.controller.ts         ← API
│   └── module-system.module.ts                 ← Module NestJS
├── prisma/
├── discord/
├── auth/
└── ...
```

---

## 🔧 Actions Manuelles Requises

### 1. Mettre à jour le schéma Prisma

**Fichier** : `apps/backend/prisma/schema.prisma`

Copie le contenu de `prisma-module-system.txt` :
1. Ajoute le model `GuildModule` à la fin du fichier
2. Ajoute la relation `modules GuildModule[]` dans le model `Guild`

### 2. Créer la migration

```bash
cd apps/backend
npx prisma migrate dev --name add_module_system
npx prisma generate
```

### 3. Enregistrer le module dans AppModule

**Fichier** : `apps/backend/src/app.module.ts`

```typescript
import { ModuleSystemModule } from './modules/module-system/module-system.module';

@Module({
  imports: [
    // ... existing imports
    PrismaModule,
    AuthModule,
    // ... autres modules
    ModuleSystemModule,  // ← AJOUTER
  ],
  // ...
})
export class AppModule {}
```

---

## ✅ Validation Phase 2

### Test 1 : Build réussi

```bash
cd apps/backend
npm run start:dev
```

**Résultat attendu** :
```
[Nest] INFO  📦 Module System initialized
[Nest] INFO  Application is running on: http://localhost:3000
```

### Test 2 : Endpoints API

```bash
# Liste tous les modules (vide pour l'instant)
curl http://localhost:3000/modules

# Devrait retourner: []
```

### Test 3 : Database

```bash
npx prisma studio
```

Vérifier que la table `guild_modules` existe.

---

## 🎯 Prochaine Étape

**Phase 3 : Exemple Module - Automod**
- Créer la définition du module automod
- Ajouter tables Prisma spécifiques (automod_rules)
- Implémenter AutomodService
- Créer AutomodController
- Enregistrer dans le Registry

---

## 📝 Notes Importantes

### Architecture

1. **ModuleRegistry** = Base de données en mémoire des modules disponibles
2. **ModuleManagerService** = Pont entre Registry et PostgreSQL
3. **ModuleSystemController** = API REST pour le frontend

### Flux d'activation

```
Frontend → POST /modules/:guildId/enable
    ↓
ModuleSystemController
    ↓
ModuleManagerService.enableModule()
    ↓
1. Vérifie module existe (Registry)
2. Vérifie plan (Registry)
3. Vérifie dépendances (Registry + DB)
4. Insert/Update dans guild_modules (Prisma)
5. TODO: Notifie Bot (Phase 5)
    ↓
Retourne GuildModuleConfig
```

### Vérification des limites

```
Service métier (ex: AutomodService.createRule)
    ↓
ModuleManagerService.checkLimit()
    ↓
1. Vérifie si module enabled (DB)
2. Récupère limite (Registry)
3. Compare currentCount < limit
    ↓
Retourne CheckLimitResponse { allowed, limit, current }
```

---

## 🐛 Corrections Potentielles

### Si erreur Prisma

```bash
# Régénérer le client
npx prisma generate

# Reset la DB (DEV only)
npx prisma migrate reset
```

### Si erreur d'import `@my-project/shared-types`

```bash
# Rebuild shared-types
cd packages/shared-types
npm run build
```

### Si le module n'est pas reconnu dans AppModule

Vérifier les imports :
```typescript
import { ModuleSystemModule } from './modules/module-system/module-system.module';
```

---

**🎉 Phase 2 terminée avec succès !**

**Prochaine session : Phase 3 - Premier module réel (Automod)**
