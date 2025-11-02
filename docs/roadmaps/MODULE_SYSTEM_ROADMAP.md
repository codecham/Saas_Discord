# 🧩 MODULE SYSTEM - Roadmap d'Implémentation Complète

## 📋 Document de Référence - Architecture Modulaire

**Version** : 1.0  
**Date de création** : 30 Octobre 2025  
**Dernière mise à jour** : 30 Octobre 2025

---

## 🎯 OBJECTIFS DU SYSTÈME

### Vision
Créer une architecture modulaire permettant d'ajouter facilement des fonctionnalités (modules) à l'application Discord Admin, avec :
- ✅ Activation/désactivation par serveur
- ✅ Limitations selon le plan d'abonnement (free/premium/enterprise)
- ✅ Indépendance totale entre modules
- ✅ Communication Backend ↔ Bot via WebSocket existant
- ✅ Frontend simple à implémenter par la suite

### Principes de Design
1. **Micro-modules** : Chaque fonctionnalité est un module indépendant
2. **Isolation** : Un bug dans un module n'affecte pas les autres
3. **Simplicité** : Ajouter un module = 3 fichiers + 1 enregistrement
4. **Limites par ressource** : Contrôle précis (ex: 3 règles automod en free)
5. **Scalable** : Prêt pour 100+ modules

---

## 🏗️ ARCHITECTURE GLOBALE

### Composants Principaux

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Module List  │  │ Module Card  │  │ Module Config│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND (NestJS)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            MODULE REGISTRY (Cerveau)                  │  │
│  │  - Enregistre tous les modules                        │  │
│  │  - Vérifie disponibilité (plan)                       │  │
│  │  - Check limites (rules, actions...)                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                              ↓                               │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────┐ │
│  │  Automod  │  │  Tickets  │  │ Leveling  │  │   ...   │ │
│  │  Module   │  │  Module   │  │  Module   │  │         │ │
│  └───────────┘  └───────────┘  └───────────┘  └─────────┘ │
│                              ↓                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            MODULE MANAGER SERVICE                     │  │
│  │  - Enable/Disable modules                             │  │
│  │  - CRUD sur guild_modules                             │  │
│  │  - Notifie le Bot via Gateway                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓ WebSocket (Gateway)
┌─────────────────────────────────────────────────────────────┐
│                         BOT (SapphireJS)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            MODULE LOADER                              │  │
│  │  - Charge modules actifs au démarrage                 │  │
│  │  - Écoute events module.enabled/disabled              │  │
│  │  - Reload config en temps réel                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                              ↓                               │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────┐ │
│  │  Automod  │  │  Tickets  │  │ Leveling  │  │   ...   │ │
│  │ Listeners │  │ Commands  │  │ Listeners │  │         │ │
│  └───────────┘  └───────────┘  └───────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE (PostgreSQL)                   │
│  ┌──────────────────┐  ┌─────────────────┐                 │
│  │  guild_modules   │  │ automod_rules   │  (+ tables par  │
│  │  - guild_id      │  │ ticket_systems  │   module)       │
│  │  - module_id     │  │ leveling_config │                 │
│  │  - enabled       │  │ ...             │                 │
│  └──────────────────┘  └─────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 MODÈLE DE DONNÉES

### Table Générique : `guild_modules`

```sql
CREATE TABLE guild_modules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id      VARCHAR(20) NOT NULL,
  module_id     VARCHAR(50) NOT NULL,  -- 'automod', 'tickets', 'leveling'...
  enabled       BOOLEAN DEFAULT false,
  enabled_at    TIMESTAMP,
  disabled_at   TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(guild_id, module_id),
  FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE INDEX idx_guild_modules_guild_id ON guild_modules(guild_id);
CREATE INDEX idx_guild_modules_enabled ON guild_modules(enabled) WHERE enabled = true;
```

### Tables Spécifiques par Module

Chaque module a ses propres tables pour stocker sa configuration.

**Exemple : Automod**
```sql
CREATE TABLE automod_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id      VARCHAR(20) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  rule_type     VARCHAR(50) NOT NULL,  -- 'spam', 'links', 'caps'...
  enabled       BOOLEAN DEFAULT true,
  config        JSONB NOT NULL,        -- Configuration spécifique
  created_by    VARCHAR(20) NOT NULL,  -- Discord user ID
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE INDEX idx_automod_rules_guild_id ON automod_rules(guild_id);
CREATE INDEX idx_automod_rules_enabled ON automod_rules(enabled) WHERE enabled = true;
```

**Exemple : Tickets**
```sql
CREATE TABLE ticket_systems (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id        VARCHAR(20) NOT NULL,
  category_id     VARCHAR(20) NOT NULL,  -- Discord category ID
  panel_channel_id VARCHAR(20),
  config          JSONB NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);
```

---

## 🔧 PHASES D'IMPLÉMENTATION

---

## ✅ PHASE 1 : SHARED TYPES (2-3h)

**Objectif** : Créer les types partagés entre Backend, Bot et Frontend.

### 📦 Fichier 1.1 : `module-definition.interface.ts`

**Chemin** : `packages/shared-types/src/modules/module-definition.interface.ts`

```typescript
/**
 * Catégories de modules
 */
export enum ModuleCategory {
  MODERATION = 'moderation',
  ENGAGEMENT = 'engagement',
  UTILITY = 'utility',
  ANALYTICS = 'analytics',
  ECONOMY = 'economy',
}

/**
 * Plans d'abonnement
 */
export enum SubscriptionPlan {
  FREE = 'free',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

/**
 * Limites d'un module selon le plan
 * -1 = illimité
 */
export interface ModuleLimits {
  [resource: string]: number;
}

/**
 * Disponibilité d'un module par plan
 */
export interface ModuleAvailability {
  free: boolean;
  premium: boolean;
  enterprise: boolean;
}

/**
 * Runtime du module
 */
export interface ModuleRuntime {
  backend: boolean;  // Tourne côté backend (config, API)
  bot: boolean;      // Tourne côté bot (listeners, commands)
}

/**
 * Définition complète d'un module
 */
export interface ModuleDefinition {
  // Identification
  id: string;                          // 'automod', 'tickets'...
  name: string;                        // 'Auto-Moderation'
  description: string;                 // Description courte
  icon?: string;                       // Icône (emoji ou class)
  category: ModuleCategory;
  
  // Disponibilité & Limitations
  availability: ModuleAvailability;
  limits?: {
    free?: ModuleLimits;
    premium?: ModuleLimits;
    enterprise?: ModuleLimits;
  };
  
  // Dépendances (si nécessaire)
  dependencies?: string[];             // IDs des modules requis
  
  // Runtime
  runtime: ModuleRuntime;
  
  // Metadata
  version: string;                     // '1.0.0'
  author?: string;
  documentation?: string;              // URL vers docs
}
```

**✅ Checklist 1.1**
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Commit : `feat(types): Add module system core interfaces`

---

### 📦 Fichier 1.2 : `module-config.interface.ts`

**Chemin** : `packages/shared-types/src/modules/module-config.interface.ts`

```typescript
/**
 * Status d'un module pour une guild
 */
export enum ModuleStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error',
  CONFIGURING = 'configuring',
}

/**
 * Configuration d'un module sur un serveur
 */
export interface GuildModuleConfig {
  guildId: string;
  moduleId: string;
  enabled: boolean;
  status: ModuleStatus;
  enabledAt?: Date;
  disabledAt?: Date;
  config?: Record<string, any>;  // Config spécifique au module
  error?: string;
}

/**
 * Événement de changement de module (Backend → Bot)
 */
export interface ModuleChangeEvent {
  guildId: string;
  moduleId: string;
  action: 'enabled' | 'disabled' | 'config_updated';
  config?: Record<string, any>;
  timestamp: Date;
}

/**
 * Requête pour vérifier une limite
 */
export interface CheckLimitRequest {
  guildId: string;
  moduleId: string;
  resource: string;  // 'rules', 'channels', 'actions'...
  currentCount: number;
}

/**
 * Réponse de vérification de limite
 */
export interface CheckLimitResponse {
  allowed: boolean;
  limit: number;       // -1 si illimité
  current: number;
  plan: string;
  upgradeRequired?: boolean;
}
```

**✅ Checklist 1.2**
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Commit : `feat(types): Add module config interfaces`

---

### 📦 Fichier 1.3 : `module.dto.ts`

**Chemin** : `packages/shared-types/src/modules/module.dto.ts`

```typescript
import { IsString, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { ModuleCategory, SubscriptionPlan } from './module-definition.interface';

/**
 * DTO pour activer un module
 */
export class EnableModuleDto {
  @IsString()
  guildId: string;

  @IsString()
  moduleId: string;

  @IsOptional()
  config?: Record<string, any>;
}

/**
 * DTO pour désactiver un module
 */
export class DisableModuleDto {
  @IsString()
  guildId: string;

  @IsString()
  moduleId: string;
}

/**
 * DTO pour lister les modules disponibles
 */
export class ListModulesDto {
  @IsOptional()
  @IsEnum(ModuleCategory)
  category?: ModuleCategory;

  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @IsOptional()
  @IsBoolean()
  enabledOnly?: boolean;
}

/**
 * DTO de réponse : Module avec status
 */
export class ModuleResponseDto {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: ModuleCategory;
  enabled: boolean;
  available: boolean;      // Dispo pour le plan actuel
  requiresUpgrade: boolean;
  limits?: Record<string, number>;
  currentUsage?: Record<string, number>;
}
```

**✅ Checklist 1.3**
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Commit : `feat(types): Add module DTOs`

---

### 📦 Fichier 1.4 : `index.ts` (Export)

**Chemin** : `packages/shared-types/src/modules/index.ts`

```typescript
// Interfaces
export * from './module-definition.interface';
export * from './module-config.interface';

// DTOs
export * from './module.dto';
```

**✅ Checklist 1.4**
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Ajouter l'export dans `packages/shared-types/src/index.ts`
- [ ] Build : `npm run build --workspace=packages/shared-types`
- [ ] Commit : `feat(types): Export module system types`

---

### ✅ Validation Phase 1

```bash
# Depuis packages/shared-types/
npm run build

# Vérifier qu'il n'y a pas d'erreurs TypeScript
```

**✅ Phase 1 Complète**
- [ ] Tous les fichiers créés
- [ ] Build réussi
- [ ] Types exportés correctement
- [ ] Commit final : `feat(types): Complete module system types`

---

## ✅ PHASE 2 : BACKEND - MODULE REGISTRY (4-5h)

**Objectif** : Créer le cerveau du système de modules côté backend.

### 📦 Fichier 2.1 : Prisma Schema Update

**Chemin** : `apps/backend/prisma/schema.prisma`

**Ajouter à la fin du fichier** :

```prisma
// ============================================
// MODULE SYSTEM
// ============================================

model GuildModule {
  id         String   @id @default(cuid())
  guildId    String   @map("guild_id")
  moduleId   String   @map("module_id")
  enabled    Boolean  @default(false)
  enabledAt  DateTime? @map("enabled_at")
  disabledAt DateTime? @map("disabled_at")
  config     Json?    // Config spécifique JSON
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  // Relations
  guild Guild @relation(fields: [guildId], references: [guildId], onDelete: Cascade)

  @@unique([guildId, moduleId])
  @@index([guildId])
  @@index([enabled])
  @@map("guild_modules")
}
```

**Mettre à jour le model Guild** :

```prisma
model Guild {
  // ... existing fields
  
  // Ajouter cette relation
  modules GuildModule[]
}
```

**✅ Checklist 2.1**
- [ ] Modifier `schema.prisma`
- [ ] Créer migration : `npx prisma migrate dev --name add_module_system`
- [ ] Générer client : `npx prisma generate`
- [ ] Commit : `feat(db): Add module system schema`

---

### 📦 Fichier 2.2 : Module Registry Service

**Chemin** : `apps/backend/src/modules/module-system/registry/module.registry.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import {
  ModuleDefinition,
  SubscriptionPlan,
  ModuleLimits,
} from '@my-project/shared-types';

/**
 * 🧠 Module Registry - Cerveau du système de modules
 * 
 * Responsabilités :
 * - Enregistrer tous les modules disponibles
 * - Vérifier disponibilité selon le plan
 * - Checker les limites d'utilisation
 * - Fournir la liste des modules
 */
@Injectable()
export class ModuleRegistry {
  private readonly logger = new Logger(ModuleRegistry.name);
  private readonly modules: Map<string, ModuleDefinition> = new Map();

  /**
   * Enregistre un nouveau module dans le registry
   */
  register(module: ModuleDefinition): void {
    if (this.modules.has(module.id)) {
      this.logger.warn(
        `Module "${module.id}" already registered. Overwriting.`,
      );
    }

    this.modules.set(module.id, module);
    this.logger.log(`✅ Module registered: ${module.id} (${module.name})`);
  }

  /**
   * Récupère la définition d'un module
   */
  getModule(moduleId: string): ModuleDefinition | undefined {
    return this.modules.get(moduleId);
  }

  /**
   * Récupère tous les modules
   */
  getAllModules(): ModuleDefinition[] {
    return Array.from(this.modules.values());
  }

  /**
   * Récupère les modules disponibles pour un plan
   */
  getAvailableModules(plan: SubscriptionPlan): ModuleDefinition[] {
    return this.getAllModules().filter((module) => {
      return module.availability[plan] === true;
    });
  }

  /**
   * Vérifie si un module est disponible pour un plan
   */
  isModuleAvailable(moduleId: string, plan: SubscriptionPlan): boolean {
    const module = this.getModule(moduleId);
    if (!module) return false;

    return module.availability[plan] === true;
  }

  /**
   * Récupère les limites d'un module pour un plan
   */
  getModuleLimits(
    moduleId: string,
    plan: SubscriptionPlan,
  ): ModuleLimits | undefined {
    const module = this.getModule(moduleId);
    if (!module || !module.limits) return undefined;

    return module.limits[plan];
  }

  /**
   * Vérifie si une ressource dépasse la limite
   * 
   * @returns true si dans la limite, false si dépassé
   */
  checkLimit(
    moduleId: string,
    plan: SubscriptionPlan,
    resource: string,
    currentCount: number,
  ): boolean {
    const limits = this.getModuleLimits(moduleId, plan);
    if (!limits) return true; // Pas de limites = autorisé

    const limit = limits[resource];
    if (limit === undefined) return true; // Ressource non limitée
    if (limit === -1) return true; // Illimité

    return currentCount < limit;
  }

  /**
   * Récupère la valeur d'une limite
   * 
   * @returns La limite (-1 si illimité, undefined si pas de limite)
   */
  getLimitValue(
    moduleId: string,
    plan: SubscriptionPlan,
    resource: string,
  ): number | undefined {
    const limits = this.getModuleLimits(moduleId, plan);
    if (!limits) return undefined;

    return limits[resource];
  }

  /**
   * Vérifie les dépendances d'un module
   * 
   * @returns Array des modules dépendants manquants
   */
  checkDependencies(
    moduleId: string,
    enabledModules: string[],
  ): string[] {
    const module = this.getModule(moduleId);
    if (!module || !module.dependencies) return [];

    return module.dependencies.filter(
      (depId) => !enabledModules.includes(depId),
    );
  }
}
```

**✅ Checklist 2.2**
- [ ] Créer le dossier : `mkdir -p apps/backend/src/modules/module-system/registry`
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Commit : `feat(backend): Add module registry service`

---

### 📦 Fichier 2.3 : Module Manager Service

**Chemin** : `apps/backend/src/modules/module-system/services/module-manager.service.ts`

```typescript
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModuleRegistry } from '../registry/module.registry';
import {
  GuildModuleConfig,
  ModuleChangeEvent,
  CheckLimitRequest,
  CheckLimitResponse,
  SubscriptionPlan,
} from '@my-project/shared-types';

/**
 * 🎛️ Module Manager Service
 * 
 * Responsabilités :
 * - Enable/Disable modules pour un serveur
 * - CRUD sur guild_modules
 * - Vérifier limites avant actions
 * - Notifier le Bot des changements
 */
@Injectable()
export class ModuleManagerService {
  private readonly logger = new Logger(ModuleManagerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleRegistry: ModuleRegistry,
  ) {}

  /**
   * Active un module pour un serveur
   */
  async enableModule(
    guildId: string,
    moduleId: string,
    plan: SubscriptionPlan,
    config?: Record<string, any>,
  ): Promise<GuildModuleConfig> {
    // 1. Vérifier que le module existe
    const moduleDef = this.moduleRegistry.getModule(moduleId);
    if (!moduleDef) {
      throw new NotFoundException(`Module "${moduleId}" not found`);
    }

    // 2. Vérifier disponibilité pour le plan
    if (!this.moduleRegistry.isModuleAvailable(moduleId, plan)) {
      throw new ForbiddenException(
        `Module "${moduleId}" not available for ${plan} plan`,
      );
    }

    // 3. Vérifier dépendances
    const enabledModules = await this.getEnabledModuleIds(guildId);
    const missingDeps = this.moduleRegistry.checkDependencies(
      moduleId,
      enabledModules,
    );
    if (missingDeps.length > 0) {
      throw new BadRequestException(
        `Missing required modules: ${missingDeps.join(', ')}`,
      );
    }

    // 4. Enable dans la DB
    const guildModule = await this.prisma.guildModule.upsert({
      where: {
        guildId_moduleId: { guildId, moduleId },
      },
      create: {
        guildId,
        moduleId,
        enabled: true,
        enabledAt: new Date(),
        config: config || {},
      },
      update: {
        enabled: true,
        enabledAt: new Date(),
        disabledAt: null,
        config: config || {},
      },
    });

    this.logger.log(
      `✅ Module "${moduleId}" enabled for guild ${guildId}`,
    );

    // 5. TODO: Notifier le Bot via Gateway
    // await this.notifyBot({ ... });

    return this.mapToGuildModuleConfig(guildModule);
  }

  /**
   * Désactive un module pour un serveur
   */
  async disableModule(
    guildId: string,
    moduleId: string,
  ): Promise<GuildModuleConfig> {
    const guildModule = await this.prisma.guildModule.update({
      where: {
        guildId_moduleId: { guildId, moduleId },
      },
      data: {
        enabled: false,
        disabledAt: new Date(),
      },
    });

    this.logger.log(
      `❌ Module "${moduleId}" disabled for guild ${guildId}`,
    );

    // TODO: Notifier le Bot
    // await this.notifyBot({ ... });

    return this.mapToGuildModuleConfig(guildModule);
  }

  /**
   * Vérifie si un module est activé pour un serveur
   */
  async isModuleEnabled(
    guildId: string,
    moduleId: string,
  ): Promise<boolean> {
    const guildModule = await this.prisma.guildModule.findUnique({
      where: {
        guildId_moduleId: { guildId, moduleId },
      },
    });

    return guildModule?.enabled || false;
  }

  /**
   * Récupère tous les modules d'un serveur
   */
  async getGuildModules(guildId: string): Promise<GuildModuleConfig[]> {
    const guildModules = await this.prisma.guildModule.findMany({
      where: { guildId },
    });

    return guildModules.map(this.mapToGuildModuleConfig);
  }

  /**
   * Récupère les IDs des modules actifs
   */
  async getEnabledModuleIds(guildId: string): Promise<string[]> {
    const guildModules = await this.prisma.guildModule.findMany({
      where: { guildId, enabled: true },
      select: { moduleId: true },
    });

    return guildModules.map((gm) => gm.moduleId);
  }

  /**
   * Vérifie une limite pour un module
   */
  async checkLimit(
    request: CheckLimitRequest,
    plan: SubscriptionPlan,
  ): Promise<CheckLimitResponse> {
    const { guildId, moduleId, resource, currentCount } = request;

    // Vérifier si module activé
    const isEnabled = await this.isModuleEnabled(guildId, moduleId);
    if (!isEnabled) {
      return {
        allowed: false,
        limit: 0,
        current: currentCount,
        plan,
        upgradeRequired: false,
      };
    }

    // Récupérer limite
    const limitValue = this.moduleRegistry.getLimitValue(
      moduleId,
      plan,
      resource,
    );

    // Pas de limite définie = autorisé
    if (limitValue === undefined) {
      return {
        allowed: true,
        limit: -1,
        current: currentCount,
        plan,
      };
    }

    // Illimité
    if (limitValue === -1) {
      return {
        allowed: true,
        limit: -1,
        current: currentCount,
        plan,
      };
    }

    // Vérifier limite
    const allowed = currentCount < limitValue;

    return {
      allowed,
      limit: limitValue,
      current: currentCount,
      plan,
      upgradeRequired: !allowed && plan !== SubscriptionPlan.ENTERPRISE,
    };
  }

  /**
   * Met à jour la config d'un module
   */
  async updateModuleConfig(
    guildId: string,
    moduleId: string,
    config: Record<string, any>,
  ): Promise<GuildModuleConfig> {
    const guildModule = await this.prisma.guildModule.update({
      where: {
        guildId_moduleId: { guildId, moduleId },
      },
      data: {
        config,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `🔧 Module "${moduleId}" config updated for guild ${guildId}`,
    );

    // TODO: Notifier le Bot
    // await this.notifyBot({ ... });

    return this.mapToGuildModuleConfig(guildModule);
  }

  /**
   * Map Prisma model vers DTO
   */
  private mapToGuildModuleConfig(guildModule: any): GuildModuleConfig {
    return {
      guildId: guildModule.guildId,
      moduleId: guildModule.moduleId,
      enabled: guildModule.enabled,
      status: guildModule.enabled ? 'enabled' : 'disabled',
      enabledAt: guildModule.enabledAt,
      disabledAt: guildModule.disabledAt,
      config: guildModule.config as Record<string, any>,
    };
  }

  /**
   * TODO: Notifier le Bot via Gateway
   */
  private async notifyBot(event: ModuleChangeEvent): Promise<void> {
    // À implémenter avec le service Gateway
    this.logger.debug('TODO: Notify bot', event);
  }
}
```

**✅ Checklist 2.3**
- [ ] Créer le dossier : `mkdir -p apps/backend/src/modules/module-system/services`
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Commit : `feat(backend): Add module manager service`

---

### 📦 Fichier 2.4 : Module System Module (NestJS)

**Chemin** : `apps/backend/src/modules/module-system/module-system.module.ts`

```typescript
import { Module, OnModuleInit } from '@nestjs/common';
import { ModuleRegistry } from './registry/module.registry';
import { ModuleManagerService } from './services/module-manager.service';
import { ModuleSystemController } from './controllers/module-system.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * 🧩 Module System Module
 * 
 * Module central du système de modules.
 * S'occupe de l'enregistrement et de la gestion des modules.
 */
@Module({
  imports: [PrismaModule],
  providers: [ModuleRegistry, ModuleManagerService],
  controllers: [ModuleSystemController],
  exports: [ModuleRegistry, ModuleManagerService],
})
export class ModuleSystemModule implements OnModuleInit {
  constructor(private readonly moduleRegistry: ModuleRegistry) {}

  /**
   * Enregistre les modules au démarrage
   */
  onModuleInit() {
    // TODO: Importer et enregistrer tous les modules ici
    // Sera fait en Phase 3
    console.log('📦 Module System initialized');
  }
}
```

**✅ Checklist 2.4**
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Ajouter dans `app.module.ts` :
  ```typescript
  imports: [
    // ... existing
    ModuleSystemModule,
  ]
  ```
- [ ] Commit : `feat(backend): Add module system module`

---

### 📦 Fichier 2.5 : Module System Controller

**Chemin** : `apps/backend/src/modules/module-system/controllers/module-system.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ModuleRegistry } from '../registry/module.registry';
import { ModuleManagerService } from '../services/module-manager.service';
import {
  EnableModuleDto,
  DisableModuleDto,
  CheckLimitRequest,
  SubscriptionPlan,
} from '@my-project/shared-types';
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
// import { GuildAdminGuard } from '../../auth/guards/guild-admin.guard';

/**
 * 🎛️ Module System Controller
 * 
 * Endpoints pour gérer les modules
 */
@Controller('modules')
// @UseGuards(JwtAuthGuard, GuildAdminGuard) // À activer quand auth prêt
export class ModuleSystemController {
  constructor(
    private readonly moduleRegistry: ModuleRegistry,
    private readonly moduleManager: ModuleManagerService,
  ) {}

  /**
   * GET /modules
   * Liste tous les modules disponibles
   */
  @Get()
  async getAllModules() {
    return this.moduleRegistry.getAllModules();
  }

  /**
   * GET /modules/available/:plan
   * Liste les modules disponibles pour un plan
   */
  @Get('available/:plan')
  async getAvailableModules(@Param('plan') plan: SubscriptionPlan) {
    return this.moduleRegistry.getAvailableModules(plan);
  }

  /**
   * GET /modules/:guildId
   * Liste les modules d'un serveur
   */
  @Get(':guildId')
  async getGuildModules(@Param('guildId') guildId: string) {
    return this.moduleManager.getGuildModules(guildId);
  }

  /**
   * POST /modules/:guildId/enable
   * Active un module
   */
  @Post(':guildId/enable')
  async enableModule(
    @Param('guildId') guildId: string,
    @Body() dto: EnableModuleDto,
  ) {
    // TODO: Récupérer le plan depuis la DB (guild.subscription)
    const plan = SubscriptionPlan.FREE;

    return this.moduleManager.enableModule(
      guildId,
      dto.moduleId,
      plan,
      dto.config,
    );
  }

  /**
   * DELETE /modules/:guildId/disable
   * Désactive un module
   */
  @Delete(':guildId/disable')
  @HttpCode(HttpStatus.OK)
  async disableModule(
    @Param('guildId') guildId: string,
    @Body() dto: DisableModuleDto,
  ) {
    return this.moduleManager.disableModule(guildId, dto.moduleId);
  }

  /**
   * POST /modules/:guildId/check-limit
   * Vérifie une limite
   */
  @Post(':guildId/check-limit')
  async checkLimit(
    @Param('guildId') guildId: string,
    @Body() request: CheckLimitRequest,
  ) {
    // TODO: Récupérer le plan depuis la DB
    const plan = SubscriptionPlan.FREE;

    return this.moduleManager.checkLimit(request, plan);
  }
}
```

**✅ Checklist 2.5**
- [ ] Créer le dossier : `mkdir -p apps/backend/src/modules/module-system/controllers`
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Commit : `feat(backend): Add module system controller`

---

### ✅ Validation Phase 2

```bash
# Depuis apps/backend/
npm run start:dev

# Tester les endpoints
curl http://localhost:3000/modules
curl http://localhost:3000/modules/available/free
```

**✅ Phase 2 Complète**
- [ ] Migration Prisma appliquée
- [ ] Registry fonctionnel
- [ ] Manager fonctionnel
- [ ] Controller répond
- [ ] Commit final : `feat(backend): Complete module system core`

---

## ✅ PHASE 3 : EXEMPLE MODULE - AUTOMOD (3-4h)

**Objectif** : Créer le premier module réel pour valider l'architecture.

### 📦 Fichier 3.1 : Automod Module Definition

**Chemin** : `apps/backend/src/modules/automod/automod.definition.ts`

```typescript
import {
  ModuleDefinition,
  ModuleCategory,
} from '@my-project/shared-types';

/**
 * 🛡️ Automod Module Definition
 * 
 * Module de modération automatique
 */
export const AUTOMOD_MODULE: ModuleDefinition = {
  id: 'automod',
  name: 'Auto-Moderation',
  description: 'Automated content filtering and spam protection',
  icon: '🛡️',
  category: ModuleCategory.MODERATION,

  availability: {
    free: true,
    premium: true,
    enterprise: true,
  },

  limits: {
    free: {
      rules: 3,              // Max 3 règles
      actionsPerDay: 100,    // Max 100 actions/jour
    },
    premium: {
      rules: 50,
      actionsPerDay: 10000,
    },
    enterprise: {
      rules: -1,             // Illimité
      actionsPerDay: -1,
    },
  },

  runtime: {
    backend: true,  // Configuration UI
    bot: true,      // Exécution en temps réel
  },

  version: '1.0.0',
  author: 'Discord Admin App',
};
```

**✅ Checklist 3.1**
- [ ] Créer le dossier : `mkdir -p apps/backend/src/modules/automod`
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Commit : `feat(automod): Add automod module definition`

---

### 📦 Fichier 3.2 : Automod Prisma Schema

**Chemin** : `apps/backend/prisma/schema.prisma`

**Ajouter à la fin** :

```prisma
// ============================================
// AUTOMOD MODULE
// ============================================

enum AutomodRuleType {
  SPAM
  LINKS
  CAPS
  MENTIONS
  ZALGO
  INVITES
  CUSTOM
}

enum AutomodAction {
  DELETE
  WARN
  TIMEOUT
  KICK
  BAN
}

model AutomodRule {
  id        String          @id @default(cuid())
  guildId   String          @map("guild_id")
  name      String
  ruleType  AutomodRuleType @map("rule_type")
  enabled   Boolean         @default(true)
  
  // Configuration JSON
  config    Json            // Trigger conditions
  actions   Json            // Actions à prendre
  
  // Metadata
  createdBy String          @map("created_by") // Discord user ID
  createdAt DateTime        @default(now()) @map("created_at")
  updatedAt DateTime        @updatedAt @map("updated_at")

  // Relations
  guild Guild @relation(fields: [guildId], references: [guildId], onDelete: Cascade)

  @@index([guildId])
  @@index([enabled])
  @@map("automod_rules")
}

// Stats d'actions automod
model AutomodAction {
  id         String   @id @default(cuid())
  guildId    String   @map("guild_id")
  ruleId     String   @map("rule_id")
  userId     String   @map("user_id")
  action     String   // 'delete', 'warn', 'timeout'...
  reason     String?
  occurredAt DateTime @default(now()) @map("occurred_at")

  @@index([guildId, occurredAt])
  @@index([ruleId])
  @@map("automod_actions")
}
```

**Mettre à jour Model Guild** :

```prisma
model Guild {
  // ... existing fields
  
  automodRules AutomodRule[]
}
```

**Exécuter migration** :

```bash
npx prisma migrate dev --name add_automod_module
npx prisma generate
```

**✅ Checklist 3.2**
- [ ] Modifier `schema.prisma`
- [ ] Créer migration
- [ ] Générer client
- [ ] Commit : `feat(automod): Add automod database schema`

---

### 📦 Fichier 3.3 : Automod Service

**Chemin** : `apps/backend/src/modules/automod/automod.service.ts`

```typescript
import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModuleManagerService } from '../module-system/services/module-manager.service';
import { SubscriptionPlan } from '@my-project/shared-types';

/**
 * 🛡️ Automod Service
 * 
 * Gère les règles d'automodération
 */
@Injectable()
export class AutomodService {
  private readonly logger = new Logger(AutomodService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleManager: ModuleManagerService,
  ) {}

  /**
   * Crée une nouvelle règle automod
   */
  async createRule(
    guildId: string,
    createdBy: string,
    data: {
      name: string;
      ruleType: string;
      config: any;
      actions: any;
    },
  ): Promise<any> {
    // 1. Vérifier que le module est activé
    const isEnabled = await this.moduleManager.isModuleEnabled(
      guildId,
      'automod',
    );

    if (!isEnabled) {
      throw new ForbiddenException('Automod module is not enabled');
    }

    // 2. Compter les règles actuelles
    const currentCount = await this.prisma.automodRule.count({
      where: { guildId },
    });

    // 3. Vérifier limite
    // TODO: Récupérer plan réel depuis DB
    const plan = SubscriptionPlan.FREE;

    const limitCheck = await this.moduleManager.checkLimit(
      {
        guildId,
        moduleId: 'automod',
        resource: 'rules',
        currentCount: currentCount + 1,
      },
      plan,
    );

    if (!limitCheck.allowed) {
      throw new ForbiddenException(
        `Rule limit reached (${limitCheck.limit}). Upgrade to premium for more rules.`,
      );
    }

    // 4. Créer la règle
    const rule = await this.prisma.automodRule.create({
      data: {
        guildId,
        name: data.name,
        ruleType: data.ruleType as any,
        config: data.config,
        actions: data.actions,
        createdBy,
      },
    });

    this.logger.log(
      `✅ Automod rule created: ${rule.name} (${guildId})`,
    );

    // 5. TODO: Notifier le Bot via Gateway
    // await this.notifyBot('rule.created', rule);

    return rule;
  }

  /**
   * Liste les règles d'un serveur
   */
  async getRules(guildId: string) {
    return this.prisma.automodRule.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Met à jour une règle
   */
  async updateRule(
    ruleId: string,
    guildId: string,
    data: Partial<{
      name: string;
      enabled: boolean;
      config: any;
      actions: any;
    }>,
  ) {
    const rule = await this.prisma.automodRule.findFirst({
      where: { id: ruleId, guildId },
    });

    if (!rule) {
      throw new NotFoundException('Rule not found');
    }

    const updated = await this.prisma.automodRule.update({
      where: { id: ruleId },
      data,
    });

    this.logger.log(`🔧 Automod rule updated: ${updated.name}`);

    // TODO: Notifier Bot
    return updated;
  }

  /**
   * Supprime une règle
   */
  async deleteRule(ruleId: string, guildId: string) {
    const rule = await this.prisma.automodRule.findFirst({
      where: { id: ruleId, guildId },
    });

    if (!rule) {
      throw new NotFoundException('Rule not found');
    }

    await this.prisma.automodRule.delete({
      where: { id: ruleId },
    });

    this.logger.log(`❌ Automod rule deleted: ${rule.name}`);

    // TODO: Notifier Bot
    return { success: true };
  }

  /**
   * Enregistre une action automod (stats)
   */
  async logAction(
    guildId: string,
    ruleId: string,
    userId: string,
    action: string,
    reason?: string,
  ) {
    return this.prisma.automodAction.create({
      data: {
        guildId,
        ruleId,
        userId,
        action,
        reason,
      },
    });
  }

  /**
   * Récupère les stats d'actions
   */
  async getActionStats(guildId: string, days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.prisma.automodAction.groupBy({
      by: ['action'],
      where: {
        guildId,
        occurredAt: { gte: since },
      },
      _count: true,
    });
  }
}
```

**✅ Checklist 3.3**
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Commit : `feat(automod): Add automod service`

---

### 📦 Fichier 3.4 : Automod Controller

**Chemin** : `apps/backend/src/modules/automod/automod.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AutomodService } from './automod.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { GuildAdminGuard } from '../auth/guards/guild-admin.guard';

/**
 * 🛡️ Automod Controller
 */
@Controller('automod')
// @UseGuards(JwtAuthGuard, GuildAdminGuard)
export class AutomodController {
  constructor(private readonly automodService: AutomodService) {}

  /**
   * GET /automod/:guildId/rules
   */
  @Get(':guildId/rules')
  async getRules(@Param('guildId') guildId: string) {
    return this.automodService.getRules(guildId);
  }

  /**
   * POST /automod/:guildId/rules
   */
  @Post(':guildId/rules')
  async createRule(
    @Param('guildId') guildId: string,
    @Body() body: {
      name: string;
      ruleType: string;
      config: any;
      actions: any;
    },
  ) {
    // TODO: Récupérer userId depuis JWT
    const createdBy = 'user-id-from-jwt';

    return this.automodService.createRule(guildId, createdBy, body);
  }

  /**
   * PUT /automod/:guildId/rules/:ruleId
   */
  @Put(':guildId/rules/:ruleId')
  async updateRule(
    @Param('guildId') guildId: string,
    @Param('ruleId') ruleId: string,
    @Body() body: any,
  ) {
    return this.automodService.updateRule(ruleId, guildId, body);
  }

  /**
   * DELETE /automod/:guildId/rules/:ruleId
   */
  @Delete(':guildId/rules/:ruleId')
  async deleteRule(
    @Param('guildId') guildId: string,
    @Param('ruleId') ruleId: string,
  ) {
    return this.automodService.deleteRule(ruleId, guildId);
  }

  /**
   * GET /automod/:guildId/stats
   */
  @Get(':guildId/stats')
  async getStats(@Param('guildId') guildId: string) {
    return this.automodService.getActionStats(guildId, 7);
  }
}
```

**✅ Checklist 3.4**
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Commit : `feat(automod): Add automod controller`

---

### 📦 Fichier 3.5 : Automod Module (NestJS)

**Chemin** : `apps/backend/src/modules/automod/automod.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AutomodService } from './automod.service';
import { AutomodController } from './automod.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ModuleSystemModule } from '../module-system/module-system.module';

@Module({
  imports: [PrismaModule, ModuleSystemModule],
  providers: [AutomodService],
  controllers: [AutomodController],
  exports: [AutomodService],
})
export class AutomodModule {}
```

**✅ Checklist 3.5**
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Ajouter dans `app.module.ts` :
  ```typescript
  imports: [
    // ... existing
    AutomodModule,
  ]
  ```
- [ ] Commit : `feat(automod): Add automod module`

---

### 📦 Fichier 3.6 : Register Automod in Registry

**Modifier** : `apps/backend/src/modules/module-system/module-system.module.ts`

```typescript
import { Module, OnModuleInit } from '@nestjs/common';
import { ModuleRegistry } from './registry/module.registry';
import { ModuleManagerService } from './services/module-manager.service';
import { ModuleSystemController } from './controllers/module-system.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AUTOMOD_MODULE } from '../automod/automod.definition'; // ← AJOUTER

@Module({
  imports: [PrismaModule],
  providers: [ModuleRegistry, ModuleManagerService],
  controllers: [ModuleSystemController],
  exports: [ModuleRegistry, ModuleManagerService],
})
export class ModuleSystemModule implements OnModuleInit {
  constructor(private readonly moduleRegistry: ModuleRegistry) {}

  onModuleInit() {
    // ✅ Enregistrer le module Automod
    this.moduleRegistry.register(AUTOMOD_MODULE);
    
    console.log('📦 Module System initialized');
    console.log(`✅ ${this.moduleRegistry.getAllModules().length} modules registered`);
  }
}
```

**✅ Checklist 3.6**
- [ ] Modifier le fichier
- [ ] Tester : `npm run start:dev`
- [ ] Vérifier logs : "✅ Module registered: automod"
- [ ] Commit : `feat(automod): Register automod in module registry`

---

### ✅ Validation Phase 3

```bash
# Backend running
npm run start:dev

# Tester
curl http://localhost:3000/modules
# Devrait voir le module automod

# Activer automod sur un serveur (remplacer GUILD_ID)
curl -X POST http://localhost:3000/modules/GUILD_ID/enable \
  -H "Content-Type: application/json" \
  -d '{"moduleId": "automod"}'

# Créer une règle (devrait réussir, c'est la 1ère)
curl -X POST http://localhost:3000/automod/GUILD_ID/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Anti-Spam",
    "ruleType": "SPAM",
    "config": {"threshold": 5},
    "actions": [{"type": "DELETE"}]
  }'

# Créer 2 autres règles... puis la 4ème devrait être bloquée (limite = 3 en free)
```

**✅ Phase 3 Complète**
- [ ] Module automod fonctionnel
- [ ] Limites respectées
- [ ] CRUD complet
- [ ] Commit final : `feat(automod): Complete automod module implementation`

---

## ✅ PHASE 4 : BOT INTEGRATION (4-5h)

**Objectif** : Permettre au Bot de charger les modules actifs et réagir en temps réel.

### 📦 Fichier 4.1 : Bot Module Interface

**Chemin** : `apps/bot/src/modules/module-loader/bot-module.interface.ts`

```typescript
/**
 * Interface que chaque module Bot doit implémenter
 */
export interface BotModule {
  /**
   * ID unique du module (doit correspondre au backend)
   */
  id: string;

  /**
   * Appelé quand le module est activé pour un serveur
   */
  onEnable(guildId: string, config?: Record<string, any>): Promise<void>;

  /**
   * Appelé quand le module est désactivé pour un serveur
   */
  onDisable(guildId: string): Promise<void>;

  /**
   * Appelé quand la config du module est mise à jour
   */
  onConfigUpdate(guildId: string, config: Record<string, any>): Promise<void>;
}
```

**✅ Checklist 4.1**
- [ ] Créer le dossier : `mkdir -p apps/bot/src/modules/module-loader`
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Commit : `feat(bot): Add bot module interface`

---

### 📦 Fichier 4.2 : Module Loader Service

**Chemin** : `apps/bot/src/modules/module-loader/module-loader.service.ts`

```typescript
import { container } from '@sapphire/framework';
import { BotModule } from './bot-module.interface';

/**
 * 🔌 Module Loader
 * 
 * Charge et gère les modules du bot
 */
export class ModuleLoaderService {
  private modules: Map<string, BotModule> = new Map();
  private enabledModules: Map<string, Set<string>> = new Map(); // guildId → Set<moduleId>

  /**
   * Enregistre un module
   */
  register(module: BotModule): void {
    if (this.modules.has(module.id)) {
      console.warn(`[ModuleLoader] Module "${module.id}" already registered`);
      return;
    }

    this.modules.set(module.id, module);
    console.log(`[ModuleLoader] ✅ Registered module: ${module.id}`);
  }

  /**
   * Active un module pour un serveur
   */
  async enableModule(
    guildId: string,
    moduleId: string,
    config?: Record<string, any>,
  ): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) {
      console.error(`[ModuleLoader] Module "${moduleId}" not found`);
      return;
    }

    // Ajouter à la map
    if (!this.enabledModules.has(guildId)) {
      this.enabledModules.set(guildId, new Set());
    }
    this.enabledModules.get(guildId)!.add(moduleId);

    // Appeler onEnable
    await module.onEnable(guildId, config);
    console.log(`[ModuleLoader] ✅ Enabled module "${moduleId}" for guild ${guildId}`);
  }

  /**
   * Désactive un module pour un serveur
   */
  async disableModule(guildId: string, moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) {
      console.error(`[ModuleLoader] Module "${moduleId}" not found`);
      return;
    }

    // Retirer de la map
    this.enabledModules.get(guildId)?.delete(moduleId);

    // Appeler onDisable
    await module.onDisable(guildId);
    console.log(`[ModuleLoader] ❌ Disabled module "${moduleId}" for guild ${guildId}`);
  }

  /**
   * Met à jour la config d'un module
   */
  async updateModuleConfig(
    guildId: string,
    moduleId: string,
    config: Record<string, any>,
  ): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) {
      console.error(`[ModuleLoader] Module "${moduleId}" not found`);
      return;
    }

    await module.onConfigUpdate(guildId, config);
    console.log(`[ModuleLoader] 🔧 Updated config for "${moduleId}" in guild ${guildId}`);
  }

  /**
   * Vérifie si un module est activé pour un serveur
   */
  isModuleEnabled(guildId: string, moduleId: string): boolean {
    return this.enabledModules.get(guildId)?.has(moduleId) || false;
  }

  /**
   * Récupère tous les modules actifs d'un serveur
   */
  getEnabledModules(guildId: string): string[] {
    return Array.from(this.enabledModules.get(guildId) || []);
  }

  /**
   * Charge tous les modules actifs au démarrage
   */
  async loadActiveModulesForGuild(
    guildId: string,
    activeModules: Array<{ moduleId: string; config?: any }>,
  ): Promise<void> {
    console.log(`[ModuleLoader] Loading ${activeModules.length} modules for guild ${guildId}`);

    for (const { moduleId, config } of activeModules) {
      await this.enableModule(guildId, moduleId, config);
    }
  }
}

// Export singleton
export const moduleLoader = new ModuleLoaderService();
```

**✅ Checklist 4.2**
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Commit : `feat(bot): Add module loader service`

---

### 📦 Fichier 4.3 : Automod Bot Module

**Chemin** : `apps/bot/src/modules/automod/automod.module.ts`

```typescript
import { BotModule } from '../module-loader/bot-module.interface';
import { Events, Message } from 'discord.js';
import { container } from '@sapphire/framework';

/**
 * 🛡️ Automod Bot Module
 */
export class AutomodBotModule implements BotModule {
  id = 'automod';
  private rules: Map<string, any[]> = new Map(); // guildId → rules[]

  async onEnable(guildId: string, config?: Record<string, any>): Promise<void> {
    console.log(`[Automod] Enabling for guild ${guildId}`);

    // Fetch rules depuis backend
    await this.loadRules(guildId);

    // TODO: Activer listeners (déjà dans Sapphire)
  }

  async onDisable(guildId: string): Promise<void> {
    console.log(`[Automod] Disabling for guild ${guildId}`);
    this.rules.delete(guildId);
  }

  async onConfigUpdate(guildId: string, config: Record<string, any>): Promise<void> {
    console.log(`[Automod] Config updated for guild ${guildId}`);
    await this.loadRules(guildId);
  }

  /**
   * Charge les règles depuis le backend
   */
  private async loadRules(guildId: string): Promise<void> {
    try {
      // TODO: Fetch depuis backend API
      // const response = await fetch(`${BACKEND_URL}/automod/${guildId}/rules`);
      // const rules = await response.json();
      
      // Mock pour l'instant
      const rules = [];
      this.rules.set(guildId, rules);
      
      console.log(`[Automod] Loaded ${rules.length} rules for guild ${guildId}`);
    } catch (error) {
      console.error(`[Automod] Failed to load rules for guild ${guildId}`, error);
    }
  }

  /**
   * Applique les règles à un message
   * (Appelé depuis MessageCreate listener)
   */
  async applyRules(message: Message): Promise<void> {
    if (!message.guildId) return;

    const rules = this.rules.get(message.guildId);
    if (!rules || rules.length === 0) return;

    // TODO: Logique d'application des règles
    console.log(`[Automod] Checking message in guild ${message.guildId}`);
  }
}

// Export singleton
export const automodModule = new AutomodBotModule();
```

**✅ Checklist 4.3**
- [ ] Créer le dossier : `mkdir -p apps/bot/src/modules/automod`
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Commit : `feat(bot): Add automod bot module`

---

### 📦 Fichier 4.4 : Register Modules in Bot

**Modifier** : `apps/bot/src/index.ts` (ou votre fichier d'initialisation)

```typescript
import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import { moduleLoader } from './modules/module-loader/module-loader.service';
import { automodModule } from './modules/automod/automod.module';

// Initialiser le bot
const client = new SapphireClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    // ... other intents
  ],
});

// ✅ Enregistrer les modules
moduleLoader.register(automodModule);
// moduleLoader.register(ticketsModule); // À ajouter plus tard
// moduleLoader.register(levelingModule);

// Login
client.login(process.env.DISCORD_BOT_TOKEN);
```

**✅ Checklist 4.4**
- [ ] Modifier le fichier d'init
- [ ] Tester : `npm run dev` (dans apps/bot)
- [ ] Vérifier logs : "✅ Registered module: automod"
- [ ] Commit : `feat(bot): Register automod module`

---

### 📦 Fichier 4.5 : Listen to Gateway Events

**Créer** : `apps/bot/src/listeners/module-events.listener.ts`

```typescript
import { Listener } from '@sapphire/framework';
import { moduleLoader } from '../modules/module-loader/module-loader.service';

/**
 * Écoute les événements du Gateway pour les modules
 */
export class ModuleEventsListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: 'moduleEvent', // Custom event émis par WebSocket service
    });
  }

  public async run(data: any) {
    const { guildId, moduleId, action, config } = data;

    console.log(`[ModuleEvents] Received: ${action} for ${moduleId} in guild ${guildId}`);

    switch (action) {
      case 'enabled':
        await moduleLoader.enableModule(guildId, moduleId, config);
        break;

      case 'disabled':
        await moduleLoader.disableModule(guildId, moduleId);
        break;

      case 'config_updated':
        await moduleLoader.updateModuleConfig(guildId, moduleId, config);
        break;

      default:
        console.warn(`[ModuleEvents] Unknown action: ${action}`);
    }
  }
}
```

**✅ Checklist 4.5**
- [ ] Créer le dossier si nécessaire : `mkdir -p apps/bot/src/listeners`
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Commit : `feat(bot): Add module events listener`

---

### 📦 Fichier 4.6 : WebSocket Service Integration

**Modifier** : `apps/bot/src/services/websocket.service.ts`

Ajouter l'écoute des événements de modules :

```typescript
// Dans la méthode qui reçoit les messages du Gateway
socket.on('module:change', async (data: ModuleChangeEvent) => {
  console.log('[WebSocket] Module change event received', data);
  
  // Émettre l'event pour le listener
  client.emit('moduleEvent', {
    guildId: data.guildId,
    moduleId: data.moduleId,
    action: data.action,
    config: data.config,
  });
});
```

**✅ Checklist 4.6**
- [ ] Modifier le fichier WebSocket
- [ ] Ajouter l'écoute de `module:change`
- [ ] Commit : `feat(bot): Integrate module events in websocket`

---

### ✅ Validation Phase 4

**Test complet Backend → Bot** :

```bash
# 1. Backend running
cd apps/backend && npm run start:dev

# 2. Gateway running
cd apps/gateway && npm run start:dev

# 3. Bot running
cd apps/bot && npm run dev

# 4. Activer automod via backend
curl -X POST http://localhost:3000/modules/GUILD_ID/enable \
  -H "Content-Type: application/json" \
  -d '{"moduleId": "automod"}'

# 5. Vérifier logs du Bot
# Devrait voir : "[Automod] Enabling for guild GUILD_ID"
```

**✅ Phase 4 Complète**
- [ ] Bot charge les modules au démarrage
- [ ] Bot réagit aux événements Gateway
- [ ] Automod fonctionnel côté bot
- [ ] Commit final : `feat(bot): Complete bot module system integration`

---

## ✅ PHASE 5 : GATEWAY INTEGRATION (2-3h)

**Objectif** : Faire communiquer Backend et Bot via Gateway pour les modules.

### 📦 Fichier 5.1 : Gateway Module Events

**Modifier** : `apps/backend/src/modules/module-system/services/module-manager.service.ts`

Compléter la méthode `notifyBot` :

```typescript
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io-client';

@Injectable()
export class ModuleManagerService {
  // ... existing code

  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleRegistry: ModuleRegistry,
    @Inject('GATEWAY_SOCKET') private readonly gatewaySocket: Socket, // ← AJOUTER
  ) {}

  /**
   * Notifie le Bot via Gateway
   */
  private async notifyBot(event: ModuleChangeEvent): Promise<void> {
    try {
      this.gatewaySocket.emit('module:change', event);
      this.logger.log(`📤 Notified bot: ${event.action} - ${event.moduleId} (${event.guildId})`);
    } catch (error) {
      this.logger.error('Failed to notify bot', error);
    }
  }
}
```

**✅ Checklist 5.1**
- [ ] Modifier le service
- [ ] Injecter le Socket Gateway
- [ ] Décommenter les appels à `notifyBot`
- [ ] Commit : `feat(backend): Integrate gateway notifications for modules`

---

### 📦 Fichier 5.2 : Gateway Socket Provider

**Créer** : `apps/backend/src/modules/gateway/gateway-socket.provider.ts`

```typescript
import { Provider } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';

/**
 * Provider pour le Socket Gateway
 */
export const GatewaySocketProvider: Provider = {
  provide: 'GATEWAY_SOCKET',
  useFactory: (): Socket => {
    const socket = io(process.env.GATEWAY_URL || 'http://localhost:3001', {
      auth: {
        token: process.env.GATEWAY_TOKEN || 'backend-secret-token',
      },
    });

    socket.on('connect', () => {
      console.log('✅ Connected to Gateway');
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from Gateway');
    });

    return socket;
  },
};
```

**Ajouter dans `GatewayModule`** :

```typescript
import { Module } from '@nestjs/common';
import { GatewaySocketProvider } from './gateway-socket.provider';

@Module({
  providers: [GatewaySocketProvider],
  exports: [GatewaySocketProvider],
})
export class GatewayModule {}
```

**Ajouter dans `ModuleSystemModule`** :

```typescript
@Module({
  imports: [PrismaModule, GatewayModule], // ← Importer
  providers: [ModuleRegistry, ModuleManagerService],
  controllers: [ModuleSystemController],
  exports: [ModuleRegistry, ModuleManagerService],
})
export class ModuleSystemModule { ... }
```

**✅ Checklist 5.2**
- [ ] Créer le provider
- [ ] Modifier GatewayModule
- [ ] Importer dans ModuleSystemModule
- [ ] Commit : `feat(backend): Add gateway socket provider`

---

### 📦 Fichier 5.3 : Gateway Relay

**Modifier** : `apps/gateway/src/bot/bot.gateway.ts`

```typescript
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class BotGateway {
  @WebSocketServer()
  server: Server;

  private botSocket: Socket | null = null;
  private backendSocket: Socket | null = null;

  handleConnection(client: Socket) {
    console.log(`[Gateway] Client connected: ${client.id}`);

    // Identifier le client (bot ou backend)
    if (client.handshake.auth.token === 'bot-secret-token') {
      this.botSocket = client;
      console.log('[Gateway] ✅ Bot connected');
    } else if (client.handshake.auth.token === 'backend-secret-token') {
      this.backendSocket = client;
      console.log('[Gateway] ✅ Backend connected');
    }

    // ✅ Écouter événements de modules depuis Backend
    client.on('module:change', (data: any) => {
      console.log('[Gateway] Relaying module:change to bot', data);
      
      // Relayer au Bot
      if (this.botSocket) {
        this.botSocket.emit('module:change', data);
      }
    });
  }

  handleDisconnect(client: Socket) {
    if (client === this.botSocket) {
      this.botSocket = null;
      console.log('[Gateway] ❌ Bot disconnected');
    } else if (client === this.backendSocket) {
      this.backendSocket = null;
      console.log('[Gateway] ❌ Backend disconnected');
    }
  }
}
```

**✅ Checklist 5.3**
- [ ] Modifier le Gateway
- [ ] Ajouter relay module:change
- [ ] Tester : `npm run start:dev` (gateway)
- [ ] Commit : `feat(gateway): Add module events relay`

---

### ✅ Validation Phase 5

**Test end-to-end** :

```bash
# 1. Start all services
# Backend, Gateway, Bot

# 2. Enable module via API
curl -X POST http://localhost:3000/modules/GUILD_ID/enable \
  -d '{"moduleId": "automod"}'

# 3. Check logs
# Backend: "📤 Notified bot: enabled - automod"
# Gateway: "Relaying module:change to bot"
# Bot: "[Automod] Enabling for guild GUILD_ID"

# 4. Create a rule
curl -X POST http://localhost:3000/automod/GUILD_ID/rules \
  -d '{"name": "Test", "ruleType": "SPAM", "config": {}, "actions": []}'

# 5. Check logs
# Backend: "✅ Automod rule created"
# Gateway: "Relaying module:change"
# Bot: "[Automod] Config updated"
```

**✅ Phase 5 Complète**
- [ ] Communication Backend → Gateway → Bot fonctionnelle
- [ ] Modules se chargent en temps réel
- [ ] Commit final : `feat(gateway): Complete module system gateway integration`

---

## ✅ PHASE 6 : FRONTEND PREPARATION (1-2h)

**Objectif** : Préparer le terrain pour l'implémentation frontend (sera fait plus tard).

### 📦 Fichier 6.1 : Module Facade Service (Angular)

**Chemin** : `apps/frontend/src/app/core/services/modules/module-facade.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ModuleApiService } from './module-api.service';
import {
  ModuleDefinition,
  GuildModuleConfig,
  EnableModuleDto,
  DisableModuleDto,
} from '@my-project/shared-types';

/**
 * Facade pour la gestion des modules
 */
@Injectable({
  providedIn: 'root',
})
export class ModuleFacadeService {
  constructor(private moduleApi: ModuleApiService) {}

  /**
   * Liste tous les modules disponibles
   */
  getAllModules(): Observable<ModuleDefinition[]> {
    return this.moduleApi.getAllModules();
  }

  /**
   * Liste les modules d'un serveur
   */
  getGuildModules(guildId: string): Observable<GuildModuleConfig[]> {
    return this.moduleApi.getGuildModules(guildId);
  }

  /**
   * Active un module
   */
  enableModule(dto: EnableModuleDto): Observable<GuildModuleConfig> {
    return this.moduleApi.enableModule(dto);
  }

  /**
   * Désactive un module
   */
  disableModule(dto: DisableModuleDto): Observable<GuildModuleConfig> {
    return this.moduleApi.disableModule(dto);
  }
}
```

**✅ Checklist 6.1**
- [ ] Créer le dossier : `mkdir -p apps/frontend/src/app/core/services/modules`
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Commit : `feat(frontend): Add module facade service`

---

### 📦 Fichier 6.2 : Module API Service

**Chemin** : `apps/frontend/src/app/core/services/modules/module-api.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ModuleDefinition,
  GuildModuleConfig,
  EnableModuleDto,
  DisableModuleDto,
} from '@my-project/shared-types';

/**
 * Service API pour les modules
 */
@Injectable({
  providedIn: 'root',
})
export class ModuleApiService {
  private baseUrl = `${environment.apiUrl}/modules`;

  constructor(private http: HttpClient) {}

  getAllModules(): Observable<ModuleDefinition[]> {
    return this.http.get<ModuleDefinition[]>(this.baseUrl);
  }

  getGuildModules(guildId: string): Observable<GuildModuleConfig[]> {
    return this.http.get<GuildModuleConfig[]>(`${this.baseUrl}/${guildId}`);
  }

  enableModule(dto: EnableModuleDto): Observable<GuildModuleConfig> {
    return this.http.post<GuildModuleConfig>(
      `${this.baseUrl}/${dto.guildId}/enable`,
      dto,
    );
  }

  disableModule(dto: DisableModuleDto): Observable<GuildModuleConfig> {
    return this.http.delete<GuildModuleConfig>(
      `${this.baseUrl}/${dto.guildId}/disable`,
      { body: dto },
    );
  }
}
```

**✅ Checklist 6.2**
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Commit : `feat(frontend): Add module API service`

---

### 📦 Fichier 6.3 : Module Card Component (Stub)

**Chemin** : `apps/frontend/src/app/features/modules/components/module-card/module-card.component.ts`

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ModuleDefinition } from '@my-project/shared-types';

@Component({
  selector: 'app-module-card',
  template: `
    <div class="module-card">
      <h3>{{ module.name }}</h3>
      <p>{{ module.description }}</p>
      <button 
        (click)="onToggle.emit()"
        [disabled]="!available">
        {{ enabled ? 'Disable' : 'Enable' }}
      </button>
    </div>
  `,
  styles: [`
    .module-card {
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 16px;
      margin: 8px;
    }
  `],
})
export class ModuleCardComponent {
  @Input() module!: ModuleDefinition;
  @Input() enabled: boolean = false;
  @Input() available: boolean = true;
  
  @Output() onToggle = new EventEmitter<void>();
}
```

**✅ Checklist 6.3**
- [ ] Créer le dossier : `mkdir -p apps/frontend/src/app/features/modules/components/module-card`
- [ ] Créer le fichier
- [ ] Copier le code
- [ ] Commit : `feat(frontend): Add module card component stub`

---

### ✅ Phase 6 Complète

**✅ Frontend prêt pour l'implémentation future**
- [ ] Services créés
- [ ] Stub de composant
- [ ] Commit final : `feat(frontend): Prepare frontend module system foundation`

---

## 📋 CHECKLIST FINALE - SYSTÈME COMPLET

### Backend ✅
- [ ] Shared types créés et buildés
- [ ] Prisma schema mis à jour avec `guild_modules`
- [ ] Module Registry fonctionnel
- [ ] Module Manager fonctionnel
- [ ] Endpoints API testés
- [ ] Module Automod complet (définition, service, controller)
- [ ] Automod enregistré dans le Registry
- [ ] Gateway Socket Provider configuré

### Bot ✅
- [ ] Interface BotModule créée
- [ ] Module Loader fonctionnel
- [ ] Automod Bot Module implémenté
- [ ] Modules enregistrés au démarrage
- [ ] Listener d'événements modules actif
- [ ] WebSocket reçoit les événements

### Gateway ✅
- [ ] Relay module:change Backend → Bot
- [ ] Connexions Backend et Bot identifiées
- [ ] Logs de debug actifs

### Frontend ✅
- [ ] Services Facade et API créés
- [ ] Composant module-card stub

---

## 🚀 PROCHAINES ÉTAPES

### Modules à Ajouter
1. **Tickets** (Support system)
2. **Leveling** (XP & Rewards)
3. **Welcome** (Messages de bienvenue)
4. **Logs** (Audit logs)
5. **Custom Commands**
6. **Music** (Premium only)

### Améliorations
- [ ] Dashboard admin pour voir les stats d'utilisation des modules
- [ ] Système de billing intégré (Stripe)
- [ ] Analytics : quels modules sont les plus utilisés
- [ ] Notifications email quand limite atteinte
- [ ] Frontend complet avec PrimeNG

---

## 🐛 DEBUGGING

### Backend ne notifie pas le Bot
```bash
# Vérifier que le Gateway est bien connecté
curl http://localhost:3001/health

# Vérifier les logs Backend
# Devrait voir : "✅ Connected to Gateway"

# Vérifier token Gateway dans .env
GATEWAY_TOKEN=backend-secret-token
```

### Bot ne charge pas les modules
```bash
# Vérifier les logs Bot au démarrage
# Devrait voir : "✅ Registered module: automod"

# Vérifier connexion Gateway
# Devrait voir : "[WebSocket] Connected to gateway"
```

### Limites ne fonctionnent pas
```bash
# Vérifier plan dans la DB
SELECT * FROM guilds WHERE guild_id = 'GUILD_ID';

# Vérifier définition du module
console.log(moduleRegistry.getModule('automod'));
```

---

## 📞 SUPPORT

Si blocage :
1. Vérifier les logs des 3 services (Backend, Gateway, Bot)
2. Tester les endpoints manuellement (Postman/curl)
3. Vérifier que les types sont buildés : `npm run build --workspace=packages/shared-types`
4. Vérifier connexion DB : `npx prisma studio`

---

**🎉 BON COURAGE POUR L'IMPLÉMENTATION ! 🚀**

**Version** : 1.0  
**Dernière mise à jour** : 30 Octobre 2025