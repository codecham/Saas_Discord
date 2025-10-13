# 🎨 Frontend Roadmap & Architecture

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

**API Endpoint** : `GET /api/guilds/:guildId/stats/dashboard-hero`

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
  widgets: Array;
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
  notes: Array;
  actions: Array;
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

Let's disrupt le marché ! 💪🚀RéessayerClaude peut faire des erreurs. Assurez-vous de vérifier ses réponses.