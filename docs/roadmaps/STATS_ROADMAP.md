# 📊 Roadmap des Statistiques et Événements Discord

## 📊 Vue d'ensemble

**Date de création:** Octobre 2025  
**Version:** 1.0.0  
**Statut global:** 0/32 tâches complétées (0%)

**Objectif:** Système complet de collecte, agrégation et visualisation de statistiques Discord scalable pour 50k+ serveurs.

---

## 📈 Progression globale

```
Phase 1 - MVP:        ████░░░░░░ 0/27 (0%)
Phase 2 - Scaling:    ░░░░░░░░░░ 0/5 (0%)
```

**Temps estimé total:** 6-8 semaines (Phase 1)  
**Temps investi:** 0 heures  

---

## 🎯 Phase 1 - MVP (6-8 semaines)

### 📅 Semaine 1-2 : Modération (0/8)

**Objectif:** Tracking complet des actions de modération

#### ⚠️ Tâche #1 - Table moderation_logs
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 30 minutes

**Actions:**
- [ ] Créer migration Prisma pour table `moderation_logs`
- [ ] Définir schéma avec champs : guildId, action, targetUserId, moderatorId, reason, timestamp, details (JSONB)
- [ ] Créer index sur guildId, targetUserId, moderatorId, timestamp
- [ ] Exécuter migration : `npx prisma migrate dev --name add_moderation_logs`
- [ ] Vérifier table créée dans PostgreSQL

**Fichiers à créer/modifier:**
- `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/migrations/XXX_add_moderation_logs/`

---

#### ⚠️ Tâche #2 - Listener guildBanAdd
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 2 heures

**Actions:**
- [ ] Créer `apps/bot/src/listeners/moderation/guildBanAdd.ts`
- [ ] Récupérer audit log pour identifier le modérateur
- [ ] Créer BotEventDto avec BanEventData
- [ ] Tester avec ban manuel sur serveur dev
- [ ] Vérifier réception dans logs Backend

**Fichiers à créer:**
- `apps/bot/src/listeners/moderation/guildBanAdd.ts`

**Dépendances:**
- Structure BotEventDto existante ✅
- BanEventData interface ✅
- EventBatcher configuré ✅

---

#### ⚠️ Tâche #3 - Listener guildBanRemove
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 1 heure

**Actions:**
- [ ] Créer `apps/bot/src/listeners/moderation/guildBanRemove.ts`
- [ ] Récupérer audit log pour modérateur
- [ ] Créer BotEventDto avec UnbanEventData
- [ ] Tester avec unban manuel

**Fichiers à créer:**
- `apps/bot/src/listeners/moderation/guildBanRemove.ts`

---

#### ⚠️ Tâche #4 - Listener guildMemberRemove
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 2 heures

**Actions:**
- [ ] Créer `apps/bot/src/listeners/moderation/guildMemberRemove.ts`
- [ ] Détecter kick vs leave naturel via audit log
- [ ] Récupérer roles et joinedAt du membre
- [ ] Créer BotEventDto avec MemberRemoveEventData
- [ ] Tester les deux cas (kick ET leave)

**Fichiers à créer:**
- `apps/bot/src/listeners/moderation/guildMemberRemove.ts`

---

#### ⚠️ Tâche #5 - Backend handler handleBan
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 1 heure

**Actions:**
- [ ] Ajouter case `GUILD_BAN_ADD` dans BotEventHandlerService
- [ ] Implémenter méthode `handleBan(event: BotEventDto)`
- [ ] INSERT dans moderation_logs avec Prisma
- [ ] Créer tests unitaires (3 tests minimum)
- [ ] Tester end-to-end : ban Discord → DB

**Fichiers à modifier:**
- `apps/backend/src/modules/gateway/services/bot-event-handler.service.ts`

**Tests à créer:**
- Ban avec modérateur
- Ban sans modérateur (système)
- Ban avec raison

---

#### ⚠️ Tâche #6 - Backend handler handleUnban
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 30 minutes

**Actions:**
- [ ] Ajouter case `GUILD_BAN_REMOVE`
- [ ] Implémenter `handleUnban()`
- [ ] INSERT dans moderation_logs
- [ ] Tests unitaires

**Fichiers à modifier:**
- `apps/backend/src/modules/gateway/services/bot-event-handler.service.ts`

---

#### ⚠️ Tâche #7 - Backend handler handleMemberRemove
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 1 heure

**Actions:**
- [ ] Ajouter case `GUILD_MEMBER_REMOVE`
- [ ] Implémenter `handleMemberRemove()`
- [ ] Différencier kick vs leave dans action
- [ ] Tests unitaires (kick ET leave)

**Fichiers à modifier:**
- `apps/backend/src/modules/gateway/services/bot-event-handler.service.ts`

---

#### ⚠️ Tâche #8 - Tests end-to-end modération
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🟠 IMPORTANT  
**Effort estimé:** 1 heure

**Actions:**
- [ ] Créer serveur Discord de test
- [ ] Tester ban → vérifier DB
- [ ] Tester unban → vérifier DB
- [ ] Tester kick → vérifier DB
- [ ] Tester leave naturel → vérifier DB
- [ ] Vérifier tous les champs remplis correctement
- [ ] Documenter procédure de test

**Livrable:** Historique modération fonctionnel et testé

---

### 📅 Semaine 3 : Invitations (0/7)

**Objectif:** Tracker qui invite qui

#### ⚠️ Tâche #9 - Table invite_tracking
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 30 minutes

**Actions:**
- [ ] Créer migration Prisma pour `invite_tracking`
- [ ] Schéma : guildId, inviteCode, inviterId, inviteeId, invitedAt, etc.
- [ ] Index sur guildId, inviterId, inviteeId
- [ ] Exécuter migration

**Fichiers à modifier:**
- `apps/backend/prisma/schema.prisma`

---

#### ⚠️ Tâche #10 - Service InviteTracker
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 2 heures

**Actions:**
- [ ] Créer `apps/bot/src/services/inviteTracker.service.ts`
- [ ] Cache Map des invites par guild
- [ ] Méthode `cacheGuildInvites(guildId)`
- [ ] Méthode `detectUsedInvite(guildId, beforeInvites, afterInvites)`
- [ ] Méthode `getInvite(guildId, code)`
- [ ] Tests unitaires du service

**Fichiers à créer:**
- `apps/bot/src/services/inviteTracker.service.ts`

---

#### ⚠️ Tâche #11 - Listener inviteCreate
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 1 heure

**Actions:**
- [ ] Créer `apps/bot/src/listeners/invite/inviteCreate.ts`
- [ ] Ajouter invite au cache InviteTracker
- [ ] Créer BotEventDto avec InviteCreateEventData
- [ ] Tester création invite

**Fichiers à créer:**
- `apps/bot/src/listeners/invite/inviteCreate.ts`

---

#### ⚠️ Tâche #12 - Listener inviteDelete
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 30 minutes

**Actions:**
- [ ] Créer `apps/bot/src/listeners/invite/inviteDelete.ts`
- [ ] Retirer invite du cache
- [ ] Créer BotEventDto avec InviteDeleteEventData

**Fichiers à créer:**
- `apps/bot/src/listeners/invite/inviteDelete.ts`

---

#### ⚠️ Tâche #13 - Modifier guildMemberAdd pour tracking
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 2 heures

**Actions:**
- [ ] Modifier listener `guildMemberAdd.ts` existant
- [ ] Avant join : fetch invites (ou utiliser cache)
- [ ] Après join : fetch invites à nouveau
- [ ] Appeler `inviteTracker.detectUsedInvite()`
- [ ] Si détecté : créer event INVITE_USE
- [ ] Créer aussi event GUILD_MEMBER_ADD avec inviter info
- [ ] Tester avec vraie invitation

**Fichiers à modifier:**
- `apps/bot/src/listeners/member/guildMemberAdd.ts` (ou créer si n'existe pas)

---

#### ⚠️ Tâche #14 - Backend handlers invitations
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 1 heure

**Actions:**
- [ ] Ajouter case `INVITE_USE` dans handler
- [ ] Implémenter `handleInviteUse()`
- [ ] INSERT dans invite_tracking
- [ ] Tests unitaires

**Fichiers à modifier:**
- `apps/backend/src/modules/gateway/services/bot-event-handler.service.ts`

---

#### ⚠️ Tâche #15 - API endpoint invite stats
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🟠 IMPORTANT  
**Effort estimé:** 1 heure

**Actions:**
- [ ] Créer `GET /api/guilds/:guildId/invite-stats`
- [ ] Calculer top recruteurs (membres avec le plus d'invités)
- [ ] Compter invites actives vs utilisées
- [ ] Retourner DTO avec stats
- [ ] Tester endpoint

**Fichiers à créer:**
- Controller dans module guilds

**Livrable:** Stats d'invitation fonctionnelles

---

### 📅 Semaine 4 : Agrégation messages/vocal (0/8)

**Objectif:** Première version metrics snapshot

#### ⚠️ Tâche #16 - Service MetricsCollector
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 4 heures

**Actions:**
- [ ] Créer `apps/bot/src/services/metricsCollector.service.ts`
- [ ] Map en mémoire des compteurs par guild
- [ ] Méthode `incrementMessage(guildId, channelId, userId)`
- [ ] Méthode `trackVoiceSession(guildId, channelId, userId, durationMin)`
- [ ] Méthode `trackReaction(guildId, emoji)`
- [ ] Timer flush automatique (60s)
- [ ] Méthode `flush(guildId)` → génère MetricsSnapshotData
- [ ] Méthode `generateSnapshot()` avec calculs agrégats
- [ ] Helpers pour récupérer noms channels/users
- [ ] Tests unitaires du service

**Fichiers à créer:**
- `apps/bot/src/services/metricsCollector.service.ts`

---

#### ⚠️ Tâche #17 - Modifier listener messageCreate
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 30 minutes

**Actions:**
- [ ] Modifier `apps/bot/src/listeners/message/messageCreate.ts`
- [ ] Appeler `metricsCollector.incrementMessage()`
- [ ] Ne PAS envoyer d'événement individuel
- [ ] Tester avec plusieurs messages

**Fichiers à modifier:**
- `apps/bot/src/listeners/message/messageCreate.ts`

---

#### ⚠️ Tâche #18 - Listener voiceStateUpdate
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 2 heures

**Actions:**
- [ ] Créer `apps/bot/src/listeners/voice/voiceStateUpdate.ts`
- [ ] Détecter join vocal (oldState.channel null, newState.channel présent)
- [ ] Détecter leave vocal (oldState.channel présent, newState.channel null)
- [ ] Détecter move (changement de channel)
- [ ] Calculer durée session pour leave
- [ ] Appeler `metricsCollector.trackVoiceSession()`
- [ ] Tester les 3 cas

**Fichiers à créer:**
- `apps/bot/src/listeners/voice/voiceStateUpdate.ts`

---

#### ⚠️ Tâche #19 - Table metrics_snapshots
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 30 minutes

**Actions:**
- [ ] Créer migration Prisma
- [ ] Champs : guildId, periodStart, periodEnd, periodDuration, data (JSONB), compteurs extraits
- [ ] Index sur guildId + periodStart DESC
- [ ] Index GIN sur data (JSONB)
- [ ] Exécuter migration

**Fichiers à modifier:**
- `apps/backend/prisma/schema.prisma`

---

#### ⚠️ Tâche #20 - Table member_stats
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 30 minutes

**Actions:**
- [ ] Créer migration Prisma
- [ ] Champs cumulés : totalMessages, totalVoiceMinutes, totalReactions
- [ ] Champs quotidiens/hebdomadaires avec reset
- [ ] Constraint UNIQUE sur (guildId, userId)
- [ ] Index sur guildId + compteurs DESC
- [ ] Exécuter migration

**Fichiers à modifier:**
- `apps/backend/prisma/schema.prisma`

---

#### ⚠️ Tâche #21 - Backend handler handleMetricsSnapshot
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 2 heures

**Actions:**
- [ ] Ajouter case `METRICS_SNAPSHOT`
- [ ] Implémenter `handleMetricsSnapshot()`
- [ ] INSERT snapshot complet dans metrics_snapshots
- [ ] Upsert member_stats pour chaque membre actif (increment totaux)
- [ ] Gérer daily/weekly reset
- [ ] Tests unitaires
- [ ] Tester avec snapshot réel

**Fichiers à modifier:**
- `apps/backend/src/modules/gateway/services/bot-event-handler.service.ts`

---

#### ⚠️ Tâche #22 - Initialiser MetricsCollector au boot
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 30 minutes

**Actions:**
- [ ] Instancier MetricsCollector dans container Sapphire
- [ ] Ajouter dans `apps/bot/src/index.ts` ou listener ready
- [ ] Vérifier accessible via `container.metricsCollector`

**Fichiers à modifier:**
- `apps/bot/src/index.ts` ou `apps/bot/src/listeners/ready.ts`

---

#### ⚠️ Tâche #23 - Tests métriques end-to-end
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🟠 IMPORTANT  
**Effort estimé:** 1 heure

**Actions:**
- [ ] Envoyer 10-20 messages sur serveur dev
- [ ] Attendre 1 minute (flush)
- [ ] Vérifier snapshot dans DB (metrics_snapshots)
- [ ] Vérifier member_stats mis à jour
- [ ] Join vocal 2 minutes → vérifier tracking
- [ ] Valider tous les compteurs corrects

**Livrable:** Compteurs messages/vocal fonctionnels

---

### 📅 Semaine 5 : Dashboard Frontend (0/4)

**Objectif:** Première visualisation des stats

#### ⚠️ Tâche #24 - Backend endpoint GET /guilds/:id/stats/overview
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 2 heures

**Actions:**
- [ ] Créer GuildStatsController ou ajouter dans GuildsController
- [ ] Endpoint retourne : total messages/vocal today/week/month
- [ ] Top 10 channels actifs
- [ ] Top 10 membres actifs
- [ ] Requêtes Prisma optimisées avec agrégations
- [ ] Tester endpoint avec Postman

**Fichiers à créer/modifier:**
- Controller + Service dans apps/backend

---

#### ⚠️ Tâche #25 - Backend endpoint GET /guilds/:id/moderation/recent
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 1 heure

**Actions:**
- [ ] Endpoint retourne 50 dernières actions modération
- [ ] Tri par timestamp DESC
- [ ] Include détails complets (modérateur, cible, raison)
- [ ] Pagination possible (optionnel)
- [ ] Tester endpoint

**Fichiers à créer/modifier:**
- Controller modération

---

#### ⚠️ Tâche #26 - Frontend component GuildDashboardComponent
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 3 heures

**Actions:**
- [ ] Créer component `apps/sakai/src/app/features/guild-dashboard/`
- [ ] Cards PrimeNG avec stats principales (messages, vocal, membres)
- [ ] Graph Chart.js activité dernière semaine
- [ ] Tableau modération récente (PrimeTable)
- [ ] Service facade pour appels API
- [ ] Routing vers `/guilds/:id/dashboard`
- [ ] Tester affichage avec données réelles

**Fichiers à créer:**
- Component, template, service, routing

---

#### ⚠️ Tâche #27 - Frontend component LeaderboardComponent
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🟠 IMPORTANT  
**Effort estimé:** 2 heures

**Actions:**
- [ ] Créer component leaderboard
- [ ] Tabs : Top messages / Top vocal / Top activité globale
- [ ] DataView PrimeNG avec avatars membres
- [ ] Tri dynamique
- [ ] Design responsive
- [ ] Tester affichage

**Fichiers à créer:**
- Component leaderboard

**Livrable:** Dashboard fonctionnel avec données réelles

---

### 📅 Semaine 6 : Polish & Tests (0/5)

**Objectif:** Finaliser MVP et préparer déploiement

#### ⚠️ Tâche #28 - Tests end-to-end complet
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Effort estimé:** 3 heures

**Actions:**
- [ ] Scénario 1 : Ban → vérifier dashboard
- [ ] Scénario 2 : 100 messages → vérifier stats
- [ ] Scénario 3 : Vocal 10 min → vérifier compteurs
- [ ] Scénario 4 : Invitation utilisée → vérifier tracking
- [ ] Vérifier tous les flows bout en bout
- [ ] Documenter procédures de test

---

#### ⚠️ Tâche #29 - Gestion erreurs et edge cases
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🟠 IMPORTANT  
**Effort estimé:** 2 heures

**Actions:**
- [ ] Gérer bot offline → backup SQLite fonctionne
- [ ] Gérer gateway down → retry automatique
- [ ] Gérer DB erreurs → logs Sentry
- [ ] Gérer données manquantes (membre inconnu, etc.)
- [ ] Try/catch partout avec logs appropriés

---

#### ⚠️ Tâche #30 - Documentation utilisateur
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🟠 IMPORTANT  
**Effort estimé:** 2 heures

**Actions:**
- [ ] Guide utilisation dashboard
- [ ] Explication des métriques
- [ ] FAQ stats
- [ ] Screenshots/vidéos démo

---

#### ⚠️ Tâche #31 - Optimisation requêtes DB
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🟡 OPTIMISATION  
**Effort estimé:** 2 heures

**Actions:**
- [ ] EXPLAIN ANALYZE sur requêtes lourdes
- [ ] Vérifier usage des index
- [ ] Optimiser agrégations
- [ ] Tester avec 1000+ rows

---

#### ⚠️ Tâche #32 - Tests charge
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🟡 OPTIMISATION  
**Effort estimé:** 2 heures

**Actions:**
- [ ] Simuler 1000 messages/min sur 1 serveur
- [ ] Vérifier latence < 2s pour snapshots
- [ ] Vérifier RAM bot < 512MB
- [ ] Vérifier CPU < 30%
- [ ] Documenter limites détectées

**Livrable:** MVP prêt pour beta test sur 5-10 serveurs

---

## 🎯 Phase 2 - Scaling (2-3 mois)

### Futures fonctionnalités

#### ⚠️ Tâche #33 - Réactions tracking détaillé
**Statut:** ⚠️ À FAIRE (Phase 2)  
**Priorité:** 🟢 FUTUR

#### ⚠️ Tâche #34 - Member activity snapshot détaillé
**Statut:** ⚠️ À FAIRE (Phase 2)  
**Priorité:** 🟢 FUTUR

#### ⚠️ Tâche #35 - Sharding bot (>2500 serveurs)
**Statut:** ⚠️ À FAIRE (Phase 2)  
**Priorité:** 🟢 FUTUR

#### ⚠️ Tâche #36 - Partitioning PostgreSQL
**Statut:** ⚠️ À FAIRE (Phase 2)  
**Priorité:** 🟢 FUTUR

#### ⚠️ Tâche #37 - WebSocket temps réel Frontend
**Statut:** ⚠️ À FAIRE (Phase 2)  
**Priorité:** 🟢 FUTUR

---

## 📊 Tableau récapitulatif Phase 1

| # | Tâche | Semaine | Priorité | Statut | Effort |
|---|-------|---------|----------|--------|--------|
| 1 | Table moderation_logs | S1 | 🔴 | ⚠️ | 30m |
| 2 | Listener guildBanAdd | S1 | 🔴 | ⚠️ | 2h |
| 3 | Listener guildBanRemove | S1 | 🔴 | ⚠️ | 1h |
| 4 | Listener guildMemberRemove | S1 | 🔴 | ⚠️ | 2h |
| 5 | Handler handleBan | S1 | 🔴 | ⚠️ | 1h |
| 6 | Handler handleUnban | S1 | 🔴 | ⚠️ | 30m |
| 7 | Handler handleMemberRemove | S2 | 🔴 | ⚠️ | 1h |
| 8 | Tests E2E modération | S2 | 🟠 | ⚠️ | 1h |
| 9 | Table invite_tracking | S3 | 🔴 | ⚠️ | 30m |
| 10 | Service InviteTracker | S3 | 🔴 | ⚠️ | 2h |
| 11 | Listener inviteCreate | S3 | 🔴 | ⚠️ | 1h |
| 12 | Listener inviteDelete | S3 | 🔴 | ⚠️ | 30m |
| 13 | Modifier guildMemberAdd | S3 | 🔴 | ⚠️ | 2h |
| 14 | Handler invitations | S3 | 🔴 | ⚠️ | 1h |
| 15 | API invite stats | S3 | 🟠 | ⚠️ | 1h |
| 16 | Service MetricsCollector | S4 | 🔴 | ⚠️ | 4h |
| 17 | Modifier messageCreate | S4 | 🔴 | ⚠️ | 30m |
| 18 | Listener voiceStateUpdate | S4 | 🔴 | ⚠️ | 2h |
| 19 | Table metrics_snapshots | S4 | 🔴 | ⚠️ | 30m |
| 20 | Table member_stats | S4 | 🔴 | ⚠️ | 30m |
| 21 | Handler handleMetricsSnapshot | S4 | 🔴 | ⚠️ | 2h |
| 22 | Init MetricsCollector | S4 | 🔴 | ⚠️ | 30m |
| 23 | Tests E2E métriques | S4 | 🟠 | ⚠️ | 1h |
| 24 | API stats overview | S5 | 🔴 | ⚠️ | 2h |
| 25 | API moderation recent | S5 | 🔴 | ⚠️ | 1h |
| 26 | Component GuildDashboard | S5 | 🔴 | ⚠️ | 3h |
| 27 | Component Leaderboard | S5 | 🟠 | ⚠️ | 2h |
| 28 | Tests E2E complet | S6 | 🔴 | ⚠️ | 3h |
| 29 | Gestion erreurs | S6 | 🟠 | ⚠️ | 2h |
| 30 | Documentation utilisateur | S6 | 🟠 | ⚠️ | 2h |
| 31 | Optimisation DB | S6 | 🟡 | ⚠️ | 2h |
| 32 | Tests charge | S6 | 🟡 | ⚠️ | 2h |

**Total Phase 1:** ~48 heures sur 6 semaines

---

## 📚 Ressources

### Documentation technique
- `docs/STATS_ARCHITECTURE.md` - Architecture complète ✅
- `packages/shared-types/src/dtos/events/bot-event.dto.ts` - DTOs ✅
- `packages/shared-types/src/enums/eventTypes.enum.ts` - Types événements ✅

### Exemples de code
- Voir STATS_ARCHITECTURE.md sections "Exemples pratiques"

---

## ✅ Checklist avant de commencer chaque tâche

- [ ] Lire la description complète de la tâche
- [ ] Vérifier les dépendances (tâches précédentes complétées)
- [ ] Créer une branche git : `git checkout -b stats/task-XX`
- [ ] Lire la section correspondante dans STATS_ARCHITECTURE.md
- [ ] Avoir le serveur Discord de test prêt

---

## ✅ Checklist après avoir complété une tâche

- [ ] Tests unitaires créés et passent (si applicable)
- [ ] Tests end-to-end passent (si applicable)
- [ ] Code formaté et lint propre
- [ ] Commit avec message clair : `feat(stats): implement task #XX - description`
- [ ] Mettre à jour cette roadmap (cocher ✅ la tâche)
- [ ] Mettre à jour le statut dans le tableau récapitulatif
- [ ] Documenter tout changement important dans STATS_ARCHITECTURE.md
- [ ] Merge dans main si tout OK

---

## 🎯 Plan d'action recommandé

### Sprint 1 - Modération (Semaines 1-2)
**Objectif:** Historique modération complet fonctionnel

**Ordre d'exécution:**
1. Tâche #1 - Table moderation_logs
2. Tâche #2 - Listener guildBanAdd
3. Tâche #5 - Handler handleBan
4. Tester ban manuel → vérifier DB ✅
5. Tâche #3 - Listener guildBanRemove
6. Tâche #6 - Handler handleUnban
7. Tester unban manuel → vérifier DB ✅
8. Tâche #4 - Listener guildMemberRemove
9. Tâche #7 - Handler handleMemberRemove
10. Tâche #8 - Tests E2E complet modération

**Livrable:** Logs modération dans PostgreSQL, consultables

---

### Sprint 2 - Invitations (Semaine 3)
**Objectif:** Système de tracking invitations

**Ordre d'exécution:**
1. Tâche #9 - Table invite_tracking
2. Tâche #10 - Service InviteTracker
3. Tester service isolément avec tests unitaires ✅
4. Tâche #11 - Listener inviteCreate
5. Tâche #12 - Listener inviteDelete
6. Tâche #13 - Modifier guildMemberAdd
7. Tester vraie invitation → vérifier détection ✅
8. Tâche #14 - Handler invitations
9. Tâche #15 - API invite stats
10. Tester API avec Postman ✅

**Livrable:** "Membre X a invité 5 personnes"

---

### Sprint 3 - Métriques (Semaine 4)
**Objectif:** Premier snapshot fonctionnel

**Ordre d'exécution:**
1. Tâche #19 - Table metrics_snapshots
2. Tâche #20 - Table member_stats
3. Tâche #16 - Service MetricsCollector
4. Tester service isolément ✅
5. Tâche #17 - Modifier messageCreate
6. Tâche #18 - Listener voiceStateUpdate
7. Tâche #22 - Init MetricsCollector au boot
8. Envoyer 50 messages → attendre 1 min → vérifier snapshot ✅
9. Tâche #21 - Handler handleMetricsSnapshot
10. Tâche #23 - Tests E2E métriques

**Livrable:** Snapshots toutes les minutes dans DB

---

### Sprint 4 - Dashboard (Semaine 5)
**Objectif:** Visualisation des stats

**Ordre d'exécution:**
1. Tâche #24 - API stats overview
2. Tester API → vérifier données ✅
3. Tâche #25 - API moderation recent
4. Tester API ✅
5. Tâche #26 - Component GuildDashboard
6. Tester affichage avec vraies données ✅
7. Tâche #27 - Component Leaderboard
8. Polish UI/UX

**Livrable:** Dashboard avec graphiques fonctionnels

---

### Sprint 5 - Finition (Semaine 6)
**Objectif:** Production ready

**Ordre d'exécution:**
1. Tâche #28 - Tests E2E complet
2. Tâche #29 - Gestion erreurs
3. Tâche #30 - Documentation
4. Tâche #31 - Optimisation DB
5. Tâche #32 - Tests charge
6. Beta test sur 5 serveurs réels
7. Corrections bugs
8. Déploiement

**Livrable:** MVP prêt pour production

---

## 🐛 Problèmes connus et solutions

### Problème : EventBatcher ne flush pas
**Cause:** Timer pas démarré ou config incorrecte  
**Solution:** Vérifier `batchesConfig` a bien `maxWait` défini, vérifier `ensureFlushTimer()` appelé

### Problème : Audit log ne retourne pas le modérateur
**Cause:** Fetch trop tard (>5s après l'action)  
**Solution:** Fetch immédiatement dans le listener, vérifier timestamp

### Problème : MetricsCollector perd des données
**Cause:** Flush avant que toutes les données soient collectées  
**Solution:** Augmenter `flushInterval` ou vérifier logique d'agrégation

### Problème : Snapshot trop gros (>10MB)
**Cause:** Trop de membres actifs  
**Solution:** Limiter `maxTopMembers`, paginer, ou envoyer en plusieurs snapshots

### Problème : DB slow sur requêtes agrégées
**Cause:** Index manquants  
**Solution:** Ajouter index sur colonnes filtrées/triées, utiliser EXPLAIN ANALYZE

---

## 📊 Métriques de succès

### Techniques

| Métrique | Objectif | Critique |
|----------|----------|----------|
| Latence event critique | < 300ms | < 1s |
| Latence snapshot | < 2s | < 5s |
| Throughput events | 1000/s | 100/s |
| RAM Bot | < 512MB | < 2GB |
| CPU Bot | < 30% | < 70% |
| Précision compteurs | 100% | > 95% |

### Fonctionnelles

- [ ] Tous les bans/kicks loggés correctement
- [ ] Tracking invitations fonctionne à 100%
- [ ] Snapshots générés toutes les minutes sans erreur
- [ ] Dashboard affiche données à jour (< 2 min de retard)
- [ ] Top leaderboards corrects
- [ ] Tests E2E passent tous
- [ ] Zéro perte de données sur 48h
- [ ] Beta testeurs satisfaits (>8/10)

---

## 🚀 Prochaines étapes (après Phase 1)

### Phase 2 prioritaire
1. **Sharding bot** - Si > 2500 serveurs
2. **Cache Redis** - Optimisation requêtes fréquentes
3. **Réactions détaillées** - Top emojis par membre
4. **Member activity snapshot** - Stats tous les membres (pas juste top 20)
5. **WebSocket Frontend** - Stats temps réel sans refresh

### Phase 3 - Features avancées
1. **Système XP/Levels**
2. **Prédictions analytics** (ML)
3. **Auto-modération intelligente**
4. **Rapports automatiques** (PDF export)
5. **API publique**

---

## 📞 Support et questions

**Problème technique ?** 
- Consulter `STATS_ARCHITECTURE.md` section correspondante
- Vérifier les logs : `pm2 logs bot`, `pm2 logs backend`
- Tester isolément le composant problématique

**Besoin d'aide ?**
- Ouvrir une issue GitHub avec tag `stats`
- Documenter : tâche bloquée, erreur exacte, steps to reproduce

**Amélioration de la roadmap ?**
- Ce document est vivant
- Proposer des changements via PR
- Ajouter des tâches découvertes en route

---

## 🎉 Célébration des jalons

### 🏆 Jalon 1 - Modération (8 tâches)
**Condition:** Tâches #1-8 complétées  
**Récompense:** Premier vrai use case fonctionnel ! 🎊

### 🏆 Jalon 2 - Invitations (7 tâches)
**Condition:** Tâches #9-15 complétées  
**Récompense:** Feature unique vs concurrents ! 🚀

### 🏆 Jalon 3 - Métriques (8 tâches)
**Condition:** Tâches #16-23 complétées  
**Récompense:** Cœur du système stats fonctionne ! 💪

### 🏆 Jalon 4 - Dashboard (4 tâches)
**Condition:** Tâches #24-27 complétées  
**Récompense:** Enfin visible pour les utilisateurs ! 🎨

### 🏆 Jalon 5 - MVP Complet (5 tâches)
**Condition:** Tâches #28-32 complétées  
**Récompense:** PRÊT POUR LA PRODUCTION ! 🎉🎉🎉

---

## 📈 Graphique de progression

```
Semaine 1  ████░░░░░░ 0/32 (0%)
Semaine 2  ████████░░ 0/32 (0%)
Semaine 3  ████████░░ 0/32 (0%)
Semaine 4  ████████░░ 0/32 (0%)
Semaine 5  ████████░░ 0/32 (0%)
Semaine 6  ████████░░ 0/32 (0%)

Objectif final: ██████████ 32/32 (100%)
```

**Ce graphique sera mis à jour à chaque tâche complétée** ✅

---

## 🔄 Historique des mises à jour

### Version 1.0.0 (Octobre 2025)
- 📅 Création initiale de la roadmap
- 📋 32 tâches Phase 1 définies
- 📚 Structure inspirée de security_roadmap.md
- 🎯 Plan d'action sur 6 semaines établi
- 📊 Tableaux récapitulatifs créés
- ✅ Checklists de validation ajoutées

### Version 1.0.1 (À venir - après première tâche)
- ✅ Tâche #1 complétée
- 📈 Progression: 1/32 (3%)
- ...

---

## 🎓 Conseils pour travailler seul efficacement

### Organisation quotidienne
1. **Matin:** Choisir 1-2 tâches du jour
2. **Développer:** Focus sur la tâche sans distraction
3. **Tester:** Valider immédiatement (ne pas accumuler)
4. **Documenter:** Mettre à jour roadmap + commit
5. **Review:** Relire code avant de merge

### Quand tu bloques
1. Faire une pause (15 min)
2. Relire STATS_ARCHITECTURE.md
3. Consulter les exemples de code
4. Tester en isolation (découper le problème)
5. Si toujours bloqué : documenter + passer à autre chose

### Motivation
- ✅ Cocher les cases est satisfaisant !
- 📈 Voir la progression augmenter
- 🎉 Célébrer chaque jalon atteint
- 📸 Faire des screenshots des milestones
- 🚀 Imaginer le produit final

### Éviter le burnout
- 🎯 Max 2-3h de code intense par session
- ⏸️ Pause toutes les heures
- 🏃 Alterner code/doc/tests
- 🌙 Pas de code après 22h (fatigue = bugs)
- 🎮 Récompense après chaque jalon

