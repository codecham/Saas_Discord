# 📊 StatCard Component

Composant réutilisable de card de statistique avec icône, titre, valeur et options avancées.

Basé sur le design du template Sakai (StatsWidget).

---

## 📦 Installation

```typescript
// Importer le composant
import { StatCardComponent } from '@app/shared/components/ui/stat-card';

// Dans votre composant standalone
@Component({
  standalone: true,
  imports: [StatCardComponent],
  // ...
})
```

---

## 🎯 Usage Basique

```html
<app-stat-card
  title="Total Membres"
  [value]="152"
  icon="pi pi-users"
  color="blue"
/>
```

---

## 📋 API

### Inputs (Required)

| Input | Type | Description |
|-------|------|-------------|
| `title` | `string` | Titre de la card |
| `value` | `string \| number` | Valeur à afficher |

### Inputs (Optional)

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `icon` | `string` | `undefined` | Icône PrimeNG (ex: `"pi pi-users"`) |
| `color` | `StatCardColor` | `'blue'` | Couleur de l'icône et du badge |
| `size` | `StatCardSize` | `'medium'` | Taille du composant |
| `variant` | `StatCardVariant` | `'default'` | Variant du composant |
| `subtitle` | `string \| StatCardSubtitle` | `undefined` | Subtitle (texte simple ou objet) |
| `trend` | `StatCardTrend` | `undefined` | Indicateur de trend (+X%) |
| `loading` | `boolean` | `false` | État de chargement (skeleton) |
| `clickable` | `boolean` | `false` | Card cliquable (hover + cursor) |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `cardClick` | `void` | Émis quand la card est cliquée (si `clickable = true`) |

---

## 🎨 Types

### StatCardColor

```typescript
type StatCardColor = 
  | 'blue'
  | 'orange' 
  | 'cyan'
  | 'purple'
  | 'green'
  | 'red'
  | 'pink'
  | 'indigo';
```

### StatCardSize

```typescript
type StatCardSize = 'small' | 'medium' | 'large';
```

### StatCardTrend

```typescript
interface StatCardTrend {
  value: number;          // Ex: 12 pour +12%, -5 pour -5%
  label?: string;         // Ex: "vs last month"
  invertColors?: boolean; // Inverser couleurs (rouge = bon)
}
```

### StatCardSubtitle

```typescript
interface StatCardSubtitle {
  highlight?: string;  // Partie en primary color (ex: "24 new")
  text: string;        // Partie en muted color (ex: "since last visit")
}
```

---

## 💡 Exemples

### Avec subtitle simple

```html
<app-stat-card
  title="Messages Aujourd'hui"
  [value]="1247"
  icon="pi pi-comments"
  color="green"
  subtitle="depuis minuit"
/>
```

### Avec subtitle flexible (highlight + text)

```html
<app-stat-card
  title="Revenue"
  [value]="'$2,100'"
  icon="pi pi-dollar"
  color="orange"
  [subtitle]="{ highlight: '24 new', text: 'since last visit' }"
/>
```

### Avec trend positif

```html
<app-stat-card
  title="Active Users"
  [value]="2841"
  icon="pi pi-users"
  color="cyan"
  [trend]="{ value: 12, label: 'vs last month' }"
/>
```

### Avec trend négatif

```html
<app-stat-card
  title="Server Load"
  [value]="'45%'"
  icon="pi pi-server"
  color="red"
  [trend]="{ value: -8, label: 'depuis hier' }"
/>
```

### Trend inversé (baisse = positif)

Utile pour métriques comme taux d'erreur, latence, etc.

```html
<app-stat-card
  title="Error Rate"
  [value]="'0.02%'"
  icon="pi pi-exclamation-triangle"
  color="green"
  [trend]="{ value: -15, label: 'vs last week', invertColors: true }"
/>
```

### Card cliquable

```html
<app-stat-card
  title="Pending Tasks"
  [value]="12"
  icon="pi pi-clock"
  color="purple"
  subtitle="nécessitent une action"
  [clickable]="true"
  (cardClick)="handleClick()"
/>
```

### Loading state (skeleton)

```html
<app-stat-card
  title="Loading..."
  [value]="0"
  [loading]="true"
/>
```

### Différentes tailles

```html
<!-- Small -->
<app-stat-card
  title="Small"
  [value]="99"
  size="small"
/>

<!-- Medium (default) -->
<app-stat-card
  title="Medium"
  [value]="152"
  size="medium"
/>

<!-- Large -->
<app-stat-card
  title="Large"
  [value]="1234"
  size="large"
/>
```

### Sans icône

```html
<app-stat-card
  title="Sans Icône"
  [value]="'42'"
  subtitle="simple et épuré"
/>
```

---

## 🏗️ Utilisation dans un Widget

```typescript
import { Component, inject, computed } from '@angular/core';
import { StatCardComponent, StatCardSubtitle } from '@app/shared/components/ui/stat-card';
import { MemberFacadeService } from '@app/core/services/member/member-facade.service';

@Component({
  standalone: true,
  selector: 'app-guild-stats-widget',
  imports: [StatCardComponent],
  template: `
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <app-stat-card
        title="Total Membres"
        [value]="totalMembers()"
        icon="pi pi-users"
        color="blue"
        [subtitle]="membersSubtitle()"
        [clickable]="true"
        (cardClick)="navigateToMembers()"
      />
    </div>
  `
})
export class GuildStatsWidget {
  private memberFacade = inject(MemberFacadeService);

  protected totalMembers = computed(() => {
    return this.memberFacade.totalCount();
  });

  protected membersSubtitle = computed((): StatCardSubtitle => {
    const loaded = this.memberFacade.memberCount();
    return {
      highlight: `${loaded}`,
      text: 'chargés en cache'
    };
  });

  protected navigateToMembers(): void {
    // Navigation logic...
  }
}
```

---

## 🎨 Grid Layout Recommandé

Pour afficher plusieurs cards côte à côte (responsive) :

```html
<div class="grid grid-cols-12 gap-4">
  <!-- 4 cards par ligne sur desktop (xl), 2 sur tablet (lg), 1 sur mobile -->
  <div class="col-span-12 lg:col-span-6 xl:col-span-3">
    <app-stat-card ... />
  </div>
  <div class="col-span-12 lg:col-span-6 xl:col-span-3">
    <app-stat-card ... />
  </div>
  <div class="col-span-12 lg:col-span-6 xl:col-span-3">
    <app-stat-card ... />
  </div>
  <div class="col-span-12 lg:col-span-6 xl:col-span-3">
    <app-stat-card ... />
  </div>
</div>
```

---

## 🎯 Best Practices

### ✅ DO

- Utiliser des `computed()` signals pour les valeurs dynamiques
- Utiliser `StatCardSubtitle` pour les subtitles avec highlight
- Activer `clickable` quand la card doit naviguer quelque part
- Utiliser `loading` pendant les chargements de données
- Utiliser `invertColors` pour les métriques où une baisse est positive

### ❌ DON'T

- Ne pas mettre trop de texte dans le subtitle (garder concis)
- Ne pas oublier de gérer l'event `cardClick` si `clickable = true`
- Ne pas utiliser de trends sans label explicite (ambiguïté)
- Ne pas abuser des grandes tailles (privilégier `medium` par défaut)

---

## 🚀 Prochaines améliorations possibles

- [ ] Support des tooltips sur hover
- [ ] Animation lors du changement de valeur
- [ ] Support des graphiques inline (sparklines)
- [ ] Mode "compact" avec moins de padding
- [ ] Support des badges (new, hot, etc.)
- [ ] Personnalisation avancée des couleurs (theme override)

---

## 📝 Changelog

### v1.0.0 (2024-01-XX)
- ✨ Initial release
- ✅ Support des 8 couleurs
- ✅ Support des 3 tailles (small, medium, large)
- ✅ Trend indicator avec inversion de couleurs
- ✅ Subtitle flexible (string ou objet)
- ✅ Loading state (skeleton)
- ✅ Clickable mode
- ✅ Responsive design