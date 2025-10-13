# 🎯 TESTS ROADMAP - Plan de tests du Bot Discord

## 📌 Objectif

Créer une **suite de tests complète** pour tous les 47 listeners du bot Discord, organisée par phase et par priorité, avec un système de suivi clair pour mesurer la progression.

---

## 📊 Vue d'ensemble

| Phase | Catégorie | Listeners | Priorité | Statut | Tests |
|-------|-----------|-----------|----------|--------|-------|
| **0** | Infrastructure | - | 🔴 Critique | ✅ | Setup complet |
| **1** | Messages | 4 | 🔴 Haute | 🟡 | 1/4 |
| **1** | Membres | 3 | 🔴 Haute | ⏳ | 0/3 |
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
| | **TOTAL** | **47** | | | **1/47** |

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

### 🟡 Messages (4 listeners) - EN COURS

#### ✅ Tâche #1.1 - messageCreate ✅
**Statut** : ✅ COMPLÉTÉ  
**Priorité** : 🔴 CRITIQUE  
**Effort** : 2 heures  

**Fichiers** :
- [x] `tests/unit/listeners/messages/messageCreate.spec.ts`

**Tests** :
- [x] Configuration (activé/désactivé)
- [x] Filtrage (bots, DMs, système)
- [x] Extraction de données (contenu, attachments, embeds)
- [x] Structure BotEventDto

**Résultat** : ✅ 12/12 tests passent

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

### ⏳ Réactions (4 listeners)

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

### ⏳ Voice (1 listener)

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

## 📅 Phase 2 : Listeners priorité moyenne (9 tests)

**Objectif** : Tester la gestion du serveur (channels, rôles, invitations)

**Durée estimée totale** : 6-8 heures

---

### ⏳ Channels (4 listeners)

#### ⏳ Tâche #2.1 - channelCreate
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟡 IMPORTANT  
**Effort estimé** : 1 heure  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/channels/channelCreate.spec.ts`
- [ ] `createMockChannel()` dans mockFactory

**Tests à écrire** :
- [ ] Configuration
- [ ] Extraction données channel (type, name, permissions)
- [ ] Structure BotEventDto

---

#### ⏳ Tâche #2.2 - channelUpdate
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟡 IMPORTANT  
**Effort estimé** : 1.5 heures  

---

#### ⏳ Tâche #2.3 - channelDelete
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟡 IMPORTANT  
**Effort estimé** : 1 heure  

---

#### ⏳ Tâche #2.4 - channelPinsUpdate
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟢 NORMAL  
**Effort estimé** : 1 heure  

---

### ⏳ Rôles (3 listeners)

#### ⏳ Tâche #2.5 - roleCreate
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟡 IMPORTANT  
**Effort estimé** : 1 heure  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/roles/roleCreate.spec.ts`
- [ ] `createMockRole()` dans mockFactory

---

#### ⏳ Tâche #2.6 - roleUpdate
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟡 IMPORTANT  
**Effort estimé** : 1.5 heures  

---

#### ⏳ Tâche #2.7 - roleDelete
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟡 IMPORTANT  
**Effort estimé** : 1 heure  

---

### ⏳ Invitations (2 listeners)

#### ⏳ Tâche #2.8 - inviteCreate
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟡 IMPORTANT  
**Effort estimé** : 1 heure  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/invites/inviteCreate.spec.ts`
- [ ] `createMockInvite()` dans mockFactory

---

#### ⏳ Tâche #2.9 - inviteDelete
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟡 IMPORTANT  
**Effort estimé** : 1 heure  

---

## 📅 Phase 3 : Listeners priorité basse (22 tests)

**Objectif** : Compléter la couverture avec les fonctionnalités avancées

**Durée estimée totale** : 15-20 heures

---

### ⏳ Threads (4 listeners)

Tâches #3.1 à #3.4 : threadCreate, threadUpdate, threadDelete, threadMembersUpdate

**Effort total estimé** : 4 heures

---

### ⏳ Emojis (3 listeners)

Tâches #3.5 à #3.7 : emojiCreate, emojiUpdate, emojiDelete

**Effort total estimé** : 2.5 heures

---

### ⏳ Stickers (3 listeners)

Tâches #3.8 à #3.10 : guildStickerCreate, guildStickerUpdate, guildStickerDelete

**Effort total estimé** : 2.5 heures

---

### ⏳ Events planifiés (5 listeners)

Tâches #3.11 à #3.15 : scheduledEventCreate/Update/Delete/UserAdd/UserRemove

**Effort total estimé** : 5 heures

---

### ⏳ Webhooks (1 listener)

Tâche #3.16 : webhooksUpdate

**Effort total estimé** : 45 minutes

---

### ⏳ Stage (3 listeners)

Tâches #3.17 à #3.19 : stageInstanceCreate, stageInstanceUpdate, stageInstanceDelete

**Effort total estimé** : 2.5 heures

---

### ⏳ Intégrations (1 listener)

Tâche #3.20 : guildIntegrationsUpdate

**Effort total estimé** : 45 minutes

---

### ⏳ Utilisateur (3 listeners)

Tâches #3.21 à #3.23 : userUpdate, presenceUpdate, typingStart

**Effort total estimé** : 3 heures

**Note** : presenceUpdate et typingStart sont très verbeux, tests à adapter

---

### ⏳ Interactions (1 listener)

Tâche #3.24 : interactionCreate

**Effort total estimé** : 1.5 heures

---

### ⏳ AutoMod Rules (3 listeners)

Tâches #3.25 à #3.27 : autoModerationRuleCreate/Update/Delete

**Effort total estimé** : 2.5 heures

---

### ⏳ Guild (3 listeners)

Tâches #3.28 à #3.30 : guildCreate, guildUpdate, guildDelete

**Effort total estimé** : 3 heures

---

## 🎯 Phase 4 : Tests d'intégration et de charge

### ⏳ Tests d'intégration (2 tests)

#### ⏳ Tâche #4.1 - Test du flux complet
**Fichier** : `tests/integration/eventFlow.spec.ts`  
**Effort** : 2 heures

**Tests** :
- [ ] Événements traités en séquence
- [ ] Batching fonctionnel
- [ ] Aucun événement perdu

---

#### ⏳ Tâche #4.2 - Test du EventBatcher
**Fichier** : `tests/integration/batching.spec.ts`  
**Effort** : 2 heures

**Tests** :
- [ ] Batch par guild
- [ ] Batch par type
- [ ] Flush automatique
- [ ] Priorités respectées

---

### ⏳ Tests de charge (3 tests)

#### ⏳ Tâche #4.3 - Volume élevé
**Fichier** : `tests/load/highVolume.spec.ts`  
**Effort** : 3 heures

**Tests** :
- [ ] 1000 événements/seconde
- [ ] 10000 événements simultanés
- [ ] 100 guilds simultanées

---

#### ⏳ Tâche #4.4 - Stress test
**Fichier** : `tests/load/stressTest.spec.ts`  
**Effort** : 2 heures

**Tests** :
- [ ] 50000 événements
- [ ] Détection fuites mémoire
- [ ] Performance stable

---

#### ⏳ Tâche #4.5 - Priorisation sous charge
**Fichier** : `tests/load/priorityTest.spec.ts`  
**Effort** : 2 heures

**Tests** :
- [ ] Événements critiques prioritaires
- [ ] Mélange événements normaux/critiques

---

## 📊 Tableau de bord

### Progression globale

```
Phase 0 (Infrastructure)    : ████████████████████ 100% (3/3)
Phase 1 (Haute priorité)    : █░░░░░░░░░░░░░░░░░░░   6% (1/16)
Phase 2 (Priorité moyenne)  : ░░░░░░░░░░░░░░░░░░░░   0% (0/9)
Phase 3 (Priorité basse)    : ░░░░░░░░░░░░░░░░░░░░   0% (0/22)
Phase 4 (Intégration/Charge): ░░░░░░░░░░░░░░░░░░░░   0% (0/5)

TOTAL                       : ██░░░░░░░░░░░░░░░░░░   7% (4/55)
```

### Temps estimé

| Phase | Temps estimé | Temps passé | Temps restant |
|-------|--------------|-------------|---------------|
| 0 | 3.5h | ✅ 3.5h | - |
| 1 | 8-12h | 2h | 6-10h |
| 2 | 6-8h | 0h | 6-8h |
| 3 | 15-20h | 0h | 15-20h |
| 4 | 9h | 0h | 9h |
| **TOTAL** | **41.5-52.5h** | **5.5h** | **36-47h** |

### Vélocité

- **Temps moyen par test** : ~1.5 heures
- **Tests complétés** : 4 (infrastructure + messageCreate)
- **Tests restants** : 51
- **Estimation** : ~1-2 semaines à temps plein

---

## ✅ Checklist avant de commencer une tâche

- [ ] Lire la description complète de la tâche
- [ ] Vérifier les dépendances (mocks nécessaires)
- [ ] Créer une branche git : `git checkout -b test/listener-name`
- [ ] Copier le template de test
- [ ] Adapter le template au listener

---

## ✅ Checklist après avoir complété une tâche

- [ ] Tous les tests passent : `npm run test -- listener-name.spec.ts`
- [ ] Couverture > 80% : `npm run test:coverage`
- [ ] Code formaté : `npm run format`
- [ ] Commit : `git commit -m "test(bot): add tests for listenerName"`
- [ ] Mettre à jour cette roadmap (cocher ✅)
- [ ] Mettre à jour le tableau de progression

---

## 🎯 Priorités recommandées

### Sprint 1 (1 semaine)
**Objectif** : Compléter Phase 1

1. Messages (3 restants) - 4h
2. Membres (3) - 4h
3. Modération (4) - 5h
4. Réactions (4) - 4h
5. Voice (1) - 2h

**Total** : 19h (~1 semaine)

### Sprint 2 (3-4 jours)
**Objectif** : Compléter Phase 2

1. Channels (4) - 4h
2. Rôles (3) - 3h
3. Invitations (2) - 2h

**Total** : 9h (~3-4 jours)

### Sprint 3 (2 semaines)
**Objectif** : Compléter Phase 3

Répartir les 22 listeners sur 2 semaines

**Total** : 20h (~2 semaines)

### Sprint 4 (3-4 jours)
**Objectif** : Tests d'intégration et de charge

**Total** : 9h (~3-4 jours)

---

## 🎉 Milestones

- [ ] **Milestone 1** : Phase 0 complète ✅
- [ ] **Milestone 2** : messageCreate testé ✅
- [ ] **Milestone 3** : Phase 1 complète (16 tests)
- [ ] **Milestone 4** : Phase 2 complète (25 tests cumulés)
- [ ] **Milestone 5** : Phase 3 complète (47 tests cumulés)
- [ ] **Milestone 6** : Tests d'intégration (49 tests cumulés)
- [ ] **Milestone 7** : Tests de charge (52 tests cumulés)
- [ ] **Milestone 8** : Couverture globale > 80%
- [ ] **Milestone 9** : Documentation complète
- [ ] **Milestone 10** : CI/CD intégré

---

## 📝 Notes et décisions

### Listeners désactivés par défaut

Certains listeners sont désactivés par défaut car très verbeux :
- `PRESENCE_UPDATE` : Milliers d'événements/minute
- `TYPING_START` : Très fréquent

**Décision** : Les tester quand même mais adapter les tests pour simuler un volume réduit.

### Listeners combinés

Certains événements sont combinés dans le batching :
- Tous les `MESSAGE_REACTION_*` utilisent le même batch config

**Décision** : Tests individuels mais partager les mocks.

---

**Version** : 1.0  
**Dernière mise à jour** : Octobre 2025  
**Prochaine révision** : Après Sprint 1 Tâche #1.2 - messageUpdate
**Statut** : ⏳ À FAIRE  
**Priorité** : 🔴 CRITIQUE  
**Effort estimé** : 1.5 heures  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/messages/messageUpdate.spec.ts`

**Tests à écrire** :
- [ ] Configuration
- [ ] Filtrage (bots, DMs)
- [ ] Extraction des changements (oldContent vs newContent)
- [ ] Gestion des partials
- [ ] Structure BotEventDto

**Dépendances** : Aucune

**Notes** :
- Le listener reçoit 2 paramètres : `oldMessage` et `newMessage`
- Tester les cas où `oldMessage` est un partial

---

#### ⏳ Tâche #1.3 - messageDelete
**Statut** : ⏳ À FAIRE  
**Priorité** : 🔴 CRITIQUE  
**Effort estimé** : 1.5 heures  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/messages/messageDelete.spec.ts`

**Tests à écrire** :
- [ ] Configuration
- [ ] Filtrage
- [ ] Gestion des partials (message non en cache)
- [ ] Extraction de données disponibles
- [ ] Structure BotEventDto

**Dépendances** : Aucune

**Notes** :
- Message peut être partial si pas en cache
- Tester avec/sans informations complètes

---

#### ⏳ Tâche #1.4 - messageDeleteBulk
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟡 IMPORTANT  
**Effort estimé** : 1 heure  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/messages/messageDeleteBulk.spec.ts`

**Tests à écrire** :
- [ ] Configuration
- [ ] Traitement de collection de messages
- [ ] Gestion des partials
- [ ] Structure BotEventDto

**Dépendances** : Aucune

---

### ⏳ Membres (3 listeners)

#### ⏳ Tâche #1.5 - guildMemberAdd
**Statut** : ⏳ À FAIRE  
**Priorité** : 🔴 CRITIQUE  
**Effort estimé** : 1.5 heures  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/members/guildMemberAdd.spec.ts`
- [ ] `createMockMember()` dans mockFactory (si pas déjà fait)

**Tests à écrire** :
- [ ] Configuration
- [ ] Extraction données membre (user, roles, joinedAt)
- [ ] Détection des bots
- [ ] Structure BotEventDto

**Dépendances** : Aucune

---

#### ⏳ Tâche #1.6 - guildMemberRemove
**Statut** : ⏳ À FAIRE  
**Priorité** : 🔴 CRITIQUE  
**Effort estimé** : 1 heure  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/members/guildMemberRemove.spec.ts`

**Tests à écrire** :
- [ ] Configuration
- [ ] Extraction données membre
- [ ] Structure BotEventDto

**Dépendances** : Tâche #1.5 (mock member)

---

#### ⏳ Tâche #1.7 - guildMemberUpdate
**Statut** : ⏳ À FAIRE  
**Priorité** : 🟡 IMPORTANT  
**Effort estimé** : 1.5 heures  

**Fichiers à créer** :
- [ ] `tests/unit/listeners/members/guildMemberUpdate.spec.ts`

**Tests à écrire** :
- [ ] Configuration
- [ ] Détection des changements (roles, nickname)
- [ ] Extraction oldMember vs newMember
- [ ] Structure BotEventDto

**Dépendances** : Tâche #1.5 (mock member)

---

### ⏳ Modération (4 listeners)

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

#### ⏳