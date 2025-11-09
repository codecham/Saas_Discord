# 💳 Subscription Service - Implémentation (Core Service)

## 📋 Résumé

Ce service permet de gérer les plans d'abonnement des guilds (FREE, PRO, MAX).

**⚠️ IMPORTANT** : Le Subscription est un **service core**, pas un module activable.
Il est dans `src/core/subscription/`, pas dans `src/modules/`.

**Features actuelles** :
- ✅ Récupérer le plan d'une guild
- ✅ Créer un abonnement FREE par défaut
- ✅ Intégration avec le Module System pour vérifier les limites
- ✅ API REST pour le frontend

**Features futures** (avec paiement) :
- ⏳ Intégration Stripe/PayPal
- ⏳ Webhook de paiement
- ⏳ Auto-renewal
- ⏳ Historique des paiements

---

## 🏗️ Architecture : Core vs Module

### ✅ Core Services (src/core/)
Services d'infrastructure **toujours actifs** :
- `prisma` - Base de données
- `module-system` - Gestion des modules
- `gateway` - Communication avec le bot
- `subscription` - **Gestion des abonnements** ← ICI
- `auth` - Authentification

### ✅ Modules (src/modules/)
Features **activables/désactivables** par guild :
- `welcome` - Messages de bienvenue
- `stats` - Statistiques
- `automod` - Auto-modération

---

## 📂 Structure des Fichiers (CORRIGÉE)

```
apps/backend/src/
├── core/
│   ├── subscription/                      ← ICI (pas dans modules/)
│   │   ├── controllers/
│   │   │   └── subscription.controller.ts
│   │   ├── services/
│   │   │   └── subscription.service.ts
│   │   └── subscription.module.ts
│   └── module-system/
│       └── services/
│           └── module-manager.service.ts   (utilise SubscriptionService)
├── modules/
│   └── welcome/                            ← Modules activables
└── app.module.ts
```

**❌ NE PAS CRÉER** : `subscription.definition.ts` (pas un module activable)

---

## 🚀 Étapes d'Implémentation

### 1️⃣ Créer la structure du service core

```bash
cd apps/backend/src/core
mkdir -p subscription/controllers subscription/services
```

### 2️⃣ Copier les fichiers

Copie les fichiers dans leur emplacement respectif :

- `subscription.service.ts` → `apps/backend/src/core/subscription/services/`
- `subscription.controller.ts` → `apps/backend/src/core/subscription/controllers/`
- `subscription.module.ts` → `apps/backend/src/core/subscription/`

**❌ NE PAS copier** : `subscription.definition.ts` (n'existe plus)

### 3️⃣ Ajouter les enums Prisma

Dans `apps/backend/prisma/schema.prisma`, ajoute les enums **AVANT** les models :

```prisma
// ============================================
// ENUMS
// ============================================

enum Role {
  USER
  ADMIN
  SUPER_ADMIN
}

/// Enum pour les plans d'abonnement
enum SubscriptionPlan {
  FREE
  PRO
  MAX
  
  @@map("subscription_plan")
}

/// Enum pour le statut de l'abonnement
enum SubscriptionStatus {
  ACTIVE      // Abonnement actif et payé
  CANCELLED   // Annulé mais toujours actif jusqu'à la fin de période
  EXPIRED     // Période terminée, retour au FREE
  SUSPENDED   // Suspendu (ex: paiement échoué)
  TRIAL       // En période d'essai (optionnel pour plus tard)
  
  @@map("subscription_status")
}
```

### 4️⃣ Ajouter les models Prisma

Dans `apps/backend/prisma/schema.prisma`, ajoute à la fin :

```prisma
// ============================================
// SUBSCRIPTION SYSTEM
// ============================================

/// Abonnement d'une guild
model GuildSubscription {
  id        String   @id @default(cuid())
  guildId   String   @unique @map("guild_id") @db.VarChar(20)
  
  // Plan actuel
  plan      SubscriptionPlan @default(FREE)
  status    SubscriptionStatus @default(ACTIVE)
  
  // Période d'abonnement (null si FREE)
  startDate DateTime? @map("start_date") @db.Timestamptz
  endDate   DateTime? @map("end_date") @db.Timestamptz
  
  // Propriétaire de l'abonnement
  subscriberDiscordId String? @map("subscriber_discord_id") @db.VarChar(20)
  
  // Métadonnées pour le futur
  paymentProvider     String?  @map("payment_provider")
  paymentCustomerId   String?  @map("payment_customer_id")
  paymentSubscriptionId String? @map("payment_subscription_id")
  
  // Auto-renewal
  autoRenew Boolean @default(true) @map("auto_renew")
  
  // Historique
  previousPlan SubscriptionPlan? @map("previous_plan")
  upgradedAt   DateTime?         @map("upgraded_at") @db.Timestamptz
  downgradedAt DateTime?         @map("downgraded_at") @db.Timestamptz
  cancelledAt  DateTime?         @map("cancelled_at") @db.Timestamptz
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz
  
  // Relations
  guild            Guild                      @relation(fields: [guildId], references: [guildId], onDelete: Cascade)
  paymentHistory   SubscriptionPaymentHistory[]
  
  @@index([guildId])
  @@index([status])
  @@index([subscriberDiscordId])
  @@index([endDate])
  @@map("guild_subscriptions")
}

/// Historique des paiements
model SubscriptionPaymentHistory {
  id            String   @id @default(cuid())
  subscriptionId String  @map("subscription_id")
  
  // Informations de paiement
  amount        Decimal  @db.Decimal(10, 2)
  currency      String   @default("EUR") @db.VarChar(3)
  
  // Statut du paiement
  status        String
  
  // Provider info
  paymentProvider   String?  @map("payment_provider")
  paymentIntentId   String?  @map("payment_intent_id")
  paymentMethod     String?  @map("payment_method")
  
  // Période couverte
  periodStart   DateTime @map("period_start") @db.Timestamptz
  periodEnd     DateTime @map("period_end") @db.Timestamptz
  
  // Métadonnées
  failureReason String?  @map("failure_reason")
  refundedAt    DateTime? @map("refunded_at") @db.Timestamptz
  refundReason  String?  @map("refund_reason")
  
  // Timestamps
  paidAt    DateTime? @map("paid_at") @db.Timestamptz
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  
  // Relations
  subscription GuildSubscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  
  @@index([subscriptionId])
  @@index([status])
  @@index([paidAt])
  @@map("subscription_payment_history")
}
```

### 5️⃣ Ajouter la relation dans Guild

Dans le model `Guild`, ajoute :

```prisma
model Guild {
  // ... champs existants
  
  // Relations
  settings      GuildSettings?
  modules       GuildModule[]
  welcomeConfig WelcomeConfig?
  subscription  GuildSubscription?  // ← AJOUTER
  
  // ... reste du model
}
```

### 6️⃣ Générer la migration Prisma

```bash
cd apps/backend
npx prisma migrate dev --name add_subscription_system
npx prisma generate
```

### 7️⃣ Mettre à jour le ModuleSystemModule

Remplace le contenu de `apps/backend/src/core/module-system/module-system.module.ts` par le fichier fourni `module-system.module.ts`.

### 8️⃣ Mettre à jour le ModuleManagerService

Remplace le contenu de `apps/backend/src/core/module-system/services/module-manager.service.ts` par le fichier fourni `module-manager.service.ts`.

### 9️⃣ Importer dans AppModule

Dans `apps/backend/src/app.module.ts`, ajoute :

```typescript
import { SubscriptionModule } from './core/subscription/subscription.module';

@Module({
  imports: [
    // Core modules (infrastructure, toujours actifs)
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GatewayModule,
    ModuleSystemModule,
    SubscriptionModule,  // ← Core service
    
    // Feature modules (activables par guild)
    WelcomeModule,
    // StatsModule,
    // AutomodModule,
  ],
})
export class AppModule {}
```

### 🔟 Tester l'API

```bash
# Démarrer le backend
npm run start:dev

# Tester l'endpoint
curl http://localhost:3000/subscriptions/guilds/YOUR_GUILD_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📡 Endpoints Disponibles

### 1. GET `/subscriptions/guilds/:guildId`

Récupère l'abonnement complet d'une guild.

**Response** :
```json
{
  "id": "clxxx",
  "guildId": "123456789",
  "plan": "FREE",
  "status": "ACTIVE",
  "subscriberDiscordId": null,
  "autoRenew": false,
  "startDate": null,
  "endDate": null,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "guild": {
    "guildId": "123456789",
    "name": "My Discord Server",
    "icon": "abc123",
    "ownerDiscordId": "987654321"
  }
}
```

### 2. GET `/subscriptions/guilds/:guildId/plan`

Récupère uniquement le plan (endpoint léger).

**Response** :
```json
{
  "plan": "FREE"
}
```

---

## 🧪 Tests Manuels en DB

Pour changer le plan d'une guild manuellement (en attendant le paiement) :

```sql
-- Passer une guild en PRO
UPDATE guild_subscriptions
SET 
  plan = 'PRO',
  previous_plan = 'FREE',
  upgraded_at = NOW(),
  subscriber_discord_id = 'USER_DISCORD_ID'
WHERE guild_id = 'GUILD_ID';

-- Passer une guild en MAX
UPDATE guild_subscriptions
SET 
  plan = 'MAX',
  previous_plan = 'PRO',
  upgraded_at = NOW()
WHERE guild_id = 'GUILD_ID';
```

---

## 🔗 Intégration avec Module System

Le `ModuleManagerService` utilise maintenant automatiquement le `SubscriptionService` pour :

1. **Récupérer le plan** de la guild avant d'activer un module
2. **Vérifier les limites** selon le plan lors de l'utilisation des modules
3. **Bloquer l'activation** si le module n'est pas disponible pour le plan

**Exemple** :
```typescript
// Dans n'importe quel module
const limitCheck = await this.moduleManager.checkLimit({
  guildId: 'xxx',
  moduleId: 'welcome',
  resource: 'channels',
  currentCount: 2,
});

if (!limitCheck.allowed) {
  throw new Error(`Limite atteinte : ${limitCheck.limit}`);
}
```

---

## 🎨 Frontend (Angular)

Pour récupérer le plan dans le frontend :

```typescript
// guild.service.ts
getGuildSubscription(guildId: string): Observable<GuildSubscription> {
  return this.http.get<GuildSubscription>(
    `${this.apiUrl}/subscriptions/guilds/${guildId}`
  );
}

getGuildPlan(guildId: string): Observable<{ plan: string }> {
  return this.http.get<{ plan: string }>(
    `${this.apiUrl}/subscriptions/guilds/${guildId}/plan`
  );
}
```

---

## 📝 Prochaines Étapes

1. ✅ Implémentation du module Subscription
2. ✅ Intégration dans Module System
3. ⏳ Interface frontend pour afficher le plan
4. ⏳ Page de gestion d'abonnement
5. ⏳ Intégration Stripe/PayPal
6. ⏳ Webhooks de paiement
7. ⏳ Auto-renewal
8. ⏳ Gestion de la facturation

---

## ❓ Questions Fréquentes

### Q : Comment tester avec différents plans ?
**R** : Modifie manuellement dans la DB (voir section "Tests Manuels en DB")

### Q : Que se passe-t-il si une guild n'a pas d'abonnement ?
**R** : Un abonnement FREE est créé automatiquement lors de la première requête

### Q : Comment gérer le cas d'Alex (ban après paiement) ?
**R** : Le champ `subscriberDiscordId` permet de garder le lien entre le payeur et l'abonnement, même s'il est banni. La méthode `canManageSubscription()` vérifie si l'utilisateur peut gérer l'abonnement.

---

## 🎉 Félicitations !

Ton module Subscription est maintenant opérationnel ! 🚀