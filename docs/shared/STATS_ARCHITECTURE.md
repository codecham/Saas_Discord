# 📊 Architecture des Statistiques et Événements Discord

> **Version:** 1.0.0  
> **Dernière mise à jour:** Octobre 2025  
> **Auteur:** Équipe Dev  
> **Status:** 🚧 En développement (Phase 1)

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Philosophie et objectifs](#philosophie-et-objectifs)
3. [Architecture générale](#architecture-générale)
4. [Types d'événements](#types-dévénements)
5. [DTOs et structures de données](#dtos-et-structures-de-données)
6. [Système de batching](#système-de-batching)
7. [Flux de données complet](#flux-de-données-complet)
8. [Stockage et persistance](#stockage-et-persistance)
9. [Configuration et activation](#configuration-et-activation)
10. [Roadmap d'implémentation](#roadmap-dimplémentation)
11. [Exemples pratiques](#exemples-pratiques)
12. [Scalabilité et performance](#scalabilité-et-performance)
13. [Monitoring et debugging](#monitoring-et-debugging)

---

## 🎯 Vue d'ensemble

### Objectif

Créer un système de collecte, agrégation et stockage d'événements Discord capable de gérer **des dizaines de milliers de serveurs** tout en fournissant des statistiques temps réel et historiques pour :

- **Modération** : Historique complet des actions (bans, kicks, timeouts)
- **Activité** : Messages, vocal, réactions par membre/channel/serveur
- **Croissance** : Joins, leaves, invitations, rétention
- **Analytics** : Tableaux de bord, leaderboards, rapports

### Contraintes techniques

- ✅ **Scalable** : Architecture prête pour 50k+ serveurs
- ✅ **Performant** : Latence minimale, batch intelligent
- ✅ **Résilient** : Backup SQLite si Gateway down
- ✅ **Simple** : Code maintenable, DTOs clairs
- ✅ **Flexible** : Activation/désactivation par événement

---

## 🧠 Philosophie et objectifs

### Principes de conception

#### 1. **Simplicité avant tout**

Plutôt qu'une architecture complexe avec des types génériques imbriqués, on utilise :
- Un seul DTO : `BotEventDto` avec un champ `data: any`
- Des interfaces documentées pour chaque type de `data`
- Le typage se fait "à la main" avec des casts quand nécessaire

```typescript
// Simple et clair
const event: BotEventDto = {
  type: EventType.GUILD_BAN_ADD,
  guildId: guild.id,
  timestamp: Date.now(),
  data: { targetUserId, moderatorId, reason }  // BanEventData
};
```

#### 2. **Deux niveaux de priorité**

**Événements critiques (temps réel immédiat)** :
- Modération (bans, kicks, timeouts)
- Nouveaux membres (joins/leaves)
- Invitations utilisées
- Changements serveur

→ Envoyés **immédiatement** via le système de batch (`maxSize: 1`)

**Événements agrégés (batch périodique)** :
- Compteurs de messages
- Activité vocale
- Réactions
- Stats membres

→ Envoyés toutes les **30s-1min** en batch optimisé

#### 3. **Agrégation côté Bot**

Le Bot maintient des compteurs en mémoire et envoie des **agrégats** plutôt que chaque événement brut.

**Avantages** :
- Réduit la charge réseau (1 snapshot vs 1000 events)
- Scalable (le Bot agrège localement)
- Résilient (backup SQLite si Gateway down)

**Exemple** : Au lieu d'envoyer 1000 événements `MESSAGE_CREATE`, on envoie 1 seul `METRICS_SNAPSHOT` avec `{ total: 1000, byChannel: {...} }`

#### 4. **Activation modulaire**

Chaque type d'événement peut être activé/désactivé via configuration, permettant :
- Tests progressifs (activer un type à la fois)
- Optimisation de charge (désactiver ce qui est inutile)
- Déploiement incrémental

---

## 🏗️ Architecture générale

### Vue d'ensemble du flux

```
┌─────────────────────────────────────────────────────────────────┐
│                        Discord API                               │
│                     (Événements Discord)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BOT (SapphireJS)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Listeners Discord.js                                     │  │
│  │  - guildBanAdd.ts                                        │  │
│  │  - guildMemberAdd.ts                                     │  │
│  │  - messageCreate.ts (agrégation)                         │  │
│  │  - voiceStateUpdate.ts (agrégation)                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  MetricsCollector (en mémoire)                           │  │
│  │  - Compteurs messages/vocal/réactions                    │  │
│  │  - Par guild/channel/membre                              │  │
│  │  - Flush périodique (30s-1min)                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  EventBatcher                                            │  │
│  │  - Batch par type d'événement                            │  │
│  │  - Priorités (immédiat/2s/10s)                           │  │
│  │  - Backup SQLite si offline                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  WebSocketService                                        │  │
│  │  emit('to-backend', BotEventDto[])                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GATEWAY (NestJS)                            │
│  - Routage Backend ↔ Bots                                       │
│  - Support multi-instances                                       │
│  emit('to-backend', events)                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (NestJS)                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  BotEventHandlerService                                  │  │
│  │  switch(event.type) { ... }                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                    ┌─────────┴─────────┐                        │
│                    ▼                   ▼                         │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │  ModerationService   │  │  MetricsService      │            │
│  │  - handleBan()       │  │  - storeSnapshot()   │            │
│  │  - handleKick()      │  │  - aggregateDaily()  │            │
│  └──────────────────────┘  └──────────────────────┘            │
│                    │                   │                         │
│                    └─────────┬─────────┘                        │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              PostgreSQL                                   │  │
│  │  - moderation_logs                                        │  │
│  │  - member_stats                                           │  │
│  │  - metrics_snapshots                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Angular)                            │
│  - Dashboards                                                    │
│  - Leaderboards                                                  │
│  - Graphiques temps réel                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Composants clés

#### 1. **Bot - Collecteur**
- **Rôle** : Écouter les événements Discord, agréger, envoyer
- **Technologies** : SapphireJS, Discord.js, better-sqlite3
- **Responsabilités** :
  - Listeners Discord.js pour chaque type d'événement
  - Agrégation en mémoire (compteurs)
  - Batching intelligent avec priorités
  - Backup SQLite si Gateway offline

#### 2. **Gateway - Router**
- **Rôle** : Hub WebSocket entre Bot(s) et Backend(s)
- **Technologies** : NestJS, Socket.IO
- **Responsabilités** :
  - Gérer connexions multiples (plusieurs bots/backends)
  - Router les messages bidirectionnels
  - Support sharding futur

#### 3. **Backend - Traitement**
- **Rôle** : Traiter les événements, stocker, fournir API
- **Technologies** : NestJS, Prisma, PostgreSQL
- **Responsabilités** :
  - Parser et valider les événements
  - Logique métier (modération, stats)
  - Persistance PostgreSQL
  - API REST pour Frontend

#### 4. **Frontend - Visualisation**
- **Rôle** : Afficher dashboards et analytics
- **Technologies** : Angular 20, PrimeNG, Charts.js
- **Responsabilités** :
  - Graphiques temps réel
  - Leaderboards
  - Rapports historiques

---

## 📝 Types d'événements

### Classification des événements

Les événements sont organisés en **catégories fonctionnelles** pour faciliter la maintenance et l'activation modulaire.

#### 🚨 Catégorie 1 : Modération (Critique - Temps réel)

**Événements** :
- `GUILD_BAN_ADD` - Membre banni
- `GUILD_BAN_REMOVE` - Ban révoqué
- `GUILD_MEMBER_REMOVE` - Membre kick/leave
- `GUILD_MEMBER_ADD` - Nouveau membre
- `MESSAGE_DELETE` - Message supprimé
- `MESSAGE_DELETE_BULK` - Suppression en masse
- `GUILD_AUDIT_LOG_ENTRY_CREATE` - Logs audit (timeouts, etc.)
- `AUTO_MODERATION_ACTION_EXECUTION` - Action auto-mod Discord

**Priorité** : ⚡ **Immédiate** (maxSize: 1, maxWait: 0ms)

**Pourquoi temps réel ?**
- Actions critiques nécessitant traçabilité immédiate
- Logs d'audit pour conformité
- Notifications modérateurs temps réel (futur)

**Données stockées** :
- Qui a fait l'action (modérateur)
- Sur qui (cible)
- Quand (timestamp précis)
- Pourquoi (raison)
- Contexte (rôles, ancienneté, etc.)

---

#### 🎫 Catégorie 2 : Invitations (Important - Temps réel)

**Événements** :
- `INVITE_CREATE` - Invitation créée
- `INVITE_DELETE` - Invitation supprimée
- `INVITE_USE` - Invitation utilisée (tracking qui invite qui)

**Priorité** : ⚡ **Immédiate** (maxSize: 1, maxWait: 0ms)

**Pourquoi temps réel ?**
- Permet de tracker qui a invité qui
- Stats de recrutement par membre
- Détection d'abus (spam invites)

**Use case** :
```
Membre A crée une invite → INVITE_CREATE
Membre B utilise l'invite → INVITE_USE (lie A et B)
→ Backend sait que A a invité B
→ Stats : "Membre A a invité 5 personnes ce mois"
```

---

#### 🏢 Catégorie 3 : Serveur (Important - Temps réel)

**Événements** :
- `GUILD_SYNC` - Sync initial de tous les serveurs au démarrage bot
- `GUILD_CREATE` - Bot ajouté à un nouveau serveur
- `GUILD_DELETE` - Bot retiré d'un serveur
- `GUILD_UPDATE` - Serveur modifié (nom, icon, owner, etc.)

**Priorité** : ⚡ **Immédiate** (maxSize: 1, maxWait: 0ms)

**Pourquoi temps réel ?**
- Sync crucial pour cohérence DB
- Détection ajout/retrait bot immédiate
- Suivi des changements serveur

---

#### 📊 Catégorie 4 : Métriques agrégées (Batch périodique)

**Événements** :
- `METRICS_SNAPSHOT` - Snapshot général (messages/vocal/réactions)
- `MEMBER_ACTIVITY_SNAPSHOT` - Activité détaillée par membre

**Priorité** : 🔄 **Batch** (maxSize: 1, maxWait: 60000ms pour METRICS, 300000ms pour MEMBER_ACTIVITY)

**Pourquoi batch ?**
- Réduit drastiquement la charge réseau
- Un snapshot toutes les minutes suffit pour dashboards
- Agrégation locale dans le Bot = scalabilité

**Contenu METRICS_SNAPSHOT** :
```typescript
{
  periodStart: 1696000000000,  // Timestamp début
  periodEnd: 1696000060000,    // Timestamp fin (1 min après)
  periodDuration: 60,          // 60 secondes
  metrics: {
    messages: {
      total: 847,
      byChannel: { "ch1": 234, "ch2": 613 },
      byMember: { "user1": 45, "user2": 32 },
      topChannels: [...]
    },
    voice: {
      totalMinutes: 120,
      uniqueUsers: 12,
      byChannel: { "voice1": 80, "voice2": 40 },
      byMember: { "user1": 25, "user2": 15 },
      topChannels: [...],
      sessions: { count: 8, avgDuration: 15 }
    },
    reactions: {
      total: 234,
      byEmoji: { "👍": 120, "❤️": 114 },
      topEmojis: [...]
    },
    topActiveMembers: [
      {
        userId: "user1",
        username: "Alice",
        messages: 45,
        voiceMinutes: 25,
        reactions: 10,
        activityScore: 80
      },
      // ... top 20
    ]
  }
}
```

---

#### 📨 Catégorie 5 : Messages (Agrégation uniquement - Phase 1)

**Événements existants** :
- `MESSAGE_CREATE` - Nouveau message
- `MESSAGE_UPDATE` - Message modifié
- `MESSAGE_DELETE` - Message supprimé (déjà en temps réel si modération)
- `MESSAGE_DELETE_BULK` - Suppression masse (déjà en temps réel)

**Traitement Phase 1** :
- `MESSAGE_CREATE` → Incrémente compteur local → Inclus dans `METRICS_SNAPSHOT`
- `MESSAGE_UPDATE` → Pas tracké pour l'instant
- `MESSAGE_DELETE` → Temps réel si action modération, sinon ignoré

**Phase 2+** : Possibilité de stocker contenu pour search/modération avancée

---

#### 🎤 Catégorie 6 : Vocal (Agrégation uniquement)

**Événements existants** :
- `VOICE_CHANNEL_JOIN` - Join vocal
- `VOICE_CHANNEL_LEAVE` - Leave vocal
- `VOICE_CHANNEL_MOVE` - Changement channel
- `VOICE_MUTE/UNMUTE` - Mute par modérateur
- `VOICE_SELF_MUTE/DEAFEN` - Actions utilisateur

**Traitement Phase 1** :
- Calcul du temps passé en vocal par membre/channel
- Compteur de sessions (join/leave)
- Inclus dans `METRICS_SNAPSHOT` toutes les minutes

**Métrique clé** : `voiceMinutes` par membre/channel

---

#### 😀 Catégorie 7 : Réactions (Agrégation uniquement)

**Événements existants** :
- `MESSAGE_REACTION_ADD` - Réaction ajoutée
- `MESSAGE_REACTION_REMOVE` - Réaction retirée
- `MESSAGE_REACTION_REMOVE_ALL` - Toutes réactions retirées
- `MESSAGE_REACTION_REMOVE_EMOJI` - Emoji spécifique retiré

**Traitement Phase 1** :
- Compteur par emoji/membre
- Top emojis utilisés
- Inclus dans `METRICS_SNAPSHOT`

---

#### 🔮 Catégories futures (Phase 2-3)

**Non implémentées pour l'instant, mais déjà définies** :

**Rôles** :
- `ROLE_CREATE/DELETE/UPDATE` - Gestion rôles

**Channels** :
- `CHANNEL_CREATE/DELETE/UPDATE` - Gestion channels

**Threads** :
- `THREAD_CREATE/UPDATE/DELETE` - Gestion threads

**Emojis** :
- `EMOJI_CREATE/DELETE/UPDATE` - Emojis custom

**XP/Levels** :
- `XP_GAIN` - Gain d'XP
- `LEVEL_UP` - Montée de niveau

**Présence** :
- `PRESENCE_UPDATE` - Changement statut (online/offline)
  - ⚠️ Très verbeux, pas de stockage
  - Maintenu en cache mémoire Bot pour requêtes on-demand

---

## 📦 DTOs et structures de données

### BotEventDto - Structure de base

```typescript
/**
 * DTO générique pour tous les événements Bot → Backend
 * Toujours envoyé en array : BotEventDto[]
 */
export interface BotEventDto {
  /** Type d'événement (discriminant) */
  type: EventType;
  
  /** ID du serveur Discord (toujours présent) */
  guildId: string;
  
  /** ID utilisateur (optionnel selon événement) */
  userId?: string;
  
  /** ID channel (optionnel selon événement) */
  channelId?: string;
  
  /** ID message (optionnel selon événement) */
  messageId?: string;
  
  /** ID rôle (optionnel selon événement) */
  roleId?: string;
  
  /** Timestamp de l'événement (ms depuis epoch) */
  timestamp: number;
  
  /** 
   * Données de l'événement (structure varie selon type)
   * Voir les interfaces *EventData ci-dessous
   */
  data?: any;
}
```

**Champs optionnels** : Utilisés pour indexation/recherche rapide en DB

**Exemple** :
```typescript
// MESSAGE_DELETE a messageId, channelId, userId remplis
{
  type: EventType.MESSAGE_DELETE,
  guildId: "123...",
  userId: "456...",    // ← Auteur du message
  channelId: "789...", // ← Channel où était le message
  messageId: "abc...", // ← ID du message supprimé
  timestamp: 1696000000000,
  data: { ... }
}

// GUILD_BAN_ADD a juste userId rempli
{
  type: EventType.GUILD_BAN_ADD,
  guildId: "123...",
  userId: "456...",    // ← Membre banni
  timestamp: 1696000000000,
  data: { ... }
}
```

---

### DTOs des données (champ `data`)

Pour chaque type d'événement, une interface documente la structure attendue dans `data`.

#### Modération

##### BanEventData

```typescript
/**
 * Data pour GUILD_BAN_ADD
 */
export interface BanEventData {
  // Cible du ban
  targetUserId: string;
  targetUsername: string;
  targetDiscriminator?: string;
  targetAvatar?: string | null;
  
  // Modérateur (null si ban système/bot Discord)
  moderatorId: string | null;
  moderatorUsername?: string;
  
  // Raison
  reason?: string;
}
```

**Usage Bot** :
```typescript
const event: BotEventDto = {
  type: EventType.GUILD_BAN_ADD,
  guildId: ban.guild.id,
  userId: ban.user.id,  // Pour indexation
  timestamp: Date.now(),
  data: {
    targetUserId: ban.user.id,
    targetUsername: ban.user.username,
    moderatorId: executor?.id || null,
    moderatorUsername: executor?.username,
    reason: ban.reason
  } as BanEventData
};
```

**Usage Backend** :
```typescript
case EventType.GUILD_BAN_ADD:
  const banData = event.data as BanEventData;
  await this.prisma.moderationLog.create({
    data: {
      guildId: event.guildId,
      action: 'BAN',
      targetUserId: banData.targetUserId,
      targetUsername: banData.targetUsername,
      moderatorId: banData.moderatorId,
      reason: banData.reason,
      timestamp: new Date(event.timestamp)
    }
  });
  break;
```

##### UnbanEventData

```typescript
export interface UnbanEventData {
  targetUserId: string;
  targetUsername: string;
  moderatorId: string | null;
  moderatorUsername?: string;
}
```

##### MemberRemoveEventData

```typescript
/**
 * Data pour GUILD_MEMBER_REMOVE
 * Kick OU leave naturel (détecté via audit log)
 */
export interface MemberRemoveEventData {
  // Membre qui est parti
  userId: string;
  username: string;
  discriminator?: string;
  avatar?: string | null;
  
  // Si c'était un kick
  wasKicked: boolean;
  moderatorId?: string;
  moderatorUsername?: string;
  reason?: string;
  
  // Métadonnées pour stats
  joinedAt: string;    // Date ISO de son join original
  roles: string[];     // Rôles qu'il avait (pour analytics)
}
```

**Détection kick vs leave** :
```typescript
// Dans le listener guildMemberRemove
const auditLogs = await guild.fetchAuditLogs({
  type: AuditLogEvent.MemberKick,
  limit: 1
});

const kickLog = auditLogs.entries.first();
const wasKicked = kickLog?.target?.id === member.user.id 
                  && Date.now() - kickLog.createdTimestamp < 5000;

const data: MemberRemoveEventData = {
  userId: member.user.id,
  username: member.user.username,
  wasKicked,
  moderatorId: wasKicked ? kickLog.executor.id : undefined,
  reason: wasKicked ? kickLog.reason : undefined,
  joinedAt: member.joinedAt.toISOString(),
  roles: member.roles.cache.map(r => r.id)
};
```

##### MemberAddEventData

```typescript
/**
 * Data pour GUILD_MEMBER_ADD
 * Join d'un nouveau membre, avec tracking invite si possible
 */
export interface MemberAddEventData {
  // Nouveau membre
  userId: string;
  username: string;
  discriminator?: string;
  avatar?: string | null;
  bot: boolean;
  
  // Tracking invite (si détectable)
  inviterId?: string;
  inviterUsername?: string;
  inviteCode?: string;
}
```

**Tracking invite** :
```typescript
// Avant join : stocker les invites
const invitesBefore = await guild.invites.fetch();

// Après join : comparer
const invitesAfter = await guild.invites.fetch();
const usedInvite = invitesAfter.find(inv => {
  const before = invitesBefore.get(inv.code);
  return before && inv.uses > before.uses;
});

const data: MemberAddEventData = {
  userId: member.user.id,
  username: member.user.username,
  bot: member.user.bot,
  inviterId: usedInvite?.inviter?.id,
  inviterUsername: usedInvite?.inviter?.username,
  inviteCode: usedInvite?.code
};
```

##### MessageDeleteEventData

```typescript
export interface MessageDeleteEventData {
  messageId: string;
  channelId: string;
  
  // Auteur du message supprimé
  authorId: string;
  authorUsername: string;
  
  // Contenu (si on veut le garder pour logs)
  content?: string;
  hasAttachments: boolean;
  attachmentCount: number;
  
  // Qui a supprimé (null = auteur lui-même)
  deletedBy?: {
    userId: string;
    username: string;
  };
}
```

##### AuditLogEventData

```typescript
/**
 * Data pour GUILD_AUDIT_LOG_ENTRY_CREATE
 * Timeouts, changements rôles, etc.
 */
export interface AuditLogEventData {
  action: AuditLogAction;
  
  // Exécuteur
  executorId: string;
  executorUsername: string;
  
  // Cible
  targetId?: string;
  targetUsername?: string;
  targetType?: 'user' | 'channel' | 'role' | 'guild';
  
  // Changements détaillés
  changes?: Array<{
    key: string;
    oldValue?: any;
    newValue?: any;
  }>;
  
  // Raison
  reason?: string;
}

export enum AuditLogAction {
  MEMBER_KICK = 'MEMBER_KICK',
  MEMBER_BAN_ADD = 'MEMBER_BAN_ADD',
  MEMBER_BAN_REMOVE = 'MEMBER_BAN_REMOVE',
  MEMBER_TIMEOUT_ADD = 'MEMBER_TIMEOUT_ADD',
  MEMBER_TIMEOUT_REMOVE = 'MEMBER_TIMEOUT_REMOVE',
  MEMBER_ROLE_UPDATE = 'MEMBER_ROLE_UPDATE',
  // ...
}
```

---

#### Invitations

##### InviteCreateEventData

```typescript
export interface InviteCreateEventData {
  code: string;
  channelId: string;
  
  // Créateur
  inviterId: string;
  inviterUsername: string;
  
  // Paramètres
  maxUses: number;       // 0 = illimité
  maxAge: number;        // Secondes (0 = infini)
  temporary: boolean;
  createdAt: string;
  expiresAt?: string;    // Calculé si maxAge > 0
}
```

##### InviteUseEventData

```typescript
/**
 * Data pour INVITE_USE
 * Événement custom détecté par comparaison invites avant/après join
 */
export interface InviteUseEventData {
  code: string;
  
  // Qui a invité
  inviterId: string;
  inviterUsername: string;
  
  // Qui a rejoint
  newMemberId: string;
  newMemberUsername: string;
  
  // Stats invite
  uses: number;
  maxUses: number;
}
```

---

#### Serveur

##### GuildSyncEventData

```typescript
/**
 * Data pour GUILD_SYNC
 * Envoyé au démarrage du bot avec TOUTES les guilds
 */
export interface GuildSyncEventData {
  guilds: Array<{
    id: string;
    name: string;
    icon: string | null;
    ownerId: string;
    memberCount: number;
    features: string[];              // COMMUNITY, PARTNERED, etc.
    premiumTier: number;             // Boost level (0-3)
    premiumSubscriptionCount: number; // Nombre de boosts
  }>;
}
```

**Usage** : Sync DB au démarrage bot
```typescript
// Backend marque toutes guilds comme inactive
await prisma.guild.updateMany({ data: { isActive: false } });

// Puis upsert chaque guild du sync
for (const guild of data.guilds) {
  await prisma.guild.upsert({
    where: { guildId: guild.id },
    create: { ...guild, isActive: true },
    update: { ...guild, isActive: true }
  });
}
```

##### GuildCreateEventData

```typescript
/**
 * Data pour GUILD_CREATE
 * Bot ajouté à un nouveau serveur
 */
export interface GuildCreateEventData {
  id: string;
  name: string;
  icon: string | null;
  ownerId: string;
  memberCount: number;
  features: string[];
  premiumTier: number;
  premiumSubscriptionCount: number;
  joinedAt: string;  // Date ISO quand bot a rejoint
}
```

##### GuildUpdateEventData

```typescript
/**
 * Data pour GUILD_UPDATE
 * Changements détectés sur le serveur
 */
export interface GuildUpdateEventData {
  id: string;
  
  // Changements détectés (seulement les champs modifiés)
  changes: {
    name?: { old: string; new: string };
    icon?: { old: string | null; new: string | null };
    ownerId?: { old: string; new: string };
    memberCount?: { old: number; new: number };
    premiumTier?: { old: number; new: number };
    features?: { old: string[]; new: string[] };
  };
}
```

**Détection des changements** :
```typescript
// Dans listener guildUpdate
const changes: any = {};

if (oldGuild.name !== newGuild.name) {
  changes.name = { old: oldGuild.name, new: newGuild.name };
}
if (oldGuild.iconHash !== newGuild.iconHash) {
  changes.icon = { old: oldGuild.icon, new: newGuild.icon };
}
// ... autres champs

const data: GuildUpdateEventData = {
  id: newGuild.id,
  changes
};
```

---

#### Métriques agrégées

##### MetricsSnapshotData

```typescript
/**
 * Data pour METRICS_SNAPSHOT
 * Snapshot complet de l'activité sur une période (généralement 1 minute)
 */
export interface MetricsSnapshotData {
  // Période couverte
  periodStart: number;      // Timestamp début (ms)
  periodEnd: number;        // Timestamp fin (ms)
  periodDuration: number;   // Durée en secondes (ex: 60)
  
  // Métriques agrégées
  metrics: {
    // --- MESSAGES ---
    messages: {
      total: number;
      byChannel: Record<string, number>;  // { channelId: count }
      byMember: Record<string, number>;   // { userId: count }
      topChannels: Array<{
        channelId: string;
        channelName: string;
        count: number;
      }>;
    };
    
    // --- VOCAL ---
    voice: {
      totalMinutes: number;
      uniqueUsers: number;
      byChannel: Record<string, number>;  // { channelId: minutes }
      byMember: Record<string, number>;   // { userId: minutes }
      topChannels: Array<{
        channelId: string;
        channelName: string;
        minutes: number;
        peakUsers: number;  // Pic d'utilisateurs simultanés
      }>;
      sessions: {
        count: number;       // Nombre de joins/leaves
        avgDuration: number; // Durée moyenne en minutes
      };
    };
    
    // --- RÉACTIONS ---
    reactions: {
      total: number;
      byEmoji: Record<string, number>;    // { emoji: count }
      topEmojis: Array<{
        emoji: string;
        emojiId?: string;    // Si custom emoji
        emojiName?: string;
        count: number;
      }>;
      byMember: Record<string, number>;   // { userId: count }
    };
    
    // --- TOP MEMBRES ACTIFS ---
    topActiveMembers: Array<{
      userId: string;
      username: string;
      avatar?: string | null;
      messages: number;
      voiceMinutes: number;
      reactions: number;
      activityScore: number;  // Score combiné
      topChannels: Array<{
        channelId: string;
        channelName: string;
        messages: number;
        voiceMinutes: number;
      }>;
    }>;
  };
}
```

**Calcul du activityScore** :
```typescript
activityScore = (messages * 1) + (voiceMinutes * 0.5) + (reactions * 0.2);
```

##### MemberActivitySnapshotData

```typescript
/**
 * Data pour MEMBER_ACTIVITY_SNAPSHOT
 * Activité DÉTAILLÉE de tous les membres actifs (pas juste le top)
 * Envoyé moins fréquemment (toutes les 5-10 minutes)
 */
export interface MemberActivitySnapshotData {
  // Période couverte
  periodStart: number;
  periodEnd: number;
  periodDuration: number;
  
  // Activités de TOUS les membres actifs
  members: Array<{
    userId: string;
    username: string;
    discriminator?: string;
    avatar?: string | null;
    
    // Stats messages
    messages: {
      total: number;
      byChannel: Record<string, number>;
    };
    
    // Stats vocal
    voice: {
      totalMinutes: number;
      byChannel: Record<string, number>;
      sessions: number;  // Nombre de fois rejoint vocal
    };
    
    // Stats réactions
    reactions: {
      added: number;     // Réactions données
      received: number;  // Réactions reçues sur ses messages
    };
    
    // Méta-données
    isNewMember?: boolean;  // Rejoint pendant cette période
    firstSeen?: number;     // Timestamp première activité
    lastSeen: number;       // Timestamp dernière activité
  }>;
}
```

---

## ⚙️ Système de batching

### EventBatcher - Configuration

Le système de batch est géré par `EventBatcher` dans le Bot avec configuration par type d'événement.

```typescript
// apps/bot/src/services/eventBatcher.service.ts

enum PriorityTime {
  CRITICAL = 0,       // Envoi immédiat
  IMPORTANT = 2000,   // 2 secondes
  SLOW = 10000        // 10 secondes
}

interface BatchConfig {
  maxSize: number;    // Nombre max d'événements avant flush
  maxWait: number;    // Temps max d'attente (ms) avant flush
}

private readonly batchesConfig: Record<string, BatchConfig> = {
  // ==========================================
  // ÉVÉNEMENTS CRITIQUES - Envoi immédiat
  // ==========================================
  [EventType.GUILD_BAN_ADD]: { maxSize: 1, maxWait: PriorityTime.CRITICAL },
  [EventType.GUILD_BAN_REMOVE]: { maxSize: 1, maxWait: PriorityTime.CRITICAL },
  [EventType.GUILD_MEMBER_REMOVE]: { maxSize: 1, maxWait: PriorityTime.CRITICAL },
  [EventType.GUILD_MEMBER_ADD]: { maxSize: 1, maxWait: PriorityTime.CRITICAL },
  [EventType.MESSAGE_DELETE]: { maxSize: 1, maxWait: PriorityTime.CRITICAL },
  [EventType.MESSAGE_DELETE_BULK]: { maxSize: 1, maxWait: PriorityTime.CRITICAL },
  [EventType.GUILD_AUDIT_LOG_ENTRY_CREATE]: { maxSize: 1, maxWait: PriorityTime.CRITICAL },
  [EventType.AUTO_MODERATION_ACTION_EXECUTION]: { maxSize: 1, maxWait: PriorityTime.CRITICAL },
  
  // Invitations
  [EventType.INVITE_CREATE]: { maxSize: 1, maxWait: PriorityTime.CRITICAL },
  [EventType.INVITE_DELETE]: { maxSize: 1, maxWait: PriorityTime.CRITICAL },
  [EventType.INVITE_USE]: { maxSize: 1, maxWait: PriorityTime.CRITICAL },
  
  // Serveur
  [EventType.GUILD_SYNC]: { maxSize: 1, maxWait: PriorityTime.CRITICAL },
  [EventType.GUILD_CREATE]: { maxSize: 1, maxWait: PriorityTime.CRITICAL },
  [EventType.GUILD_DELETE]: { maxSize: 1, maxWait: PriorityTime.CRITICAL },
  [EventType.GUILD_UPDATE]: { maxSize: 1, maxWait: PriorityTime.CRITICAL },
  
  // ==========================================
  // MÉTRIQUES AGRÉGÉES - Batch périodique
  // ==========================================
  [EventType.METRICS_SNAPSHOT]: { maxSize: 1, maxWait: 60000 },  // 1 minute
  [EventType.MEMBER_ACTIVITY_SNAPSHOT]: { maxSize: 1, maxWait: 300000 },  // 5 minutes
  
  // ==========================================
  // DEFAULT (événements non critiques)
  // ==========================================
  default: { maxSize: 50, maxWait: PriorityTime.SLOW }
};
```

### Fonctionnement du batch

```typescript
public addEvent(event: BotEventDto) {
  const config = this.getConfig(event.type);
  
  // Événement critique (maxSize: 1) → Envoi immédiat
  if (config.maxSize === 1) {
    this.sendImmediately(event);
    return;
  }
  
  // Sinon, ajout au batch
  const batchKey = `${event.guildId}_${event.type}`;
  
  if (!this.batches.has(batchKey)) {
    this.batches.set(batchKey, []);
  }
  
  const batch = this.batches.get(batchKey)!;
  batch.push(event);
  
  // Flush si batch plein
  if (batch.length >= config.maxSize) {
    this.flushBatch(batchKey);
  } 
  // Ou démarrer timer si pas déjà en cours
  else if (!this.timers.has(batchKey)) {
    const timer = setTimeout(() => {
      this.flushBatch(batchKey);
    }, config.maxWait);
    
    this.timers.set(batchKey, timer);
  }
}

private sendImmediately(event: BotEventDto) {
  this.container.ws.sendToBackend([event]);  // Array avec 1 seul event
}

private flushBatch(batchKey: string) {
  const batch = this.batches.get(batchKey);
  if (!batch || batch.length === 0) return;
  
  // Clear timer
  const timer = this.timers.get(batchKey);
  if (timer) {
    clearTimeout(timer);
    this.timers.delete(batchKey);
  }
  
  // Envoyer le batch
  this.container.ws.sendToBackend(batch);
  
  // Clear batch
  this.batches.delete(batchKey);
}
```

### Backup SQLite si offline

Si la Gateway n'est pas connectée, les événements sont sauvegardés en SQLite local.

```typescript
// apps/bot/src/services/websocket.service.ts

sendToBackend(events: BotEventDto[]) {
  if (this.socket.connected) {
    this.socket.emit('to-backend', events);
  } else {
    // Sauvegarder en SQLite
    this.eventStorage.saveEvents(events);
    this.logger.warn(`Gateway offline - ${events.length} événements sauvegardés en SQLite`);
  }
}

// Lors de la reconnexion
private setupConnection() {
  this.socket.on('connect', () => {
    this.logger.info('Bot reconnecté à la gateway');
    this.isConnected = true;
    
    // Restaurer les événements en attente
    this.processPendingEvents();
  });
}

private async processPendingEvents() {
  const totalEvents = this.eventStorage.countPendingEvents();
  
  if (totalEvents === 0) return;
  
  this.logger.info(`Restauration de ${totalEvents} événements en attente`);
  
  // Traiter par batch de 50
  while (true) {
    const batch = this.eventStorage.getEventsBatch(50, 0);
    if (batch.length === 0) break;
    
    this.sendToBackend(batch);
    this.eventStorage.deleteProcessedEvents(batch.length);
  }
}
```

---

## 🔄 Flux de données complet

### Exemple 1 : Ban d'un membre (Temps réel)

```
1. Discord.js → guildBanAdd event
   ↓
2. Bot Listener (guildBanAdd.ts)
   - Récupère audit log pour trouver le modérateur
   - Crée BotEventDto avec BanEventData
   ↓
3. EventBatcher.addEvent()
   - Config: maxSize: 1 → Envoi immédiat
   ↓
4. WebSocketService.sendToBackend([event])
   - Si online: emit('to-backend')
   - Si offline: saveEvents(SQLite)
   ↓
5. Gateway reçoit
   - emit('to-backend') vers Backend
   ↓
6. Backend - BotEventHandlerService
   - switch(event.type) → case GUILD_BAN_ADD
   - Cast data as BanEventData
   ↓
7. Backend - ModerationService.handleBan()
   - Prisma.moderationLog.create(...)
   - Envoi notification Discord webhook (optionnel)
   ↓
8. PostgreSQL
   - Table moderation_logs : INSERT
   
TOTAL TIME: ~100-300ms (temps réel)
```

### Exemple 2 : Activité messages (Agrégé)

```
1. Discord.js → messageCreate event (×847 en 1 minute)
   ↓
2. Bot - MetricsCollector (en mémoire)
   - Incrémente compteur : messages[guildId][channelId]++
   - Incrémente compteur : messages[guildId][userId]++
   - Garde en RAM, PAS d'envoi immédiat
   ↓
3. Timer 60 secondes écoulé → MetricsCollector.flush()
   - Calcule totaux, tops, agrégats
   - Crée BotEventDto avec MetricsSnapshotData
   - Envoie à EventBatcher
   ↓
4. EventBatcher.addEvent()
   - Config: maxSize: 1, maxWait: 60000
   - Envoi immédiat (car 1 seul snapshot)
   ↓
5. WebSocketService.sendToBackend([snapshot])
   ↓
6. Gateway → Backend
   ↓
7. Backend - MetricsService.storeSnapshot()
   - Prisma.metricsSnapshot.create(...)
   - Mise à jour member_stats (compteurs cumulés)
   ↓
8. PostgreSQL
   - Table metrics_snapshots : INSERT (1 ligne)
   - Table member_stats : UPDATE (N lignes)
   
RÉSULTAT : 847 événements → 1 seule requête réseau, 1 snapshot en DB
```

### Exemple 3 : Invite tracking (Temps réel)

```
1. Discord.js → inviteCreate event
   ↓
2. Bot Listener (inviteCreate.ts)
   - Stocke l'invite en cache local : invitesCache.set(code, invite)
   - Crée BotEventDto avec InviteCreateEventData
   - Envoi immédiat
   ↓
3. Discord.js → guildMemberAdd event
   ↓
4. Bot Listener (guildMemberAdd.ts)
   - Fetch toutes les invites du serveur
   - Compare avec invitesCache pour trouver quelle invite a été utilisée
   - Crée BotEventDto INVITE_USE avec InviteUseEventData
   - Crée BotEventDto GUILD_MEMBER_ADD avec MemberAddEventData
   - Les deux envoyés immédiatement
   ↓
5. Backend reçoit 2 événements
   - INVITE_USE: Lie inviter → invité dans table invite_tracking
   - GUILD_MEMBER_ADD: Crée membre en DB
   ↓
6. Stats disponibles
   - "Membre X a invité 5 personnes ce mois"
   - "Top recruteurs : Membre Y (12 invites)"
```

---

## 💾 Stockage et persistance

### Schéma PostgreSQL

#### Table : moderation_logs

```sql
CREATE TABLE moderation_logs (
  id SERIAL PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  
  -- Action
  action VARCHAR(50) NOT NULL,  -- 'BAN', 'KICK', 'TIMEOUT', etc.
  
  -- Cible
  target_user_id VARCHAR(20) NOT NULL,
  target_username VARCHAR(255) NOT NULL,
  
  -- Modérateur
  moderator_id VARCHAR(20),
  moderator_username VARCHAR(255),
  
  -- Détails
  reason TEXT,
  details JSONB,  -- Données supplémentaires
  
  -- Timestamps
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Index
  INDEX idx_guild_id (guild_id),
  INDEX idx_target_user_id (target_user_id),
  INDEX idx_moderator_id (moderator_id),
  INDEX idx_timestamp (timestamp)
);
```

#### Table : member_stats

```sql
CREATE TABLE member_stats (
  id SERIAL PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  username VARCHAR(255) NOT NULL,
  
  -- Compteurs cumulés (all-time)
  total_messages BIGINT DEFAULT 0,
  total_voice_minutes BIGINT DEFAULT 0,
  total_reactions_added BIGINT DEFAULT 0,
  total_reactions_received BIGINT DEFAULT 0,
  
  -- Compteurs journaliers (reset chaque jour)
  daily_messages INTEGER DEFAULT 0,
  daily_voice_minutes INTEGER DEFAULT 0,
  daily_reactions INTEGER DEFAULT 0,
  last_daily_reset DATE DEFAULT CURRENT_DATE,
  
  -- Compteurs hebdomadaires (reset chaque semaine)
  weekly_messages INTEGER DEFAULT 0,
  weekly_voice_minutes INTEGER DEFAULT 0,
  weekly_reactions INTEGER DEFAULT 0,
  last_weekly_reset DATE DEFAULT CURRENT_DATE,
  
  -- Méta
  first_seen TIMESTAMP,
  last_seen TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Contrainte unique
  UNIQUE (guild_id, user_id),
  
  -- Index
  INDEX idx_guild_user (guild_id, user_id),
  INDEX idx_total_messages (guild_id, total_messages DESC),
  INDEX idx_total_voice (guild_id, total_voice_minutes DESC),
  INDEX idx_last_seen (guild_id, last_seen DESC)
);
```

#### Table : metrics_snapshots

```sql
CREATE TABLE metrics_snapshots (
  id SERIAL PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  
  -- Période
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  period_duration INTEGER NOT NULL,  -- Secondes
  
  -- Snapshot complet (JSONB pour flexibilité)
  data JSONB NOT NULL,
  
  -- Compteurs extraits (pour requêtes rapides)
  total_messages INTEGER,
  total_voice_minutes INTEGER,
  total_reactions INTEGER,
  unique_active_users INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Index
  INDEX idx_guild_period (guild_id, period_start DESC),
  INDEX idx_period_start (period_start)
);

-- Index GIN pour recherche dans JSONB
CREATE INDEX idx_snapshots_data_gin ON metrics_snapshots USING GIN (data);
```

#### Table : invite_tracking

```sql
CREATE TABLE invite_tracking (
  id SERIAL PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  
  -- Invite
  invite_code VARCHAR(50) NOT NULL,
  
  -- Qui a invité
  inviter_id VARCHAR(20) NOT NULL,
  inviter_username VARCHAR(255) NOT NULL,
  
  -- Qui a été invité
  invitee_id VARCHAR(20) NOT NULL,
  invitee_username VARCHAR(255) NOT NULL,
  
  -- Métadonnées
  invited_at TIMESTAMP NOT NULL,
  invite_created_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Index
  INDEX idx_guild_inviter (guild_id, inviter_id),
  INDEX idx_guild_invitee (guild_id, invitee_id),
  INDEX idx_invited_at (invited_at)
);
```

### Stratégies de rétention

#### Court terme (Hot Data) - PostgreSQL

**metrics_snapshots** : Garder 90 jours
```sql
-- Cron job quotidien
DELETE FROM metrics_snapshots 
WHERE period_start < NOW() - INTERVAL '90 days';
```

**moderation_logs** : Garder indéfiniment (audit trail)

#### Long terme (Cold Data) - Archivage S3

**Métriques anciennes** : Export vers S3 après 90 jours
```typescript
// Processus mensuel
const oldSnapshots = await prisma.metricsSnapshot.findMany({
  where: {
    periodStart: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
  }
});

// Export vers S3
await s3.putObject({
  Bucket: 'discord-stats-archive',
  Key: `snapshots/${year}/${month}/data.json.gz`,
  Body: gzip(JSON.stringify(oldSnapshots))
});

// Suppression de PostgreSQL
await prisma.metricsSnapshot.deleteMany({
  where: {
    periodStart: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
  }
});
```

---

## 🎛️ Configuration et activation

### Configuration globale

```typescript
// packages/shared-types/src/config/metrics.config.ts

export interface MetricsConfig {
  /** Fréquence d'envoi des snapshots (ms) */
  snapshotInterval: number;
  
  /** Fréquence activité membre détaillée (ms) */
  memberActivityInterval: number;
  
  /** Limites pour optimiser taille */
  maxTopMembers: number;
  maxTopChannels: number;
  maxTopEmojis: number;
  
  /** Features activation */
  trackMessages: boolean;
  trackVoice: boolean;
  trackReactions: boolean;
  trackDetailedMembers: boolean;
  trackInvites: boolean;
  trackModeration: boolean;
}

export const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  snapshotInterval: 60000,           // 1 minute
  memberActivityInterval: 300000,    // 5 minutes
  maxTopMembers: 20,
  maxTopChannels: 10,
  maxTopEmojis: 15,
  trackMessages: true,
  trackVoice: true,
  trackReactions: true,
  trackDetailedMembers: true,
  trackInvites: true,
  trackModeration: true,
};
```

### Activation par événement

```typescript
// apps/bot/src/config/listeners.config.ts

export const ENABLED_LISTENERS = {
  // Modération (Phase 1)
  [EventType.GUILD_BAN_ADD]: true,
  [EventType.GUILD_BAN_REMOVE]: true,
  [EventType.GUILD_MEMBER_REMOVE]: true,
  [EventType.GUILD_MEMBER_ADD]: true,
  [EventType.MESSAGE_DELETE]: true,
  [EventType.MESSAGE_DELETE_BULK]: true,
  [EventType.GUILD_AUDIT_LOG_ENTRY_CREATE]: false,  // ← Pas encore implémenté
  [EventType.AUTO_MODERATION_ACTION_EXECUTION]: false,
  
  // Invitations (Phase 1)
  [EventType.INVITE_CREATE]: true,
  [EventType.INVITE_DELETE]: true,
  [EventType.INVITE_USE]: true,
  
  // Serveur (Phase 1)
  [EventType.GUILD_SYNC]: true,
  [EventType.GUILD_CREATE]: true,
  [EventType.GUILD_DELETE]: true,
  [EventType.GUILD_UPDATE]: true,
  
  // Métriques (Phase 1)
  [EventType.METRICS_SNAPSHOT]: false,  // ← Pas encore implémenté
  [EventType.MEMBER_ACTIVITY_SNAPSHOT]: false,
  
  // Messages (Agrégation future)
  [EventType.MESSAGE_CREATE]: true,  // Pour l'instant juste un listener basique
  [EventType.MESSAGE_UPDATE]: false,
  
  // Vocal (Agrégation future)
  [EventType.VOICE_CHANNEL_JOIN]: false,
  [EventType.VOICE_CHANNEL_LEAVE]: false,
  
  // Réactions (Agrégation future)
  [EventType.MESSAGE_REACTION_ADD]: false,
  [EventType.MESSAGE_REACTION_REMOVE]: false,
  
  // Phase 2-3
  [EventType.XP_GAIN]: false,
  [EventType.LEVEL_UP]: false,
};

// Helper pour vérifier si un listener est activé
export function isListenerEnabled(type: EventType): boolean {
  return ENABLED_LISTENERS[type] ?? false;
}
```

### Utilisation dans les listeners

```typescript
// apps/bot/src/listeners/moderation/guildBanAdd.ts

import { isListenerEnabled } from '../../config/listeners.config';

@ApplyOptions<Listener.Options>({
  event: 'guildBanAdd',
  enabled: isListenerEnabled(EventType.GUILD_BAN_ADD)  // ← Activation conditionnelle
})
export class GuildBanAddListener extends Listener {
  public override async run(ban: GuildBan) {
    // Logique du listener
  }
}
```

---

## 🗺️ Roadmap d'implémentation

### Phase 1 - MVP (4-6 semaines)

#### Semaine 1-2 : Modération

**Objectif** : Tracking complet des actions de modération

**Tâches** :
- [ ] Créer table `moderation_logs` (Prisma migration)
- [ ] Listener `guildBanAdd.ts`
  - Récupérer audit log pour trouver modérateur
  - Créer BotEventDto avec BanEventData
  - Tester avec ban manuel
- [ ] Listener `guildBanRemove.ts`
- [ ] Listener `guildMemberRemove.ts`
  - Détecter kick vs leave via audit log
  - Récupérer rôles et joinedAt du membre
- [ ] Backend handler `handleBan()`
  - INSERT dans moderation_logs
  - Tests unitaires
- [ ] Backend handler `handleKick()`
- [ ] Backend handler `handleMemberRemove()`

**Livrable** : Historique modération fonctionnel, testable dans 1 serveur de dev

---

#### Semaine 3 : Invitations

**Objectif** : Tracker qui invite qui

**Tâches** :
- [ ] Créer table `invite_tracking`
- [ ] Service `InviteTracker` dans Bot
  - Cache des invites par guild
  - Méthode `detectUsedInvite()`
- [ ] Listener `inviteCreate.ts`
  - Ajouter invite au cache
  - Envoyer event
- [ ] Listener `inviteDelete.ts`
  - Retirer invite du cache
- [ ] Modifier `guildMemberAdd.ts`
  - Appeler `detectUsedInvite()`
  - Envoyer event INVITE_USE
- [ ] Backend handler `handleInviteUse()`
  - INSERT dans invite_tracking
- [ ] Endpoint API `GET /guilds/:id/invite-stats`
  - Top recruteurs
  - Invites actives

**Livrable** : Stats d'invitation fonctionnelles

---

#### Semaine 4 : Agrégation messages/vocal

**Objectif** : Première version metrics snapshot

**Tâches** :
- [ ] Créer `MetricsCollector` service dans Bot
  - Compteurs en mémoire (Map)
  - Timer flush 60s
  - Méthode `incrementMessage(guild, channel, user)`
  - Méthode `trackVoiceSession(guild, channel, user, duration)`
  - Méthode `flush()` → génère MetricsSnapshotData
- [ ] Modifier listener `messageCreate.ts`
  - Appeler `metricsCollector.incrementMessage()`
- [ ] Créer listener `voiceStateUpdate.ts`
  - Détecter join/leave
  - Calculer durée session
  - Appeler `metricsCollector.trackVoiceSession()`
- [ ] Créer table `metrics_snapshots`
- [ ] Créer table `member_stats`
- [ ] Backend handler `handleMetricsSnapshot()`
  - INSERT snapshot
  - UPDATE member_stats (cumul)
- [ ] Tests avec messages et vocal sur serveur dev

**Livrable** : Compteurs messages/vocal fonctionnels

---

#### Semaine 5 : Dashboard Frontend

**Objectif** : Première visualisation

**Tâches** :
- [ ] Backend endpoint `GET /guilds/:id/stats/overview`
  - Nombre total messages/vocal today/week/month
  - Top channels actifs
  - Top membres actifs
- [ ] Backend endpoint `GET /guilds/:id/moderation/recent`
  - Dernières 50 actions de modération
- [ ] Frontend component `GuildDashboardComponent`
  - Cards avec stats principales
  - Graph activité (Chart.js)
  - Tableau modération récente
- [ ] Frontend component `LeaderboardComponent`
  - Top messages
  - Top vocal
  - Top activité globale

**Livrable** : Dashboard fonctionnel avec données réelles

---

#### Semaine 6 : Polish & Tests

**Tâches** :
- [ ] Tests end-to-end complet
- [ ] Gestion erreurs et edge cases
- [ ] Documentation utilisateur
- [ ] Optimisation requêtes DB (index, explain)
- [ ] Déploiement staging
- [ ] Tests charge (1000 messages/min sur 1 serveur)

**Livrable** : MVP prêt pour beta test sur 5-10 serveurs

---

### Phase 2 - Scaling (2-3 mois)

#### Objectifs

- Réactions tracking
- Member activity snapshot détaillé
- Sharding bot (support 2500+ serveurs)
- Optimisation DB (partitioning, archivage)
- WebSocket Frontend (stats temps réel)
- API publique pour devs

---

### Phase 3 - Features avancées (3-6 mois)

#### Objectifs

- Système XP/Levels complet
- Auto-modération intelligente
- Prédictions et analytics avancés
- ML pour détection comportements
- Rapports automatiques
- Intégrations tierces (webhooks)

---

## 💡 Exemples pratiques

### Exemple 1 : Créer un listener de modération

```typescript
// apps/bot/src/listeners/moderation/guildBanAdd.ts

import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { GuildBan, AuditLogEvent } from 'discord.js';
import { BotEventDto, EventType, BanEventData } from '@my-project/shared-types';

@ApplyOptions<Listener.Options>({
  event: 'guildBanAdd'
})
export class GuildBanAddListener extends Listener {
  public override async run(ban: GuildBan) {
    try {
      // Récupérer l'audit log pour trouver qui a ban
      const auditLogs = await ban.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberBanAdd,
        limit: 1
      });
      
      const banLog = auditLogs.entries.first();
      
      // Vérifier que c'est bien le bon ban (< 5 secondes)
      const isRecentBan = banLog?.target?.id === ban.user.id 
        && Date.now() - banLog.createdTimestamp < 5000;
      
      // Créer les données du ban
      const data: BanEventData = {
        targetUserId: ban.user.id,
        targetUsername: ban.user.username,
        targetDiscriminator: ban.user.discriminator,
        targetAvatar: ban.user.avatar,
        moderatorId: isRecentBan ? banLog.executor?.id || null : null,
        moderatorUsername: isRecentBan ? banLog.executor?.username : undefined,
        reason: ban.reason || undefined
      };
      
      // Créer l'événement
      const event: BotEventDto = {
        type: EventType.GUILD_BAN_ADD,
        guildId: ban.guild.id,
        userId: ban.user.id,  // Pour indexation
        timestamp: Date.now(),
        data
      };
      
      // Envoyer via EventBatcher (envoi immédiat car maxSize: 1)
      this.container.eventBatcher.addEvent(event);
      
      this.container.logger.info(
        `Ban détecté: ${ban.user.username} sur ${ban.guild.name} par ${data.moderatorUsername || 'Système'}`
      );
      
    } catch (error) {
      this.container.logger.error('Erreur listener guildBanAdd:', error);
    }
  }
}
```

### Exemple 2 : Créer un MetricsCollector

```typescript
// apps/bot/src/services/metricsCollector.service.ts

import { container } from '@sapphire/framework';
import { BotEventDto, EventType, MetricsSnapshotData } from '@my-project/shared-types';

interface GuildMetrics {
  messages: Map<string, Map<string, number>>;  // channelId -> userId -> count
  voice: Map<string, Map<string, number>>;     // channelId -> userId -> minutes
  reactions: Map<string, number>;               // emoji -> count
  lastFlush: number;
}

export class MetricsCollector {
  private metrics = new Map<string, GuildMetrics>();
  private flushInterval = 60000;  // 1 minute
  private timers = new Map<string, NodeJS.Timeout>();
  
  constructor() {
    container.logger.info('MetricsCollector initialized');
  }
  
  /**
   * Enregistrer un message
   */
  incrementMessage(guildId: string, channelId: string, userId: string) {
    const metrics = this.getOrCreateMetrics(guildId);
    
    if (!metrics.messages.has(channelId)) {
      metrics.messages.set(channelId, new Map());
    }
    
    const channelMessages = metrics.messages.get(channelId)!;
    channelMessages.set(userId, (channelMessages.get(userId) || 0) + 1);
    
    // Démarrer timer flush si pas déjà actif
    this.ensureFlushTimer(guildId);
  }
  
  /**
   * Enregistrer une session vocale
   */
  trackVoiceSession(guildId: string, channelId: string, userId: string, durationMinutes: number) {
    const metrics = this.getOrCreateMetrics(guildId);
    
    if (!metrics.voice.has(channelId)) {
      metrics.voice.set(channelId, new Map());
    }
    
    const channelVoice = metrics.voice.get(channelId)!;
    channelVoice.set(userId, (channelVoice.get(userId) || 0) + durationMinutes);
    
    this.ensureFlushTimer(guildId);
  }
  
  /**
   * Enregistrer une réaction
   */
  trackReaction(guildId: string, emoji: string) {
    const metrics = this.getOrCreateMetrics(guildId);
    metrics.reactions.set(emoji, (metrics.reactions.get(emoji) || 0) + 1);
    this.ensureFlushTimer(guildId);
  }
  
  /**
   * Flush les métriques d'une guild
   */
  private flushGuild(guildId: string) {
    const metrics = this.metrics.get(guildId);
    if (!metrics) return;
    
    const now = Date.now();
    const periodStart = metrics.lastFlush;
    const periodEnd = now;
    
    // Générer le snapshot
    const snapshot = this.generateSnapshot(guildId, metrics, periodStart, periodEnd);
    
    // Créer l'événement
    const event: BotEventDto = {
      type: EventType.METRICS_SNAPSHOT,
      guildId,
      timestamp: now,
      data: snapshot
    };
    
    // Envoyer via EventBatcher
    container.eventBatcher.addEvent(event);
    
    container.logger.debug(
      `Snapshot envoyé pour guild ${guildId}: ${snapshot.metrics.messages.total} messages`
    );
    
    // Reset metrics
    this.metrics.delete(guildId);
    this.timers.delete(guildId);
  }
  
  /**
   * Générer le snapshot de données
   */
  private generateSnapshot(
    guildId: string,
    metrics: GuildMetrics,
    periodStart: number,
    periodEnd: number
  ): MetricsSnapshotData {
    // Calculer totaux messages
    let totalMessages = 0;
    const messagesByChannel: Record<string, number> = {};
    const messagesByMember: Record<string, number> = {};
    
    for (const [channelId, users] of metrics.messages.entries()) {
      let channelTotal = 0;
      for (const [userId, count] of users.entries()) {
        channelTotal += count;
        messagesByMember[userId] = (messagesByMember[userId] || 0) + count;
      }
      messagesByChannel[channelId] = channelTotal;
      totalMessages += channelTotal;
    }
    
    // Top channels messages
    const topChannels = Object.entries(messagesByChannel)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([channelId, count]) => ({
        channelId,
        channelName: this.getChannelName(guildId, channelId),
        count
      }));
    
    // Calculer totaux vocal
    let totalVoiceMinutes = 0;
    const voiceByChannel: Record<string, number> = {};
    const voiceByMember: Record<string, number> = {};
    
    for (const [channelId, users] of metrics.voice.entries()) {
      let channelTotal = 0;
      for (const [userId, minutes] of users.entries()) {
        channelTotal += minutes;
        voiceByMember[userId] = (voiceByMember[userId] || 0) + minutes;
      }
      voiceByChannel[channelId] = channelTotal;
      totalVoiceMinutes += channelTotal;
    }
    
    // Calculer totaux réactions
    const totalReactions = Array.from(metrics.reactions.values())
      .reduce((sum, count) => sum + count, 0);
    
    const reactionsByEmoji: Record<string, number> = {};
    for (const [emoji, count] of metrics.reactions.entries()) {
      reactionsByEmoji[emoji] = count;
    }
    
    const topEmojis = Object.entries(reactionsByEmoji)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([emoji, count]) => ({ emoji, count }));
    
    // Top membres actifs (score combiné)
    const memberScores = new Map<string, { messages: number; voice: number; reactions: number }>();
    
    for (const [userId, messages] of Object.entries(messagesByMember)) {
      memberScores.set(userId, {
        messages,
        voice: voiceByMember[userId] || 0,
        reactions: 0  // TODO: tracker réactions par membre
      });
    }
    
    const topActiveMembers = Array.from(memberScores.entries())
      .map(([userId, stats]) => {
        const activityScore = (stats.messages * 1) + (stats.voice * 0.5);
        return {
          userId,
          username: this.getUserName(guildId, userId),
          avatar: this.getUserAvatar(guildId, userId),
          messages: stats.messages,
          voiceMinutes: stats.voice,
          reactions: stats.reactions,
          activityScore,
          topChannels: []  // TODO: calculer top channels par membre
        };
      })
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 20);
    
    // Construire le snapshot
    const snapshot: MetricsSnapshotData = {
      periodStart,
      periodEnd,
      periodDuration: Math.floor((periodEnd - periodStart) / 1000),
      metrics: {
        messages: {
          total: totalMessages,
          byChannel: messagesByChannel,
          byMember: messagesByMember,
          topChannels
        },
        voice: {
          totalMinutes: totalVoiceMinutes,
          uniqueUsers: Object.keys(voiceByMember).length,
          byChannel: voiceByChannel,
          byMember: voiceByMember,
          topChannels: [],  // TODO
          sessions: { count: 0, avgDuration: 0 }  // TODO
        },
        reactions: {
          total: totalReactions,
          byEmoji: reactionsByEmoji,
          topEmojis,
          byMember: {}  // TODO
        },
        topActiveMembers
      }
    };
    
    return snapshot;
  }
  
  private getOrCreateMetrics(guildId: string): GuildMetrics {
    if (!this.metrics.has(guildId)) {
      this.metrics.set(guildId, {
        messages: new Map(),
        voice: new Map(),
        reactions: new Map(),
        lastFlush: Date.now()
      });
    }
    return this.metrics.get(guildId)!;
  }
  
  private ensureFlushTimer(guildId: string) {
    if (this.timers.has(guildId)) return;
    
    const timer = setTimeout(() => {
      this.flushGuild(guildId);
    }, this.flushInterval);
    
    this.timers.set(guildId, timer);
  }
  
  private getChannelName(guildId: string, channelId: string): string {
    const guild = container.client.guilds.cache.get(guildId);
    const channel = guild?.channels.cache.get(channelId);
    return channel?.name || 'unknown';
  }
  
  private getUserName(guildId: string, userId: string): string {
    const guild = container.client.guilds.cache.get(guildId);
    const member = guild?.members.cache.get(userId);
    return member?.user.username || 'unknown';
  }
  
  private getUserAvatar(guildId: string, userId: string): string | null {
    const guild = container.client.guilds.cache.get(guildId);
    const member = guild?.members.cache.get(userId);
    return member?.user.avatar || null;
  }
}
```

### Exemple 3 : Handler Backend

```typescript
// apps/backend/src/modules/gateway/services/bot-event-handler.service.ts

async processEvent(event: BotEventDto): Promise<void> {
  try {
    switch (event.type) {
      case EventType.GUILD_BAN_ADD:
        await this.handleBan(event);
        break;
        
      case EventType.METRICS_SNAPSHOT:
        await this.handleMetricsSnapshot(event);
        break;
        
      // ... autres cases
        
      default:
        this.logger.warn(`Événement non géré: ${event.type}`);
    }
  } catch (error) {
    this.logger.error(`Erreur traitement événement ${event.type}:`, error);
    throw error;
  }
}

private async handleBan(event: BotEventDto): Promise<void> {
  const data = event.data as BanEventData;
  
  await this.prisma.moderationLog.create({
    data: {
      guildId: event.guildId,
      action: 'BAN',
      targetUserId: data.targetUserId,
      targetUsername: data.targetUsername,
      moderatorId: data.moderatorId,
      moderatorUsername: data.moderatorUsername,
      reason: data.reason,
      details: data,  // JSONB avec toutes les données
      timestamp: new Date(event.timestamp)
    }
  });
  
  this.logger.log(`Ban enregistré: ${data.targetUsername} sur guild ${event.guildId}`);
}

private async handleMetricsSnapshot(event: BotEventDto): Promise<void> {
  const data = event.data as MetricsSnapshotData;
  
  // 1. Sauvegarder le snapshot complet
  await this.prisma.metricsSnapshot.create({
    data: {
      guildId: event.guildId,
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
      periodDuration: data.periodDuration,
      data: data as any,  // JSONB
      totalMessages: data.metrics.messages.total,
      totalVoiceMinutes: data.metrics.voice.totalMinutes,
      totalReactions: data.metrics.reactions.total,
      uniqueActiveUsers: data.metrics.topActiveMembers.length
    }
  });
  
  // 2. Mettre à jour les stats cumulées des membres
  for (const member of data.metrics.topActiveMembers) {
    await this.prisma.memberStats.upsert({
      where: {
        guildId_userId: {
          guildId: event.guildId,
          userId: member.userId
        }
      },
      create: {
        guildId: event.guildId,
        userId: member.userId,
        username: member.username,
        totalMessages: member.messages,
        totalVoiceMinutes: member.voiceMinutes,
        totalReactionsAdded: member.reactions,
        dailyMessages: member.messages,
        dailyVoiceMinutes: member.voiceMinutes,
        firstSeen: new Date(event.timestamp),
        lastSeen: new Date(event.timestamp)
      },
      update: {
        username: member.username,
        totalMessages: { increment: member.messages },
        totalVoiceMinutes: { increment: member.voiceMinutes },
        totalReactionsAdded: { increment: member.reactions },
        dailyMessages: { increment: member.messages },
        dailyVoiceMinutes: { increment: member.voiceMinutes },
        lastSeen: new Date(event.timestamp)
      }
    });
  }
  
  this.logger.log(
    `Snapshot enregistré pour guild ${event.guildId}: ${data.metrics.messages.total} messages`
  );
}
```

---

## 🚀 Scalabilité et performance

### Stratégies de scaling

#### 1. Sharding Bot Discord

**Quand ?** Au-delà de 2500 serveurs (limite Discord)

```typescript
// apps/bot/src/index-sharded.ts

import { ShardingManager } from 'discord.js';

const manager = new ShardingManager('./dist/index.js', {
  token: process.env.DISCORD_TOKEN,
  totalShards: 'auto'  // Discord calcule automatiquement
});

manager.on('shardCreate', shard => {
  console.log(`Shard ${shard.id} lancé`);
  
  // Chaque shard se connecte à la Gateway avec un botId unique
  shard.on('spawn', () => {
    shard.send({
      type: 'SET_BOT_ID',
      botId: `bot-shard-${shard.id}`
    });
  });
});

manager.spawn();
```

**Impact sur l'architecture** :
- Chaque shard = 1 connexion WebSocket à la Gateway
- La Gateway route les messages selon `botId`
- Le Backend ne voit pas la différence (reçoit juste plus d'événements)

#### 2. Partitioning PostgreSQL

**Quand ?** Au-delà de 10 000 serveurs

```sql
-- Partitionner metrics_snapshots par mois
CREATE TABLE metrics_snapshots (
  id SERIAL,
  guild_id VARCHAR(20) NOT NULL,
  period_start TIMESTAMP NOT NULL,
  -- ... autres colonnes
) PARTITION BY RANGE (period_start);

-- Partitions mensuelles
CREATE TABLE metrics_snapshots_2025_01 PARTITION OF metrics_snapshots
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE metrics_snapshots_2025_02 PARTITION OF metrics_snapshots
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

**Avantages** :
- Requêtes plus rapides (scan que la partition nécessaire)
- Suppression facile des anciennes données (DROP PARTITION)
- Meilleure gestion des index

#### 3. Cache Redis

**Pour quoi ?**
- Top leaderboards (TTL 5 minutes)
- Stats dashboard (TTL 1 minute)
- Member stats fréquemment consultés

```typescript
// Backend endpoint avec cache
async getGuildOverview(guildId: string) {
  const cacheKey = `guild:${guildId}:overview`;
  
  // Vérifier cache
  const cached = await this.redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Calculer depuis DB
  const overview = await this.calculateOverview(guildId);
  
  // Mettre en cache (5 min)
  await this.redis.setex(cacheKey, 300, JSON.stringify(overview));
  
  return overview;
}
```

#### 4. Queue asynchrone

**Pour quoi ?** Traitement des snapshots lourds

```typescript
// Backend avec Bull queue

import Bull from 'bull';

const metricsQueue = new Bull('metrics-processing', {
  redis: { host: 'localhost', port: 6379 }
});

// Producer : Ajouter à la queue au lieu de traiter immédiatement
async handleMetricsSnapshot(event: BotEventDto) {
  await metricsQueue.add('process-snapshot', event);
}

// Consumer : Traiter en background
metricsQueue.process('process-snapshot', async (job) => {
  const event = job.data as BotEventDto;
  const data = event.data as MetricsSnapshotData;
  
  // Traitement lourd ici
  await this.storeSnapshot(data);
  await this.updateMemberStats(data);
});
```

### Métriques de performance cibles

| Métrique | Objectif | Critique |
|----------|----------|----------|
| Latence événement critique | < 300ms | < 1s |
| Latence snapshot | < 2s | < 5s |
| Throughput événements | 1000/s | 100/s |
| Charge CPU Bot | < 30% | < 70% |
| RAM Bot | < 512MB | < 2GB |
| Requêtes DB/s | < 100 | < 500 |
| Cache hit rate | > 80% | > 50% |

### Tests de charge

```typescript
// Script de test de charge

import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  socket.emit('register', {
    type: 'bot',
    botId: 'load-test-bot',
    botName: 'Load Test'
  });
  
  // Envoyer 1000 événements
  const events = [];
  for (let i = 0; i < 1000; i++) {
    events.push({
      type: EventType.MESSAGE_CREATE,
      guildId: 'test-guild',
      userId: `user-${i % 100}`,
      channelId: `channel-${i % 10}`,
      timestamp: Date.now(),
      data: { content: `Test message ${i}` }
    });
  }
  
  console.time('batch-1000');
  socket.emit('to-backend', events);
  
  socket.on('backend-ack', () => {
    console.timeEnd('batch-1000');
  });
});
```

---

## 🔍 Monitoring et debugging

### Logs structurés

```typescript
// apps/bot/src/services/metricsCollector.service.ts

this.logger.info({
  component: 'MetricsCollector',
  action: 'snapshot_sent',
  guildId,
  metrics: {
    messages: snapshot.metrics.messages.total,
    voiceMinutes: snapshot.metrics.voice.totalMinutes,
    reactions: snapshot.metrics.reactions.total
  },
  periodDuration: snapshot.periodDuration
});
```

### Health checks

```typescript
// apps/backend/src/health/health.controller.ts

@Get('health')
async check() {
  return {
    status: 'ok',
    timestamp: Date.now(),
    services: {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      gateway: await this.checkGateway()
    },
    metrics: {
      eventsProcessed: this.eventCounter.getTotal(),
      eventsPerSecond: this.eventCounter.getRate(),
      avgProcessingTime: this.eventCounter.getAvgTime()
    }
  };
}
```

### Alertes

```typescript
// Alertes Sentry pour erreurs critiques

if (event.type === EventType.GUILD_BAN_ADD && !data.moderatorId) {
  Sentry.captureMessage('Ban sans modérateur détecté', {
    level: 'warning',
    extra: { guildId: event.guildId, event }
  });
}

if (processingTime > 5000) {
  Sentry.captureMessage('Traitement événement trop lent', {
    level: 'error',
    extra: { type: event.type, duration: processingTime }
  });
}
```

### Dashboard Grafana

**Métriques clés** :
- Événements reçus/s (par type)
- Latence traitement
- Taille queue
- Erreurs/s
- Cache hit rate
- Connexions Gateway actives
- DB query time

---

## 📚 Ressources et références

### Documentation Discord

- [Discord.js Guide](https://discordjs.guide/)
- [Discord API Events](https://discord.com/developers/docs/topics/gateway-events)
- [Audit Logs](https://discord.com/developers/docs/resources/audit-log)
- [Gateway Intents](https://discord.com/developers/docs/topics/gateway#gateway-intents)

### Technologies utilisées

- [SapphireJS](https://www.sapphirejs.dev/) - Framework bot
- [NestJS](https://docs.nestjs.com/) - Backend framework
- [Prisma](https://www.prisma.io/docs) - ORM
- [Socket.IO](https://socket.io/docs/) - WebSocket
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQLite

### Best practices

- [PostgreSQL Performance](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

---

## 🎓 Glossaire

**Agrégation** : Processus de regroupement de plusieurs événements en un résumé statistique

**Batch** : Groupe d'événements envoyés ensemble pour optimiser les performances

**DTO (Data Transfer Object)** : Structure de données pour transférer l'information entre services

**Event** : Action Discord (message, ban, etc.) capturée par le bot

**Flush** : Action d'envoyer les données accumulées en mémoire

**Guild** : Terme Discord pour "serveur"

**Hot Data** : Données récentes et fréquemment accédées

**Listener** : Code qui réagit à un événement Discord spécifique

**Metrics** : Mesures quantitatives de l'activité (compteurs, durées, etc.)

**Partitioning** : Division d'une table DB en sous-tables pour performance

**Sharding** : Division du bot en plusieurs instances pour gérer plus de serveurs

**Snapshot** : Capture de l'état à un moment donné

**Throttling** : Limitation du débit pour éviter la surcharge

---

## ✅ Checklist de déploiement

### Pré-production

- [ ] Tous les listeners Phase 1 implémentés et testés
- [ ] EventBatcher configuré avec bonnes priorités
- [ ] Backup SQLite fonctionnel et testé
- [ ] Schéma DB créé avec migrations Prisma
- [ ] Handlers Backend pour tous les événements Phase 1
- [ ] Tests unitaires (>80% coverage)
- [ ] Tests end-to-end sur serveur dev
- [ ] Documentation code complète
- [ ] Logs structurés partout
- [ ] Health checks endpoints
- [ ] Monitoring Sentry configuré

### Production

- [ ] Variables d'environnement configurées
- [ ] PostgreSQL optimisé (index, pooling)
- [ ] Redis configuré
- [ ] Gateway déployée et accessible
- [ ] Bot déployé avec PM2
- [ ] Backend déployé avec PM2
- [ ] Nginx reverse proxy configuré
- [ ] SSL/TLS activé
- [ ] Firewall configuré
- [ ] Backups DB automatiques
- [ ] Logs centralisés (ELK/Datadog)
- [ ] Alertes configurées (PagerDuty/Opsgenie)
- [ ] Documentation déploiement à jour

### Post-déploiement

- [ ] Tests fumée (smoke tests)
- [ ] Monitoring 24h surveillance
- [ ] Analyse logs erreurs
- [ ] Métriques performance validées
- [ ] Beta test avec 5-10 serveurs
- [ ] Feedback utilisateurs collecté
- [ ] Plan scale-up documenté

---
