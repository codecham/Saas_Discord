# 👋 MODULE WELCOME - Frontend Implementation Guide

## 📋 Vue d'ensemble

Ce document décrit comment implémenter l'interface utilisateur pour le module Welcome, maintenant que le backend est opérationnel.

**Version** : 1.0  
**Date** : 03 Novembre 2025  
**Backend Status** : ✅ Opérationnel  
**Frontend Status** : 📅 À implémenter

---

## 🎯 Objectifs Frontend

### Fonctionnalités à Implémenter

1. **Page de configuration du module Welcome**
2. **Toggle Enable/Disable**
3. **Sélecteur de channel**
4. **Éditeur de message avec variables**
5. **Preview du message en temps réel**
6. **Support des embeds (Premium)**

---

## 📊 Architecture Frontend

### Structure des Composants

```
apps/frontend/src/app/
├── features/
│   └── modules/
│       └── welcome/
│           ├── pages/
│           │   └── welcome-config/
│           │       ├── welcome-config.component.ts
│           │       ├── welcome-config.component.html
│           │       └── welcome-config.component.scss
│           │
│           ├── components/
│           │   ├── message-editor/
│           │   │   ├── message-editor.component.ts
│           │   │   └── message-editor.component.html
│           │   │
│           │   ├── message-preview/
│           │   │   ├── message-preview.component.ts
│           │   │   └── message-preview.component.html
│           │   │
│           │   └── channel-selector/
│           │       ├── channel-selector.component.ts
│           │       └── channel-selector.component.html
│           │
│           └── services/
│               ├── welcome-facade.service.ts
│               ├── welcome-api.service.ts
│               └── welcome-data.service.ts
│
└── core/
    └── services/
        └── modules/
            ├── module-facade.service.ts
            └── module-api.service.ts
```

---

## 🔧 Étape 1 : Services

### 1.1 Module API Service (Déjà créé)

**Fichier** : `apps/frontend/src/app/core/services/modules/module-api.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ModuleApiService {
  private baseUrl = `${environment.apiUrl}/modules`;

  constructor(private http: HttpClient) {}

  enableModule(guildId: string, moduleId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${guildId}/enable`, { moduleId });
  }

  disableModule(guildId: string, moduleId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${guildId}/disable`, {
      body: { moduleId },
    });
  }

  isModuleEnabled(guildId: string, moduleId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/${guildId}/${moduleId}/status`);
  }
}
```

---

### 1.2 Welcome API Service

**Fichier** : `apps/frontend/src/app/features/modules/welcome/services/welcome-api.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface WelcomeConfig {
  id: string;
  guildId: string;
  enabled: boolean;
  channelId: string | null;
  messageType: 'text' | 'embed';
  messageContent: string;
  embedColor?: string;
  embedTitle?: string;
  embedDescription?: string;
  embedThumbnail?: string;
  embedFooter?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateWelcomeConfigDto {
  enabled?: boolean;
  channelId?: string | null;
  messageType?: 'text' | 'embed';
  messageContent?: string;
  embedColor?: string;
  embedTitle?: string;
  embedDescription?: string;
  embedThumbnail?: string;
  embedFooter?: string;
}

@Injectable({
  providedIn: 'root',
})
export class WelcomeApiService {
  private baseUrl = `${environment.apiUrl}/welcome`;

  constructor(private http: HttpClient) {}

  getConfig(guildId: string): Observable<WelcomeConfig> {
    return this.http.get<WelcomeConfig>(`${this.baseUrl}/${guildId}`);
  }

  updateConfig(guildId: string, data: UpdateWelcomeConfigDto): Observable<WelcomeConfig> {
    return this.http.post<WelcomeConfig>(`${this.baseUrl}/${guildId}`, data);
  }

  toggleEnabled(guildId: string, enabled: boolean): Observable<WelcomeConfig> {
    return this.http.put<WelcomeConfig>(
      `${this.baseUrl}/${guildId}/toggle`,
      { enabled }
    );
  }

  deleteConfig(guildId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.baseUrl}/${guildId}`
    );
  }
}
```

---

### 1.3 Welcome Facade Service

**Fichier** : `apps/frontend/src/app/features/modules/welcome/services/welcome-facade.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, tap, of } from 'rxjs';
import { WelcomeApiService, WelcomeConfig } from './welcome-api.service';
import { ModuleApiService } from '../../../core/services/modules/module-api.service';

@Injectable({
  providedIn: 'root',
})
export class WelcomeFacadeService {
  private configSubject = new BehaviorSubject<WelcomeConfig | null>(null);
  public config$ = this.configSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(
    private welcomeApi: WelcomeApiService,
    private moduleApi: ModuleApiService
  ) {}

  loadConfig(guildId: string): void {
    this.loadingSubject.next(true);
    this.welcomeApi.getConfig(guildId).pipe(
      tap(config => {
        this.configSubject.next(config);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error loading welcome config:', error);
        this.loadingSubject.next(false);
        return of(null);
      })
    ).subscribe();
  }

  updateConfig(guildId: string, data: any): Observable<WelcomeConfig> {
    this.loadingSubject.next(true);
    return this.welcomeApi.updateConfig(guildId, data).pipe(
      tap(config => {
        this.configSubject.next(config);
        this.loadingSubject.next(false);
      })
    );
  }

  toggleEnabled(guildId: string, enabled: boolean): Observable<WelcomeConfig> {
    return this.welcomeApi.toggleEnabled(guildId, enabled).pipe(
      tap(config => this.configSubject.next(config))
    );
  }

  enableModule(guildId: string): Observable<any> {
    return this.moduleApi.enableModule(guildId, 'welcome');
  }

  disableModule(guildId: string): Observable<any> {
    return this.moduleApi.disableModule(guildId, 'welcome');
  }
}
```

---

## 🎨 Étape 2 : Composants

### 2.1 Page de Configuration Principale

**Fichier** : `apps/frontend/src/app/features/modules/welcome/pages/welcome-config/welcome-config.component.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WelcomeFacadeService } from '../../services/welcome-facade.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-welcome-config',
  templateUrl: './welcome-config.component.html',
})
export class WelcomeConfigComponent implements OnInit {
  guildId!: string;
  config$ = this.welcomeFacade.config$;
  loading$ = this.welcomeFacade.loading$;

  messageContent = '';
  selectedChannelId: string | null = null;
  enabled = true;

  // Variables disponibles
  availableVariables = [
    { code: '{user}', description: 'Mention de l\'utilisateur (@John)' },
    { code: '{username}', description: 'Nom sans mention (John)' },
    { code: '{server}', description: 'Nom du serveur' },
    { code: '{memberCount}', description: 'Nombre total de membres' },
  ];

  constructor(
    private route: ActivatedRoute,
    private welcomeFacade: WelcomeFacadeService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Récupérer l'ID de la guild depuis l'URL
    this.guildId = this.route.snapshot.params['guildId'];
    
    // Charger la config
    this.welcomeFacade.loadConfig(this.guildId);

    // S'abonner aux changements de config
    this.config$.subscribe(config => {
      if (config) {
        this.messageContent = config.messageContent;
        this.selectedChannelId = config.channelId;
        this.enabled = config.enabled;
      }
    });
  }

  onSave(): void {
    this.welcomeFacade.updateConfig(this.guildId, {
      messageContent: this.messageContent,
      channelId: this.selectedChannelId,
      enabled: this.enabled,
    }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: 'Welcome message configuration saved successfully',
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'Failed to save configuration',
        });
      },
    });
  }

  onToggleEnabled(enabled: boolean): void {
    this.welcomeFacade.toggleEnabled(this.guildId, enabled).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: enabled ? 'Enabled' : 'Disabled',
          detail: `Welcome messages ${enabled ? 'enabled' : 'disabled'}`,
        });
      },
    });
  }

  insertVariable(variable: string): void {
    this.messageContent += ` ${variable}`;
  }
}
```

---

### 2.2 Template de Configuration

**Fichier** : `apps/frontend/src/app/features/modules/welcome/pages/welcome-config/welcome-config.component.html`

```html
<div class="welcome-config-container p-4">
  <!-- Header -->
  <div class="flex justify-content-between align-items-center mb-4">
    <div>
      <h2 class="text-2xl font-bold mb-2">👋 Welcome Messages</h2>
      <p class="text-gray-600">Configure welcome messages for new members</p>
    </div>
    
    <!-- Toggle Enable/Disable -->
    <p-inputSwitch 
      [(ngModel)]="enabled" 
      (onChange)="onToggleEnabled($event.checked)">
    </p-inputSwitch>
  </div>

  <ng-container *ngIf="loading$ | async">
    <p-progressSpinner></p-progressSpinner>
  </ng-container>

  <ng-container *ngIf="!(loading$ | async) && (config$ | async) as config">
    <div class="grid">
      <!-- Left Column: Configuration -->
      <div class="col-12 lg:col-6">
        <p-card header="Configuration">
          <!-- Channel Selector -->
          <div class="field mb-4">
            <label for="channel" class="font-semibold mb-2 block">
              Welcome Channel
            </label>
            <app-channel-selector
              [(ngModel)]="selectedChannelId"
              [guildId]="guildId"
              placeholder="Select a channel (or use system channel)">
            </app-channel-selector>
            <small class="text-gray-500">
              If not selected, the bot will use the server's system channel
            </small>
          </div>

          <!-- Message Editor -->
          <div class="field mb-4">
            <label for="message" class="font-semibold mb-2 block">
              Welcome Message
            </label>
            <textarea
              id="message"
              pInputTextarea
              [(ngModel)]="messageContent"
              rows="6"
              class="w-full"
              placeholder="Enter your welcome message...">
            </textarea>
          </div>

          <!-- Available Variables -->
          <div class="field mb-4">
            <label class="font-semibold mb-2 block">Available Variables</label>
            <div class="flex flex-wrap gap-2">
              <p-button
                *ngFor="let variable of availableVariables"
                [label]="variable.code"
                styleClass="p-button-sm p-button-outlined"
                [pTooltip]="variable.description"
                tooltipPosition="top"
                (onClick)="insertVariable(variable.code)">
              </p-button>
            </div>
          </div>

          <!-- Save Button -->
          <div class="flex justify-content-end gap-2">
            <p-button
              label="Cancel"
              icon="pi pi-times"
              styleClass="p-button-text">
            </p-button>
            <p-button
              label="Save Changes"
              icon="pi pi-check"
              (onClick)="onSave()">
            </p-button>
          </div>
        </p-card>
      </div>

      <!-- Right Column: Preview -->
      <div class="col-12 lg:col-6">
        <p-card header="Preview">
          <app-message-preview
            [messageContent]="messageContent"
            [guildName]="'Your Server'"
            [memberCount]="1234">
          </app-message-preview>

          <!-- Upgrade Notice (if Free plan) -->
          <div class="mt-4 p-3 bg-blue-50 border-round">
            <div class="flex align-items-center gap-2 mb-2">
              <i class="pi pi-star text-blue-500"></i>
              <span class="font-semibold">Upgrade to Premium</span>
            </div>
            <p class="text-sm mb-2">
              Unlock advanced features:
            </p>
            <ul class="text-sm pl-4">
              <li>Custom embed messages</li>
              <li>Multiple welcome messages</li>
              <li>Role-based messages</li>
              <li>Advanced variables</li>
            </ul>
            <p-button
              label="Upgrade Now"
              styleClass="p-button-sm mt-2"
              icon="pi pi-arrow-right">
            </p-button>
          </div>
        </p-card>
      </div>
    </div>
  </ng-container>
</div>
```

---

### 2.3 Message Preview Component

**Fichier** : `apps/frontend/src/app/features/modules/welcome/components/message-preview/message-preview.component.ts`

```typescript
import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-message-preview',
  template: `
    <div class="message-preview p-3 bg-gray-100 border-round">
      <div class="flex align-items-start gap-3">
        <!-- Bot Avatar -->
        <div class="flex-shrink-0">
          <img 
            src="/assets/bot-avatar.png" 
            alt="Bot" 
            class="w-3rem h-3rem border-circle"
          />
        </div>
        
        <!-- Message Content -->
        <div class="flex-grow-1">
          <div class="flex align-items-center gap-2 mb-1">
            <span class="font-semibold">Your Bot</span>
            <span class="text-xs bg-primary text-white px-2 py-1 border-round">BOT</span>
            <span class="text-xs text-gray-500">Today at 12:00 PM</span>
          </div>
          <div class="message-text" [innerHTML]="previewHtml"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .message-preview {
      font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }
    .message-text {
      color: #2e3338;
      line-height: 1.375;
    }
  `]
})
export class MessagePreviewComponent implements OnChanges {
  @Input() messageContent = '';
  @Input() guildName = 'Server Name';
  @Input() memberCount = 0;

  previewHtml = '';

  ngOnChanges(): void {
    this.updatePreview();
  }

  private updatePreview(): void {
    let preview = this.messageContent;
    
    // Remplacer les variables avec des exemples
    preview = preview.replace(/{user}/g, '<span class="text-blue-500">@NewMember</span>');
    preview = preview.replace(/{username}/g, '<strong>NewMember</strong>');
    preview = preview.replace(/{server}/g, `<strong>${this.guildName}</strong>`);
    preview = preview.replace(/{memberCount}/g, `<strong>${this.memberCount}</strong>`);
    
    this.previewHtml = preview;
  }
}
```

---

## 🚀 Étape 3 : Routing

**Fichier** : `apps/frontend/src/app/app-routing.module.ts`

```typescript
const routes: Routes = [
  // ... autres routes
  {
    path: 'guild/:guildId/modules/welcome',
    component: WelcomeConfigComponent,
    canActivate: [AuthGuard, GuildAdminGuard],
  },
];
```

---

## 📝 Checklist d'Implémentation

### Services
- [ ] Créer `welcome-api.service.ts`
- [ ] Créer `welcome-facade.service.ts`
- [ ] Tester les appels API avec Postman

### Composants
- [ ] Créer `welcome-config.component.ts` (page principale)
- [ ] Créer `message-preview.component.ts`
- [ ] Créer `channel-selector.component.ts` (optionnel, peut utiliser un dropdown simple)

### Styling
- [ ] Utiliser PrimeNG components (Card, Button, InputTextarea, etc.)
- [ ] Appliquer TailwindCSS pour le layout
- [ ] Tester la responsive (mobile/desktop)

### Testing
- [ ] Tester le chargement de la config
- [ ] Tester la sauvegarde
- [ ] Tester le toggle enable/disable
- [ ] Tester l'insertion de variables
- [ ] Tester le preview en temps réel

---

## 🎨 Design Guidelines

### Colors (PrimeNG + TailwindCSS)
- Primary: Utiliser la couleur primaire de PrimeNG
- Success: `text-green-500`, `bg-green-50`
- Warning: `text-orange-500`, `bg-orange-50`
- Error: `text-red-500`, `bg-red-50`

### Spacing
- Sections: `mb-4` (1rem)
- Cards: `p-4` (1rem padding)
- Gaps: `gap-2` ou `gap-3`

### Typography
- Titres: `text-2xl font-bold`
- Sous-titres: `text-lg font-semibold`
- Corps: `text-base`
- Petits textes: `text-sm text-gray-600`

---

**Version** : 1.0  
**Dernière mise à jour** : 03 Novembre 2025  
**Status** : 📅 Prêt pour implémentation