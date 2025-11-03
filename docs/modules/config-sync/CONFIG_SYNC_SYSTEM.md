# 🔄 CONFIG SYNC SYSTEM - Documentation Technique

## 📋 Vue d'ensemble

Ce document explique comment fonctionne le système de synchronisation des configurations entre le Backend et le Bot, et comment l'intégrer pour de nouveaux modules.

**Version** : 1.0  
**Date** : 03 Novembre 2025  
**Status** : ✅ Opérationnel

---

## 🏗️ Architecture du Système

### Composants Principaux

```
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │  ModuleService (ex: WelcomeService)                │    │
│  │  • upsertConfig()                                  │    │
│  │  • toggleEnabled()                                 │    │
│  │  • deleteConfig()                                  │    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │ Appelle                                 │
│  ┌────────────────▼───────────────────────────────────┐    │
│  │  GatewayClientService                              │    │
│  │  • notifyModuleChange()                            │    │
│  └────────────────┬───────────────────────────────────┘    │
└───────────────────┼─────────────────────────────────────────┘
                    │ Socket.io emit('module:change')
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                        GATEWAY                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │  BotGateway                                        │    │
│  │  @SubscribeMessage('module:change')                │    │
│  │  • Vérifie que l'émetteur est le backend          │    │
│  │  • broadcastToAllBots('module:change', data)      │    │
│  └────────────────┬───────────────────────────────────┘    │
└───────────────────┼─────────────────────────────────────────┘
                    │ Socket.io emit('module:change')
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                          BOT                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │  WebSocketService                                  │    │
│  │  socket.on('module:change')                        │    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │ Appelle                                 │
│  ┌────────────────▼───────────────────────────────────┐    │
│  │  ModuleEventsHandler                               │    │
│  │  • Parse l'action (enabled/disabled/config_updated)│    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │ Appelle                                 │
│  ┌────────────────▼───────────────────────────────────┐    │
│  │  ModuleLoader                                      │    │
│  │  • enableModule()                                  │    │
│  │  • disableModule()                                 │    │
│  │  • updateModuleConfig()                            │    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │ Appelle                                 │
│  ┌────────────────▼───────────────────────────────────┐    │
│  │  WelcomeModule (ou autre module)                  │    │
│  │  • onEnable()                                      │    │
│  │  • onDisable()                                     │    │
│  │  • onConfigUpdate() → Met à jour Map en mémoire   │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Flux de Données Détaillé

### 1️⃣ Configuration initiale (User configure dans Frontend - futur)

```
User modifie config → Frontend
    ↓ HTTP POST
Backend API → WelcomeService.upsertConfig()
    ↓ Save
PostgreSQL (welcome_configs)
    ↓ Notify
GatewayClientService.notifyModuleChange()
    ↓ Socket.io
Gateway reçoit 'module:change'
    ↓ Broadcast
Bot(s) reçoit(vent) 'module:change'
    ↓ Parse
ModuleEventsHandler
    ↓ Route
ModuleLoader.updateModuleConfig()
    ↓ Update
WelcomeModule.onConfigUpdate()
    ↓ Store
Map<guildId, config> en mémoire du Bot
```

### 2️⃣ Chargement au démarrage du Bot

```
Bot démarre
    ↓
client.once('ready', ...)
    ↓
moduleLoader.loadAllModules()
    ↓ Pour chaque module enregistré
configSync.loadModuleConfigs(moduleId)
    ↓ HTTP GET
Backend: GET /modules/enabled/:moduleId
    ↓ Return
[{ guildId, config }, ...]
    ↓ Store
Map<guildId, config> en mémoire
    ↓ Pour chaque guild
moduleLoader.enableModule(guildId, moduleId, config)
    ↓ Call
module.onEnable(guildId, config)
    ↓ Ready
Module prêt pour cette guild ✅
```

### 3️⃣ Utilisation en temps réel (Event Discord)

```
Nouveau membre rejoint Discord
    ↓
Discord API → Bot
    ↓
GuildMemberAddListener détecte
    ↓
welcomeModule.sendWelcomeMessage(member)
    ↓ Get config
config = this.configs.get(member.guild.id)
    ↓ Si config existe
Remplacer variables + Envoyer message
    ↓
Message envoyé ! 🎉
```

---

## 🔧 Intégration pour un Nouveau Module

### Étape 1 : Backend - Notifier Gateway

**Dans votre service de module** (ex: `automod.service.ts`) :

```typescript
import { Injectable, Optional } from '@nestjs/common';
import { GatewayClientService } from '../../core/gateway/services/gatewayClient.service';

@Injectable()
export class AutomodService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly gatewayClient?: GatewayClientService,
  ) {}

  async upsertRule(guildId: string, data: CreateRuleDto): Promise<AutomodRule> {
    // 1. Sauvegarder dans la DB
    const rule = await this.prisma.automodRule.create({
      data: { guildId, ...data },
    });

    // 2. Notifier le bot via Gateway
    if (this.gatewayClient) {
      try {
        this.gatewayClient.notifyModuleChange({
          guildId,
          moduleId: 'automod',
          action: 'config_updated',
          config: {
            rules: await this.getAllRules(guildId), // Envoyer toutes les règles
          },
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('[Automod] Failed to notify gateway:', error);
      }
    }

    return rule;
  }
}
```

**Important** :
- Utilisez `@Optional()` pour éviter les dépendances circulaires
- Toujours vérifier `if (this.gatewayClient)` avant d'appeler
- Envoyer la config complète du module, pas juste le changement

---

### Étape 2 : Backend - Endpoint pour le Bot

**Dans votre controller** :

```typescript
@Controller('automod')
export class AutomodController {
  @Get(':guildId/rules')
  async getRules(@Param('guildId') guildId: string) {
    return this.automodService.getAllRules(guildId);
  }
}
```

**Dans `module-manager.service.ts`**, ajouter la logique de chargement :

```typescript
async getEnabledGuilds(moduleId: string): Promise<Array<{ guildId: string; config: any }>> {
  const guildModules = await this.prisma.guildModule.findMany({
    where: { moduleId, enabled: true },
    select: { guildId: true, config: true },
  });

  // ✅ Ajouter la logique pour votre module
  if (moduleId === 'automod') {
    const automodRules = await this.prisma.automodRule.findMany({
      where: {
        enabled: true,
        guildId: { in: guildModules.map(gm => gm.guildId) },
      },
    });

    // Grouper par guildId
    const rulesByGuild = new Map<string, any[]>();
    for (const rule of automodRules) {
      if (!rulesByGuild.has(rule.guildId)) {
        rulesByGuild.set(rule.guildId, []);
      }
      rulesByGuild.get(rule.guildId)!.push(rule);
    }

    return Array.from(rulesByGuild.entries()).map(([guildId, rules]) => ({
      guildId,
      config: { rules },
    }));
  }

  // ... autres modules
}
```

---

### Étape 3 : Bot - Créer le Module

**Fichier** : `apps/bot/src/modules/automod/automod.module.ts`

```typescript
import { BotModule } from '../module-loader/bot-module.interface';
import { container } from '@sapphire/framework';

export class AutomodBotModule implements BotModule {
  id = 'automod';
  private configs: Map<string, any> = new Map();

  async onEnable(guildId: string, config?: Record<string, any>): Promise<void> {
    container.logger.info(`[Automod] Enabling for guild ${guildId}`);
    
    if (config) {
      this.configs.set(guildId, config);
      container.logger.info(`[Automod] Loaded ${config.rules?.length || 0} rules`);
    }
  }

  async onDisable(guildId: string): Promise<void> {
    container.logger.info(`[Automod] Disabling for guild ${guildId}`);
    this.configs.delete(guildId);
  }

  async onConfigUpdate(guildId: string, config: Record<string, any>): Promise<void> {
    container.logger.info(`[Automod] Config updated for guild ${guildId}`);
    this.configs.set(guildId, config);
    container.logger.info(`[Automod] Now ${config.rules?.length || 0} rules`);
  }

  getConfig(guildId: string): any | null {
    return this.configs.get(guildId) || null;
  }

  // Vos méthodes spécifiques au module
  async checkMessage(message: any): Promise<void> {
    const config = this.getConfig(message.guildId);
    if (!config || !config.rules) return;

    // Appliquer les règles...
  }
}

export const automodModule = new AutomodBotModule();
```

---

### Étape 4 : Bot - Enregistrer le Module

**Fichier** : `apps/bot/src/index.ts`

```typescript
import { moduleLoader } from './modules/module-loader/module-loader.service';
import { welcomeModule } from './modules/welcome/welcome.module';
import { automodModule } from './modules/automod/automod.module';

// Enregistrer tous les modules
moduleLoader.register(welcomeModule);
moduleLoader.register(automodModule);  // ← AJOUTER

client.once('ready', async () => {
  console.log(`Bot logged in as ${client.user?.tag}`);
  
  // Charger toutes les configs au démarrage
  await moduleLoader.loadAllModules();
  
  console.log('✅ Bot ready with all modules loaded');
});
```

---

## 🎯 Structure des Events

### Event `module:change`

```typescript
interface ModuleChangeEvent {
  guildId: string;           // ID du serveur Discord
  moduleId: string;          // ID du module ('welcome', 'automod', etc.)
  action: 'enabled' | 'disabled' | 'config_updated';
  config?: Record<string, any>;  // Config complète du module
  timestamp: Date;
}
```

### Actions

| Action | Description | Config Required |
|--------|-------------|----------------|
| `enabled` | Module activé pour la guild | ✅ Oui |
| `disabled` | Module désactivé | ❌ Non |
| `config_updated` | Config modifiée | ✅ Oui |

---

## 📝 Best Practices

### ✅ DO

1. **Toujours envoyer la config complète**, pas juste le changement
2. **Vérifier `if (this.gatewayClient)` avant d'appeler**
3. **Logger les notifications** pour faciliter le debug
4. **Utiliser `@Optional()` pour l'injection** du GatewayClientService
5. **Gérer les erreurs gracieusement** (try/catch)
6. **Stocker les configs en Map** dans le bot pour performance

### ❌ DON'T

1. **Ne pas envoyer de données sensibles** dans les configs
2. **Ne pas oublier de mettre à jour `getEnabledGuilds()`** dans le ModuleManagerService
3. **Ne pas faire de requêtes DB à chaque event Discord** (utiliser le cache)
4. **Ne pas crasher si Gateway n'est pas disponible**
5. **Ne pas envoyer des configs trop volumineuses** (> 1MB)

---

## 🐛 Troubleshooting

### Le bot ne reçoit pas les changements de config

**Vérifier** :
1. ✅ Backend est connecté à la Gateway : logs "[Backend] Backend connecté à la Gateway"
2. ✅ Bot est connecté à la Gateway : logs "[Bot] Bot connecté à la gateway"
3. ✅ GatewayClientService.notifyModuleChange() est appelé : logs "📤 Notifying module change"
4. ✅ Gateway relaie l'event : logs "📢 Relaying module:change to bots"
5. ✅ Bot reçoit l'event : logs "[Welcome] Config updated for guild..."

### Erreur "Nest can't resolve dependencies"

**Solution** : Utiliser `@Optional()` dans le constructeur :
```typescript
constructor(
  @Optional() private readonly gatewayClient?: GatewayClientService,
) {}
```

### Config pas chargée au démarrage du bot

**Vérifier** :
1. ✅ Endpoint `GET /modules/enabled/:moduleId` existe et retourne des données
2. ✅ `moduleLoader.loadAllModules()` est appelé dans `ready` event
3. ✅ Le module est bien enregistré avec `moduleLoader.register()`

---

## 📊 Performance

### Métriques

- **Latence Backend → Bot** : < 100ms (via WebSocket)
- **Overhead mémoire** : ~1KB par guild avec config
- **Coût CPU** : Négligeable (event-driven)

### Scalabilité

- **Multi-bots** : ✅ Tous les bots connectés reçoivent les updates
- **Multi-instances backend** : ✅ Chaque instance peut notifier
- **Multi-instances gateway** : ⚠️ Pas encore supporté (roadmap future)

---

## 🚀 Évolutions Futures

### Phase 1 (Actuel)
- ✅ Sync temps réel Backend → Bot
- ✅ Chargement au démarrage
- ✅ Support multi-modules

### Phase 2 (Prochain)
- 📅 Confirmation de réception (ACK)
- 📅 Retry automatique si échec
- 📅 Queue de messages si bot offline

### Phase 3 (Futur)
- 📅 Sync bidirectionnel (Bot → Backend)
- 📅 Conflict resolution
- 📅 Event sourcing complet

---

**Version** : 1.0  
**Dernière mise à jour** : 03 Novembre 2025  
**Auteur** : Team Discord Admin App