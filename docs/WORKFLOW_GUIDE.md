# 🚀 WORKFLOW GUIDE - Discord Admin App

> **Version 2.0 - Novembre 2025**  
> Guide complet pour travailler efficacement sur le projet

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#-vue-densemble)
2. [Configuration Initiale](#-configuration-initiale)
3. [Démarrer une Session](#-démarrer-une-session)
4. [Pendant le Développement](#-pendant-le-développement)
5. [Terminer une Tâche](#-terminer-une-tâche)
6. [Travailler avec Claude](#-travailler-avec-claude)
7. [Review Hebdomadaire](#-review-hebdomadaire)
8. [Bonnes Pratiques](#-bonnes-pratiques)
9. [Troubleshooting](#-troubleshooting)

---

## 🎯 Vue d'Ensemble

### Système de Suivi

Le projet utilise un **système de tracking** basé sur :
- **PROGRESS_TRACKER.json** : État actuel, tâches, progression
- **Roadmap MVP** : Plan détaillé 4 semaines (53 tâches)
- **Scripts npm** : Commandes pour gérer le tracking

### Workflow en 3 Temps

```
1. DÉMARRAGE
   ├─ Voir status
   ├─ Identifier tâche
   └─ Démarrer

2. DÉVELOPPEMENT
   ├─ Coder
   ├─ Commit régulier
   └─ Update progression

3. TERMINAISON
   ├─ Vérifier
   ├─ Commit final
   └─ Marquer complete
```

---

## ⚙️ Configuration Initiale

### Prérequis

Assurez-vous d'avoir :
- ✅ Node.js installé
- ✅ Git configuré
- ✅ Projet cloné localement
- ✅ Dependencies installées (`npm install`)

### Scripts npm Disponibles

Vérifiez que ces scripts existent dans votre `package.json` :

```json
{
  "scripts": {
    "progress": "node scripts/progress/show.js",
    "progress:next": "node scripts/progress/next.js",
    "progress:start": "node scripts/progress/start.js",
    "progress:update": "node scripts/progress/update.js",
    "progress:complete": "node scripts/progress/complete.js",
    "progress:note": "node scripts/progress/note.js"
  }
}
```

**Si les scripts n'existent pas encore**, créez-les ou utilisez manuellement le fichier `PROGRESS_TRACKER.json`.

---

## 🏁 Démarrer une Session

### Étape 1 : Vérifier le Status (2 min)

```bash
npm run progress
```

**Ce que vous voyez :**
```
📊 STATUS DU PROJET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Projet: Discord Admin App
Phase actuelle: Phase 1 - Stats Module Backend
Sprint: architecture-design
Progression globale: 15%

🔥 Tâche en cours:
  ⋯ 1.2 - Schema Prisma + TimescaleDB
     Progression: ███░░░░░░░ 30%
     Temps restant: ~2h

📋 Dernières tâches complétées:
  ✓ 1.1 - Architecture & Design (8h)

🎯 Prochaines tâches:
  → 1.3 - DTOs TypeScript (2h)
  → 2.1 - Module Definition (2h)
```

**Informations clés :**
- Phase actuelle
- Tâche en cours (et sa progression)
- Tâches complétées récemment
- Prochaines tâches

---

### Étape 2 : Décider de la Tâche

**Option A : Continuer la tâche en cours**

Si une tâche est déjà en cours (progression > 0%), continuez directement.

```bash
# Ouvrir les fichiers de la tâche
code apps/backend/prisma/schema.prisma
```

**Option B : Démarrer une nouvelle tâche**

```bash
# Voir la prochaine tâche recommandée
npm run progress:next
```

**Sortie :**
```
🎯 PROCHAINE TÂCHE RECOMMANDÉE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID: 1.3
Nom: DTOs TypeScript
Phase: phase-1
Priorité: high
Temps estimé: 2h

Dépendances:
  ✓ 1.1 - Architecture & Design
  ✓ 1.2 - Schema Prisma

Description:
Créer tous les DTOs TypeScript pour le Stats Module
dans packages/shared-types/src/dtos/app/stats/

Pour démarrer: npm run progress:start 1.3
```

---

### Étape 3 : Démarrer la Tâche

```bash
npm run progress:start 1.3
```

**Résultat :**
```
✅ Tâche 1.3 démarrée !

DTOs TypeScript
Temps estimé: 2h
Phase: Stats Module Backend

📝 Pour mettre à jour la progression:
   npm run progress:update 1.3 <percentage>

💡 Astuce: Ajoutez des notes importantes:
   npm run progress:note "Note: ..."
```

**Ce qui se passe :**
- ✅ Tâche 1.3 marquée comme "in_progress"
- ✅ `PROGRESS_TRACKER.json` mis à jour
- ✅ Timestamp de début enregistré

---

### Étape 4 : Consulter la Roadmap Détaillée

**Lire les détails de la tâche :**

```bash
# Ouvrir la roadmap
code docs/roadmaps/MVP_ROADMAP.md

# Ou chercher la tâche spécifique
grep -A 20 "Tâche 1.3" docs/roadmaps/MVP_ROADMAP.md
```

**Ou consulter** : `docs/roadmaps/ROADMAP_VISUELLE.md` pour la vue d'ensemble.

---

## 💻 Pendant le Développement

### Mettre à Jour la Progression (Toutes les 1-2h)

**Fréquence recommandée :** À chaque étape importante ou toutes les 1-2 heures

```bash
# Exemple : vous avez fait 25% de la tâche
npm run progress:update 1.3 25

# Plus tard : 50%
npm run progress:update 1.3 50

# Presque fini : 90%
npm run progress:update 1.3 90
```

**Sortie :**
```
✅ Progression mise à jour
   Tâche 1.3 : ██████░░░░ 60%
   Temps restant estimé: 48min
```

**Pourquoi c'est important ?**
- 🎯 **Motivation** : Voir la progression visuellement
- 📊 **Estimation** : Savoir combien de temps il reste
- 🔄 **Reprise** : Si vous vous arrêtez, vous savez où vous en êtes
- 📈 **Vélocité** : Améliorer les estimations futures

---

### Commits Réguliers

**Pattern recommandé :**

```bash
# Après chaque sous-étape significative (toutes les 1-2h)
git add .
git commit -m "feat(stats): Create stats-config.dto.ts

- Added StatsModuleConfigDTO interface
- Added StatsFeatures and StatsTracking interfaces
- Added plan enums (FREE, PREMIUM, ENTERPRISE)

Refs: Task 1.3"
```

**Format des commits :**

```
<type>(<scope>): <description courte>

<description détaillée (optionnel)>
- Point 1
- Point 2

Refs: Task X.Y
```

**Types courants :**
- `feat` : Nouvelle fonctionnalité
- `fix` : Correction de bug
- `refactor` : Refactoring sans changement de fonctionnalité
- `docs` : Documentation uniquement
- `test` : Ajout ou modification de tests
- `chore` : Tâches de maintenance

**Scopes courants :**
- `stats` : Module Stats
- `welcome` : Module Welcome
- `auth` : Authentification
- `moderation` : Modération
- `frontend` : Frontend global
- `backend` : Backend global
- `bot` : Bot Discord

---

### Ajouter des Notes (Optionnel mais Recommandé)

**Quand ajouter une note ?**
- ✅ Décision technique importante
- ✅ Problème rencontré (et solution)
- ✅ Changement par rapport au plan initial
- ✅ Découverte importante
- ✅ TODO à ne pas oublier

```bash
# Décision
npm run progress:note "Décision: Utiliser RxJS BehaviorSubject pour cache stats au lieu de simple Observable"

# Problème
npm run progress:note "Problème: PrimeNG Chart nécessite config spéciale pour time-series. Solution: utiliser moment.js pour formater dates"

# Optimisation
npm run progress:note "Optimisation: Créé pipe Angular formatDuration pour éviter répétition du code"

# TODO
npm run progress:note "TODO: Ajouter tests unitaires pour VoiceTrackerService après merge"
```

**Résultat :**
```
✅ Note ajoutée à la tâche actuelle
   "Décision: Utiliser RxJS BehaviorSubject..."
```

**Les notes sont sauvegardées dans** `PROGRESS_TRACKER.json` et utiles pour :
- 📝 Tracer les décisions
- 🔍 Donner du contexte à Claude dans les futures sessions
- 📚 Documentation automatique
- 🤝 Onboarding d'autres développeurs

---

### Tester au Fur et à Mesure

**Ne pas attendre la fin pour tester !**

```bash
# Tests unitaires (si applicable)
npm run test:unit

# Tests E2E (si applicable)
npm run test:e2e

# Linter
npm run lint

# Type checking
npm run type-check
```

**Tests manuels :**
- Lancer l'app et vérifier que ça fonctionne
- Tester les edge cases
- Vérifier dans Postman/Insomnia pour les APIs

---

### Pattern de Travail Recommandé

**Exemple : Tâche de 8h**

```
09h00 : Start task (npm run progress:start)
09h15 : Lecture docs, planning mental
10h00 : Première sous-étape
11h00 : Update 25% + commit
12h00 : Pause déjeuner
13h00 : Deuxième sous-étape
14h30 : Update 50% + commit
15h00 : Troisième sous-étape
16h30 : Update 75% + commit
17h00 : Finalisation
17h30 : Tests + update 100%
18h00 : Complete task + commit final
```

---

## ✅ Terminer une Tâche

### Étape 1 : Checklist de Vérification

**Avant de marquer comme terminé, vérifiez :**

- [ ] ✅ Code fonctionne (testé manuellement)
- [ ] ✅ Pas d'erreurs TypeScript (`npm run type-check`)
- [ ] ✅ Linter passe (`npm run lint`)
- [ ] ✅ Code formaté (Prettier/ESLint)
- [ ] ✅ Fichiers inutiles supprimés (console.log, fichiers temp)
- [ ] ✅ Tests passent (si applicable)
- [ ] ✅ Documentation à jour (si nécessaire)
- [ ] ✅ Pas de TODO critiques laissés dans le code

**Si tout est OK, passez à l'étape suivante.**

---

### Étape 2 : Commit Final

```bash
# Commit final propre et détaillé
git add .
git commit -m "feat(stats): Complete DTOs TypeScript for Stats Module

Created all TypeScript DTOs for Stats Module:
- stats-config.dto.ts (StatsModuleConfigDTO, features, tracking)
- stats-event.dto.ts (StatsEventDTO, StatsEventType enum)
- stats-query.dto.ts (StatsQueryDTO with period/granularity)
- stats-overview.dto.ts (StatsOverviewDTO with trends)
- stats-member.dto.ts (StatsMemberDTO with comparison)
- stats-leaderboard.dto.ts (StatsLeaderboardDTO)
- stats-activity.dto.ts (StatsActivityDTO with timeline)
- stats-trends.dto.ts (StatsTrendsDTO with predictions)

All DTOs:
- Fully typed (no any)
- JSDoc documented
- Follow existing patterns
- Support Free/Premium differentiation

Closes #1.3
Time spent: 2h"
```

**Points clés du commit final :**
- Description détaillée de ce qui a été fait
- Liste des fichiers/fonctionnalités ajoutées
- Mention de `Closes #X.Y`
- Temps réel passé

---

### Étape 3 : Marquer comme Complétée

```bash
npm run progress:complete 1.3 2
```

**Paramètres :**
- `1.3` : ID de la tâche
- `2` : Heures réelles passées (important pour améliorer les estimations)

**Résultat :**
```
✅ Tâche 1.3 marquée comme COMPLÉTÉE !

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tâche: DTOs TypeScript
Temps estimé: 2h
Temps réel: 2h
Écart: 0h ✅

📊 Progression Phase 1:
   █████░░░░░ 20% (3/15 tâches)

🎯 Prochaine tâche suggérée:
   2.1 - Module Definition (2h)

Pour démarrer: npm run progress:start 2.1
```

---

### Étape 4 : Commit le Tracker

```bash
# Commit le fichier PROGRESS_TRACKER.json mis à jour
git add docs/roadmaps/PROGRESS_TRACKER.json
git commit -m "chore(progress): Complete task 1.3 - DTOs TypeScript (2h)"
```

**Pourquoi ?**
- Garder l'historique de progression dans Git
- Synchroniser avec l'équipe (si applicable)
- Backup de votre avancement

---

### Étape 5 : Push (Optionnel)

```bash
# Si vous travaillez sur une branche
git push origin feature/stats-dtos

# Si vous êtes sur main/develop
git push
```

---

### Étape 6 : Pause ou Continuer

**Option A : Faire une pause**

```bash
# Rien à faire, le tracker est sauvegardé
# À votre retour, faites: npm run progress
```

**Option B : Continuer sur la tâche suivante**

```bash
# Voir la prochaine tâche
npm run progress:next

# La démarrer
npm run progress:start 2.1
```

---

## 🗣️ Travailler avec Claude

### Démarrer une Nouvelle Conversation

**Format recommandé :**

```
Bonjour Claude !

Nouvelle session sur Discord Admin App.

Status:
- Phase: Stats Module Backend (Semaine 1)
- Tâche: 2.1 - Module Definition
- Progression: 0%

Question: [votre question spécifique]
```

**OU version courte si vous êtes déjà en contexte :**

```
Task 2.1 en cours (Module Definition).

Problème: Je ne suis pas sûr de la structure du ModuleDefinition pour les plans Free/Premium.
Peux-tu me montrer un exemple ?
```

**Ce que Claude va faire automatiquement :**
1. ✅ Chercher dans le Project Knowledge
2. ✅ Comprendre votre contexte (phase, tâche)
3. ✅ Vous donner une réponse ciblée avec du code

---

### Donner du Contexte à Claude

**Informations utiles à donner :**

```
Context:
- Tâche actuelle: X.Y - [Nom]
- Blocage: [description du problème]
- Ce que j'ai essayé: [liste]
- Fichiers concernés: [liste]
- Erreur (si applicable): [copier/coller]
```

**Exemple concret :**

```
Task 4.1 en cours (VoiceTrackerService).

Blocage: Le service ne restaure pas correctement les sessions actives après un restart du bot.

Ce que j'ai essayé:
1. Sauvegarder les sessions dans Redis
2. Appeler restoreActiveSessions() dans le constructor
3. Vérifier que Redis contient bien les sessions

Fichiers concernés:
- apps/backend/src/modules/stats/services/voice-tracker.service.ts

Erreur: Aucune erreur, mais les sessions ne sont pas restaurées (Map vide).

Peux-tu m'aider à debugger ?
```

**Claude pourra vous aider efficacement avec ce niveau de détail.**

---

### Demander du Code

**Bonnes pratiques :**

✅ **Bon :**
```
Peux-tu me créer le VoiceCollector complet qui utilise VoiceTrackerService ?
Fichier: apps/backend/src/modules/stats/collectors/voice.collector.ts
Pattern: Similaire à MessageCollector existant
```

✅ **Bon :**
```
J'ai besoin du schema Prisma pour la table StatsEvent avec:
- Hypertable TimescaleDB
- Index sur guildId + timestamp
- Support pour tous les types d'events (voir StatsEventType enum)
```

❌ **Moins bon :**
```
Fais-moi le code pour les stats vocales
```
*(Trop vague, Claude ne saura pas quoi créer exactement)*

---

### Obtenir des Explications

**Si vous ne comprenez pas quelque chose :**

```
Claude, peux-tu m'expliquer:
1. Pourquoi utiliser un BehaviorSubject au lieu d'un Observable ?
2. Quel est l'avantage des continuous aggregates TimescaleDB ?
3. Comment fonctionne le pattern Facade dans le contexte de notre projet ?
```

**Claude vous donnera des explications ciblées au contexte de VOTRE projet.**

---

### Réviser du Code

```
Claude, peux-tu review ce code ?

[Coller votre code]

Points à vérifier:
- Clean code
- Typage TypeScript
- Performance
- Edge cases
- Respect des conventions du projet
```

---

## 📅 Review Hebdomadaire

### Quand ? Vendredi Soir (15-30 min)

**Objectif :** Faire le point sur la semaine et ajuster la roadmap si nécessaire.

---

### Étape 1 : Voir la Progression

```bash
npm run progress
```

**Analyser :**
- ✅ Combien de tâches complétées cette semaine ?
- ✅ Suis-je dans les temps vs la roadmap ?
- ✅ Y a-t-il des tâches bloquées ?
- ✅ Ai-je respecté mes estimations ?

---

### Étape 2 : Review des Notes

```bash
# Voir toutes les notes de la semaine
cat docs/roadmaps/PROGRESS_TRACKER.json | grep "note"
```

**Questions à se poser :**
- ✅ Y a-t-il des décisions importantes à documenter ailleurs ?
- ✅ Y a-t-il des problèmes récurrents ?
- ✅ Y a-t-il des patterns qui émergent ?

---

### Étape 3 : Ajuster la Roadmap (Si Nécessaire)

**Raisons d'ajuster :**
- Tâche plus longue que prévu → Réévaluer les estimations suivantes
- Nouvelle découverte → Ajouter des tâches
- Blocage technique → Réorganiser l'ordre des tâches
- Changement de priorité → Déplacer des tâches

**Comment ajuster :**

```bash
# Ouvrir le tracker
code docs/roadmaps/PROGRESS_TRACKER.json

# Modifier les estimations, ajouter des tâches, etc.
# Commit les changements
git add docs/roadmaps/
git commit -m "docs(roadmap): Weekly review adjustments

- Updated task 5.2 estimate (4h -> 6h)
- Added task 5.3b for additional validation
- Reordered tasks 6.x based on dependencies discovered

Reason: PrimeNG integration more complex than expected"
```

---

### Étape 4 : Planifier la Semaine Suivante

**Questions :**
- ✅ Quelles sont mes 3 priorités pour la semaine prochaine ?
- ✅ Y a-t-il des tâches bloquantes à traiter en premier ?
- ✅ Ai-je besoin d'aide externe (Claude, documentation, collègue) ?

**Écrire un mini-plan :**

```
PLAN SEMAINE PROCHAINE (Semaine X)

Objectif: [Objectif de la semaine]

Priorités:
1. Task X.Y - [Nom] (Xh)
2. Task X.Z - [Nom] (Xh)
3. Task X.W - [Nom] (Xh)

Blockers potentiels:
- [Liste]

Notes:
- [Notes]
```

**Sauvegarder dans :** Un fichier `WEEKLY_PLAN.md` ou dans vos notes.

---

### Étape 5 : Commit la Review

```bash
git add docs/roadmaps/
git commit -m "docs: Weekly review week X

Summary:
- Completed: X tasks
- In progress: Y tasks
- Blockers: [liste]
- Adjustments: [liste]

Next week priorities:
1. [Task]
2. [Task]
3. [Task]"
```

---

## 🎯 Bonnes Pratiques

### DO ✅

#### 1. Mettre à Jour la Progression Régulièrement

**Pourquoi :** Motivation + estimation + reprise facile

```bash
# Toutes les 1-2h
npm run progress:update X.Y [percentage]
```

#### 2. Commiter Souvent (Mais Proprement)

**Pourquoi :** Historique propre + rollback facile + travail sauvegardé

```bash
# Toutes les 1-2h ou après chaque sous-étape
git commit -m "feat(module): Description"
```

#### 3. Ajouter des Notes pour les Décisions

**Pourquoi :** Traçabilité + contexte futur

```bash
npm run progress:note "Décision: ..."
```

#### 4. Lire la Tâche Complète Avant de Démarrer

**Pourquoi :** Comprendre tous les détails + éviter les oublis

```bash
# Lire dans MVP_ROADMAP.md ou ROADMAP_VISUELLE.md
```

#### 5. Tester au Fur et à Mesure

**Pourquoi :** Debugging plus facile + qualité

```bash
npm run test
npm run lint
```

#### 6. Faire des Pauses Régulières

**Pourquoi :** Productivité + créativité + santé

```
Technique Pomodoro:
- 25min de travail
- 5min de pause
- Après 4 pomodoros: 15-30min de pause
```

#### 7. Demander de l'Aide Si Bloqué > 30min

**Pourquoi :** Gagner du temps + apprendre

```
Bloqué > 30min ? → Demander à Claude avec contexte complet
```

---

### DON'T ❌

#### 1. Ne Pas Oublier de Commit PROGRESS_TRACKER.json

**Pourquoi :** Sinon Claude ne verra pas l'avancement dans les futures sessions

```bash
# TOUJOURS commit après un complete
git add docs/roadmaps/PROGRESS_TRACKER.json
git commit -m "chore(progress): Complete task X.Y"
```

#### 2. Ne Pas Marquer "Complete" Trop Vite

**Pourquoi :** Qualité + pas de dette technique

**Vérifier la checklist complète avant de complete !**

#### 3. Ne Pas Négliger les Notes

**Pourquoi :** Les décisions se perdent sans documentation

#### 4. Ne Pas Hésiter à Demander de l'Aide

**Pourquoi :** Bloqué > 30min = perte de temps

```
Bloqué ? → Claude peut aider !
```

#### 5. Ne Pas Faire Plusieurs Tâches en Parallèle

**Pourquoi :** Focus + qualité

**Une tâche à la fois !**

#### 6. Ne Pas Ignorer les Warnings du Linter

**Pourquoi :** Qualité du code + bugs potentiels

```bash
# Fixer tous les warnings
npm run lint -- --fix
```

#### 7. Ne Pas Coder Sans Avoir Lu la Documentation

**Pourquoi :** Éviter de réinventer la roue + respecter les patterns

**Toujours chercher dans Project Knowledge d'abord !**

---

## 🐛 Troubleshooting

### Problème : Script `npm run progress` ne fonctionne pas

**Solution 1 : Vérifier que le script existe**

```bash
# Ouvrir package.json
code package.json

# Vérifier section "scripts"
```

**Solution 2 : Utiliser manuellement le tracker**

```bash
# Ouvrir le tracker
code docs/roadmaps/PROGRESS_TRACKER.json

# Modifier manuellement les valeurs
```

---

### Problème : Je ne sais pas quelle tâche faire

**Solution :**

```bash
# Voir la prochaine tâche recommandée
npm run progress:next

# Ou consulter la roadmap visuelle
code docs/roadmaps/ROADMAP_VISUELLE.md
```

---

### Problème : J'ai oublié de noter mes heures

**Solution :**

```bash
# Estimer approximativement les heures passées
# Mieux vaut une estimation qu'aucune donnée

npm run progress:complete X.Y [estimation]
```

---

### Problème : La tâche prend plus de temps que prévu

**Solution :**

```bash
# 1. Noter le problème
npm run progress:note "Problème: Task plus longue que prévu car [raison]"

# 2. Continuer et ajuster lors de la review hebdo
# 3. Mettre à jour l'estimation dans le tracker

code docs/roadmaps/PROGRESS_TRACKER.json
# Modifier "estimatedHours" pour la tâche
```

---

### Problème : Je suis bloqué sur une tâche

**Solution :**

```bash
# 1. Noter le blocage
npm run progress:note "Blocage: [description du problème]"

# 2. Essayer pendant max 30min

# 3. Si toujours bloqué, demander à Claude avec contexte complet

# 4. Si vraiment bloqué, passer à une autre tâche non-dépendante
npm run progress:start [autre tâche]
```

---

### Problème : J'ai perdu mon historique de progression

**Solution :**

```bash
# Récupérer depuis Git
git checkout docs/roadmaps/PROGRESS_TRACKER.json

# Ou restaurer depuis le dernier commit
git log -- docs/roadmaps/PROGRESS_TRACKER.json
git checkout [hash] -- docs/roadmaps/PROGRESS_TRACKER.json
```

---

### Problème : Claude ne comprend pas mon contexte

**Solution :**

**Donner plus de détails :**

```
Context:
- Phase: [nom de la phase]
- Tâche: X.Y - [nom]
- Problème spécifique: [description]
- Ce que j'ai essayé: [liste]
- Fichiers concernés: [liste]
- Erreur: [copier/coller]
```

**Ou référencer explicitement :**

```
Claude, peux-tu chercher dans le Project Knowledge la tâche 2.3 
et me donner les détails ?
```

---

## 📚 Ressources Utiles

### Fichiers de Référence

- **AUDIT_06112025.md** : État complet du projet
- **RESTRUCTURATION_COMPLETE.md** : Nouvelle stratégie
- **ROADMAP_VISUELLE.md** : Timeline 4 semaines
- **MVP_ROADMAP.md** : Détails jour par jour (si créé)
- **GUIDE_DEMARRAGE_RAPIDE.md** : Quick start
- **MODULE_CREATION_GUIDE.md** : Pattern modules

### Commandes Rapides

```bash
# Progression
npm run progress
npm run progress:next
npm run progress:start X.Y
npm run progress:update X.Y %
npm run progress:complete X.Y h
npm run progress:note "..."

# Git
git status
git add .
git commit -m "feat(module): Description"
git push

# Tests
npm run test
npm run lint
npm run type-check

# Dev
npm run dev:backend
npm run dev:frontend
npm run dev:bot
```

### Liens Documentation

- **TimescaleDB** : https://docs.timescale.com/
- **Prisma** : https://www.prisma.io/docs/
- **NestJS** : https://docs.nestjs.com/
- **Discord.js** : https://discord.js.org/
- **Angular** : https://angular.io/docs
- **PrimeNG** : https://primeng.org/

---

## 🎉 Conclusion

### Workflow Résumé

```
1. DÉMARRAGE (5 min)
   └─ npm run progress → identify task → npm run progress:start

2. DÉVELOPPEMENT (1-2h par cycle)
   └─ code → test → commit → npm run progress:update

3. COMPLÉTION (5 min)
   └─ checklist → commit final → npm run progress:complete → commit tracker

4. CLAUDE (au besoin)
   └─ "Task X.Y en cours, question: ..."

5. REVIEW (vendredi 15-30 min)
   └─ analyser → ajuster → planifier semaine suivante
```

### Principes Clés

- ✅ **Une tâche à la fois** (focus)
- ✅ **Commits réguliers** (sauvegarde)
- ✅ **Tests continus** (qualité)
- ✅ **Notes importantes** (traçabilité)
- ✅ **Demander aide si bloqué** (efficacité)

### Objectif Final

**Livrer un MVP production-ready en 4 semaines** avec :
- Code de qualité
- Progression trackée
- Documentation à jour
- Pas de dette technique

---

**🚀 Vous avez maintenant tout ce qu'il faut pour travailler efficacement !**

**Questions ? Revenez vers Claude avec contexte complet !**

**Let's build! 💪**