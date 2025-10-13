# 🎯 TESTS ROADMAP - Plan de tests du Bot Discord

## 📌 Objectif

Créer une **suite de tests complète** pour tous les 47 listeners du bot Discord, organisée par phase et par priorité, avec un système de suivi clair pour mesurer la progression.

---

## 📊 Vue d'ensemble

| Phase | Catégorie | Listeners | Priorité | Statut | Tests |
|-------|-----------|-----------|----------|--------|-------|
| **0** | Infrastructure | - | 🔴 Critique | ✅ | Setup complet |
| **1** | Messages | 4 | 🔴 Haute | ✅ | 4/4 |
| **1** | Membres | 3 | 🔴 Haute | ✅ | 3/3 |
| **1** | Modération | 4 | 🔴 Haute | ⏳ | 0/4 |
| **1** | Réactions | 4 | 🔴 Haute | ⏳ | 0/4 |
| **1** | Voice | 1 | 🔴 Haute | ⏳ | 0/1 |
| **2** | Channels | 4 | 🟡 Moyenne | ⏳ | 0/4 |
| **2** | Rôles | 3 | 🟡 Moyenne | ⏳ | 0/3 |
| **2** | Invitations | 2 | 🟡 Moyenne | ⏳ | 0/2 |
| **3** | Threads | 4 | 🔵 Basse | ⏳ | 0/4 |
| **3** | Emojis | 3 | 🔵 Basse | ⏳ | 0/3 |
| **3** | Stickers | 3 | 🔵 Basse | ⏳ | 0/3 |
| **3** | Events planifiés | 5 | 🔵 Basse | ⏳ | 0/5 |
| **3** | Webhooks | 1 | 🔵 Basse | ⏳ | 0/1 |
| **3** | Stage | 3 | 🔵 Basse | ⏳ | 0/3 |
| **3** | Intégrations | 1 | 🔵 Basse | ⏳ | 0/1 |
| **3** | Utilisateur | 3 | 🔵 Basse | ⏳ | 0/3 |
| **3** | Interactions | 1 | 🔵 Basse | ⏳ | 0/1 |
| **3** | AutoMod Rules | 3 | 🔵 Basse | ⏳ | 0/3 |
| **3** | Guild | 3 | 🔵 Basse | ⏳ | 0/3 |
| | **TOTAL** | **47** | | | **7/47** |

**Légende des statuts** :
- ✅ Complété
- 🟡 En cours
- ⏳ À faire
- ⚠️ Bloqué
- 🚫 Annulé

---

## 🏗️ Phase 0 : Infrastructure ✅ TERMINÉE

### ✅ Setup initial (COMPLÉTÉ)

#### Tâche #0.1 - Configuration Jest ✅
- [x] Créer `jest.config.js`
- [x] Créer `tsconfig.spec.json`
- [x] Ajouter scripts NPM
- [x] Installer dépendances (`jest`, `@types/jest`, `ts-jest`)

**Durée estimée** : 30 minutes  
**Durée réelle** : 30 minutes

---

#### Tâche #0.2 - Fichiers helpers ✅
- [x] Créer `tests/setup/jest.setup.ts`
- [x] Créer `tests/helpers/testHelpers.ts`
- [x] Créer `tests/helpers/mockFactory.ts`

**Durée estimée** : 1 heure  
**Durée réelle** : 1 heure

---

#### Tâche #0.3 - Premier test validé ✅
- [x] Créer `tests/unit/listeners/messages/messageCreate.spec.ts`
- [x] 12 cas de test
- [x] Tous les tests passent
- [x] Pattern établi

**Durée estimée** : 2 heures  
**Durée réelle** : 2 heures

---

## 📅 Phase 1 : Listeners haute priorité (16 tests)

**Objectif** : Tester les listeners les plus critiques pour la production

**Durée estimée totale** : 8-12 heures

---

### ✅ Messages (4 listeners) - COMPLÉTÉE

#### ✅ Tâche #1.1 - messageCreate ✅
**Statut** : ✅ COMPLÉTÉ  
**Priorité** : 🔴 CRITIQUE  
**Effort réel** : 2 heures  

**Fichiers créés** :
- [x] `tests/unit/listeners/messages/messageCreate.spec.ts`

**Tests** :
- [x] Configuration (activé/désactivé) - 2 tests
- [x] Filtrage (bots, DMs, système) - 5 tests
- [x] Extraction de données (contenu, attachments, embeds) - 4 tests
- [x] Structure BotEventDto - 1 test

**Résultat** : ✅ 12/12 tests passent

---

#### ✅ Tâche #1.2 - messageUpdate ✅
**Statut** : ✅ COMPLÉTÉ  
**Priorité** : 🔴 CRITIQUE  
**Effort réel** : 1.5 heures  

**Fichiers créés** :
- [x] `tests/unit/listeners/messages/messageUpdate.spec.ts`

**Tests** :
- [x] Configuration - 2 tests
- [x] Filtrage (bots, DMs) - 2 tests
- [x] Gestion des partials - 4 tests
- [x] Extraction des changements (oldContent vs newContent) - 6 tests
- [x] Structure BotEventDto - 1 test

**Résultat** : ✅ 15/15 tests passent

---

#### ✅ Tâche #1.3 - messageDelete ✅
**Statut** : ✅ COMPLÉTÉ  
**Priorité** : 🔴 CRITIQUE  
**Effort réel** : 1.5 heures  

**Fichiers créés** :
- [x] `tests/unit/listeners/messages/messageDelete.spec.ts`

**Tests** :
- [x] Configuration - 2 tests
- [x] Filtrage - 2 tests
- [x] Gestion extensive des partials - 5 tests
- [x] Extraction de données - 4 tests
- [x] Structure BotEventDto - 2 tests

**Résultat** : ✅ 15/15 tests passent

---

#### ✅ Tâche #1.4 - messageDeleteBulk ✅
**Statut** : ✅ COMPLÉTÉ  
**Priorité** : 🟡 IMPORTANT  
**Effort réel** : 1 heure  

**Fichiers créés** :
- [x] `tests/unit/listeners/messages/messageDeleteBulk.spec.ts`

**Tests** :
- [x] Configuration - 2 tests
- [x] Filtrage de collections - 2 tests
- [x] Traitement de multiples messages (1 à 100) - 3 tests
- [x] Gestion des partials - 3 tests
- [x] Extraction des données - 5 tests
- [x] Structure BotEventDto - 2 tests

**Résultat** : ✅ 16/16 tests passent

**Total Messages** : ✅ 58 tests

---

### ✅ Membres (3 listeners) - COMPLÉTÉE

#### ✅ Tâche #1.5 - guildMemberAdd ✅
**Statut** : ✅ COMPLÉTÉ  
**Priorité** : 🔴 CRITIQUE  
**Effort réel** : 1.5 heures  

**Fichiers créés/modifiés** :
- [x] `tests/unit/listeners/members/guildMemberAdd.spec.ts`
- [x] Mise à jour `createMockMember()` dans mockFactory

**Tests** :
- [x] Configuration - 2 tests
- [x] Extraction données membre - 8 tests
- [x] Détection des bots - inclus
- [x] Calcul de l'âge du compte - inclus
- [x] Gestion discriminator nouveau/ancien système - 2 tests
- [x] Structure BotEventDto - 2 tests

**Résultat** : ✅ 13/13 tests passent

**Corrections appliquées** :
- Ajout de `createdAt`, `avatar`, `displayAvatarURL` au mock User
- Ajout de `memberCount` au mock Guild

---

#### ✅ Tâche #1.6 - guildMemberRemove ✅
**Statut** : ✅ COMPLÉTÉ  
**Priorité** : 🔴 CRITIQUE  
**Effort réel** : 1 heure  

**Fichiers créés** :
- [x] `tests/unit/listeners/members/guildMemberRemove.spec.ts`

**Corrections appliquées au listener** :
- [x] Correction de la logique d'extraction des rôles (`roles?.cache` au lieu de `instanceof Map`)

**Tests** :
- [x] Configuration - 2 tests
- [x] Extraction données - 3 tests
- [x] Calcul durée d'appartenance - 2 tests
- [x] Gestion des partials - 4 tests
- [x] Structure BotEventDto - 2 tests

**Résultat** : ✅ 13/13 tests passent

---

#### ✅ Tâche #1.7 - guildMemberUpdate ✅
**Statut** : ✅ COMPLÉTÉ  
**Priorité** : 🟡 IMPORTANT  
**Effort réel** : 2 heures  

**Fichiers créés/modifiés** :
- [x] `tests/unit/listeners/members/guildMemberUpdate.spec.ts`
- [x] Mise à jour mock avec `isCommunicationDisabled`, `guild.roles.cache`

**Corrections appliquées au listener** :
- [x] Correction de la logique d'extraction des rôles (`.cache` au lieu de `instanceof Map`)
- [x] Ajout optional chaining pour `guild.roles?.cache?.get()`
- [x] Correction de `extractMemberUpdateData` pour correspondre à l'interface complète
- [x] Ajout de tous les changements : avatar, communicationDisabledUntil, pending

**Tests** :
- [x] Configuration - 2 tests
- [x] Détection absence de changements - 1 test
- [x] Détection changements nickname - 3 tests
- [x] Détection changements rôles - 4 tests
- [x] Gestion des partials - 2 tests
- [x] Extraction des données - 1 test
- [x] Structure BotEventDto - 3 tests

**Résultat** : ✅ 16/16 tests passent

**Total Membres** : ✅ 42 tests

---

### ⏳ Modération (4 listeners) - À FAIRE

#### ⏳ Tâche #1.8 - guildBanAdd
**Statut** : ⏳ À FAIRE  
**Priorité** : 🔴 CRITIQUE  
**Effort estimé** : 1 heure  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/moderation/guildBanAdd.spec.ts`
- [ ] `createMockBan()` dans mockFactory

**Tests à écrire** :
- [ ] Configuration
- [ ] Extraction données ban (user, reason)
- [ ] Envoi immédiat (événement critique)
- [ ] Structure BotEventDto

**Dépendances** : Aucune

---

#### ⏳ Tâche #1.9 - guildBanRemove
**Statut** : ⏳ À FAIRE  
**Priorité** : 🔴 CRITIQUE  
**Effort estimé** : 1 heure  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/moderation/guildBanRemove.spec.ts`

**Tests à écrire** :
- [ ] Configuration
- [ ] Extraction données unban
- [ ] Envoi immédiat (événement critique)
- [ ] Structure BotEventDto

**Dépendances** : Tâche #1.8 (mock ban)

---

#### ⏳ Tâche #1.10 - guildAuditLogEntryCreate
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟡 IMPORTANT  
**Effort estimé** : 2 heures  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/moderation/guildAuditLogEntryCreate.spec.ts`
- [ ] `createMockAuditLogEntry()` dans mockFactory

**Tests à écrire** :
- [ ] Configuration
- [ ] Extraction données audit log (action, executor, target)
- [ ] Différents types d'actions
- [ ] Structure BotEventDto

**Dépendances** : Aucune

**Notes** :
- Audit log entry est complexe, beaucoup de types d'actions possibles
- Se concentrer sur les actions principales (MEMBER_KICK, MEMBER_BAN_ADD, MESSAGE_DELETE)

---

#### ⏳ Tâche #1.11 - autoModerationActionExecution
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟡 IMPORTANT  
**Effort estimé** : 1.5 heures  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/moderation/autoModerationActionExecution.spec.ts`

**Tests à écrire** :
- [ ] Configuration
- [ ] Extraction données action (rule, user, action)
- [ ] Envoi immédiat (événement critique)
- [ ] Structure BotEventDto

**Dépendances** : Aucune

---

### ⏳ Réactions (4 listeners) - À FAIRE

#### ⏳ Tâche #1.12 - messageReactionAdd
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟡 IMPORTANT  
**Effort estimé** : 1.5 heures  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/reactions/messageReactionAdd.spec.ts`
- [ ] `createMockReaction()` dans mockFactory

**Tests à écrire** :
- [ ] Configuration
- [ ] Filtrage (bots)
- [ ] Extraction données réaction (emoji, user, message)
- [ ] Gestion des partials
- [ ] Structure BotEventDto

**Dépendances** : Aucune

---

#### ⏳ Tâche #1.13 - messageReactionRemove
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟡 IMPORTANT  
**Effort estimé** : 1 heure  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/reactions/messageReactionRemove.spec.ts`

**Tests à écrire** :
- [ ] Configuration
- [ ] Filtrage (bots)
- [ ] Extraction données
- [ ] Structure BotEventDto

**Dépendances** : Tâche #1.12 (mock reaction)

---

#### ⏳ Tâche #1.14 - messageReactionRemoveAll
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟢 NORMAL  
**Effort estimé** : 1 heure  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/reactions/messageReactionRemoveAll.spec.ts`

**Tests à écrire** :
- [ ] Configuration
- [ ] Extraction données message
- [ ] Structure BotEventDto

**Dépendances** : Aucune

---

#### ⏳ Tâche #1.15 - messageReactionRemoveEmoji
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟢 NORMAL  
**Effort estimé** : 1 heure  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/reactions/messageReactionRemoveEmoji.spec.ts`

**Tests à écrire** :
- [ ] Configuration
- [ ] Extraction données emoji
- [ ] Structure BotEventDto

**Dépendances** : Aucune

---

### ⏳ Voice (1 listener) - À FAIRE

#### ⏳ Tâche #1.16 - voiceStateUpdate
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟡 IMPORTANT  
**Effort estimé** : 2 heures  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/voice/voiceStateUpdate.spec.ts`
- [ ] `createMockVoiceState()` dans mockFactory

**Tests à écrire** :
- [ ] Configuration
- [ ] Détection join/leave/move
- [ ] Détection mute/unmute, deaf/undeaf
- [ ] Extraction oldState vs newState
- [ ] Structure BotEventDto

**Dépendances** : Aucune

---

## 📊 Tableau de bord

### Progression globale

```
Phase 0 (Infrastructure)    : ████████████████████ 100% (3/3)
Phase 1 (Haute priorité)    : ████████░░░░░░░░░░░░  44% (7/16)
  - Messages                : ████████████████████ 100% (4/4)
  - Membres                 : ████████████████████ 100% (3/3)
  - Modération              : ░░░░░░░░░░░░░░░░░░░░   0% (0/4)
  - Réactions               : ░░░░░░░░░░░░░░░░░░░░   0% (0/4)
  - Voice                   : ░░░░░░░░░░░░░░░░░░░░   0% (0/1)
Phase 2 (Priorité moyenne)  : ░░░░░░░░░░░░░░░░░░░░   0% (0/9)
Phase 3 (Priorité basse)    : ░░░░░░░░░░░░░░░░░░░░   0% (0/22)
Phase 4 (Intégration/Charge): ░░░░░░░░░░░░░░░░░░░░   0% (0/5)

TOTAL                       : ███░░░░░░░░░░░░░░░░░  18% (10/55)
```

### Temps estimé

| Phase | Temps estimé | Temps passé | Temps restant |
|-------|--------------|-------------|---------------|
| 0 | 3.5h | ✅ 3.5h | - |
| 1 | 10-14h | ✅ 7.5h | 2.5-6.5h |
| 2 | 6-8h | 0h | 6-8h |
| 3 | 15-20h | 0h | 15-20h |
| 4 | 9h | 0h | 9h |
| **TOTAL** | **43.5-54.5h** | **11h** | **32.5-43.5h** |

### Vélocité

- **Temps moyen par test** : ~1.1 heures (plus rapide qu'estimé !)
- **Tests complétés** : 10 (infrastructure + 7 listeners)
- **Tests restants** : 45
- **Estimation révisée** : ~1.5-2 semaines à temps plein

---

## 🎯 Leçons apprises

### ✅ Bonnes pratiques identifiées

1. **Mocks réutilisables** : Créer des mocks complets dès le début évite des retours en arrière
2. **Double cast TypeScript** : Utiliser `as any as Type` pour les mocks Jest
3. **Jest.fn() obligatoire** : Pour les méthodes mockées dans les interfaces Discord.js
4. **Vérification des interfaces** : Toujours vérifier que le listener correspond exactement à l'interface EventData
5. **Optional chaining** : Utiliser `?.` pour gérer les partials gracieusement

### 📝 Corrections communes

1. **createMockMember** : Nécessite `user.createdAt`, `user.displayAvatarURL`, `guild.roles.cache`, `isCommunicationDisabled`
2. **Extraction de rôles** : Toujours utiliser `roles?.cache` et non `instanceof Map`
3. **Guild.roles.cache** : Doit être mocké dans la guild pour les tests de changements de rôles
4. **Tests de rôles** : Vérifier les objets `{id, name}` et non les strings simples

---

## 📝 Notes importantes

### Corrections apportées aux listeners

Les corrections suivantes ont été nécessaires pendant le développement des tests :

1. **guildMemberRemove.ts** :
   - Correction : `member.roles?.cache` au lieu de `member.roles instanceof Map`

2. **guildMemberUpdate.ts** :
   - Correction : `oldMember.roles?.cache` au lieu de `instanceof Map`
   - Correction : `guild.roles?.cache?.get()` avec optional chaining
   - Correction : Ajout de tous les changements (avatar, communicationDisabledUntil, pending)
   - Correction : Adaptation à l'interface `MemberUpdateEventData` complète

### Mocks disponibles

- ✅ `createMockMessage()` - Message Discord complet
- ✅ `createMockMessageWithAttachments()` - Message avec attachments
- ✅ `createMockMessageWithEmbeds()` - Message avec embeds
- ✅ `createMockBotMessage()` - Message d'un bot
- ✅ `createMockSystemMessage()` - Message système
- ✅ `createMockReplyMessage()` - Message de réponse
- ✅ `createMockMember()` - GuildMember complet (mis à jour)
- ✅ `createMockGuild()` - Guild
- ⏳ `createMockBan()` - À créer
- ⏳ `createMockReaction()` - À créer
- ⏳ `createMockVoiceState()` - À créer
- ⏳ `createMockAuditLogEntry()` - À créer

---

**Version** : 1.1  
**Dernière mise à jour** : Octobre 2025  
**Prochaine révision** : Après complétion Phase 1