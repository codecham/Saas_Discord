# Discord Admin App - Notes de Contexte Essentielles

## 📋 Document de Contexte pour Conversations Futures

Ce document contient toutes les informations critiques pour comprendre le projet et continuer son développement.

---

## 🎯 Vision & Objectifs du Projet

### Ambition
Créer une application d'administration/moderation Discord **premium** capable de concurrencer MEE6, Carl-Bot et Dyno avec une **différenciation forte** via un système de monétisation pour les admins.

### Différenciateurs Clés
1. **UI/UX supérieure** : Interface web moderne, intuitive (template Sakai + PrimeNG)
2. **Analytics avancées** : Stats détaillées serveur + membre (en temps réel)
3. **Tout-en-un simplifié** : Stats, modération, tickets, automatisations en une seule app
4. **Performance** : Architecture scalable 100 → 100,000+ serveurs
5. **🆕 Module de Monétisation** : Permettre aux admins de générer des revenus avec leur communauté

---

## 💰 Stratégie de Monétisation

### Vue d'Ensemble

L'application génère des revenus via **5 sources principales** :

1. **Abonnement Premium classique** (5-10% conversion attendue)
2. **Module de Monétisation** (commission sur revenus admins) ← **GAME-CHANGER**
3. **Pay-per-Use** sur modules gourmands
4. **Marketplace de Templates**
5. **Packages B2B Entreprises**

### Projection MRR Cible (1000 serveurs actifs)

| Source | Calcul | MRR |
|--------|--------|-----|
| Premium classique | 50 serveurs × 15€ | **750€** |
| Module Monétisation | 100 serveurs × 200€ revenus × 20% commission | **4,000€** |
| Pay-per-Use | Modules analytics/automod/tickets | **500€** |
| Marketplace Templates | Ventes passives | **300€** |
| **TOTAL** | | **~5,550€/mois** |

---

### 🎯 1. Abonnement Premium Classique (Freemium)

#### Plan Free
- Historique stats : 30 jours
- Automations : 5 max
- Analytics basiques
- Support communautaire

#### Plan Premium (15€/mois par serveur)
- Historique stats : illimité
- Automations : illimitées
- Analytics avancées (ML insights)
- Automod intelligent
- Support prioritaire
- Accès modules avancés

---

### 💎 2. Module de Monétisation (PRIORITÉ)

**Concept** : Permettre aux admins Discord de générer des revenus avec leur communauté, et prendre une commission (15-25%) sur ces revenus.

#### 🔴 CONTRAINTES DISCORD (CRITIQUES)

**Depuis Octobre 2024, Discord impose** :
- ✅ **Obligation** : Supporter les paiements via Discord Premium Apps
- ✅ **Autorisation** : Paiements externes possibles EN PARALLÈLE (Stripe, etc.)
- ✅ **Règle** : Prix sur Discord ≤ Prix ailleurs
- ❌ **Frais Discord** : 15% (premier $1M) puis 30% + ~6% Stripe

**Contenus INTERDITS** :
- Gambling / jeux d'argent
- Contenu sexuel explicite
- Armes / drogues
- Services de santé non approuvés
- Dating / rencontres
- Tout ce qui est sur la liste Stripe Prohibited Businesses

#### Architecture Hybride (Discord + Stripe)

**Paiements via Discord Premium Apps** (Obligatoire)
- Abonnements membres premium
- Attribution automatique de rôles Discord
- Commission : 15-20% sur ce que Discord nous reverse

**Paiements via Stripe Direct** (Optionnel mais rentable)
- Produits numériques complexes
- Événements payants
- Marketplace de services
- Commission : 20-30%

#### Core Features (MVP - Phase 1)

##### A. Abonnements Membres Premium
**Fonctionnalités** :
- Création de tiers d'abonnement (Bronze/Silver/Gold, etc.)
- Prix personnalisables par tier
- Attribution automatique de rôles Discord
- Renouvellements automatiques
- Webhooks Discord pour notifications

**Interface Admin** :
- Dashboard : MRR, churn rate, nouveaux abonnés
- Configuration des tiers
- Liste abonnés actifs avec filtres
- Historique des paiements

**Commission suggérée** : 15-20%

##### B. Vente de Produits Numériques
**Fonctionnalités** :
- Upload de fichiers (PDFs, videos, formations)
- Création de produits avec description/prix
- Livraison automatique par DM Discord
- Codes promo et réductions
- Bundle de produits

**Commission suggérée** : 20-25%

##### C. Système de Dons/Tips
**Fonctionnalités** :
- Boutons "Donate" intégrés dans Discord
- Messages de remerciement automatiques
- Leaderboard des donateurs
- Goals de financement participatif
- Montants suggérés ou libres

**Commission suggérée** : 10-15%

#### Advanced Features (Phase 2)

##### D. Événements Payants
- Vente de tickets pour streams, workshops, AMAs
- Accès automatique aux salons le jour J
- Reminders automatiques
- Replays payants

##### E. Marketplace de Services
- Membres proposent des services (coaching, commissions art)
- Système d'escrow (rétention argent jusqu'à livraison)
- Reviews et ratings
- Dispute resolution
- **Commission** : 25-30%

##### F. NFT/Token Gating (Optionnel)
- Vente de NFTs pour débloquer accès exclusifs

#### Interface Utilisateur

**Dashboard Admin Monétisation** :
```
📊 Revenus Total : 2,450€ (+15% vs mois dernier)
👥 Abonnés Actifs : 87 membres
📈 Graphique des revenus (Chart.js)
🎯 Top Produits
⚙️ Configuration
    ├─ Tiers d'abonnement
    ├─ Produits numériques
    ├─ Paramètres Stripe Connect
    └─ Historique des transactions
```

**Page Boutique Membres** :
```
🛒 Boutique du Serveur
├─ 💎 Abonnements Premium (cards avec features)
├─ 📦 Produits Numériques (grid avec preview)
├─ 🎟️ Événements à Venir
└─ 💝 Faire un Don
```

#### Architecture Technique

**Tables Prisma** :
```prisma
model MonetizationModule {
  id                String   @id @default(cuid())
  guildId           String   @unique
  stripeAccountId   String?  // Stripe Connect Account ID
  discordTeamId     String?  // Discord Premium Apps Team ID
  taxPercentage     Float    @default(20.0)
  isActive          Boolean  @default(false)
  
  subscriptionTiers SubscriptionTier[]
  digitalProducts   DigitalProduct[]
  donations         Donation[]
  transactions      Transaction[]
}

model SubscriptionTier {
  id          String  @id @default(cuid())
  name        String
  description String?
  price       Float
  currency    String  @default("EUR")
  roleId      String  // Discord Role ID à attribuer
  benefits    Json
  
  moduleId    String
  module      MonetizationModule @relation(...)
  subscriptions Subscription[]
}

model Transaction {
  id               String   @id @default(cuid())
  moduleId         String
  type             String   // subscription, product, donation
  amount           Float
  currency         String
  platformFee      Float    // Notre commission
  adminPayout      Float    // Ce que l'admin reçoit
  discordFee       Float?   // Frais Discord si via Premium Apps
  stripeFee        Float?   // Frais Stripe
  
  stripePaymentId  String?
  discordPaymentId String?
  status           String   // succeeded, failed, refunded
  
  createdAt        DateTime @default(now())
}
```

**Intégrations** :
- **Stripe Connect** : Gestion paiements admins
- **Discord Premium Apps API** : Abonnements obligatoires
- **Discord Webhooks** : Attribution rôles automatique
- **BullMQ** : Traitement paiements background

---

### 💸 3. Pay-per-Use sur Modules Spécifiques

**Module Tickets** :
- Gratuit : 50 tickets/mois
- Puis : 5€ / 100 tickets supplémentaires

**Module Analytics Avancées** :
- Gratuit : Stats de base
- Premium : 10€/mois pour ML insights, prédictions, alertes

**Module Automod Intelligent** :
- Gratuit : Règles basiques
- Premium : 15€/mois pour ML-based moderation, auto-responses

**Revenu mensuel estimé** : 500€ (pour 1000 serveurs actifs)

---

### 🛒 4. Marketplace de Templates

**Vente de templates pré-configurés** :
- "Gaming Server Setup" : 15€
- "Business Server Template" : 30€
- "Educational Server" : 20€
- "Community Hub" : 25€

**Commission** : 40-50% par vente
**Revenu passif estimé** : 300€/mois

---

### 🏢 5. Package B2B Entreprises

**Cible** : Entreprises utilisant Discord pour communautés clients/employés

**Offre Entreprise** :
- White-label (sans branding)
- Support prioritaire + SLA 99.9%
- Onboarding personnalisé
- Custom features sur demande
- SSO enterprise (SAML)
- Facturation annuelle

**Prix** : 200-500€/mois par entreprise
**Cible** : 5-10 entreprises la première année

---

### 📊 Autres Sources de Revenus (Futures)

#### Programme d'Affiliation
- 20% commission récurrente sur abonnés ramenés
- Système de referral links trackés

#### Partenariats Créateurs
- App gratuite pour gros influenceurs
- Rev-share sur leurs abonnés premium
- Promotion auprès de leur audience

#### Formations & Certifications
- "Devenir Admin Discord Pro" : 49€
- "Monétiser sa Communauté Discord" : 79€
- "Growth Hacking pour Discord" : 99€
- Badge certification officiel

#### Modèle "Pay What You Want"
- Pendant onboarding, demander don volontaire
- Beaucoup paieront 5-20€ si ils voient la valeur

---

### 🎯 Priorités Monétisation (Roadmap)

#### Phase 1 : Essentiels (3-6 mois) - MVP
1. ✅ Freemium avec soft limits
2. ✅ Billing Stripe basique (abonnements premium)
3. 🔴 **Module Monétisation - Abonnements via Discord Premium Apps**
4. 🔴 **Module Monétisation - Produits numériques via Stripe**

#### Phase 2 : Croissance (6-12 mois)
5. Pay-per-Use sur modules gourmands
6. Marketplace de templates
7. Programme d'affiliation
8. Module Monétisation - Dons/Tips

#### Phase 3 : Scale (12+ mois)
9. Package B2B entreprises
10. Formations & certifications
11. Module Monétisation - Marketplace services avec escrow
12. Module Monétisation - Événements payants

---

## 🏗️ Architecture Technique

### Stack Technologique

#### Frontend
- **Framework** : Angular 20
- **UI Library** : PrimeNG
- **Styling** : TailwindCSS (No SCSS)
- **Template** : Sakai (exemples dans fichiers `*demo.ts`)
- **Pattern** : Services en facade (facade → api → data)

#### Backend
- **Framework** : NestJS
- **ORM** : Prisma
- **Database** : PostgreSQL + TimescaleDB (extension time-series)
- **Cache** : Redis
- **Jobs** : BullMQ
- **Auth** : Discord OAuth 2.0 + JWT
- **Payments** : Stripe + Stripe Connect + Discord Premium Apps API

#### Bot
- **Framework** : SapphireJS (sur Discord.js)
- **Features** : Event listeners, slash commands, batching système
- **Resilience** : Backup SQLite si gateway offline

#### Gateway
- **Framework** : NestJS + Socket.IO
- **Rôle** : Hub WebSocket bidirectionnel Backend ↔ Bot
- **Scaling** : Multi-instances ready

#### Infrastructure
- **Containers** : Docker (PostgreSQL, Redis, Grafana, Loki)
- **Monitoring** : Prometheus + Grafana + Loki
- **Logs** : Structured logging avec Winston
- **CI/CD** : GitHub Actions
- **Hosting** : À définir (VPS, AWS, GCP, etc.)

---

### Principes Architecturaux CRITIQUES

#### 1. **Ne PAS stocker les données Discord**
- ❌ **NE PAS** persister : channels, roles, members (détails)
- ✅ **TOUJOURS** fetch depuis Discord API à la demande
- ✅ **UNIQUEMENT** stocker : 
  - Config app (guild_settings, automations, tickets)
  - Auth users (tokens chiffrés)
  - Stats agrégées (metrics_snapshots, member_stats)
  - Events time-series (30 jours rétention)
  - **Transactions monétisation** (historique paiements, commissions)
- **Raison** : Éviter désynchronisation, respecter guidelines Discord, réduire DB size

#### 2. **Cache Strategy**
- **Redis** : Cache court terme (1-5min) pour données Discord
- **TTL recommandés** :
  - Channels/Roles : 5 min
  - Members list : 1 min
  - Member details : 5 min
  - Stats dashboard : 5 min
  - Leaderboards : 10 min

#### 3. **Sharding-Ready dès le début**
- Tous les DTOs incluent `shardId?: number`
- Bot préparé pour ShardingManager Discord.js
- Gateway route par shardId
- Backend : ShardCoordinatorService (registry Redis)
- **Limite Discord** : 2500 guilds par shard

#### 4. **Sécurité & Compliance**
- Tokens chiffrés (AES-256)
- HTTPS obligatoire
- Rate limiting strict
- RGPD compliant (data retention, export, deletion)
- **PCI-DSS** : Pas de stockage cartes bancaires (géré par Stripe)
- **Discord TOS** : Respect strict Developer Policy + Monetization Policy
- **Stripe TOS** : Respect Connect Platform Agreement

#### 5. **Module System Architecture**
- Modules activables/désactivables par guild
- Config JSON flexible par module
- Permissions granulaires
- Limites par plan (Free vs Premium)
- **Module Monétisation** : Module optionnel premium avec config Stripe Connect

---

## 🔒 Sécurité & Conformité Monétisation

### Discord Guidelines (CRITIQUES)

**À RESPECTER ABSOLUMENT** :
1. ✅ **Obligation Premium Apps** : Tous les abonnements DOIVENT être disponibles via Discord Premium Apps
2. ✅ **Parité de prix** : Prix Discord ≤ Prix externes
3. ✅ **Pas de contenu interdit** : gambling, sexuel, armes, drogues, dating, etc.
4. ✅ **Pas de revente comptes Discord** : Interdit de vendre/acheter comptes, serveurs, rôles
5. ✅ **Respect Community Guidelines** : Toute monétisation doit respecter les règles Discord

**Documentation** :
- Discord Developer Policy : https://support-dev.discord.com/hc/en-us/articles/8563934450327
- Discord Monetization Policy : https://support.discord.com/hc/en-us/articles/10575066024983
- Discord Monetization Terms : https://support.discord.com/hc/en-us/articles/5330075836311
- Premium Apps Requirements : https://support-dev.discord.com/hc/en-us/articles/23810643331735

### Stripe Compliance

**Obligations** :
- Stripe Connect Platform : Nous sommes une "Platform"
- KYC obligatoire pour chaque admin (Stripe gère)
- Pas de stockage cartes bancaires
- Respect liste Prohibited Businesses
- Gestion chargebacks et refunds

### Fiscalité & Légal

**À prévoir** :
- TVA EU : Gestion automatique via Stripe Tax
- Déclaration revenus : Les admins sont responsables de déclarer
- CGV claires : Commissions, frais, refunds
- Politique remboursement : 14 jours EU minimum
- Support disputes : Système de résolution intégré

---

## 📚 Ressources & Documentation

### Docs Techniques
- `docs/ARCHITECTURE.md` : Vue ensemble système
- `docs/SCALING.md` : Guide scaling composants
- `docs/MONITORING.md` : Métriques et dashboards
- `docs/STATISTICS.md` : Système stats détaillé
- `docs/SYNC_STRATEGY.md` : Pourquoi pas de sync, comment ça marche
- `docs/PERMISSIONS.md` : Guards, overrides, vérifications
- `docs/MONETIZATION.md` : Architecture système de monétisation (À créer)

### APIs Externes
- **Discord API** : https://discord.com/developers/docs
- **Discord.js Guide** : https://discordjs.guide/
- **Sapphire Framework** : https://www.sapphirejs.dev/
- **PrimeNG** : https://primeng.org/
- **Stripe** : https://stripe.com/docs
- **Stripe Connect** : https://stripe.com/docs/connect
- **Discord Premium Apps** : https://discord.com/developers/docs/monetization/overview

### Communauté
- Discord Dev Server : https://discord.gg/discord-developers
- Discord.js Server : https://discord.gg/djs
- Stripe Dev Community : https://discord.gg/stripe

---

## 🚨 Notes Critiques pour Future Conversations

### Contexte Déjà Établi
1. ✅ **Toute la partie Auth** est complète et fonctionnelle
2. ✅ **Module Discord** backend opérationnel (endpoints guilds/channels/members/roles/bans)
3. ✅ **Monitoring** en place (Grafana, Loki, Prometheus ready)
4. ✅ **4 conteneurs Docker** fonctionnels (PostgreSQL, Redis, Grafana, Loki)
5. ✅ **Bot event listeners** capturent tous les événements et les envoient en batch
6. ✅ **Gateway** communique bidirectionnellement Backend ↔ Bot
7. ✅ **Système de modules** activables/désactivables en place

### En Cours / À Faire
- Stats backend + frontend (Phase 1 de la roadmap)
- Sync strategy (Phase 2)
- Member/Role management (Phase 3)
- **🆕 Module de Monétisation** (Phase future, après MVP core)
- Puis suivre roadmap séquentiellement

### Quand Démarrer une Nouvelle Conversation
**Fournis** :
1. Ce document (context notes)
2. La roadmap complète (artifact créé)
3. Le point où tu en es ("Je suis à la Phase X, Tâche Y")
4. Fichiers spécifiques concernés si besoin

**Format recommandé** :
```
Je travaille sur mon app Discord Admin.
Context : [lien vers ce document]
Roadmap : [lien artifact]
Actuellement : Phase 1, Tâche 1.1 (MetricsCollector)
Question : [ta question spécifique]
```

---

## 💡 Philosophie du Projet

### Principes de Développement
1. **Architecture first** : Scale-ready dès le début (pas de refacto massive plus tard)
2. **Code quality** : Tests, reviews, monitoring (éviter dette technique)
3. **User-centric** : UX > features (mieux vaut 5 features parfaites que 20 médiocres)
4. **Iterate fast** : MVP rapide, feedback users, amélioration continue
5. **Documentation** : Code autodocumenté + docs à jour (future you will thank you)
6. **🆕 Revenue-first** : Penser monétisation dès le design des features

### Mindset
- **Done > Perfect** : Ship fast, improve later
- **Measure everything** : Data-driven decisions
- **Fail fast** : Test hypothèses rapidement
- **Stay lean** : Ne pas over-engineer (YAGNI principle)
- **🆕 Build to monetize** : Chaque feature doit avoir un path vers la monétisation

---

## 🎯 Priorités MVP (Quick Win)

### Phase 1 Must-Have (3-4 mois) - MVP CORE
1. ✅ **Infrastructure scalable** (Phase 0)
2. ✅ **Stats avancées** (Phase 1) ← DIFFÉRENCIATEUR
3. ✅ **Permissions & sync** (Phase 2)
4. ✅ **Member management** (Phase 3)
5. ✅ **Modération basique** (Phase 4)
6. ✅ **Billing Stripe Premium** (Phase 8)
7. ✅ **Polish & launch beta** (Phase 10)

### Phase 2 Post-Launch (4-6 mois) - MONÉTISATION
8. 🔴 **Module Monétisation MVP** :
   - Abonnements via Discord Premium Apps
   - Produits numériques via Stripe
   - Dashboard admin
   - Système de commissions
9. Tickets support
10. Automations avancées
11. Pay-per-Use modules

### Phase 3 Scale (6-12 mois)
12. Module Monétisation Advanced (Dons, Events, Marketplace)
13. Templates marketplace
14. Package B2B
15. Formations

**Stratégie** : Lancer rapidement avec **stats exceptionnelles** + UX supérieure = différenciation immédiate, puis **monétiser via le module admin** pour revenue scalable.

---

## 🐛 Common Pitfalls & Solutions

### ❌ Pitfall 1 : Sync DB avec Discord data
**Problème** : Désynchronisation, DB bloat, violation guidelines Discord  
**Solution** : Jamais stocker, toujours fetch API + cache court Redis

### ❌ Pitfall 2 : Rate limits Discord
**Problème** : 429 errors, bot ban temporaire  
**Solution** : Rate limiter service, respect buckets, queue requests

### ❌ Pitfall 3 : Memory leaks bot
**Problème** : RAM augmente indéfiniment  
**Solution** : Clear maps/sets régulièrement, WeakMap si possible, monitoring

### ❌ Pitfall 4 : N+1 queries DB
**Problème** : Latency élevée  
**Solution** : Prisma include/select, batching, dataloader

### ❌ Pitfall 5 : Pas de rollback plan
**Problème** : Deploy cassé = downtime  
**Solution** : CI/CD avec health checks, keep N-1 version, feature flags

### ❌ Pitfall 6 : Violation Discord Monetization Policy
**Problème** : App bannie, revenus bloqués  
**Solution** : 
- TOUJOURS supporter Discord Premium Apps
- TOUJOURS respecter parité de prix
- JAMAIS vendre contenu interdit
- Review régulière de la Monetization Policy

### ❌ Pitfall 7 : Gestion chargebacks/refunds monétisation
**Problème** : Disputes, admins frustrés, perte revenus  
**Solution** :
- CGV claires sur refunds
- Système de dispute intégré
- Support réactif
- Monitoring des chargebacks (alert si > 1%)

---

## 🔍 Monitoring & Observability

### Métriques Clés (Prometheus)

#### Système & Performance
```
events_processed_total{type}          : Counter events par type
event_processing_duration_seconds{type} : Histogram latency
active_shards                          : Gauge nombre shards actifs
api_requests_total{endpoint, status}   : Counter API calls
db_query_duration_seconds{query}       : Histogram DB latency
redis_operations_total{operation}      : Counter Redis ops
```

#### Business & Monétisation
```
premium_subscriptions_active           : Gauge abonnés premium
monetization_revenue_total{type}       : Counter revenus par type
monetization_commission_total          : Counter commissions perçues
payment_processing_duration_seconds    : Histogram latency paiements
failed_payments_total{reason}          : Counter paiements échoués
chargeback_rate                        : Gauge taux de chargebacks
admin_payout_total                     : Counter payouts admins
stripe_webhook_events_total{type}      : Counter webhooks Stripe
discord_premium_apps_events_total{type}: Counter events Premium Apps
```

### Dashboards Grafana

1. **System Health** : CPU, RAM, DB connections, Redis memory
2. **Events Pipeline** : events/sec, latency p95/p99, error rate
3. **Bot Status** : shards actifs, guilds par shard, uptime
4. **API Performance** : requests/sec, latency, error rate par endpoint
5. **Business Metrics** : guilds actifs, users actifs, premium conversion
6. **🆕 Monetization Dashboard** :
   - MRR total et par source
   - Nombre admins utilisant monétisation
   - Revenus générés par admins (agrégé)
   - Commissions perçues
   - Taux de chargebacks
   - Volume paiements (Stripe vs Discord)
   - Errors paiements et webhooks

### Alertes Critiques

#### Système
- Service down (health check fail)
- Error rate > 5%
- Latency p95 > 500ms
- DB connections > 90%
- Redis memory > 90%
- Shard offline

#### Monétisation
- Payment processing error rate > 2%
- Chargeback rate > 1%
- Failed payout to admin
- Stripe webhook failure
- Discord Premium Apps API error
- Suspicious transaction pattern (fraud detection)

---

## 🚀 Quick Start Checklist

Quand tu démarres une nouvelle feature :

### Avant de Coder
- [ ] Lire ce document (CONTEXT_NOTE.md)
- [ ] Vérifier roadmap pour contexte
- [ ] Identifier dépendances (modules/services requis)
- [ ] Check guidelines Discord si feature touche API Discord
- [ ] **Si feature monétisation** : Check Monetization Policy + Stripe docs

### Pendant le Dev
- [ ] Suivre conventions de code
- [ ] Logger événements importants
- [ ] Ajouter métriques Prometheus si applicable
- [ ] Tester localement avec Docker Compose
- [ ] **Si feature monétisation** : Tester avec Stripe Test Mode

### Après le Code
- [ ] Tests unitaires (coverage > 80%)
- [ ] Tests E2E pour flows critiques
- [ ] Update documentation si nécessaire
- [ ] Review PR avec équipe
- [ ] Deploy staging → prod
- [ ] Monitor métriques post-deploy 24h

---

## 📞 Support & Questions

### En cas de Blocage Technique
1. Check les logs (backend, bot, gateway)
2. Vérifier métriques Grafana
3. Review cette doc + roadmap
4. Chercher dans Discord.js docs / Stripe docs
5. Ask Claude avec contexte complet

### En cas de Question Business/Monétisation
1. Re-lire section "Stratégie de Monétisation"
2. Check Discord Monetization Policy
3. Vérifier si conforme aux guidelines
4. Valider légal/fiscal si nécessaire
5. Ask Claude pour clarification

---

## 🎉 Conclusion

Ce projet vise à créer **la meilleure app d'admin Discord** avec une **différenciation forte via la monétisation**. 

**Trois piliers** :
1. 🎨 **UX exceptionnelle** (interface moderne, intuitive)
2. 📊 **Analytics avancées** (stats en temps réel, insights ML)
3. 💰 **Monétisation pour admins** (première app qui permet aux admins de gagner de l'argent facilement)

**Vision long terme** : Devenir la plateforme de référence pour gérer ET monétiser des communautés Discord, en prenant une commission sur l'écosystème créé.

**Mindset** : Ship fast, iterate, measure, scale. 🚀

---

**Dernière mise à jour** : Novembre 2025  
**Version** : 2.0 (ajout stratégie monétisation complète)