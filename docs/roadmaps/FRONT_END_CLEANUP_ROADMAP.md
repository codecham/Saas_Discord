# 🧹 FRONTEND ANGULAR - CHECKLIST DE NETTOYAGE ET AMÉLIORATION

> **Projet:** Discord Admin App - Frontend Angular 20  
> **Date de début:** 26 Octobre 2025  
> **Objectif:** Code propre, architecture claire, ready for production  

---

## 📊 PROGRESSION GLOBALE

```
Phase 1 - Nettoyage:        [ ] 0/15 tâches
Phase 2 - Configuration:    [ ] 0/8 tâches
Phase 3 - Structure:        [ ] 0/12 tâches
Phase 4 - Dashboard:        [ ] 0/20 tâches
Phase 5 - Layout Mobile:    [ ] 0/10 tâches
Phase 6 - Services:         [ ] 0/8 tâches

TOTAL: [ ] 0/73 tâches (0%)
```

---

## 🗂️ PHASE 1: NETTOYAGE DES FICHIERS DÉMO (1-2h)

**Objectif:** Supprimer tout ce qui est template Sakai et ne sert pas au projet

### 1.1 Services Démo à Supprimer

- [ ] Supprimer `src/app/services/customer.service.ts`
- [ ] Supprimer `src/app/services/node.service.ts`
- [ ] Vérifier qu'aucun import ne référence ces services
- [ ] Commit: `chore(cleanup): Remove demo services`

### 1.2 Components Démo à Supprimer

- [ ] Supprimer `src/app/components/documentation.component.ts`
- [ ] Supprimer `src/app/components/notfound.component.ts` (on refera une vraie 404 après)
- [ ] Commit: `chore(cleanup): Remove demo components`

### 1.3 Features UI-Kit (Démos PrimeNG) à Supprimer

- [ ] Supprimer tout le dossier `src/app/features/uikit/`
  - [ ] `chartdemo.ts`
  - [ ] `dashboarddemo.ts`
  - [ ] `miscdemo.ts`
  - [ ] `panelsdemo.ts`
  - [ ] Et tous les autres démos
- [ ] Mettre à jour `app.routes.ts` pour retirer les routes `/uikit/*`
- [ ] Commit: `chore(cleanup): Remove uikit demo features`

### 1.4 Widgets UI-Kit (Exemples Sakai) à Supprimer

- [ ] Supprimer `src/app/components/widgets/ui-kit/statswidget.component.ts`
- [ ] Supprimer `src/app/components/widgets/ui-kit/revenuestreamwidget.component.ts`
- [ ] Supprimer `src/app/components/widgets/ui-kit/recentsaleswidget.component.ts`
- [ ] Supprimer `src/app/components/widgets/ui-kit/bestsellingwidget.component.ts`
- [ ] Supprimer `src/app/components/widgets/ui-kit/notificationswidget.component.ts`
- [ ] Supprimer le dossier `src/app/components/widgets/ui-kit/` si vide
- [ ] Commit: `chore(cleanup): Remove Sakai widget examples`

### 1.5 Vérification Post-Nettoyage

- [ ] Lancer `ng build` pour vérifier qu'il n'y a pas d'erreurs
- [ ] Vérifier que l'app démarre: `ng serve`
- [ ] Naviguer vers `/dashboard` et vérifier qu'il n'y a pas d'erreur console
- [ ] Commit: `chore(cleanup): Verify build after cleanup`

---

## ⚙️ PHASE 2: CONFIGURATION (30-45min)

**Objectif:** Configurer correctement Angular pour 100% Tailwind + standards du projet

### 2.1 Angular.json - Configuration Build

- [ ] Ouvrir `angular.json`
- [ ] Trouver la section `"schematics"`
- [ ] Supprimer la ligne `"style": "scss"`
- [ ] Ajouter `"inlineStyle": true` dans les schematics component
- [ ] Vérifier que `"inlineTemplate": true` est déjà présent
- [ ] Commit: `config(angular): Remove SCSS, enforce inline styles`

**Avant:**
```json
"@schematics/angular:component": {
    "style": "scss",
    "inlineTemplate": true,
    "inlineStyle": true
}
```

**Après:**
```json
"@schematics/angular:component": {
    "inlineTemplate": true,
    "inlineStyle": true,
    "skipTests": true
}
```

### 2.2 TSConfig - Standardiser les Paths

- [ ] Ouvrir `tsconfig.json`
- [ ] Vérifier la section `"paths"`
- [ ] Standardiser les imports avec les chemins ci-dessous
- [ ] Commit: `config(ts): Standardize path aliases`

**Configuration recommandée:**
```json
"paths": {
    "@app/*": ["src/app/*"],
    "@services/*": ["src/app/services/*"],
    "@features/*": ["src/app/features/*"],
    "@shared/*": ["src/app/shared/*"],
    "@layout/*": ["src/app/layout/*"],
    "@guards/*": ["src/app/guards/*"],
    "@interceptor/*": ["src/app/interceptor/*"],
    "@environments/*": ["src/environments/*"]
}
```

### 2.3 Nettoyage SCSS (Optionnel mais Recommandé)

- [ ] Vérifier `src/assets/layout/layout.scss`
- [ ] Noter quels styles sont vraiment nécessaires pour le layout
- [ ] Plan pour migrer progressivement vers Tailwind
- [ ] Commit: `docs(scss): Document SCSS migration plan`

**Note:** On garde le SCSS du layout Sakai pour l'instant (topbar, sidebar, menu) mais tout nouveau code = Tailwind only.

---

## 🏗️ PHASE 3: STRUCTURE FEATURES (1-2h)

**Objectif:** Organiser le code en feature modules clairs et scalables

### 3.1 Créer Structure Dashboard

- [ ] Créer `src/app/features/dashboard/pages/`
- [ ] Créer `src/app/features/dashboard/components/`
- [ ] Créer `src/app/features/dashboard/dashboard.routes.ts`
- [ ] Commit: `feat(structure): Create dashboard feature structure`

### 3.2 Créer Structure Analytics

- [ ] Créer `src/app/features/analytics/`
- [ ] Créer `src/app/features/analytics/pages/`
- [ ] Créer `src/app/features/analytics/components/`
- [ ] Créer `src/app/features/analytics/analytics.routes.ts`
- [ ] Commit: `feat(structure): Create analytics feature structure`

### 3.3 Créer Structure Moderation

- [ ] Créer `src/app/features/moderation/`
- [ ] Créer `src/app/features/moderation/pages/`
- [ ] Créer `src/app/features/moderation/components/`
- [ ] Créer `src/app/features/moderation/moderation.routes.ts`
- [ ] Commit: `feat(structure): Create moderation feature structure`

### 3.4 Créer Structure Members

- [ ] Créer `src/app/features/members/pages/`
- [ ] Créer `src/app/features/members/components/`
- [ ] Créer `src/app/features/members/members.routes.ts`
- [ ] Commit: `feat(structure): Create members feature structure`

### 3.5 Créer Structure Settings

- [ ] Créer `src/app/features/settings/`
- [ ] Créer `src/app/features/settings/pages/`
- [ ] Créer `src/app/features/settings/components/`
- [ ] Créer `src/app/features/settings/settings.routes.ts`
- [ ] Commit: `feat(structure): Create settings feature structure`

### 3.6 Créer Dossier Shared

- [ ] Créer `src/app/shared/components/` (composants réutilisables)
- [ ] Créer `src/app/shared/directives/`
- [ ] Créer `src/app/shared/pipes/`
- [ ] Créer `src/app/shared/models/` (interfaces UI)
- [ ] Commit: `feat(structure): Create shared folder structure`

### 3.7 Mettre à Jour app.routes.ts

- [ ] Ouvrir `src/app/app.routes.ts`
- [ ] Ajouter lazy loading pour chaque feature
- [ ] Structurer les routes par feature
- [ ] Commit: `feat(routing): Setup lazy loading for features`

**Exemple structure routes:**
```typescript
export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { 
    path: 'dashboard', 
    loadChildren: () => import('./features/dashboard/dashboard.routes')
  },
  { 
    path: 'analytics', 
    loadChildren: () => import('./features/analytics/analytics.routes')
  },
  { 
    path: 'moderation', 
    loadChildren: () => import('./features/moderation/moderation.routes')
  },
  { 
    path: 'members', 
    loadChildren: () => import('./features/members/members.routes')
  },
  { 
    path: 'settings', 
    loadChildren: () => import('./features/settings/settings.routes')
  },
  { path: '**', redirectTo: '/dashboard' }
];
```

---

## 📊 PHASE 4: DASHBOARD FONCTIONNEL (3-4h)

**Objectif:** Créer un vrai dashboard avec données réelles du StatisticsFacadeService

### 4.1 Dashboard Overview Page

- [ ] Créer `features/dashboard/pages/dashboard-overview/dashboard-overview.component.ts`
- [ ] Template avec grid 12 colonnes
- [ ] Inject `StatisticsFacadeService`
- [ ] Inject `GuildFacadeService` pour le contexte guild
- [ ] Layout responsive mobile-first
- [ ] Commit: `feat(dashboard): Create dashboard overview page`

**Template de base:**
```typescript
@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [
    CommonModule,
    StatsCardsComponent,
    ActivityChartComponent,
    LeaderboardWidgetComponent,
    QuickActionsComponent
  ],
  template: `
    <div class="grid grid-cols-12 gap-4 p-4">
      <!-- Stats Cards -->
      <div class="col-span-12">
        <app-stats-cards />
      </div>
      
      <!-- Activity Chart + Quick Actions -->
      <div class="col-span-12 lg:col-span-8">
        <app-activity-chart />
      </div>
      <div class="col-span-12 lg:col-span-4">
        <app-quick-actions />
      </div>
      
      <!-- Leaderboard -->
      <div class="col-span-12">
        <app-leaderboard-widget />
      </div>
    </div>
  `
})
export class DashboardOverviewComponent {}
```

### 4.2 Stats Cards Component

- [ ] Créer `features/dashboard/components/stats-cards/stats-cards.component.ts`
- [ ] 4 cards: Total Members, Active Members, Messages Today, Voice Today
- [ ] Utiliser `guildStats` signal du `StatisticsFacadeService`
- [ ] Skeleton loader PrimeNG pendant chargement
- [ ] Icons + couleurs différentes par card
- [ ] Format nombres avec pipes (ex: 1,234)
- [ ] Afficher trend (+5% vs hier)
- [ ] Commit: `feat(dashboard): Create stats cards component`

**Spécifications cards:**

**Card 1 - Total Members:**
- Icône: `pi pi-users`
- Couleur: blue
- Valeur: `guildStats().totalMembers`
- Trend: `guildStats().memberGrowth` (ex: +12 cette semaine)

**Card 2 - Active Members (7j):**
- Icône: `pi pi-chart-line`
- Couleur: green
- Valeur: `guildStats().activeMembers7d`
- Sous-texte: "Active last 7 days"

**Card 3 - Messages Today:**
- Icône: `pi pi-comments`
- Couleur: purple
- Valeur: `guildStats().messagesToday`
- Trend: comparaison avec moyenne

**Card 4 - Voice Today:**
- Icône: `pi pi-microphone`
- Couleur: orange
- Valeur: `guildStats().voiceMinutesToday` (formaté en heures si > 60min)
- Sous-texte: "Minutes in voice"

### 4.3 Activity Chart Component

- [ ] Créer `features/dashboard/components/activity-chart/activity-chart.component.ts`
- [ ] Utiliser PrimeNG Chart (type: line)
- [ ] Données: messages par jour (7 derniers jours)
- [ ] Source: `guildStats().messageHistory` ou appel spécifique
- [ ] Sélecteur période: 7j / 30j / 90j
- [ ] Responsive: adapt height mobile
- [ ] Commit: `feat(dashboard): Create activity line chart`

**PrimeNG Chart config:**
```typescript
chartData = computed(() => {
  const stats = this.statsFacade.guildStats();
  if (!stats) return null;
  
  return {
    labels: stats.last7Days.map(d => d.date),
    datasets: [{
      label: 'Messages',
      data: stats.last7Days.map(d => d.messageCount),
      borderColor: '#6366f1',
      tension: 0.4,
      fill: true,
      backgroundColor: 'rgba(99, 102, 241, 0.1)'
    }]
  };
});

chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true }
  },
  scales: {
    y: { beginAtZero: true }
  }
};
```

### 4.4 Leaderboard Widget Component

- [ ] Créer `features/dashboard/components/leaderboard-widget/leaderboard-widget.component.ts`
- [ ] PrimeNG Table avec top 10 membres
- [ ] Colonnes: Rank, Avatar, Username, Messages, Voice, Reactions
- [ ] Source: `statsFacade.rankings()` ou `statsFacade.topThree()` + `remainingRankings()`
- [ ] Badges visuels pour top 3 (🥇🥈🥉)
- [ ] Click sur membre → navigate vers profil membre
- [ ] Commit: `feat(dashboard): Create leaderboard widget`

**Template PrimeNG:**
```typescript
template: `
  <p-card header="Top Members" class="h-full">
    <p-table 
      [value]="rankings()" 
      [loading]="isLoading()"
      styleClass="p-datatable-sm"
    >
      <ng-template #header>
        <tr>
          <th>Rank</th>
          <th>Member</th>
          <th>Messages</th>
          <th>Voice</th>
          <th>Reactions</th>
        </tr>
      </ng-template>
      <ng-template #body let-member let-i="rowIndex">
        <tr (click)="viewMember(member)" class="cursor-pointer hover:bg-surface-100">
          <td>
            @if (i < 3) {
              <span class="text-2xl">{{ getMedalEmoji(i) }}</span>
            } @else {
              <span class="font-semibold">#{{ i + 1 }}</span>
            }
          </td>
          <td>
            <div class="flex items-center gap-3">
              <p-avatar [image]="member.avatarUrl" shape="circle" />
              <span class="font-medium">{{ member.username }}</span>
            </div>
          </td>
          <td>{{ member.messageCount | number }}</td>
          <td>{{ member.voiceMinutes | number }}m</td>
          <td>{{ member.reactionCount | number }}</td>
        </tr>
      </ng-template>
    </p-table>
  </p-card>
`
```

### 4.5 Quick Actions Component

- [ ] Créer `features/dashboard/components/quick-actions/quick-actions.component.ts`
- [ ] Card avec 4-6 boutons d'actions rapides
- [ ] Actions: View Members, Moderation, Settings, Analytics, etc.
- [ ] Icons + labels
- [ ] Navigate vers les features correspondantes
- [ ] Commit: `feat(dashboard): Create quick actions component`

**Actions suggérées:**
- 👥 View All Members → `/members`
- 🛡️ Moderation → `/moderation`
- 📊 Full Analytics → `/analytics`
- ⚙️ Server Settings → `/settings`
- 📢 Channels → `/channels`
- 🎭 Roles → `/roles`

### 4.6 Intégration Dashboard Routes

- [ ] Créer `features/dashboard/dashboard.routes.ts`
- [ ] Route par défaut → `dashboard-overview`
- [ ] Commit: `feat(dashboard): Setup dashboard routing`

```typescript
import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => 
      import('./pages/dashboard-overview/dashboard-overview.component')
        .then(m => m.DashboardOverviewComponent)
  }
] as Routes;
```

### 4.7 Mise à Jour Menu Navigation

- [ ] Ouvrir `src/app/layout/components/menu.component.ts`
- [ ] Vérifier que Dashboard pointe vers `/dashboard`
- [ ] S'assurer que l'icône et le label sont corrects
- [ ] Commit: `feat(menu): Update dashboard navigation`

### 4.8 Error States & Loading

- [ ] Ajouter `<p-skeleton>` dans stats-cards pendant loading
- [ ] Ajouter message d'erreur si `statsFacade.error()`
- [ ] Ajouter bouton "Retry" en cas d'erreur
- [ ] Toast notification si erreur réseau
- [ ] Commit: `feat(dashboard): Add error states and loading skeletons`

### 4.9 Tests Manuels Dashboard

- [ ] Naviguer vers `/dashboard`
- [ ] Vérifier que les 4 stats cards s'affichent
- [ ] Vérifier que le chart affiche des données
- [ ] Vérifier que le leaderboard affiche top 10
- [ ] Tester responsive mobile (< 768px)
- [ ] Vérifier qu'il n'y a pas d'erreurs console
- [ ] Commit: `test(dashboard): Manual testing completed`

### 4.10 Documentation Dashboard

- [ ] Créer `features/dashboard/README.md`
- [ ] Documenter les composants créés
- [ ] Expliquer le flow de données (StatisticsFacade → Components)
- [ ] Screenshots ou GIFs du dashboard
- [ ] Commit: `docs(dashboard): Add dashboard documentation`

---

## 📱 PHASE 5: LAYOUT MOBILE-RESPONSIVE (2h)

**Objectif:** S'assurer que toute l'application est utilisable sur mobile

### 5.1 Topbar Mobile

- [ ] Ouvrir `src/app/layout/topbar.component.ts`
- [ ] Vérifier le bouton hamburger fonctionne
- [ ] Tester que le menu se collapse correctement
- [ ] Ajuster taille logo sur petit écran
- [ ] Avatar user cliquable et visible
- [ ] Commit: `feat(layout): Improve topbar mobile responsiveness`

### 5.2 Sidebar Mobile

- [ ] Vérifier comportement sidebar sur mobile
- [ ] Doit se cacher par défaut sur < 1024px
- [ ] Doit s'ouvrir en overlay avec hamburger
- [ ] Fermeture auto après navigation
- [ ] Commit: `feat(layout): Improve sidebar mobile behavior`

### 5.3 Dashboard Mobile

- [ ] Stats cards: stack vertical sur mobile (col-span-12)
- [ ] Chart: reduce height sur mobile
- [ ] Leaderboard: table responsive ou cards sur mobile
- [ ] Quick actions: grid 2 colonnes sur mobile
- [ ] Commit: `feat(dashboard): Make dashboard mobile responsive`

**Exemple responsive:**
```html
<!-- Desktop: 4 cards en ligne -->
<!-- Mobile: 1 card par ligne -->
<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
  <app-stat-card />
  <app-stat-card />
  <app-stat-card />
  <app-stat-card />
</div>
```

### 5.4 Touch-Friendly Elements

- [ ] Boutons min 44px height (accessibilité)
- [ ] Spacing suffisant entre éléments cliquables
- [ ] Hover states → active states sur mobile
- [ ] Commit: `feat(mobile): Ensure touch-friendly UI elements`

### 5.5 Tests Mobile

- [ ] Tester sur Chrome DevTools (iPhone, Android)
- [ ] Tester rotation portrait/landscape
- [ ] Vérifier scroll fluide
- [ ] Vérifier que rien ne dépasse (overflow-x)
- [ ] Commit: `test(mobile): Complete mobile testing`

---

## 🔧 PHASE 6: SERVICES MANQUANTS (2h)

**Objectif:** Créer les services utilitaires essentiels

### 6.1 Notification Service

- [ ] Créer `src/app/services/notification.service.ts`
- [ ] Wrapper autour de PrimeNG MessageService
- [ ] Méthodes: `success()`, `error()`, `warning()`, `info()`
- [ ] Configuration toast (position, life, etc.)
- [ ] Commit: `feat(services): Create notification service`

**Exemple:**
```typescript
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private messageService = inject(MessageService);

  success(message: string, title = 'Success') {
    this.messageService.add({
      severity: 'success',
      summary: title,
      detail: message,
      life: 3000
    });
  }

  error(message: string, title = 'Error') {
    this.messageService.add({
      severity: 'error',
      summary: title,
      detail: message,
      life: 5000
    });
  }
}
```

### 6.2 Loading Service

- [ ] Créer `src/app/services/loading.service.ts`
- [ ] Signal global `isLoading`
- [ ] Méthodes: `show()`, `hide()`
- [ ] Auto-hide après timeout (sécurité)
- [ ] Commit: `feat(services): Create global loading service`

**Exemple:**
```typescript
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private loadingSignal = signal(false);
  readonly isLoading = this.loadingSignal.asReadonly();

  show() {
    this.loadingSignal.set(true);
  }

  hide() {
    this.loadingSignal.set(false);
  }

  async wrap<T>(promise: Promise<T>): Promise<T> {
    this.show();
    try {
      return await promise;
    } finally {
      this.hide();
    }
  }
}
```

### 6.3 WebSocket Service (Préparation)

- [ ] Créer `src/app/services/websocket.service.ts`
- [ ] Structure de base (pas d'implémentation complète maintenant)
- [ ] Méthodes: `connect()`, `disconnect()`, `emit()`, `on()`
- [ ] Sera implémenté quand le backend Gateway sera prêt
- [ ] Commit: `feat(services): Create websocket service structure`

### 6.4 Theme Service Extension

- [ ] Vérifier `LayoutService` actuel
- [ ] Ajouter persistance thème (localStorage)
- [ ] Ajouter toggle dark/light programmatique
- [ ] Commit: `feat(services): Extend theme service with persistence`

### 6.5 Intégration Notification dans Error Handler

- [ ] Ouvrir `src/app/services/error-handler.service.ts`
- [ ] Inject `NotificationService`
- [ ] Afficher toast error automatiquement
- [ ] Commit: `feat(error-handler): Integrate notification service`

---

## ✅ PHASE FINALE: VÉRIFICATION & DOCUMENTATION (1h)

### Checklist Finale

- [ ] `ng build --configuration production` → pas d'erreurs
- [ ] `ng lint` → pas d'erreurs critiques
- [ ] Tester toutes les routes principales
- [ ] Vérifier console browser → pas d'erreurs
- [ ] Vérifier network tab → pas de 404
- [ ] Tester sur 3 tailles écran (mobile, tablet, desktop)
- [ ] Commit: `chore: Final verification before production`

### Documentation

- [ ] Mettre à jour `README.md` principal
- [ ] Créer `docs/FRONTEND_ARCHITECTURE.md`
- [ ] Documenter les conventions (Tailwind, Signals, Pattern Facade)
- [ ] Ajouter screenshots du dashboard
- [ ] Commit: `docs: Complete frontend documentation`

---

## 📝 NOTES & DÉCISIONS

**Espace pour notes personnelles pendant le développement:**

```
Date: __________
Décision: __________________________________________
Raison: ___________________________________________

Date: __________
Problème rencontré: ________________________________
Solution: __________________________________________

Date: __________
Optimisation: _____________________________________
```

---

## 🎯 PRIORITÉS SI MANQUE DE TEMPS

**Must Have (Critique):**
- [x] Phase 1 - Nettoyage complet
- [x] Phase 4 - Dashboard fonctionnel
- [x] Phase 2.1 - Config Angular.json

**Should Have (Important):**
- [ ] Phase 3 - Structure features
- [ ] Phase 5 - Mobile responsive
- [ ] Phase 6.1 - Notification service

**Nice to Have (Bonus):**
- [ ] Phase 6.3 - WebSocket prep
- [ ] Documentation complète
- [ ] Tests E2E

---

## 🚀 COMMANDES UTILES

```bash
# Démarrer le dev server
ng serve

# Build production
ng build --configuration production

# Lint
ng lint

# Générer un component
ng generate component features/dashboard/components/my-component --standalone

# Vérifier taille bundle
ng build --stats-json
npx webpack-bundle-analyzer dist/sakai-ng/stats.json
```

---

**✨ Bon courage! N'oublie pas de commit régulièrement! ✨**