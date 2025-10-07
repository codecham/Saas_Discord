# 🛡️ Roadmap des Améliorations de Sécurité et Robustesse

## 📊 Vue d'ensemble

**Date:** Octobre 2025  
**Version:** 1.0.0  
**Statut global:** 2/12 problèmes résolus (17%)

---

## ✅ Problèmes résolus

### ✅ #1 - Tokens JWT exposés dans l'URL
**Statut:** ✅ RÉSOLU  
**Priorité:** 🔴 CRITIQUE  
**Date de résolution:** Octobre 2025

#### Problème identifié
Les tokens JWT étaient transmis directement dans l'URL lors du callback OAuth:
```
❌ /auth/callback?access_token=xxx&refresh_token=yyy
```

**Risques:**
- Tokens loggés (serveurs, proxies, navigateurs)
- Apparition dans l'historique du navigateur
- Interception par extensions malveillantes
- Exposition via Referer headers

#### Solution implémentée
Utilisation de sessions temporaires Redis:

```typescript
// Backend
const sessionId = await oauthSessionService.createSession(
  accessToken,
  refreshToken,
  userId
);
return res.redirect(`${frontendUrl}/auth/callback?session=${sessionId}`);

// Frontend
const response = await authApi.exchangeSession({ sessionId });
// Tokens récupérés via POST sécurisé
```

**Bénéfices:**
- ✅ Tokens jamais dans l'URL
- ✅ Session one-time use (5 min TTL)
- ✅ Échange sécurisé via POST

**Fichiers modifiés:**
- `oauth-session.service.ts` (nouveau)
- `auth.controller.ts`
- `auth-facade.service.ts`
- `auth-callback.component.ts`

---

### ✅ #2 - Protection CSRF dans le flow OAuth
**Statut:** ✅ RÉSOLU  
**Priorité:** 🔴 CRITIQUE  
**Date de résolution:** Octobre 2025

#### Problème identifié
Pas de paramètre `state` dans le flow OAuth, permettant des attaques CSRF où un attaquant force un utilisateur à se connecter avec le compte Discord de l'attaquant.

#### Solution implémentée
Génération et validation de state tokens:

```typescript
// 1. Génération avant redirect Discord
const state = await oauthStateService.generateState();
// State stocké dans Redis (TTL 10 min)

// 2. Discord callback avec state
GET /callback?code=xxx&state=yyy

// 3. Validation stricte
await oauthStateService.validateState(state);
// ✅ Existe, ✅ Non utilisé, ✅ Non expiré

// 4. Suppression immédiate (one-time use)
```

**Bénéfices:**
- ✅ Protection contre CSRF attacks
- ✅ Protection contre replay attacks
- ✅ Expiration automatique (10 min)

**Fichiers modifiés:**
- `oauth-state.service.ts` (nouveau)
- `discord-oauth.service.ts`
- `auth.controller.ts`

---

## 🔴 Problèmes critiques à résoudre

### ⚠️ #3 - Refresh tokens stockés en localStorage
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Impact:** Haute sécurité  
**Effort estimé:** 4 heures

#### Problème
Les refresh tokens sont stockés en `localStorage`, les rendant vulnérables aux attaques XSS (Cross-Site Scripting).

```typescript
// ❌ Actuellement (vulnérable)
localStorage.setItem('refresh_token', refreshToken);
```

**Risques:**
- Accessible par JavaScript malveillant
- Vol de tokens via XSS
- Persistance même après fermeture du navigateur

#### Solution recommandée
Utiliser des cookies `httpOnly` pour les refresh tokens:

**Backend:**
```typescript
// auth.controller.ts
@Post('exchange-session')
async exchangeSession(@Body() body: ExchangeSessionDTO, @Res() res: Response) {
  const session = await this.oauthSessionService.exchangeSession(body.sessionId);
  const user = await this.authService.getCurrentUser(session.userId);

  // ✅ Refresh token dans cookie httpOnly
  res.cookie('refresh_token', session.refreshToken, {
    httpOnly: true,      // Pas accessible en JavaScript
    secure: true,        // HTTPS uniquement (prod)
    sameSite: 'strict',  // Protection CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    path: '/api/auth',   // Limiter le scope
  });

  // Access token dans le body (court TTL acceptable)
  return res.json({
    access_token: session.accessToken,
    user,
  });
}

@Post('refresh')
async refresh(@Req() req: Request, @Res() res: Response) {
  // Lire refresh token depuis cookie
  const refreshToken = req.cookies['refresh_token'];
  
  if (!refreshToken) {
    throw new UnauthorizedException('No refresh token');
  }

  const tokens = await this.authService.refreshTokens(refreshToken);

  // Nouveau refresh token dans cookie
  res.cookie('refresh_token', tokens.refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  return res.json({
    access_token: tokens.access_token,
  });
}

@Post('logout')
@UseGuards(JwtAuthGuard)
async logout(@Req() req: Request, @Res() res: Response) {
  const refreshToken = req.cookies['refresh_token'];
  await this.authService.logout(userId, refreshToken);

  // Supprimer le cookie
  res.clearCookie('refresh_token', { path: '/api/auth' });
  
  return res.status(204).send();
}
```

**Frontend:**
```typescript
// token.service.ts
class TokenService {
  // Ne stocker QUE l'access token
  setAccessToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  // Refresh token géré automatiquement par cookies
  // Pas de getRefreshToken() nécessaire!
}

// auth-api.service.ts
refreshToken(): Observable<RefreshTokenResponseDTO> {
  // Les cookies sont envoyés automatiquement
  return this.http.post<RefreshTokenResponseDTO>(
    `${this.baseUrl}/refresh`,
    {}, // Body vide
    { withCredentials: true } // Important!
  );
}
```

**Configuration CORS (backend):**
```typescript
// main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true, // Permettre les cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**Dépendances:**
```bash
npm install cookie-parser
npm install -D @types/cookie-parser
```

**Configuration app (backend):**
```typescript
// main.ts
import * as cookieParser from 'cookie-parser';

app.use(cookieParser());
```

**Bénéfices:**
- ✅ Refresh tokens inaccessibles en JavaScript
- ✅ Protection contre XSS
- ✅ Auto-suppression à l'expiration
- ✅ Meilleure séparation des responsabilités

**Fichiers à modifier:**
- `apps/backend/src/main.ts`
- `apps/backend/src/modules/auth/auth.controller.ts`
- `apps/frontend/src/app/services/auth/token.service.ts`
- `apps/frontend/src/app/services/auth/auth-api.service.ts`
- `apps/frontend/src/app/services/auth/auth-facade.service.ts`
- `apps/frontend/src/environments/environment.ts` (configurer withCredentials)

**Tests à effectuer:**
- [ ] Login fonctionne et cookie est défini
- [ ] Refresh automatique fonctionne
- [ ] Logout supprime le cookie
- [ ] Cookie n'est pas accessible via `document.cookie`
- [ ] Cookie envoyé uniquement à `/api/auth/*`
- [ ] CORS fonctionne avec credentials

---

### ⚠️ #4 - Pas de rate limiting sur endpoints sensibles
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🔴 CRITIQUE  
**Impact:** Haute sécurité  
**Effort estimé:** 2 heures

#### Problème
Aucune protection contre les attaques par force brute sur les endpoints d'authentification.

**Endpoints vulnérables:**
- `/api/auth/refresh` - Tentatives de refresh avec tokens volés
- `/api/auth/exchange-session` - Tentatives de deviner sessionId
- `/api/auth/logout` - Flood de déconnexions

#### Solution recommandée
Implémenter rate limiting avec `@nestjs/throttler`:

**Installation:**
```bash
npm install @nestjs/throttler
```

**Configuration globale:**
```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 60 secondes
      limit: 10,   // 10 requêtes max par défaut
    }]),
    // ... autres imports
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

**Configuration par endpoint:**
```typescript
// auth.controller.ts
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@Controller('api/auth')
export class AuthController {
  
  // Rate limit strict sur refresh (tentatives de vol de tokens)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 req/min
  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    // ...
  }

  // Rate limit moyen sur exchange-session
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req/min
  @Post('exchange-session')
  async exchangeSession(@Body() body: ExchangeSessionDTO) {
    // ...
  }

  // Rate limit sur logout
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 req/min
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser('id') userId: string, @Res() res: Response) {
    // ...
  }

  // Pas de rate limit sur health check
  @SkipThrottle()
  @Get('health')
  async healthCheck() {
    // ...
  }
}
```

**Rate limiting par IP et par utilisateur:**
```typescript
// custom-throttler.guard.ts
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Combiner IP + userId si authentifié
    const ip = req.ip;
    const userId = req.user?.id;
    
    return userId ? `${ip}:${userId}` : ip;
  }
}
```

**Storage Redis (recommandé pour production):**
```typescript
// app.module.ts
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        throttlers: [{
          ttl: 60000,
          limit: 10,
        }],
        storage: new ThrottlerStorageRedisService({
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
        }),
      }),
      inject: [ConfigService],
    }),
  ],
})
```

**Installation storage Redis:**
```bash
npm install nestjs-throttler-storage-redis
```

**Configuration limites recommandées:**
```typescript
// Endpoints publics
/api/auth/discord           → 3 req/min  (éviter spam)
/api/auth/discord/callback  → 5 req/min

// Endpoints sensibles
/api/auth/exchange-session  → 10 req/min
/api/auth/refresh           → 5 req/min
/api/auth/logout            → 20 req/min

// Endpoints protégés standards
/api/discord/*              → 60 req/min (1 par seconde)
```

**Gestion des erreurs:**
```typescript
// Réponse automatique quand rate limit dépassé
HTTP 429 Too Many Requests
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

**Custom error message:**
```typescript
// custom-throttler-exception-filter.ts
@Catch(ThrottlerException)
export class CustomThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    response.status(429).json({
      statusCode: 429,
      message: 'Trop de requêtes. Veuillez réessayer dans quelques instants.',
      retryAfter: 60, // secondes
    });
  }
}
```

**Bénéfices:**
- ✅ Protection contre brute force
- ✅ Protection contre DoS
- ✅ Réduction de la charge serveur
- ✅ Détection d'activité suspecte

**Fichiers à modifier:**
- `apps/backend/src/app.module.ts`
- `apps/backend/src/modules/auth/auth.controller.ts`
- `apps/backend/src/common/guards/custom-throttler.guard.ts` (nouveau)
- `apps/backend/src/common/filters/custom-throttler-exception-filter.ts` (nouveau)

**Tests à effectuer:**
- [ ] 6ème requête /refresh en 1 min → 429 error
- [ ] Attendre 60s → requête passe
- [ ] Rate limit par IP fonctionne
- [ ] Rate limit par utilisateur fonctionne
- [ ] Health check non affecté

---

## 🟠 Problèmes importants (avant mise en production)

### ⚠️ #5 - Validation stricte des inputs insuffisante
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🟠 IMPORTANT  
**Impact:** Moyenne sécurité  
**Effort estimé:** 3 heures

#### Problème
Pas de validation stricte avec `class-validator` sur les DTOs, permettant l'injection de données malformées.

#### Solution recommandée

**Installation:**
```bash
npm install class-validator class-transformer
```

**Configuration globale:**
```typescript
// main.ts
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(new ValidationPipe({
  whitelist: true,              // Supprime props non déclarées
  forbidNonWhitelisted: true,   // Erreur si props inconnues
  transform: true,              // Auto-transformation des types
  transformOptions: {
    enableImplicitConversion: true,
  },
}));
```

**Exemples de DTOs validés:**
```typescript
// create-message.dto.ts
import { IsString, IsBoolean, IsOptional, Length, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMessageDTO {
  @IsString()
  @Length(1, 2000)
  content: string;

  @IsOptional()
  @IsBoolean()
  tts?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmbedDTO)
  embeds?: EmbedDTO[];
}

// exchange-session.dto.ts
export class ExchangeSessionDTO {
  @IsString()
  @Length(64, 64) // SessionId = 64 chars hex
  @Matches(/^[a-f0-9]{64}$/)
  sessionId: string;
}

// refresh-token.dto.ts
export class RefreshTokenRequestDTO {
  @IsString()
  @MinLength(20)
  refresh_token: string;
}
```

**Validation personnalisée:**
```typescript
// is-discord-snowflake.validator.ts
import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsDiscordSnowflake(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isDiscordSnowflake',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'string' && /^\d{17,19}$/.test(value);
        },
        defaultMessage() {
          return 'Invalid Discord Snowflake ID';
        },
      },
    });
  };
}

// Utilisation
export class GetGuildDTO {
  @IsDiscordSnowflake()
  guildId: string;
}
```

**Bénéfices:**
- ✅ Protection contre injection malformée
- ✅ Documentation automatique des APIs
- ✅ Meilleure ergonomie développeur
- ✅ Réduction des bugs

**Fichiers à créer/modifier:**
- Tous les DTOs dans `apps/backend/src/modules/*/dto/`
- `apps/backend/src/main.ts`
- `apps/backend/src/common/validators/*.validator.ts` (nouveaux)

---

### ⚠️ #6 - Pas de sanitization HTML côté frontend
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🟠 IMPORTANT  
**Impact:** Moyenne sécurité (XSS)  
**Effort estimé:** 2 heures

#### Problème
Si du contenu Discord (messages, descriptions) est affiché sans sanitization, risque XSS.

#### Solution recommandée

**Service de sanitization:**
```typescript
// sanitization.service.ts
import { Injectable } from '@angular/core';
import { DomSanitizer, SecurityContext, SafeHtml } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class SanitizationService {
  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Sanitize HTML content (messages Discord)
   */
  sanitizeHtml(content: string): SafeHtml {
    return this.sanitizer.sanitize(SecurityContext.HTML, content) || '';
  }

  /**
   * Sanitize URLs (liens Discord)
   */
  sanitizeUrl(url: string): string {
    return this.sanitizer.sanitize(SecurityContext.URL, url) || '';
  }

  /**
   * Sanitize pour affichage en innerHTML
   */
  getSafeHtml(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      this.sanitizeHtml(content) as string
    );
  }
}
```

**Utilisation dans components:**
```typescript
// message.component.ts
export class MessageComponent {
  private sanitization = inject(SanitizationService);
  
  get safeContent(): SafeHtml {
    return this.sanitization.getSafeHtml(this.message.content);
  }
}

// Template
<div [innerHTML]="safeContent"></div>
```

**Pipe réutilisable:**
```typescript
// safe-html.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { SanitizationService } from './sanitization.service';

@Pipe({
  name: 'safeHtml',
  standalone: true
})
export class SafeHtmlPipe implements PipeTransform {
  constructor(private sanitization: SanitizationService) {}

  transform(value: string): SafeHtml {
    return this.sanitization.getSafeHtml(value);
  }
}

// Utilisation
<div [innerHTML]="message.content | safeHtml"></div>
```

**Whitelist de tags autorisés:**
```typescript
// Pour Markdown Discord
const ALLOWED_TAGS = [
  'b', 'i', 'u', 's', 'code', 'pre',
  'a', 'br', 'p', 'span'
];

const ALLOWED_ATTRS = {
  'a': ['href', 'title'],
  'span': ['class']
};
```

**Bénéfices:**
- ✅ Protection contre XSS
- ✅ Affichage sécurisé du contenu Discord
- ✅ Pipe réutilisable

**Fichiers à créer:**
- `apps/frontend/src/app/services/sanitization.service.ts`
- `apps/frontend/src/app/pipes/safe-html.pipe.ts`

---

### ⚠️ #7 - Pas de retry mechanism sur Discord API
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🟠 IMPORTANT  
**Impact:** Disponibilité  
**Effort estimé:** 2 heures

#### Problème
Si Discord retourne une erreur 5xx, l'application échoue sans réessayer.

#### Solution recommandée

**Avec RxJS (Angular/NestJS):**
```typescript
// discord-api.service.ts
import { retry, timer, catchError } from 'rxjs/operators';

async request(endpoint: string, options?: any) {
  return firstValueFrom(
    this.httpService.get(endpoint, options).pipe(
      retry({
        count: 3,
        delay: (error, retryCount) => {
          // Retry uniquement sur erreurs 5xx
          if (error.response?.status >= 500) {
            const delayMs = Math.min(
              Math.pow(2, retryCount) * 1000, // Backoff exponentiel
              10000 // Max 10 secondes
            );
            this.logger.warn(
              `Discord API error ${error.response.status}, retry ${retryCount}/3 in ${delayMs}ms`
            );
            return timer(delayMs);
          }
          
          // Ne pas retry sur 4xx (erreurs client)
          throw error;
        }
      }),
      catchError(error => {
        this.logger.error('Discord API request failed after retries', error);
        throw error;
      })
    )
  );
}
```

**Avec fetch natif + retry manuel:**
```typescript
// discord-oauth.service.ts
async exchangeCodeWithRetry(code: string, maxRetries = 3): Promise<DiscordTokenResponse> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.exchangeCode(code);
    } catch (error: any) {
      lastError = error;
      
      // Ne retry que sur 5xx
      if (error.status && error.status >= 500 && attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000;
        this.logger.warn(
          `Discord API error ${error.status}, retry ${attempt}/${maxRetries} in ${delayMs}ms`
        );
        await this.sleep(delayMs);
        continue;
      }
      
      throw error;
    }
  }

  throw lastError!;
}

private sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Configuration par endpoint:**
```typescript
const RETRY_CONFIG = {
  '/oauth2/token': { maxRetries: 3, backoff: 'exponential' },
  '/users/@me': { maxRetries: 2, backoff: 'linear' },
  '/guilds/*': { maxRetries: 1, backoff: 'exponential' },
};
```

**Circuit breaker (avancé):**
```typescript
// circuit-breaker.service.ts
export class CircuitBreakerService {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime: number = 0;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      // Vérifier si on doit passer en HALF_OPEN
      if (Date.now() - this.lastFailureTime > 60000) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= 5) {
      this.state = 'OPEN';
      this.logger.error('Circuit breaker opened');
    }
  }
}
```

**Bénéfices:**
- ✅ Résilience aux erreurs temporaires Discord
- ✅ Meilleure disponibilité
- ✅ Expérience utilisateur améliorée

**Fichiers à modifier:**
- `apps/backend/src/modules/discord/core/discord-api.service.ts`
- `apps/backend/src/modules/auth/services/discord-oauth.service.ts`

---

## 🟡 Améliorations recommandées (production)

### ⚠️ #8 - Pas de monitoring/alerting
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🟡 PRODUCTION  
**Impact:** Observabilité  
**Effort estimé:** 4 heures

#### Solution recommandée

**Installation Sentry:**
```bash
npm install @sentry/nestjs @sentry/node
npm install --save-dev @sentry/cli
```

**Configuration backend:**
```typescript
// main.ts
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% des transactions
  
  // Filtrer les erreurs sensibles
  beforeSend(event) {
    // Ne pas envoyer les tokens
    if (event.request?.headers?.authorization) {
      event.request.headers.authorization = '[FILTERED]';
    }
    return event;
  },
});

// Intégrer dans NestJS
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
```

**Métriques personnalisées:**
```typescript
// Tracker les events importants
Sentry.captureMessage('User logged in', {
  level: 'info',
  user: { id: userId },
});

// Tracker les erreurs métier
Sentry.captureException(new Error('Discord API rate limited'), {
  level: 'warning',
  tags: { service: 'discord-api' },
});
```

**Configuration frontend:**
```typescript
// main.ts
import * as Sentry from '@sentry/angular';

Sentry.init({
  dsn: environment.sentryDsn,
  environment: environment.production ? 'production' : 'development',
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.1,
});
```

**Variables d'environnement:**
```env
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production
```

---

### ⚠️ #9 - Cache manquant pour données Discord
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🟡 OPTIMISATION  
**Impact:** Performance + Rate limiting  
**Effort estimé:** 3 heures

#### Solution recommandée

```typescript
// guilds.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class GuildsService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private discordApi: DiscordApiService,
  ) {}

  async getGuild(guildId: string): Promise<DiscordGuildDTO> {
    const cacheKey = `guild:${guildId}`;
    
    // Vérifier le cache
    const cached = await this.cache.get<DiscordGuildDTO>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for guild ${guildId}`);
      return cached;
    }

    // Récupérer depuis Discord
    const guild = await this.discordApi.get(
      DISCORD_ENDPOINTS.GUILD(guildId),
      { rateLimitKey: `guild:${guildId}` }
    );

    // Mettre en cache (5 minutes)
    await this.cache.set(cacheKey, guild, { ttl: 300 });

    return guild;
  }

  async invalidateGuildCache(guildId: string): Promise<void> {
    await this.cache.del(`guild:${guildId}`);
  }
}
```

**Configuration cache tiers:**
```typescript
// Cache selon fréquence de changement
const CACHE_TTL = {
  guild: 300,        // 5 min (metadata change peu)
  channels: 60,      // 1 min (peuvent changer souvent)
  members: 120,      // 2 min
  roles: 180,        // 3 min
  messages: 30,      // 30 sec (très dynamique)
};
```

**Cache invalidation intelligente:**
```typescript
// Invalider le cache sur mutation
async updateGuild(guildId: string, data: ModifyGuildDTO) {
  const result = await this.discordApi.patch(
    DISCORD_ENDPOINTS.GUILD(guildId),
    data
  );

  // Invalider le cache immédiatement
  await this.invalidateGuildCache(guildId);

  return result;
}
```

**Bénéfices:**
- ✅ Réduction des appels Discord API
- ✅ Moins de risque de rate limit
- ✅ Performance améliorée
- ✅ Coûts API réduits

---

### ⚠️ #10 - Pas de nettoyage des refresh tokens expirés
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🟡 MAINTENANCE  
**Impact:** DB size  
**Effort estimé:** 1 heure

#### Solution recommandée

**Installation:**
```bash
npm install @nestjs/schedule
```

**Configuration:**
```typescript
// app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ...
  ],
})
export class AppModule {}
```

**Service de nettoyage:**
```typescript
// cleanup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Nettoie les refresh tokens expirés tous les jours à minuit
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredRefreshTokens() {
    this.logger.log('Starting cleanup of expired refresh tokens...');

    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} expired refresh tokens`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired refresh tokens', error);
    }
  }

  /**
   * Nettoie les utilisateurs inactifs depuis 1 an (optionnel)
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async cleanupInactiveUsers() {
    this.logger.log('Starting cleanup of inactive users...');

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    try {
      const result = await this.prisma.user.updateMany({
        where: {
          lastLoginAt: {
            lt: oneYearAgo,
          },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      this.logger.log(`Deactivated ${result.count} inactive users`);
    } catch (error) {
      this.logger.error('Failed to cleanup inactive users', error);
    }
  }

  /**
   * Nettoie les sessions OAuth expirées (toutes les heures)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredOAuthStates() {
    this.logger.log('Starting cleanup of expired OAuth states...');

    try {
      const deleted = await this.oauthStateService.cleanupExpiredStates();
      this.logger.log(`Cleaned up ${deleted} expired OAuth states`);
    } catch (error) {
      this.logger.error('Failed to cleanup OAuth states', error);
    }
  }
}
```

**Monitoring du nettoyage:**
```typescript
// Logs à tracker
[CleanupService] Starting cleanup of expired refresh tokens...
[CleanupService] Cleaned up 42 expired refresh tokens
[CleanupService] Deactivated 3 inactive users
```

**Bénéfices:**
- ✅ DB propre et optimisée
- ✅ Respect RGPD (données pas conservées indéfiniment)
- ✅ Performance maintenue

**Fichiers à créer:**
- `apps/backend/src/modules/cleanup/cleanup.service.ts`
- `apps/backend/src/modules/cleanup/cleanup.module.ts`

---

### ⚠️ #11 - Secrets management en production
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🟡 PRODUCTION  
**Impact:** Sécurité production  
**Effort estimé:** Variable selon solution

#### Problème
Secrets stockés en fichiers `.env` → risque de commit accidentel ou accès non autorisé.

#### Solutions recommandées

**Option 1: AWS Secrets Manager (AWS)**
```typescript
// secrets.service.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

@Injectable()
export class SecretsService {
  private client: SecretsManagerClient;

  constructor() {
    this.client = new SecretsManagerClient({ region: 'eu-west-1' });
  }

  async getSecret(secretName: string): Promise<string> {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await this.client.send(command);
    return response.SecretString!;
  }
}

// Configuration
async function bootstrap() {
  const secretsService = new SecretsService();
  
  process.env.JWT_SECRET = await secretsService.getSecret('myapp/jwt-secret');
  process.env.DISCORD_CLIENT_SECRET = await secretsService.getSecret('myapp/discord-secret');

  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
```

**Option 2: HashiCorp Vault**
```bash
npm install node-vault
```

```typescript
import * as vault from 'node-vault';

const vaultClient = vault({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN,
});

const secrets = await vaultClient.read('secret/data/myapp');
process.env.JWT_SECRET = secrets.data.data.jwt_secret;
```

**Option 3: Kubernetes Secrets (K8s)**
```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secrets
type: Opaque
data:
  jwt-secret: <base64-encoded>
  discord-client-secret: <base64-encoded>
```

```typescript
// Les secrets sont montés comme variables d'env
// Rien à changer dans le code!
```

**Option 4: Docker Secrets (Docker Swarm)**
```bash
echo "my-jwt-secret" | docker secret create jwt_secret -
```

```typescript
// Lire depuis /run/secrets/jwt_secret
import { readFileSync } from 'fs';

if (process.env.NODE_ENV === 'production') {
  process.env.JWT_SECRET = readFileSync('/run/secrets/jwt_secret', 'utf8').trim();
}
```

**Checklist sécurité secrets:**
- [ ] `.env*` dans `.gitignore`
- [ ] Pas de secrets hardcodés dans le code
- [ ] Rotation régulière des secrets (tous les 90 jours)
- [ ] Accès aux secrets limité (principe du moindre privilège)
- [ ] Audit logs des accès aux secrets
- [ ] Chiffrement des secrets au repos
- [ ] Secrets différents par environnement

---

### ⚠️ #12 - Backup PostgreSQL
**Statut:** ⚠️ À FAIRE  
**Priorité:** 🟡 PRODUCTION  
**Impact:** Disaster recovery  
**Effort estimé:** 2 heures + configuration infra

#### Solution recommandée

**Backup automatique (cron):**
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/myapp_backup_$TIMESTAMP.sql.gz"

# Backup avec compression
pg_dump -h localhost -U postgres -d myapp | gzip > $BACKUP_FILE

# Garder seulement les 30 derniers jours
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

**Crontab:**
```bash
# Tous les jours à 2h du matin
0 2 * * * /scripts/backup.sh >> /var/log/backup.log 2>&1
```

**Backup vers S3 (AWS):**
```bash
#!/bin/bash
BACKUP_FILE="myapp_backup_$(date +%Y%m%d_%H%M%S).sql.gz"

# Backup
pg_dump -h localhost -U postgres -d myapp | gzip > /tmp/$BACKUP_FILE

# Upload vers S3
aws s3 cp /tmp/$BACKUP_FILE s3://myapp-backups/$BACKUP_FILE

# Cleanup local
rm /tmp/$BACKUP_FILE
```

**Restore:**
```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore.sh <backup_file>"
  exit 1
fi

# Restore
gunzip < $BACKUP_FILE | psql -h localhost -U postgres -d myapp

echo "Restore completed from $BACKUP_FILE"
```

**Docker Compose avec volumes:**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups  # Mount backup directory

volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/postgres  # Persistent storage
```

**Stratégie 3-2-1:**
- **3** copies des données (prod + 2 backups)
- **2** types de média différents (disque local + cloud)
- **1** copie off-site (S3, autre datacenter)

**Monitoring backups:**
```typescript
// backup-monitor.service.ts
@Cron(CronExpression.EVERY_DAY_AT_8AM)
async checkBackupHealth() {
  const latestBackup = await this.getLatestBackupDate();
  const hoursSinceBackup = (Date.now() - latestBackup.getTime()) / (1000 * 60 * 60);

  if (hoursSinceBackup > 36) {
    // Alerter si pas de backup depuis 36h
    await this.sendAlert('No recent database backup!');
  }
}
```

---

## 📊 Tableau récapitulatif

| # | Problème | Priorité | Statut | Effort | Impact |
|---|----------|----------|--------|--------|--------|
| 1 | Tokens JWT dans URL | 🔴 Critique | ✅ Résolu | 4h | Haute sécurité |
| 2 | Protection CSRF | 🔴 Critique | ✅ Résolu | 3h | Haute sécurité |
| 3 | Refresh tokens localStorage | 🔴 Critique | ⚠️ À faire | 4h | Haute sécurité |
| 4 | Rate limiting | 🔴 Critique | ⚠️ À faire | 2h | Haute sécurité |
| 5 | Validation inputs | 🟠 Important | ⚠️ À faire | 3h | Moyenne sécurité |
| 6 | Sanitization HTML | 🟠 Important | ⚠️ À faire | 2h | Moyenne sécurité |
| 7 | Retry mechanism | 🟠 Important | ⚠️ À faire | 2h | Disponibilité |
| 8 | Monitoring (Sentry) | 🟡 Production | ⚠️ À faire | 4h | Observabilité |
| 9 | Cache Discord API | 🟡 Optimisation | ⚠️ À faire | 3h | Performance |
| 10 | Cleanup tokens | 🟡 Maintenance | ⚠️ À faire | 1h | DB size |
| 11 | Secrets management | 🟡 Production | ⚠️ À faire | Variable | Sécurité prod |
| 12 | Backup PostgreSQL | 🟡 Production | ⚠️ À faire | 2h | Disaster recovery |

**Progression:** 2/12 résolus (17%)  
**Temps total estimé restant:** ~23 heures

---

## 🎯 Plan d'action recommandé

### **Sprint 1 - Sécurité critique (Semaine 1)**
**Objectif:** Corriger les failles de sécurité majeures

- [ ] #3 - Refresh tokens httpOnly cookies (4h)
- [ ] #4 - Rate limiting (2h)
- [ ] #5 - Validation inputs (3h)

**Total:** 9 heures | **Réduction risque:** 75%

---

### **Sprint 2 - Robustesse (Semaine 2)**
**Objectif:** Améliorer la stabilité et l'UX

- [ ] #6 - Sanitization HTML (2h)
- [ ] #7 - Retry mechanism (2h)
- [ ] #10 - Cleanup tokens (1h)

**Total:** 5 heures | **Amélioration disponibilité:** 85%

---

### **Sprint 3 - Production ready (Semaine 3)**
**Objectif:** Préparer le déploiement production

- [ ] #8 - Monitoring Sentry (4h)
- [ ] #9 - Cache Discord API (3h)
- [ ] #11 - Secrets management (variable)
- [ ] #12 - Backup PostgreSQL (2h)

**Total:** ~9 heures | **Production ready:** ✅

---

## 📚 Ressources et documentation

### **Standards de sécurité**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [CWE Top 25](https://cwe.mitre.org/top25/)

### **Best practices OAuth**
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
- [OAuth 2.0 for Browser-Based Apps](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)

### **JWT Best Practices**
- [RFC 8725 - JWT Best Current Practices](https://tools.ietf.org/html/rfc8725)
- [JWT Handbook](https://auth0.com/resources/ebooks/jwt-handbook)

### **NestJS Security**
- [NestJS Security](https://docs.nestjs.com/security/authentication)
- [NestJS Techniques](https://docs.nestjs.com/techniques/caching)

### **Angular Security**
- [Angular Security Guide](https://angular.io/guide/security)
- [Angular Best Practices](https://angular.io/guide/styleguide)

### **Discord API**
- [Discord Rate Limits](https://discord.com/developers/docs/topics/rate-limits)
- [Discord OAuth2](https://discord.com/developers/docs/topics/oauth2)

---

## 🔍 Checklist finale avant production

### **Sécurité**
- [ ] Tous les tokens sensibles en cookies httpOnly
- [ ] Rate limiting activé sur tous les endpoints publics
- [ ] Validation stricte de tous les inputs
- [ ] Sanitization HTML sur tout contenu utilisateur
- [ ] HTTPS uniquement (pas de HTTP)
- [ ] CORS configuré strictement
- [ ] Headers de sécurité (Helmet.js)
- [ ] Secrets en gestionnaire sécurisé (pas de .env)
- [ ] Rotation des secrets planifiée

### **Monitoring**
- [ ] Sentry configuré et testé
- [ ] Logs structurés (JSON)
- [ ] Métriques exportées (Prometheus/Grafana)
- [ ] Alertes configurées (erreurs, downtime, rate limit)
- [ ] Health checks endpoints
- [ ] Status page publique

### **Performance**
- [ ] Cache activé (Redis)
- [ ] Retry mechanism en place
- [ ] Connection pooling DB
- [ ] CDN pour assets statiques
- [ ] Compression activée (gzip/brotli)
- [ ] Images optimisées

### **Résilience**
- [ ] Backups automatiques DB (quotidien)
- [ ] Backup off-site (S3 ou équivalent)
- [ ] Plan de disaster recovery documenté
- [ ] Restore testé régulièrement
- [ ] Graceful shutdown
- [ ] Circuit breaker sur services externes

### **Conformité**
- [ ] RGPD - Politique de confidentialité
- [ ] RGPD - Droit à l'oubli implémenté
- [ ] RGPD - Export des données utilisateur
- [ ] Terms of Service acceptés
- [ ] Logs d'audit pour actions sensibles
- [ ] Rétention des données définie

### **Documentation**
- [ ] README à jour
- [ ] API documentation (Swagger)
- [ ] Architecture diagrams
- [ ] Runbook opérationnel
- [ ] Procédures d'incident
- [ ] Changelog maintenu

---

## 🚀 Prochaines étapes

### **Immédiat (Cette semaine)**
1. Implémenter refresh tokens httpOnly (#3)
2. Ajouter rate limiting (#4)
3. Tester le flow complet avec les nouvelles sécurités

### **Court terme (2 semaines)**
1. Validation stricte des inputs (#5)
2. Sanitization HTML (#6)
3. Retry mechanism (#7)
4. Tests end-to-end complets

### **Moyen terme (1 mois)**
1. Monitoring Sentry (#8)
2. Cache Discord API (#9)
3. Cleanup automatique (#10)
4. Audit de sécurité complet

### **Long terme (3 mois)**
1. Secrets management production (#11)
2. Backups production (#12)
3. Performance testing / Load testing
4. Penetration testing
5. Certification sécurité (ISO 27001, SOC 2)

---

## 📞 Support et questions

### **En cas de blocage**
1. Consulter la documentation AUTH.md
2. Vérifier les logs (`docker logs`, `npm run start:dev`)
3. Tester avec `curl` ou Postman
4. Inspecter Redis (`docker exec -it redis redis-cli`)

### **Ressources d'aide**
- Discord Developers: [discord.gg/discord-developers](https://discord.gg/discord-developers)
- NestJS Discord: [discord.gg/nestjs](https://discord.gg/nestjs)
- Stack Overflow: Tags `nestjs`, `discord-api`, `oauth2`

---

**Dernière mise à jour:** Octobre 2025  
**Version du document:** 1.0.0  
**Auteur:** Équipe Backend

**Prochaine révision:** Après implémentation du problème #3

---

🎉 **Bon courage pour l'implémentation!** N'hésitez pas à créer une nouvelle conversation pour chaque problème à résoudre. C'est plus facile de se concentrer sur un problème à la fois! 🚀