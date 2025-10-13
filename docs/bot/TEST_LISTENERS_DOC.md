# ⚡ Guide Rapide d'Implémentation des Tests

## 🎯 Objectif

Ce guide vous permet de créer un test pour un nouveau listener en **moins de 15 minutes** en suivant une checklist simple.

---

## 📋 Checklist en 7 étapes

### ✅ Étape 1 : Identifier le listener (30 secondes)

Choisissez un listener dans la [roadmap](./TESTS_ROADMAP.md).

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

### ✅ Étape 3 : Copier le template (1 minute)

Copiez le contenu du template depuis la documentation complète et collez-le dans votre fichier.

---

### ✅ Étape 4 : Rechercher/Remplacer (2 minutes)

Utilisez la fonction "Rechercher/Remplacer" de votre éditeur :

| Rechercher | Remplacer par | Exemple |
|------------|---------------|---------|
| `[LISTENER_CLASS_NAME]` | Nom de la classe | `MessageUpdateListener` |
| `[CATEGORY]` | Catégorie | `messages` |
| `[LISTENER_NAME]` | Nom du fichier | `messageUpdate` |
| `[EVENT_TYPE]` | Type EventType | `MESSAGE_UPDATE` |
| `[OBJECT]` | Type d'objet Discord | `Message` |

---

### ✅ Étape 5 : Adapter les tests (5-8 minutes)

#### A. Paramètres du listener

Vérifiez la signature du `run()` :

```typescript
// messageCreate : 1 paramètre
public async run(message: Message)

// messageUpdate : 2 paramètres
public async run(oldMessage: Message, newMessage: Message)

// voiceStateUpdate : 2 paramètres
public async run(oldState: VoiceState, newState: VoiceState)
```

Adaptez vos tests :

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

Listez les champs importants à vérifier :

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

---

### ✅ Étape 6 : Vérifier les mocks (2 minutes)

Vérifiez si vous avez besoin de créer de nouveaux mocks dans `mockFactory.ts` :

```typescript
// Exemple : Si votre listener utilise VoiceState
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

---

### ✅ Étape 7 : Lancer et valider (2 minutes)

```bash
# Lancer le test
npm run test -- [LISTENER_NAME].spec.ts

# Vérifier la couverture
npm run test:coverage

# Si tout est vert ✅
git add tests/unit/listeners/[CATEGORY]/[LISTENER_NAME].spec.ts
git commit -m "test(bot): add tests for [LISTENER_NAME]"
```

---

## 🔄 Exemples concrets

### Exemple 1 : messageUpdate (listener à 2 paramètres)

```typescript
import { MessageUpdateListener } from '../../../../src/listeners/messages/messageUpdate';
import { EventType } from '@my-project/shared-types';
import { MessageType } from 'discord.js';
import { 
  setupTestContainer, 
  expectEventSent, 
  expectNoEventSent 
} from '../../../helpers/testHelpers';
import { 
  createMockMessage,
  createMockBotMessage
} from '../../../helpers/mockFactory';
import * as listenersConfig from '../../../../src/config/listeners.config';

describe('MessageUpdateListener', () => {
  let listener: MessageUpdateListener;
  let mockEventBatcher: any;
  
  beforeEach(() => {
    const setup = setupTestContainer();
    mockEventBatcher = setup.mockEventBatcher;
    
    listener = new MessageUpdateListener({} as any, {});
    
    Object.defineProperty(listener, 'container', {
      value: {
        eventBatcher: mockEventBatcher,
        logger: {
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        }
      },
      writable: true,
      configurable: true
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration du listener', () => {
    it('should be disabled when listener config is disabled', async () => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(false);
      
      const oldMessage = createMockMessage({ content: 'Old' } as any);
      const newMessage = createMockMessage({ content: 'New' } as any);
      
      await listener.run(oldMessage, newMessage);
      
      expectNoEventSent(mockEventBatcher);
    });
  });

  describe('Filtrage des messages', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should ignore messages from bots', async () => {
      const botMessage = createMockBotMessage();
      
      await listener.run(botMessage, botMessage);
      
      expectNoEventSent(mockEventBatcher);
    });
  });

  describe('Extraction des données', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should extract old and new content', async () => {
      const oldMessage = createMockMessage({ 
        id: 'msg123',
        content: 'Old content' 
      } as any);
      
      const newMessage = createMockMessage({ 
        id: 'msg123',
        content: 'New content',
        editedTimestamp: Date.now(),
        editedAt: new Date()
      } as any);
      
      await listener.run(oldMessage, newMessage);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.oldContent).toBe('Old content');
          expect(evt.data.newContent).toBe('New content');
          expect(evt.data.editedAt).toBeDefined();
        }
      );
    });
  });
});
```

---

### Exemple 2 : guildMemberAdd (objet différent)

**Étape 1** : Créer le mock si nécessaire

```typescript
// Dans mockFactory.ts
export function createMockMember(overrides?: Partial<GuildMember>): GuildMember {
  return {
    id: 'member123',
    user: {
      id: 'user123',
      username: 'TestMember',
      discriminator: '0001',
      bot: false,
      tag: 'TestMember#0001',
    } as User,
    guild: {
      id: 'guild123',
      name: 'Test Guild',
    } as Guild,
    joinedTimestamp: Date.now(),
    joinedAt: new Date(),
    roles: {
      cache: new Collection(),
    },
    nickname: null,
    ...overrides,
  } as unknown as GuildMember;
}
```

**Étape 2** : Créer le test

```typescript
import { GuildMemberAddListener } from '../../../../src/listeners/members/guildMemberAdd';
import { EventType } from '@my-project/shared-types';
import { 
  setupTestContainer, 
  expectEventSent 
} from '../../../helpers/testHelpers';
import { createMockMember } from '../../../helpers/mockFactory';
import * as listenersConfig from '../../../../src/config/listeners.config';

describe('GuildMemberAddListener', () => {
  let listener: GuildMemberAddListener;
  let mockEventBatcher: any;
  
  beforeEach(() => {
    const setup = setupTestContainer();
    mockEventBatcher = setup.mockEventBatcher;
    
    listener = new GuildMemberAddListener({} as any, {});
    
    Object.defineProperty(listener, 'container', {
      value: {
        eventBatcher: mockEventBatcher,
        logger: {
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        }
      },
      writable: true,
      configurable: true
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Extraction des données', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should extract member data correctly', async () => {
      const member = createMockMember({
        user: {
          id: 'newuser123',
          username: 'NewUser',
          bot: false
        } as any
      });
      
      await listener.run(member);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_ADD,
        'guild123',
        (evt) => {
          expect(evt.data.userId).toBe('newuser123');
          expect(evt.data.username).toBe('NewUser');
          expect(evt.data.isBot).toBe(false);
          expect(evt.data.joinedAt).toBeDefined();
        }
      );
    });
    
    it('should detect bot accounts', async () => {
      const botMember = createMockMember({
        user: {
          id: 'bot123',
          username: 'BotAccount',
          bot: true
        } as any
      });
      
      await listener.run(botMember);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_ADD,
        'guild123',
        (evt) => {
          expect(evt.data.isBot).toBe(true);
        }
      );
    });
  });
});
```

---

### Exemple 3 : voiceStateUpdate (détection de changements)

```typescript
import { VoiceStateUpdateListener } from '../../../../src/listeners/voice/voiceStateUpdate';
import { EventType } from '@my-project/shared-types';
import { 
  setupTestContainer, 
  expectEventSent 
} from '../../../helpers/testHelpers';
import { createMockVoiceState } from '../../../helpers/mockFactory';
import * as listenersConfig from '../../../../src/config/listeners.config';

describe('VoiceStateUpdateListener', () => {
  let listener: VoiceStateUpdateListener;
  let mockEventBatcher: any;
  
  beforeEach(() => {
    const setup = setupTestContainer();
    mockEventBatcher = setup.mockEventBatcher;
    
    listener = new VoiceStateUpdateListener({} as any, {});
    
    Object.defineProperty(listener, 'container', {
      value: {
        eventBatcher: mockEventBatcher,
        logger: {
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        }
      },
      writable: true,
      configurable: true
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Détection des actions', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should detect channel join', async () => {
      const oldState = createMockVoiceState({ channelId: null } as any);
      const newState = createMockVoiceState({ channelId: 'voice123' } as any);
      
      await listener.run(oldState, newState);
      
      expectEventSent(
        mockEventBatcher,
        EventType.VOICE_STATE_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.action).toBe('join');
          expect(evt.data.channelId).toBe('voice123');
        }
      );
    });
    
    it('should detect channel leave', async () => {
      const oldState = createMockVoiceState({ channelId: 'voice123' } as any);
      const newState = createMockVoiceState({ channelId: null } as any);
      
      await listener.run(oldState, newState);
      
      expectEventSent(
        mockEventBatcher,
        EventType.VOICE_STATE_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.action).toBe('leave');
        }
      );
    });
    
    it('should detect mute/unmute', async () => {
      const oldState = createMockVoiceState({ 
        channelId: 'voice123',
        mute: false 
      } as any);
      
      const newState = createMockVoiceState({ 
        channelId: 'voice123',
        mute: true 
      } as any);
      
      await listener.run(oldState, newState);
      
      expectEventSent(
        mockEventBatcher,
        EventType.VOICE_STATE_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.changes).toContain('mute');
        }
      );
    });
  });
});
```

---

## 🎨 Patterns courants

### Pattern 1 : Listener avec filtrage de bots

```typescript
describe('Filtrage des messages', () => {
  it('should ignore messages from bots', async () => {
    const botMessage = createMockBotMessage();
    await listener.run(botMessage);
    expectNoEventSent(mockEventBatcher);
  });
  
  it('should accept messages from users', async () => {
    const userMessage = createMockMessage();
    await listener.run(userMessage);
    expect(mockEventBatcher.addEvent).toHaveBeenCalled();
  });
});
```

### Pattern 2 : Listener avec détection de changements

```typescript
describe('Détection des changements', () => {
  it('should detect when [FIELD] changes', async () => {
    const oldObject = createMock[OBJECT]({ [FIELD]: 'old value' } as any);
    const newObject = createMock[OBJECT]({ [FIELD]: 'new value' } as any);
    
    await listener.run(oldObject, newObject);
    
    expectEventSent(
      mockEventBatcher,
      EventType.[EVENT_TYPE],
      'guild123',
      (evt) => {
        expect(evt.data.changes.[FIELD]).toEqual({
          old: 'old value',
          new: 'new value'
        });
      }
    );
  });
});
```

### Pattern 3 : Listener avec événement critique (envoi immédiat)

```typescript
describe('Envoi immédiat', () => {
  it('should send event immediately (critical)', async () => {
    jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    
    const banEvent = createMockBan();
    
    await listener.run(banEvent);
    
    // L'événement devrait être envoyé immédiatement
    expect(mockEventBatcher.addEvent).toHaveBeenCalledTimes(1);
    
    // Vérifier que c'est bien un événement critique
    const event = mockEventBatcher.addEvent.mock.calls[0][0];
    expect(event.type).toBe(EventType.GUILD_BAN_ADD);
  });
});
```

### Pattern 4 : Listener avec gestion de partials

```typescript
describe('Gestion des partials', () => {
  it('should handle partial messages', async () => {
    jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    
    const partialMessage = createMockMessage({
      partial: true,
      content: undefined, // Non disponible si partial
      author: { id: 'user123' } as any
    } as any);
    
    await listener.run(partialMessage);
    
    expectEventSent(
      mockEventBatcher,
      EventType.MESSAGE_DELETE,
      'guild123',
      (evt) => {
        expect(evt.data.content).toBeUndefined();
        expect(evt.data.authorId).toBe('user123');
      }
    );
  });
});
```

---

## 🚨 Erreurs fréquentes et solutions

### Erreur 1 : "Cannot read properties of undefined"

**Symptôme** :
```
TypeError: Cannot read properties of undefined (reading 'map')
```

**Cause** : Un champ manque dans votre mock

**Solution** :
```typescript
// Ajouter le champ manquant dans mockFactory.ts
export function createMockMessage(overrides?: Partial<Message>): Message {
  const defaultMessage = {
    // ... autres champs
    stickers: new Collection(),  // <-- Ajouter
    reactions: new Collection(), // <-- Ajouter si nécessaire
  };
  return { ...defaultMessage, ...overrides } as unknown as Message;
}
```

---

### Erreur 2 : "Type '...' is not assignable"

**Symptôme** :
```
Type '{ content: string; }' is not assignable to type 'Partial<Message>'
```

**Solution** : Ajouter `as any` au cast
```typescript
const message = createMockMessage({ content: 'test' } as any);
```

---

### Erreur 3 : Mock du container qui ne fonctionne pas

**Symptôme** :
```
TypeError: Cannot read properties of undefined (reading 'addEvent')
```

**Solution** : Utiliser `Object.defineProperty`
```typescript
Object.defineProperty(listener, 'container', {
  value: {
    eventBatcher: mockEventBatcher,
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  },
  writable: true,
  configurable: true
});
```

---

### Erreur 4 : Test qui timeout

**Symptôme** :
```
Timeout - Async callback was not invoked within the 10000 ms timeout
```

**Solution** : Augmenter le timeout ou vérifier les promises
```typescript
it('should do something', async () => {
  // ... test
}, 15000); // 15 secondes au lieu de 10

// OU vérifier que vous utilisez bien async/await
await listener.run(message); // Ne pas oublier le await !
```

---

## 📝 Checklist de validation

Avant de considérer un test comme terminé :

- [ ] Tous les tests passent : `npm run test -- listener-name.spec.ts`
- [ ] Au moins 4 catégories de tests :
  - [ ] Configuration (activé/désactivé)
  - [ ] Filtrage (ce qui doit être ignoré)
  - [ ] Extraction de données (vérifier les champs)
  - [ ] Structure BotEventDto (format correct)
- [ ] Couverture > 80% pour ce listener
- [ ] Tous les cas limites testés (null, undefined, partials)
- [ ] Code formaté : `npm run format`
- [ ] Pas de console.log oubliés
- [ ] Commit avec message clair

---

## 🎯 Astuces pour gagner du temps

### 1. Dupliquer un test similaire

Si vous testez `messageUpdate` et que `messageCreate` existe déjà :

```bash
# Copier le fichier
cp tests/unit/listeners/messages/messageCreate.spec.ts \
   tests/unit/listeners/messages/messageUpdate.spec.ts

# Faire un rechercher/remplacer global
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

- **Template complet** : Voir documentation principale
- **Roadmap** : `TESTS_ROADMAP.md`
- **Helpers disponibles** : `tests/helpers/testHelpers.ts`
- **Mocks disponibles** : `tests/helpers/mockFactory.ts`
- **Exemple de référence** : `tests/unit/listeners/messages/messageCreate.spec.ts`

---

## ⏱️ Temps moyen par listener

| Type de listener | Temps estimé | Difficulté |
|------------------|--------------|------------|
| Simple (1 param, peu de filtrage) | 30-45 min | 🟢 Facile |
| Moyen (2 params, filtrage standard) | 45-90 min | 🟡 Moyen |
| Complexe (détection changements, partials) | 90-120 min | 🔴 Difficile |

---

**Bon courage ! 🚀**

Vous avez tous les outils pour créer des tests de qualité rapidement. N'hésitez pas à consulter les exemples et à adapter les patterns à votre cas d'usage.