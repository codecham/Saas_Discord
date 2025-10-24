# 🗺️ Roadmap - Refonte Système de Statistiques

**Objectif** : Simplifier drastiquement le système de stats pour un code propre et un effet "WOW"

**Durée estimée** : 2-3 jours  
**Date de début** : ___________  
**Date de fin prévue** : ___________

---

## 📋 Phase 0 : Préparation (30 min)

**Objectif** : Sauvegarder et préparer le terrain

- [ ] Créer une branche `feature/stats-refactor`
- [ ] Backup de la DB actuelle
  ```bash
  docker exec myproject-postgres pg_dump -U myproject myproject > backup_stats_$(date +%Y%m%d).sql
  ```
- [ ] Documenter l'architecture actuelle dans `docs/archive/OLD_STATS_ARCHITECTURE.md`
- [ ] Lister les endpoints frontend à conserver
- [ ] Commit : "chore: backup before stats refactor"

---

## 🗄️ Phase 1 : Database Schema (1h30)

**Objectif** : Nouvelle table ultra-simple + nettoyage

### 1.1 Créer la nouvelle table (30 min)

- [ ] Créer migration Prisma `member_activity`
  ```prisma
  model MemberActivity {
    guildId            String
    userId             String
    date               DateTime  @db.Date
    
    // Compteurs journaliers
    messages           Int       @default(0)
    voiceMinutes       Int       @default(0)
    reactionsGiven     Int       @default(0)
    reactionsReceived  Int       @default(0)
    
    // Metadata JSONB
    channelBreakdown   Json?     // {"channel_id": message_count}
    peakHour          Int?       // Heure la plus active (0-23)
    
    // Timestamps
    createdAt         DateTime  @default(now())
    updatedAt         DateTime  @updatedAt
    
    @@id([guildId, userId, date])
    @@index([guildId, date])
    @@index([guildId, userId, date])
    @@map("member_activity")
  }
  ```

- [ ] Générer la migration
  ```bash
  npm run prisma:migrate:dev --name add_member_activity
  ```

- [ ] Vérifier la création dans la DB
  ```bash
  docker exec -it myproject-postgres psql -U myproject -d myproject -c "\d member_activity"
  ```

### 1.2 Supprimer les anciennes tables (30 min)

- [ ] Créer migration de suppression
  - [ ] Supprimer `metrics_snapshots`
  - [ ] Supprimer `member_stats` (ancienne version)
  - [ ] Garder `events` (hypertable) pour historique si besoin

- [ ] Tester la migration sur DB de dev

- [ ] Commit : "feat(db): add simplified member_activity table"

### 1.3 Vérifications (30 min)

- [ ] Vérifier les index créés
- [ ] Tester un INSERT manuel
- [ ] Tester une requête d'agrégation
- [ ] Documenter le schéma dans `docs/database/MEMBER_ACTIVITY_SCHEMA.md`

---

## 🤖 Phase 2 : Bot - Smart Collector (3h)

**Objectif** : Agrégation intelligente locale avant envoi

### 2.1 Créer le SmartStatsCollector (1h30)

- [ ] Créer `apps/bot/src/services/smartStatsCollector.service.ts`
  ```typescript
  interface DailyMemberStats {
    guildId: string;
    userId: string;
    date: string; // YYYY-MM-DD
    messages: number;
    voiceMinutes: number;
    reactionsGiven: number;
    reactionsReceived: number;
    channelBreakdown: Record<string, number>;
    hourlyActivity: number[]; // 24 slots
  }
  ```

- [ ] Implémenter méthodes :
  - [ ] `trackMessage(guildId, userId, channelId)`
  - [ ] `trackVoiceJoin(guildId, userId)`
  - [ ] `trackVoiceLeave(guildId, userId, duration)`
  - [ ] `trackReaction(guildId, userId, isGiven, targetUserId)`
  - [ ] `getOrCreateDayStats(guildId, userId, date)`
  - [ ] `flushToBackend()` - envoi batch toutes les heures

- [ ] Ajouter dans `container` Sapphire
  ```typescript
  declare module '@sapphire/pieces' {
    interface Container {
      statsCollector: SmartStatsCollector;
    }
  }
  ```

- [ ] Commit : "feat(bot): add SmartStatsCollector service"

### 2.2 Mettre à jour les listeners (1h)

- [ ] **MESSAGE_CREATE** : appeler `statsCollector.trackMessage()`
- [ ] **VOICE_STATE_UPDATE** : 
  - [ ] Détecter join → `trackVoiceJoin()`
  - [ ] Détecter leave → `trackVoiceLeave()` avec calcul durée
- [ ] **MESSAGE_REACTION_ADD** : appeler `trackReaction(isGiven: true)`
- [ ] **MESSAGE_REACTION_ADD** (indirect) : tracker `reactionsReceived` pour l'auteur du message
- [ ] **GUILD_MEMBER_ADD** : optionnel, logger seulement
- [ ] **GUILD_MEMBER_REMOVE** : optionnel, logger seulement

- [ ] Commit : "feat(bot): integrate SmartStatsCollector in listeners"

### 2.3 Système de Flush automatique (30 min)

- [ ] Créer cron job : flush toutes les heures
  ```typescript
  setInterval(() => {
    container.statsCollector.flushToBackend();
  }, 60 * 60 * 1000); // 1h
  ```

- [ ] Flush au shutdown propre
  ```typescript
  process.on('SIGTERM', async () => {
    await container.statsCollector.flushToBackend();
    process.exit(0);
  });
  ```

- [ ] Tester avec des logs : vérifier que le flush s'exécute

- [ ] Commit : "feat(bot): add auto-flush system for stats"

---

## 🔙 Phase 3 : Backend - Service Unifié (3h)

**Objectif** : 1 service, 3 méthodes, 0 complexité

### 3.1 Créer le StatsService (2h)

- [ ] Créer `apps/backend/src/modules/stats/stats.service.ts`

- [ ] Méthode 1 : `upsertDailyStats(batch: DailyStatsDto[])`
  - [ ] Recevoir le batch du bot
  - [ ] Upsert (INSERT ... ON CONFLICT) dans `member_activity`
  - [ ] Retourner count inserted/updated

- [ ] Méthode 2 : `getDashboardStats(guildId, period)`
  ```typescript
  async getDashboardStats(guildId: string, period: '7d' | '30d' | '90d') {
    // 1 requête SQL qui calcule tout
    const stats = await prisma.$queryRaw`
      SELECT 
        SUM(messages) as total_messages,
        SUM(voice_minutes) as total_voice_minutes,
        SUM(reactions_given) as total_reactions,
        COUNT(DISTINCT user_id) as active_members,
        AVG(messages) as avg_messages_per_member
      FROM member_activity
      WHERE guild_id = ${guildId}
        AND date >= CURRENT_DATE - INTERVAL '${period}'
    `;
    
    // Calculer période précédente pour comparaison
    const previousStats = await prisma.$queryRaw`...`;
    
    return {
      current: stats,
      changes: calculateChanges(stats, previousStats),
      healthScore: calculateHealthScore(stats),
      insights: generateInsights(stats)
    };
  }
  ```

- [ ] Méthode 3 : `getMemberStats(guildId, userId, period)`
  ```typescript
  async getMemberStats(guildId: string, userId: string, period: '30d') {
    const stats = await prisma.memberActivity.findMany({
      where: { guildId, userId, date: { gte: ... } },
      orderBy: { date: 'asc' }
    });
    
    return {
      totals: { messages, voice, reactions },
      timeline: stats.map(d => ({ date, messages, voice })),
      peakHours: calculatePeakHours(stats),
      favoriteChannels: extractTopChannels(stats),
      rank: await calculateRank(guildId, userId, 'messages'),
      consistency: calculateConsistency(stats)
    };
  }
  ```

- [ ] Méthode 4 : `getLeaderboard(guildId, metric, limit)`
  ```typescript
  async getLeaderboard(guildId: string, metric: 'messages' | 'voice' | 'reactions', limit = 10) {
    return prisma.$queryRaw`
      SELECT 
        user_id,
        SUM(${metric === 'messages' ? 'messages' : metric === 'voice' ? 'voice_minutes' : 'reactions_given'}) as score
      FROM member_activity
      WHERE guild_id = ${guildId}
        AND date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY user_id
      ORDER BY score DESC
      LIMIT ${limit}
    `;
  }
  ```

- [ ] Ajouter helpers :
  - [ ] `calculateChanges(current, previous)` - % de variation
  - [ ] `calculateHealthScore(stats)` - score 0-100
  - [ ] `generateInsights(stats)` - messages automatiques
  - [ ] `calculateConsistency(stats)` - régularité activité

- [ ] Commit : "feat(backend): add unified StatsService"

### 3.2 Créer le Controller (30 min)

- [ ] Créer `apps/backend/src/modules/stats/stats.controller.ts`

- [ ] **POST /stats/batch** (appelé par le bot)
  ```typescript
  @Post('batch')
  async upsertBatch(@Body() batch: DailyStatsDto[]) {
    return this.statsService.upsertDailyStats(batch);
  }
  ```

- [ ] **GET /stats/dashboard/:guildId**
  ```typescript
  @Get('dashboard/:guildId')
  async getDashboard(
    @Param('guildId') guildId: string,
    @Query('period') period: '7d' | '30d' = '7d'
  ) {
    return this.statsService.getDashboardStats(guildId, period);
  }
  ```

- [ ] **GET /stats/member/:guildId/:userId**
  ```typescript
  @Get('member/:guildId/:userId')
  async getMemberStats(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Query('period') period: '30d'
  ) {
    return this.statsService.getMemberStats(guildId, userId, period);
  }
  ```

- [ ] **GET /stats/leaderboard/:guildId**
  ```typescript
  @Get('leaderboard/:guildId')
  async getLeaderboard(
    @Param('guildId') guildId: string,
    @Query('metric') metric: 'messages' | 'voice' | 'reactions',
    @Query('limit') limit: number = 10
  ) {
    return this.statsService.getLeaderboard(guildId, metric, limit);
  }
  ```

- [ ] Ajouter guards (JWT, Guild access)

- [ ] Commit : "feat(backend): add stats REST endpoints"

### 3.3 Supprimer l'ancien code (30 min)

- [ ] Supprimer `events.module.ts` (ancien)
- [ ] Supprimer `metrics-aggregation.service.ts`
- [ ] Supprimer `stats-aggregation.processor.ts`
- [ ] Supprimer `message-events.processor.ts`
- [ ] Supprimer `voice-events.processor.ts`
- [ ] Supprimer `reaction-events.processor.ts`
- [ ] Supprimer les jobs BullMQ stats (garder queues pour autre usage)
- [ ] Nettoyer les imports dans les autres fichiers

- [ ] Commit : "chore(backend): remove old stats system"

---

## 🎨 Phase 4 : Frontend - Ultra-Simple (2h)

**Objectif** : Services façade qui consomment la nouvelle API

### 4.1 Mettre à jour les Services (1h)

- [ ] **StatisticsApiService** : simplifier les méthodes
  ```typescript
  getDashboardStats(guildId: string, period: '7d' | '30d') {
    return this.http.get<DashboardStatsDto>(
      `${this.apiUrl}/stats/dashboard/${guildId}?period=${period}`
    );
  }
  
  getMemberStats(guildId: string, userId: string) {
    return this.http.get<MemberStatsDto>(
      `${this.apiUrl}/stats/member/${guildId}/${userId}`
    );
  }
  
  getLeaderboard(guildId: string, metric: string, limit = 10) {
    return this.http.get<LeaderboardDto>(
      `${this.apiUrl}/stats/leaderboard/${guildId}?metric=${metric}&limit=${limit}`
    );
  }
  ```

- [ ] **StatisticsDataService** : simplifier les signals
  - [ ] Supprimer la logique de cache complexe
  - [ ] Garder juste les signals : `dashboardStats`, `memberStats`, `leaderboard`

- [ ] **StatisticsFacadeService** : nettoyer les méthodes inutilisées

- [ ] Commit : "refactor(frontend): simplify stats services"

### 4.2 Mettre à jour les DTOs (30 min)

- [ ] Créer `DashboardStatsDto`
  ```typescript
  export interface DashboardStatsDto {
    current: {
      totalMessages: number;
      totalVoiceMinutes: number;
      totalReactions: number;
      activeMembers: number;
    };
    changes: {
      messagesChange: number;    // %
      voiceChange: number;
      reactionsChange: number;
      membersChange: number;
    };
    healthScore: number;         // 0-100
    insights: string[];          // Messages automatiques
  }
  ```

- [ ] Créer `MemberStatsDto`
  ```typescript
  export interface MemberStatsDto {
    userId: string;
    totals: {
      messages: number;
      voiceMinutes: number;
      reactions: number;
    };
    timeline: Array<{
      date: string;
      messages: number;
      voice: number;
    }>;
    peakHours: number[];
    favoriteChannels: Array<{
      channelId: string;
      count: number;
    }>;
    rank: {
      messages: number;
      voice: number;
    };
    consistency: number;         // 0-1
  }
  ```

- [ ] Créer `LeaderboardEntryDto`

- [ ] Commit : "feat(frontend): add new stats DTOs"

### 4.3 Tester les Composants (30 min)

- [ ] Vérifier `DashboardComponent` : affichage correct
- [ ] Vérifier `StatsCardsWidget` : nouvelles données
- [ ] Vérifier `ActivityChartWidget` : timeline correcte
- [ ] Vérifier `LeaderboardWidget` : top membres
- [ ] Vérifier `MemberStatsComponent` : profil individuel

- [ ] Ajuster si nécessaire

- [ ] Commit : "fix(frontend): update components for new stats API"

---

## 🧪 Phase 5 : Tests & Validation (2h)

**Objectif** : S'assurer que tout fonctionne end-to-end

### 5.1 Tests Backend (45 min)

- [ ] Tester l'endpoint `/stats/batch` avec Postman
  ```json
  POST /stats/batch
  [
    {
      "guildId": "123",
      "userId": "456",
      "date": "2025-10-24",
      "messages": 50,
      "voiceMinutes": 120,
      "reactionsGiven": 10,
      "reactionsReceived": 15,
      "channelBreakdown": {"channel1": 30, "channel2": 20},
      "peakHour": 18
    }
  ]
  ```

- [ ] Vérifier INSERT dans la DB
- [ ] Tester `/stats/dashboard/:guildId?period=7d`
- [ ] Tester `/stats/member/:guildId/:userId`
- [ ] Tester `/stats/leaderboard/:guildId?metric=messages`
- [ ] Vérifier les temps de réponse (<100ms)

- [ ] Commit : "test(backend): validate stats endpoints"

### 5.2 Tests Bot (45 min)

- [ ] Lancer le bot en mode dev
- [ ] Envoyer des messages dans Discord
- [ ] Vérifier que `SmartStatsCollector` accumule les données
- [ ] Attendre 1h (ou forcer le flush)
- [ ] Vérifier les logs d'envoi vers le backend
- [ ] Vérifier que les données arrivent dans `member_activity`

- [ ] Tester également :
  - [ ] Join/leave vocal
  - [ ] Réactions

- [ ] Commit : "test(bot): validate SmartStatsCollector integration"

### 5.3 Tests Frontend (30 min)

- [ ] Lancer le frontend : `npm run start`
- [ ] Naviguer vers le dashboard
- [ ] Vérifier l'affichage des stats
- [ ] Changer la période (7d → 30d)
- [ ] Naviguer vers un profil membre
- [ ] Vérifier le leaderboard

- [ ] Vérifier responsive mobile

- [ ] Commit : "test(frontend): validate stats display"

---

## 📊 Phase 6 : Features "WOW" (3h)

**Objectif** : Ajouter les insights automatiques et visualisations avancées

### 6.1 Insights Automatiques Backend (1h30)

- [ ] Créer `apps/backend/src/modules/stats/insights.generator.ts`

- [ ] Implémenter détection de patterns :
  - [ ] **Croissance** : "+15% activité vs semaine dernière 🚀"
  - [ ] **Pic inhabituel** : "Record de messages hier : 450 messages ! 🔥"
  - [ ] **Inactivité** : "25% des membres inactifs depuis 30j ⚠️"
  - [ ] **Engagement** : "Taux de réaction en hausse de 20% 💬"
  - [ ] **Vocal** : "Temps vocal moyen : 2h30 par membre actif 🎙️"

- [ ] Système de scoring :
  ```typescript
  function calculateHealthScore(stats): number {
    let score = 50; // Base
    
    // Activité
    if (stats.activeMembers / stats.totalMembers > 0.5) score += 15;
    if (stats.messagesChange > 0) score += 10;
    
    // Engagement
    if (stats.totalReactions / stats.totalMessages > 0.1) score += 10;
    
    // Vocal
    if (stats.totalVoiceMinutes > 0) score += 15;
    
    return Math.min(score, 100);
  }
  ```

- [ ] Intégrer dans `getDashboardStats()`

- [ ] Commit : "feat(backend): add automatic insights generation"

### 6.2 Heatmap Heures de Pointe (1h)

- [ ] Backend : calculer l'activité par heure
  ```typescript
  async getActivityHeatmap(guildId: string, period: '7d') {
    // Retourner un tableau 24h avec le count total
    const heatmap = await prisma.$queryRaw`
      SELECT 
        peak_hour as hour,
        COUNT(*) as activity_count
      FROM member_activity
      WHERE guild_id = ${guildId}
        AND date >= CURRENT_DATE - INTERVAL '7 days'
        AND peak_hour IS NOT NULL
      GROUP BY peak_hour
      ORDER BY peak_hour
    `;
    
    return heatmap; // [0, 150, 200, ..., 180] (24 valeurs)
  }
  ```

- [ ] Frontend : créer `ActivityHeatmapComponent`
  - [ ] Utiliser PrimeNG Chart (bar horizontal)
  - [ ] Colorer les barres (vert = haute activité, rouge = faible)

- [ ] Intégrer dans le dashboard

- [ ] Commit : "feat: add activity heatmap visualization"

### 6.3 Badges Membres (30 min)

- [ ] Backend : calculer les badges automatiques
  ```typescript
  function calculateMemberBadges(memberStats, guildStats): string[] {
    const badges = [];
    
    if (memberStats.rank.messages <= 3) badges.push('🏆 Top Contributeur');
    if (memberStats.consistency > 0.8) badges.push('🔥 Streak 30 jours');
    if (memberStats.totals.voiceMinutes > 1000) badges.push('🎙️ Voice Champion');
    if (memberStats.totals.reactions > 500) badges.push('❤️ Réacteur Pro');
    
    return badges;
  }
  ```

- [ ] Frontend : afficher les badges sur le profil membre
  - [ ] Component `MemberBadgesComponent`
  - [ ] Badges colorés avec icônes

- [ ] Commit : "feat: add automatic member badges"

---

## 📚 Phase 7 : Documentation (1h)

**Objectif** : Documenter la nouvelle architecture

### 7.1 Documentation Technique (30 min)

- [ ] Créer `docs/stats/NEW_STATS_ARCHITECTURE.md`
  - [ ] Schéma de l'architecture
  - [ ] Flux de données Bot → Backend → Frontend
  - [ ] Explication de `member_activity` table
  - [ ] Liste des endpoints API
  - [ ] Exemples de requêtes SQL

- [ ] Créer `docs/stats/STATS_METRICS_GUIDE.md`
  - [ ] Liste des métriques disponibles
  - [ ] Formules de calcul (health score, consistency, etc.)
  - [ ] Comment ajouter une nouvelle métrique

- [ ] Commit : "docs: add new stats architecture documentation"

### 7.2 Guide Utilisateur (30 min)

- [ ] Créer `docs/stats/STATS_USER_GUIDE.md`
  - [ ] Comment lire le dashboard
  - [ ] Explication des insights
  - [ ] Comment utiliser le leaderboard
  - [ ] FAQ

- [ ] Mettre à jour le README principal

- [ ] Commit : "docs: add stats user guide"

---

## 🚀 Phase 8 : Déploiement (1h)

**Objectif** : Merger et déployer en production

### 8.1 Review & Merge (30 min)

- [ ] Vérifier que tous les tests passent
- [ ] Relire le code une dernière fois
- [ ] Créer une Pull Request vers `main`
  - [ ] Titre : "feat: complete stats system refactor"
  - [ ] Description détaillée des changements
  - [ ] Lister les breaking changes
  - [ ] Ajouter des screenshots

- [ ] Faire une review (ou self-review si solo)
- [ ] Merger la PR

### 8.2 Déploiement Production (30 min)

- [ ] Backup de la DB de production
- [ ] Déployer le backend
  - [ ] Run migrations : `npm run prisma:migrate:deploy`
  - [ ] Restart backend : `docker-compose restart backend`

- [ ] Déployer le bot
  - [ ] Build : `npm run build:bot`
  - [ ] Restart bot : `docker-compose restart bot`

- [ ] Déployer le frontend
  - [ ] Build : `npm run build:frontend`
  - [ ] Deploy sur Vercel/Netlify

- [ ] Vérifier que tout fonctionne en prod

- [ ] 🎉 **TERMINÉ !**

---

## ✅ Checklist Finale

- [ ] Toutes les phases complétées
- [ ] Tests end-to-end passent
- [ ] Documentation à jour
- [ ] Code review effectuée
- [ ] Déployé en production
- [ ] Monitoring activé (logs, errors)
- [ ] Célébrer ! 🎉

---

## 📝 Notes & Décisions

**Date** | **Note**
---------|----------
         | 
         | 
         | 

---

## 🐛 Problèmes Rencontrés

**Problème** | **Solution** | **Date**
-------------|--------------|----------
             |              | 
             |              | 

---

**Bonne chance ! 💪**