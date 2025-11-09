# 🏗️ Architecture Frontend - Discord Admin App

**Version** : 1.0  
**Date** : 09 Novembre 2025  
**Framework** : Angular 20 + PrimeNG + TailwindCSS

---

## 📋 Vue d'Ensemble

Le frontend suit une architecture en **4 couches** claire et maintenable :

```
src/app/
├── core/           # Infrastructure singleton (guards, services, layout)
├── shared/         # Composants et utilitaires réutilisables
├── features/       # Pages et fonctionnalités métier
└── demo/           # Code de démonstration (Sakai UIKit)
```

**Principe fondamental** : Séparation claire des responsabilités

---

## 🎯 Architecture Détaillée

### 1. 🔒 Core/ - Infrastructure Singleton

**Rôle** : Services, guards, interceptors et layout utilisés **partout** dans l'application.

```
core/
├── guards/                     # Protection des routes
├── interceptors/               # Intercepteurs HTTP
├── layout/                     # Layout principal (Sakai)
└── services/                   # Services métier (Pattern Facade)
```

#### Guards (`core/guards/`)

**Quoi** : Protection et contrôle d'accès aux routes.

```typescript
// Fichiers
auth.guard.ts       // Vérifie que l'utilisateur est connecté
guest.guard.ts      // Redirige si déjà connecté (pour /login)
guild.guard.ts      // Vérifie qu'une guild est sélectionnée
role.guard.ts       // Vérifie les permissions d'un rôle
```

**Utilisation** :
```typescript
// Dans app.routes.ts
{
  path: 'dashboard',
  component: DashboardComponent,
  canActivate: [AuthGuard, GuildGuard]
}
```

---

#### Interceptors (`core/interceptors/`)

**Quoi** : Intercepteurs HTTP appliqués globalement.

```typescript
// Fichiers
auth.interceptor.ts  // Injecte automatiquement le JWT dans les headers
```

**Fonctionnement** :
- Intercepte toutes les requêtes HTTP sortantes
- Ajoute `Authorization: Bearer <token>`
- Gère le refresh token si nécessaire

---

#### Layout (`core/layout/`)

**Quoi** : Composants du layout principal (hérité du template Sakai).

```
layout/
├── layout.component.ts     # Container principal
├── topbar.component.ts     # Barre supérieure (user, notifs)
├── sidebar.component.ts    # Menu latéral
├── footer.component.ts     # Pied de page
└── services/
    └── layout.service.ts   # Gestion état layout (dark mode, menu, etc.)
```

**Caractéristiques** :
- ✅ Responsive (mobile + desktop)
- ✅ Dark/Light mode
- ✅ Menu configurable
- ✅ Basé sur le template Sakai

---

#### Services (`core/services/`)

**Quoi** : Services métier suivant le **Pattern Facade en 3 couches**.

```
services/
├── auth/                   # Authentification
├── guild/                  # Gestion des guilds Discord
├── member/                 # Gestion des membres
├── channel/                # Gestion des channels
├── role/                   # Gestion des rôles
├── user/                   # Gestion utilisateur
├── onboarding/             # Onboarding initial
├── error-handling/         # Gestion des erreurs
├── sanitization/           # Sanitization des données
└── endpoints-tester/       # Tests endpoints (dev)
```

##### Pattern Facade (3 Couches)

**Principe** : Chaque domaine métier (guild, member, etc.) a 3 services :

```typescript
// Exemple : core/services/guild/

// 1. API Service - Appels HTTP uniquement
guild-api.service.ts
export class GuildApiService {
  getGuilds(): Observable<GuildDTO[]> {
    return this.http.get<GuildDTO[]>(`${this.apiUrl}/guilds`);
  }
}

// 2. Data Service - État réactif avec Signals
guild-data.service.ts
export class GuildDataService {
  private _guilds = signal<GuildDTO[]>([]);
  readonly guilds = this._guilds.asReadonly();
  
  setGuilds(guilds: GuildDTO[]): void {
    this._guilds.set(guilds);
  }
}

// 3. Facade Service - Orchestration
guild-facade.service.ts
export class GuildFacadeService {
  constructor(
    private api: GuildApiService,
    private data: GuildDataService
  ) {}
  
  async loadGuilds(): Promise<void> {
    const guilds = await firstValueFrom(this.api.getGuilds());
    this.data.setGuilds(guilds);
  }
  
  // Les composants injectent uniquement la Facade
  get guilds() {
    return this.data.guilds;
  }
}
```

**Avantages** :
- ✅ Séparation des responsabilités (HTTP / State / Logic)
- ✅ Testabilité maximale
- ✅ Réutilisabilité
- ✅ Clean Code

**Usage dans un composant** :
```typescript
export class GuildListComponent {
  private guildFacade = inject(GuildFacadeService);
  
  guilds = this.guildFacade.guilds; // Signal readonly
  
  ngOnInit() {
    this.guildFacade.loadGuilds();
  }
}
```

---

### 2. 🔄 Shared/ - Composants Réutilisables

**Rôle** : Code réutilisable dans **plusieurs features**.

```
shared/
├── components/             # Composants réutilisables
│   ├── domain/            # Composants métier (Discord-specific)
│   ├── ui/                # Composants UI génériques
│   └── widgets/           # Widgets complexes
├── config/                # Configurations partagées
└── interfaces/            # Types et interfaces partagés
```

#### Components Domain (`shared/components/domain/`)

**Quoi** : Composants **spécifiques à Discord** mais **réutilisables** dans plusieurs features.

```typescript
// Fichiers
guild-selector.component.ts        // Dropdown de sélection de guild
member-roles.component.ts          // Affichage des rôles d'un membre
member-action-modals.component.ts  // Modals d'actions (kick, ban, etc.)
menu.component.ts                  // Menu de navigation
menuitem.component.ts              // Item de menu
setup-onboarding-modal.component.ts // Modal setup initial
```

**Caractéristiques** :
- Connaissance du domaine Discord (Guild, Member, Role)
- Réutilisables dans plusieurs pages
- Input/Output pour la communication
- Pas de logique métier lourde

**Exemple** :
```typescript
// shared/components/domain/member-roles.component.ts
@Component({
  selector: 'app-member-roles',
  template: `
    <div class="flex gap-2">
      @for (role of roles; track role.id) {
        <span 
          class="badge"
          [style.background-color]="role.color"
        >
          {{ role.name }}
        </span>
      }
    </div>
  `
})
export class MemberRolesComponent {
  @Input() roles: Role[] = [];
}

// Usage dans features/members/members.component.ts
<app-member-roles [roles]="member.roles" />
```

---

#### Components UI (`shared/components/ui/`)

**Quoi** : Composants **génériques** réutilisables (non spécifiques à Discord).

**Actuellement vide** - À remplir quand tu crées des composants génériques.

**Exemples futurs** :
```
ui/
├── data-table/          # Table générique configurable
├── stat-card/           # Carte de statistique
├── filter-bar/          # Barre de filtres
├── empty-state/         # État vide
└── loading-state/       # État de chargement
```

**Différence domain vs ui** :

| Domain | UI |
|--------|-----|
| `<app-member-roles [roles]="roles" />` | `<app-data-table [data]="items" [columns]="cols" />` |
| Connaît Discord (Member, Guild) | Générique (fonctionne avec n'importe quelle data) |
| Réutilisable dans app Discord | Réutilisable dans n'importe quelle app |

---

#### Widgets (`shared/components/widgets/`)

**Quoi** : Composants **complexes et réutilisables** (entre domain et ui).

```typescript
// Fichiers
guild-stats-widget.component.ts  // Widget statistiques d'une guild
```

**Caractéristiques** :
- Plus complexes qu'un simple composant
- Souvent composés de plusieurs sous-composants
- Logique métier légère intégrée

---

#### Config (`shared/config/`)

**Quoi** : Configurations partagées dans toute l'app.

```typescript
// Fichiers
test-endpoints.config.ts  // Configuration endpoints de test
```

---

#### Interfaces (`shared/interfaces/`)

**Quoi** : Types et interfaces partagés (frontend uniquement).

```typescript
// Fichiers
endpoint-tester.interface.ts  // Types pour le testeur d'endpoints
```

**Note** : Les types Discord (Guild, Member, etc.) viennent du package `@my-project/shared-types`.

---

### 3. 📦 Features/ - Pages Métier

**Rôle** : Pages et fonctionnalités de l'application (lazy-loaded).

```
features/
├── auth/                   # Authentification
├── dashboard/              # Dashboard principal
├── server-list/            # Liste des guilds
├── server-info/            # Détails d'une guild
├── members/                # Gestion des membres
├── member-stats/           # Statistiques d'un membre
├── channels/               # Gestion des channels
├── roles/                  # Gestion des rôles
├── profile/                # Profil utilisateur
└── endpoints-tester/       # Testeur d'endpoints (dev)
```

#### Structure type d'une feature

**Approche actuelle** (1 composant par feature) :
```
features/members/
├── members.component.ts
├── members.component.html
└── members.component.scss
```

**Approche future** (quand plusieurs pages) :
```
features/members/
├── pages/
│   ├── member-list/
│   └── member-stats/
├── components/              # Composants locaux (non réutilisables)
└── members.routes.ts        # Routes lazy-loaded
```

---

#### Caractéristiques des features

**Smart Components** :
- Injectent les services (Facades)
- Gèrent la logique métier
- Orchestrent les composants
- Gèrent le routing

**Lazy Loading** :
```typescript
// app.routes.ts
{
  path: 'members',
  loadComponent: () => import('./features/members/members.component')
    .then(m => m.MembersComponent),
  canActivate: [AuthGuard, GuildGuard]
}
```

**Avantages** :
- ✅ Bundle size optimisé
- ✅ Chargement à la demande
- ✅ Performance améliorée

---

### 4. 🎨 Demo/ - Code de Démonstration

**Rôle** : Code hérité du template Sakai pour référence et tests.

```
demo/
├── components/             # Composants de démo
├── services/               # Services de démo (data mockée)
└── uikit/                  # Pages de démonstration UIKit
```

**Caractéristiques** :
- ✅ Isolé du vrai code
- ✅ Accessible en développement
- ✅ Peut être exclu du build de production
- ✅ Sert de référence pour PrimeNG

**Usage** :
```typescript
// app.routes.ts - Accessible uniquement en dev
...(isDevMode() ? [
  {
    path: 'uikit',
    loadChildren: () => import('./demo/uikit/uikit.routes')
  }
] : [])
```

---

## 🎯 Decision Tree - Où Mettre Mon Code ?

### Pour un nouveau composant :

```
❓ C'est un Guard/Interceptor ?
   └─ OUI → core/guards/ ou core/interceptors/

❓ C'est un service ?
   └─ OUI → core/services/[domain]/
              (Créer 3 fichiers : api, data, facade)

❓ C'est le layout principal ?
   └─ OUI → core/layout/

❓ C'est un composant réutilisable ?
   ├─ OUI → ❓ Spécifique Discord (Guild, Member, Role) ?
   │         ├─ OUI → shared/components/domain/
   │         └─ NON → shared/components/ui/
   │
   └─ NON → ❓ C'est un widget complexe ?
             ├─ OUI → shared/components/widgets/
             └─ NON → features/[feature]/

❓ C'est une page/route ?
   └─ OUI → features/[feature]/

❓ C'est une config partagée ?
   └─ OUI → shared/config/

❓ C'est un type/interface ?
   └─ OUI → shared/interfaces/
             (ou @my-project/shared-types si partagé backend)

❓ C'est du code de démo ?
   └─ OUI → demo/
```

---

## 📝 Conventions de Nommage

### Fichiers

| Type | Convention | Exemple |
|------|-----------|---------|
| Component | `[name].component.ts` | `members.component.ts` |
| Service | `[name].service.ts` | `guild-facade.service.ts` |
| Guard | `[name].guard.ts` | `auth.guard.ts` |
| Interceptor | `[name].interceptor.ts` | `auth.interceptor.ts` |
| Interface | `[name].interface.ts` | `endpoint-tester.interface.ts` |
| Config | `[name].config.ts` | `test-endpoints.config.ts` |

### Dossiers

| Type | Convention | Exemple |
|------|-----------|---------|
| Feature | `kebab-case` | `member-stats/` |
| Service domain | `singular` | `guild/` (pas `guilds/`) |
| Component | `kebab-case` | `member-roles/` |

### Classes

| Type | Convention | Exemple |
|------|-----------|---------|
| Component | `PascalCase` + `Component` | `MembersComponent` |
| Service | `PascalCase` + `Service` | `GuildFacadeService` |
| Guard | `PascalCase` + `Guard` | `AuthGuard` |

---

## 🔄 Pattern Facade - Guide Complet

### Quand créer un nouveau service métier ?

Dès que tu as besoin d'accéder à une nouvelle ressource backend (API REST).

### Comment créer un service avec Pattern Facade ?

**Exemple** : Créer le service `notification/`

#### 1. Créer la structure

```bash
mkdir -p src/app/core/services/notification
cd src/app/core/services/notification
```

#### 2. Créer les 3 fichiers

**notification-api.service.ts** (HTTP uniquement)
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface NotificationDTO {
  id: string;
  message: string;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationApiService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getNotifications(): Observable<NotificationDTO[]> {
    return this.http.get<NotificationDTO[]>(this.apiUrl);
  }

  markAsRead(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/read`, {});
  }
}
```

**notification-data.service.ts** (State avec Signals)
```typescript
import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationDataService {
  // State privé
  private _notifications = signal<NotificationDTO[]>([]);
  
  // State public readonly
  readonly notifications = this._notifications.asReadonly();
  
  // Computed values
  readonly unreadCount = computed(() => 
    this._notifications().filter(n => !n.read).length
  );
  
  // Mutations
  setNotifications(notifications: NotificationDTO[]): void {
    this._notifications.set(notifications);
  }
  
  markAsRead(id: string): void {
    this._notifications.update(notifications =>
      notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      )
    );
  }
}
```

**notification-facade.service.ts** (Orchestration)
```typescript
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationFacadeService {
  constructor(
    private api: NotificationApiService,
    private data: NotificationDataService
  ) {}
  
  // Expose readonly state
  get notifications() {
    return this.data.notifications;
  }
  
  get unreadCount() {
    return this.data.unreadCount;
  }
  
  // Actions
  async loadNotifications(): Promise<void> {
    try {
      const notifications = await firstValueFrom(
        this.api.getNotifications()
      );
      this.data.setNotifications(notifications);
    } catch (error) {
      console.error('Failed to load notifications', error);
    }
  }
  
  async markAsRead(id: string): Promise<void> {
    try {
      await firstValueFrom(this.api.markAsRead(id));
      this.data.markAsRead(id);
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  }
}
```

#### 3. Utiliser dans un composant

```typescript
import { Component, inject, OnInit } from '@angular/core';
import { NotificationFacadeService } from '@app/core/services/notification/notification-facade.service';

@Component({
  selector: 'app-notifications',
  template: `
    <div class="notifications">
      <h3>Notifications ({{ facade.unreadCount() }})</h3>
      
      @for (notif of facade.notifications(); track notif.id) {
        <div class="notification" [class.unread]="!notif.read">
          {{ notif.message }}
          @if (!notif.read) {
            <button (click)="markAsRead(notif.id)">
              Mark as read
            </button>
          }
        </div>
      }
    </div>
  `
})
export class NotificationsComponent implements OnInit {
  protected facade = inject(NotificationFacadeService);
  
  ngOnInit() {
    this.facade.loadNotifications();
  }
  
  markAsRead(id: string) {
    this.facade.markAsRead(id);
  }
}
```

---

## 🎨 Styling - SCSS vs Tailwind

### Approche Hybride

**SCSS** : Uniquement pour le layout core (hérité de Sakai)
- `src/assets/layout/*.scss`
- Variables de thème
- Structure du layout

**Tailwind** : Pour tout le nouveau code
- Tous les composants custom
- Toutes les pages
- Classes utilitaires

### Règle d'Or

```
❌ NE JAMAIS créer de nouveaux fichiers .scss
✅ TOUJOURS utiliser Tailwind pour nouveau code
```

### Exemple

```typescript
// ✅ BON - Tailwind
@Component({
  template: `
    <div class="flex items-center gap-4 p-4 bg-surface-0 rounded-lg shadow-md">
      <h2 class="text-xl font-bold">Title</h2>
      <p-button label="Action" styleClass="ml-auto" />
    </div>
  `
})

// ❌ MAUVAIS - Nouveau SCSS
@Component({
  template: `
    <div class="custom-card">  <!-- NE PAS FAIRE -->
      <h2>Title</h2>
    </div>
  `,
  styleUrls: ['./component.scss']  // NE PAS CRÉER
})
```

---

## 🚀 Lazy Loading Strategy

### Routes Principales

```typescript
// app.routes.ts
export const routes: Route[] = [
  // Layout avec routes protégées
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'members',
        loadComponent: () => import('./features/members/members.component')
          .then(m => m.MembersComponent),
        canActivate: [GuildGuard]
      },
      // ... autres routes
    ]
  },
  
  // Auth (hors layout)
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component')
          .then(m => m.LoginComponent),
        canActivate: [GuestGuard]
      },
      {
        path: 'callback',
        loadComponent: () => import('./features/auth/auth-callback/auth-callback.component')
          .then(m => m.AuthCallbackComponent)
      }
    ]
  },
  
  // Demo (dev only)
  ...(isDevMode() ? [
    {
      path: 'uikit',
      loadChildren: () => import('./demo/uikit/uikit.routes')
    }
  ] : [])
];
```

**Avantages** :
- ✅ Chaque feature est chargée à la demande
- ✅ Bundle initial minimal
- ✅ Performance optimale

---

## 📚 Imports et Aliases

### Configuration TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@app/*": ["src/app/*"],
      "@core/*": ["src/app/core/*"],
      "@shared/*": ["src/app/shared/*"],
      "@features/*": ["src/app/features/*"],
      "@environments/*": ["src/environments/*"]
    }
  }
}
```

### Exemples d'Imports

```typescript
// ✅ BON - Avec alias
import { AuthGuard } from '@core/guards/auth.guard';
import { GuildFacadeService } from '@core/services/guild/guild-facade.service';
import { MemberRolesComponent } from '@shared/components/domain/member-roles.component';

// ❌ ÉVITER - Chemins relatifs longs
import { AuthGuard } from '../../../core/guards/auth.guard';
```

---

## 🧪 Testing Strategy

### Services

**Tester** :
- ✅ Facade Services (orchestration)
- ✅ Data Services (state management)
- ❌ API Services (mocked dans les tests)

### Composants

**Tester** :
- ✅ Smart components (logique métier)
- ✅ Composants shared/domain (réutilisables)
- ❌ Composants simples (présentation uniquement)

---

## 📊 Métriques

### Structure Actuelle

```
Total fichiers TypeScript : ~119 fichiers
├── core/          ~30 fichiers (25%)
├── shared/        ~15 fichiers (13%)
├── features/      ~15 fichiers (13%)
└── demo/          ~59 fichiers (49%)
```

### Code Utile vs Demo

- **Code métier** : ~60 fichiers (51%)
- **Code démo** : ~59 fichiers (49%)

**Note** : Le code démo est bien isolé et peut être facilement exclu du build.

---

## 🔄 Migration Future (Si Nécessaire)

### Quand Réorganiser Features ?

**Indicateur** : Quand une feature a 2+ pages.

**Avant** :
```
features/members/
├── members.component.ts
├── members.component.html
└── members.component.scss
```

**Après** :
```
features/members/
├── pages/
│   ├── member-list/
│   │   ├── member-list.component.ts
│   │   ├── member-list.component.html
│   │   └── member-list.component.scss
│   └── member-stats/
│       └── ...
├── components/        # Composants locaux (si besoin)
└── members.routes.ts
```

---

## ✅ Checklist Nouveau Développeur

Pour onboarder un nouveau dev sur le projet :

- [ ] Lire cette documentation
- [ ] Explorer la structure dans VSCode
- [ ] Comprendre le Pattern Facade
- [ ] Regarder un exemple complet (ex: `guild/`)
- [ ] Créer un petit composant dans `shared/components/ui/`
- [ ] Créer une feature simple avec Pattern Facade

---

## 📞 Questions Fréquentes

### Q: Où créer un nouveau service pour une API ?
**R**: `core/services/[domain]/` avec 3 fichiers (api, data, facade)

### Q: Différence entre shared/components/domain et ui ?
**R**: `domain` = spécifique Discord (Guild, Member), `ui` = générique (DataTable, Card)

### Q: Quand utiliser demo/ ?
**R**: Uniquement pour référence. Ne pas y mettre de vrai code.

### Q: SCSS ou Tailwind ?
**R**: Tailwind pour tout nouveau code. SCSS uniquement pour layout existant.

### Q: Lazy loading obligatoire ?
**R**: Oui pour toutes les features. Performance critique.

---

## 🎯 Résumé - Règles d'Or

1. ✅ **Core/** = Infrastructure utilisée partout (singleton)
2. ✅ **Shared/** = Réutilisable dans plusieurs features
3. ✅ **Features/** = Pages métier (lazy-loaded)
4. ✅ **Demo/** = Isolation totale du code de démo
5. ✅ **Pattern Facade** = 3 services (api, data, facade)
6. ✅ **Tailwind** = Pour tout nouveau code
7. ✅ **Signals** = Pour state management
8. ✅ **Lazy Loading** = Pour toutes les features

---

**Cette architecture est évolutive, maintenable et scalable. Elle peut grandir naturellement avec le projet ! 🚀**