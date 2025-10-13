# ⚡ Guide Rapide d'Implémentation des Tests

## 🎯 Objectif

Ce guide vous permet de créer un test pour un nouveau listener en **moins de 15 minutes** en suivant une checklist simple.

---

## 📋 Checklist en 7 étapes

### ✅ Étape 1 : Identifier le listener (30 secondes)

Choisissez un listener dans la [roadmap](./TEST_BOT_LISTENERS_ROADMAP.md).

**Exemple** : `messageUpdate.ts`

---

### ✅ Étape 2 : Créer le fichier (30 secondes)

```bash
# Template de commande
touch tests/unit/listeners/[CATEGORY]/[LISTENER_NAME].spec.ts

# Exemple concret
touch tests/unit/listeners/messages/messageUpdate.spec.ts
```

---

### ✅ Étape 3 : Copier un test similaire (1 minute)

La méthode la plus rapide est de copier un test existant similaire :

```bash
# Exemple : Si vous testez messageUpdate
cp tests/unit/listeners/messages/messageCreate.spec.ts \
   tests/unit/listeners/messages/messageUpdate.spec.ts
```

---

### ✅ Étape 4 : Rechercher/Remplacer (2 minutes)

Utilisez la fonction "Rechercher/Remplacer" de votre éditeur :

| Rechercher | Remplacer par | Exemple |
|------------|---------------|---------|
| `MessageCreateListener` | Nom de la classe | `MessageUpdateListener` |
| `messageCreate` | Nom du fichier | `messageUpdate` |
| `MESSAGE_CREATE` | Type EventType | `MESSAGE_UPDATE` |

---

### ✅ Étape 5 : Adapter les tests (5-8 minutes)

#### A. Paramètres du listener

Vérifiez la signature du `run()` dans le listener source :

```typescript
// messageCreate : 1 paramètre
public async run(message: Message)

// messageUpdate : 2 paramètres
public async run(oldMessage: Message, newMessage: Message)

// guildMemberUpdate : 2 paramètres
public async run(oldMember: GuildMember, newMember: GuildMember)

// voiceStateUpdate : 2 paramètres
public async run(oldState: VoiceState, newState: VoiceState)
```

Adaptez vos tests en conséquence :

```typescript
// Pour 1 paramètre
await listener.run(mockMessage);

// Pour 2 paramètres
await listener.run(oldMockMessage, newMockMessage);
```

#### B. Conditions de filtrage

Identifiez ce que le listener doit ignorer :

```typescript
// Exemple pour messageUpdate
it('should ignore messages from bots', async () => {
  const botMessage = createMockBotMessage();
  await listener.run(botMessage, botMessage);
  expectNoEventSent(mockEventBatcher);
});

it('should ignore messages not in a guild', async () => {
  const dmMessage = createMockMessage({ guild: null, guildId: null } as any);
  await listener.run(dmMessage, dmMessage);
  expectNoEventSent(mockEventBatcher);
});
```

#### C. Données à extraire

Listez les champs importants à vérifier selon l'interface `*EventData` correspondante :

```typescript
// Exemple pour messageUpdate
expectEventSent(
  mockEventBatcher,
  EventType.MESSAGE_UPDATE,
  'guild123',
  (evt) => {
    expect(evt.data.oldContent).toBe('Old text');
    expect(evt.data.newContent).toBe('New text');
    expect(evt.data.editedAt).toBeDefined();
  }
);
```

**⚠️ Important** : Vérifiez toujours l'interface `*EventData` dans `shared-types` pour connaître la structure exacte des données.

---

### ✅ Étape 6 : Vérifier les mocks (2 minutes)

Vérifiez si vous avez besoin de créer de nouveaux mocks dans `mockFactory.ts`.

#### Mocks disponibles :

- ✅ `createMockMessage()` - Message Discord
- ✅ `createMockMessageWithAttachments()` - Message avec fichiers
- ✅ `createMockMessageWithEmbeds()` - Message avec embeds
- ✅ `createMockBotMessage()` - Message d'un bot
- ✅ `createMockSystemMessage()` - Message système
- ✅ `createMockReplyMessage()` - Réponse à un message
- ✅ `createMockMember()` - Membre de serveur
- ✅ `createMockGuild()` - Serveur Discord

#### Si vous devez créer un nouveau mock :

```typescript
// Exemple : Mock de VoiceState
export function createMockVoiceState(overrides?: Partial<VoiceState>): VoiceState {
  return {
    channelId: 'voice123',
    guild: { id: 'guild123', name: 'Test Guild' } as Guild,
    member: createMockMember(),
    deaf: false,
    mute: false,
    selfDeaf: false,
    selfMute: false,
    ...overrides
  } as unknown as VoiceState;
}
```

**⚠️ Points d'attention** :

1. **Méthodes mockées** : Utilisez `jest.fn()` pour les fonctions
   ```typescript
   displayAvatarURL: jest.fn(() => 'https://example.com/avatar.png')
   ```

2. **Double cast TypeScript** : Pour contourner les erreurs de type strictes
   ```typescript
   } as any as User
   ```

3. **Collections Discord.js** : Utilisez `Collection` de discord.js
   ```typescript
   import { Collection } from 'discord.js';
   
   roles: {
     cache: new Collection(),
   }
   ```

4. **Propriétés requises par les listeners** : Vérifiez les propriétés utilisées dans le listener
   - `user.createdAt` pour calcul d'âge de compte
   - `user.displayAvatarURL()` pour les avatars
   - `guild.roles.cache` pour les changements de rôles
   - `isCommunicationDisabled()` pour les timeouts

---

### ✅ Étape 7 : Lancer et valider (2 minutes)

```bash
# Lancer le test
npm run test -- [LISTENER_NAME].spec.ts

# Exemple concret
npm run test -- messageUpdate.spec.ts

# Vérifier la couverture
npm run test:coverage

# Si tout est vert ✅
git add tests/unit/listeners/[CATEGORY]/[LISTENER_NAME].spec.ts
git commit -m "test(bot): add tests for [LISTENER_NAME]"
```

---

## 🔧 Erreurs courantes et solutions

### Erreur 1 : "Cannot read properties of undefined"

**Symptôme** :
```
TypeError: Cannot read properties of undefined (reading 'getTime')
```

**Cause** : Une propriété requise par le listener n'est pas définie dans le mock.

**Solution** : Ajoutez la propriété manquante au mock
```typescript
// Dans mockFactory.ts - createMockMember
user: {
  id: 'user123',
  username: 'TestMember',
  createdAt: new Date('2023-01-01'), // ← Ajouter
  displayAvatarURL: jest.fn(() => 'https://...'), // ← Ajouter
  // ...
}
```

---

### Erreur 2 : "is not a function"

**Symptôme** :
```
TypeError: member.user.displayAvatarURL is not a function
```

**Solution** : Utilisez `jest.fn()` au lieu d'une fonction fléchée
```typescript
// ❌ Incorrect
displayAvatarURL: () => 'https://...'

// ✅ Correct
displayAvatarURL: jest.fn(() => 'https://...')
```

---

### Erreur 3 : Erreur de cast TypeScript

**Symptôme** :
```
La conversion du type '{ ... }' en type 'User' est peut-être une erreur
```

**Solution** : Utilisez un double cast
```typescript
// ❌ Incorrect
} as User

// ✅ Correct
} as any as User
```

---

### Erreur 4 : "Cannot read properties of undefined (reading 'cache')"

**Symptôme** :
```
TypeError: Cannot read properties of undefined (reading 'cache')
```

**Cause** : Le listener essaie d'accéder à une structure imbriquée non mockée (ex: `guild.roles.cache`)

**Solution** : Ajoutez la structure complète au mock
```typescript
guild: {
  id: 'guild123',
  name: 'Test Guild',
  roles: {  // ← Ajouter
    cache: new Collection(),
  },
} as any as Guild
```

---

### Erreur 5 : Test qui attend un array d'objets mais reçoit des strings

**Symptôme** :
```
expect(received).toContain(expected)
Expected value: "role2"
Received array: [{"id": "role2", "name": "Unknown Role"}]
```

**Cause** : L'interface `*EventData` retourne des objets, pas des strings simples.

**Solution** : Vérifiez les propriétés des objets
```typescript
// ❌ Incorrect
expect(evt.data.changes.roles.added).toContain('role2');

// ✅ Correct - vérifier l'ID dans l'objet
expect(evt.data.changes.roles.added[0].id).toBe('role2');

// ✅ Correct - avec find
expect(evt.data.changes.roles.added.find((r: any) => r.id === 'role2')).toBeDefined();

// ✅ Correct - avec map
const addedIds = evt.data.changes.roles.added.map((r: any) => r.id);
expect(addedIds).toContain('role2');
```

---

### Erreur 6 : Problème avec instanceof Map

**Symptôme** : Les rôles ne sont pas extraits correctement

**Cause** : Utilisation de `instanceof Map` au lieu de vérifier `.cache`

**Solution dans le listener** :
```typescript
// ❌ Incorrect
const roles = member.roles instanceof Map 
  ? Array.from(member.roles.cache.keys())
  : undefined;

// ✅ Correct
const roles = member.roles?.cache 
  ? Array.from(member.roles.cache.keys())
  : undefined;
```

---

## 📝 Checklist de validation

Avant de considérer un test comme terminé :

- [ ] Tous les tests passent : `npm run test -- listener-name.spec.ts`
- [ ] Au moins 4 catégories de tests :
  - [ ] Configuration (activé/désactivé)
  - [ ] Filtrage (ce qui doit être ignoré)
  - [ ] Extraction de données (vérifier les champs selon l'interface)
  - [ ] Structure BotEventDto (format correct)
- [ ] Couverture > 80% pour ce listener
- [ ] Tous les cas limites testés (null, undefined, partials)
- [ ] Code formaté : `npm run format`
- [ ] Pas de console.log oubliés
- [ ] Commit avec message clair : `test(bot): add tests for listenerName`
- [ ] Mise à jour de la roadmap (cocher la case ✅)

---

## 🎯 Astuces pour gagner du temps

### 1. Dupliquer un test similaire

Si vous testez `messageUpdate` et que `messageCreate` existe déjà :

```bash
# Copier le fichier
cp tests/unit/listeners/messages/messageCreate.spec.ts \
   tests/unit/listeners/messages/messageUpdate.spec.ts

# Faire un rechercher/remplacer global dans votre éditeur
# messageCreate → messageUpdate
# MessageCreate → MessageUpdate
# MESSAGE_CREATE → MESSAGE_UPDATE
```

### 2. Utiliser des snippets VSCode

Créez un snippet pour le beforeEach :

```json
{
  "Bot Listener Test Setup": {
    "prefix": "bottest",
    "body": [
      "let listener: ${1:ListenerName};",
      "let mockEventBatcher: any;",
      "",
      "beforeEach(() => {",
      "  const setup = setupTestContainer();",
      "  mockEventBatcher = setup.mockEventBatcher;",
      "  ",
      "  listener = new ${1:ListenerName}({} as any, {});",
      "  ",
      "  Object.defineProperty(listener, 'container', {",
      "    value: {",
      "      eventBatcher: mockEventBatcher,",
      "      logger: {",
      "        debug: jest.fn(),",
      "        info: jest.fn(),",
      "        warn: jest.fn(),",
      "        error: jest.fn(),",
      "      }",
      "    },",
      "    writable: true,",
      "    configurable: true",
      "  });",
      "});",
      "",
      "afterEach(() => {",
      "  jest.clearAllMocks();",
      "});"
    ]
  }
}
```

### 3. Lancer les tests en mode watch

```bash
npm run test:watch
```

Vos tests se relancent automatiquement à chaque sauvegarde !

---

## 🎓 Ressources rapides

- **Roadmap** : `docs/roadmaps/TEST_BOT_LISTENERS_ROADMAP.md`
- **Helpers disponibles** : `tests/helpers/testHelpers.ts`
- **Mocks disponibles** : `tests/helpers/mockFactory.ts`
- **Exemples de référence** :
  - `tests/unit/listeners/messages/messageCreate.spec.ts` (1 paramètre, simple)
  - `tests/unit/listeners/messages/messageUpdate.spec.ts` (2 paramètres, gestion partials)
  - `tests/unit/listeners/members/guildMemberUpdate.spec.ts` (détection changements complexes)

---

## ⏱️ Temps moyen par listener

| Type de listener | Temps estimé | Difficulté |
|------------------|--------------|------------|
| Simple (1 param, peu de filtrage) | 30-45 min | 🟢 Facile |
| Moyen (2 params, filtrage standard) | 45-90 min | 🟡 Moyen |
| Complexe (détection changements, partials) | 90-120 min | 🔴 Difficile |

**Note** : Avec l'expérience acquise, les temps réels sont souvent plus courts (~1.1h en moyenne).

---

## 📚 Leçons apprises (Octobre 2025)

### Points clés à retenir

1. **Toujours vérifier l'interface EventData** avant d'écrire les tests
2. **Mocks complets dès le début** : Mieux vaut ajouter toutes les propriétés nécessaires au début
3. **Jest.fn() pour les méthodes** : Obligatoire pour les fonctions dans les mocks Discord.js
4. **Optional chaining partout** : Utiliser `?.` pour gérer les partials gracieusement
5. **Double cast TypeScript** : `as any as Type` résout la plupart des problèmes de typage
6. **Vérifier le listener** : Parfois c'est le listener qui a besoin d'être corrigé, pas le test

### Corrections communes

- ✅ `roles?.cache` au lieu de `instanceof Map`
- ✅ `guild.roles?.cache?.get()` avec optional chaining
- ✅ `jest.fn()` pour `displayAvatarURL`, `isCommunicationDisabled`
- ✅ Vérifier les objets `{id, name}` et non les strings pour les rôles
- ✅ Ajouter `user.createdAt` pour les calculs d'âge de compte

---

**Bon courage ! 🚀**

Vous avez tous les outils pour créer des tests de qualité rapidement. N'hésitez pas à consulter les exemples et à adapter les patterns à votre cas d'usage.

**Version** : 1.1  
**Dernière mise à jour** : Octobre 2025  
**Inclut les leçons des 7 premiers listeners testés**