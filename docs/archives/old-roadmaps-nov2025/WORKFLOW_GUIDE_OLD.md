# 🚀 Guide de Workflow - Discord Admin App

> **Comment travailler efficacement avec le système de suivi de progression**

---

## 📋 Table des Matières

1. [Démarrer une Session de Travail](#1-démarrer-une-session-de-travail)
2. [Pendant le Développement](#2-pendant-le-développement)
3. [Terminer une Tâche](#3-terminer-une-tâche)
4. [Démarrer une Conversation avec Claude](#4-démarrer-une-conversation-avec-claude)
5. [Cas Spéciaux](#5-cas-spéciaux)
6. [Bonnes Pratiques](#6-bonnes-pratiques)
7. [Exemples Concrets](#7-exemples-concrets)

---

## 1. 🏁 Démarrer une Session de Travail

### Étape 1.1 : Vérifier le Status

**Objectif** : Savoir où tu en es, quelle tâche est en cours

```bash
npm run progress
```

**Ce que tu vas voir** :
- ✅ Phase actuelle
- ✅ Tâche en cours (avec progression si déjà démarrée)
- ✅ Dernières tâches complétées
- ✅ Prochaines tâches à faire
- ✅ Blocages éventuels

**Exemple de sortie** :
```
📊 STATUS DU PROJET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Projet: Discord Admin App
Phase actuelle: MVP Core - Stats
Sprint: stats-frontend
Progression globale: 25%

🔥 Tâche en cours:
  ⋯ 1.7 - Services & Models Frontend
     Progression: ░░░░░░░░░░ 0%
```

---

### Étape 1.2 : Décider de la Tâche

**Option A : Continuer la tâche en cours**
- Si la tâche en cours est déjà démarrée → continue directement
- Pas besoin de commande spéciale

**Option B : Démarrer une nouvelle tâche**

```bash
# Voir la prochaine tâche recommandée
npm run progress:next
```

**Ce que tu vas voir** :
```
🎯 PROCHAINE TÂCHE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID: 1.7
Nom: Services & Models Frontend
Phase: phase-1
Priorité: high
Temps estimé: 8h
Dépendances: 1.5 ✓

Pour démarrer: npm run progress:start 1.7
```

---

### Étape 1.3 : Démarrer la Tâche (si nouvelle)

```bash
npm run progress:start 1.7
```

**Résultat** :
```
✓ Tâche 1.7 démarrée !
Services & Models Frontend

Pour mettre à jour la progression: npm run progress:update 1.7 <percentage>
```

**Ce qui se passe** :
- ✅ La tâche 1.7 est marquée comme "en cours"
- ✅ PROGRESS_TRACKER.json est mis à jour
- ✅ La progression démarre à 0%

---

### Étape 1.4 : Consulter la Roadmap Détaillée (optionnel)

Si tu veux plus de détails sur la tâche :

```bash
# Ouvrir la roadmap complète
cat docs/roadmaps/COMPLETE_ROADMAP.md | grep -A 20 "1.7"
```

Ou simplement ouvrir le fichier `COMPLETE_ROADMAP.md` et chercher la section de ta tâche.

---

## 2. 💻 Pendant le Développement

### Étape 2.1 : Mettre à Jour la Progression Régulièrement

**Fréquence recommandée** : Toutes les 1-2 heures, ou à chaque grande étape

```bash
# Exemple : tu as fait 25% de la tâche
npm run progress:update 1.7 25

# Plus tard : 50%
npm run progress:update 1.7 50

# Presque fini : 90%
npm run progress:update 1.7 90
```

**Résultat** :
```
✓ Progression mise à jour
  ██████░░░░ 60%
  Temps restant estimé: 3h
```

**Pourquoi c'est utile ?**
- 🎯 Motivation : voir la progression visuellement
- 📊 Estimation : savoir combien de temps il reste
- 🔄 Reprise : si tu t'arrêtes, tu sais exactement où tu en es

---

### Étape 2.2 : Ajouter des Notes (optionnel mais recommandé)

Si tu prends une **décision importante** ou rencontres un **problème** :

```bash
npm run progress:note "Décision: Utiliser RxJS pour le cache des stats"

npm run progress:note "Problème: PrimeNG Chart nécessite config spéciale pour time-series"

npm run progress:note "Optimisation: Créer un pipe Angular pour formater les durées vocales"
```

**Résultat** :
```
✓ Note ajoutée
```

**Pourquoi ?**
- 📝 Traçabilité des décisions
- 🔍 Contexte pour Claude dans les prochaines sessions
- 📚 Documentation automatique de l'évolution du projet

---

### Étape 2.3 : Commiter Régulièrement

**Pattern Git recommandé** :

```bash
# Après chaque sous-étape significative
git add .
git commit -m "feat(stats): Create StatisticsService with facade pattern"

# Inclure la progression dans le commit
git add docs/roadmaps/PROGRESS_TRACKER.json
git commit -m "chore(progress): Update task 1.7 to 50%"
```

**Bonus** : Tu peux créer un alias git pour automatiser :

```bash
# Dans .gitconfig ou .bashrc
alias gprog='git add docs/roadmaps/PROGRESS_TRACKER.json && git commit -m "chore(progress): Auto-update"'
```

---

## 3. ✅ Terminer une Tâche

### Étape 3.1 : Vérifier que Tout est OK

**Checklist avant de marquer comme terminé** :
- [ ] Code fonctionne (testé manuellement)
- [ ] Pas d'erreurs TypeScript
- [ ] Formatage respecté (Prettier/ESLint)
- [ ] Fichiers inutiles supprimés
- [ ] Tests passent (si applicable)
- [ ] Documentation à jour (si nécessaire)

---

### Étape 3.2 : Commit Final

```bash
# Commit final de la feature
git add .
git commit -m "feat(stats): Complete StatisticsService implementation

- Created StatisticsService with facade pattern
- Added models: GuildStats, MemberStats, LeaderboardEntry
- Implemented HTTP calls to 4 backend endpoints
- Added local cache with 5min TTL
- Added error handling and retry logic

Closes #1.7"

# Push (optionnel, selon ton workflow)
git push origin feature/stats-service
```

---

### Étape 3.3 : Marquer la Tâche comme Complétée

```bash
npm run progress:complete 1.7 9
```

**Paramètres** :
- `1.7` : ID de la tâche
- `9` : Heures réelles passées (optionnel, mais recommandé)

**Résultat** :
```
✓ Tâche 1.7 - Services & Models Frontend marquée comme complétée !
Progression globale: 27%

Prochaine tâche suggérée:
  ○ 1.8 - Dashboard Overview Components
```

**Ce qui se passe** :
- ✅ Tâche 1.7 déplacée dans `completedTasks`
- ✅ Phase 1 progression mise à jour (50% → 58%)
- ✅ Progression globale recalculée
- ✅ Statistiques mises à jour (heures, vélocité)
- ✅ Prochaine tâche suggérée automatiquement

---

### Étape 3.4 : Commit le Tracker (Important!)

```bash
git add docs/roadmaps/PROGRESS_TRACKER.json
git commit -m "chore(progress): Complete task 1.7 - StatisticsService (9h)"
git push
```

**Pourquoi ?**
- 📊 Synchronise l'état avec le repository
- 🔄 Permet à Claude de voir l'avancement dans la prochaine session
- 📈 Historique complet de l'avancement du projet

---

### Étape 3.5 : Mettre à Jour STATUS.md (Optionnel mais Sympa)

Si tu veux, tu peux éditer manuellement `STATUS.md` pour ajouter des notes personnelles :

```markdown
## ✅ Complété Récemment

| Date | Tâche | Phase | Notes Perso |
|------|-------|-------|-------------|
| 20/10 | StatisticsService | Phase 1 | Super smooth, RxJS FTW! 🎉 |
```

---

## 4. 💬 Démarrer une Conversation avec Claude

### Scénario A : Continuation d'une Tâche en Cours

**Message simple** :
```
Salut Claude ! On continue sur la tâche 1.8 (Dashboard Components).
J'en suis à 40%, j'ai créé les cards stats mais je bloque sur les charts PrimeNG.
```

**Claude va** :
1. Lire automatiquement `PROGRESS_TRACKER.json`
2. Voir que tu es sur la tâche 1.8 à 40%
3. Comprendre le contexte immédiatement

---

### Scénario B : Nouvelle Session de Code

**Message avec contexte** :
```
Hey Claude, je démarre une nouvelle session !

Voici où j'en suis :
[copie-colle le résultat de `npm run progress`]

Je veux commencer la tâche 1.8. Par où on commence ?
```

---

### Scénario C : Demande d'Aide Spécifique

**Message détaillé** :
```
Salut Claude !

Tâche actuelle : 1.8 - Dashboard Components (60%)
Problème : Le chart PrimeNG ne s'affiche pas correctement avec les données time-series.

Voici mon code :
[code snippet]

Une idée ?
```

---

### Scénario D : Review de Code Avant de Terminer

**Message pour validation** :
```
Hey Claude !

Je pense avoir terminé la tâche 1.8. Avant de marquer comme "complete", 
peux-tu review mon implémentation ?

Fichiers modifiés :
- apps/frontend/src/app/services/statistics.service.ts
- apps/frontend/src/app/pages/dashboard/dashboard.component.ts
- apps/frontend/src/app/pages/dashboard/dashboard.component.html

Questions :
1. Est-ce que le pattern facade est correct ?
2. Devrais-je ajouter plus de error handling ?
3. Performance OK avec ces requêtes HTTP ?
```

---

## 5. 🔧 Cas Spéciaux

### Cas 5.1 : Sauter une Tâche

Si tu veux faire la tâche 1.10 avant la 1.8 :

```bash
# Démarrer directement la 1.10
npm run progress:start 1.10
```

**Note** : Le système est flexible, pas besoin de faire les tâches dans l'ordre strict.

---

### Cas 5.2 : Diviser une Tâche en Sous-Tâches

Si une tâche est trop grosse (ex: 1.8 prévue 24h) :

**Option A : Créer des sous-tâches manuellement**

Édite `PROGRESS_TRACKER.json` et ajoute :
```json
{
  "id": "1.8.1",
  "name": "Dashboard - Hero Stats Cards",
  "phase": "phase-1",
  "estimatedHours": 8
},
{
  "id": "1.8.2",
  "name": "Dashboard - Charts Setup",
  "phase": "phase-1",
  "estimatedHours": 8
},
{
  "id": "1.8.3",
  "name": "Dashboard - Leaderboard Component",
  "phase": "phase-1",
  "estimatedHours": 8
}
```

Puis :
```bash
npm run progress:start 1.8.1
# ... travail ...
npm run progress:complete 1.8.1 7

npm run progress:start 1.8.2
# etc.
```

---

### Cas 5.3 : Bloquer sur une Tâche

Si tu rencontres un **blocage** (bug, dépendance manquante, décision à prendre) :

```bash
npm run progress:note "BLOCAGE: Besoin de choisir entre Chart.js et PrimeNG Chart"
```

Puis édite manuellement `PROGRESS_TRACKER.json` :
```json
"blockers": [
  {
    "taskId": "1.8",
    "description": "Choix library charting à faire",
    "createdAt": "2025-10-20"
  }
]
```

**En parler avec Claude** :
```
Claude, je suis bloqué sur 1.8. J'hésite entre Chart.js et PrimeNG Chart.
Qu'est-ce que tu recommandes pour des time-series stats ?
```

---

### Cas 5.4 : Tâche Non Prévue (Hotfix, Bug Urgent)

Si tu dois faire quelque chose d'urgent non prévu :

**Option 1 : Ajouter une note**
```bash
npm run progress:note "Hotfix: Correction bug auth qui bloquait les tests"
```

**Option 2 : Créer une tâche temporaire**

Édite `PROGRESS_TRACKER.json` et ajoute :
```json
{
  "id": "hotfix-1",
  "name": "Fix auth bug blocking development",
  "phase": "phase-1",
  "estimatedHours": 2,
  "priority": "critical"
}
```

Puis :
```bash
npm run progress:start hotfix-1
# ... fix ...
npm run progress:complete hotfix-1 1.5
```

---

## 6. 💡 Bonnes Pratiques

### ✅ DO

1. **Mettre à jour la progression régulièrement**
   - Toutes les 1-2h ou à chaque grande étape
   - Aide à la motivation et au tracking

2. **Ajouter des notes pour les décisions importantes**
   - Facilite le contexte pour Claude
   - Documentation automatique

3. **Commit le PROGRESS_TRACKER.json régulièrement**
   - Synchronise avec le repo
   - Historique de l'avancement

4. **Utiliser des heures réalistes lors du complete**
   - Aide à améliorer les estimations futures
   - Calcul de vélocité précis

5. **Lire la tâche complète dans COMPLETE_ROADMAP.md avant de démarrer**
   - Comprendre tous les détails
   - Éviter les oublis

6. **Faire des pauses régulières**
   - Toutes les 2h, lève-toi, bouge
   - Meilleure productivité

---

### ❌ DON'T

1. **Ne pas oublier de commit PROGRESS_TRACKER.json**
   - Sinon Claude ne verra pas l'avancement

2. **Ne pas marquer "complete" trop vite**
   - Vérifie que tout fonctionne vraiment
   - Pas de dette technique

3. **Ne pas négliger les notes**
   - Les décisions se perdent sans documentation

4. **Ne pas hésiter à demander de l'aide**
   - Bloqué > 30min ? Demande à Claude

5. **Ne pas faire plusieurs tâches en parallèle**
   - Focus sur une tâche à la fois
   - Meilleure qualité

---

## 7. 📚 Exemples Concrets

### Exemple 1 : Journée Complète de Dev

```bash
# 9h00 - Démarrage
npm run progress
npm run progress:next
npm run progress:start 1.8

# 10h30 - Première mise à jour
npm run progress:update 1.8 20
git add . && git commit -m "feat(dashboard): Create hero stats cards"

# 12h00 - Pause déjeuner
npm run progress:note "Cards terminées, charts après le déj"

# 14h00 - Reprise
npm run progress:update 1.8 50

# 16h00 - Avancement
npm run progress:update 1.8 75
git add . && git commit -m "feat(dashboard): Add PrimeNG charts integration"

# 17h30 - Finition
npm run progress:update 1.8 95
git add . && git commit -m "feat(dashboard): Add leaderboard component"

# 18h00 - Terminé !
npm run progress:complete 1.8 9
git add docs/roadmaps/PROGRESS_TRACKER.json
git commit -m "chore(progress): Complete task 1.8 (9h)"
git push
```

---

### Exemple 2 : Conversation avec Claude en Début de Session

**Toi** :
```
Salut Claude ! Nouvelle session de code.

$ npm run progress

📊 STATUS DU PROJET
Phase actuelle: MVP Core - Stats
Sprint: stats-frontend
Progression globale: 27%

🔥 Tâche en cours:
  ○ 1.9 - Member Stats Page

Je veux démarrer cette tâche. C'est quoi les grandes étapes ?
```

**Claude** :
```
Salut ! 🚀

D'après PROGRESS_TRACKER.json, tu es prêt à démarrer la tâche 1.9 
(Member Stats Page - 16h estimées).

Grandes étapes :
1. Créer MemberStatsComponent
2. Ajouter route /guilds/:id/members/:userId
3. Implémenter cards stats individuelles
4. Charts activité membre (messages/vocal over time)
5. Section comparaison avec moyenne serveur

On commence par l'étape 1 ?
```

---

### Exemple 3 : Review Avant Complete

**Toi** :
```
Claude, avant de marquer 1.9 comme complete, 
peux-tu vérifier mon implémentation ?

Fichiers :
- member-stats.component.ts (180 lignes)
- member-stats.component.html (120 lignes)
- member-stats.component.scss (60 lignes)

Questions :
1. Pattern OK ?
2. Performance des requêtes ?
3. Manque quelque chose ?
```

**Claude** :
```
Je regarde ! 🔍

[analyse les fichiers du projet]

Implémentation : ✅ Très bien !
Suggestions :
1. Ajouter un loading skeleton pendant fetch
2. Error boundary si membre inexistant
3. Lazy load pour les charts (améliore perf)

Sinon c'est prêt à être merged ! Tu peux faire :
npm run progress:complete 1.9 14
```

---

## 🎯 Récapitulatif Ultra-Rapide

### Démarrer
```bash
npm run progress              # Voir où tu en es
npm run progress:next         # Voir prochaine tâche
npm run progress:start 1.X    # Démarrer une tâche
```

### Pendant
```bash
npm run progress:update 1.X 50    # Mettre à jour progression
npm run progress:note "message"   # Ajouter une note
git commit régulièrement          # Sauvegarder le code
```

### Terminer
```bash
npm run progress:complete 1.X 8   # Marquer terminé (8h réelles)
git add docs/roadmaps/PROGRESS_TRACKER.json
git commit -m "chore(progress): Complete 1.X"
git push
```

### Avec Claude
```
"Claude, je suis sur la tâche 1.X, [question/problème]"
```

---

**🎉 Tu es prêt à coder efficacement ! Let's ship features! 🚀**