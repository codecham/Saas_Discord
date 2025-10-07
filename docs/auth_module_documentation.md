# 📚 Documentation du Module d'Authentification

## 🎯 Vue d'ensemble

Le module d'authentification gère l'ensemble du cycle de vie de l'authentification des utilisateurs via Discord OAuth 2.0, avec des mécanismes de sécurité avancés pour protéger contre les attaques CSRF, les fuites de tokens, et garantir une expérience utilisateur fluide.

---

## 🏗️ Architecture Globale

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Angular)                       │
├─────────────────────────────────────────────────────────────────┤
│  AuthFacade → AuthApi → HTTP Interceptor                        │
│  TokenService (localStorage) → AuthData (signals)               │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────────────┐
│                         BACKEND (NestJS)                         │
├─────────────────────────────────────────────────────────────────┤
│  AuthController                                                  │
│    ├─→ AuthService (JWT generation)                            │
│    ├─→ DiscordOAuthService (Discord API)                       │
│    ├─→ OAuthStateService (CSRF protection)                     │
│    ├─→ OAuthSessionService (Temporary sessions)                │
│    └─→ DiscordTokenService (Token cache & refresh)             │
├─────────────────────────────────────────────────────────────────┤
│  Security Layer                                                  │
│    ├─→ JwtAuthGuard (Route protection)                         │
│    ├─→ EncryptionService (Token encryption)                    │
│    └─→ RedisModule (State & session storage)                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
├─────────────────────────────────────────────────────────────────┤
│  • Discord OAuth API (oauth2/authorize, oauth2/token)          │
│  • PostgreSQL (User data, Refresh tokens)                      │
│  • Redis (OAuth states, Temporary sessions)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Flow d'Authentification Complet

### 1️⃣ **Initiation de la connexion**

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant R as Redis
    participant D as Discord

    U->>F: Click "Se connecter"
    F->>B: GET /api/auth/discord
    B->>R: Generate & store state (10 min TTL)
    B->>B: Build Discord URL with state
    B->>F: Redirect to Discord OAuth
    F->>D: Redirect user to Discord
    D->>U: Show authorization page
```

**Détails techniques:**
- Le `state` CSRF est un token de 64 caractères hex (32 bytes)
- Stocké dans Redis avec TTL de 10 minutes
- Clé Redis: `oauth:state:{state}`

### 2️⃣ **Callback Discord**

```mermaid
sequenceDiagram
    participant D as Discord
    participant B as Backend
    participant R as Redis
    participant DB as PostgreSQL
    participant F as Frontend

    D->>B: GET /callback?code=xxx&state=yyy
    B->>R: Validate state (one-time use)
    R-->>B: ✅ State valid (then deleted)
    B->>D: POST /oauth2/token (exchange code)
    D-->>B: Discord tokens (access + refresh)
    B->>D: GET /users/@me (user info)
    D-->>B: User profile
    B->>DB: Upsert user + encrypt Discord tokens
    B->>B: Generate JWT (access + refresh)
    B->>R: Store session (5 min TTL)
    B->>F: Redirect with sessionId
```

**Sécurité:**
- ✅ Validation du state CSRF (protection contre CSRF attacks)
- ✅ State one-time use (protection contre replay attacks)
- ✅ Discord tokens chiffrés en DB (AES-256-GCM)
- ✅ Session temporaire (tokens jamais dans l'URL)

### 3️⃣ **Échange de session (Frontend)**

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant R as Redis
    participant DB as PostgreSQL

    F->>B: POST /api/auth/exchange-session {sessionId}
    B->>R: Get session data
    R-->>B: {accessToken, refreshToken, userId}
    B->>R: Delete session (one-time use)
    B->>DB: Get user info
    B-->>F: {access_token, refresh_token, user}
    F->>F: Store tokens in localStorage
    F->>F: Load user data & guilds
    F->>F: Navigate to dashboard
```

**Points clés:**
- Session one-time use (protection contre replay)
- TTL de 5 minutes (limite la fenêtre d'attaque)
- Suppression immédiate après échange

---

## 📦 Services Détaillés

### 🔹 **AuthService** (`auth.service.ts`)

**Responsabilité:** Gestion centrale de l'authentification

**Méthodes principales:**

```typescript
// Gère le callback Discord OAuth
async handleDiscordCallback(code: string): Promise<LoginResponseDTO>

// Génère les JWT (access + refresh)
private async generateTokens(user: User): Promise<{accessToken, refreshToken}>

// Refresh les JWT de l'application
async refreshTokens(refreshToken: string): Promise<RefreshTokenResponseDTO>

// Déconnexion (supprime refresh tokens)
async logout(userId: string, refreshToken?: string): Promise<void>

// Récupère l'utilisateur courant
async getCurrentUser(userId: string): Promise<UserDTO>

// Valide un payload JWT
async validateUser(payload: JwtPayloadDTO): Promise<any>
```

**Dépendances:**
- `JwtService` - Génération/validation JWT
- `PrismaService` - Accès base de données
- `DiscordOAuthService` - Interaction Discord API
- `DiscordTokenService` - Cache tokens Discord

**Configuration JWT:**
```typescript
Access Token:
  - Secret: JWT_SECRET
  - Expiration: 15 minutes (JWT_ACCESS_EXPIRATION)
  - Payload: {sub: userId, discordId, username, role}

Refresh Token:
  - Secret: JWT_REFRESH_SECRET
  - Expiration: 7 jours (JWT_REFRESH_EXPIRATION)
  - Stocké hashé (SHA-256) en DB
```

---

### 🔹 **DiscordOAuthService** (`discord-oauth.service.ts`)

**Responsabilité:** Gestion de l'OAuth Discord

**Méthodes principales:**

```typescript
// Génère l'URL Discord OAuth avec state CSRF
async getAuthorizationUrl(): Promise<string>

// Échange le code OAuth contre des tokens Discord
async exchangeCode(code: string): Promise<DiscordTokenResponse>

// Récupère les infos utilisateur Discord
async getDiscordUser(accessToken: string): Promise<DiscordUser>

// Crée/met à jour l'utilisateur en DB
async upsertUser(discordUser: DiscordUser, tokens: DiscordTokenResponse): Promise<User>

// Refresh le token Discord d'un utilisateur
async refreshDiscordToken(userId: string): Promise<string>
```

**Discord API Endpoints utilisés:**
- `POST /oauth2/token` - Échange code/refresh token
- `GET /users/@me` - Récupère profil utilisateur

**Gestion des tokens Discord:**
```typescript
// Tokens chiffrés avant stockage
const encrypted = encryptionService.encrypt(token)

// Format en DB:
{
  accessToken: "iv:authTag:encryptedData",
  refreshToken: "iv:authTag:encryptedData",
  tokenExpiresAt: Date,
  tokenScope: "identify guilds email"
}
```

---

### 🔹 **OAuthStateService** (`oauth-state.service.ts`)

**Responsabilité:** Protection CSRF via state tokens

**Méthodes principales:**

```typescript
// Génère un state et le stocke dans Redis
async generateState(): Promise<string>

// Valide et supprime un state (one-time use)
async validateState(state: string): Promise<boolean>

// Supprime manuellement un state
async deleteState(state: string): Promise<void>

// Monitoring: compte les states actifs
async getActiveStateCount(): Promise<number>

// Nettoyage des states expirés (CRON)
async cleanupExpiredStates(): Promise<number>
```

**Structure Redis:**
```typescript
Key: oauth:state:{state}
Value: {
  createdAt: timestamp,
  used: boolean
}
TTL: 600 secondes (10 minutes)
Policy: volatile-lru (éviction automatique)
```

**Validations:**
- ✅ Format: 64 caractères hexadécimaux
- ✅ Existence dans Redis
- ✅ Non utilisé (used === false)
- ✅ Non expiré (age < 10 minutes)

---

### 🔹 **OAuthSessionService** (`oauth-session.service.ts`)

**Responsabilité:** Gestion des sessions OAuth temporaires

**Méthodes principales:**

```typescript
// Crée une session temporaire (retourne sessionId)
async createSession(accessToken, refreshToken, userId): Promise<string>

// Échange un sessionId contre les tokens (one-time use)
async exchangeSession(sessionId: string): Promise<{accessToken, refreshToken, userId}>

// Valide un state CSRF (délègue à OAuthStateService)
async validateState(state: string): Promise<boolean>

// Vérifie l'existence d'une session
async sessionExists(sessionId: string): Promise<boolean>

// Supprime une session
async deleteSession(sessionId: string): Promise<void>

// Health check Redis
async healthCheck(): Promise<{connected: boolean, activeSessions: number}>
```

**Structure Redis:**
```typescript
Key: oauth:session:{sessionId}
Value: {
  accessToken: string,    // JWT de notre app
  refreshToken: string,   // JWT de notre app
  userId: string,
  createdAt: timestamp
}
TTL: 300 secondes (5 minutes)
Policy: volatile-lru
```

**Sécurité:**
- SessionId: 64 caractères hex (crypto.randomBytes(32))
- One-time use: supprimé après échange (getdel atomique)
- TTL court: 5 minutes max
- Double validation: TTL Redis + age check

---

### 🔹 **DiscordTokenService** (`discord-token.service.ts`)

**Responsabilité:** Cache et refresh automatique des tokens Discord

**Méthodes principales:**

```typescript
// Récupère le token Discord (avec cache & auto-refresh)
async getDiscordAccessToken(userId: string): Promise<string>

// Invalide le cache d'un utilisateur
invalidateCache(userId: string): void

// Vérifie si un token est valide
private isTokenValid(expiresAt: number): boolean
```

**Cache en mémoire:**
```typescript
Map<userId, {
  token: string,
  expiresAt: number
}>
```

**Stratégie:**
1. Check cache → retourne si valide
2. Récupère depuis DB → déchiffre
3. Si expiré → refresh automatique via `DiscordOAuthService`
4. Met en cache → retourne

**Avantages:**
- Réduit les appels DB
- Refresh automatique transparent
- Pas de token expiré côté utilisateur

---

### 🔹 **EncryptionService** (`encryption.service.ts`)

**Responsabilité:** Chiffrement/déchiffrement des tokens Discord

**Méthodes:**

```typescript
// Chiffre un texte
encrypt(text: string): string

// Déchiffre un texte chiffré
decrypt(encryptedText: string): string

// Test du service
test(): boolean
```

**Configuration:**
```typescript
Algorithm: AES-256-GCM (AEAD)
Key: 32 bytes (64 chars hex) depuis ENCRYPTION_KEY
IV: 16 bytes aléatoires par chiffrement
Auth Tag: 16 bytes pour authentification

Format de sortie:
"iv:authTag:encryptedData" (tout en hex)
```

**Sécurité:**
- ✅ Chiffrement authentifié (AEAD)
- ✅ IV unique par opération
- ✅ Protection contre tampering (auth tag)
- ✅ Clé stockée en variable d'environnement

---

## 🛡️ Sécurité Implémentée

### ✅ **Protection CSRF (Cross-Site Request Forgery)**

**Problème:** Un attaquant force un utilisateur à se connecter avec le compte Discord de l'attaquant.

**Solution:**
```typescript
// 1. Génération du state avant redirect Discord
const state = await oauthStateService.generateState()
// Stocké dans Redis avec TTL 10 min

// 2. Discord callback avec state
GET /callback?code=xxx&state=yyy

// 3. Validation stricte
await oauthStateService.validateState(state)
// ✅ Existe, ✅ Non utilisé, ✅ Non expiré

// 4. Suppression immédiate (one-time use)
await redis.del(`oauth:state:${state}`)
```

### ✅ **Protection contre les fuites de tokens**

**Problème:** Tokens JWT exposés dans l'URL → logs, historique, referer headers.

**Solution:**
```typescript
// ❌ AVANT (vulnérable)
redirect(`/callback?access_token=xxx&refresh_token=yyy`)

// ✅ APRÈS (sécurisé)
const sessionId = await createSession(tokens)
redirect(`/callback?session=${sessionId}`)

// Frontend échange via POST
POST /api/auth/exchange-session
Body: {sessionId: "xxx"}
Response: {access_token, refresh_token}
```

### ✅ **Tokens Discord chiffrés**

**Problème:** Si la DB est compromise, tokens Discord exposés.

**Solution:**
```typescript
// Chiffrement AES-256-GCM avant stockage
const encrypted = encryptionService.encrypt(discordToken)
await prisma.user.update({
  data: { accessToken: encrypted }
})

// Déchiffrement à la demande uniquement
const token = encryptionService.decrypt(user.accessToken)
```

### ✅ **Refresh tokens hashés**

**Problème:** Si la DB est compromise, refresh tokens JWT exposés.

**Solution:**
```typescript
// Hash SHA-256 avant stockage
const hashed = crypto.createHash('sha256')
  .update(refreshToken)
  .digest('hex')

await prisma.refreshToken.create({
  data: { token: hashed }
})
```

### ✅ **Rate limiting recommandé**

```typescript
// À ajouter avec @nestjs/throttler
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('refresh')
async refresh() { ... }

@Throttle({ default: { limit: 10, ttl: 60000 } })
@Post('exchange-session')
async exchangeSession() { ... }
```

---

## 🗄️ Modèle de Données

### **User (PostgreSQL)**

```prisma
model User {
  id            String   @id @default(cuid())
  
  // Identité Discord
  discordId     String   @unique
  username      String
  discriminator String?
  globalName    String?
  avatar        String?
  email         String?
  
  // Tokens Discord (chiffrés AES-256-GCM)
  accessToken    String
  refreshToken   String
  tokenExpiresAt DateTime
  tokenScope     String
  
  // Métadonnées
  isActive       Boolean  @default(true)
  role           Role     @default(USER)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  lastLoginAt    DateTime @default(now())
  
  // Relations
  refreshTokens  RefreshToken[]
}
```

### **RefreshToken (PostgreSQL)**

```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique  // SHA-256 hash
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### **OAuth States (Redis)**

```
Key: oauth:state:{state}
Value: {"createdAt": timestamp, "used": false}
TTL: 600 secondes
```

### **OAuth Sessions (Redis)**

```
Key: oauth:session:{sessionId}
Value: {"accessToken": "...", "refreshToken": "...", "userId": "...", "createdAt": timestamp}
TTL: 300 secondes
```

---

## 🔧 Configuration

### **Variables d'environnement requises**

```env
# Discord OAuth
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_CALLBACK_URL=http://localhost:3000/api/auth/discord/callback
DISCORD_OAUTH_SCOPES=identify guilds email

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Encryption (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=your_64_char_hex_key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
# REDIS_PASSWORD= (optionnel)

# Frontend
FRONTEND_URL=http://localhost:4200

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### **Configuration Redis (docker-compose.yml)**

```yaml
redis:
  image: redis:7-alpine
  command: >
    redis-server
    --maxmemory 256mb
    --maxmemory-policy volatile-lru
    --save ""
    --appendonly no
  ports:
    - "6379:6379"
```

---

## 🧪 Tests & Debugging

### **Health Check**

```bash
# Vérifier Redis + sessions actives
curl http://localhost:3000/api/auth/health

# Réponse:
{
  "status": "healthy",
  "redis": {
    "connected": true,
    "activeSessions": 0
  },
  "timestamp": "2025-10-07T..."
}
```

### **Inspecter Redis**

```bash
# Se connecter à Redis
docker exec -it myproject-redis-dev redis-cli

# Voir toutes les clés
KEYS *

# Voir une session
GET oauth:session:xxx

# Voir un state
GET oauth:state:yyy

# Voir les TTL
TTL oauth:session:xxx
```

### **Logs importants**

```typescript
// Backend logs à surveiller
[Auth] Redirecting to frontend with sessionId: xxx
[OAuthSessionService] OAuth session created: xxx (expires in 300s)
[OAuthStateService] OAuth state generated: xxx... (expires in 600s)
[OAuthStateService] State validated successfully: xxx...
[DiscordOAuthService] User upserted: username (userId)
[DiscordTokenService] Token expired for user xxx, refreshing...
```

### **Tests manuels**

```bash
# 1. Flow complet
- Aller sur http://localhost:4200/auth/login
- Cliquer "Se connecter"
- Vérifier URL Discord contient &state=xxx
- Autoriser → Vérifier redirect avec ?session=yyy (PAS de tokens!)
- Vérifier connexion réussie

# 2. Test CSRF (replay attack)
- Copier l'URL du callback Discord
- La réutiliser → Doit échouer "State already used"

# 3. Test session expirée
- Attendre 5 minutes avec sessionId
- Essayer d'échanger → Doit échouer "Session expired"

# 4. Test state expiré
- Rester 10 min sur la page Discord
- Autoriser → Doit échouer "State expired"

# 5. Test refresh token
- Attendre 15 min (access token expiré)
- Faire une requête protégée
- L'intercepteur doit auto-refresh
```

---

## 📊 Monitoring & Métriques

### **Métriques recommandées**

```typescript
// À implémenter avec Prometheus/Grafana
- auth_login_total (counter)
- auth_login_success_total (counter)
- auth_login_failure_total (counter) par type d'erreur
- auth_session_active_count (gauge)
- auth_state_active_count (gauge)
- auth_token_refresh_total (counter)
- auth_token_refresh_failure_total (counter)
- auth_session_duration_seconds (histogram)
```

### **Alertes recommandées**

```yaml
# Auth failures spike
- alert: HighAuthFailureRate
  expr: rate(auth_login_failure_total[5m]) > 10
  
# Redis connection loss
- alert: RedisDown
  expr: redis_connected == 0
  
# Too many active sessions (possible attack)
- alert: TooManySessions
  expr: auth_session_active_count > 1000
```

---

## 🚀 Améliorations Futures (Roadmap)

### **Court terme**

- [ ] Rate limiting sur endpoints auth (`@nestjs/throttler`)
- [ ] Refresh tokens en httpOnly cookies (problème #3)
- [ ] Validation stricte des inputs (`class-validator`)
- [ ] Logs structurés (Winston/Pino)
- [ ] Monitoring (Sentry pour erreurs)

### **Moyen terme**

- [ ] 2FA (Two-Factor Authentication)
- [ ] Session management UI (voir tous les appareils connectés)
- [ ] IP whitelisting par utilisateur
- [ ] Détection d'activité suspecte
- [ ] Audit logs (qui s'est connecté quand, depuis où)

### **Long terme**

- [ ] OAuth avec d'autres providers (Google, GitHub)
- [ ] SSO (Single Sign-On) pour entreprises
- [ ] Passkeys / WebAuthn
- [ ] Biometric authentication mobile

---

## 📞 Support & Troubleshooting

### **Erreurs courantes**

**1. "Invalid or expired authentication state"**
```
Cause: State CSRF expiré ou invalide
Solution: Recommencer le flow OAuth (max 10 min sur page Discord)
```

**2. "Invalid or expired authentication session"**
```
Cause: SessionId expiré ou invalide
Solution: Recommencer le login (max 5 min pour échanger session)
```

**3. "Failed to refresh Discord token"**
```
Cause: Refresh token Discord révoqué/expiré
Solution: L'utilisateur doit se reconnecter
```

**4. "ENCRYPTION_KEY is not defined"**
```
Cause: Variable d'environnement manquante
Solution: Générer avec node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**5. Redis connection failed**
```
Cause: Redis non démarré
Solution: docker-compose up -d redis
```

### **Debug mode**

```typescript
// Activer logs détaillés (main.ts)
const app = await NestFactory.create(AppModule, {
  logger: ['error', 'warn', 'log', 'debug', 'verbose'],
});
```

---

## 📚 Ressources

### **Documentation externe**

- [Discord OAuth2](https://discord.com/developers/docs/topics/oauth2)
- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

### **Outils de développement**

- [jwt.io](https://jwt.io) - Decoder JWT
- [Redis Commander](https://www.npmjs.com/package/redis-commander) - GUI Redis
- [Prisma Studio](https://www.prisma.io/studio) - GUI PostgreSQL

---

**Version:** 1.0.0  
**Dernière mise à jour:** Octobre 2025  
**Maintenu par:** L'équipe Backend
