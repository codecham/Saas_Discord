# 🧩 Guide de Création d'un Nouveau Module

## 📋 Guide Pas-à-Pas pour Créer un Module Feature

**Durée estimée** : 1-2h selon la complexité

---

## ✅ Checklist Rapide

- [ ] 1. Planifier le module (nom, features, limites)
- [ ] 2. Créer la définition du module
- [ ] 3. Créer le schéma Prisma
- [ ] 4. Faire la migration Prisma
- [ ] 5. Créer le service backend
- [ ] 6. Créer le controller backend
- [ ] 7. Créer le module NestJS
- [ ] 8. Enregistrer dans le Registry
- [ ] 9. Importer dans AppModule
- [ ] 10. Tester les endpoints
- [ ] 11. Créer le bot module
- [ ] 12. Enregistrer dans le bot
- [ ] 13. Tester end-to-end

---

## 📝 ÉTAPE 1 : Planification

### 1.1 Définir le module

Réponds à ces questions :

**Nom et Description** :
- Nom du module : `___________` (ex: welcome, leveling, tickets)
- Description courte : `___________`
- Icône emoji : `___________`
- Catégorie : `moderation` | `engagement` | `utility` | `analytics` | `economy`

**Fonctionnalités** :
- Feature 1 : `___________`
- Feature 2 : `___________`
- Feature 3 : `___________`

**Limites freemium** :
```
Free plan:
  - ressource1: X (ex: rules: 3)
  - ressource2: Y

Premium plan:
  - ressource1: X
  - ressource2: Y
```

**Runtime** :
- [ ] Backend (configuration UI)
- [ ] Bot (événements Discord, commandes)

---

## 🔧 ÉTAPE 2 : Backend - Définition du Module

### 2.1 Créer le dossier

```bash
mkdir -p apps/backend/src/modules/NOM_MODULE
```

### 2.2 Créer la définition

**Fichier** : `apps/backend/src/modules/NOM_MODULE/NOM_MODULE.definition.ts`

**Template** :

```typescript
// apps/backend/src/modules/NOM_MODULE/NOM_MODULE.definition.ts

import {
  ModuleDefinition,
  ModuleCategory,
} from '@my-project/shared-types';

/**
 * 🎯 NOM_MODULE Module Definition
 * 
 * [Description du module]
 */
export const NOM_MODULE_DEFINITION: ModuleDefinition = {
  id: 'NOM_MODULE',
  name: 'Nom Affiché',
  description: 'Description du module',
  icon: '🎯',
  category: ModuleCategory.ENGAGEMENT, // ou MODERATION, UTILITY, ANALYTICS, ECONOMY

  availability: {
    free: true,      // Disponible en gratuit ?
    premium: true,
    enterprise: true,
  },

  limits: {
    free: {
      ressource1: 3,        // Ex: rules: 3
      ressource2: 100,      // Ex: actionsPerDay: 100
    },
    premium: {
      ressource1: 50,
      ressource2: 10000,
    },
    enterprise: {
      ressource1: -1,       // -1 = illimité
      ressource2: -1,
    },
  },

  runtime: {
    backend: true,  // Configuration UI
    bot: true,      // Listeners/Commands Discord
  },

  version: '1.0.0',
  author: 'Discord Admin App',
};
```

**✅ Checklist 2** :
- [ ] Fichier créé
- [ ] ID unique choisi
- [ ] Limites définies
- [ ] Commit : `feat(NOM_MODULE): Add module definition`

---

## 🗄️ ÉTAPE 3 : Schema Prisma

### 3.1 Créer le model Prisma

**Fichier** : `apps/backend/prisma/schema.prisma`

**Ajouter à la fin** :

```prisma
// ============================================
// NOM_MODULE MODULE
// ============================================

/// Configuration du module NOM_MODULE
model NomModuleConfig {
  id        String   @id @default(cuid())
  guildId   String   @unique @map("guild_id") @db.VarChar(20)
  
  // Configuration spécifique
  enabled   Boolean  @default(true)
  setting1  String?  // Tes settings ici
  setting2  Int      @default(0)
  config    Json?    // Pour settings complexes
  
  // Metadata
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  guild Guild @relation(fields: [guildId], references: [guildId], onDelete: Cascade)

  @@index([guildId])
  @@index([enabled])
  @@map("nom_module_config")
}
```

### 3.2 Ajouter la relation dans Guild

**Dans le model Guild** :

```prisma
model Guild {
  // ... champs existants
  
  // Relations
  settings         GuildSettings?
  modules          GuildModule[]
  welcomeConfig    WelcomeConfig?
  nomModuleConfig  NomModuleConfig?  // ← AJOUTER
  
  // ... reste
}
```

### 3.3 Faire la migration

```bash
cd apps/backend
npx prisma migrate dev --name add_NOM_MODULE_module
npx prisma generate
```

**✅ Checklist 3** :
- [ ] Model Prisma créé
- [ ] Relation ajoutée dans Guild
- [ ] Migration créée
- [ ] Client généré
- [ ] Commit : `feat(NOM_MODULE): Add database schema`

---

## 💼 ÉTAPE 4 : Service Backend

### 4.1 Créer le service

**Fichier** : `apps/backend/src/modules/NOM_MODULE/NOM_MODULE.service.ts`

**Template** :

```typescript
// apps/backend/src/modules/NOM_MODULE/NOM_MODULE.service.ts

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ModuleManagerService } from '../../core/module-system/services/module-manager.service';

/**
 * 🎯 NOM_MODULE Service
 * 
 * Gère la configuration du module NOM_MODULE
 */
@Injectable()
export class NomModuleService {
  private readonly logger = new Logger(NomModuleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleManager: ModuleManagerService,
  ) {}

  /**
   * Récupère la config du module
   */
  async getConfig(guildId: string) {
    const isEnabled = await this.moduleManager.isModuleEnabled(
      guildId,
      'NOM_MODULE',
    );

    if (!isEnabled) {
      throw new ForbiddenException('NOM_MODULE module is not enabled');
    }

    return this.prisma.nomModuleConfig.findUnique({
      where: { guildId },
    });
  }

  /**
   * Crée ou met à jour la config
   */
  async upsertConfig(
    guildId: string,
    data: {
      setting1?: string;
      setting2?: number;
      // ... tes champs
    },
  ) {
    const isEnabled = await this.moduleManager.isModuleEnabled(
      guildId,
      'NOM_MODULE',
    );

    if (!isEnabled) {
      throw new ForbiddenException('NOM_MODULE module is not enabled');
    }

    const config = await this.prisma.nomModuleConfig.upsert({
      where: { guildId },
      create: {
        guildId,
        ...data,
      },
      update: {
        ...data,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`✅ NOM_MODULE config updated for guild ${guildId}`);

    // TODO: Notifier le Bot via Gateway
    // await this.notifyBot(guildId, config);

    return config;
  }

  /**
   * Active/désactive le module
   */
  async toggleEnabled(guildId: string, enabled: boolean) {
    const config = await this.prisma.nomModuleConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      throw new NotFoundException('Config not found');
    }

    return this.prisma.nomModuleConfig.update({
      where: { guildId },
      data: { enabled },
    });
  }

  /**
   * Supprime la config
   */
  async deleteConfig(guildId: string) {
    await this.prisma.nomModuleConfig.delete({
      where: { guildId },
    });

    this.logger.log(`❌ NOM_MODULE config deleted for guild ${guildId}`);

    return { success: true };
  }
}
```

**✅ Checklist 4** :
- [ ] Service créé
- [ ] Méthodes CRUD implémentées
- [ ] Vérification module enabled
- [ ] Commit : `feat(NOM_MODULE): Add service`

---

## 🎛️ ÉTAPE 5 : Controller Backend

### 5.1 Créer le controller

**Fichier** : `apps/backend/src/modules/NOM_MODULE/NOM_MODULE.controller.ts`

**Template** :

```typescript
// apps/backend/src/modules/NOM_MODULE/NOM_MODULE.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NomModuleService } from './NOM_MODULE.service';
// import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
// import { GuildAdminGuard } from '../../core/auth/guards/guild-admin.guard';

/**
 * 🎯 NOM_MODULE Controller
 */
@Controller('NOM_MODULE')
// @UseGuards(JwtAuthGuard, GuildAdminGuard)
export class NomModuleController {
  constructor(private readonly nomModuleService: NomModuleService) {}

  /**
   * GET /NOM_MODULE/:guildId
   * Récupère la config
   */
  @Get(':guildId')
  async getConfig(@Param('guildId') guildId: string) {
    return this.nomModuleService.getConfig(guildId);
  }

  /**
   * POST /NOM_MODULE/:guildId
   * Crée ou met à jour la config
   */
  @Post(':guildId')
  async upsertConfig(
    @Param('guildId') guildId: string,
    @Body() body: {
      setting1?: string;
      setting2?: number;
      // ... tes champs
    },
  ) {
    return this.nomModuleService.upsertConfig(guildId, body);
  }

  /**
   * PUT /NOM_MODULE/:guildId/toggle
   * Active/désactive
   */
  @Put(':guildId/toggle')
  async toggleEnabled(
    @Param('guildId') guildId: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.nomModuleService.toggleEnabled(guildId, body.enabled);
  }

  /**
   * DELETE /NOM_MODULE/:guildId
   * Supprime la config
   */
  @Delete(':guildId')
  @HttpCode(HttpStatus.OK)
  async deleteConfig(@Param('guildId') guildId: string) {
    return this.nomModuleService.deleteConfig(guildId);
  }
}
```

**✅ Checklist 5** :
- [ ] Controller créé
- [ ] Endpoints REST définis
- [ ] Commit : `feat(NOM_MODULE): Add controller`

---

## 📦 ÉTAPE 6 : Module NestJS

### 6.1 Créer le module

**Fichier** : `apps/backend/src/modules/NOM_MODULE/NOM_MODULE.module.ts`

**Template** :

```typescript
// apps/backend/src/modules/NOM_MODULE/NOM_MODULE.module.ts

import { Module } from '@nestjs/common';
import { NomModuleService } from './NOM_MODULE.service';
import { NomModuleController } from './NOM_MODULE.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { ModuleSystemModule } from '../../core/module-system/module-system.module';

/**
 * 🎯 NOM_MODULE Module
 */
@Module({
  imports: [PrismaModule, ModuleSystemModule],
  providers: [NomModuleService],
  controllers: [NomModuleController],
  exports: [NomModuleService],
})
export class NomModuleModule {}
```

**✅ Checklist 6** :
- [ ] Module NestJS créé
- [ ] Imports corrects
- [ ] Service exporté
- [ ] Commit : `feat(NOM_MODULE): Add NestJS module`

---

## 📋 ÉTAPE 7 : Enregistrement dans le Registry

### 7.1 Enregistrer dans module-system

**Fichier** : `apps/backend/src/core/module-system/module-system.module.ts`

**Ajouter** :

```typescript
import { NOM_MODULE_DEFINITION } from '../../modules/NOM_MODULE/NOM_MODULE.definition';

@Module({...})
export class ModuleSystemModule implements OnModuleInit {
  constructor(private readonly moduleRegistry: ModuleRegistry) {}

  onModuleInit() {
    // Enregistrer les modules
    this.moduleRegistry.register(WELCOME_MODULE);
    this.moduleRegistry.register(NOM_MODULE_DEFINITION); // ← AJOUTER
    
    console.log('📦 Module System initialized');
    console.log(`✅ ${this.moduleRegistry.getAllModules().length} modules registered`);
  }
}
```

**✅ Checklist 7** :
- [ ] Import ajouté
- [ ] Module enregistré dans `onModuleInit`
- [ ] Commit : `feat(NOM_MODULE): Register in module system`

---

## 🔌 ÉTAPE 8 : Importer dans AppModule

### 8.1 Ajouter dans AppModule

**Fichier** : `apps/backend/src/app.module.ts`

**Ajouter** :

```typescript
import { NomModuleModule } from './modules/NOM_MODULE/NOM_MODULE.module';

@Module({
  imports: [
    // ... existing imports
    ModuleSystemModule,
    WelcomeModule,
    NomModuleModule,  // ← AJOUTER
  ],
})
export class AppModule {}
```

**✅ Checklist 8** :
- [ ] Module importé dans AppModule
- [ ] Commit : `feat(NOM_MODULE): Import in AppModule`

---

## ✅ ÉTAPE 9 : Test Backend

### 9.1 Lancer le backend

```bash
cd apps/backend
npm run start:dev
```

**Vérifier les logs** :
```
✅ Module registered: NOM_MODULE (Nom Affiché)
📦 Module System initialized
✅ 2 modules registered
```

### 9.2 Tester les endpoints

```bash
# Liste tous les modules
curl http://localhost:3000/modules

# Activer le module
curl -X POST http://localhost:3000/modules/GUILD_ID/enable \
  -H "Content-Type: application/json" \
  -d '{"guildId": "GUILD_ID", "moduleId": "NOM_MODULE"}'

# Créer une config
curl -X POST http://localhost:3000/NOM_MODULE/GUILD_ID \
  -H "Content-Type: application/json" \
  -d '{"setting1": "value", "setting2": 42}'

# Récupérer la config
curl http://localhost:3000/NOM_MODULE/GUILD_ID
```

**✅ Checklist 9** :
- [ ] Backend démarre sans erreur
- [ ] Module visible dans `/modules`
- [ ] Activation fonctionne
- [ ] CRUD fonctionne
- [ ] Commit : `feat(NOM_MODULE): Backend complete and tested`

---

## 🤖 ÉTAPE 10 : Bot Module

### 10.1 Créer le bot module

**Fichier** : `apps/bot/src/modules/NOM_MODULE/NOM_MODULE.module.ts`

**Template** :

```typescript
// apps/bot/src/modules/NOM_MODULE/NOM_MODULE.module.ts

import { BotModule } from '../module-loader/bot-module.interface';

/**
 * 🎯 NOM_MODULE Bot Module
 */
export class NomModuleBotModule implements BotModule {
  id = 'NOM_MODULE';
  private configs: Map<string, any> = new Map();

  async onEnable(guildId: string, config?: Record<string, any>): Promise<void> {
    console.log(`[NOM_MODULE] Enabling for guild ${guildId}`);

    // Charger config depuis backend ou utiliser celle fournie
    if (config) {
      this.configs.set(guildId, config);
    } else {
      await this.loadConfig(guildId);
    }

    // TODO: Activer listeners
  }

  async onDisable(guildId: string): Promise<void> {
    console.log(`[NOM_MODULE] Disabling for guild ${guildId}`);
    this.configs.delete(guildId);
  }

  async onConfigUpdate(guildId: string, config: Record<string, any>): Promise<void> {
    console.log(`[NOM_MODULE] Config updated for guild ${guildId}`);
    this.configs.set(guildId, config);
  }

  /**
   * Charge la config depuis le backend
   */
  private async loadConfig(guildId: string): Promise<void> {
    try {
      // TODO: Fetch depuis backend API
      // const response = await fetch(`${BACKEND_URL}/NOM_MODULE/${guildId}`);
      // const config = await response.json();
      
      const config = {}; // Mock pour l'instant
      this.configs.set(guildId, config);
      
      console.log(`[NOM_MODULE] Config loaded for guild ${guildId}`);
    } catch (error) {
      console.error(`[NOM_MODULE] Failed to load config for guild ${guildId}`, error);
    }
  }

  /**
   * Récupère la config d'une guild
   */
  getConfig(guildId: string): any {
    return this.configs.get(guildId);
  }
}

// Export singleton
export const nomModuleBotModule = new NomModuleBotModule();
```

### 10.2 Créer les listeners (si nécessaire)

**Fichier** : `apps/bot/src/modules/NOM_MODULE/listeners/exemple.listener.ts`

```typescript
// apps/bot/src/modules/NOM_MODULE/listeners/exemple.listener.ts

import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { nomModuleBotModule } from '../NOM_MODULE.module';

export class ExempleListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.MessageCreate, // Ou autre event
    });
  }

  public async run(message: any) {
    if (!message.guildId) return;

    // Vérifier si module activé
    const config = nomModuleBotModule.getConfig(message.guildId);
    if (!config) return;

    // Ta logique ici
    console.log(`[NOM_MODULE] Event triggered in guild ${message.guildId}`);
  }
}
```

**✅ Checklist 10** :
- [ ] Bot module créé
- [ ] Listeners créés (si nécessaire)
- [ ] Interface `BotModule` implémentée
- [ ] Commit : `feat(NOM_MODULE): Add bot module`

---

## 📋 ÉTAPE 11 : Enregistrer le Bot Module

### 11.1 Enregistrer dans le bot

**Fichier** : `apps/bot/src/index.ts` (ou fichier d'init)

**Ajouter** :

```typescript
import { moduleLoader } from './modules/module-loader/module-loader.service';
import { welcomeModule } from './modules/welcome/welcome.module';
import { nomModuleBotModule } from './modules/NOM_MODULE/NOM_MODULE.module';

// Enregistrer les modules
moduleLoader.register(welcomeModule);
moduleLoader.register(nomModuleBotModule); // ← AJOUTER
```

**✅ Checklist 11** :
- [ ] Module enregistré dans le bot
- [ ] Bot démarre sans erreur
- [ ] Commit : `feat(NOM_MODULE): Register bot module`

---

## 🧪 ÉTAPE 12 : Test End-to-End

### 12.1 Test complet

**Scénario de test** :

1. **Backend** : Démarrer `npm run start:dev`
2. **Gateway** : Démarrer `npm run start:dev`
3. **Bot** : Démarrer `npm run dev`

4. **Activer le module via API** :
```bash
curl -X POST http://localhost:3000/modules/GUILD_ID/enable \
  -d '{"guildId": "GUILD_ID", "moduleId": "NOM_MODULE"}'
```

5. **Vérifier logs Bot** :
```
[NOM_MODULE] Enabling for guild GUILD_ID
```

6. **Configurer via API** :
```bash
curl -X POST http://localhost:3000/NOM_MODULE/GUILD_ID \
  -d '{"setting1": "test"}'
```

7. **Vérifier logs Bot** :
```
[NOM_MODULE] Config updated for guild GUILD_ID
```

8. **Tester l'event Discord** (si applicable)
   - Déclencher l'event (ex: envoyer un message)
   - Vérifier que le bot réagit

**✅ Checklist 12** :
- [ ] Activation via API fonctionne
- [ ] Bot reçoit l'event d'activation
- [ ] Config sync Backend → Bot
- [ ] Events Discord traités correctement
- [ ] Commit : `feat(NOM_MODULE): Complete and tested end-to-end`

---

## 📄 ÉTAPE 13 : Documentation

### 13.1 Créer le fichier de doc

**Fichier** : `docs/modules/NOM_MODULE.md`

**Contenu** :

```markdown
# 🎯 Module NOM_MODULE

## Description
[Description du module]

## Features
- Feature 1
- Feature 2

## Limites
- **Free** : X ressource1, Y ressource2
- **Premium** : X ressource1, Y ressource2

## API Endpoints
- `GET /NOM_MODULE/:guildId` - Récupérer config
- `POST /NOM_MODULE/:guildId` - Créer/modifier config
- `PUT /NOM_MODULE/:guildId/toggle` - Activer/désactiver
- `DELETE /NOM_MODULE/:guildId` - Supprimer config

## Configuration
```json
{
  "setting1": "value",
  "setting2": 42
}
```

## Events Discord
- Event 1 : Description
- Event 2 : Description
```

**✅ Checklist 13** :
- [ ] Documentation créée
- [ ] Exemples d'utilisation
- [ ] Commit : `docs(NOM_MODULE): Add module documentation`

---

## 🎉 Module Terminé !

### Checklist Finale

- [ ] Backend complet et testé
- [ ] Bot complet et testé
- [ ] End-to-end testé
- [ ] Documentation créée
- [ ] Commit final : `feat(NOM_MODULE): Complete module implementation`

---

## 📚 Ressources

- [Module System Roadmap](./MODULE_SYSTEM_ROADMAP.md)
- [Phase 1 Complete](./PHASE_1_COMPLETE.md)
- [Phase 2 Complete](./PHASE_2_COMPLETE.md)
- [Discord.js Events](https://discord.js.org/#/docs/discord.js/main/typedef/Events)
- [NestJS Documentation](https://docs.nestjs.com/)

---

**Version** : 1.0  
**Dernière mise à jour** : 31 Octobre 2025