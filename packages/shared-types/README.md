# @my-project/shared-types

Ce package contient tous les types, interfaces et constantes partagés entre le frontend (Angular) et le backend (NestJS).

## 📁 Structure des dossiers

```
packages/shared-types/
├── src/                    # Code source TypeScript
│   ├── dtos/              # Objets de transfert de données (API)
│   ├── enums/             # Énumérations (statuts, rôles, etc.)
│   ├── constants/         # Constantes partagées
│   └── index.ts           # Point d'entrée principal
├── dist/                   # Code compilé (généré automatiquement)
├── package.json           # Configuration du package npm
├── tsconfig.json          # Configuration TypeScript
└── README.md              # Cette documentation
```

## 📋 Explication des fichiers et dossiers

### `src/` - Le code source
C'est ici que tu écris tout ton code TypeScript. Ce dossier contient le "vrai" code avant compilation.

### `src/dtos/` - Data Transfer Objects
Les **DTOs** définissent la structure des données échangées entre le frontend et le backend via l'API.

**Exemple d'utilisation :**
- `CreateUserDto` : structure des données pour créer un utilisateur
- `LoginResponseDto` : structure de la réponse après connexion

**Pourquoi c'est important :**
- Assure que le frontend et backend utilisent exactement la même structure
- Autocomplétion et vérification des types
- Évite les erreurs de frappe dans les noms de propriétés

### `src/enums/` - Énumérations
Les **enums** définissent des listes de valeurs possibles (comme des options dans une liste déroulante).

**Exemples :**
- `UserRole` : ADMIN, USER, MODERATOR
- `OrderStatus` : PENDING, CONFIRMED, SHIPPED, DELIVERED

**Avantage :** Évite les "magic strings" et centralise les valeurs possibles.

### `src/constants/` - Constantes partagées
Toutes les valeurs fixes utilisées à la fois côté frontend et backend.

**Exemples :**
- `MAX_FILE_SIZE = 5000000` (5MB)
- `MIN_PASSWORD_LENGTH = 8`
- `SUPPORTED_IMAGE_FORMATS = ['jpg', 'png', 'webp']`

### `src/index.ts` - Point d'entrée
Ce fichier **exporte** tout ce que tu veux rendre disponible aux autres applications.

**Principe :** Au lieu d'importer depuis des chemins compliqués, tu peux faire :
```typescript
import { CreateUserDto, UserRole } from '@my-project/shared-types';
```

### `dist/` - Code compilé
Dossier **généré automatiquement** par TypeScript quand tu lances `npm run build`.
- Contient le code JavaScript compilé
- Contient les fichiers `.d.ts` (définitions de types)
- **Ne jamais modifier manuellement !**

### `package.json` - Configuration du package
Fichier de configuration qui dit :
- Comment s'appelle le package
- Où se trouvent les fichiers compilés
- Quelles commandes sont disponibles (build, dev)

### `tsconfig.json` - Configuration TypeScript
Dit à TypeScript :
- Où chercher le code source (`src/`)
- Où mettre le code compilé (`dist/`)
- Comment compiler (version JavaScript, génération des types, etc.)

## 🚀 Commandes disponibles

```bash
# Compiler le package une fois
npm run build

# Compiler en mode "watch" (recompile automatiquement à chaque modification)
npm run dev
```

## 🔄 Comment ça marche ?

1. **Tu écris** du code TypeScript dans `src/`
2. **Tu lances** `npm run build`
3. **TypeScript compile** ton code vers `dist/`
4. **Les autres apps** (frontend/backend) importent depuis ce package
5. **Tout le monde** utilise les mêmes types ! 🎉

## 💡 Bonnes pratiques

- **Toujours compiler** avant de commit
- **Préfixer les noms** pour éviter les conflits (ex: `UserCreateDto` plutôt que `CreateDto`)
- **Documenter** les DTOs complexes avec des commentaires
- **Grouper** les types liés dans le même fichier