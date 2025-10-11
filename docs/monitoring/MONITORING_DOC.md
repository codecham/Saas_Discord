# 📊 Documentation Monitoring - Grafana Loki + Winston

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Utilisation](#utilisation)
6. [Dashboard Grafana](#dashboard-grafana)
7. [Requêtes LogQL](#requêtes-logql)
8. [Maintenance](#maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Bonnes pratiques](#bonnes-pratiques)

---

## 🎯 Vue d'ensemble

### Objectif

Ce système de monitoring centralise tous les logs de l'application (Backend, Gateway, Bot) dans une interface unique (Grafana) pour faciliter le développement, le débogage et la surveillance en production.

### Stack technique

- **Winston** : Logger pour Node.js/NestJS (génération des logs)
- **Loki** : Système d'agrégation de logs (stockage)
- **Grafana** : Interface de visualisation (affichage)
- **Docker** : Conteneurisation de Loki et Grafana

### Avantages

✅ **Centralisation** : Tous les logs au même endroit  
✅ **Temps réel** : Logs visibles instantanément (délai ~5 secondes)  
✅ **Recherche puissante** : Filtrage par app, niveau, contexte, etc.  
✅ **Console lisible** : Format coloré et structuré en développement  
✅ **Rétention automatique** : Logs supprimés après 24h (configurable)  
✅ **Scalable** : Peut gérer des milliers de logs par seconde  
✅ **Gratuit** : 100% open-source

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│  APPLICATIONS (Node.js)                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Backend │  │ Gateway │  │   Bot   │        │
│  │  :3000  │  │  :3001  │  │         │        │
│  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │              │
│       └────────────┴────────────┘              │
│                    │                           │
│              Winston Logger                    │
│                    │                           │
│         ┌──────────┴──────────┐               │
│         │                     │               │
│         ▼                     ▼               │
│    Console (couleurs)    Loki Transport       │
│    (développement)       (JSON structuré)     │
│                               │               │
└───────────────────────────────┼───────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Loki Container      │
                    │   :3100               │
                    │                       │
                    │ - Stockage logs       │
                    │ - Indexation          │
                    │ - Rétention 24h       │
                    │ - Compaction auto     │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Grafana Container    │
                    │  :3002                │
                    │                       │
                    │ - Interface web       │
                    │ - Dashboards          │
                    │ - Requêtes LogQL      │
                    │ - Live tail           │
                    └───────────────────────┘
```

### Flux de données

1. **Application** génère un log avec Winston
2. **Winston** envoie le log :
   - À la **console** (format coloré, lisible)
   - À **Loki** (format JSON, structuré)
3. **Loki** indexe et stocke le log
4. **Grafana** lit les logs depuis Loki
5. **Utilisateur** visualise les logs dans Grafana

---

## 📦 Installation

### Prérequis

- Docker et Docker Compose installés
- Node.js 18+ et npm
- Projet avec Backend (NestJS), Gateway (NestJS), Bot (SapphireJS)

### Étape 1 : Docker Compose

Le fichier `infrastructure/docker/docker-compose.dev.yml` contient déjà :

```yaml
services:
  loki:
    image: grafana/loki:2.9.3
    ports:
      - "3100:3100"
    volumes:
      - loki_data:/loki
      - ./loki/loki-config.yaml:/etc/loki/loki-config.yaml:ro

  grafana:
    image: grafana/grafana:10.2.3
    ports:
      - "3002:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
```

### Étape 2 : Configuration Loki

Le fichier `infrastructure/docker/loki/loki-config.yaml` configure :
- Rétention de 24h
- Compaction automatique toutes les 10 minutes
- Limites de débit (10MB/sec)

### Étape 3 : Configuration Grafana

**Datasource** : `infrastructure/docker/grafana/provisioning/datasources/loki.yml`
```yaml
datasources:
  - name: Loki
    type: loki
    url: http://loki:3100
    isDefault: true
```

**Dashboard** : `infrastructure/docker/grafana/provisioning/dashboards/application-logs.json`
- Dashboard pré-configuré avec panneaux pour chaque app
- Compteurs colorés par niveau de log
- Vue d'ensemble en temps réel

### Étape 4 : Dépendances Node.js

**Backend et Gateway (NestJS) :**
```bash
npm install winston winston-loki nest-winston --workspace=apps/backend
npm install winston winston-loki nest-winston --workspace=apps/gateway
```

**Bot (SapphireJS) :**
```bash
npm install winston winston-loki --workspace=apps/bot
```

### Étape 5 : Démarrage

```bash
# 1. Démarrer les containers Docker
npm run db:up

# 2. Vérifier que Loki et Grafana sont OK
docker ps
curl http://localhost:3100/ready
curl http://localhost:3002/api/health

# 3. Démarrer les applications
npm run dev:backend   # Terminal 1
npm run dev:gateway   # Terminal 2
npm run dev:bot       # Terminal 3
```

### Étape 6 : Accès Grafana

**URL :** http://localhost:3002  
**Login :** admin  
**Password :** admin

---

## ⚙️ Configuration

### Configuration Winston

Chaque application (Backend, Gateway, Bot) a un fichier `winston.config.ts` :

**Backend :** `apps/backend/src/common/logger/winston.config.ts`  
**Gateway :** `apps/gateway/src/common/logger/winston.config.ts`  
**Bot :** `apps/bot/src/lib/logger/winston.config.ts`

#### Structure du logger

```typescript
export const createWinstonLogger = (service: string) => {
  const transports: winston.transport[] = [
    // Console : format lisible et coloré
    new winston.transports.Console({
      format: consoleFormat,
    }),
    
    // Loki : format JSON structuré
    new LokiTransport({
      host: lokiUrl,
      labels: { app: service, environment: 'development' },
      batching: true,
      interval: 5, // Envoi toutes les 5 secondes
    }),
  ];
  
  return WinstonModule.createLogger({
    level: 'debug', // en dev
    defaultMeta: { service, hostname, pid },
    transports,
  });
};
```

#### Format Console

**Avant :**
```json
{"level":"info","message":"Backend started","timestamp":"2025-10-11T04:40:44.166Z",...}
```

**Après :**
```
04:40:44 [BACKEND] info [Bootstrap] 🚀 Backend running on http://localhost:3000
```

**Légende :**
- `04:40:44` : Heure (HH:mm:ss)
- `[BACKEND]` : Badge coloré de l'application
  - Backend = fond bleu
  - Gateway = fond vert
  - Bot = fond magenta
- `info` : Niveau du log (coloré : error=rouge, warn=jaune, info=vert, debug=bleu)
- `[Bootstrap]` : Contexte (optionnel)
- Message principal

#### Format Loki (JSON)

Les logs envoyés à Loki sont en JSON structuré :

```json
{
  "timestamp": "2025-10-11T04:40:44.166Z",
  "level": "info",
  "message": "Backend running on http://localhost:3000",
  "context": "Bootstrap",
  "service": "backend",
  "hostname": "localhost",
  "pid": 12345
}
```

### Variables d'environnement

Ajouter dans `.env.development` de chaque app :

```bash
# Backend : apps/backend/.env.development
LOKI_URL=http://localhost:3100

# Gateway : apps/gateway/.env.development
LOKI_URL=http://localhost:3100

# Bot : apps/bot/.env.local
LOKI_URL=http://localhost:3100
```

**Pour désactiver Loki** (logs console uniquement) :
```bash
LOKI_URL=
```

### Configuration de la rétention

Modifier `infrastructure/docker/loki/loki-config.yaml` :

```yaml
limits_config:
  retention_period: 24h  # Modifier ici (ex: 48h, 7d, 30d)

compactor:
  compaction_interval: 10m  # Fréquence de nettoyage
  retention_enabled: true
```

**Valeurs courantes :**
- Développement : `24h`
- Staging : `7d` (7 jours)
- Production : `30d` (30 jours)

---

## 🎮 Utilisation

### Console (Développement)

Les logs apparaissent dans la console avec couleurs et structure :

```bash
npm run dev:backend
```

```
04:40:44 [BACKEND] info [Bootstrap] 🚀 Backend running on http://localhost:3000
04:40:45 [BACKEND] debug [DiscordService] Fetching guild 123456789
04:40:46 [BACKEND] warn [RateLimitGuard] Rate limit approaching for user 987654
04:40:47 [BACKEND] error [AuthController] Login failed: Invalid credentials
```

### Grafana (Dashboard)

**Accès :** http://localhost:3002

#### Navigation

1. **Dashboards** → **Application Logs - Vue d'ensemble**
2. **Explore** → Pour des requêtes personnalisées

#### Panneaux du dashboard

**Compteurs (5 minutes) :**
- ❌ Erreurs (rouge)
- ⚠️ Warnings (jaune)
- ℹ️ Info (bleu)
- 🐛 Debug (vert)

**Panneaux de logs :**
- 🔍 Tous les logs (temps réel)
- ❌ Erreurs uniquement
- ⚠️ Warnings uniquement
- 🖥️ Backend
- 🌐 Gateway
- 🤖 Bot

#### Live Tail

Pour voir les logs en temps réel :

1. Aller dans **Explore**
2. Taper une requête (ex: `{app="backend"}`)
3. Cliquer sur **Live** en haut à droite

Les logs s'affichent en continu comme `tail -f`.

---

## 📊 Dashboard Grafana

### Vue d'ensemble

Le dashboard `📊 Application Logs - Vue d'ensemble` contient :

1. **4 cartes de statistiques** (en haut)
   - Nombre de logs par niveau sur 5 minutes
   - Couleurs distinctes par niveau

2. **Vue temps réel** (milieu)
   - Tous les logs de toutes les apps
   - Rafraîchissement auto toutes les 5 secondes

3. **Panneaux par niveau** (bas gauche)
   - Erreurs isolées
   - Warnings isolés

4. **Panneaux par app** (bas droite)
   - Backend seul
   - Gateway seul
   - Bot seul

### Personnalisation

#### Modifier la période de temps

En haut à droite du dashboard :
- **Last 30 minutes** (par défaut)
- Last 1 hour
- Last 6 hours
- Last 24 hours
- Custom range

#### Modifier le rafraîchissement

En haut à droite :
- 5s (par défaut)
- 10s
- 30s
- 1m
- Off (manuel)

#### Ajouter un panneau

1. Cliquer sur **Add panel** (icône +)
2. Sélectionner **Logs** comme type
3. Datasource : **Loki**
4. Requête LogQL (voir section suivante)
5. Configurer l'affichage
6. **Save dashboard**

---

## 🔍 Requêtes LogQL

LogQL est le langage de requête de Loki, similaire à PromQL.

### Syntaxe de base

```logql
{label="value"}
```

### Requêtes courantes

#### Par application

```logql
# Backend uniquement
{app="backend"}

# Gateway uniquement
{app="gateway"}

# Bot uniquement
{app="bot"}

# Toutes les apps
{app=~"backend|gateway|bot"}
```

#### Par niveau

```logql
# Erreurs uniquement
{app=~"backend|gateway|bot"} |~ `"level":"error"`

# Warnings uniquement
{app=~"backend|gateway|bot"} |~ `"level":"warn"`

# Info et au-dessus (exclure debug)
{app=~"backend|gateway|bot"} |~ `"level":"info|warn|error"`

# Debug uniquement
{app=~"backend|gateway|bot"} |~ `"level":"debug"`
```

#### Par contexte

```logql
# Logs du contexte Bootstrap
{app="backend"} | json | context="Bootstrap"

# Logs du DiscordService
{app="backend"} | json | context="DiscordService"

# Tous les logs d'authentification
{app="backend"} | json | context=~"Auth.*"
```

#### Par contenu

```logql
# Logs contenant "discord" (insensible à la casse)
{app=~"backend|gateway|bot"} |~ "(?i)discord"

# Logs contenant "error" MAIS PAS "rate limit"
{app=~"backend|gateway|bot"} |~ "error" != "rate limit"

# Logs avec un guildId spécifique
{app=~"backend|gateway|bot"} |~ "449506572624986122"
```

#### Agrégations

```logql
# Nombre total de logs
sum(count_over_time({app=~"backend|gateway|bot"}[5m]))

# Logs par app
sum by (app) (count_over_time({app=~"backend|gateway|bot"}[5m]))

# Taux de logs par seconde
rate({app=~"backend|gateway|bot"}[1m])

# Nombre d'erreurs par app
sum by (app) (count_over_time({app=~"backend|gateway|bot"} |~ `"level":"error"` [5m]))
```

#### Parser le JSON

```logql
# Parser et extraire des champs
{app="backend"} | json

# Formater la sortie
{app="backend"} | json | line_format `{{.timestamp}} {{.level}} {{.message}}`

# Filtrer après parsing
{app="backend"} | json | level="error"
```

### Opérateurs

| Opérateur | Description | Exemple |
|-----------|-------------|---------|
| `=` | Égal | `{app="backend"}` |
| `!=` | Différent | `{app!="bot"}` |
| `=~` | Regex match | `{app=~"back.*"}` |
| `!~` | Regex non-match | `{app!~"bot"}` |
| `\|=` | Ligne contient | `\|= "error"` |
| `!=` | Ligne ne contient pas | `!= "debug"` |
| `\|~` | Ligne match regex | `\|~ "(?i)error"` |
| `!~` | Ligne non-match regex | `!~ "debug"` |

### Exemples avancés

#### Trouver les requêtes lentes

```logql
{app="backend"} |~ "Completed in [0-9]{3,}ms"
```

#### Top 10 des erreurs

```logql
topk(10, sum by (message) (count_over_time({app=~"backend|gateway|bot"} |~ `"level":"error"` [24h])))
```

#### Logs d'un utilisateur spécifique

```logql
{app="backend"} | json | userId="123456789"
```

#### Alertes potentielles

```logql
# Plus de 10 erreurs en 5 minutes
sum(count_over_time({app=~"backend|gateway|bot"} |~ `"level":"error"` [5m])) > 10
```

---

## 🔧 Maintenance

### Vider les logs manuellement

```bash
# Arrêter les containers
npm run db:down

# Supprimer le volume Loki
docker volume rm docker_loki_data

# Redémarrer
npm run db:up
```

### Voir l'espace disque utilisé

```bash
# Taille du volume Loki
docker system df -v | grep loki

# Logs Docker des containers
docker logs myproject-loki-dev
docker logs myproject-grafana-dev
```

### Backup du dashboard

Les dashboards sont dans `infrastructure/docker/grafana/provisioning/dashboards/`.

Pour sauvegarder :
```bash
cp infrastructure/docker/grafana/provisioning/dashboards/application-logs.json \
   infrastructure/docker/grafana/provisioning/dashboards/application-logs.backup.json
```

### Mise à jour des images Docker

```bash
# Arrêter les containers
npm run db:down

# Mettre à jour les images
docker pull grafana/loki:2.9.3
docker pull grafana/grafana:10.2.3

# Redémarrer
npm run db:up
```

### Monitoring de Loki lui-même

Loki expose des métriques Prometheus sur `:3100/metrics` :

```bash
curl http://localhost:3100/metrics
```

Métriques utiles :
- `loki_ingester_chunks_stored_total` : Nombre de chunks stockés
- `loki_distributor_bytes_received_total` : Octets reçus
- `loki_request_duration_seconds` : Latence des requêtes

---

## 🚨 Troubleshooting

### Problème : Les logs n'apparaissent pas dans Grafana

**Solutions :**

1. **Vérifier que Loki est accessible**
   ```bash
   curl http://localhost:3100/ready
   # Devrait retourner "ready"
   ```

2. **Vérifier les logs du container Loki**
   ```bash
   docker logs myproject-loki-dev --tail 50
   # Chercher des erreurs
   ```

3. **Vérifier la variable LOKI_URL dans l'app**
   ```bash
   # apps/backend/.env.development
   LOKI_URL=http://localhost:3100
   ```

4. **Vérifier les logs de l'app**
   Dans la console, tu devrais voir :
   ```
   📊 Logs envoyés vers Loki: http://localhost:3100
   ```

5. **Tester manuellement l'envoi de logs**
   ```bash
   curl -X POST http://localhost:3100/loki/api/v1/push \
     -H "Content-Type: application/json" \
     -d '{"streams":[{"stream":{"app":"test"},"values":[["'$(date +%s%N)'","test message"]]}]}'
   ```

### Problème : Erreur "Loki connection error"

**Cause :** L'app ne peut pas joindre Loki.

**Solutions :**

1. **Vérifier que Loki tourne**
   ```bash
   docker ps | grep loki
   ```

2. **Vérifier le port**
   ```bash
   netstat -an | grep 3100
   # ou
   lsof -i :3100
   ```

3. **Désactiver temporairement Loki**
   ```bash
   # Dans .env.development
   LOKI_URL=
   ```

### Problème : Dashboard vide ou "No data"

**Solutions :**

1. **Vérifier la période de temps**
   - En haut à droite, changer de "Last 30 minutes" à "Last 6 hours"

2. **Vérifier la datasource**
   - Aller dans **Configuration** → **Data sources** → **Loki**
   - Cliquer sur **Test** (devrait être vert)

3. **Tester une requête simple**
   - Aller dans **Explore**
   - Taper `{app=~".*"}`
   - Cliquer sur **Run query**

4. **Vérifier qu'il y a des logs**
   ```bash
   # Compter les logs dans Loki
   curl -G -s "http://localhost:3100/loki/api/v1/query" \
     --data-urlencode 'query=count_over_time({app=~".*"}[24h])'
   ```

### Problème : "Query timeout" dans Grafana

**Cause :** Trop de logs à charger.

**Solutions :**

1. **Réduire la période de temps**
   - Passer de "Last 24 hours" à "Last 1 hour"

2. **Filtrer la requête**
   ```logql
   # Au lieu de
   {app=~"backend|gateway|bot"}
   
   # Utiliser
   {app="backend"} |~ `"level":"error"`
   ```

3. **Augmenter le timeout dans Loki**
   ```yaml
   # loki-config.yaml
   limits_config:
     query_timeout: 5m  # Au lieu de 1m
   ```

### Problème : Logs illisibles dans la console

**Vérifier :**

1. **Format Winston est correct**
   - Relire `winston.config.ts`
   - Vérifier que `consoleFormat` est utilisé

2. **Couleurs désactivées**
   ```bash
   # Forcer les couleurs
   export FORCE_COLOR=1
   npm run dev:backend
   ```

3. **Terminal ne supporte pas les couleurs**
   - Utiliser un terminal moderne (iTerm2, Windows Terminal, etc.)

### Problème : Grafana ne démarre pas

**Solutions :**

1. **Vérifier les logs**
   ```bash
   docker logs myproject-grafana-dev
   ```

2. **Port déjà utilisé**
   ```bash
   lsof -i :3002
   # Tuer le processus ou changer le port
   ```

3. **Permissions sur les volumes**
   ```bash
   # Supprimer et recréer le volume
   docker volume rm docker_grafana_data
   npm run db:up
   ```

4. **Réinitialiser Grafana**
   ```bash
   docker exec -it myproject-grafana-dev grafana-cli admin reset-admin-password admin
   ```

---

## ✅ Bonnes pratiques

### Logging efficace

#### Niveaux de log

Utiliser les bons niveaux :

```typescript
// ERROR : Erreurs critiques nécessitant une action
logger.error('Failed to connect to database', error.stack);

// WARN : Problèmes potentiels, mais l'app continue
logger.warn('Rate limit approaching: 90% used');

// INFO : Événements importants normaux
logger.info('User logged in', { userId: '123' });

// DEBUG : Informations de débogage
logger.debug('Processing request', { endpoint: '/api/guilds' });
```

#### Structurer les logs

```typescript
// ❌ Mauvais : message non structuré
logger.info(`User ${userId} performed ${action}`);

// ✅ Bon : données structurées
logger.info('User action performed', {
  userId,
  action,
  timestamp: new Date(),
});
```

#### Contexte significatif

```typescript
// ❌ Mauvais : contexte générique
logger.log('Request completed', 'AppController');

// ✅ Bon : contexte spécifique
logger.log('GET /discord/guilds/:id completed in 220ms', 'DiscordResponseInterceptor');
```

#### Éviter les logs sensibles

```typescript
// ❌ Mauvais : données sensibles en clair
logger.info('User logged in', {
  email: 'user@example.com',
  password: 'secret123',
  token: 'eyJhbGc...',
});

// ✅ Bon : données masquées
logger.info('User logged in', {
  email: 'user@example.com',
  userId: '123',
  // password et token ne sont pas loggés
});
```

### Performance

#### Éviter les logs excessifs

```typescript
// ❌ Mauvais : log dans une boucle
users.forEach(user => {
  logger.debug('Processing user', { userId: user.id });
  // ...
});

// ✅ Bon : log une fois avec le total
logger.debug('Processing users', {
  count: users.length,
  userIds: users.map(u => u.id),
});
```

#### Utiliser le batching

Winston-Loki batch automatiquement les logs (toutes les 5 secondes). Ne pas modifier ce paramètre sauf besoin spécifique.

### Recherche efficace

#### Commencer large puis affiner

```logql
# 1. Tous les logs
{app=~"backend|gateway|bot"}

# 2. Uniquement les erreurs
{app=~"backend|gateway|bot"} |~ `"level":"error"`

# 3. Erreurs du backend
{app="backend"} |~ `"level":"error"`

# 4. Erreurs d'authentification
{app="backend"} |~ `"level":"error"` | json | context="AuthController"
```

#### Utiliser les labels

```logql
# Filtrer par label (rapide)
{app="backend"}

# Plutôt que par contenu (lent)
{app=~".*"} |~ "backend"
```

### Développement

#### En développement local

```bash
# Développement : Logs console + Loki
LOKI_URL=http://localhost:3100
NODE_ENV=development
```

Console : Format lisible et coloré  
Grafana : Historique et recherche

#### En production

```bash
# Production : Logs Loki uniquement
LOKI_URL=http://loki-service:3100
NODE_ENV=production
```

Console : Format JSON structuré (pour logging externe)  
Grafana : Monitoring principal

### Sécurité

#### Ne jamais logger

- ❌ Mots de passe
- ❌ Tokens d'accès
- ❌ Clés API
- ❌ Informations bancaires
- ❌ Données personnelles sensibles (RGPD)

#### Masquer les données sensibles

```typescript
// Helper pour masquer les données
function sanitize(data: any) {
  const sanitized = { ...data };
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey'];
  
  sensitiveKeys.forEach(key => {
    if (key in sanitized) {
      sanitized[key] = '***REDACTED***';
    }
  });
  
  return sanitized;
}

// Utilisation
logger.info('User data', sanitize(userData));
```

---

## 📈 Évolution future

### Extensions possibles

#### 1. Ajouter Prometheus pour les métriques

- Métriques business (nb guilds, events/sec)
- Métriques système (CPU, RAM)
- Alerting sur seuils

#### 2. Ajouter Sentry

- Tracking d'erreurs avancé
- Contexte utilisateur
- Release tracking
- Alertes email/Slack

#### 3. Logs structurés avancés

```typescript
logger.info('Guild action', {
  guildId: '123',
  action: 'member_ban',
  moderator: '456',
  target: '789',
  reason: 'Spam',
  metadata: {
    previousBans: 2,
    accountAge: '30d',
  },
});
```

Recherche Grafana :
```logql
{app="backend"} | json | action="member_ban"
```

#### 4. Alerting

Configurer des alertes dans Grafana :
- Email si > 10 erreurs en 5 minutes
- Slack si service down
- PagerDuty pour erreurs critiques

#### 5. Distributed Tracing

Ajouter OpenTelemetry pour tracer les requêtes à travers les services :
- Frontend → Backend → Gateway → Bot

---

## 📚 Ressources

### Documentation officielle

- [Winston](https://github.com/winstonjs/winston)
- [Loki](https://grafana.com/docs/loki/latest/)
- [Grafana](https://grafana.com/docs/grafana/latest/)
- [LogQL](https://grafana.com/docs/loki/latest/logql/)

### Tutoriels

- [LogQL Cheat Sheet](https://megamorf.gitlab.io/cheat-sheets/loki/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)

### Communauté

- [Grafana Community](https://community.grafana.com/)
- [Loki GitHub](https://github.com/grafana/loki)

---

## 🎓 Résumé des commandes

### Docker

```bash
# Démarrer Loki + Grafana
npm run db:up

# Arrêter
npm run db:down

# Voir les logs
npm run db:logs

# Redémarrer
npm run db:reset

# Redémarrer un seul container
docker restart myproject-loki-dev
docker restart myproject-grafana-dev

# Voir l'état des containers
docker ps

# Supprimer les volumes (reset complet)
docker volume rm docker_loki_data docker_grafana_data
```

### Applications

```bash
# Démarrer les apps
npm run dev:backend    # Terminal 1
npm run dev:gateway    # Terminal 2
npm run dev:bot        # Terminal 3

# Ou tout en même temps
npm run dev:all
```

### Grafana

```bash
# Accès web
open http://localhost:3002

# Login par défaut
# Username: admin
# Password: admin

# Reset password admin
docker exec -it myproject-grafana-dev grafana-cli admin reset-admin-password admin
```

### Loki

```bash
# Vérifier status
curl http://localhost:3100/ready

# Voir les métriques
curl http://localhost:3100/metrics

# Query API (nombre de logs)
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query=count_over_time({app=~".*"}[1h])'

# Labels disponibles
curl -G -s "http://localhost:3100/loki/api/v1/labels"
```

### Debugging

```bash
# Voir les logs d'un container
docker logs myproject-loki-dev --tail 50
docker logs myproject-grafana-dev --tail 50

# Suivre les logs en temps réel
docker logs -f myproject-loki-dev

# Inspecter un container
docker inspect myproject-loki-dev

# Entrer dans un container
docker exec -it myproject-grafana-dev sh

# Vérifier l'espace disque
docker system df -v
```

---

## 📝 Checklist de vérification

### Installation initiale

- [ ] Docker et Docker Compose installés
- [ ] Containers Loki et Grafana démarrent sans erreur
- [ ] Grafana accessible sur http://localhost:3002
- [ ] Loki répond sur http://localhost:3100/ready
- [ ] Datasource Loki configurée dans Grafana
- [ ] Dashboard importé et visible

### Configuration des apps

**Backend :**
- [ ] Winston installé (`winston`, `winston-loki`, `nest-winston`)
- [ ] Fichier `winston.config.ts` créé dans `src/common/logger/`
- [ ] `main.ts` modifié pour utiliser Winston
- [ ] Variable `LOKI_URL=http://localhost:3100` dans `.env.development`
- [ ] Logs visibles dans la console avec couleurs
- [ ] Badge `[BACKEND]` visible en bleu

**Gateway :**
- [ ] Winston installé (`winston`, `winston-loki`, `nest-winston`)
- [ ] Fichier `winston.config.ts` créé dans `src/common/logger/`
- [ ] `main.ts` modifié pour utiliser Winston
- [ ] Variable `LOKI_URL=http://localhost:3100` dans `.env.development`
- [ ] Logs visibles dans la console avec couleurs
- [ ] Badge `[GATEWAY]` visible en vert

**Bot :**
- [ ] Winston installé (`winston`, `winston-loki`)
- [ ] Fichier `winston.config.ts` créé dans `src/lib/logger/`
- [ ] `index.ts` modifié pour utiliser Winston
- [ ] Variable `LOKI_URL=http://localhost:3100` dans `.env.local`
- [ ] Logs visibles dans la console avec couleurs
- [ ] Badge `[BOT]` visible en magenta

### Vérification Grafana

- [ ] Dashboard affiche les 4 cartes colorées (Erreurs, Warnings, Info, Debug)
- [ ] Panneau "Tous les logs" affiche des données
- [ ] Requête `{app="backend"}` retourne des logs
- [ ] Requête `{app="gateway"}` retourne des logs
- [ ] Requête `{app="bot"}` retourne des logs
- [ ] Live tail fonctionne
- [ ] Filtrage par niveau fonctionne (`|~ "error"`)

### Tests fonctionnels

- [ ] Faire une requête au backend → voir le log dans Grafana
- [ ] Provoquer une erreur → voir le log en rouge dans le dashboard
- [ ] Redémarrer une app → voir les logs de démarrage
- [ ] Attendre 5-10 secondes → les logs apparaissent dans Grafana
- [ ] Chercher un log spécifique avec LogQL

---

## 🎯 Cas d'usage

### Déboguer une erreur en production

**Scénario :** Un utilisateur signale une erreur lors de la connexion.

**Étapes :**

1. **Identifier le moment de l'erreur**
   - Demander l'heure approximative à l'utilisateur
   - Aller dans Grafana, ajuster la période de temps

2. **Filtrer les logs d'authentification**
   ```logql
   {app="backend"} | json | context=~"Auth.*" | level="error"
   ```

3. **Trouver le log de l'utilisateur**
   ```logql
   {app="backend"} | json | context=~"Auth.*" | userId="123456"
   ```

4. **Examiner le contexte**
   - Cliquer sur le log pour voir tous les champs JSON
   - Noter le message d'erreur exact
   - Vérifier la stack trace si présente

5. **Voir les logs avant l'erreur**
   - Élargir la requête pour voir tous les niveaux
   ```logql
   {app="backend"} | json | userId="123456"
   ```

6. **Reproduire localement**
   - Avec les informations collectées, reproduire le bug en local
   - Observer les logs en temps réel dans la console

### Surveiller les performances

**Scénario :** Détecter les requêtes lentes.

**Dashboard personnalisé :**

```logql
# Requêtes > 500ms
{app="backend"} |~ "Completed in [5-9][0-9]{2,}ms"

# Requêtes > 1000ms (1 seconde)
{app="backend"} |~ "Completed in [0-9]{4,}ms"

# Top 10 des endpoints les plus lents
topk(10, avg_over_time({app="backend"} | json | unwrap duration [1h]) by (endpoint))
```

### Analyser un incident

**Scénario :** Le service est tombé entre 14h00 et 14h15.

**Étapes :**

1. **Définir la période**
   - Dans Grafana, sélectionner 13h45 à 14h30

2. **Voir tous les logs de cette période**
   ```logql
   {app=~"backend|gateway|bot"}
   ```

3. **Isoler les erreurs**
   ```logql
   {app=~"backend|gateway|bot"} |~ `"level":"error"`
   ```

4. **Compter les erreurs par app**
   ```logql
   sum by (app) (count_over_time({app=~"backend|gateway|bot"} |~ `"level":"error"` [30m]))
   ```

5. **Timeline des événements**
   - Activer le mode "Graph" au lieu de "Logs"
   - Visualiser les pics d'erreurs

6. **Root cause**
   - Examiner le premier log d'erreur
   - Remonter les logs avant pour voir ce qui a déclenché

### Monitoring quotidien

**Requêtes à surveiller chaque jour :**

```logql
# Nombre d'erreurs aujourd'hui
sum(count_over_time({app=~"backend|gateway|bot"} |~ `"level":"error"` [24h]))

# Applications les plus actives
sum by (app) (count_over_time({app=~"backend|gateway|bot"}[24h]))

# Erreurs par contexte
topk(5, sum by (context) (count_over_time({app="backend"} | json |~ `"level":"error"` [24h])))

# Taux d'erreur (erreurs / total logs)
sum(count_over_time({app=~"backend|gateway|bot"} |~ `"level":"error"` [24h])) 
/ 
sum(count_over_time({app=~"backend|gateway|bot"}[24h]))
```

---

## 🔐 Sécurité et conformité

### RGPD et données personnelles

**Règles :**

1. **Ne jamais logger :**
   - Emails complets (utiliser des hash)
   - Noms/prénoms
   - Adresses IP complètes (masquer les derniers octets)
   - Numéros de téléphone
   - Données de paiement

2. **Anonymiser les identifiants**
   ```typescript
   // ❌ Mauvais
   logger.info('User registered', {
     email: 'john.doe@example.com',
     name: 'John Doe',
   });
   
   // ✅ Bon
   logger.info('User registered', {
     userId: 'hash_abc123',
     domain: 'example.com',
   });
   ```

3. **Durée de rétention**
   - Dev : 24h (OK)
   - Prod : Dépend de la politique de l'entreprise (7-30 jours max recommandé)

4. **Droit à l'oubli**
   - Impossible de supprimer des logs spécifiques dans Loki
   - Solution : Filtrer les requêtes pour exclure un userId

### Sécurité en production

**Checklist production :**

- [ ] Grafana derrière un reverse proxy (Nginx)
- [ ] Grafana avec authentification forte (OAuth, LDAP)
- [ ] Loki accessible uniquement en interne (pas exposé publiquement)
- [ ] HTTPS activé sur Grafana
- [ ] Logs sensibles filtrés avant envoi
- [ ] Rétention configurée selon la politique de l'entreprise
- [ ] Backups réguliers des dashboards
- [ ] Alerting configuré sur les erreurs critiques

**Configuration production Grafana :**

```yaml
# grafana.ini
[server]
protocol = https
cert_file = /etc/ssl/certs/grafana.crt
cert_key = /etc/ssl/private/grafana.key

[auth]
disable_login_form = true

[auth.oauth]
enabled = true
# ... OAuth config

[security]
admin_user = admin
admin_password = <strong-password>
secret_key = <random-secret-key>
```

---

## 📊 Métriques et KPIs

### Métriques de monitoring

**À surveiller :**

| Métrique | Requête LogQL | Seuil |
|----------|---------------|-------|
| Taux d'erreur | `sum(rate({app=~".*"} \|~ "error" [5m]))` | < 1% |
| Erreurs totales | `sum(count_over_time({app=~".*"} \|~ "error" [1h]))` | < 10/heure |
| Logs par seconde | `sum(rate({app=~".*"}[1m]))` | Baseline |
| Latence moyenne | `avg(unwrap duration [5m])` | < 500ms |

### Alertes recommandées

**Configuration dans Grafana :**

1. **Alerte sur erreurs critiques**
   - Condition : > 10 erreurs en 5 minutes
   - Action : Email + Slack
   - Sévérité : High

2. **Alerte sur service down**
   - Condition : 0 logs depuis 2 minutes
   - Action : PagerDuty
   - Sévérité : Critical

3. **Alerte sur latence**
   - Condition : Latence moyenne > 2 secondes
   - Action : Slack
   - Sévérité : Medium

**Exemple de configuration :**

```yaml
# alert-rules.yaml
groups:
  - name: application_alerts
    interval: 1m
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate({app=~"backend|gateway|bot"} |~ `"level":"error"` [5m])) > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "More than 10 errors per minute for 5 minutes"
```

---

## 🎓 Formation de l'équipe

### Onboarding nouveau développeur

**Étape 1 : Installation (15 min)**

1. Cloner le repo
2. Suivre la section [Installation](#installation)
3. Démarrer les apps et vérifier les logs

**Étape 2 : Navigation Grafana (15 min)**

1. Se connecter à Grafana
2. Explorer le dashboard principal
3. Tester quelques requêtes LogQL

**Étape 3 : Utilisation pratique (30 min)**

1. Provoquer une erreur volontaire
2. La retrouver dans Grafana
3. Utiliser le Live tail
4. Créer une requête personnalisée

### Cheat sheet pour l'équipe

**À imprimer et afficher :**

```
┌─────────────────────────────────────────────┐
│   MONITORING - AIDE RAPIDE                  │
├─────────────────────────────────────────────┤
│                                             │
│  📊 ACCÈS                                    │
│  Grafana: http://localhost:3002            │
│  Login: admin / admin                       │
│                                             │
│  🔍 REQUÊTES COURANTES                       │
│  Tous les logs:                             │
│    {app=~"backend|gateway|bot"}            │
│                                             │
│  Erreurs uniquement:                        │
│    {app=~".*"} |~ `"level":"error"`        │
│                                             │
│  Mon app:                                   │
│    {app="backend"}                         │
│                                             │
│  Rechercher "discord":                      │
│    {app=~".*"} |~ "(?i)discord"            │
│                                             │
│  📱 AIDE                                     │
│  Doc: /docs/MONITORING_DOC.md              │
│  Slack: #tech-monitoring                   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🚀 Migration vers la production

### Différences dev vs prod

| Aspect | Développement | Production |
|--------|---------------|------------|
| Console | Couleurs, lisible | JSON structuré |
| Rétention | 24h | 7-30 jours |
| Niveau logs | debug | info |
| Loki | Container local | Service dédié |
| Grafana | Container local | Service managé |
| Authentification | admin/admin | OAuth/SSO |
| Alertes | Aucune | Email/Slack/PagerDuty |
| Backup | Aucun | Quotidien |

### Checklist migration production

**Infrastructure :**

- [ ] Loki déployé sur serveur dédié ou cloud
- [ ] Grafana déployé séparément
- [ ] Volumes persistants configurés
- [ ] Backups automatiques activés
- [ ] Monitoring de Loki lui-même (métriques)

**Configuration :**

- [ ] Rétention configurée (ex: 30 jours)
- [ ] Variables d'environnement prod
  ```bash
  NODE_ENV=production
  LOKI_URL=https://loki.votre-domaine.com
  ```
- [ ] Niveau de log : `info` (pas `debug`)
- [ ] Sanitization des données sensibles
- [ ] Rate limiting configuré

**Sécurité :**

- [ ] HTTPS activé
- [ ] OAuth/SSO configuré sur Grafana
- [ ] Loki non exposé publiquement
- [ ] Firewall configuré
- [ ] Logs d'accès Grafana activés

**Monitoring :**

- [ ] Alertes configurées
- [ ] Notification channels (email, Slack, PagerDuty)
- [ ] Dashboards production créés
- [ ] On-call rotation définie
- [ ] Runbook créé

**Documentation :**

- [ ] URLs de production documentées
- [ ] Contacts on-call documentés
- [ ] Procédures d'urgence écrites
- [ ] Équipe formée

### Configuration production recommandée

**docker-compose.prod.yml :**

```yaml
version: '3.8'

services:
  loki:
    image: grafana/loki:2.9.3
    restart: always
    volumes:
      - /data/loki:/loki
      - ./loki/loki-prod-config.yaml:/etc/loki/loki-config.yaml:ro
    networks:
      - internal
    # Pas de port exposé publiquement
    
  grafana:
    image: grafana/grafana:10.2.3
    restart: always
    environment:
      - GF_SERVER_DOMAIN=grafana.votre-domaine.com
      - GF_SERVER_ROOT_URL=https://grafana.votre-domaine.com
      - GF_AUTH_GENERIC_OAUTH_ENABLED=true
      # ... OAuth config
    volumes:
      - /data/grafana:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    networks:
      - internal
      - public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.grafana.rule=Host(`grafana.votre-domaine.com`)"
      - "traefik.http.routers.grafana.tls=true"

networks:
  internal:
    driver: bridge
  public:
    external: true
```

**loki-prod-config.yaml :**

```yaml
# Configuration production avec rétention 30 jours
limits_config:
  retention_period: 720h  # 30 jours
  ingestion_rate_mb: 50
  ingestion_burst_size_mb: 100

compactor:
  retention_enabled: true
  retention_delete_delay: 24h
  compaction_interval: 1h
```

---

## 📞 Support et contacts

### Ressources internes

- **Documentation :** `/docs/MONITORING_DOC.md`
- **Slack :** `#tech-monitoring`
- **Wiki :** `https://wiki.votre-entreprise.com/monitoring`
- **On-call :** Voir PagerDuty

### Support externe

- **Grafana Community :** https://community.grafana.com/
- **Loki GitHub Issues :** https://github.com/grafana/loki/issues
- **Winston GitHub :** https://github.com/winstonjs/winston

### Escalade

1. **Problème mineur** → Slack `#tech-monitoring`
2. **Problème bloquant** → Ticket Jira + mention `@tech-lead`
3. **Incident production** → PagerDuty alert

---

## 📝 Changelog

### Version 1.0.0 (Octobre 2025)

**Ajouté :**
- ✅ Configuration initiale Loki + Grafana
- ✅ Intégration Winston dans Backend, Gateway, Bot
- ✅ Dashboard "Application Logs - Vue d'ensemble"
- ✅ Format console coloré avec badges d'app
- ✅ Rétention automatique 24h
- ✅ Documentation complète

**Configuration :**
- Loki 2.9.3
- Grafana 10.2.3
- Winston 3.x
- Winston-Loki 6.x

---

## 🎉 Conclusion

Tu as maintenant un système de monitoring professionnel et scalable pour ton application Discord ! 🚀

**Ce que tu as gagné :**

✅ **Visibilité totale** sur tous tes services  
✅ **Debugging rapide** avec recherche puissante  
✅ **Console lisible** en développement  
✅ **Historique** des logs sur 24h  
✅ **Scalable** pour la production  
✅ **Gratuit** et open-source

**Prochaines étapes recommandées :**

1. ✨ Utiliser le monitoring au quotidien
2. 📊 Créer des dashboards personnalisés pour tes use cases
3. 🔔 Configurer des alertes pour la production
4. 📈 Ajouter Prometheus pour les métriques business
5. 🐛 Ajouter Sentry pour le tracking d'erreurs avancé

**Besoin d'aide ?**

- Relis cette doc (elle est complète !)
- Consulte les [exemples de requêtes LogQL](#requêtes-logql)
- Regarde le [troubleshooting](#troubleshooting)

Happy monitoring! 🎊

---

**Dernière mise à jour :** Octobre 2025  
**Version :** 1.0.0  
**Auteurs :** Équipe Backend  
**Licence :** MIT