# 🎯 BOT EVENTS ROADMAP - Configuration & Listeners

## 📌 Objectif

Mettre en place une **base solide et scalable** pour le bot Discord en capturant tous les événements Discord disponibles avec :
- ✅ Un système de configuration simple et évolutif
- ✅ Des listeners standardisés pour chaque événement
- ✅ Une extraction complète des données sans logique métier
- ✅ Une transmission automatique via EventBatcher

---

## 🏗️ Phase 0 : Infrastructure & Configuration ✅ TERMINÉE

### ✅ Tâches préparatoires (COMPLÉTÉES)

#### 1. Système de configuration des listeners ✅

**Fichier** : `apps/bot/src/config/listeners.config.ts`

✅ **Créé** - Le fichier de configuration contient :
- Interface `ListenerConfig` 
- Objet `LISTENERS_CONFIG` avec tous les événements
- Fonction `isListenerEnabled()` pour vérification en 1 ligne
- Configuration de tous les 51 listeners
- Système évolutif pour migration future vers DB

**Pourquoi cette approche ?**
- ✅ **Simple** : Un seul fichier de config
- ✅ **Évolutif** : Facile à migrer vers une config DB par guild plus tard
- ✅ **Centralisé** : Toute la config au même endroit
- ✅ **Type-safe** : TypeScript vérifie les noms d'événements
- ✅ **Une ligne** : Vérification en 1 ligne dans chaque listener

---

#### 2. Mise à jour du container Sapphire ✅

**Fichier** : `apps/bot/src/lib/types/augment.d.ts`

✅ **À vérifier/créer si inexistant** :

```typescript
import { EventBatcher } from '../services/eventBatcher.service';
import { WebSocketService } from '../services/websocket.service';

declare module '@sapphire/pieces' {
  interface Container {
    ws: WebSocketService;
    eventBatcher: EventBatcher;
    // Futurs services à ajouter ici
  }
}
```

---

#### 3. Nettoyage du fichier BotEventDto ✅

**Fichier** : `packages/shared-types/src/dtos/events/botEvent.dto.ts`

✅ **Nettoyé** - Le fichier contient maintenant uniquement :
- Interface `BotEventDto` de base
- Section commentée pour les futures interfaces `*EventData`

**Note** : Les interfaces `*EventData` seront recréées au fur et à mesure lors de la phase 1.

---

#### 4. Structure des dossiers listeners ✅

**Nouveau tree structure** :

```
apps/bot/src/listeners/
├── messages/
│   ├── messageCreate.ts ✅ EXISTANT
│   ├── messageUpdate.ts
│   ├── messageDelete.ts
│   └── messageDeleteBulk.ts
├── members/
│   ├── guildMemberAdd.ts
│   ├── guildMemberRemove.ts
│   └── guildMemberUpdate.ts
├── moderation/
│   ├── guildBanAdd.ts
│   ├── guildBanRemove.ts
│   ├── guildAuditLogEntryCreate.ts
│   └── autoModerationActionExecution.ts
├── reactions/
│   ├── messageReactionAdd.ts
│   ├── messageReactionRemove.ts
│   ├── messageReactionRemoveAll.ts
│   └── messageReactionRemoveEmoji.ts
├── voice/
│   └── voiceStateUpdate.ts
├── channels/
│   ├── channelCreate.ts
│   ├── channelUpdate.ts
│   ├── channelDelete.ts
│   └── channelPinsUpdate.ts
├── roles/
│   ├── roleCreate.ts
│   ├── roleUpdate.ts
│   └── roleDelete.ts
├── invites/
│   ├── inviteCreate.ts
│   └── inviteDelete.ts
├── threads/
│   ├── threadCreate.ts
│   ├── threadUpdate.ts
│   ├── threadDelete.ts
│   └── threadMembersUpdate.ts
├── emojis/
│   ├── emojiCreate.ts
│   ├── emojiUpdate.ts
│   └── emojiDelete.ts
├── stickers/
│   ├── guildStickerCreate.ts
│   ├── guildStickerUpdate.ts
│   └── guildStickerDelete.ts
├── scheduled-events/
│   ├── guildScheduledEventCreate.ts
│   ├── guildScheduledEventUpdate.ts
│   ├── guildScheduledEventDelete.ts
│   ├── guildScheduledEventUserAdd.ts
│   └── guildScheduledEventUserRemove.ts
├── webhooks/
│   └── webhooksUpdate.ts
├── stage/
│   ├── stageInstanceCreate.ts
│   ├── stageInstanceUpdate.ts
│   └── stageInstanceDelete.ts
├── integrations/
│   ├── guildIntegrationsUpdate.ts
│   ├── integrationCreate.ts
│   ├── integrationUpdate.ts
│   └── integrationDelete.ts
├── user/
│   ├── userUpdate.ts
│   ├── presenceUpdate.ts (désactivé par défaut)
│   └── typingStart.ts (désactivé par défaut)
├── interactions/
│   └── interactionCreate.ts
├── automod/
│   ├── autoModerationRuleCreate.ts
│   ├── autoModerationRuleUpdate.ts
│   └── autoModerationRuleDelete.ts
├── guild/ (existant - ne pas toucher)
│   ├── guildCreate.ts ✅ DÉJÀ FAIT
│   ├── guildUpdate.ts ✅ DÉJÀ FAIT
│   └── guildDelete.ts ✅ DÉJÀ FAIT
└── ready.ts ✅ DÉJÀ FAIT
```

✅ **Dossiers à créer** pour organiser les nouveaux listeners

---

#### 5. Template standardisé ✅

✅ **Créé** - Template de listener avec :
- Import des dépendances nécessaires
- Vérification de configuration en 1 ligne
- Extraction des données
- Envoi via `eventBatcher.addEvent(event)`
- Exemple concret avec MESSAGE_UPDATE

---

## 📋 Phase 1 : Événements de base (Priorité haute)

### 🟢 Catégorie 1 : Messages (4 listeners)

#### ✅ MESSAGE_CREATE (déjà fait - à vérifier)
- **Fichier** : `apps/bot/src/listeners/messages/messageCreate.ts`
- **EventData** : `MessageCreateEventData`
- **Champs BotEventDto** : `guildId`, `userId`, `channelId`, `messageId`, `data`
- **Status** : ✅ Déjà existant - vérifier la config

#### MESSAGE_UPDATE
- **Fichier** : `apps/bot/src/listeners/messages/messageUpdate.ts`
- **Event Discord.js** : `messageUpdate`
- **EventData** : `MessageUpdateEventData`
- **Champs BotEventDto** : `guildId`, `userId`, `channelId`, `messageId`, `data`
- **Data structure** :
  ```typescript
  {
    oldContent?: string;
    newContent: string;
    editedAt: Date;
    authorId: string;
    authorUsername: string;
    hasAttachments: boolean;
    attachmentCount: number;
  }
  ```

#### MESSAGE_DELETE
- **Fichier** : `apps/bot/src/listeners/messages/messageDelete.ts`
- **Event Discord.js** : `messageDelete`
- **EventData** : `MessageDeleteEventData`
- **Champs BotEventDto** : `guildId`, `userId`, `channelId`, `messageId`, `data`
- **Data structure** :
  ```typescript
  {
    authorId: string;
    authorUsername: string;
    content?: string; // si en cache
    hasAttachments: boolean;
    attachmentCount: number;
    createdAt: Date;
  }
  ```

#### MESSAGE_DELETE_BULK
- **Fichier** : `apps/bot/src/listeners/messages/messageDeleteBulk.ts`
- **Event Discord.js** : `messageDeleteBulk`
- **EventData** : `MessageDeleteBulkEventData`
- **Champs BotEventDto** : `guildId`, `channelId`, `data`
- **Data structure** :
  ```typescript
  {
    messageIds: string[];
    count: number;
    channelId: string;
    channelName: string;
  }
  ```

---

### 🟢 Catégorie 2 : Membres (3 listeners)

#### GUILD_MEMBER_ADD
- **Fichier** : `apps/bot/src/listeners/members/guildMemberAdd.ts`
- **Event Discord.js** : `guildMemberAdd`
- **EventData** : `MemberAddEventData`
- **Champs BotEventDto** : `guildId`, `userId`, `data`
- **Data structure** :
  ```typescript
  {
    userId: string;
    username: string;
    discriminator?: string;
    globalName?: string;
    avatar?: string | null;
    bot: boolean;
    joinedAt: Date;
    accountCreatedAt: Date;
  }
  ```

#### GUILD_MEMBER_REMOVE
- **Fichier** : `apps/bot/src/listeners/members/guildMemberRemove.ts`
- **Event Discord.js** : `guildMemberRemove`
- **EventData** : `MemberRemoveEventData`
- **Champs BotEventDto** : `guildId`, `userId`, `data`
- **Data structure** :
  ```typescript
  {
    userId: string;
    username: string;
    discriminator?: string;
    avatar?: string | null;
    joinedAt?: Date; // si en cache
    roles?: string[]; // si en cache
  }
  ```

#### GUILD_MEMBER_UPDATE
- **Fichier** : `apps/bot/src/listeners/members/guildMemberUpdate.ts`
- **Event Discord.js** : `guildMemberUpdate`
- **EventData** : `MemberUpdateEventData`
- **Champs BotEventDto** : `guildId`, `userId`, `data`
- **Data structure** :
  ```typescript
  {
    userId: string;
    username: string;
    changes: {
      nickname?: { old?: string; new?: string };
      roles?: { added: string[]; removed: string[] };
      avatar?: { old?: string; new?: string };
      flags?: { old: number; new: number };
      isPending?: { old: boolean; new: boolean };
      communicationDisabledUntil?: { old?: Date; new?: Date };
    };
  }
  ```

---

### 🟢 Catégorie 3 : Modération (4 listeners)

#### GUILD_BAN_ADD
- **Fichier** : `apps/bot/src/listeners/moderation/guildBanAdd.ts`
- **Event Discord.js** : `guildBanAdd`
- **EventData** : `BanAddEventData`
- **Champs BotEventDto** : `guildId`, `userId`, `data`
- **Data structure** :
  ```typescript
  {
    targetUserId: string;
    targetUsername: string;
    targetDiscriminator?: string;
    targetAvatar?: string | null;
    reason?: string;
  }
  ```
- **Note** : Pour obtenir le modérateur, il faut fetch l'audit log (voir GUILD_AUDIT_LOG_ENTRY_CREATE)

#### GUILD_BAN_REMOVE
- **Fichier** : `apps/bot/src/listeners/moderation/guildBanRemove.ts`
- **Event Discord.js** : `guildBanRemove`
- **EventData** : `BanRemoveEventData`
- **Champs BotEventDto** : `guildId`, `userId`, `data`
- **Data structure** :
  ```typescript
  {
    targetUserId: string;
    targetUsername: string;
    targetDiscriminator?: string;
    targetAvatar?: string | null;
  }
  ```

#### GUILD_AUDIT_LOG_ENTRY_CREATE
- **Fichier** : `apps/bot/src/listeners/moderation/guildAuditLogEntryCreate.ts`
- **Event Discord.js** : `guildAuditLogEntryCreate`
- **EventData** : `AuditLogEntryCreateEventData`
- **Champs BotEventDto** : `guildId`, `userId` (executor), `data`
- **Data structure** :
  ```typescript
  {
    action: number; // AuditLogEvent enum
    actionName: string;
    executorId: string;
    executorUsername: string;
    targetId?: string;
    targetType?: 'user' | 'channel' | 'role' | 'guild' | 'webhook' | 'emoji' | 'message';
    reason?: string;
    changes?: Array<{
      key: string;
      oldValue?: any;
      newValue?: any;
    }>;
  }
  ```
- **Note** : Cet événement est CRUCIAL pour obtenir les infos de modération (qui a fait quoi)

#### AUTO_MODERATION_ACTION_EXECUTION
- **Fichier** : `apps/bot/src/listeners/moderation/autoModerationActionExecution.ts`
- **Event Discord.js** : `autoModerationActionExecution`
- **EventData** : `AutoModerationActionExecutionEventData`
- **Champs BotEventDto** : `guildId`, `userId`, `channelId`, `data`
- **Data structure** :
  ```typescript
  {
    ruleId: string;
    ruleTriggerType: number;
    ruleActionType: number;
    userId: string;
    username: string;
    channelId?: string;
    messageId?: string;
    alertSystemMessageId?: string;
    content?: string;
    matchedKeyword?: string;
    matchedContent?: string;
  }
  ```

---

### 🟢 Catégorie 4 : Réactions (4 listeners)

#### MESSAGE_REACTION_ADD
- **Fichier** : `apps/bot/src/listeners/reactions/messageReactionAdd.ts`
- **Event Discord.js** : `messageReactionAdd`
- **EventData** : `ReactionAddEventData`
- **Champs BotEventDto** : `guildId`, `userId`, `channelId`, `messageId`, `data`
- **Data structure** :
  ```typescript
  {
    emoji: {
      id?: string; // si custom emoji
      name: string;
      animated?: boolean;
    };
    userId: string;
    username: string;
    messageAuthorId?: string; // si message en cache
  }
  ```

#### MESSAGE_REACTION_REMOVE
- **Fichier** : `apps/bot/src/listeners/reactions/messageReactionRemove.ts`
- **Event Discord.js** : `messageReactionRemove`
- **EventData** : `ReactionRemoveEventData`
- **Champs BotEventDto** : `guildId`, `userId`, `channelId`, `messageId`, `data`
- **Data structure** : (même que MESSAGE_REACTION_ADD)

#### MESSAGE_REACTION_REMOVE_ALL
- **Fichier** : `apps/bot/src/listeners/reactions/messageReactionRemoveAll.ts`
- **Event Discord.js** : `messageReactionRemoveAll`
- **EventData** : `ReactionRemoveAllEventData`
- **Champs BotEventDto** : `guildId`, `channelId`, `messageId`, `data`
- **Data structure** :
  ```typescript
  {
    removedReactions: Array<{
      emoji: { id?: string; name: string };
      count: number;
    }>;
  }
  ```

#### MESSAGE_REACTION_REMOVE_EMOJI
- **Fichier** : `apps/bot/src/listeners/reactions/messageReactionRemoveEmoji.ts`
- **Event Discord.js** : `messageReactionRemoveEmoji`
- **EventData** : `ReactionRemoveEmojiEventData`
- **Champs BotEventDto** : `guildId`, `channelId`, `messageId`, `data`
- **Data structure** :
  ```typescript
  {
    emoji: {
      id?: string;
      name: string;
    };
    count: number; // combien de réactions retirées
  }
  ```

---

### 🟢 Catégorie 5 : Voice (1 listener complexe)

#### VOICE_STATE_UPDATE
- **Fichier** : `apps/bot/src/listeners/voice/voiceStateUpdate.ts`
- **Event Discord.js** : `voiceStateUpdate`
- **EventData** : `VoiceStateUpdateEventData`
- **Champs BotEventDto** : `guildId`, `userId`, `channelId` (new), `data`
- **Data structure** :
  ```typescript
  {
    userId: string;
    username: string;
    oldChannelId?: string;
    newChannelId?: string;
    action: 'join' | 'leave' | 'move' | 'mute' | 'unmute' | 'deafen' | 'undeafen' | 'self_mute' | 'self_unmute' | 'self_deafen' | 'self_undeafen' | 'stream_start' | 'stream_stop' | 'video_start' | 'video_stop';
    changes: {
      serverMute?: { old: boolean; new: boolean };
      serverDeaf?: { old: boolean; new: boolean };
      selfMute?: { old: boolean; new: boolean };
      selfDeaf?: { old: boolean; new: boolean };
      selfVideo?: { old: boolean; new: boolean };
      streaming?: { old: boolean; new: boolean };
    };
  }
  ```
- **Note** : Ce listener est complexe car il doit détecter plusieurs types d'actions différentes

---

## 📋 Phase 2 : Gestion du serveur (Priorité moyenne)

### 🟡 Catégorie 6 : Channels (4 listeners)

#### CHANNEL_CREATE
- **Fichier** : `apps/bot/src/listeners/channels/channelCreate.ts`
- **Event Discord.js** : `channelCreate`
- **EventData** : `ChannelCreateEventData`
- **Champs BotEventDto** : `guildId`, `channelId`, `data`

#### CHANNEL_UPDATE
- **Fichier** : `apps/bot/src/listeners/channels/channelUpdate.ts`
- **Event Discord.js** : `channelUpdate`
- **EventData** : `ChannelUpdateEventData`
- **Champs BotEventDto** : `guildId`, `channelId`, `data`

#### CHANNEL_DELETE
- **Fichier** : `apps/bot/src/listeners/channels/channelDelete.ts`
- **Event Discord.js** : `channelDelete`
- **EventData** : `ChannelDeleteEventData`
- **Champs BotEventDto** : `guildId`, `channelId`, `data`

#### CHANNEL_PINS_UPDATE
- **Fichier** : `apps/bot/src/listeners/channels/channelPinsUpdate.ts`
- **Event Discord.js** : `channelPinsUpdate`
- **EventData** : `ChannelPinsUpdateEventData`
- **Champs BotEventDto** : `guildId`, `channelId`, `data`

---

### 🟡 Catégorie 7 : Rôles (3 listeners)

#### ROLE_CREATE
- **Fichier** : `apps/bot/src/listeners/roles/roleCreate.ts`
- **Event Discord.js** : `roleCreate`
- **EventData** : `RoleCreateEventData`
- **Champs BotEventDto** : `guildId`, `roleId`, `data`

#### ROLE_UPDATE
- **Fichier** : `apps/bot/src/listeners/roles/roleUpdate.ts`
- **Event Discord.js** : `roleUpdate`
- **EventData** : `RoleUpdateEventData`
- **Champs BotEventDto** : `guildId`, `roleId`, `data`

#### ROLE_DELETE
- **Fichier** : `apps/bot/src/listeners/roles/roleDelete.ts`
- **Event Discord.js** : `roleDelete`
- **EventData** : `RoleDeleteEventData`
- **Champs BotEventDto** : `guildId`, `roleId`, `data`

---

### 🟡 Catégorie 8 : Invitations (2 listeners)

#### INVITE_CREATE
- **Fichier** : `apps/bot/src/listeners/invites/inviteCreate.ts`
- **Event Discord.js** : `inviteCreate`
- **EventData** : `InviteCreateEventData`
- **Champs BotEventDto** : `guildId`, `userId` (inviter), `channelId`, `data`
- **Data structure** :
  ```typescript
  {
    code: string;
    channelId: string;
    inviterId: string;
    inviterUsername: string;
    maxAge: number; // secondes
    maxUses: number;
    temporary: boolean;
    createdAt: Date;
    expiresAt?: Date;
  }
  ```

#### INVITE_DELETE
- **Fichier** : `apps/bot/src/listeners/invites/inviteDelete.ts`
- **Event Discord.js** : `inviteDelete`
- **EventData** : `InviteDeleteEventData`
- **Champs BotEventDto** : `guildId`, `channelId`, `data`
- **Data structure** :
  ```typescript
  {
    code: string;
    channelId: string;
    inviterId?: string;
    inviterUsername?: string;
    uses?: number;
  }
  ```

---

## 📋 Phase 3 : Fonctionnalités avancées (Priorité basse)

### 🔵 Catégorie 9 : Threads (4 listeners)

#### THREAD_CREATE
- **Fichier** : `apps/bot/src/listeners/threads/threadCreate.ts`
- **Event Discord.js** : `threadCreate`
- **EventData** : `ThreadCreateEventData`
- **Champs BotEventDto** : `guildId`, `channelId` (thread), `userId` (creator), `data`
- **Data structure** :
  ```typescript
  {
    threadId: string;
    threadName: string;
    parentChannelId: string;
    ownerId: string;
    ownerUsername: string;
    type: number; // ThreadType enum
    archived: boolean;
    autoArchiveDuration: number;
    locked: boolean;
    createdAt: Date;
  }
  ```

#### THREAD_UPDATE
- **Fichier** : `apps/bot/src/listeners/threads/threadUpdate.ts`
- **Event Discord.js** : `threadUpdate`
- **EventData** : `ThreadUpdateEventData`
- **Champs BotEventDto** : `guildId`, `channelId` (thread), `data`
- **Data structure** :
  ```typescript
  {
    threadId: string;
    threadName: string;
    changes: {
      name?: { old: string; new: string };
      archived?: { old: boolean; new: boolean };
      locked?: { old: boolean; new: boolean };
      autoArchiveDuration?: { old: number; new: number };
    };
  }
  ```

#### THREAD_DELETE
- **Fichier** : `apps/bot/src/listeners/threads/threadDelete.ts`
- **Event Discord.js** : `threadDelete`
- **EventData** : `ThreadDeleteEventData`
- **Champs BotEventDto** : `guildId`, `channelId` (thread), `data`
- **Data structure** :
  ```typescript
  {
    threadId: string;
    threadName: string;
    parentChannelId: string;
    ownerId: string;
    type: number;
  }
  ```

#### THREAD_MEMBERS_UPDATE
- **Fichier** : `apps/bot/src/listeners/threads/threadMembersUpdate.ts`
- **Event Discord.js** : `threadMembersUpdate`
- **EventData** : `ThreadMembersUpdateEventData`
- **Champs BotEventDto** : `guildId`, `channelId` (thread), `data`
- **Data structure** :
  ```typescript
  {
    threadId: string;
    threadName: string;
    addedMembers: Array<{
      userId: string;
      username: string;
      joinedAt: Date;
    }>;
    removedMemberIds: string[];
    memberCount: number;
  }
  ```

---

### 🔵 Catégorie 10 : Emojis (3 listeners)

#### EMOJI_CREATE
- **Fichier** : `apps/bot/src/listeners/emojis/emojiCreate.ts`
- **Event Discord.js** : `emojiCreate`
- **EventData** : `EmojiCreateEventData`
- **Champs BotEventDto** : `guildId`, `data`
- **Data structure** :
  ```typescript
  {
    emojiId: string;
    emojiName: string;
    animated: boolean;
    managed: boolean;
    requireColons: boolean;
    roles?: string[];
    creatorId?: string;
    creatorUsername?: string;
  }
  ```

#### EMOJI_UPDATE
- **Fichier** : `apps/bot/src/listeners/emojis/emojiUpdate.ts`
- **Event Discord.js** : `emojiUpdate`
- **EventData** : `EmojiUpdateEventData`
- **Champs BotEventDto** : `guildId`, `data`
- **Data structure** :
  ```typescript
  {
    emojiId: string;
    changes: {
      name?: { old: string; new: string };
      roles?: { old: string[]; new: string[] };
    };
  }
  ```

#### EMOJI_DELETE
- **Fichier** : `apps/bot/src/listeners/emojis/emojiDelete.ts`
- **Event Discord.js** : `emojiDelete`
- **EventData** : `EmojiDeleteEventData`
- **Champs BotEventDto** : `guildId`, `data`
- **Data structure** :
  ```typescript
  {
    emojiId: string;
    emojiName: string;
    animated: boolean;
  }
  ```

---

### 🔵 Catégorie 11 : Stickers (3 listeners)

#### GUILD_STICKER_CREATE
- **Fichier** : `apps/bot/src/listeners/stickers/guildStickerCreate.ts`
- **Event Discord.js** : `stickerCreate`
- **EventData** : `StickerCreateEventData`
- **Champs BotEventDto** : `guildId`, `userId` (creator), `data`
- **Data structure** :
  ```typescript
  {
    stickerId: string;
    stickerName: string;
    description?: string;
    tags: string;
    formatType: number; // StickerFormatType enum
    userId?: string;
    username?: string;
  }
  ```

#### GUILD_STICKER_UPDATE
- **Fichier** : `apps/bot/src/listeners/stickers/guildStickerUpdate.ts`
- **Event Discord.js** : `stickerUpdate`
- **EventData** : `StickerUpdateEventData`
- **Champs BotEventDto** : `guildId`, `data`
- **Data structure** :
  ```typescript
  {
    stickerId: string;
    changes: {
      name?: { old: string; new: string };
      description?: { old?: string; new?: string };
      tags?: { old: string; new: string };
    };
  }
  ```

#### GUILD_STICKER_DELETE
- **Fichier** : `apps/bot/src/listeners/stickers/guildStickerDelete.ts`
- **Event Discord.js** : `stickerDelete`
- **EventData** : `StickerDeleteEventData`
- **Champs BotEventDto** : `guildId`, `data`
- **Data structure** :
  ```typescript
  {
    stickerId: string;
    stickerName: string;
  }
  ```

---

### 🔵 Catégorie 12 : Événements planifiés (5 listeners)

#### GUILD_SCHEDULED_EVENT_CREATE
- **Fichier** : `apps/bot/src/listeners/scheduled-events/guildScheduledEventCreate.ts`
- **Event Discord.js** : `guildScheduledEventCreate`
- **EventData** : `ScheduledEventCreateEventData`
- **Champs BotEventDto** : `guildId`, `userId` (creator), `data`
- **Data structure** :
  ```typescript
  {
    eventId: string;
    name: string;
    description?: string;
    scheduledStartTime: Date;
    scheduledEndTime?: Date;
    entityType: number; // ScheduledEventEntityType
    channelId?: string;
    creatorId?: string;
    creatorUsername?: string;
    status: number; // ScheduledEventStatus
  }
  ```

#### GUILD_SCHEDULED_EVENT_UPDATE
- **Fichier** : `apps/bot/src/listeners/scheduled-events/guildScheduledEventUpdate.ts`
- **Event Discord.js** : `guildScheduledEventUpdate`
- **EventData** : `ScheduledEventUpdateEventData`
- **Champs BotEventDto** : `guildId`, `data`

#### GUILD_SCHEDULED_EVENT_DELETE
- **Fichier** : `apps/bot/src/listeners/scheduled-events/guildScheduledEventDelete.ts`
- **Event Discord.js** : `guildScheduledEventDelete`
- **EventData** : `ScheduledEventDeleteEventData`
- **Champs BotEventDto** : `guildId`, `data`

#### GUILD_SCHEDULED_EVENT_USER_ADD
- **Fichier** : `apps/bot/src/listeners/scheduled-events/guildScheduledEventUserAdd.ts`
- **Event Discord.js** : `guildScheduledEventUserAdd`
- **EventData** : `ScheduledEventUserAddEventData`
- **Champs BotEventDto** : `guildId`, `userId`, `data`
- **Data structure** :
  ```typescript
  {
    eventId: string;
    eventName: string;
    userId: string;
    username: string;
  }
  ```

#### GUILD_SCHEDULED_EVENT_USER_REMOVE
- **Fichier** : `apps/bot/src/listeners/scheduled-events/guildScheduledEventUserRemove.ts`
- **Event Discord.js** : `guildScheduledEventUserRemove`
- **EventData** : `ScheduledEventUserRemoveEventData`
- **Champs BotEventDto** : `guildId`, `userId`, `data`

---

### 🔵 Catégorie 13 : Webhooks (1 listener)

#### WEBHOOKS_UPDATE
- **Fichier** : `apps/bot/src/listeners/webhooks/webhooksUpdate.ts`
- **Event Discord.js** : `webhookUpdate`
- **EventData** : `WebhooksUpdateEventData`
- **Champs BotEventDto** : `guildId`, `channelId`, `data`
- **Data structure** :
  ```typescript
  {
    channelId: string;
    channelName: string;
    // Note : L'event ne donne pas les détails, juste qu'il y a eu un changement
    timestamp: Date;
  }
  ```

---

### 🔵 Catégorie 14 : Stage (3 listeners)

#### STAGE_INSTANCE_CREATE
- **Fichier** : `apps/bot/src/listeners/stage/stageInstanceCreate.ts`
- **Event Discord.js** : `stageInstanceCreate`
- **EventData** : `StageInstanceCreateEventData`
- **Champs BotEventDto** : `guildId`, `channelId`, `data`
- **Data structure** :
  ```typescript
  {
    stageId: string;
    channelId: string;
    topic: string;
    privacyLevel: number;
    discoverableDisabled: boolean;
  }
  ```

#### STAGE_INSTANCE_UPDATE
- **Fichier** : `apps/bot/src/listeners/stage/stageInstanceUpdate.ts`
- **Event Discord.js** : `stageInstanceUpdate`
- **EventData** : `StageInstanceUpdateEventData`
- **Champs BotEventDto** : `guildId`, `channelId`, `data`

#### STAGE_INSTANCE_DELETE
- **Fichier** : `apps/bot/src/listeners/stage/stageInstanceDelete.ts`
- **Event Discord.js** : `stageInstanceDelete`
- **EventData** : `StageInstanceDeleteEventData`
- **Champs BotEventDto** : `guildId`, `channelId`, `data`

---

### 🔵 Catégorie 15 : Intégrations (4 listeners)

#### GUILD_INTEGRATIONS_UPDATE
- **Fichier** : `apps/bot/src/listeners/integrations/guildIntegrationsUpdate.ts`
- **Event Discord.js** : `guildIntegrationsUpdate`
- **EventData** : `IntegrationsUpdateEventData`
- **Champs BotEventDto** : `guildId`, `data`

#### INTEGRATION_CREATE
- **Fichier** : `apps/bot/src/listeners/integrations/integrationCreate.ts`
- **Event Discord.js** : `integrationCreate`
- **EventData** : `IntegrationCreateEventData`
- **Champs BotEventDto** : `guildId`, `data`

#### INTEGRATION_UPDATE
- **Fichier** : `apps/bot/src/listeners/integrations/integrationUpdate.ts`
- **Event Discord.js** : `integrationUpdate`
- **EventData** : `IntegrationUpdateEventData`
- **Champs BotEventDto** : `guildId`, `data`

#### INTEGRATION_DELETE
- **Fichier** : `apps/bot/src/listeners/integrations/integrationDelete.ts`
- **Event Discord.js** : `integrationDelete`
- **EventData** : `IntegrationDeleteEventData`
- **Champs BotEventDto** : `guildId`, `data`

---

### 🔵 Catégorie 16 : Utilisateur (3 listeners)

#### USER_UPDATE
- **Fichier** : `apps/bot/src/listeners/user/userUpdate.ts`
- **Event Discord.js** : `userUpdate`
- **EventData** : `UserUpdateEventData`
- **Champs BotEventDto** : `userId`, `data` (pas de guildId)
- **Data structure** :
  ```typescript
  {
    userId: string;
    changes: {
      username?: { old: string; new: string };
      discriminator?: { old: string; new: string };
      avatar?: { old?: string; new?: string };
      banner?: { old?: string; new?: string };
    };
  }
  ```
- **Note** : Événement global Discord, pas spécifique à une guild

#### PRESENCE_UPDATE
- **Fichier** : `apps/bot/src/listeners/user/presenceUpdate.ts`
- **Event Discord.js** : `presenceUpdate`
- **EventData** : `PresenceUpdateEventData`
- **Champs BotEventDto** : `guildId`, `userId`, `data`
- **Config** : ⚠️ **Désactivé par défaut** (très verbeux)
- **Data structure** :
  ```typescript
  {
    userId: string;
    status: string; // online, idle, dnd, offline
    activities: Array<{
      name: string;
      type: number;
      details?: string;
    }>;
  }
  ```

#### TYPING_START
- **Fichier** : `apps/bot/src/listeners/user/typingStart.ts`
- **Event Discord.js** : `typingStart`
- **EventData** : `TypingStartEventData`
- **Champs BotEventDto** : `guildId`, `userId`, `channelId`, `data`
- **Config** : ⚠️ **Désactivé par défaut** (très verbeux)
- **Data structure** :
  ```typescript
  {
    userId: string;
    username: string;
    channelId: string;
    timestamp: Date;
  }
  ```

---

### 🔵 Catégorie 17 : Interactions (1 listener)

#### INTERACTION_CREATE
- **Fichier** : `apps/bot/src/listeners/interactions/interactionCreate.ts`
- **Event Discord.js** : `interactionCreate`
- **EventData** : `InteractionCreateEventData`
- **Champs BotEventDto** : `guildId`, `userId`, `channelId`, `data`
- **Data structure** :
  ```typescript
  {
    interactionId: string;
    type: number; // InteractionType enum
    userId: string;
    username: string;
    commandName?: string; // si slash command
    customId?: string; // si button/select menu
    values?: string[]; // si select menu
  }
  ```

---

### 🔵 Catégorie 18 : AutoMod Rules (3 listeners)

#### AUTO_MODERATION_RULE_CREATE
- **Fichier** : `apps/bot/src/listeners/automod/autoModerationRuleCreate.ts`
- **Event Discord.js** : `autoModerationRuleCreate`
- **EventData** : `AutoModerationRuleCreateEventData`
- **Champs BotEventDto** : `guildId`, `userId` (creator), `data`
- **Data structure** :
  ```typescript
  {
    ruleId: string;
    name: string;
    creatorId: string;
    eventType: number;
    triggerType: number;
    triggerMetadata: any;
    actions: Array<{
      type: number;
      metadata?: any;
    }>;
    enabled: boolean;
    exemptRoles: string[];
    exemptChannels: string[];
  }
  ```

#### AUTO_MODERATION_RULE_UPDATE
- **Fichier** : `apps/bot/src/listeners/automod/autoModerationRuleUpdate.ts`
- **Event Discord.js** : `autoModerationRuleUpdate`
- **EventData** : `AutoModerationRuleUpdateEventData`
- **Champs BotEventDto** : `guildId`, `data`

#### AUTO_MODERATION_RULE_DELETE
- **Fichier** : `apps/bot/src/listeners/automod/autoModerationRuleDelete.ts`
- **Event Discord.js** : `autoModerationRuleDelete`
- **EventData** : `AutoModerationRuleDeleteEventData`
- **Champs BotEventDto** : `guildId`, `data`

---

## 🛠️ Template de listener standardisé

Chaque listener doit suivre ce template pour garantir la cohérence :

```typescript
import { BotEventDto, EventType, [YourEventData] } from '@my-project/shared-types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { [DiscordJsType] } from 'discord.js';
import { isListenerEnabled } from '../../config/listeners.config';

@ApplyOptions<Listener.Options>({
  event: '[discordJsEventName]'
})
export class [EventName]Listener extends Listener {
  public override run([params]: [DiscordJsType]) {
    // 1. Vérification de la configuration
    if (!isListenerEnabled('[EVENT_NAME]')) {
      return;
    }

    // 2. Vérification de validité (si nécessaire)
    if (![condition]) {
      return;
    }

    // 3. Log (optionnel, pour debug)
    this.container.logger.debug(`[EVENT_NAME] event caught`);

    // 4. Extraction des données
    const eventData: [YourEventData] = {
      // ... extraction de toutes les données pertinentes
    };

    // 5. Création du BotEventDto
    const event: BotEventDto = {
      type: EventType.[EVENT_NAME],
      guildId: [guildId],
      userId: [userId], // si applicable
      channelId: [channelId], // si applicable
      messageId: [messageId], // si applicable
      roleId: [roleId], // si applicable
      timestamp: Date.now(),
      data: eventData
    };

    // 6. Envoi via le batcher
    this.container.eventBatcher.addEvent([event]);
  }
}
```

---

## 📊 Tableau récapitulatif

| Phase | Catégorie | Listeners | Priorité | Verbosité |
|-------|-----------|-----------|----------|-----------|
| **1** | Messages | 4 | 🔴 Haute | Moyenne |
| **1** | Membres | 3 | 🔴 Haute | Faible |
| **1** | Modération | 4 | 🔴 Haute | Faible |
| **1** | Réactions | 4 | 🔴 Haute | Haute |
| **1** | Voice | 1 | 🔴 Haute | Moyenne |
| **2** | Channels | 4 | 🟡 Moyenne | Faible |
| **2** | Rôles | 3 | 🟡 Moyenne | Faible |
| **2** | Invitations | 2 | 🟡 Moyenne | Faible |
| **3** | Threads | 4 | 🔵 Basse | Moyenne |
| **3** | Emojis | 3 | 🔵 Basse | Faible |
| **3** | Stickers | 3 | 🔵 Basse | Faible |
| **3** | Events planifiés | 5 | 🔵 Basse | Faible |
| **3** | Webhooks | 1 | 🔵 Basse | Faible |
| **3** | Stage | 3 | 🔵 Basse | Faible |
| **3** | Intégrations | 4 | 🔵 Basse | Faible |
| **3** | Utilisateur | 3 | 🔵 Basse | Haute |
| **3** | Interactions | 1 | 🔵 Basse | Moyenne |
| **3** | AutoMod Rules | 3 | 🔵 Basse | Faible |
| | **TOTAL** | **51** | | |

---

## ✅ Checklist de déploiement

### Phase 0 : Setup ✅ TERMINÉE
- [x] Créer `apps/bot/src/config/listeners.config.ts`
- [x] Ajouter `isListenerEnabled()` dans le fichier de config
- [x] Créer/vérifier `apps/bot/src/lib/types/augment.d.ts`
- [x] Nettoyer `packages/shared-types/src/dtos/events/botEvent.dto.ts`
- [x] Créer le template standardisé de listener
- [x] Créer la structure de dossiers dans `apps/bot/src/listeners/` (à faire lors de l'implémentation)

### Phase 1 : Événements de base (20 listeners)
- [x] **Messages** (4)
  - [x] MESSAGE_CREATE (vérifier existant)
  - [x] MESSAGE_UPDATE
  - [x] MESSAGE_DELETE
  - [x] MESSAGE_DELETE_BULK
- [x] **Membres** (3)
  - [x] GUILD_MEMBER_ADD
  - [x] GUILD_MEMBER_REMOVE
  - [x] GUILD_MEMBER_UPDATE
- [x] **Modération** (4)
  - [x] GUILD_BAN_ADD
  - [x] GUILD_BAN_REMOVE
  - [x] GUILD_AUDIT_LOG_ENTRY_CREATE
  - [x] AUTO_MODERATION_ACTION_EXECUTION
- [x] **Réactions** (4)
  - [x] MESSAGE_REACTION_ADD
  - [x] MESSAGE_REACTION_REMOVE
  - [x] MESSAGE_REACTION_REMOVE_ALL
  - [x] MESSAGE_REACTION_REMOVE_EMOJI
- [x] **Voice** (1)
  - [x] VOICE_STATE_UPDATE

### Phase 2 : Gestion du serveur (9 listeners)
- [ ] **Channels** (4)
  - [ ] CHANNEL_CREATE
  - [ ] CHANNEL_UPDATE
  - [ ] CHANNEL_DELETE
  - [ ] CHANNEL_PINS_UPDATE
- [ ] **Rôles** (3)
  - [ ] ROLE_CREATE
  - [ ] ROLE_UPDATE
  - [ ] ROLE_DELETE
- [ ] **Invitations** (2)
  - [ ] INVITE_CREATE
  - [ ] INVITE_DELETE

### Phase 3 : Fonctionnalités avancées (22 listeners)
- [ ] **Threads** (4)
- [ ] **Emojis** (3)
- [ ] **Stickers** (3)
- [ ] **Events planifiés** (5)
- [ ] **Webhooks** (1)
- [ ] **Stage** (3)
- [ ] **Intégrations** (4)
- [ ] **Utilisateur** (3)
- [ ] **Interactions** (1)
- [ ] **AutoMod Rules** (3)

---

## 🔄 Évolution future

### Migration vers config DB par guild

Quand le moment viendra de passer à une config par guild :

1. **Table PostgreSQL** :
```sql
CREATE TABLE guild_listener_config (
  id SERIAL PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  listener_name VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(guild_id, listener_name)
);
```

2. **Modification de `isListenerEnabled()`** :
```typescript
export async function isListenerEnabled(
  eventName: string,
  guildId?: string
): Promise<boolean> {
  if (!guildId) {
    // Fallback sur la config locale
    return LISTENERS_CONFIG[eventName]?.enabled ?? false;
  }
  
  // Fetch depuis la DB (avec cache Redis)
  const config = await getGuildListenerConfig(guildId, eventName);
  return config?.enabled ?? LISTENERS_CONFIG[eventName]?.enabled ?? false;
}
```

3. **Dans chaque listener** : Aucune modification nécessaire ! La vérification reste identique :
```typescript
if (!isListenerEnabled('MESSAGE_CREATE')) return;
```

---

## 📝 Notes importantes

### Intents Discord

Certains événements nécessitent des intents spécifiques. Voici la liste :

| Intent | Événements concernés |
|--------|---------------------|
| `Guilds` | Channels, Roles, Emojis, Stickers, Stage, Events planifiés |
| `GuildMembers` | GUILD_MEMBER_* |
| `GuildModeration` | GUILD_BAN_* |
| `GuildMessages` | MESSAGE_* (sauf reactions) |
| `GuildMessageReactions` | MESSAGE_REACTION_* |
| `MessageContent` | Contenu des messages |
| `GuildVoiceStates` | VOICE_STATE_UPDATE |
| `GuildPresences` | PRESENCE_UPDATE |
| `GuildIntegrations` | INTEGRATION_* |
| `GuildWebhooks` | WEBHOOKS_UPDATE |
| `GuildInvites` | INVITE_* |
| `GuildScheduledEvents` | GUILD_SCHEDULED_EVENT_* |
| `AutoModerationConfiguration` | AUTO_MODERATION_RULE_* |
| `AutoModerationExecution` | AUTO_MODERATION_ACTION_EXECUTION |

**Fichier** : `apps/bot/src/index.ts` - Vérifier que tous les intents nécessaires sont activés.

### Partials Discord

Certains événements peuvent nécessiter des partials pour accéder aux objets en cache :

```typescript
partials: [
  Partials.Message,
  Partials.Channel,
  Partials.Reaction,
  Partials.User,
  Partials.GuildMember,
]
```

### Rate limiting

Pour les événements très verbeux (PRESENCE_UPDATE, TYPING_START, MESSAGE_REACTION_*), considérer :
- Désactivation par défaut
- Throttling côté bot
- Agrégation avant envoi

---

## 🎯 Objectifs de qualité

- ✅ **Cohérence** : Tous les listeners suivent le même pattern
- ✅ **Scalabilité** : Architecture prête pour des milliers de guilds
- ✅ **Maintenabilité** : Code simple et documenté
- ✅ **Extensibilité** : Facile d'ajouter de la logique métier plus tard
- ✅ **Performance** : EventBatcher + config simple
- ✅ **Type-safety** : Toutes les interfaces définies

---

**Version** : 1.0  
**Date** : Octobre 2025  
**Auteur** : Roadmap collaborative