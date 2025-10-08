# 🎯 Plan d'implémentation - Endpoint Tester v2

## 📋 Résumé des améliorations

Vous avez maintenant un système de test d'endpoints **professionnel** avec :

### ✨ Nouvelles fonctionnalités

1. **Gestion intelligente des paramètres**
   - Path parameters : `{guildId}` automatiquement remplacé
   - Query parameters : `?limit=100&after=123`
   - Body parameters : JSON auto-généré pour POST/PUT/PATCH
   - Auto-complétion depuis vos données (firstGuild, currentUserId)

2. **Interface améliorée**
   - Cards extensibles pour gagner de l'espace
   - Formulaires de paramètres clairs et intuitifs
   - JSON viewer avec coloration syntaxique
   - Affichage complet des headers HTTP
   - Détails d'erreur enrichis

3. **Productivité accrue**
   - Test en masse par catégorie
   - Valeurs par défaut pré-remplies
   - Placeholder explicites
   - Notes et warnings visibles

---

## 📦 Fichiers créés (5 artifacts)

### 1. `endpoint-tester.interface.ts` (v2)
**Nouveau fichier** avec interfaces complètes :
- `EndpointParameter` : Configuration d'un paramètre
- `ParameterValues` : Valeurs saisies par l'utilisateur
- `EndpointTestResult` : Résultat enrichi (headers, body, etc.)

### 2. `endpoints-tester.service.ts` (v2)
**Service amélioré** avec :
- Méthode `testEndpoint(endpoint, parameterValues)`
- Résolution automatique des paramètres (`resolveParameters`)
- Construction intelligente des URLs (`buildRequest`)
- Support complet des types de paramètres

### 3. `endpoints-tester.component.ts` (v2)
**Composant revu** avec :
- Formulaires de paramètres dynamiques
- Cards extensibles (pliables/dépliables)
- JSON viewer stylisé
- Affichage des headers et body
- Interface moderne et ergonomique

### 4. `test-endpoints.config.ts` (v2)
**Configuration complète** avec :
- 20+ endpoints configurés avec paramètres
- Auto-sources configurées (firstGuild, currentUserId)
- Catégories bien organisées
- Notes et warnings ajoutés

### 5. Guide d'utilisation complet
Documentation détaillée pour :
- Configuration des endpoints
- Utilisation de l'interface
- Personnalisation
- Troubleshooting

---

## 🚀 Plan d'action étape par étape

### Étape 1 : Backup (sécurité)

```bash
# Sauvegarder les anciens fichiers au cas où
cp apps/sakai/src/app/interfaces/endpoint-tester.interface.ts \
   apps/sakai/src/app/interfaces/endpoint-tester.interface.ts.backup

cp apps/sakai/src/app/services/endpoints-tester.service.ts \
   apps/sakai/src/app/services/endpoints-tester.service.ts.backup

cp apps/sakai/src/app/features/endpoints-tester/endpoints-tester.component.ts \
   apps/sakai/src/app/features/endpoints-tester/endpoints-tester.component.ts.backup

cp apps/sakai/src/app/config/test-endpoints.config.ts \
   apps/sakai/src/app/config/test-endpoints.config.ts.backup
```

### Étape 2 : Remplacer les fichiers

**2.1 Interface**
- Fichier : `apps/sakai/src/app/interfaces/endpoint-tester.interface.ts`
- Artifact : `endpoint-tester.interface.ts (v2)`
- Action : Remplacer complètement le contenu

**2.2 Service**
- Fichier : `apps/sakai/src/app/services/endpoints-tester.service.ts`
- Artifact : `endpoints-tester.service.ts (v2 avec params)`
- Action : Remplacer complètement le contenu

**2.3 Composant**
- Fichier : `apps/sakai/src/app/features/endpoints-tester/endpoints-tester.component.ts`
- Artifact : `endpoints-tester.component.ts (v2 amélioré)`
- Action : Remplacer complètement le contenu

**2.4 Configuration**
- Fichier : `apps/sakai/src/app/config/test-endpoints.config.ts`
- Artifact : `test-endpoints.config.ts (v2 avec paramètres)`
- Action : Remplacer complètement le contenu

### Étape 3 : Vérifier les dépendances

**3.1 FormsModule**

Vérifier que `FormsModule` est bien importé dans le composant :

```typescript
// endpoints-tester.component.ts
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule], // ← FormsModule ajouté
  // ...
})
```

**3.2 Facades**

Vérifier que ces services existent et sont bien typés :

```typescript
// Dans le service
private guildFacade = inject(GuildFacadeService);
private userFacade = inject(UserFacadeService);
```

**Méthodes requises :**
- `guildFacade.userGuildList()` → Retourne `UserGuildsCategorizedDTO | null`
- `userFacade.user()` → Retourne `UserDTO | null`

### Étape 4 : Compiler et vérifier

```bash
# Compiler le frontend
cd apps/sakai
npm run build

# Ou en mode dev pour voir les erreurs en direct
npm run start
```

**Erreurs possibles :**

| Erreur | Solution |
|--------|----------|
| `FormsModule not found` | Ajouter `import { FormsModule } from '@angular/forms'` |
| `GuildFacadeService not found` | Vérifier le chemin d'import |
| `Property 'userGuildList' does not exist` | Vérifier que la méthode existe dans GuildFacadeService |
| Type errors sur `autoSource` | Vérifier que l'enum dans l'interface est correct |

### Étape 5 : Tester l'application

**5.1 Lancer le backend**
```bash
cd apps/backend
npm run start:dev
```

**5.2 Lancer le frontend**
```bash
cd apps/sakai
npm run start
```

**5.3 Ouvrir l'interface**
- Naviguer vers : `http://localhost:4200/endpoints-tester`
- Vous devriez voir la nouvelle interface avec cards extensibles

**5.4 Tests fonctionnels**

✅ **Test 1 : Endpoint simple sans paramètres**
- Déplier "Health Check"
- Cliquer sur "▶️ Tester cet endpoint"
- Vérifier que le résultat s'affiche

✅ **Test 2 : Endpoint avec auto-source**
- Se connecter avec Discord
- Déplier "Informations du serveur"
- Vérifier que `guildId` est **pré-rempli automatiquement**
- Tester l'endpoint
- Cliquer sur "▶ Afficher les détails"
- Vérifier que le JSON s'affiche bien

✅ **Test 3 : Endpoint avec paramètres manuels**
- Déplier "Messages du channel"
- Saisir un `channelId` manuellement
- Modifier `limit` (ex: 20)
- Tester
- Vérifier les query params dans l'URL affichée

✅ **Test 4 : Endpoint POST avec body**
- Déplier "Envoyer un message"
- Saisir `channelId` et `content`
- Tester
- Dans les détails, vérifier le "📤 Request Body"

✅ **Test 5 : Test en masse**
- Cliquer sur "▶️ Tester tout" pour une catégorie
- Vérifier que plusieurs endpoints se testent automatiquement
- Les endpoints avec paramètres obligatoires sans auto-source sont skipped

---

## 🐛 Troubleshooting

### Problème : `guildId` ne se remplit pas automatiquement

**Diagnostic :**
```typescript
// Dans la console du navigateur
console.log(this.guildFacade.selectedGuild());
```

**Solutions possibles :**
1. **Aucun serveur sélectionné** → C'est normal ! Sélectionnez un serveur d'abord
2. Les données ne sont pas chargées → Attendre le chargement
3. Le service n'existe pas → Vérifier l'import

**Important :** Avec `selectedGuild`, l'utilisateur DOIT sélectionner un serveur avant de tester les endpoints. C'est plus sûr que de prendre automatiquement le premier serveur !

### Problème : Erreur TypeScript sur `autoSource`

**Cause :** Le type n'est pas reconnu

**Solution :**
```typescript
// Dans endpoint-tester.interface.ts
autoSource?: 'firstGuild' | 'currentUserId' | 'firstChannel';
```

### Problème : FormsModule error

**Cause :** `[(ngModel)]` nécessite FormsModule

**Solution :**
```typescript
import { FormsModule } from '@angular/forms';

@Component({
  imports: [CommonModule, FormsModule],
  // ...
})
```

### Problème : Les détails ne s'affichent pas

**Cause :** Manque le helper `Object` dans le composant

**Solution :**
```typescript
export class EndpointTesterComponent {
  // ...
  Object = Object; // ← Ajouter cette ligne
}
```

---

## ✅ Checklist finale

### Avant de committer

- [ ] Tous les fichiers remplacés
- [ ] Compilation sans erreurs TypeScript
- [ ] Frontend démarre sans erreurs
- [ ] Backend démarre sans erreurs
- [ ] Interface `/endpoints-tester` s'affiche correctement
- [ ] Test d'un endpoint simple réussi
- [ ] Test d'un endpoint avec auto-source réussi
- [ ] Test d'un endpoint avec paramètres manuels réussi
- [ ] JSON viewer fonctionne
- [ ] Headers s'affichent
- [ ] Erreurs sont bien affichées

### Après validation

- [ ] Commit avec message clair
- [ ] Mettre à jour la security roadmap (#7 résolu)
- [ ] Documenter les nouveaux endpoints dans la config
- [ ] Tester avec d'autres membres de l'équipe

---

## 🎉 Résultat final

Une fois terminé, vous aurez :

### ✅ Problème #7 de la security roadmap RÉSOLU
- Retry mechanism actif sur toutes les requêtes Discord
- Code legacy supprimé
- Architecture moderne et maintenable

### ✅ Outil de test professionnel
- 20+ endpoints configurés et testables
- Interface moderne et intuitive
- Gestion intelligente des paramètres
- Affichage détaillé des résultats

### ✅ Productivité améliorée
- Plus besoin de Postman pour tester
- Test rapide en 2 clics
- Auto-complétion des paramètres
- Debug facilité avec détails complets

---

## 📊 Métriques de succès

| Métrique | Avant | Après |
|----------|-------|-------|
| Endpoints testables | ~10 | 20+ |
| Avec paramètres | 0 | 15+ |
| Auto-complétion | ❌ | ✅ |
| JSON viewer | ❌ | ✅ |
| Headers visibles | ❌ | ✅ |
| Body visible | ❌ | ✅ |
| Cards extensibles | ❌ | ✅ |
| Test en masse | ✅ | ✅ (amélioré) |

---