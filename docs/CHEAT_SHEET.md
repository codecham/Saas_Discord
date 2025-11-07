# 📋 CHEAT SHEET - Discord Admin App

> **Référence rapide pour le workflow quotidien**

---

## ⚡ Commandes Essentielles

### Progression

```bash
npm run progress              # Voir status actuel
npm run progress:next         # Voir prochaine tâche
npm run progress:start X.Y    # Démarrer tâche X.Y
npm run progress:update X.Y % # Mettre à jour progression
npm run progress:complete X.Y h # Marquer complétée (h = heures réelles)
npm run progress:note "text"  # Ajouter une note
```

### Git

```bash
git status                    # Voir les changements
git add .                     # Ajouter tous les fichiers
git commit -m "feat: ..."     # Commit
git push                      # Push
git log --oneline             # Historique
```

### Dev

```bash
npm run dev:backend           # Lancer backend
npm run dev:frontend          # Lancer frontend
npm run dev:bot               # Lancer bot
npm run test                  # Tests
npm run lint                  # Linter
npm run type-check            # TypeScript check
```

---

## 🔄 Workflow Quotidien

### 1. Démarrage (2 min)

```bash
npm run progress              # Voir status
npm run progress:start X.Y    # Démarrer tâche
code [fichiers]               # Ouvrir fichiers
```

### 2. Développement (toutes les 1-2h)

```bash
# Coder...
npm run progress:update X.Y % # Update progression
git add .
git commit -m "feat: ..."     # Commit
```

### 3. Terminaison (5 min)

```bash
# Checklist...
git commit -m "feat: Complete ..." # Commit final
npm run progress:complete X.Y h    # Complete
git add docs/roadmaps/PROGRESS_TRACKER.json
git commit -m "chore(progress): Complete X.Y"
git push
```

---

## 💬 Travailler avec Claude

### Template Message

```
Bonjour Claude !

Task X.Y en cours ([Nom de la tâche])
Progression: %

Question: [votre question]
```

### Donner du Contexte

```
Context:
- Phase: [nom]
- Tâche: X.Y
- Problème: [description]
- Essayé: [liste]
- Fichiers: [liste]
- Erreur: [copier/coller]
```

---

## 📝 Commits

### Format

```
<type>(<scope>): <description>

<détails optionnels>
- Point 1
- Point 2

Refs: Task X.Y
```

### Types

- `feat`: Nouvelle fonctionnalité
- `fix`: Correction bug
- `refactor`: Refactoring
- `docs`: Documentation
- `test`: Tests
- `chore`: Maintenance

### Scopes

- `stats`: Module Stats
- `welcome`: Module Welcome
- `auth`: Auth
- `moderation`: Modération
- `frontend`: Frontend
- `backend`: Backend
- `bot`: Bot

### Exemples

```bash
git commit -m "feat(stats): Create StatsService with facade pattern"
git commit -m "fix(bot): Fix voice session recovery after restart"
git commit -m "refactor(backend): Extract aggregation logic to separate service"
git commit -m "docs(stats): Add architecture documentation"
git commit -m "test(stats): Add unit tests for VoiceTrackerService"
git commit -m "chore(progress): Complete task 1.3"
```

---

## ✅ Checklist Avant Complete

- [ ] Code fonctionne
- [ ] Pas d'erreurs TypeScript
- [ ] Linter passe
- [ ] Code formaté
- [ ] Fichiers inutiles supprimés
- [ ] Tests passent
- [ ] Documentation à jour
- [ ] Pas de TODO critiques

---

## 📅 Review Hebdo (Vendredi)

```bash
# 1. Voir progression
npm run progress

# 2. Analyser
- Tâches complétées ?
- Dans les temps ?
- Blockers ?
- Estimations OK ?

# 3. Ajuster roadmap si besoin
code docs/roadmaps/PROGRESS_TRACKER.json

# 4. Planifier semaine suivante

# 5. Commit
git commit -m "docs: Weekly review week X"
```

---

## 🎯 Bonnes Pratiques

### DO ✅

- Update progression toutes les 1-2h
- Commit souvent (mais proprement)
- Noter les décisions importantes
- Lire la tâche avant de démarrer
- Tester au fur et à mesure
- Faire des pauses (Pomodoro)
- Demander aide si bloqué > 30min

### DON'T ❌

- Oublier de commit le tracker
- Marquer complete trop vite
- Négliger les notes
- Hésiter à demander aide
- Faire plusieurs tâches en parallèle
- Ignorer warnings du linter
- Coder sans lire la doc

---

## 🐛 Troubleshooting Rapide

### Script ne fonctionne pas
→ Vérifier `package.json` ou modifier `PROGRESS_TRACKER.json` manuellement

### Ne sais pas quelle tâche
→ `npm run progress:next` ou lire `ROADMAP_VISUELLE.md`

### Oublié de noter heures
→ Estimer approximativement

### Tâche trop longue
→ Noter avec `npm run progress:note`, ajuster lors review

### Bloqué
→ Essayer 30min, puis demander à Claude

### Claude ne comprend pas
→ Donner plus de contexte (phase, tâche, problème, essayé, fichiers, erreur)

---

## 📚 Fichiers Importants

- `WORKFLOW_GUIDE.md` - Guide complet (ce fichier en détail)
- `RESTRUCTURATION_COMPLETE.md` - Stratégie et contexte
- `ROADMAP_VISUELLE.md` - Timeline 4 semaines
- `PROGRESS_TRACKER.json` - État actuel
- `AUDIT_06112025.md` - Audit du projet
- `MODULE_CREATION_GUIDE.md` - Pattern modules

---

## 🚀 Quick Start Nouvelle Session

```bash
# 1. Status
npm run progress

# 2. Tâche en cours ou suivante
npm run progress:next

# 3. Start
npm run progress:start X.Y

# 4. Go!
code [fichiers]
```

---

## 💡 Astuce du Jour

**Pomodoro Technique:**
```
25 min travail
↓
5 min pause
↓
Répéter 4x
↓
15-30 min pause longue
```

**Résultat:** Productivité maximale + moins de fatigue 🚀

---

**🎯 Gardez cette cheat sheet ouverte pendant que vous codez !**

**Questions ? → Lisez WORKFLOW_GUIDE.md (version complète)**