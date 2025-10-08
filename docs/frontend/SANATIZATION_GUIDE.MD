# 🔒 Guide de Sanitization - Protection XSS

## 📋 Table des matières
- [Quand utiliser la sanitization](#quand-utiliser)
- [Exemples d'utilisation](#exemples)
- [Cas d'usage Discord](#cas-discord)
- [Pièges à éviter](#pièges)

---

## 🎯 Quand utiliser la sanitization ?

### ✅ UTILISER la sanitization dans ces cas :

1. **Affichage de contenu HTML dynamique avec `[innerHTML]`**
   ```html
   <!-- ⚠️ NÉCESSITE sanitization -->
   <div [innerHTML]="messageContent"></div>
   <div [innerHTML]="guildDescription"></div>
   <div [innerHTML]="userBio"></div>
   ```

2. **Contenu provenant de sources externes**
   - Messages Discord (si formatés en HTML)
   - Descriptions de serveurs
   - Biographies utilisateurs
   - Tout contenu utilisateur avec formatage riche

3. **Markdown converti en HTML**
   ```typescript
   // Si vous convertissez du Markdown Discord en HTML
   const htmlContent = markdownToHtml(discordMessage);
   const safeHtml = this.sanitization.sanitizeHtml(htmlContent);
   ```

### ❌ NE PAS utiliser la sanitization dans ces cas :

1. **Interpolation Angular normale**
   ```html
   <!-- ✅ DÉJÀ PROTÉGÉ par Angular -->
   {{ username }}
   {{ guild.name }}
   {{ message.content }}
   ```

2. **Binding de propriétés standards**
   ```html
   <!-- ✅ DÉJÀ PROTÉGÉ par Angular -->
   <img [src]="avatarUrl">
   <a [href]="profileLink">{{ username }}</a>
   <p [title]="tooltipText">Hover me</p>
   ```

3. **Contenu statique**
   ```html
   <!-- ✅ PAS BESOIN -->
   <p>Bienvenue sur notre serveur Discord !</p>
   ```

---

## 📚 Exemples d'utilisation

### Exemple 1 : Affichage de messages Discord avec formatage

```typescript
// message.component.ts
import { Component, Input, inject } from '@angular/core';
import { SanitizationService } from '@services/sanitization.service';
import { SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-discord-message',
  template: `
    <div class="message">
      <!-- ✅ Username : interpolation normale (sécurisé automatiquement) -->
      <span class="username">{{ message.author }}</span>
      
      <!-- ⚠️ Contenu avec HTML : NÉCESSITE sanitization -->
      <div class="content" [innerHTML]="safeContent"></div>
    </div>
  `
})
export class DiscordMessageComponent {
  @Input() message!: DiscordMessage;
  
  private sanitization = inject(SanitizationService);
  
  get safeContent(): SafeHtml {
    // Sanitize le contenu HTML du message
    return this.sanitization.sanitizeHtml(this.message.content);
  }
}
```

### Exemple 2 : Description de serveur avec formatage

```typescript
// guild-info.component.ts
import { Component, computed, inject } from '@angular/core';
import { SanitizationService } from '@services/sanitization.service';

@Component({
  selector: 'app-guild-info',
  template: `
    <div class="guild-info">
      <!-- ✅ Nom : interpolation normale -->
      <h2>{{ guild().name }}</h2>
      
      <!-- ⚠️ Description avec HTML : sanitization nécessaire -->
      <div class="description" [innerHTML]="safeDescription()"></div>
    </div>
  `
})
export class GuildInfoComponent {
  private sanitization = inject(SanitizationService);
  guild = signal<Guild>(...);
  
  safeDescription = computed(() => {
    const desc = this.guild().description || '';
    return this.sanitization.sanitizeHtml(desc);
  });
}
```

### Exemple 3 : Biographie utilisateur

```typescript
// user-profile.component.ts
export class UserProfileComponent {
  private sanitization = inject(SanitizationService);
  
  // Signal pour la bio sanitizée
  safeBio = computed(() => {
    const bio = this.user().bio || 'Aucune biographie';
    // Si la bio contient du HTML, sanitizer
    if (bio.includes('<') || bio.includes('>')) {
      return this.sanitization.sanitizeHtml(bio);
    }
    // Sinon, retourner tel quel (pas de HTML)
    return bio;
  });
}
```

```html
<!-- Template -->
<div class="user-profile">
  <h2>{{ user().username }}</h2>
  
  <!-- Bio avec HTML possible -->
  <div class="bio" [innerHTML]="safeBio()"></div>
</div>
```

---

## 🎮 Cas d'usage Discord spécifiques

### 1. Messages avec formatage Markdown

Discord utilise du Markdown. Si vous le convertissez en HTML :

```typescript
import { marked } from 'marked'; // Exemple de lib Markdown

export class MessageComponent {
  private sanitization = inject(SanitizationService);
  
  get formattedMessage(): SafeHtml {
    // 1. Convertir Markdown → HTML
    const html = marked(this.message.content);
    
    // 2. Sanitizer le HTML généré
    return this.sanitization.sanitizeHtml(html);
  }
}
```

### 2. Embeds Discord

```typescript
export class EmbedComponent {
  @Input() embed!: DiscordEmbed;
  private sanitization = inject(SanitizationService);
  
  get safeDescription(): SafeHtml {
    return this.sanitization.sanitizeHtml(this.embed.description);
  }
  
  get safeFooter(): SafeHtml {
    return this.sanitization.sanitizeHtml(this.embed.footer?.text);
  }
}
```

### 3. Noms de serveurs/channels avec emojis custom

```typescript
// ✅ Interpolation normale suffit
<h2>{{ guild.name }}</h2>

// ❌ Pas besoin de sanitization pour les noms
// Les emojis Discord sont juste du texte ou des IDs
```

---

## ⚠️ Pièges à éviter

### Piège 1 : Sur-sanitization

```typescript
// ❌ MAUVAIS : Sanitizer inutilement
<p>{{ sanitization.sanitizeHtml(username) }}</p>

// ✅ BON : Interpolation normale
<p>{{ username }}</p>
```

### Piège 2 : Oublier de sanitizer [innerHTML]

```typescript
// ❌ DANGEREUX : Pas de sanitization avec innerHTML
<div [innerHTML]="userContent"></div>

// ✅ SÉCURISÉ : Toujours sanitizer
<div [innerHTML]="sanitization.sanitizeHtml(userContent)"></div>
```

### Piège 3 : Utiliser `trustHtml` avec du contenu utilisateur

```typescript
// ❌ TRÈS DANGEREUX : Ne JAMAIS faire confiance au contenu utilisateur
const unsafe = this.sanitization.trustHtml(userInput);

// ✅ BON : Toujours sanitizer le contenu utilisateur
const safe = this.sanitization.sanitizeHtml(userInput);
```

### Piège 4 : Ne pas vérifier les valeurs null/undefined

```typescript
// ❌ PEUT CAUSER DES ERREURS
get safeContent(): SafeHtml {
  return this.sanitization.sanitizeHtml(this.message.content);
}

// ✅ BON : Le service gère déjà null/undefined
// Mais vous pouvez ajouter une vérification supplémentaire
get safeContent(): SafeHtml {
  if (!this.message?.content) {
    return '';
  }
  return this.sanitization.sanitizeHtml(this.message.content);
}
```

---

## 🧪 Comment tester

### Test 1 : Vérifier que le script est supprimé

```typescript
const malicious = '<p>Hello <script>alert("XSS")</script></p>';
const safe = this.sanitization.sanitizeHtml(malicious);
// Résultat attendu : '<p>Hello </p>' (script supprimé)
```

### Test 2 : Vérifier les URLs malveillantes

```typescript
const maliciousUrl = 'javascript:alert("XSS")';
const safe = this.sanitization.sanitizeUrl(maliciousUrl);
// Résultat : URL bloquée par Angular
```

### Test 3 : Vérifier le contenu HTML valide

```typescript
const valid = '<p><strong>Texte en gras</strong></p>';
const safe = this.sanitization.sanitizeHtml(valid);
// Résultat : HTML valide conservé
```

---

## 📝 Checklist avant production

- [ ] Identifier tous les `[innerHTML]` dans votre application
- [ ] Vérifier que chaque `[innerHTML]` utilise du contenu sanitizé
- [ ] Vérifier qu'aucun `trustHtml` n'est utilisé avec du contenu utilisateur
- [ ] Tester avec du contenu malveillant (scripts, iframes, etc.)
- [ ] Documenter les endroits où la sanitization est utilisée

---

## 🔗 Ressources

- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Angular Security Guide](https://angular.dev/best-practices/security)
- [DomSanitizer Documentation](https://angular.dev/api/platform-browser/DomSanitizer)

---

**Version :** 1.0.0  
**Dernière mise à jour :** Octobre 2025  
**Maintenu par :** L'équipe Frontend

🔒 **La sécurité est l'affaire de tous !**