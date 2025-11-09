# 📋 Frontend Architecture - Quick Reference

Guide de référence rapide pour le développement quotidien.

---

## 🎯 Où Mettre Mon Code ? (30 secondes)

```
Guard/Interceptor       → core/guards/ ou core/interceptors/
Service métier          → core/services/[domain]/ (3 fichiers: api, data, facade)
Layout                  → core/layout/
Composant Discord       → shared/components/domain/
Composant générique     → shared/components/ui/
Widget complexe         → shared/components/widgets/
Page/Route              → features/[feature]/
Config partagée         → shared/config/
Type/Interface          → shared/interfaces/
Code démo               → demo/ (ne pas toucher)
```

---

## 🔧 Pattern Facade - Template Rapide

### Créer un nouveau service `example/`

```bash
# 1. Créer dossier
mkdir -p src/app/core/services/example

# 2. Créer les 3 fichiers
touch src/app/core/services/example/example-api.service.ts
touch src/app/core/services/example/example-data.service.ts
touch src/app/core/services/example/example-facade.service.ts
```

### API Service (HTTP)

```typescript
// example-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface ExampleDTO {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class ExampleApiService {
  private apiUrl = `${environment.apiUrl}/example`;

  constructor(private http: HttpClient) {}

  getItems(): Observable<ExampleDTO[]> {
    return this.http.get<ExampleDTO[]>(this.apiUrl);
  }

  getItem(id: string): Observable<ExampleDTO> {
    return this.http.get<ExampleDTO>(`${this.apiUrl}/${id}`);
  }

  createItem(data: Partial<ExampleDTO>): Observable<ExampleDTO> {
    return this.http.post<ExampleDTO>(this.apiUrl, data);
  }

  updateItem(id: string, data: Partial<ExampleDTO>): Observable<ExampleDTO> {
    return this.http.put<ExampleDTO>(`${this.apiUrl}/${id}`, data);
  }

  deleteItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
```

### Data Service (State)

```typescript
// example-data.service.ts
import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExampleDataService {
  // Private state
  private _items = signal<ExampleDTO[]>([]);
  private _selectedItem = signal<ExampleDTO | null>(null);
  private _loading = signal<boolean>(false);

  // Public readonly
  readonly items = this._items.asReadonly();
  readonly selectedItem = this._selectedItem.asReadonly();
  readonly loading = this._loading.asReadonly();

  // Computed
  readonly itemCount = computed(() => this._items().length);

  // Mutations
  setItems(items: ExampleDTO[]): void {
    this._items.set(items);
  }

  addItem(item: ExampleDTO): void {
    this._items.update(items => [...items, item]);
  }

  updateItem(id: string, data: Partial<ExampleDTO>): void {
    this._items.update(items =>
      items.map(item => item.id === id ? { ...item, ...data } : item)
    );
  }

  removeItem(id: string): void {
    this._items.update(items => items.filter(item => item.id !== id));
  }

  selectItem(item: ExampleDTO | null): void {
    this._selectedItem.set(item);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  clear(): void {
    this._items.set([]);
    this._selectedItem.set(null);
  }
}
```

### Facade Service (Orchestration)

```typescript
// example-facade.service.ts
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ExampleApiService } from './example-api.service';
import { ExampleDataService } from './example-data.service';

@Injectable({ providedIn: 'root' })
export class ExampleFacadeService {
  private api = inject(ExampleApiService);
  private data = inject(ExampleDataService);

  // Expose readonly state
  get items() { return this.data.items; }
  get selectedItem() { return this.data.selectedItem; }
  get loading() { return this.data.loading; }
  get itemCount() { return this.data.itemCount; }

  // Actions
  async loadItems(): Promise<void> {
    try {
      this.data.setLoading(true);
      const items = await firstValueFrom(this.api.getItems());
      this.data.setItems(items);
    } catch (error) {
      console.error('Failed to load items', error);
      throw error;
    } finally {
      this.data.setLoading(false);
    }
  }

  async loadItem(id: string): Promise<void> {
    try {
      this.data.setLoading(true);
      const item = await firstValueFrom(this.api.getItem(id));
      this.data.selectItem(item);
    } catch (error) {
      console.error('Failed to load item', error);
      throw error;
    } finally {
      this.data.setLoading(false);
    }
  }

  async createItem(data: Partial<ExampleDTO>): Promise<ExampleDTO> {
    try {
      const item = await firstValueFrom(this.api.createItem(data));
      this.data.addItem(item);
      return item;
    } catch (error) {
      console.error('Failed to create item', error);
      throw error;
    }
  }

  async updateItem(id: string, data: Partial<ExampleDTO>): Promise<void> {
    try {
      const updated = await firstValueFrom(this.api.updateItem(id, data));
      this.data.updateItem(id, updated);
    } catch (error) {
      console.error('Failed to update item', error);
      throw error;
    }
  }

  async deleteItem(id: string): Promise<void> {
    try {
      await firstValueFrom(this.api.deleteItem(id));
      this.data.removeItem(id);
    } catch (error) {
      console.error('Failed to delete item', error);
      throw error;
    }
  }

  selectItem(item: ExampleDTO | null): void {
    this.data.selectItem(item);
  }

  clear(): void {
    this.data.clear();
  }
}
```

### Usage dans un Composant

```typescript
// features/example/example.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { ExampleFacadeService } from '@core/services/example/example-facade.service';

@Component({
  selector: 'app-example',
  template: `
    <div class="p-4">
      <h1 class="text-2xl font-bold mb-4">Examples</h1>

      @if (facade.loading()) {
        <p>Loading...</p>
      } @else {
        <div class="grid gap-4">
          @for (item of facade.items(); track item.id) {
            <div class="card p-4">
              <h3>{{ item.name }}</h3>
              <button 
                (click)="selectItem(item)"
                class="btn btn-primary"
              >
                View
              </button>
            </div>
          }
        </div>
      }

      <p class="mt-4">Total: {{ facade.itemCount() }}</p>
    </div>
  `
})
export class ExampleComponent implements OnInit {
  protected facade = inject(ExampleFacadeService);

  ngOnInit() {
    this.facade.loadItems();
  }

  selectItem(item: ExampleDTO) {
    this.facade.selectItem(item);
  }
}
```

---

## 🎨 Composant Réutilisable - Template

### Composant Domain (Discord-specific)

```typescript
// shared/components/domain/example-badge.component.ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-example-badge',
  standalone: true,
  template: `
    <span 
      class="inline-flex items-center px-3 py-1 rounded-full text-sm"
      [class]="colorClass"
    >
      <i [class]="icon" class="mr-2"></i>
      {{ label }}
    </span>
  `
})
export class ExampleBadgeComponent {
  @Input() label!: string;
  @Input() icon = 'pi pi-check';
  @Input() color: 'primary' | 'success' | 'warning' = 'primary';

  get colorClass(): string {
    const colors = {
      primary: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-orange-100 text-orange-800'
    };
    return colors[this.color];
  }
}
```

### Composant UI (Generic)

```typescript
// shared/components/ui/stat-card.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-surface-0 p-4 rounded-lg shadow-sm">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-muted-color text-sm mb-2">{{ title }}</p>
          <h3 class="text-2xl font-bold">{{ value }}</h3>
          
          @if (trend !== undefined) {
            <div 
              class="flex items-center gap-1 mt-2"
              [class.text-green-500]="trend > 0"
              [class.text-red-500]="trend < 0"
            >
              <i [class]="trend > 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'"></i>
              <span class="text-sm">{{ trend }}%</span>
            </div>
          }
        </div>
        
        @if (icon) {
          <div class="bg-primary/10 p-3 rounded-lg">
            <i [class]="icon" class="text-primary text-2xl"></i>
          </div>
        }
      </div>
    </div>
  `
})
export class StatCardComponent {
  @Input() title!: string;
  @Input() value!: string | number;
  @Input() trend?: number;
  @Input() icon?: string;
}
```

---

## 🛣️ Routing - Template

### Route Simple (Lazy-Loaded)

```typescript
// app.routes.ts
{
  path: 'example',
  loadComponent: () => import('./features/example/example.component')
    .then(m => m.ExampleComponent),
  canActivate: [AuthGuard, GuildGuard]
}
```

### Route avec Paramètres

```typescript
{
  path: 'example/:id',
  loadComponent: () => import('./features/example/example-detail.component')
    .then(m => m.ExampleDetailComponent),
  canActivate: [AuthGuard]
}

// Dans le composant
export class ExampleDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  
  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    // Use id...
  }
}
```

### Routes Multiples (Feature Routes)

```typescript
// features/example/example.routes.ts
import { Routes } from '@angular/router';

export default [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    loadComponent: () => import('./pages/example-list/example-list.component')
      .then(m => m.ExampleListComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/example-detail/example-detail.component')
      .then(m => m.ExampleDetailComponent)
  }
] as Routes;

// Dans app.routes.ts
{
  path: 'example',
  loadChildren: () => import('./features/example/example.routes'),
  canActivate: [AuthGuard]
}
```

---

## 🎨 Styling - Guidelines

### Tailwind Classes

```typescript
// ✅ BON - Tailwind utility classes
<div class="flex items-center justify-between p-4 bg-surface-0 rounded-lg shadow-md">
  <h2 class="text-xl font-semibold text-color">Title</h2>
  <p-button label="Action" styleClass="ml-auto" />
</div>

// ❌ MAUVAIS - Custom CSS classes
<div class="custom-card">  // NE PAS FAIRE
  <h2 class="card-title">Title</h2>
</div>
```

### PrimeNG + Tailwind

```typescript
// Utiliser styleClass pour appliquer Tailwind aux composants PrimeNG
<p-button 
  label="Save"
  icon="pi pi-check"
  styleClass="w-full"
/>

<p-card styleClass="shadow-lg border-0">
  <ng-template pTemplate="content">
    <div class="p-4">Content</div>
  </ng-template>
</p-card>

<p-table 
  [value]="items"
  styleClass="p-datatable-sm"
>
  <!-- ... -->
</p-table>
```

### Classes Communes

```typescript
// Layout
"flex items-center justify-between"
"grid grid-cols-3 gap-4"
"p-4 px-6"

// Cards
"bg-surface-0 rounded-lg shadow-md"
"border border-surface-border"

// Text
"text-xl font-bold text-color"
"text-sm text-muted-color"

// Buttons (avec PrimeNG)
styleClass="w-full"
styleClass="ml-auto"

// States
"opacity-50 cursor-not-allowed"
"hover:bg-surface-100"
```

---

## 🧩 Imports - Cheat Sheet

### Alias Paths

```typescript
// Guards
import { AuthGuard } from '@core/guards/auth.guard';
import { GuildGuard } from '@core/guards/guild.guard';

// Services
import { GuildFacadeService } from '@core/services/guild/guild-facade.service';
import { MemberFacadeService } from '@core/services/member/member-facade.service';

// Components Shared
import { MemberRolesComponent } from '@shared/components/domain/member-roles.component';
import { GuildSelectorComponent } from '@shared/components/domain/guild-selector.component';

// Environment
import { environment } from '@environments/environment';
```

---

## 🔧 Commandes Utiles

### Créer un nouveau service

```bash
# Pattern complet
mkdir -p src/app/core/services/[name]
touch src/app/core/services/[name]/[name]-api.service.ts
touch src/app/core/services/[name]/[name]-data.service.ts
touch src/app/core/services/[name]/[name]-facade.service.ts
```

### Créer une feature

```bash
# Simple (1 composant)
mkdir -p src/app/features/[name]
touch src/app/features/[name]/[name].component.ts
touch src/app/features/[name]/[name].component.html
touch src/app/features/[name]/[name].component.scss

# Complexe (avec pages/)
mkdir -p src/app/features/[name]/pages/[page-name]
touch src/app/features/[name]/[name].routes.ts
```

### Créer un composant shared

```bash
# Domain
mkdir -p src/app/shared/components/domain/[name]
touch src/app/shared/components/domain/[name]/[name].component.ts

# UI
mkdir -p src/app/shared/components/ui/[name]
touch src/app/shared/components/ui/[name]/[name].component.ts
```

---

## 📦 Package.json Scripts

```bash
# Développement
npm run start              # Démarre l'app (localhost:4200)
npm run build              # Build de production
npm run lint               # Linter
npm run lint:fix           # Fix automatique

# Tests
npm run test               # Tests unitaires
npm run test:coverage      # Tests avec couverture
npm run e2e                # Tests E2E
```

---

## 🚨 Erreurs Fréquentes

### "Cannot find module '@core/...'"

**Solution** :
1. Vérifier `tsconfig.json` → `paths`
2. Redémarrer VSCode (Cmd+Shift+P → "Reload Window")
3. Vérifier que le fichier existe

### "Circular dependency detected"

**Solution** :
- Ne jamais faire de dépendances circulaires entre services
- Utiliser l'injection de dépendances correctement
- Éviter les imports croisés

### Signal not updating

**Solution** :
```typescript
// ❌ MAUVAIS - Mutation directe
this._items().push(newItem);

// ✅ BON - Immutabilité
this._items.update(items => [...items, newItem]);
```

---

## ✅ Checklist Code Review

Avant de commit :

- [ ] Pattern Facade respecté (3 fichiers si service)
- [ ] Imports utilisent les alias (@core, @shared, etc.)
- [ ] Tailwind utilisé pour styling (pas de nouveau .scss)
- [ ] Composant dans le bon dossier (domain vs ui vs feature)
- [ ] Lazy loading pour les routes
- [ ] Signals pour state management
- [ ] Typage fort partout
- [ ] Pas de console.log oubliés
- [ ] ESLint passe

---

## 📚 Ressources

- **Documentation complète** : `FRONTEND_ARCHITECTURE.md`
- **PrimeNG Docs** : https://primeng.org/
- **Tailwind Docs** : https://tailwindcss.com/docs
- **Angular Signals** : https://angular.dev/guide/signals
- **Demo UIKit** : `http://localhost:4200/uikit` (dev only)

---

**Garde ce fichier à portée de main pour référence rapide ! 🚀**