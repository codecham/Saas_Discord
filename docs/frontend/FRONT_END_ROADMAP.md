getOverviewStats(guildId: string, period: string): Observable<OverviewStatsDTO> {
    return this.http.get<OverviewStatsDTO>(
      `${environment.apiUrl}/guilds/${guildId}/analytics/overview`,
      { params: { period } }
    );
  }
}

// analytics-data.service.ts
@Injectable({ providedIn: 'root' })
export class AnalyticsDataService {
  private overviewStatsSubject = new BehaviorSubject<OverviewStatsDTO | null>(null);
  overviewStats$ = this.overviewStatsSubject.asObservable();
  
  setOverviewStats(stats: OverviewStatsDTO) {
    this.overviewStatsSubject.next(stats);
  }
}

// Component usage
@Component({...})
export class AnalyticsOverviewComponent implements OnInit {
  stats$ = this.analyticsFacade.overviewStats$;
  
  constructor(private analyticsFacade: AnalyticsFacade) {}
  
  ngOnInit() {
    this.analyticsFacade.getOverviewStats(this.guildId, '30d').subscribe();
  }
}
```

---

### Gestion État Global

#### Guild Context Service

```typescript
@Injectable({ providedIn: 'root' })
export class GuildContextService {
  private selectedGuildSubject = new BehaviorSubject<DiscordGuildDTO | null>(null);
  selectedGuild$ = this.selectedGuildSubject.asObservable();
  
  private selectedGuildIdSubject = new BehaviorSubject<string | null>(null);
  selectedGuildId$ = this.selectedGuildIdSubject.asObservable();
  
  selectGuild(guild: DiscordGuildDTO) {
    this.selectedGuildSubject.next(guild);
    this.selectedGuildIdSubject.next(guild.id);
    // Persist in localStorage
    localStorage.setItem('selectedGuildId', guild.id);
  }
  
  clearGuild() {
    this.selectedGuildSubject.next(null);
    this.selectedGuildIdSubject.next(null);
    localStorage.removeItem('selectedGuildId');
  }
  
  // Load from storage on app init
  loadFromStorage() {
    const storedGuildId = localStorage.getItem('selectedGuildId');
    if (storedGuildId) {
      // Fetch guild data and set
    }
  }
}
```

#### User Context Service

```typescript
@Injectable({ providedIn: 'root' })
export class UserContextService {
  private currentUserSubject = new BehaviorSubject<UserDTO | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  setUser(user: UserDTO) {
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }
  
  clearUser() {
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }
}
```

---

### Real-time WebSocket

#### WebSocket Service

```typescript
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket: Socket;
  private connectionStatus = new BehaviorSubject<'connected' | 'disconnected' | 'connecting'>('disconnected');
  connectionStatus$ = this.connectionStatus.asObservable();
  
  constructor(private authService: AuthService) {
    this.socket = io(environment.wsUrl, {
      autoConnect: false,
      auth: (cb) => {
        cb({ token: this.authService.getAccessToken() });
      }
    });
    
    this.setupListeners();
  }
  
  connect() {
    this.connectionStatus.next('connecting');
    this.socket.connect();
  }
  
  disconnect() {
    this.socket.disconnect();
    this.connectionStatus.next('disconnected');
  }
  
  private setupListeners() {
    this.socket.on('connect', () => {
      this.connectionStatus.next('connected');
      console.log('WebSocket connected');
    });
    
    this.socket.on('disconnect', () => {
      this.connectionStatus.next('disconnected');
      console.log('WebSocket disconnected');
    });
    
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
    });
  }
  
  // Subscribe to guild events
  subscribeToGuild(guildId: string) {
    this.socket.emit('subscribe:guild', { guildId });
  }
  
  unsubscribeFromGuild(guildId: string) {
    this.socket.emit('unsubscribe:guild', { guildId });
  }
  
  // Listen to specific events
  on<T>(event: string): Observable<T> {
    return new Observable(observer => {
      this.socket.on(event, (data: T) => {
        observer.next(data);
      });
      
      return () => {
        this.socket.off(event);
      };
    });
  }
}
```

#### Real-time Stats Service

```typescript
@Injectable({ providedIn: 'root' })
export class RealTimeStatsService {
  private statsUpdates$ = this.ws.on<StatsUpdateEvent>('stats:update');
  
  constructor(
    private ws: WebSocketService,
    private guildContext: GuildContextService
  ) {
    this.initializeSubscriptions();
  }
  
  private initializeSubscriptions() {
    // Auto-subscribe when guild selected
    this.guildContext.selectedGuildId$
      .pipe(
        distinctUntilChanged(),
        filter(id => !!id)
      )
      .subscribe(guildId => {
        this.ws.subscribeToGuild(guildId!);
      });
    
    // Handle stats updates
    this.statsUpdates$.subscribe(update => {
      // Update relevant data services
      console.log('Stats update received', update);
    });
  }
}
```

---

### HTTP Intercepteurs

#### Auth Interceptor

```typescript
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getAccessToken();
    
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Token expired, try refresh
          return this.authService.refreshToken().pipe(
            switchMap(() => {
              // Retry request with new token
              const newToken = this.authService.getAccessToken();
              req = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next.handle(req);
            }),
            catchError(() => {
              // Refresh failed, logout
              this.authService.logout();
              return throwError(() => error);
            })
          );
        }
        
        return throwError(() => error);
      })
    );
  }
}
```

#### Error Interceptor

```typescript
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private messageService: MessageService,
    private router: Router
  ) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Une erreur est survenue';
        
        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = `Erreur: ${error.error.message}`;
        } else {
          // Server-side error
          switch (error.status) {
            case 400:
              errorMessage = error.error?.message || 'Requête invalide';
              break;
            case 403:
              errorMessage = 'Accès refusé';
              break;
            case 404:
              errorMessage = 'Ressource non trouvée';
              break;
            case 500:
              errorMessage = 'Erreur serveur';
              break;
            default:
              errorMessage = `Erreur ${error.status}: ${error.error?.message || error.message}`;
          }
        }
        
        // Show toast notification
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: errorMessage,
          life: 5000
        });
        
        return throwError(() => error);
      })
    );
  }
}
```

#### Guild Context Interceptor

```typescript
@Injectable()
export class GuildContextInterceptor implements HttpInterceptor {
  constructor(private guildContext: GuildContextService) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add guild context to requests if available and URL contains :guildId
    const guildId = this.guildContext.selectedGuildIdValue;
    
    if (guildId && req.url.includes('/guilds/:guildId')) {
      req = req.clone({
        url: req.url.replace(':guildId', guildId)
      });
    }
    
    return next.handle(req);
  }
}
```

---

### Guards

#### Auth Guard

```typescript
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    if (this.authService.isAuthenticated()) {
      return true;
    }
    
    // Store intended URL
    this.authService.setRedirectUrl(state.url);
    
    // Redirect to login
    this.router.navigate(['/auth/login']);
    return false;
  }
}
```

#### Guild Guard

```typescript
@Injectable({ providedIn: 'root' })
export class GuildGuard implements CanActivate {
  constructor(
    private guildContext: GuildContextService,
    private router: Router,
    private messageService: MessageService
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    const guildId = this.guildContext.selectedGuildIdValue;
    
    if (guildId) {
      return true;
    }
    
    // No guild selected, redirect to server list
    this.messageService.add({
      severity: 'warn',
      summary: 'Sélection requise',
      detail: 'Veuillez sélectionner un serveur',
      life: 3000
    });
    
    this.router.navigate(['/server-list']);
    return false;
  }
}
```

#### Admin Guard

```typescript
@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(
    private guildContext: GuildContextService,
    private router: Router
  ) {}
  
  canActivate(): Observable<boolean> {
    return this.guildContext.selectedGuild$.pipe(
      take(1),
      map(guild => {
        if (!guild) return false;
        
        // Check if user has admin permissions
        const hasAdmin = (guild.permissions & 0x8) === 0x8; // ADMINISTRATOR permission
        
        if (!hasAdmin) {
          this.router.navigate(['/forbidden']);
          return false;
        }
        
        return true;
      })
    );
  }
}
```

---

### Utilities & Helpers

#### Date Utilities

```typescript
export class DateUtils {
  static formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    
    return past.toLocaleDateString('fr-FR');
  }
  
  static formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}min`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h${remainingMinutes}`;
  }
}
```

#### Number Utilities

```typescript
export class NumberUtils {
  static formatCompact(num: number): string {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toString();
  }
  
  static formatPercentChange(current: number, previous: number): string {
    if (previous === 0) return '+100%';
    
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '';
    
    return `${sign}${change.toFixed(1)}%`;
  }
  
  static calculateGrowth(current: number, previous: number): {
    value: number;
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  } {
    const difference = current - previous;
    const percentage = previous === 0 ? 100 : (difference / previous) * 100;
    
    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(percentage) > 1) {
      direction = percentage > 0 ? 'up' : 'down';
    }
    
    return { value: difference, percentage, direction };
  }
}
```

#### Discord Utilities

```typescript
export class DiscordUtils {
  static getAvatarUrl(user: { id: string; avatar?: string }, size = 128): string {
    if (!user.avatar) {
      // Default Discord avatar
      const defaultAvatarNum = parseInt(user.id) % 5;
      return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNum}.png`;
    }
    
    const format = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${format}?size=${size}`;
  }
  
  static getGuildIconUrl(guild: { id: string; icon?: string }, size = 128): string | null {
    if (!guild.icon) return null;
    
    const format = guild.icon.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${format}?size=${size}`;
  }
  
  static parsePermissions(permissions: number): string[] {
    const PERMISSIONS = {
      ADMINISTRATOR: 0x8,
      MANAGE_GUILD: 0x20,
      MANAGE_ROLES: 0x10000000,
      MANAGE_CHANNELS: 0x10,
      KICK_MEMBERS: 0x2,
      BAN_MEMBERS: 0x4,
      // ... autres permissions
    };
    
    const userPermissions: string[] = [];
    
    for (const [name, value] of Object.entries(PERMISSIONS)) {
      if ((permissions & value) === value) {
        userPermissions.push(name);
      }
    }
    
    return userPermissions;
  }
}
```

#### Color Utilities

```typescript
export class ColorUtils {
  static getStatusColor(status: 'online' | 'idle' | 'dnd' | 'offline'): string {
    const colors = {
      online: '#3BA55D',
      idle: '#FAA61A',
      dnd: '#ED4245',
      offline: '#747F8D'
    };
    
    return colors[status];
  }
  
  static getSeverityColor(severity: 'low' | 'medium' | 'high' | 'critical'): string {
    const colors = {
      low: '#57F287',
      medium: '#FEE75C',
      high: '#F26268',
      critical: '#ED4245'
    };
    
    return colors[severity];
  }
  
  static hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
```

---

### Composants Réutilisables

#### Stat Card Component

```typescript
@Component({
  selector: 'app-stat-card',
  template: `
    <p-card [styleClass]="'stat-card ' + variant">
      <div class="stat-card__content">
        <div class="stat-card__header">
          <i [class]="icon" class="stat-card__icon"></i>
          <span class="stat-card__label">{{ label }}</span>
        </div>
        
        <div class="stat-card__value">
          {{ value | number }}
        </div>
        
        <div class="stat-card__footer" *ngIf="comparison">
          <span [class]="'badge badge--' + comparison.direction">
            <i [class]="getComparisonIcon()"></i>
            {{ comparison.percentage | number:'1.1-1' }}%
          </span>
          <span class="stat-card__comparison-label">
            vs période précédente
          </span>
        </div>
        
        <div class="stat-card__sparkline" *ngIf="sparklineData">
          <app-sparkline [data]="sparklineData"></app-sparkline>
        </div>
      </div>
    </p-card>
  `,
  styles: [`
    .stat-card {
      &__content {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      
      &__header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      &__icon {
        font-size: 1.5rem;
        color: var(--primary-color);
      }
      
      &__label {
        font-size: 0.875rem;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      &__value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--text-primary);
      }
      
      &__footer {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.75rem;
      }
      
      .badge {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-weight: 600;
        
        &--up {
          background: rgba(87, 242, 135, 0.1);
          color: #57F287;
        }
        
        &--down {
          background: rgba(237, 66, 69, 0.1);
          color: #ED4245;
        }
        
        &--stable {
          background: rgba(128, 132, 142, 0.1);
          color: #80848E;
        }
      }
    }
  `]
})
export class StatCardComponent {
  @Input() label!: string;
  @Input() value!: number;
  @Input() icon!: string;
  @Input() variant: 'primary' | 'success' | 'warning' | 'danger' = 'primary';
  @Input() comparison?: { percentage: number; direction: 'up' | 'down' | 'stable' };
  @Input() sparklineData?: number[];
  
  getComparisonIcon(): string {
    switch (this.comparison?.direction) {
      case 'up': return 'pi pi-arrow-up';
      case 'down': return 'pi pi-arrow-down';
      default: return 'pi pi-minus';
    }
  }
}
```

#### Member Avatar Component

```typescript
@Component({
  selector: 'app-member-avatar',
  template: `
    <div class="member-avatar" [class.member-avatar--small]="size === 'small'"
         [class.member-avatar--large]="size === 'large'">
      <img [src]="avatarUrl" [alt]="member.username" class="member-avatar__image" />
      <div class="member-avatar__status" [style.background-color]="statusColor"></div>
    </div>
  `,
  styles: [`
    .member-avatar {
      position: relative;
      width: 40px;
      height: 40px;
      
      &--small {
        width: 24px;
        height: 24px;
      }
      
      &--large {
        width: 64px;
        height: 64px;
      }
      
      &__image {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
      }
      
      &__status {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid var(--surface-ground);
      }
    }
  `]
})
export class MemberAvatarComponent {
  @Input() member!: { id: string; username: string; avatar?: string };
  @Input() status: 'online' | 'idle' | 'dnd' | 'offline' = 'offline';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  
  get avatarUrl(): string {
    return DiscordUtils.getAvatarUrl(this.member);
  }
  
  get statusColor(): string {
    return ColorUtils.getStatusColor(this.status);
  }
}
```

#### Loading Skeleton Component

```typescript
@Component({
  selector: 'app-skeleton',
  template: `
    <div class="skeleton" [class]="'skeleton--' + type" [style.width]="width" [style.height]="height">
      <div class="skeleton__shimmer"></div>
    </div>
  `,
  styles: [`
    .skeleton {
      position: relative;
      background: var(--surface-border);
      border-radius: 6px;
      overflow: hidden;
      
      &--text {
        height: 1rem;
        border-radius: 4px;
      }
      
      &--circle {
        border-radius: 50%;
      }
      
      &--rectangle {
        border-radius: 6px;
      }
      
      &__shimmer {
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.05),
          transparent
        );
        animation: shimmer 1.5s infinite;
      }
    }
    
    @keyframes shimmer {
      to {
        left: 100%;
      }
    }
  `]
})
export class SkeletonComponent {
  @Input() type: 'text' | 'circle' | 'rectangle' = 'rectangle';
  @Input() width = '100%';
  @Input() height = '100px';
}
```

---

### Testing Strategy

#### Unit Tests (Jest)

```typescript
// Example: StatCardComponent.spec.ts
describe('StatCardComponent', () => {
  let component: StatCardComponent;
  let fixture: ComponentFixture<StatCardComponent>;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent, PrimeNgModule]
    }).compileComponents();
    
    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
  });
  
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
  it('should display correct value', () => {
    component.value = 1234;
    component.label = 'Test Stat';
    component.icon = 'pi pi-users';
    fixture.detectChanges();
    
    const valueElement = fixture.nativeElement.querySelector('.stat-card__value');
    expect(valueElement.textContent).toContain('1,234');
  });
  
  it('should show up arrow for positive comparison', () => {
    component.comparison = { percentage: 15, direction: 'up' };
    fixture.detectChanges();
    
    expect(component.getComparisonIcon()).toBe('pi pi-arrow-up');
  });
});
```

#### E2E Tests (Cypress)

```typescript
// Example: dashboard.cy.ts
describe('Dashboard Page', () => {
  beforeEach(() => {
    cy.login(); // Custom command
    cy.selectGuild('123456789'); // Custom command
    cy.visit('/dashboard');
  });
  
  it('should display hero stats', () => {
    cy.get('[data-cy="stat-card"]').should('have.length', 4);
    cy.get('[data-cy="stat-card-members"]').should('be.visible');
    cy.get('[data-cy="stat-card-messages"]').should('be.visible');
  });
  
  it('should load timeline events', () => {
    cy.get('[data-cy="timeline"]').should('be.visible');
    cy.get('[data-cy="timeline-event"]').should('have.length.at.least', 1);
  });
  
  it('should display alerts', () => {
    cy.get('[data-cy="alerts-panel"]').should('be.visible');
  });
  
  it('should navigate to analytics on click', () => {
    cy.get('[data-cy="nav-analytics"]').click();
    cy.url().should('include', '/analytics');
  });
});
```

---

## 📚 Documentation & Resources

### Documentation Interne

#### README Structure

```markdown
# Frontend Application

## Installation
npm install

## Development
npm run start

## Build
npm run build

## Tests
npm run test
npm run e2e

## Structure
/src
  /app
    /features      # Feature modules
    /shared        # Shared components
    /core          # Core services
    /layout        # Layout components

## Conventions
- Use Facade pattern for services
- Follow Angular style guide
- Use PrimeNG components
- Tailwind for custom styling

## Contributing
1. Create feature branch
2. Make changes
3. Write tests
4. Submit PR
```

#### Component Documentation Template

```typescript
/**
 * StatCardComponent
 * 
 * Displays a statistic with optional comparison and sparkline
 * 
 * @example
 * <app-stat-card
 *   label="Active Members"
 *   [value]="234"
 *   icon="pi pi-users"
 *   [comparison]="{ percentage: 12, direction: 'up' }"
 *   [sparklineData]="[1,3,5,7,9]"
 * ></app-stat-card>
 * 
 * @input label - Display label for the stat
 * @input value - Numeric value to display
 * @input icon - PrimeIcon class
 * @input variant - Color variant (primary/success/warning/danger)
 * @input comparison - Optional comparison data
 * @input sparklineData - Optional array of numbers for mini chart
 */
```

---

### Guidelines de Contribution

#### Git Workflow

```
main
  └─ develop
      ├─ feature/dashboard-widgets
      ├─ feature/analytics-members
      ├─ fix/table-pagination
      └─ refactor/service-pattern
```

#### Commit Messages

```
feat: add member segmentation builder
fix: resolve pagination issue in members table
refactor: migrate to facade pattern for analytics
docs: update API documentation
test: add e2e tests for dashboard
chore: update dependencies
```

#### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactoring
- [ ] Documentation

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Screenshots
(if applicable)

## Checklist
- [ ] Code follows style guide
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
```

---

## 🎯 Prochaines Étapes Immédiates

### Week 1 Action Plan

#### Jour 1-2 : Setup Initial
- [ ] Créer branches de travail
- [ ] Setup design system (variables SCSS)
- [ ] Configurer TailwindCSS avec PrimeNG
- [ ] Créer composants layout de base
- [ ] Implémenter routing structure

#### Jour 3-4 : Services Foundation
- [ ] Créer services façade (Analytics, Moderation, Members)
- [ ] Implémenter intercepteurs HTTP
- [ ] Setup WebSocket service base
- [ ] Créer context services (Guild, User)
- [ ] Configurer guards

#### Jour 5-6 : Server List & Selection
- [ ] Page Server List component
- [ ] Integration API guilds
- [ ] Guild selection logic
- [ ] Stockage context
- [ ] Navigation vers dashboard

#### Jour 7 : Review & Documentation
- [ ] Code review session
- [ ] Documentation des patterns
- [ ] Setup CI/CD basique
- [ ] Planning week 2

---

## 📞 Support & Contact

### Ressources
- **Discord Community** : [Lien serveur support]
- **Documentation** : `/docs` folder
- **API Docs** : Swagger UI backend
- **Design System** : Storybook (Phase 2)

### Issues & Bugs
- GitHub Issues pour tracking
- Labels : `bug`, `feature`, `enhancement`, `documentation`
- Templates pour issues et PRs

---

## 🎉 Conclusion

Cette roadmap est un **document vivant**. Elle sera mise à jour régulièrement en fonction :
- Des retours utilisateurs
- Des contraintes techniques découvertes
- Des opportunités business
- Des évolutions de l'écosystème Discord

### Principes Directeurs

**1. Toujours prioriser l'expérience utilisateur**
- Chaque feature doit apporter de la valeur immédiate
- Interface intuitive > Features complexes
- Feedback visuel constant
- Performance = feature

**2. Construire pour scaler**
- Architecture modulaire
- Code réutilisable
- Performance dès le début
- Tests automatisés

**3. Différenciation constante**
- Innover sur l'UX/UI
- Features intelligentes (insights, alertes)
- Real-time par défaut
- Personnalisation avancée

**4. Itération rapide**
- MVP fonctionnel en 3 mois
- Features avancées en 6 mois
- Beta testing continu
- Feedback loops courts

---

## 📊 Métriques de Progrès Roadmap

### Phase 1 (MVP Core) - Mois 1-3

| Sprint | Tâches | Statut | Completion |
|--------|--------|--------|------------|
| Foundation (S1-2) | 7 | ⚠️ À FAIRE | 0% |
| Server List & Dashboard (S3-4) | 12 | ⚠️ À FAIRE | 0% |
| Analytics Overview (S5-6) | 8 | ⚠️ À FAIRE | 0% |
| Membres Base (S7-8) | 6 | ⚠️ À FAIRE | 0% |
| Modération Core (S9-10) | 5 | ⚠️ À FAIRE | 0% |
| Canaux & Rôles (S11-12) | 4 | ⚠️ À FAIRE | 0% |
| Polish & Beta (S13-14) | 10 | ⚠️ À FAIRE | 0% |

**Total Phase 1** : 0/52 tâches (0%)

### Phase 2 (Advanced) - Mois 4-6

| Sprint | Features | Statut | Completion |
|--------|----------|--------|------------|
| Alertes Intelligentes | 3 | 🔵 FUTUR | 0% |
| Analytics Avancées | 6 | 🔵 FUTUR | 0% |
| Modération Avancée | 4 | 🔵 FUTUR | 0% |
| Segments & Bulk | 4 | 🔵 FUTUR | 0% |
| Permissions Matrix | 4 | 🔵 FUTUR | 0% |
| Invitations Tracking | 6 | 🔵 FUTUR | 0% |

**Total Phase 2** : 0/27 features (0%)

### Phase 3 (Premium) - Mois 7-9

| Sprint | Features | Statut | Completion |
|--------|----------|--------|------------|
| Widgets Personnalisables | 2 | 🔵 FUTUR | 0% |
| Leaderboards Complets | 3 | 🔵 FUTUR | 0% |
| Real-time WebSocket | 4 | 🔵 FUTUR | 0% |
| Reports Automatiques | 2 | 🔵 FUTUR | 0% |
| Auto-modération | 4 | 🔵 FUTUR | 0% |
| Public Dashboard | 2 | 🔵 FUTUR | 0% |

**Total Phase 3** : 0/17 features (0%)

---

## 🔄 Processus de Mise à Jour

### Fréquence
- **Hebdomadaire** : Mise à jour statuts tâches
- **Bi-mensuel** : Review sprints, ajustements priorités
- **Mensuel** : Review phase, métriques succès
- **Trimestriel** : Vision long terme, pivots stratégiques

### Indicateurs de Révision

**Triggers pour ajuster la roadmap** :
- ✅ Feature complétée plus vite que prévu → Avancer prochaine
- ❌ Blocage technique majeur → Prioriser solution ou alternative
- 📈 Feedback utilisateurs très positif → Accélérer features similaires
- 📉 Feature peu utilisée → Repenser ou déprioritiser
- 🆕 Concurrent lance feature killer → Analyser et réagir
- 💡 Nouvelle opportunité business → Évaluer ROI et intégrer

---

## 📖 Annexes

### A. Glossaire

**Terms Techniques** :
- **Facade Pattern** : Pattern architectural séparant API publique (facade) de l'implémentation (api + data services)
- **DTO** : Data Transfer Object, structure de données partagée entre frontend/backend
- **Guard** : Service Angular protégeant routes selon conditions (auth, permissions)
- **Interceptor** : Middleware HTTP interceptant requêtes/réponses pour ajouter logique globale
- **Lazy Loading** : Chargement différé de modules pour optimiser bundle initial
- **WebSocket** : Protocole communication bidirectionnelle temps réel
- **Sparkline** : Mini graphique simplifié montrant tendance

**Terms Business** :
- **MAU** : Monthly Active Users, utilisateurs actifs sur 30 jours
- **DAU** : Daily Active Users, utilisateurs actifs quotidiens
- **NPS** : Net Promoter Score, métrique satisfaction (recommandation)
- **Churn** : Taux désabonnement/départ utilisateurs
- **Retention** : Taux rétention utilisateurs sur période donnée
- **Conversion** : Passage d'un état à un autre (free → paid)

**Terms Discord** :
- **Guild** : Serveur Discord
- **Member** : Utilisateur membre d'une guild
- **Role** : Rôle avec permissions dans une guild
- **Channel** : Canal texte/vocal/stage
- **Webhook** : URL endpoint pour envoyer messages automatisés
- **Boost** : Abonnement Nitro utilisé pour améliorer serveur

---

### B. API Endpoints Reference

#### Authentication
```
POST   /auth/login              - Initiate OAuth flow
GET    /auth/callback           - OAuth callback
POST   /auth/refresh            - Refresh access token
POST   /auth/logout             - Logout user
GET    /auth/status             - Check auth status
```

#### User
```
GET    /users/me                - Get current user
GET    /users/me/guilds         - Get user's guilds
PUT    /users/me/preferences    - Update preferences
GET    /users/me/sessions       - Get active sessions
DELETE /users/me/sessions/:id   - Logout session
```

#### Guilds
```
GET    /guilds/:guildId                        - Get guild details
GET    /guilds/:guildId/stats/dashboard-hero   - Dashboard hero stats
GET    /guilds/:guildId/timeline               - Timeline events
GET    /guilds/:guildId/alerts                 - Active alerts
POST   /guilds/:guildId/alerts/:id/dismiss     - Dismiss alert
```

#### Analytics
```
GET    /guilds/:guildId/analytics/overview          - Overview stats
GET    /guilds/:guildId/analytics/members           - Members analytics
GET    /guilds/:guildId/analytics/channels          - Channels analytics
GET    /guilds/:guildId/analytics/channels/heatmap  - Activity heatmap
GET    /guilds/:guildId/analytics/predictions       - Predictions
POST   /guilds/:guildId/analytics/export            - Export data
```

#### Moderation
```
GET    /guilds/:guildId/moderation/dashboard  - Moderation dashboard
GET    /guilds/:guildId/moderation/recent     - Recent actions
GET    /guilds/:guildId/moderation/logs       - Moderation logs
POST   /guilds/:guildId/moderation/ban        - Ban member
POST   /guilds/:guildId/moderation/kick       - Kick member
POST   /guilds/:guildId/moderation/warn       - Warn member
POST   /guilds/:guildId/moderation/timeout    - Timeout member
POST   /guilds/:guildId/moderation/unban      - Unban member
GET    /guilds/:guildId/moderation/reports    - Get reports
PUT    /guilds/:guildId/moderation/reports/:id - Update report
```

#### Members
```
GET    /guilds/:guildId/members                    - List members
GET    /guilds/:guildId/members/stats              - Members stats
GET    /guilds/:guildId/members/:memberId/profile  - Member profile
GET    /guilds/:guildId/members/:memberId/activity - Member activity
GET    /guilds/:guildId/members/:memberId/history  - Member history
GET    /guilds/:guildId/members/insights           - Members insights
POST   /guilds/:guildId/members/bulk-action        - Bulk action
```

#### Segments
```
GET    /guilds/:guildId/segments                      - List segments
POST   /guilds/:guildId/segments                      - Create segment
GET    /guilds/:guildId/segments/:segmentId/members   - Get segment members
POST   /guilds/:guildId/segments/:segmentId/action    - Segment action
```

#### Channels
```
GET    /guilds/:guildId/channels/tree              - Channels tree
GET    /guilds/:guildId/channels/stats             - Channels stats
GET    /guilds/:guildId/channels/:channelId        - Channel details
PUT    /guilds/:guildId/channels/:channelId        - Update channel
GET    /guilds/:guildId/channels/:channelId/webhooks - List webhooks
POST   /guilds/:guildId/channels/:channelId/webhooks - Create webhook
```

#### Roles
```
GET    /guilds/:guildId/roles                        - List roles
POST   /guilds/:guildId/roles                        - Create role
PUT    /guilds/:guildId/roles/:roleId                - Update role
DELETE /guilds/:guildId/roles/:roleId                - Delete role
PUT    /guilds/:guildId/roles/reorder                - Reorder roles
GET    /guilds/:guildId/roles/permissions-matrix     - Permissions matrix
```

#### Invitations
```
GET    /guilds/:guildId/invitations/leaderboard   - Invites leaderboard
GET    /guilds/:guildId/invitations/analytics     - Invites analytics
GET    /guilds/:guildId/invitations/codes         - List invite codes
POST   /guilds/:guildId/invitations/codes         - Create invite
DELETE /guilds/:guildId/invitations/codes/:code   - Delete invite
```

#### Leaderboards
```
GET    /guilds/:guildId/leaderboards/:type                - Get leaderboard
GET    /guilds/:guildId/leaderboards/:type/position/:userId - User position
```

#### Settings
```
GET    /guilds/:guildId/settings/general       - General settings
PUT    /guilds/:guildId/settings/general       - Update general
GET    /guilds/:guildId/settings/security      - Security settings
PUT    /guilds/:guildId/settings/security      - Update security
GET    /guilds/:guildId/settings/notifications - Notification settings
PUT    /guilds/:guildId/settings/notifications - Update notifications
```

---

### C. DTO Schemas

#### DashboardHeroStatsDTO
```typescript
interface DashboardHeroStatsDTO {
  activeMembers: {
    current: number;
    comparison: ComparisonDTO;
    sparkline: number[];
  };
  messages: {
    current: number;
    comparison: ComparisonDTO;
    sparkline: number[];
  };
  voiceMinutes: {
    current: number;
    uniqueMembers: number;
    comparison: ComparisonDTO;
    sparkline: number[];
  };
  moderationActions: {
    current: number;
    breakdown: {
      bans: number;
      kicks: number;
      warns: number;
    };
  };
}

interface ComparisonDTO {
  value: number;
  percentage: number;
  direction: 'up' | 'down' | 'stable';
}
```

#### TimelineEventDTO
```typescript
interface TimelineEventDTO {
  id: string;
  guildId: string;
  timestamp: Date;
  type: 'moderation' | 'milestone' | 'config' | 'member';
  icon: string;
  color: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  relatedEntities?: {
    userId?: string;
    moderatorId?: string;
    channelId?: string;
    roleId?: string;
  };
  actionable: boolean;
  metadata?: Record<string, any>;
}
```

#### AlertDTO
```typescript
interface AlertDTO {
  id: string;
  guildId: string;
  type: 'anomaly' | 'recommendation' | 'opportunity' | 'emergency';
  severity: 1 | 2 | 3;
  title: string;
  message: string;
  icon: string;
  color: string;
  timestamp: Date;
  dismissed: boolean;
  actionable: boolean;
  actions?: Array<{
    label: string;
    handler: string;
    payload?: Record<string, any>;
  }>;
  metadata?: Record<string, any>;
}
```

#### MemberAnalyticsDTO
```typescript
interface MemberAnalyticsDTO {
  memberId: string;
  username: string;
  discriminator: string;
  avatar?: string;
  joinedAt: Date;
  roles: RoleDTO[];
  stats: {
    messages: {
      last7d: number;
      last30d: number;
      total: number;
      byChannel: Record<string, number>;
    };
    voice: {
      last7d: number;
      last30d: number;
      total: number;
      sessions: number;
      avgSessionDuration: number;
    };
    reactions: {
      given: number;
      received: number;
      topEmojis: Array<{ emoji: string; count: number }>;
    };
    invites: {
      total: number;
      active: number;
      left: number;
    };
  };
  activityScore: number;
  insights: Array<{
    type: string;
    label: string;
    color: string;
    actionable: boolean;
  }>;
  patterns: {
    activeHours: number[]; // 24 elements
    activeDays: number[]; // 7 elements
    preferredChannels: string[];
  };
}
```

#### ModerationLogDTO
```typescript
interface ModerationLogDTO {
  id: string;
  guildId: string;
  type: 'ban' | 'kick' | 'warn' | 'timeout' | 'unban';
  targetUserId: string;
  targetUsername: string;
  moderatorId: string;
  moderatorUsername: string;
  reason: string;
  timestamp: Date;
  config?: {
    duration?: number;
    deleteMessageDays?: number;
    severity?: number;
  };
  status: 'active' | 'expired' | 'revoked';
  revokedBy?: string;
  revokedAt?: Date;
  revokeReason?: string;
  notes: Array<{
    authorId: string;
    content: string;
    timestamp: Date;
  }>;
}
```

#### SegmentDTO
```typescript
interface SegmentDTO {
  id: string;
  guildId: string;
  name: string;
  description?: string;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains';
    value: any;
    logic?: 'AND' | 'OR';
  }>;
  memberCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### D. Environment Configuration

#### Development
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'ws://localhost:3001',
  discord: {
    clientId: 'YOUR_DEV_CLIENT_ID',
    redirectUri: 'http://localhost:4200/auth/callback',
    scopes: ['identify', 'guilds', 'email']
  },
  sentry: {
    dsn: null, // Disabled in dev
    environment: 'development'
  },
  features: {
    realtime: true,
    analytics: true,
    segments: true,
    automod: false // Phase 2
  }
};
```

#### Production
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.yourdomain.com/api',
  wsUrl: 'wss://ws.yourdomain.com',
  discord: {
    clientId: 'YOUR_PROD_CLIENT_ID',
    redirectUri: 'https://yourdomain.com/auth/callback',
    scopes: ['identify', 'guilds', 'email']
  },
  sentry: {
    dsn: 'YOUR_SENTRY_DSN',
    environment: 'production',
    tracesSampleRate: 0.1
  },
  features: {
    realtime: true,
    analytics: true,
    segments: true,
    automod: true
  }
};
```

---

### E. Shortcuts Clavier

**Navigation Globale** :
- `G + D` → Dashboard
- `G + A` → Analytics
- `G + M` → Modération
- `G + U` → Membres (Users)
- `G + C` → Canaux (Channels)
- `G + R` → Rôles
- `G + S` → Paramètres (Settings)

**Actions** :
- `/` → Focus search
- `Esc` → Close modal/panel
- `Ctrl + K` → Command palette (Phase 2)
- `?` → Show shortcuts help

**Navigation** :
- `←` → Page précédente
- `→` → Page suivante
- `↑/↓` → Navigate lists

**Modération Rapide** :
- `Shift + B` → Quick ban (if member selected)
- `Shift + K` → Quick kick
- `Shift + T` → Quick timeout

---

### F. Accessibilité Checklist

**Général** :
- [ ] Contraste couleurs WCAG AA minimum (4.5:1 texte, 3:1 UI)
- [ ] Tous les éléments interactifs accessibles au clavier
- [ ] Focus visible sur tous les éléments
- [ ] Skip links pour navigation rapide
- [ ] Pas de contenu clignotant/flashant

**Images & Icons** :
- [ ] Alt text sur toutes les images significatives
- [ ] Icons décoratifs avec aria-hidden="true"
- [ ] Icons fonctionnels avec aria-label

**Formulaires** :
- [ ] Labels associés à tous les inputs
- [ ] Messages d'erreur clairs et annoncés
- [ ] Instructions formulaires accessibles
- [ ] Validation inline accessible

**Navigation** :
- [ ] Structure heading logique (h1 → h2 → h3)
- [ ] Landmarks ARIA (navigation, main, aside)
- [ ] Breadcrumbs avec aria-label="Breadcrumb"
- [ ] Pagination accessible

**Composants Dynamiques** :
- [ ] Modals avec focus trap
- [ ] Dropdowns avec gestion clavier
- [ ] Tooltips accessibles (aria-describedby)
- [ ] Loading states annoncés (aria-live)
- [ ] Tabs avec gestion clavier (←/→)

**Tables** :
- [ ] Headers appropriés (th avec scope)
- [ ] Caption explicatifs
- [ ] Sort indicators accessibles
- [ ] Row selection accessible

**Screen Readers** :
- [ ] aria-label sur boutons icones uniquement
- [ ] aria-live pour updates dynamiques
- [ ] role="status" pour notifications
- [ ] Annoncer changements de page

---

### G. Performance Budget

**Métriques Cibles** :

| Métrique | Target | Max |
|----------|--------|-----|
| **Initial Load** |||
| HTML | < 10KB | 20KB |
| JS (initial bundle) | < 300KB | 500KB |
| CSS | < 50KB | 100KB |
| Images (above fold) | < 200KB | 500KB |
| **Runtime** |||
| Main thread blocking | < 50ms | 100ms |
| Memory usage | < 100MB | 200MB |
| **Network** |||
| API calls per page | < 5 | 10 |
| WebSocket messages/s | < 10 | 50 |

**Strategies** :
- Lazy loading routes
- Image optimization (WebP + fallback)
- Code splitting par feature
- Tree shaking
- Service workers pour cache
- CDN pour assets statiques

---

### H. Browser Support

**Supported Browsers** :

| Browser | Version |
|---------|---------|
| Chrome | Last 2 versions |
| Firefox | Last 2 versions |
| Safari | Last 2 versions |
| Edge | Last 2 versions |

**Mobile Browsers** :
- Safari iOS 13+
- Chrome Android latest
- Samsung Internet latest

**Not Supported** :
- Internet Explorer (EOL)
- Opera Mini

**Progressive Enhancement** :
- Core features fonctionnent sans JS
- Graceful degradation animations
- Fallbacks pour features modernes (WebP, WebSocket)

---

### I. Sécurité Checklist

**Authentication** :
- [ ] OAuth2 secure implementation
- [ ] Token refresh automatique
- [ ] XSS protection (sanitize inputs)
- [ ] CSRF tokens sur mutations
- [ ] Secure cookie settings (httpOnly, secure, sameSite)

**Authorization** :
- [ ] Permission checks côté client ET serveur
- [ ] Guild context validated
- [ ] Role-based access control
- [ ] Rate limiting sur actions sensibles

**Data Protection** :
- [ ] HTTPS only en production
- [ ] Pas de données sensibles dans localStorage
- [ ] Encryption données sensibles transit
- [ ] Content Security Policy headers
- [ ] CORS configuration stricte

**Input Validation** :
- [ ] Sanitization tous les inputs utilisateur
- [ ] Validation côté client ET serveur
- [ ] Protection injection SQL (via ORM)
- [ ] Protection command injection
- [ ] File upload validation (si applicable)

**Monitoring** :
- [ ] Logging erreurs (Sentry)
- [ ] Audit logs actions sensibles
- [ ] Alert patterns suspects
- [ ] Rate limit monitoring

---

## 🚀 Let's Build!

Avec cette roadmap détaillée, tu as maintenant :

✅ **Vision claire** de l'application complète  
✅ **Architecture technique** solide et scalable  
✅ **Plan d'exécution** sur 12 mois avec priorités  
✅ **Spécifications détaillées** de chaque page  
✅ **Guidelines** de développement et contribution  
✅ **Métriques** pour mesurer le succès  

**Prochaine action immédiate** :
1. Créer document dans `/docs/frontend/ROADMAP.md`
2. Setup première branche `feature/foundation`
3. Commencer Semaine 1 - Tâches Foundation
4. Premier commit : "feat: initialize frontend roadmap"

Tu as toutes les cartes en main pour créer l'application d'administration Discord la plus impressionnante du marché ! 🎯

**Remember** : 
> "Perfect is the enemy of good. Ship MVP first, iterate fast, listen to users."

Let's disrupt le marché ! 💪🚀# 🎨 Frontend Roadmap & Architecture

## 📋 Table des matières

1. [Vision & Philosophie](#vision--philosophie)
2. [Architecture des Pages](#architecture-des-pages)
3. [Roadmap Évolutive](#roadmap-évolutive)
4. [Spécifications Techniques](#spécifications-techniques)
5. [Design System](#design-system)
6. [User Flows](#user-flows)
7. [Métriques de Succès](#métriques-de-succès)

---

## 🎯 Vision & Philosophie

### Notre Positionnement

**Objectif** : Devenir LA référence en administration/modération Discord en surpassant MEE6, Dyno, et tous les concurrents.

### Piliers Différenciateurs

#### 1. **Proactivité Intelligente**
- L'application **parle** à l'admin au lieu d'attendre qu'il cherche
- Insights automatiques : "Pic inhabituel détecté", "Membre mérite un rôle"
- Alertes contextuelles et intelligentes

#### 2. **Vue Holistique**
- Tout est connecté : stats + modération + membres dans un seul écosystème
- Données croisées pour insights profonds
- Navigation fluide entre contextes

#### 3. **Real-Time par Défaut**
- Données live grâce à la gateway
- Indicateurs temps réel visibles
- Pas de refresh manuel nécessaire

#### 4. **Personnalisation Avancée**
- Dashboard configurable par l'admin
- Alertes sur mesure
- Segments membres personnalisés

#### 5. **UX/UI Moderne**
- Design system cohérent (PrimeNG + Tailwind)
- Animations subtiles et performantes
- Mobile-first responsive
- Dark mode par défaut

### Faiblesses des Concurrents

| Problème | MEE6/Dyno | Notre Solution |
|----------|-----------|----------------|
| UI datée | ❌ Interface 2018 | ✅ Design moderne 2025 |
| Données cloisonnées | ❌ Pages séparées | ✅ Tout connecté |
| Pas d'insights | ❌ Juste des chiffres | ✅ Recommandations IA |
| Mobile mauvais | ❌ Non responsive | ✅ Mobile-first |
| Configuration complexe | ❌ Nécessite doc | ✅ Onboarding intuitif |
| Pas de prédictions | ❌ Historique seulement | ✅ Patterns & alertes |

---

## 🏗️ Architecture des Pages

### Structure Globale

```
/
├── auth/
│   ├── login
│   └── callback
│
├── server-list (sélection serveur)
│
└── guilds/:guildId/
    ├── dashboard (home)
    ├── analytics/
    │   ├── overview
    │   ├── members
    │   ├── channels
    │   ├── temporal
    │   └── leaderboards
    ├── moderation/
    │   ├── dashboard
    │   ├── actions
    │   ├── logs
    │   └── reports
    ├── members/
    │   ├── list
    │   └── :memberId (détail)
    ├── channels/
    │   ├── overview
    │   └── :channelId (config)
    ├── roles/
    │   ├── list
    │   └── permissions-matrix
    ├── invitations/
    │   ├── leaderboard
    │   ├── analytics
    │   └── codes
    ├── automations/ (Phase 2)
    └── settings/
        ├── general
        ├── security
        ├── integrations
        └── preferences
```

---

## 📄 Spécifications Détaillées par Page

### 🏠 1. Dashboard Principal

**Route** : `/guilds/:guildId/dashboard`

**Objectif** : Point d'entrée après sélection du serveur. Vue d'ensemble instantanée + points d'attention critiques.

#### Sections

##### 1.1 Hero Stats (Top Row)
**Composants PrimeNG** : `p-card` avec grille custom

**Données affichées** :
- **Membres Actifs (24h)**
  - Nombre
  - Comparaison vs J-1 (badge +/- avec couleur)
  - Sparkline graphique mini (Chart.js line)
  
- **Messages (24h)**
  - Nombre total
  - Comparaison vs J-1
  - Sparkline activité
  
- **Temps Vocal (24h)**
  - Minutes totales
  - Membres uniques en vocal
  - Sparkline
  
- **Actions Modération (24h)**
  - Nombre bans/kicks/warns
  - Badge couleur selon volume (vert normal, orange élevé, rouge très élevé)

**API Endpoints** :
- `GET /api/users/me/preferences`
- `PUT /api/users/me/preferences`

---

### 👤 9. Profil Utilisateur

**Route** : `/profile`

**Objectif** : Settings personnels et gestion compte.

#### Sections

##### Informations Discord
**Composant** : Card read-only

**Données affichées** (synced Discord) :
- Avatar
- Username + discriminator
- Email (masked)
- Account created date
- Badges Discord (Nitro, etc.)

**Note** : Non éditable (géré via Discord)

##### Serveurs Gérés
**Composant** : Grid cards

**Liste** :
- Serveurs où user a permissions admin
- Switch rapide (clic → change guild context)
- Quick stats par serveur

##### Préférences Personnelles
**Composant** : Form

**Options** :
- Langue interface
- Timezone
- Email notifications préférences
- Theme preference

##### Sessions Actives
**Composant** : Table

**Données** :
- Device / Browser
- IP (masked)
- Location (ville)
- Last activity
- Actions : Logout session

##### Danger Zone
**Composant** : Section avec confirmations

**Actions** :
- Logout all sessions
- Disconnect account (revoke OAuth)

**API Endpoints** :
- `GET /api/users/me/profile`
- `GET /api/users/me/guilds`
- `PUT /api/users/me/preferences`
- `GET /api/users/me/sessions`
- `DELETE /api/users/me/sessions/:sessionId`

---

## 🗺️ Roadmap Évolutive

### Phase 1 : MVP Core (Mois 1-3)

**Objectif** : Fonctionnalités essentielles pour lancement beta

#### Semaine 1-2 : Foundation
**Priorité** : 🔴 CRITIQUE

**Tâches** :
- [ ] Setup routing structure complète
- [ ] Créer layout components (header, sidebar, footer)
- [ ] Implémenter navigation + breadcrumbs
- [ ] Setup guards (auth, guild)
- [ ] Créer design system base (colors, typography, spacing)
- [ ] Setup services façade pattern
- [ ] Implémenter intercepteurs HTTP

**Livrables** :
- Structure app navigable
- Design system documenté
- Auth flow fonctionnel

---

#### Semaine 3-4 : Server List & Dashboard
**Priorité** : 🔴 CRITIQUE

**Tâches** :
- [ ] Page Server List
  - [ ] Component liste serveurs
  - [ ] Service API guilds
  - [ ] Filtres et recherche
  - [ ] Sélection et stockage guild context
  
- [ ] Dashboard Principal
  - [ ] Hero Stats cards
  - [ ] API endpoint dashboard-hero
  - [ ] Sparklines avec Chart.js
  - [ ] Timeline events (version simple)
  - [ ] Integration real-time stats

**Livrables** :
- User peut sélectionner serveur
- Dashboard affiche stats live
- Navigation fonctionnelle

---

#### Semaine 5-6 : Analytics Overview
**Priorité** : 🔴 CRITIQUE

**Tâches** :
- [ ] Page Analytics Overview
  - [ ] Graph activité principal (Chart.js)
  - [ ] Breakdown cards (messages/vocal/réactions)
  - [ ] Sélecteur période
  - [ ] Export CSV basique
  
- [ ] Backend endpoints analytics
  - [ ] `/analytics/overview` avec agrégations
  - [ ] Cache Redis pour perfs

**Livrables** :
- Analytics fonctionnelles
- Graphs interactifs
- Export données

---

#### Semaine 7-8 : Membres Base
**Priorité** : 🔴 CRITIQUE

**Tâches** :
- [ ] Page Membres Liste
  - [ ] Vue grille et tableau (toggle)
  - [ ] Filtres basiques (rôle, date join)
  - [ ] Pagination
  - [ ] Quick stats header
  
- [ ] Profil Membre Simple
  - [ ] Modal détails membre
  - [ ] Stats activité basiques
  - [ ] Rôles et permissions

**Livrables** :
- Liste membres explorable
- Profils membres consultables

---

#### Semaine 9-10 : Modération Core
**Priorité** : 🔴 CRITIQUE

**Tâches** :
- [ ] Dashboard Modération
  - [ ] Stats modération
  - [ ] Timeline actions récentes
  - [ ] Graph évolution
  
- [ ] Logs Modération
  - [ ] Table logs avec filtres
  - [ ] Détails log (modal)
  - [ ] Export logs

**Livrables** :
- Historique modération visible
- Filtres et recherche fonctionnels

---

#### Semaine 11-12 : Canaux & Rôles Base
**Priorité** : 🟠 IMPORTANT

**Tâches** :
- [ ] Page Canaux Overview
  - [ ] Tree view canaux
  - [ ] Stats inline basiques
  - [ ] Actions basiques
  
- [ ] Page Rôles Liste
  - [ ] Liste rôles avec hiérarchie
  - [ ] Create/Edit role (form basique)
  - [ ] Members count

**Livrables** :
- Vue canaux organisée
- Gestion rôles basique

---

#### Semaine 13-14 : Polish & Beta Launch
**Priorité** : 🔴 CRITIQUE

**Tâches** :
- [ ] Responsive mobile (tous les pages core)
- [ ] Dark mode final polish
- [ ] Loading states partout
- [ ] Error handling global
- [ ] Empty states
- [ ] Onboarding tooltips
- [ ] Performance optimization
  - [ ] Lazy loading routes
  - [ ] Image optimization
  - [ ] Bundle size analysis
- [ ] Tests E2E critiques
- [ ] Documentation utilisateur

**Livrables** :
- App production-ready
- Beta testable
- Documentation complète

---

### Phase 2 : Advanced Features (Mois 4-6)

**Objectif** : Se différencier avec features avancées

#### Sprint 1 : Alertes Intelligentes (Semaines 15-16)
**Priorité** : 🔴 CRITIQUE

**Tâches** :
- [ ] Système alertes backend
  - [ ] Engine règles configurable
  - [ ] Détection anomalies (ML basique)
  - [ ] Queue alertes
  
- [ ] UI Alertes Dashboard
  - [ ] Card alertes & recommandations
  - [ ] Actions alertes (dismiss, execute)
  - [ ] Configuration règles custom

**Livrables** :
- Alertes proactives fonctionnelles
- Recommandations intelligentes

---

#### Sprint 2 : Analytics Avancées (Semaines 17-18)
**Priorité** : 🟠 IMPORTANT

**Tâches** :
- [ ] Analyse Membre Détaillée
  - [ ] Profil membre complet (onglets)
  - [ ] Timeline activité avancée
  - [ ] Insights automatiques membres
  
- [ ] Analyse Canaux
  - [ ] Heatmap activité
  - [ ] Stats détaillées par canal
  - [ ] Insights canaux
  
- [ ] Analyse Temporelle
  - [ ] Heatmap 7x24
  - [ ] Patterns détection
  - [ ] Prédictions basiques

**Livrables** :
- Analytics granulaires
- Insights automatiques

---

#### Sprint 3 : Modération Avancée (Semaines 19-20)
**Priorité** : 🔴 CRITIQUE

**Tâches** :
- [ ] Actions Rapides
  - [ ] Interface ban/kick depuis app
  - [ ] Multi-sélection membres
  - [ ] Raisons pré-configurées
  - [ ] Tempban avec durée
  
- [ ] Système Rapports
  - [ ] Interface triage rapports
  - [ ] Assignation modérateurs
  - [ ] Workflow traitement
  - [ ] Stats rapports

**Livrables** :
- Modération complète depuis web
- Rapports structurés

---

#### Sprint 4 : Segments & Bulk Actions (Semaines 21-22)
**Priorité** : 🟠 IMPORTANT

**Tâches** :
- [ ] Segment Builder
  - [ ] Visual query builder
  - [ ] Templates prédéfinis
  - [ ] Preview live
  - [ ] Save segments
  
- [ ] Actions Bulk
  - [ ] Assign/remove roles
  - [ ] Export sélection
  - [ ] Send messages bulk
  - [ ] Actions modération bulk

**Livrables** :
- Segmentation avancée
- Gestion masse efficace

---

#### Sprint 5 : Permissions Matrix (Semaines 23-24)
**Priorité** : 🟡 MOYEN

**Tâches** :
- [ ] Matrix Permissions
  - [ ] Table interactive rôles x permissions
  - [ ] Comparaison côte à côte
  - [ ] Détection conflits
  - [ ] Templates rôles
  
- [ ] Permissions Canaux
  - [ ] Matrix canal-specific
  - [ ] Visual overrides
  - [ ] Copy permissions

**Livrables** :
- Gestion permissions clarifiée
- Conflits détectés automatiquement

---

#### Sprint 6 : Invitations Tracking (Semaines 25-26)
**Priorité** : 🟡 MOYEN

**Tâches** :
- [ ] Leaderboard Invitations
  - [ ] Top inviters
  - [ ] Taux rétention
  
- [ ] Analytics Invitations
  - [ ] Graph croissance
  - [ ] Funnel rétention
  - [ ] Top codes
  
- [ ] Gestion Codes
  - [ ] Liste codes actifs
  - [ ] Create/Edit invites
  - [ ] Tracking campagnes (basique)

**Livrables** :
- Tracking invitations complet
- Analytics rétention

---

### Phase 3 : Premium & Scale (Mois 7-9)

**Objectif** : Features premium et optimisations scale

#### Sprint 1 : Widgets Personnalisables (Semaines 27-28)
**Priorité** : 🟡 MOYEN

**Tâches** :
- [ ] Dashboard Widgets
  - [ ] Système drag & drop
  - [ ] 6-8 widgets disponibles
  - [ ] Save layout user
  - [ ] Reset to defaults
  
- [ ] Widget Gallery
  - [ ] Preview widgets
  - [ ] Add/Remove widgets
  - [ ] Configuration par widget

**Livrables** :
- Dashboard personnalisable
- Layouts sauvegardés

---

#### Sprint 2 : Leaderboards Complets (Semaines 29-30)
**Priorité** : 🟡 MOYEN

**Tâches** :
- [ ] Multiple Leaderboards
  - [ ] Messages
  - [ ] Vocal
  - [ ] Activité globale
  - [ ] Invitations
  - [ ] Réactions
  
- [ ] Système Badges
  - [ ] Badges visuels (champion, streak, etc.)
  - [ ] Conditions unlock badges
  - [ ] Display badges profils

**Livrables** :
- Leaderboards complets
- Gamification basique

---

#### Sprint 3 : Real-time WebSocket (Semaines 31-32)
**Priorité** : 🟠 IMPORTANT

**Tâches** :
- [ ] WebSocket Frontend
  - [ ] Connection WebSocket gateway
  - [ ] Event listeners
  - [ ] Auto-reconnect
  
- [ ] Updates Real-time
  - [ ] Stats live update
  - [ ] Timeline real-time
  - [ ] Notifications push
  - [ ] Indicators "Live"

**Livrables** :
- Dashboard temps réel complet
- Pas de refresh nécessaire

---

#### Sprint 4 : Reports Automatiques (Semaines 33-34)
**Priorité** : 🟢 NICE-TO-HAVE

**Tâches** :
- [ ] Report Generator
  - [ ] PDF export avec charts
  - [ ] Email reports planifiés
  - [ ] Templates reports
  - [ ] Configuration sections
  
- [ ] Scheduled Reports
  - [ ] Configuration fréquence
  - [ ] Destinataires
  - [ ] Format customization

**Livrables** :
- Reports PDF exportables
- Envoi automatique email

---

#### Sprint 5 : Auto-modération (Semaines 35-36)
**Priorité** : 🟠 IMPORTANT

**Tâches** :
- [ ] Rules Engine
  - [ ] Anti-spam configurable
  - [ ] Filtres mots interdits
  - [ ] Anti-flood
  - [ ] Filtres liens
  
- [ ] UI Configuration
  - [ ] Builder règles
  - [ ] Actions automatiques
  - [ ] Whitelist/Blacklist
  - [ ] Logs actions auto

**Livrables** :
- Auto-modération configurable
- Détection patterns automatique

---

#### Sprint 6 : Public Dashboard (Semaines 37-38)
**Priorité** : 🟢 NICE-TO-HAVE

**Tâches** :
- [ ] Public Dashboard Generator
  - [ ] Page publique stats serveur
  - [ ] URL custom
  - [ ] Opt-in par serveur
  - [ ] Configuration affichage
  
- [ ] Embed Widgets
  - [ ] Embed leaderboards
  - [ ] Embed stats cards
  - [ ] Iframe responsive

**Livrables** :
- Dashboard public shareable
- Widgets embeddables

---

### Phase 4 : AI & Advanced (Mois 10-12)

**Objectif** : Features IA et automation avancée

#### Sprint 1 : AI Insights (Semaines 39-41)
**Priorité** : 🟡 MOYEN

**Tâches** :
- [ ] ML Models Training
  - [ ] Patterns détection
  - [ ] Anomalies détection
  - [ ] Predictions activité
  
- [ ] AI Recommendations
  - [ ] Suggestions contextuelles
  - [ ] "Serveur healthcheck"
  - [ ] Optimisations suggérées

**Livrables** :
- Insights IA avancés
- Recommandations intelligentes

---

#### Sprint 2 : Automations Workflows (Semaines 42-44)
**Priorité** : 🟡 MOYEN

**Tâches** :
- [ ] Workflow Builder
  - [ ] Visual automation builder
  - [ ] Triggers (events)
  - [ ] Actions (multi-step)
  - [ ] Conditions (if/else)
  
- [ ] Templates Workflows
  - [ ] Auto-role on join
  - [ ] Welcome messages
  - [ ] Scheduled announcements

**Livrables** :
- Automations configurables
- Workflows complexes

---

#### Sprint 3 : Benchmarking (Semaines 45-46)
**Priorité** : 🟢 NICE-TO-HAVE

**Tâches** :
- [ ] Benchmarks Database
  - [ ] Collect anonymous stats
  - [ ] Agrégations par taille serveur
  - [ ] Métriques comparables
  
- [ ] UI Comparaison
  - [ ] "Votre serveur vs moyenne"
  - [ ] Graphs comparatifs
  - [ ] Insights positionnement

**Livrables** :
- Comparaison avec benchmarks
- Insights compétitifs

---

#### Sprint 4 : Advanced Analytics (Semaines 47-48)
**Priorité** : 🟢 NICE-TO-HAVE

**Tâches** :
- [ ] Cohort Analysis
  - [ ] Retention by join date
  - [ ] Engagement evolution
  
- [ ] Funnel Analysis
  - [ ] Member journey tracking
  - [ ] Conversion rates
  
- [ ] Sentiment Analysis
  - [ ] Messages sentiment (ML)
  - [ ] Trends sentiment

**Livrables** :
- Analytics niveau entreprise
- Insights profonds

---

#### Sprint 5 : API Publique (Semaines 49-50)
**Priorité** : 🟢 NICE-TO-HAVE

**Tâches** :
- [ ] Public API
  - [ ] REST endpoints publics
  - [ ] API keys management
  - [ ] Rate limiting
  - [ ] Documentation OpenAPI
  
- [ ] Developer Portal
  - [ ] API docs
  - [ ] Examples
  - [ ] SDKs

**Livrables** :
- API publique documentée
- Intégrations tierces possibles

---

#### Sprint 6 : Mobile App (Semaines 51-52)
**Priorité** : 🟢 NICE-TO-HAVE

**Tâches** :
- [ ] Mobile App (React Native ou Ionic)
  - [ ] Dashboard mobile
  - [ ] Stats principales
  - [ ] Modération mobile
  - [ ] Notifications push

**Livrables** :
- App mobile iOS/Android
- Modération en déplacement

---

## 🎨 Design System

### Palette Couleurs

#### Couleurs Principales
```scss
$primary: #5865F2; // Discord Blurple
$primary-light: #7289DA;
$primary-dark: #4752C4;

$secondary: #57F287; // Success green
$secondary-light: #77F5A0;
$secondary-dark: #3BA55D;

$tertiary: #FEE75C; // Warning yellow
$tertiary-light: #FFF180;
$tertiary-dark: #F0B232;

$danger: #ED4245; // Error red
$danger-light: #F26268;
$danger-dark: #C03537;
```

#### Couleurs Neutres (Dark Theme)
```scss
// Backgrounds
$bg-primary: #1E1F22; // Darkest
$bg-secondary: #2B2D31; // Dark
$bg-tertiary: #313338; // Medium dark
$bg-hover: #383A40; // Hover state

// Text
$text-primary: #F2F3F5; // White
$text-secondary: #B5BAC1; // Gray
$text-muted: #80848E; // Light gray
$text-link: #00AFF4; // Blue links

// Borders
$border-default: #3F4147;
$border-hover: #4E5058;
```

### Typography

#### Font Stack
```scss
$font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
$font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

#### Tailles
```scss
$font-xs: 0.75rem;   // 12px
$font-sm: 0.875rem;  // 14px
$font-base: 1rem;    // 16px
$font-lg: 1.125rem;  // 18px
$font-xl: 1.25rem;   // 20px
$font-2xl: 1.5rem;   // 24px
$font-3xl: 1.875rem; // 30px
$font-4xl: 2.25rem;  // 36px
```

### Spacing

```scss
$spacing-1: 0.25rem;  // 4px
$spacing-2: 0.5rem;   // 8px
$spacing-3: 0.75rem;  // 12px
$spacing-4: 1rem;     // 16px
$spacing-5: 1.25rem;  // 20px
$spacing-6: 1.5rem;   // 24px
$spacing-8: 2rem;     // 32px
$spacing-10: 2.5rem;  // 40px
$spacing-12: 3rem;    // 48px
$spacing-16: 4rem;    // 64px
```

### Composants PrimeNG - Customization

#### Buttons
```scss
.p-button {
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s ease;
  
  &.p-button-primary {
    background: $primary;
    &:hover { background: $primary-dark; }
  }
  
  &.p-button-success {
    background: $secondary;
    &:hover { background: $secondary-dark; }
  }
  
  &.p-button-danger {
    background: $danger;
    &:hover { background: $danger-dark; }
  }
}
```

#### Cards
```scss
.p-card {
  background: $bg-secondary;
  border: 1px solid $border-default;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  .p-card-title {
    color: $text-primary;
    font-size: $font-xl;
    font-weight: 700;
  }
  
  .p-card-content {
    color: $text-secondary;
  }
}
```

#### Tables
```scss
.p-datatable {
  background: $bg-secondary;
  border-radius: 12px;
  overflow: hidden;
  
  .p-datatable-thead > tr > th {
    background: $bg-tertiary;
    color: $text-secondary;
    font-weight: 600;
    text-transform: uppercase;
    font-size: $font-xs;
    letter-spacing: 0.5px;
  }
  
  .p-datatable-tbody > tr {
    &:hover {
      background: $bg-hover;
    }
    
    > td {
      border-bottom: 1px solid $border-default;
      color: $text-primary;
    }
  }
}
```

### Animations

#### Transitions Standards
```scss
$transition-fast: 0.15s ease;
$transition-base: 0.2s ease;
$transition-slow: 0.3s ease;

// Hover effects
.hover-lift {
  transition: transform $transition-base;
  &:hover {
    transform: translateY(-2px);
  }
}

// Fade in
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

// Slide up
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Icons

**Bibliothèque** : PrimeIcons + Lucide Icons (via lucide-angular)

#### Icons Mapping
```typescript
const ICON_MAP = {
  // Navigation
  dashboard: 'pi pi-home',
  analytics: 'pi pi-chart-line',
  moderation: 'pi pi-shield',
  members: 'pi pi-users',
  channels: 'pi pi-comments',
  roles: 'pi pi-tag',
  invitations: 'pi pi-ticket',
  settings: 'pi pi-cog',
  
  // Actions
  edit: 'pi pi-pencil',
  delete: 'pi pi-trash',
  save: 'pi pi-check',
  cancel: 'pi pi-times',
  search: 'pi pi-search',
  filter: 'pi pi-filter',
  export: 'pi pi-download',
  
  // Status
  success: 'pi pi-check-circle',
  warning: 'pi pi-exclamation-triangle',
  error: 'pi pi-times-circle',
  info: 'pi pi-info-circle',
};
```

---

## 👤 User Flows

### Flow 1 : Première Connexion

```
1. Landing page → Bouton "Login with Discord"
2. Redirect vers OAuth Discord
3. Autoriser permissions
4. Callback → Backend valide token
5. Redirect vers /server-list
6. User voit liste serveurs administrables
7. Sélection serveur
8. Onboarding modal (optionnel skip)
   - Tour guidé features principales
   - Configuration initiale suggérée
9. Redirect vers /dashboard
10. Dashboard affiche avec tooltips contextuels
```

**Objectif UX** : Friction minimale, valeur immédiate visible

---

### Flow 2 : Modération Rapide (Depuis Dashboard)

```
1. Dashboard affiche alerte : "Possible spam détecté"
2. Clic alerte → Modal détails avec contexte
3. Voir membre concerné (card inline)
4. Actions rapides disponibles :
   - Ban
   - Timeout
   - Voir profil complet
5. Sélection "Timeout 1h"
6. Raison pré-remplie "Spam"
7. Confirm
8. Toast success : "Membre timeout pendant 1h"
9. Alerte dismissed automatiquement
10. Log visible dans timeline
```

**Objectif UX** : Action en < 30 secondes, contexte clair

---

### Flow 3 : Analyse Membre Approfondie

```
1. Depuis /members/list
2. Search membre par nom
3. Clic sur membre → Profil détaillé (modal large)
4. Tabs navigation :
   - Activité : Voir graph 30j
   - Historique : Voir warns précédents
   - Notes : Ajouter note staff
5. Insight badge : "Mérite un rôle"
6. Clic badge → Suggestion action
7. "Assign role Contributeur ?"
8. Confirm → Role assigné
9. Note auto-ajoutée "Role attribué suite recommendation"
10. Profil updated, badge disparaît
```

**Objectif UX** : Découverte insights naturelle, actions suggérées

---

### Flow 4 : Configuration Permissions Canal

```
1. Depuis /channels/overview
2. Clic canal #moderation
3. Page détails canal, tab "Permissions"
4. Matrix affiche : Rôles x Permissions
5. Observation : @Membre a permission alors que @Role ne l'a pas
6. Alert : "Conflit détecté"
7. Clic cell permission → Toggle to denied
8. Save changes
9. Confirmation : "Permissions updated"
10. Discord sync automatique
```

**Objectif UX** : Visual clarity, conflits visibles immédiatement

---

## 📊 Métriques de Succès

### Métriques Techniques

#### Performance
| Métrique | Target | Critique |
|----------|--------|----------|
| First Contentful Paint | < 1.5s | < 3s |
| Time to Interactive | < 3s | < 5s |
| Largest Contentful Paint | < 2.5s | < 4s |
| Cumulative Layout Shift | < 0.1 | < 0.25 |
| Bundle Size (initial) | < 500KB | < 1MB |

#### Disponibilité
| Métrique | Target |
|----------|--------|
| Uptime | 99.9% |
| API Response Time (p95) | < 200ms |
| Real-time Event Latency | < 500ms |
| Error Rate | < 0.1% |

---

### Métriques Utilisateur

#### Engagement
| Métrique | Target Mois 1 | Target Mois 6 |
|----------|---------------|---------------|
| DAU (Daily Active Users) | 100 | 1,000 |
| MAU (Monthly Active Users) | 500 | 10,000 |
| Avg Session Duration | 5min | 10min |
| Pages per Session | 5 | 8 |
| Bounce Rate | < 40% | < 30% |

#### Rétention
| Métrique | Target |
|----------|--------|
| D1 Retention | > 40% |
| D7 Retention | > 20% |
| D30 Retention | > 10% |

#### Satisfaction
| Métrique | Target |
|----------|--------|
| NPS Score | > 30 |
| Feature Satisfaction | > 4/5 |
| Time to First Value | < 2min |

---

### Métriques Business

#### Acquisition
| Métrique | Target Mois 6 |
|----------|---------------|
| Serveurs connectés | 1,000 |
| Avg Serveurs per User | 2.5 |
| Organic Growth Rate | 20% MoM |

#### Conversion (Phase Premium)
| Métrique | Target |
|----------|--------|
| Free to Paid | 5% |
| Trial to Paid | 25% |
| Churn Rate | < 5% monthly |

---

## 🔧 Spécifications Techniques

### Stack Technologique

#### Frontend
- **Framework** : Angular 20
- **UI Library** : PrimeNG (latest)
- **Styling** : TailwindCSS + SCSS
- **Charts** : Chart.js + PrimeNG p-chart wrapper
- **State Management** : Services (Facade pattern) + Signals
- **HTTP** : HttpClient avec intercepteurs
- **Real-time** : WebSocket (Socket.io-client)
- **Forms** : Reactive Forms
- **Routing** : Angular Router avec guards
- **Icons** : PrimeIcons + Lucide Angular

#### Build & Tools
- **Build** : Angular CLI + Nx (monorepo)
- **Package Manager** : npm
- **Linting** : ESLint + Prettier
- **Testing** : Jest (unit) + Cypress (e2e)
- **CI/CD** : GitHub Actions

---

### Architecture Services

#### Pattern Facade

```typescript
// Structure type
/src/app/services/
├── analytics/
│   ├── analytics.facade.ts       // Public API
│   ├── analytics-api.service.ts  // HTTP calls
│   └── analytics-data.service.ts // State management
├── moderation/
│   ├── moderation.facade.ts
│   ├── moderation-api.service.ts
│   └── moderation-data.service.ts
└── members/
    ├── members.facade.ts
    ├── members-api.service.ts
    └── members-data.service.ts
```

#### Exemple Implémentation

```typescript
// analytics.facade.ts
@Injectable({ providedIn: 'root' })
export class AnalyticsFacade {
  constructor(
    private api: AnalyticsApiService,
    private data: AnalyticsDataService
  ) {}
  
  // Exposer méthodes publiques simples
  getOverviewStats(guildId: string, period: string) {
    return this.api.getOverviewStats(guildId, period)
      .pipe(tap(stats => this.data.setOverviewStats(stats)));
  }
  
  // Observables pour components
  overviewStats$ = this.data.overviewStats$;
}

// analytics-api.service.ts
@Injectable({ providedIn: 'root' })
export class AnalyticsApiService {
  constructor(private http: HttpClient) {}
  
  getOverviewStats(guildId: string Endpoint** : `GET /api/guilds/:guildId/stats/dashboard-hero`

**Exemple UI** :
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 👥 Actifs   │ 💬 Messages │ 🎤 Vocal    │ 🛡️ Modération│
│ 234 (+12%)  │ 1,547 (-3%) │ 89 min (+8%)│ 3 actions   │
│ ▁▃▅▇█▇▅     │ ▃▅▃▆▅▄▅     │ ▁▂▃▂▁▃▄     │ ▁▁▁▃▁▁▁     │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

##### 1.2 Timeline Intelligente (Centre Gauche - 60% largeur)
**Composants PrimeNG** : `p-timeline` customisé

**Fonctionnalités** :
- Fusion chronologique :
  - Événements modération (ban, kick, warn)
  - Événements importants (milestones : 100e membre, 10k messages)
  - Changements serveur (nouveaux rôles, canaux créés)
  
- Filtres :
  - Type événement (modération, milestone, config)
  - Période (1h, 24h, 7j)
  - Recherche texte
  
- Interactions :
  - Clic événement → modal détails
  - Actions rapides (si modération : voir logs complets, contacter membre)

**API Endpoint** : `GET /api/guilds/:guildId/timeline?period=24h&types[]=moderation&types[]=milestone`

**Format événement** :
```typescript
interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'moderation' | 'milestone' | 'config' | 'member';
  icon: string;
  color: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  relatedEntities?: {
    userId?: string;
    moderatorId?: string;
    channelId?: string;
  };
  actionable: boolean; // Si true, affiche bouton "Voir détails"
}
```

##### 1.3 Alertes & Recommandations (Centre Droite - 40% largeur)
**Composants PrimeNG** : `p-card` avec `p-message` custom

**KILLER FEATURE** : Système intelligent d'alertes

**Types d'alertes** :

1. **Anomalies** (⚠️ Warning)
   - "Pic inhabituel de messages dans #général (3x la normale)"
   - "Taux de départ membres élevé aujourd'hui (8 vs moyenne 2)"
   - "Canal #aide sans réponse depuis 12h avec 5 questions en attente"

2. **Recommandations** (💡 Info)
   - "5 nouveaux membres en 1h, activer vérification renforcée ?"
   - "@ActiveUser a 500+ messages sans rôle, proposer 'Contributeur' ?"
   - "Canal #ancien-projet inactif depuis 30j, archiver ?"

3. **Opportunités** (✨ Success)
   - "Serveur a atteint 500 membres ! Créer annonce ?"
   - "@TopInviter a invité 20 membres actifs, le récompenser ?"

4. **Urgences** (🚨 Danger)
   - "Pattern spam détecté : 10 messages identiques en 2min"
   - "Possible raid : 15 membres ont rejoint en 5min"

**Système de règles** :
```typescript
interface AlertRule {
  id: string;
  name: string;
  type: 'anomaly' | 'recommendation' | 'opportunity' | 'emergency';
  condition: string; // Expression évaluable
  message: string;
  actionable: boolean;
  actions?: Array<{
    label: string;
    handler: string; // Nom fonction à appeler
  }>;
  enabled: boolean;
  severity: 1 | 2 | 3; // Pour tri
}
```

**API Endpoints** :
- `GET /api/guilds/:guildId/alerts` - Récupérer alertes actives
- `POST /api/guilds/:guildId/alerts/:alertId/dismiss` - Dismiss alerte
- `POST /api/guilds/:guildId/alerts/:alertId/action` - Exécuter action proposée

##### 1.4 Widgets Personnalisables (Bottom Section)
**Composants PrimeNG** : Grid avec `p-card` draggable

**Widgets disponibles** :

1. **Top Channels (24h)**
   - Liste 5 canaux les plus actifs
   - Nombre messages + graph mini

2. **Leaderboard Mini**
   - Top 5 membres actifs
   - Avatars + scores

3. **Graph Activité (7j)**
   - Chart.js line chart
   - Messages + Vocal combinés

4. **Prochains Events** (si scheduled events)
   - Liste événements Discord programmés

5. **Quick Actions**
   - Boutons rapides : "Nouveau ban", "Voir rapports", "Export stats"

6. **Serveur Stats**
   - Total membres, online, roles, channels
   - Infos serveur niveau, boosts

**Fonctionnalités** :
- Drag & drop pour réorganiser (Angular CDK Drag Drop)
- Toggle show/hide widgets
- Save layout dans preferences user

**API Endpoint** : 
- `GET /api/guilds/:guildId/dashboard/widgets`
- `PUT /api/users/me/dashboard-layout` - Sauvegarder préférences

**Storage préférences** :
```typescript
interface DashboardLayout {
  userId: string;
  guildId: string;
  widgets: Array<{
    id: string;
    type: string;
    position: { row: number; col: number };
    size: { width: number; height: number };
    visible: boolean;
    config?: Record<string, any>;
  }>;
}
```

---

### 📊 2. Analytics & Statistics

**Route** : `/guilds/:guildId/analytics/*`

**Objectif** : Deep-dive dans les données pour insights approfondis.

#### 2.1 Vue d'ensemble (`/analytics/overview`)

##### Graph Activité Principal
**Composant** : Chart.js Multi-line chart (wrapper PrimeNG `p-chart`)

**Données** :
- 3 lignes : Messages, Minutes Vocal, Réactions
- Période sélectionnable : 7j / 30j / 90j / 1 an
- Granularité adaptative : 
  - 7j → par heure
  - 30j → par jour
  - 90j+ → par semaine

**Interactions** :
- Hover → tooltip détaillé
- Clic point → drill-down ce jour
- Toggle lignes on/off

##### Breakdown Cards
**Composants** : `p-card` grid

**Métriques** :
- **Messages**
  - Total période
  - Moyenne/jour
  - Peak day
  - Canaux contributeurs (top 3)
  
- **Vocal**
  - Total minutes
  - Membres uniques
  - Moyenne durée session
  - Canaux populaires
  
- **Réactions**
  - Total réactions
  - Top 5 emojis
  - Réactions/message ratio

##### Comparaison Périodes
**Composant** : Tableau custom

**Fonctionnalités** :
- Comparer 2 périodes custom
- Métriques côte à côte avec % différence
- Highlight améliorations/détériorations

**API Endpoint** : `GET /api/guilds/:guildId/analytics/overview?period=30d`

##### Export Données
**Composant** : `p-button` avec menu

**Formats disponibles** :
- CSV (raw data)
- PDF (rapport visuel avec graphs)
- JSON (pour intégrations)

**API Endpoint** : `POST /api/guilds/:guildId/analytics/export`

---

#### 2.2 Analyse par Membre (`/analytics/members`)

**KILLER FEATURE** : Vue la plus complète du marché sur les membres.

##### Tableau Avancé
**Composant** : `p-table` avec features avancées

**Colonnes** :
- Avatar + Username
- Messages (7j / 30j / total)
- Minutes Vocal (7j / 30j / total)
- Réactions données
- Réactions reçues
- Invitations amenées (actives)
- Score Activité (formule pondérée)
- Rôles (badges)
- Date join
- Dernière activité
- Status (insights badge)

**Score Activité Formule** :
```typescript
activityScore = (messages * 1) + (voiceMinutes * 0.5) + (reactions * 0.3) + (invites * 5)
```

**Filtres Avancés** :
- Recherche nom/ID
- Par rôle (multi-select)
- Par période join
- Par niveau activité (très actif / actif / peu actif / inactif)
- Par statut insight ("Mérite rôle", "Inactif", "Top contributeur", etc.)

**Tri** : Toutes colonnes triables

**Actions Bulk** :
- Sélection multiple membres
- Assign role
- Remove role
- Export sélection
- Ajouter à segment

##### Vue Détaillée Membre
**Route** : `/analytics/members/:memberId`

**Layout** : Modal ou page dédiée

**Sections** :

###### Header Card
- Avatar, Username, Discriminator, ID
- Rôles (badges couleurs)
- Date join serveur
- Status Discord (online/idle/dnd/offline)
- Boost status (si boost)

###### Onglet "Activité"
**Composants** : Charts + stats

- **Timeline Activité (30j)**
  - Graph messages + vocal par jour
  - Annotations événements importants
  
- **Breakdown Activité**
  - Messages par canal (donut chart)
  - Heures préférées (heatmap 24h)
  - Jours préférés (bar chart)
  
- **Stats Détaillées**
  - Messages total / moyenne par jour / jour le plus actif
  - Vocal total / sessions / durée moyenne session
  - Réactions données / reçues / top emojis utilisés

###### Onglet "Historique"
**Composant** : `p-timeline`

- **Actions Modération Subies**
  - Liste chronologique bans/kicks/warns
  - Modérateur, raison, date
  
- **Changements Rôles**
  - Ajouts/retraits rôles avec dates
  
- **Changements Nickname**
  - Historique pseudos
  
- **Invitations**
  - Membres invités (avec status restés/partis)

###### Onglet "Permissions"
**Composant** : Tableau recap

- Liste permissions héritées via rôles
- Highlighting permissions dangereuses (admin, ban, manage server)
- Permissions par canal (override)

###### Onglet "Notes"
**Composant** : Editor custom

- Notes privées staff
- Markdown support
- Historique éditions
- Qui a écrit quoi

**API Endpoints** :
- `GET /api/guilds/:guildId/members/:memberId/profile`
- `GET /api/guilds/:guildId/members/:memberId/activity?period=30d`
- `GET /api/guilds/:guildId/members/:memberId/history`
- `GET /api/guilds/:guildId/members/:memberId/notes`
- `POST /api/guilds/:guildId/members/:memberId/notes`

##### Insights Automatiques Membres
**Algorithme** : Système de règles backend

**Types insights** :

1. **"Top Contributeur"** (badge vert)
   - Condition : Top 5% activité sur 30j

2. **"Mérite un Rôle"** (badge bleu)
   - Condition : Score activité > threshold ET aucun rôle communauté

3. **"Inactif"** (badge jaune)
   - Condition : Aucune activité depuis 30j

4. **"Risque Départ"** (badge orange)
   - Condition : Activité en baisse 50%+ sur 2 semaines

5. **"Nouveau & Actif"** (badge violet)
   - Condition : Join < 7j ET déjà 50+ messages

6. **"À Surveiller"** (badge rouge)
   - Condition : Warns récents OU pattern spam

**API Endpoint** : `GET /api/guilds/:guildId/members/insights`

##### Segments Personnalisés
**Composant** : Segment builder UI

**Fonctionnalité** : Créer groupes membres dynamiques

**Exemple segments** :
- "Nouveaux membres" : Join < 7j
- "Inactifs" : Dernière activité > 30j
- "Super actifs sans rôle" : Top 20% activité ET pas de rôle spécial
- "Boosters" : Boost status = true
- "Modérateurs actifs" : Role "Mod" ET actions modération > 10

**Builder UI** :
- Conditions multiples (AND/OR)
- Filtres : Rôles, dates, métriques activité, etc.
- Preview nombre membres matching
- Sauvegarder segment pour réutilisation

**Actions sur Segments** :
- Export liste
- Assign role bulk
- Send message (via bot DM ou channel mention)
- Créer alerte si segment grossit

**API Endpoints** :
- `POST /api/guilds/:guildId/segments` - Créer segment
- `GET /api/guilds/:guildId/segments/:segmentId/members` - Récupérer membres
- `POST /api/guilds/:guildId/segments/:segmentId/action` - Action bulk

---

#### 2.3 Analyse par Canal (`/analytics/channels`)

##### Vue Liste Canaux
**Composant** : `p-table` ou cards grid

**Colonnes/Infos** :
- Nom canal + catégorie
- Type (text/voice/stage)
- Messages 24h / 7j / 30j
- Membres actifs uniques
- Temps vocal total (si voice)
- Dernière activité
- Status insight

##### Heatmap Activité
**Composant** : Custom heatmap (Chart.js matrix)

**Axes** :
- X : Heure de la journée (0-23h)
- Y : Canaux
- Couleur : Intensité activité (messages ou minutes vocal)

**Interactions** :
- Hover → nombre exact messages/vocal
- Clic cellule → drill-down activité ce canal/heure

##### Stats Détaillées par Canal
**Vue** : Clic canal → panel slide ou modal

**Sections** :
- **Métriques Générales**
  - Total messages all-time
  - Messages moyens/jour
  - Pic historique (date + nombre)
  
- **Top Contributeurs**
  - Top 10 membres plus actifs ce canal
  - % contribution
  
- **Patterns Temporels**
  - Heures pics (bar chart)
  - Jours pics (line chart)
  
- **Engagement**
  - Taux réponse (threads, replies)
  - Réactions moyennes par message

##### Insights Canaux
**Types** :

1. **"Canal Mort"** (badge rouge)
   - Condition : Aucun message depuis 15j

2. **"Sous-utilisé"** (badge orange)
   - Condition : < 5 messages/jour ET < 10% membres actifs

3. **"Très Populaire"** (badge vert)
   - Condition : Top 3 canaux activité

4. **"Pic Inhabituel"** (badge bleu alerte)
   - Condition : Activité 2x+ normale

5. **"À Archiver"** (suggestion)
   - Condition : Inactif > 30j ET pas de pins/threads importants

**Recommandations Automatiques** :
- "Canal #random et #discussion ont des thèmes similaires, fusionner ?"
- "Canal #aide a 20 questions non répondues, assigner modérateurs ?"
- "Créer canal #memes ? 30% messages #général sont des memes"

**API Endpoints** :
- `GET /api/guilds/:guildId/analytics/channels`
- `GET /api/guilds/:guildId/analytics/channels/:channelId/details`
- `GET /api/guilds/:guildId/analytics/channels/heatmap?period=7d`

---

#### 2.4 Analyse Temporelle (`/analytics/temporal`)

##### Heatmap Globale Serveur
**Composant** : Heatmap 7x24 (Chart.js)

**Axes** :
- X : Heures (0-23h)
- Y : Jours semaine (Lun-Dim)
- Couleur : Activité globale (messages + vocal)

**Insights Visibles** :
- "Pics réguliers samedi 18-22h"
- "Creux tous les matins 6-10h"

##### Graph Patterns Jour Semaine
**Composant** : Bar chart comparatif

**Données** :
- Activité moyenne par jour semaine
- Comparaison weekend vs semaine
- Highlight jours exceptionnels

##### Prédictions (KILLER FEATURE)
**Algorithme** : Analyse patterns historiques + ML simple

**Prédictions affichées** :
- "Pics attendus samedi 18-22h (+200% activité moyenne)"
- "Probable creux dimanche soir"
- "Tendance croissance : +15% activité vs mois dernier"

**UI** : Timeline future avec zones prédites + confidence interval

**API Endpoint** : `GET /api/guilds/:guildId/analytics/predictions?horizon=7d`

##### Export Rapports Planifiés
**Fonctionnalité** : Générer rapports auto

**Configuration** :
- Fréquence : Quotidien / Hebdo / Mensuel
- Format : PDF / Email
- Contenu : Sections à inclure
- Destinataires : Emails ou channel Discord

**API Endpoint** : `POST /api/guilds/:guildId/analytics/scheduled-reports`

---

#### 2.5 Leaderboards (`/analytics/leaderboards`)

##### Navigation Tabs
**Composant** : `p-tabView`

**Tabs disponibles** :
1. Messages
2. Vocal
3. Activité Globale
4. Invitations
5. Réactions Données
6. Réactions Reçues (popularité)

##### Filtres Communs
- **Période** : 7j / 30j / All-time
- **Rôle** : Tous / Filtrer par rôle
- **Limite** : Top 10 / 20 / 50 / 100

##### Format Leaderboard
**Composant** : `p-dataView` ou custom cards

**Éléments par entrée** :
- Position (médaille or/argent/bronze top 3)
- Avatar
- Username + discriminator
- Métrique principale (nombre)
- Barre progression visuelle
- Badge récompense si applicable

##### Récompenses Visuelles
**Système badges** :

- 🥇 **Champion** : #1
- 🥈 **Vice-Champion** : #2
- 🥉 **Podium** : #3
- 🔥 **Streak** : Top 10 pendant 7j consécutifs
- ⭐ **Rising Star** : +50 positions en 7j
- 👑 **Legend** : Top 5 all-time

**Affichage** : Badges à côté username

##### Comparaison Personnelle (si user membre)
**UI Element** : Card surlignée

- "Vous êtes #42 avec 234 messages"
- "Vous avez progressé de 5 places cette semaine"
- Comparaison avec top : "Il vous manque 89 messages pour le top 10"

**API Endpoints** :
- `GET /api/guilds/:guildId/leaderboards/:type?period=30d&role=all&limit=50`
- `GET /api/guilds/:guildId/leaderboards/:type/position/:userId` - Position user

---

### 🛡️ 3. Modération

**Route** : `/guilds/:guildId/moderation/*`

**Objectif** : Centraliser gestion et historique modération.

#### 3.1 Dashboard Modération (`/moderation/dashboard`)

##### Stats Période
**Composants** : Cards + graphs

**Métriques** :
- **Actions Totales**
  - Cette semaine / Ce mois
  - Comparaison période précédente
  
- **Breakdown par Type**
  - Bans (permanent + temporaire)
  - Kicks
  - Warns
  - Unbans
  - Donut chart répartition

- **Graph Évolution**
  - Line chart 30j : actions par jour
  - Stacked bar : par type action

##### Timeline Actions Récentes
**Composant** : `p-timeline` scrollable

**Éléments** :
- Date/heure
- Type action (icone couleur)
- Membre concerné (avatar + nom)
- Modérateur
- Raison (truncated, expand on click)
- Actions rapides : Voir détails / Undo (si possible)

**Limite** : 50 dernières actions, pagination

##### Modérateurs Actifs
**Composant** : Tableau ou cards

**Données** :
- Top modérateurs par nombre actions
- Breakdown par type action
- Graphique contributions

##### Membres Sanctionnés
**Composant** : Tableau

**Colonnes** :
- Membre
- Nombre sanctions total
- Types sanctions
- Dernière sanction
- Status actuel (banni/actif/etc.)
- Actions : Voir historique

##### Alerts Modération
**Composant** : `p-message` custom

**Types alerts** :
- "⚠️ 5 sanctions en 1h, pic inhabituel"
- "🚨 Possible raid : 3 bans en 10min pour spam"
- "💡 Membre @User a 3 warns, considérer ban temporaire ?"

**API Endpoints** :
- `GET /api/guilds/:guildId/moderation/dashboard`
- `GET /api/guilds/:guildId/moderation/recent?limit=50`
- `GET /api/guilds/:guildId/moderation/stats?period=30d`

---

#### 3.2 Actions Rapides (`/moderation/actions`)

**KILLER FEATURE** : Modérer directement depuis l'app web.

##### Interface Action
**Layout** : Form structuré

**Sections** :

###### Sélection Membre(s)
**Composant** : `p-autoComplete` ou `p-multiSelect`

- Recherche par nom/ID
- Suggestions basées contexte
- Multi-sélection pour actions bulk
- Preview sélection (avatars)

###### Type Action
**Composant** : `p-selectButton` ou cards sélectables

**Options** :
- 🔨 **Ban** (permanent ou temporaire)
- 👢 **Kick**
- ⚠️ **Warn**
- ⏱️ **Timeout** (mute temporaire Discord)
- 🔓 **Unban**

###### Configuration Action
**Champs dynamiques selon type** :

**Pour Ban** :
- Duration (permanent / temporaire avec date picker)
- Delete message history (0, 1, 7 jours)
- Notify user (DM explication)

**Pour Warn** :
- Sévérité (1-3)
- Auto-escalate (après X warns → tempban)

**Pour Timeout** :
- Durée (5min / 10min / 1h / 1j / custom)

###### Raison
**Composant** : `p-dropdown` + `p-inputTextarea`

- Raisons pré-configurées (dropdown)
  - Ex: "Spam", "Propos inappropriés", "Flood", "Non-respect règles"
- Raison custom (textarea si "Autre")
- Raison visible dans audit log Discord + DB

###### Options Additionnelles
**Checkboxes** :
- Notify user (DM automatique via bot)
- Post in mod-log channel
- Add private note (interne staff)

##### Preview & Confirm
**Composant** : Dialog confirmation

**Affichage** :
- Résumé action : "Ban permanent @User pour 'Spam'"
- Impacts : "Member sera banni, recevra DM, suppression messages 7j"
- Confirm button (danger pour ban/kick)

##### Actions Bulk
**Fonctionnalité** : Sélection multiple membres

**Use cases** :
- Ban plusieurs raiders
- Warn multiple violateurs même règle
- Kick membres inactifs

**UI** : 
- Tableau sélection multiple
- Form identique mais appliqué à tous
- Preview liste impactée avant confirm

**API Endpoints** :
- `POST /api/guilds/:guildId/moderation/ban`
- `POST /api/guilds/:guildId/moderation/kick`
- `POST /api/guilds/:guildId/moderation/warn`
- `POST /api/guilds/:guildId/moderation/timeout`
- `POST /api/guilds/:guildId/moderation/unban`
- `POST /api/guilds/:guildId/moderation/bulk` - Actions bulk

**DTO Exemple** :
```typescript
interface ModerationActionDTO {
  action: 'ban' | 'kick' | 'warn' | 'timeout' | 'unban';
  targetUserIds: string[];
  reason: string;
  config?: {
    duration?: number; // milliseconds, null = permanent
    deleteMessageDays?: 0 | 1 | 7;
    notifyUser?: boolean;
    severity?: 1 | 2 | 3; // Pour warns
    postInModLog?: boolean;
    privateNote?: string;
  };
}
```

---

#### 3.3 Logs Complets (`/moderation/logs`)

##### Interface Filtres Avancés
**Composant** : `p-panel` collapsible avec form

**Filtres disponibles** :
- **Type Action** : Multi-select (ban/kick/warn/etc.)
- **Période** : Date range picker
- **Modérateur** : Autocomplete membre staff
- **Membre Ciblé** : Autocomplete tous membres
- **Raison** : Text search (recherche dans raisons)
- **Status** : Actif / Révoqué / Expiré

**Actions** :
- Apply filters
- Reset filters
- Save filter preset (pour réutilisation)

##### Tableau Logs
**Composant** : `p-table` avec pagination

**Colonnes** :
- Date/Heure (tri par défaut desc)
- Type (badge couleur)
- Membre ciblé (avatar + nom)
- Modérateur (avatar + nom)
- Raison (truncated, expand on hover)
- Durée (si applicable)
- Status (actif/expiré/révoqué)
- Actions

**Actions par ligne** :
- 👁️ Voir détails complets
- 🔄 Révoquer action (si applicable : unban, remove warn)
- 📝 Ajouter note
- 📋 Copier ID log

##### Détails Log (Modal)
**Composant** : `p-dialog`

**Informations complètes** :
- **Header** : Type action + date
- **Participants** :
  - Membre ciblé (card avec infos)
  - Modérateur (card avec infos)
- **Détails** :
  - Raison complète
  - Configuration (durée, delete messages, etc.)
  - Timestamp exact
  - Expiration (si applicable)
- **Historique** :
  - Si révoqué : par qui, quand, pourquoi
  - Si modifié : changelog
- **Notes** :
  - Notes privées staff associées
- **Actions Disponibles** :
  - Révoquer
  - Ajouter note
  - Export ce log

##### Export Logs
**Fonctionnalité** : Exporter résultats filtrés

**Formats** :
- CSV : Table brute
- PDF : Rapport formaté avec filtres appliqués
- JSON : Raw data

**API Endpoints** :
- `GET /api/guilds/:guildId/moderation/logs?filters`
- `GET /api/guilds/:guildId/moderation/logs/:logId`
- `POST /api/guilds/:guildId/moderation/logs/:logId/revoke`
- `POST /api/guilds/:guildId/moderation/logs/:logId/note`
- `POST /api/guilds/:guildId/moderation/logs/export`

---

#### 3.4 Rapports Membres (`/moderation/reports`)

**KILLER FEATURE** : Système de signalement structuré.

##### Workflow Rapports

###### 1. Création Rapport (via commande bot)
**Commande Discord** : `/report @user raison`

**Flow** :
- Membre utilise commande
- Bot envoie rapport au backend
- Backend crée ticket dans table `moderation_reports`
- Notif envoyée aux modérateurs

###### 2. Interface Triage (Web App)

**Vue Liste Rapports**
**Composant** : `p-table` avec status badges

**Colonnes** :
- ID Rapport
- Date création
- Auteur rapport (qui a signalé)
- Membre signalé
- Raison (truncated)
- Sévérité (auto-calculée ou manuelle)
- Status (Open / In Progress / Resolved / Rejected)
- Assigné à (modérateur)
- Actions

**Filtres** :
- Status
- Sévérité
- Date
- Assigné à moi (checkbox)

**Actions Bulk** :
- Assigner en masse
- Marquer comme traité
- Supprimer (spam reports)

###### 3. Détails Rapport (Modal ou page)

**Composant** : Layout custom

**Sections** :

**Header** :
- Status badge
- Sévérité indicator
- Date création
- ID unique

**Participants** :
- **Auteur** : Qui a signalé (card membre)
- **Signalé** : Membre concerné (card membre + lien vers profil)
- **Assigné** : Modérateur en charge (assignable)

**Contenu** :
- Raison fournie (texte complet)
- Contexte additionnel (si fourni)
- Messages liés (si report sur message spécifique)
  - Affichage message Discord concerné
  - Lien jump Discord

**Historique Actions** :
- Timeline des actions prises
- Changements status
- Notes ajoutées

**Actions Disponibles** :
- **Assign to me**
- **Change status** (dropdown)
- **Take action** : Ban/Kick/Warn direct depuis rapport
- **Add note** (interne)
- **Reject report** (spam/invalide)
- **Contact reporter** (DM via bot)

**API Endpoints** :
- `GET /api/guilds/:guildId/moderation/reports?status=open`
- `GET /api/guilds/:guildId/moderation/reports/:reportId`
- `PUT /api/guilds/:guildId/moderation/reports/:reportId/assign`
- `PUT /api/guilds/:guildId/moderation/reports/:reportId/status`
- `POST /api/guilds/:guildId/moderation/reports/:reportId/action`

**DTO Report** :
```typescript
interface ModerationReport {
  id: string;
  guildId: string;
  reporterId: string; // Qui a signalé
  targetUserId: string; // Qui est signalé
  reason: string;
  context?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'rejected';
  assignedTo?: string; // Modérateur ID
  relatedMessageId?: string;
  relatedChannelId?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  notes: Array<{
    authorId: string;
    content: string;
    timestamp: Date;
  }>;
  actions: Array<{
    type: string;
    timestamp: Date;
    moderatorId: string;
  }>;
}
```

##### Stats Rapports
**Composant** : Cards dashboard

**Métriques** :
- Rapports ouverts
- Rapports traités cette semaine
- Temps moyen résolution
- Top raisons rapports
- Taux rejection (spam reports)

---

#### 3.5 Auto-modération (Phase 2)

**Page placeholder** avec "Coming Soon" + roadmap

**Features prévues** :
- Règles anti-spam configurable
- Détection flood (messages rapides)
- Filtres mots interdits (regex support)
- Filtres liens (whitelist/blacklist)
- Anti-caps lock (% majuscules)
- Anti-mention spam
- Actions auto (warn/timeout/kick)

---

### 👥 4. Membres

**Route** : `/guilds/:guildId/members`

**Objectif** : Explorer et gérer la communauté en profondeur.

#### 4.1 Liste Membres (`/members/list`)

##### Vue Toggle
**Composant** : Toggle button

**Vues disponibles** :
- **Grille** (cards avec avatars) - Visuel
- **Tableau** (data table) - Détaillé

##### Filtres Puissants
**Composant** : Sidebar ou panel top

**Filtres** :
- **Recherche** : Nom/Username/ID
- **Rôles** : Multi-select checkboxes
- **Date Join** : Range picker
- **Activité** :
  - Très actif / Actif / Peu actif / Inactif
  - Custom threshold
- **Status Discord** : Online / Idle / DND / Offline
- **Boost Status** : Is Booster (checkbox)
- **Permissions** : Has admin / Has ban / etc.
- **Segments** : Saved segments (dropdown)

##### Vue Grille
**Composant** : Grid responsive (PrimeNG `p-dataView`)

**Cards membres** :
- Avatar (large)
- Username + discriminator
- Rôles (badges, max 3 visibles + "+2")
- Quick stats mini :
  - Messages 30j
  - Vocal 30j
- Status indicator (colored dot)
- Boost badge (if applicable)
- Quick actions (hover) :
  - View profile
  - Send DM (via bot)
  - Quick ban/kick

##### Vue Tableau
**Composant** : `p-table` full-featured

**Colonnes** :
- Select (checkbox pour bulk actions)
- Avatar (thumb)
- Username
- Display Name (si différent)
- ID
- Rôles (truncated list)
- Join Date
- Messages (7j/30j)
- Vocal (7j/30j)
- Last Activity
- Status
- Actions

**Tri** : Toutes colonnes

**Pagination** : 25/50/100 par page

##### Actions Bulk
**Composant** : Action bar (apparaît si sélection)

**Actions disponibles** :
- Assign role
- Remove role
- Export selected
- Add to segment
- Send message (bulk DM via bot)
- Ban/Kick (confirmation stricte)

##### Quick Stats Header
**Composant** : Stats bar au-dessus liste

**Métriques affichées** :
- Total membres
- Online now
- New this week
- Boosters count
- Avec filtres actifs, stats s'adaptent

**API Endpoints** :
- `GET /api/guilds/:guildId/members?filters&page&limit`
- `GET /api/guilds/:guildId/members/stats?filters`
- `POST /api/guilds/:guildId/members/bulk-action`

---

#### 4.2 Profil Membre Détaillé (`/members/:memberId`)

**Voir section 2.2 "Analyse par Membre"** pour détails complets.

**Routing** : Accessible depuis liste membres ou analytics.

**Layout** : Page dédiée ou modal large

---

#### 4.3 Groupes & Segments (`/members/segments`)

##### Liste Segments Sauvegardés
**Composant** : Cards ou table

**Informations par segment** :
- Nom segment
- Description
- Conditions (résumé)
- Nombre membres actuels (live count)
- Date création
- Actions :
  - View members
  - Edit conditions
  - Duplicate
  - Delete

##### Segment Builder
**Composant** : Visual query builder

**Interface** :
- Add condition (button)
- Conditions list :
  - Field (dropdown : Role / JoinDate / Activity / etc.)
  - Operator (dropdown : equals / greater than / etc.)
  - Value (input adapté au field)
  - Remove condition (icon)
- Logic operator (AND / OR) entre conditions
- Preview count (live)

**Exemple visuel** :
```
┌─────────────────────────────────────────────────────┐
│ Segment : "Membres actifs sans rôle"                │
├─────────────────────────────────────────────────────┤
│ IF Role NOT_EQUALS "@everyone" (exclude base role)  │
│ AND Messages30d GREATER_THAN 50                     │
│ AND HasCommunityRole EQUALS false                   │
├─────────────────────────────────────────────────────┤
│ ✓ 47 membres correspondent                          │
│ [Preview Members] [Save Segment]                    │
└─────────────────────────────────────────────────────┘
```

##### Actions sur Segments
**Composant** : Action panel

**Actions** :
- **View members** : Ouvre liste filtrée
- **Export** : CSV avec infos membres
- **Assign role** : Bulk assign à tous membres segment
- **Send message** : Bulk DM ou mention
- **Create alert** : Notif si segment size > threshold

##### Segments Prédéfinis (Templates)
**Composant** : Template gallery

**Templates fournis** :
- "Nouveaux membres" (Join < 7j)
- "Membres inactifs" (No activity > 30j)
- "Top contributeurs" (Top 10% activity)
- "Boosters"
- "Sans rôle communauté"
- "À risque départ" (Declining activity)

**Action** : "Use template" → pré-remplit segment builder

**API Endpoints** :
- `GET /api/guilds/:guildId/segments`
- `POST /api/guilds/:guildId/segments` - Create
- `GET /api/guilds/:guildId/segments/:segmentId/members`
- `PUT /api/guilds/:guildId/segments/:segmentId`
- `POST /api/guilds/:guildId/segments/:segmentId/action`

---

### 📢 5. Canaux

**Route** : `/guilds/:guildId/channels`

**Objectif** : Organisation et optimisation structure serveur.

#### 5.1 Vue d'ensemble (`/channels/overview`)

##### Arborescence Canaux
**Composant** : Tree view interactive (PrimeNG `p-tree` ou custom)

**Structure** :
- Catégories (expandable)
  - Canaux text (icon 💬)
  - Canaux voice (icon 🎤)
  - Canaux stage (icon 🎙️)
  - Canaux forum (icon 📝)

**Informations inline** :
- Messages 24h (pour text)
- Membres actifs (pour voice)
- Status (🔒 privé / 🔓 public)

**Actions par canal (right-click ou hover menu)** :
- View details
- Edit settings
- View analytics
- Archive
- Clone
- Delete (confirmation)

##### Quick Stats Overview
**Composant** : Cards row

**Métriques** :
- Total channels
- Text / Voice / Stage / Forum breakdown
- Most active (24h)
- Least active (30j)
- Private channels count

##### Insights Canaux
**Composant** : Alert panel

**Messages affichés** :
- "⚠️ 3 canaux sans activité depuis 30j"
- "💡 #random et #général ont des thèmes similaires"
- "✨ Canal #aide a un temps de réponse moyen excellent (< 5min)"

**Actions** : Clic insight → drill-down ou action directe

##### Actions Bulk
**Composant** : Toolbar

**Actions** :
- Create new channel (modal)
- Create category
- Bulk edit permissions (sélection multiple)
- Archive unused (assistant)

**API Endpoints** :
- `GET /api/guilds/:guildId/channels/tree`
- `GET /api/guilds/:guildId/channels/stats`
- `GET /api/guilds/:guildId/channels/insights`

---

#### 5.2 Configuration Canal (`/channels/:channelId`)

##### Header Info
**Composant** : Page header

**Éléments** :
- Type icon + Nom canal
- Catégorie parent
- Status (🔒/🔓)
- Quick actions :
  - View in Discord (external link)
  - Clone channel
  - Delete channel

##### Onglets Configuration

###### Tab "Général"
**Composant** : Form

**Champs** :
- Nom canal
- Description (topic)
- Catégorie parent (dropdown)
- Position (number input, avec preview ordre)
- NSFW (toggle)
- Slowmode (dropdown : off / 5s / 10s / 30s / 1min / etc.)

###### Tab "Permissions"
**Composant** : Permissions matrix (KILLER FEATURE)

**Layout** : Tableau interactif

**Axes** :
- Colonnes : Permissions (Send Messages, Read, etc.)
- Lignes : Rôles + Membres avec overrides

**Cells** :
- ✅ Green : Allowed
- ❌ Red : Denied
- ⚪ Gray : Neutral (inherited)

**Interactions** :
- Clic cell → toggle entre allowed/denied/neutral
- Hover cell → tooltip explication permission
- Filter roles/members (search)

**Features avancées** :
- "Copy permissions from..." (autre canal)
- "Reset to category defaults"
- Highlight conflicts (ex: membre denied alors que rôle allowed)

**Vue Alternative** : List view
- Liste rôles/membres
- Par ligne : expand → permissions détaillées

###### Tab "Webhooks"
**Composant** : Table + create form

**Liste webhooks** :
- Nom webhook
- Avatar
- Created by
- Channel (si multicanal)
- URL (copy button, masked)
- Actions : Edit / Delete / Test

**Create webhook** :
- Name input
- Avatar upload (optionnel)
- Create button → génère URL

###### Tab "Analytics"
**Composant** : Charts + stats

**Métriques** :
- Messages 7j/30j (line chart)
- Top contributors (bar chart)
- Heures actives (heatmap)
- Engagement rate (réactions/message)

**Voir section 2.3** pour détails analytics canaux.

##### Sidebar Info
**Composant** : Sticky sidebar

**Quick Info** :
- Created date
- Created by
- Member count (with access)
- Last message (timestamp)
- Total messages all-time

**API Endpoints** :
- `GET /api/guilds/:guildId/channels/:channelId`
- `PUT /api/guilds/:guildId/channels/:channelId` - Update settings
- `GET /api/guilds/:guildId/channels/:channelId/permissions`
- `PUT /api/guilds/:guildId/channels/:channelId/permissions`
- `GET /api/guilds/:guildId/channels/:channelId/webhooks`
- `POST /api/guilds/:guildId/channels/:channelId/webhooks`

---

### 🎭 6. Rôles & Permissions

**Route** : `/guilds/:guildId/roles`

**Objectif** : Gestion claire et visuelle des rôles et permissions.

#### 6.1 Liste Rôles (`/roles/list`)

##### Vue Rôles
**Composant** : Cards draggable ou table

**Informations par rôle** :
- Couleur (dot ou badge)
- Nom
- Position (nombre)
- Members count
- Permissions count
- Hoisted (affichage séparé)
- Mentionable
- Managed (bot-managed badge)
- Actions

**Tri** : Par position (hiérarchie Discord native)

##### Drag & Drop Hiérarchie (KILLER FEATURE)
**Composant** : Sortable list (Angular CDK Drag Drop)

**Fonctionnalité** :
- Drag rôle pour changer position
- Visual feedback pendant drag
- Warning si change impacte bot/admin permissions
- Auto-save après drop
- Undo disponible

**Contraintes** :
- Cannot move managed roles
- Cannot move above bot's top role

##### Actions Rôle
**Actions disponibles** :
- Edit role (modal)
- View members with role
- Duplicate role
- Delete role (confirmation + check dependencies)

##### Create New Role
**Composant** : Modal ou page

**Étapes** :
1. Basic info (nom, couleur, icon si dispo)
2. Display settings (hoist, mentionable)
3. Permissions (checkboxes organisées)
4. Review & create

**API Endpoints** :
- `GET /api/guilds/:guildId/roles`
- `POST /api/guilds/:guildId/roles` - Create
- `PUT /api/guilds/:guildId/roles/:roleId` - Update
- `DELETE /api/guilds/:guildId/roles/:roleId`
- `PUT /api/guilds/:guildId/roles/reorder` - Drag & drop

---

#### 6.2 Éditeur Permissions (`/roles/permissions`)

**KILLER FEATURE** : Matrice visuelle permissions

##### Matrix View
**Composant** : Table interactive large

**Axes** :
- **Colonnes** : Rôles (scrollable horizontal)
- **Lignes** : Permissions (groupées par catégorie)

**Catégories permissions** :
- General (Administrator, View Audit Log, etc.)
- Membership (Kick, Ban, etc.)
- Text Channels
- Voice Channels
- Events
- etc.

**Cells** :
- ✅ Green checkbox : Permission granted
- ⬜ Gray checkbox : Permission not granted
- 🔒 Lock icon : Cannot modify (admin role ou bot-managed)

**Interactions** :
- Clic cell → toggle permission
- Hover cell → tooltip permission description
- Select column (role) → highlight colonne
- Select row (permission) → highlight ligne

##### Comparaison Côte à Côte
**Composant** : Split view

**Fonctionnalité** :
- Sélectionner 2-3 rôles
- Affichage colonnes côte à côte
- Highlight différences
- Use case : "Comparer Modérateur vs Admin"

##### Détection Conflits
**Composant** : Alert panel

**Détection** :
- Rôle inférieur a permission que supérieur n'a pas (warning)
- Rôle sans administrator mais a permissions dangereuses (warning)
- Membre a plusieurs rôles avec permissions conflictuelles

**Actions** : Fix suggestions

##### Templates Rôles
**Composant** : Template selector

**Templates fournis** :
- "Modérateur Standard" (ban, kick, manage messages, mute)
- "Modérateur Junior" (timeout, warn only)
- "Admin" (administrator)
- "Membre VIP" (mention everyone, external emojis, etc.)
- "Streamer" (voice priority, stream, video)

**Action** : Apply template → configure permissions automatiquement

**API Endpoints** :
- `GET /api/guilds/:guildId/roles/permissions-matrix`
- `PUT /api/guilds/:guildId/roles/:roleId/permissions`
- `GET /api/guilds/:guildId/roles/conflicts`
- `GET /api/guilds/:guildId/roles/templates`

---

### 🎫 7. Invitations

**Route** : `/guilds/:guildId/invitations`

**Objectif** : Tracking et optimisation croissance.

#### 7.1 Leaderboard (`/invitations/leaderboard`)

##### Top Inviters
**Composant** : Leaderboard cards

**Données par inviter** :
- Position (médaille top 3)
- Avatar + username
- Total invites utilisées
- Membres restés (vs left)
- Taux rétention (% restés > 7j)
- Invites actives (codes actifs)

**Tri** : Par invites utilisées (default) ou par rétention

##### Filtres
- Période : 7j / 30j / All-time
- Include left members (toggle)

**API Endpoint** : `GET /api/guilds/:guildId/invitations/leaderboard?period=30d`

---

#### 7.2 Analytics (`/invitations/analytics`)

##### Graph Croissance
**Composant** : Chart.js line chart

**Données** :
- Nouvelles invitations par jour (30j)
- Membres restés vs partis (stacked area)

##### Métriques Clés
**Composant** : Stats cards

**Métriques** :
- Total invites utilisées (période)
- New members (période)
- Left members (période)
- Taux rétention global
- Source la plus efficace (code invite)

##### Taux Rétention (KILLER FEATURE)
**Composant** : Funnel chart

**Étapes** :
1. Invited (100%)
2. Stayed > 24h (X%)
3. Stayed > 7j (X%)
4. Stayed > 30j (X%)

**Insights** :
- "Taux rétention 7j : 65% (moyenne industrie 50%)"
- "Amélioration +10% vs mois dernier"

##### Top Codes Invites
**Composant** : Table

**Colonnes** :
- Code
- Creator
- Uses
- Max uses (si limité)
- Expires (si limité)
- Retention rate

**API Endpoints** :
- `GET /api/guilds/:guildId/invitations/analytics?period=30d`
- `GET /api/guilds/:guildId/invitations/retention`
- `GET /api/guilds/:guildId/invitations/top-codes`

---

#### 7.3 Gestion Codes (`/invitations/codes`)

##### Liste Codes Actifs
**Composant** : `p-table`

**Colonnes** :
- Code (copy button)
- Creator
- Channel target
- Created
- Expires
- Max uses
- Uses / Max uses
- Actions

**Actions par code** :
- View details
- Edit (expire, max uses)
- Pause (disable temporairement)
- Delete (revoke)
- Copy link

##### Create Invite
**Composant** : Modal form

**Champs** :
- Channel target (dropdown)
- Max age (dropdown : never / 30min / 1h / 6h / 12h / 1d / 7d)
- Max uses (input : unlimited ou nombre)
- Temporary member (toggle - kick si no role attribué)
- Unique (toggle - one-time use)

**Advanced** :
- Custom code (si guild a vanity URL unlocked)
- Campaign tracking (tag pour analytics)

##### Campagnes Tracking (Phase 2)
**Fonctionnalité future** :
- Grouper codes par campagne (ex: "Promo Reddit", "Event Twitch")
- Analytics par campagne
- ROI tracking

**API Endpoints** :
- `GET /api/guilds/:guildId/invitations/codes`
- `POST /api/guilds/:guildId/invitations/codes` - Create
- `PUT /api/guilds/:guildId/invitations/codes/:code` - Edit
- `DELETE /api/guilds/:guildId/invitations/codes/:code` - Revoke

---

### ⚙️ 8. Paramètres Serveur

**Route** : `/guilds/:guildId/settings/*`

**Objectif** : Configuration globale serveur et app.

#### 8.1 Général (`/settings/general`)

##### Informations Serveur
**Composant** : Form sections

**Section "Identity"** :
- Nom serveur
- Description
- Icon upload
- Banner upload (si unlocked)
- Vanity URL (si unlocked)

**Section "Features"** :
- Read-only badges des features unlocked :
  - Community
  - Verified
  - Partnered
  - Boost level (avec progress bar)
  - Features count

##### Région & Localization
**Composant** : Dropdowns

- Preferred locale (dropdown langues)
- AFK channel (dropdown canaux voice)
- AFK timeout (dropdown durées)
- System messages channel (dropdown)

**API Endpoints** :
- `GET /api/guilds/:guildId/settings/general`
- `PUT /api/guilds/:guildId/settings/general`

---

#### 8.2 Sécurité (`/settings/security`)

##### Verification Level
**Composant** : Radio buttons ou slider

**Niveaux** :
- None
- Low (email verified)
- Medium (registered > 5min)
- High (member > 10min)
- Highest (phone verified)

**Description** : Affichage explication chaque niveau

##### Explicit Content Filter
**Composant** : Radio buttons

**Options** :
- Don't scan any
- Scan from members without roles
- Scan all members

##### MFA Requirement (Modération)
**Composant** : Toggle

**Description** : Require 2FA for moderation actions

##### Security Alerts
**Composant** : Alert preferences

**Options** :
- Notify on role changes
- Notify on permission changes
- Notify on moderation actions
- Notify on unusual activity

**API Endpoints** :
- `GET /api/guilds/:guildId/settings/security`
- `PUT /api/guilds/:guildId/settings/security`

---

#### 8.3 Intégrations (`/settings/integrations`)

##### Webhooks Entrants
**Composant** : Liste

**Webhooks configurés** :
- Github
- Twitch
- YouTube
- Custom

**Actions** : Add / Edit / Delete

##### Bots Autorisés
**Composant** : Table

**Liste** :
- Bot name
- Bot ID
- Added by
- Added date
- Permissions (summary)
- Actions : View permissions / Kick bot

##### API Keys (Phase 2)
**Fonctionnalité future** :
- Générer API key pour intégrations externes
- Webhooks sortants custom

**API Endpoints** :
- `GET /api/guilds/:guildId/settings/integrations`
- `POST /api/guilds/:guildId/settings/integrations/webhook`

---

#### 8.4 Notifications (`/settings/notifications`)

##### App Notifications
**Composant** : Toggle list

**Options** :
- Email notifications
  - Daily digest
  - Weekly report
  - Important alerts only
  
- Discord notifications (via bot DM)
  - Real-time alerts
  - Daily summary
  
- Web push notifications (browser)

##### Alert Channels
**Composant** : Channel selectors

**Configuration** :
- Mod-log channel (logs modération)
- Alerts channel (alertes app)
- Reports channel (rapports membres)
- Audit channel (changements config)

**API Endpoints** :
- `GET /api/guilds/:guildId/settings/notifications`
- `PUT /api/guilds/:guildId/settings/notifications`

---

#### 8.5 Préférences Dashboard (`/settings/preferences`)

##### Widgets Configuration
**Composant** : Checklist + order

**Options** :
- Enable/disable chaque widget
- Set default layout
- Reset to defaults

##### Alertes Personnalisées
**Composant** : Alert rules builder

**Créer règle custom** :
- Condition (ex: "Messages > 1000/jour dans un canal")
- Seuil
- Action (notification email / Discord / dashboard alert)

##### Thème
**Composant** : Theme selector

**Options** :
- Dark (default)
- Light
- Auto (system preference)

**API Endpoints** :
- `GET /api/users/me/preferences`
- `PUT /api/users/me/preferences`

---

### 👤 9. Profil Utilisateur

**Route** : `/profile`

**Objectif** : Settings personnels et gestion compte.

#### Sections

##### Informations Discord
**Composant** : Card read-only

**Données affichées** (synced Discord) :
- Avatar
- Username + discriminator
- Email (masked)
- Account created date
- Badges Discord (Nitro, etc.)

**Note** : Non éditable (géré via Discord)

##### Serveurs Gérés
**Composant** : Grid cards

**Liste** :
- Serveurs où user a permissions admin
- Switch rapide (clic → change guild context)
- Quick stats par serveur

##### Préférences Personnelles
**Composant** : Form

**Options** :
- Langue interface
- Timezone
- Email notifications préférences
- Theme preference

##### Sessions Actives
**Composant** : Table

**Données** :
- Device / Browser
- IP (masked)
- Location (ville)
- Last activity
- Actions : Logout session

##### Danger Zone
**Composant** : Section avec confirmations

**Actions** :
- Logout all sessions
- Disconnect account (revoke OAuth)

**API Endpoints** :
- `GET /api/users/me/profile`
- `GET /api/users/me/guilds`
- `PUT /api/users/me/preferences`
- `GET /api/users/me/sessions`
- `DELETE /api/users/me/sessions/:sessionId`

---

## 🗺️ Roadmap Évolutive

### Phase 1 : MVP Core (Mois 1-3)

**Objectif** : Fonctionnalités essentielles pour lancement beta

#### Semaine 1-2 : Foundation
**Priorité** : 🔴 CRITIQUE

**Tâches** :
- [ ] Setup routing structure complète
- [ ] Créer layout components (header, sidebar, footer)
- [ ] Implémenter navigation + breadcrumbs
- [ ] Setup guards (auth, guild)
- [ ] Créer design system base (colors, typography, spacing)
- [ ] Setup services façade pattern
- [ ] Implémenter intercepteurs HTTP

**Livrables** :
- Structure app navigable
- Design system documenté
- Auth flow fonctionnel

---

#### Semaine 3-4 : Server List & Dashboard
**Priorité** : 🔴 CRITIQUE

**Tâches** :
- [ ] Page Server List
  - [ ] Component liste serveurs
  - [ ] Service API guilds
  - [ ] Filtres et recherche
  - [ ] Sélection et stockage guild context
  
- [ ] Dashboard Principal
  - [ ] Hero Stats cards
  - [ ] API endpoint dashboard-hero
  - [ ] Sparklines avec Chart.js
  - [ ] Timeline events (version simple)
  - [ ] Integration real-time stats

**Livrables** :
- User peut sélectionner serveur
- Dashboard affiche stats live
- Navigation fonctionnelle

---

#### Semaine 5-6 : Analytics Overview
**Priorité** : 🔴 CRITIQUE

**Tâches** :
- [ ] Page Analytics Overview
  - [ ] Graph activité principal (Chart.js)
  - [ ] Breakdown cards (messages/vocal/réactions)
  - [ ] Sélecteur période
  - [ ] Export CSV basique
  
- [ ] Backend endpoints analytics
  - [ ] `/analytics/overview` avec agrégations
  - [ ] Cache Redis pour perfs

**Livrables** :
- Analytics fonctionnelles
- Graphs interactifs
- Export données

---

#### Semaine 7-8 : Membres Base
**Priorité** : 🔴 CRITIQUE

**Tâches** :
- [ ] Page Membres Liste
  - [ ] Vue grille et tableau (toggle)
  - [ ] Filtres basiques (rôle, date join)
  - [ ] Pagination
  - [ ] Quick stats header
  
- [ ] Profil Membre Simple
  - [ ] Modal détails membre
  - [ ] Stats activité basiques
  - [ ] Rôles et permissions

**Livrables** :
- Liste membres explorable
- Profils membres consultables

---

#### Semaine 9-10 : Modération Core
**Priorité** : 🔴 CRITIQUE

**Tâches** :
- [ ] Dashboard Modération
  - [ ] Stats modération
  - [ ] Timeline actions récentes
  - [ ] Graph évolution
  
- [ ] Logs Modération
  - [ ] Table logs avec filtres
  - [ ] Détails log (modal)
  - [ ] Export logs

**Livrables** :
- Historique modération visible
- Filtres et recherche fonctionnels

---

#### Semaine 11-12 : Canaux & Rôles Base
**Priorité** : 🟠 IMPORTANT

**Tâches** :
- [ ] Page Canaux Overview
  - [ ] Tree view canaux
  - [ ] Stats inline basiques
  - [ ] Actions basiques
  
- [ ] Page Rôles Liste
  - [ ] Liste rôles avec hiérarchie
  - [ ] Create/Edit role (form basique)
  - [ ] Members count

**Livrables** :
- Vue canaux organisée
- Gestion rôles basique

---

#### Semaine 13-14 : Polish & Beta Launch
**Priorité** : 🔴 CRITIQUE

**Tâches** :
- [ ] Responsive mobile (tous les pages core)
- [ ] Dark mode final polish
- [ ] Loading states partout
- [ ] Error handling global
- [ ] Empty states
- [ ] Onboarding tooltips
- [ ] Performance optimization
  - [ ] Lazy loading routes
  - [ ] Image optimization
  - [ ] Bundle size analysis
- [ ] Tests E2E critiques
- [ ] Documentation utilisateur

**Livrables** :
- App production-ready
- Beta testable
- Documentation complète

---

### Phase 2 : Advanced Features (Mois 4-6)

**Objectif** : Se différencier avec features avancées

#### Sprint 1 : Alertes Intelligentes (Semaines 15-16)
**Priorité** : 🔴 CRITIQUE

**Tâches** :
- [ ] Système alertes backend
  - [ ] Engine règles configurable
  - [ ] Détection anomalies (ML basique)
  - [ ] Queue alertes
  
- [ ] UI Alertes Dashboard
  - [ ] Card alertes & recommandations
  - [ ] Actions alertes (dismiss, execute)
  - [ ] Configuration règles custom

**Livrables** :
- Alertes proactives fonctionnelles
- Recommandations intelligentes

---

#### Sprint 2 : Analytics Avancées (Semaines 17-18)
**Priorité** : 🟠 IMPORTANT

**Tâches** :
- [ ] Analyse Membre Détaillée
  - [ ] Profil membre complet (onglets)
  - [ ] Timeline activité avancée
  - [ ] Insights automatiques membres
  
- [ ] Analyse Canaux
  - [ ] Heatmap activité
  - [ ] Stats détaillées par canal
  - [ ] Insights canaux
  
- [ ] Analyse Temporelle
  - [ ] Heatmap 7x24
  - [ ] Patterns détection
  - [ ] Prédictions basiques

**Livrables** :
- Analytics granulaires
- Insights automatiques

---

#### Sprint 3 : Modération Avancée (Semaines 19-20)
**Priorité** : 🔴 CRITIQUE

**Tâches** :
- [ ] Actions Rapides
  - [ ] Interface ban/kick depuis app
  - [ ] Multi-sélection membres
  - [ ] Raisons pré-configurées
  - [ ] Tempban avec durée
  
- [ ] Système Rapports
  - [ ] Interface triage rapports
  - [ ] Assignation modérateurs
  - [ ] Workflow traitement
  - [ ] Stats rapports

**Livrables** :
- Modération complète depuis web
- Rapports structurés

---

#### Sprint 4 : Segments & Bulk Actions (Semaines 21-22)
**Priorité** : 🟠 IMPORTANT

**Tâches** :
- [ ] Segment Builder
  - [ ] Visual query builder
  - [ ] Templates prédéfinis
  - [ ] Preview live
  - [ ] Save segments
  
- [ ] Actions Bulk
  - [ ] Assign/remove roles
  - [ ] Export sélection
  - [ ] Send messages bulk
  - [ ] Actions modération bulk

**Livrables** :
- Segmentation avancée
- Gestion masse efficace

---

#### Sprint 5 : Permissions Matrix (Semaines 23-24)
**Priorité** : 🟡 MOYEN

**Tâches** :
- [ ] Matrix Permissions
  - [ ] Table interactive rôles x permissions
  - [ ] Comparaison côte à côte
  - [ ] Détection conflits
  - [ ] Templates rôles
  
- [ ] Permissions Canaux
  - [ ] Matrix canal-specific
  - [ ] Visual overrides
  - [ ] Copy permissions

**Livrables** :
- Gestion permissions clarifiée
- Conflits détectés automatiquement

---

#### Sprint 6 : Invitations Tracking (Semaines 25-26)
**Priorité** : 🟡 MOYEN

**Tâches** :
- [ ] Leaderboard Invitations
  - [ ] Top inviters
  - [ ] Taux rétention
  
- [ ] Analytics Invitations
  - [ ] Graph croissance
  - [ ] Funnel rétention
  - [ ] Top codes
  
- [ ] Gestion Codes
  - [ ] Liste codes actifs
  - [ ] Create/Edit invites
  - [ ] Tracking campagnes (basique)

**Livrables** :
- Tracking invitations complet
- Analytics rétention

---

### Phase 3 : Premium & Scale (Mois 7-9)

**Objectif** : Features premium et optimisations scale

#### Sprint 1 : Widgets Personnalisables (Semaines 27-28)
**Priorité** : 🟡 MOYEN

**Tâches** :
- [ ] Dashboard Widgets
  - [ ] Système drag & drop
  - [ ] 6-8 widgets disponibles
  - [ ] Save layout user
  - [ ] Reset to defaults
  
- [ ] Widget Gallery
  - [ ] Preview widgets
  - [ ] Add/Remove widgets
  - [ ] Configuration par widget

**Livrables** :
- Dashboard personnalisable
- Layouts sauvegardés

---

#### Sprint 2 : Leaderboards Complets (Semaines 29-30)
**Priorité** : 🟡 MOYEN

**Tâches** :
- [ ] Multiple Leaderboards
  - [ ] Messages
  - [ ] Vocal
  - [ ] Activité globale
  - [ ] Invitations
  - [ ] Réactions
  
- [ ] Système Badges
  - [ ] Badges visuels (champion, streak, etc.)
  - [ ] Conditions unlock badges
  - [ ] Display badges profils

**Livrables** :
- Leaderboards complets
- Gamification basique

---

#### Sprint 3 : Real-time WebSocket (Semaines 31-32)
**Priorité** : 🟠 IMPORTANT

**Tâches** :
- [ ] WebSocket Frontend
  - [ ] Connection WebSocket gateway
  - [ ] Event listeners
  - [ ] Auto-reconnect
  
- [ ] Updates Real-time
  - [ ] Stats live update
  - [ ] Timeline real-time
  - [ ] Notifications push
  - [ ] Indicators "Live"

**Livrables** :
- Dashboard temps réel complet
- Pas de refresh nécessaire

---

#### Sprint 4 : Reports Automatiques (Semaines 33-34)
**Priorité** : 🟢 NICE-TO-HAVE

**Tâches** :
- [ ] Report Generator
  - [ ] PDF export avec charts
  - [ ] Email reports planifiés
  - [ ] Templates reports
  - [ ] Configuration sections
  
- [ ] Scheduled Reports
  - [ ] Configuration fréquence
  - [ ] Destinataires
  - [ ] Format customization

**Livrables** :
- Reports PDF exportables
- Envoi automatique email

---

#### Sprint 5 : Auto-modération (Semaines 35-36)
**Priorité** : 🟠 IMPORTANT

**Tâches** :
- [ ] Rules Engine
  - [ ] Anti-spam configurable
  - [ ] Filtres mots interdits
  - [ ] Anti-flood
  - [ ] Filtres liens
  
- [ ] UI Configuration
  - [ ] Builder règles
  - [ ] Actions automatiques
  - [ ] Whitelist/Blacklist
  - [ ] Logs actions auto

**Livrables** :
- Auto-modération configurable
- Détection patterns automatique

---

#### Sprint 6 : Public Dashboard (Semaines 37-38)
**Priorité** : 🟢 NICE-TO-HAVE

**Tâches** :
- [ ] Public Dashboard Generator
  - [ ] Page publique stats serveur
  - [ ] URL custom
  - [ ] Opt-in par serveur
  - [ ] Configuration affichage
  
- [ ] Embed Widgets
  - [ ] Embed leaderboards
  - [ ] Embed stats cards
  - [ ] Iframe responsive

**Livrables** :
- Dashboard public shareable
- Widgets embeddables

---

### Phase 4 : AI & Advanced (Mois 10-12)

**Objectif** : Features IA et automation avancée

#### Sprint 1 : AI Insights (Semaines 39-41)
**Priorité** : 🟡 MOYEN

**Tâches** :
- [ ] ML Models Training
  - [ ] Patterns détection
  - [ ] Anomalies détection
  - [ ] Predictions activité
  
- [ ] AI Recommendations
  - [ ] Suggestions contextuelles
  - [ ] "Serveur healthcheck"
  - [ ] Optimisations suggérées

**Livrables** :
- Insights IA avancés
- Recommandations intelligentes

---

#### Sprint 2 : Automations Workflows (Semaines 42-44)
**Priorité** : 🟡 MOYEN

**Tâches** :
- [ ] Workflow Builder
  - [ ] Visual automation builder
  - [ ] Triggers (events)
  - [ ] Actions (multi-step)
  - [ ] Conditions (if/else)
  
- [ ] Templates Workflows
  - [ ] Auto-role on join
  - [ ] Welcome messages
  - [ ] Scheduled announcements

**Livrables** :
- Automations configurables
- Workflows complexes

---

#### Sprint 3 : Benchmarking (Semaines 45-46)
**Priorité** : 🟢 NICE-TO-HAVE

**Tâches** :
- [ ] Benchmarks Database
  - [ ] Collect anonymous stats
  - [ ] Agrégations par taille serveur
  - [ ] Métriques comparables
  
- [ ] UI Comparaison
  - [ ] "Votre serveur vs moyenne"
  - [ ] Graphs comparatifs
  - [ ] Insights positionnement

**Livrables** :
- Comparaison avec benchmarks
- Insights compétitifs

---

#### Sprint 4 : Advanced Analytics (Semaines 47-48)
**Priorité** : 🟢 NICE-TO-HAVE

**Tâches** :
- [ ] Cohort Analysis
  - [ ] Retention by join date
  - [ ] Engagement evolution
  
- [ ] Funnel Analysis
  - [ ] Member journey tracking
  - [ ] Conversion rates
  
- [ ] Sentiment Analysis
  - [ ] Messages sentiment (ML)
  - [ ] Trends sentiment

**Livrables** :
- Analytics niveau entreprise
- Insights profonds

---

#### Sprint 5 : API Publique (Semaines 49-50)
**Priorité** : 🟢 NICE-TO-HAVE

**Tâches** :
- [ ] Public API
  - [ ] REST endpoints publics
  - [ ] API keys management
  - [ ] Rate limiting
  - [ ] Documentation OpenAPI
  
- [ ] Developer Portal
  - [ ] API docs
  - [ ] Examples
  - [ ] SDKs

**Livrables** :
- API publique documentée
- Intégrations tierces possibles

---

#### Sprint 6 : Mobile App (Semaines 51-52)
**Priorité** : 🟢 NICE-TO-HAVE

**Tâches** :
- [ ] Mobile App (React Native ou Ionic)
  - [ ] Dashboard mobile
  - [ ] Stats principales
  - [ ] Modération mobile
  - [ ] Notifications push

**Livrables** :
- App mobile iOS/Android
- Modération en déplacement

---

## 🚀 Let's Build!

Avec cette roadmap détaillée, tu as maintenant toutes les cartes en main pour créer l'application d'administration Discord la plus impressionnante du marché ! 🎯

**N'oublie pas** : 
> "Perfect is the enemy of good. Ship MVP first, iterate fast, listen to users."

Let's disrupt le marché ! 💪🚀