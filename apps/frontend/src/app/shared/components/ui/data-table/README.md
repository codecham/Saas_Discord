# 📋 DataTable Component

Composant réutilisable de tableau de données avec tri, pagination, recherche, sélection et actions personnalisables.

---

## 📦 Installation

```typescript
// Importer le composant
import { DataTableComponent } from '@app/shared/components/ui/data-table/data-table.component';
import { 
  DataTableColumn, 
  DataTableAction,
  DataTableActionEvent,
  DataTableSelectionEvent
} from '@app/shared/components/ui/data-table/data-table.types';

// Dans votre composant standalone
@Component({
  standalone: true,
  imports: [DataTableComponent],
  // ...
})
```

---

## 🎯 Usage Basique

```html
<app-data-table
  [data]="users"
  [columns]="columns"
  [actions]="actions"
  (onAction)="handleAction($event)"
/>
```

```typescript
// Définition des données
users = [
  { id: 1, username: 'john_doe', email: 'john@example.com', role: 'Admin' },
  { id: 2, username: 'jane_smith', email: 'jane@example.com', role: 'Member' }
];

// Définition des colonnes
columns: DataTableColumn[] = [
  { field: 'username', label: 'Username', sortable: true },
  { field: 'email', label: 'Email', sortable: true },
  { field: 'role', label: 'Role', sortable: true, align: 'center' }
];

// Définition des actions
actions: DataTableAction[] = [
  { id: 'edit', label: 'Edit', icon: 'pi pi-pencil', severity: 'info' },
  { id: 'delete', label: 'Delete', icon: 'pi pi-trash', severity: 'danger' }
];

// Gestion des actions
handleAction(event: DataTableActionEvent) {
  console.log('Action:', event.actionId, 'Row:', event.row);
}
```

---

## 📋 API

### Inputs (Required)

| Input | Type | Description |
|-------|------|-------------|
| `data` | `T[]` | Tableau de données à afficher |
| `columns` | `DataTableColumn<T>[]` | Définition des colonnes |

### Inputs (Optional)

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `actions` | `DataTableAction[]` | `[]` | Actions disponibles par ligne |
| `loading` | `boolean` | `false` | État de chargement (skeleton) |
| `selectable` | `boolean` | `false` | Activer sélection multiple |
| `searchable` | `boolean` | `true` | Activer la recherche |
| `searchPlaceholder` | `string` | `'Search...'` | Placeholder de la recherche |
| `paginated` | `boolean` | `true` | Activer la pagination |
| `pageSize` | `number` | `10` | Nombre de lignes par page |
| `size` | `DataTableSize` | `'default'` | Taille du tableau |
| `variant` | `DataTableVariant` | `'default'` | Variant de style |
| `scrollable` | `boolean` | `false` | Mode scrollable (hauteur fixe) |
| `scrollHeight` | `string` | `'400px'` | Hauteur du scroll |
| `showHeader` | `boolean` | `true` | Afficher la section header |
| `emptyState` | `DataTableEmptyState` | default | Configuration état vide |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `onAction` | `DataTableActionEvent<T>` | Émis quand une action est cliquée |
| `onSelectionChange` | `DataTableSelectionEvent<T>` | Émis quand la sélection change |

---

## 🎨 Types

### DataTableColumn

```typescript
interface DataTableColumn<T> {
  /** Champ de la donnée */
  field: keyof T | string;
  
  /** Label de la colonne */
  label: string;
  
  /** Colonne triable */
  sortable?: boolean;
  
  /** Largeur de la colonne (CSS) */
  width?: string;
  
  /** Alignement du texte */
  align?: 'left' | 'center' | 'right';
  
  /** Pipe Angular à appliquer */
  pipe?: 'date' | 'currency' | 'number' | 'percent';
  
  /** Arguments du pipe */
  pipeArgs?: any;
  
  /** Clé de template custom */
  templateKey?: string;
}
```

### DataTableAction

```typescript
interface DataTableAction {
  /** ID unique de l'action */
  id: string;
  
  /** Label (tooltip) */
  label: string;
  
  /** Icône PrimeIcons */
  icon: string;
  
  /** Severity du bouton */
  severity?: 'success' | 'info' | 'warning' | 'danger' | 'help' | 'secondary';
  
  /** Action désactivée */
  disabled?: boolean;
  
  /** Visibilité conditionnelle */
  visible?: boolean | ((row: any) => boolean);
}
```

### DataTableSize

```typescript
type DataTableSize = 'compact' | 'default' | 'comfortable';
```

### DataTableVariant

```typescript
type DataTableVariant = 'default' | 'striped' | 'bordered';
```

---

## 💡 Exemples

### Avec sélection multiple

```html
<app-data-table
  [data]="members"
  [columns]="columns"
  [selectable]="true"
  (onSelectionChange)="handleSelection($event)"
/>
```

```typescript
handleSelection(event: DataTableSelectionEvent) {
  console.log('Selected rows:', event.selectedRows);
  console.log('Selected indices:', event.selectedIndices);
}
```

### Avec pipes pour formater les données

```typescript
columns: DataTableColumn[] = [
  { field: 'username', label: 'Username', sortable: true },
  { 
    field: 'joinedAt', 
    label: 'Joined', 
    sortable: true, 
    pipe: 'date', 
    pipeArgs: 'short' 
  },
  { 
    field: 'revenue', 
    label: 'Revenue', 
    sortable: true, 
    pipe: 'currency', 
    pipeArgs: 'USD',
    align: 'right'
  },
  { 
    field: 'rating', 
    label: 'Rating', 
    sortable: true, 
    pipe: 'percent',
    align: 'center'
  }
];
```

### Actions conditionnelles

```typescript
actions: DataTableAction[] = [
  {
    id: 'view',
    label: 'View',
    icon: 'pi pi-eye',
    severity: 'info'
  },
  {
    id: 'edit',
    label: 'Edit',
    icon: 'pi pi-pencil',
    severity: 'secondary'
  },
  {
    id: 'approve',
    label: 'Approve',
    icon: 'pi pi-check',
    severity: 'success',
    // Visible seulement si status = 'pending'
    visible: (row) => row.status === 'pending'
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: 'pi pi-trash',
    severity: 'danger'
  }
];
```

### Loading state

```html
<app-data-table
  [data]="members"
  [columns]="columns"
  [loading]="isLoading"
/>
```

```typescript
loadMembers() {
  this.isLoading = true;
  this.memberService.getAll().subscribe({
    next: (data) => {
      this.members = data;
      this.isLoading = false;
    },
    error: () => {
      this.isLoading = false;
    }
  });
}
```

### Empty state personnalisé

```html
<app-data-table
  [data]="[]"
  [columns]="columns"
  [emptyState]="{
    icon: 'pi pi-users',
    title: 'No members found',
    description: 'Start by inviting members to your server.'
  }"
/>
```

### Tailles différentes

```html
<!-- Compact - Pour beaucoup de données -->
<app-data-table
  [data]="logs"
  [columns]="columns"
  size="compact"
/>

<!-- Default - Équilibré -->
<app-data-table
  [data]="members"
  [columns]="columns"
  size="default"
/>

<!-- Comfortable - Pour la lisibilité -->
<app-data-table
  [data]="products"
  [columns]="columns"
  size="comfortable"
/>
```

### Variants de style

```html
<!-- Default -->
<app-data-table
  [data]="data"
  [columns]="columns"
  variant="default"
/>

<!-- Striped - Lignes alternées -->
<app-data-table
  [data]="data"
  [columns]="columns"
  variant="striped"
/>

<!-- Bordered - Avec bordures -->
<app-data-table
  [data]="data"
  [columns]="columns"
  variant="bordered"
/>
```

### Mode scrollable

```html
<!-- Tableau avec hauteur fixe et scroll -->
<app-data-table
  [data]="longList"
  [columns]="columns"
  [scrollable]="true"
  [scrollHeight]="'500px'"
  [paginated]="false"
/>
```

### Sans pagination

```html
<app-data-table
  [data]="shortList"
  [columns]="columns"
  [paginated]="false"
/>
```

### Sans recherche

```html
<app-data-table
  [data]="data"
  [columns]="columns"
  [searchable]="false"
/>
```

---

## 🏗️ Exemple Complet - Page Membres

```typescript
import { Component, inject, OnInit, signal } from '@angular/core';
import { DataTableComponent } from '@app/shared/components/ui/data-table/data-table.component';
import { 
  DataTableColumn, 
  DataTableAction, 
  DataTableActionEvent,
  DataTableSelectionEvent 
} from '@app/shared/components/ui/data-table/data-table.types';
import { MemberFacadeService } from '@core/services/member/member-facade.service';

interface Member {
  id: string;
  username: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  joinedAt: Date;
  messagesCount: number;
}

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [DataTableComponent],
  template: `
    <div class="card">
      <h1 class="text-3xl font-bold mb-4">Members Management</h1>
      
      <app-data-table
        [data]="members()"
        [columns]="columns"
        [actions]="actions"
        [loading]="isLoading()"
        [selectable]="true"
        [pageSize]="15"
        size="default"
        variant="striped"
        (onAction)="handleAction($event)"
        (onSelectionChange)="handleSelection($event)"
      />
    </div>
  `
})
export class MembersComponent implements OnInit {
  private memberFacade = inject(MemberFacadeService);
  
  // State
  members = this.memberFacade.members;
  isLoading = this.memberFacade.loading;
  selectedMembers = signal<Member[]>([]);
  
  // Columns configuration
  columns: DataTableColumn<Member>[] = [
    { field: 'username', label: 'Username', sortable: true },
    { field: 'email', label: 'Email', sortable: true },
    { field: 'role', label: 'Role', sortable: true, align: 'center' },
    { field: 'status', label: 'Status', sortable: true, align: 'center' },
    { 
      field: 'joinedAt', 
      label: 'Joined', 
      sortable: true, 
      pipe: 'date', 
      pipeArgs: 'short' 
    },
    { 
      field: 'messagesCount', 
      label: 'Messages', 
      sortable: true, 
      align: 'right' 
    }
  ];
  
  // Actions configuration
  actions: DataTableAction[] = [
    {
      id: 'view',
      label: 'View Profile',
      icon: 'pi pi-eye',
      severity: 'info'
    },
    {
      id: 'edit',
      label: 'Edit Member',
      icon: 'pi pi-pencil',
      severity: 'secondary'
    },
    {
      id: 'approve',
      label: 'Approve',
      icon: 'pi pi-check',
      severity: 'success',
      visible: (member: Member) => member.status === 'pending'
    },
    {
      id: 'ban',
      label: 'Ban Member',
      icon: 'pi pi-ban',
      severity: 'danger',
      visible: (member: Member) => member.status === 'active'
    }
  ];
  
  ngOnInit() {
    this.memberFacade.loadMembers();
  }
  
  handleAction(event: DataTableActionEvent<Member>) {
    const { actionId, row } = event;
    
    switch (actionId) {
      case 'view':
        this.viewMember(row);
        break;
      case 'edit':
        this.editMember(row);
        break;
      case 'approve':
        this.approveMember(row);
        break;
      case 'ban':
        this.banMember(row);
        break;
    }
  }
  
  handleSelection(event: DataTableSelectionEvent<Member>) {
    this.selectedMembers.set(event.selectedRows);
    console.log('Selected members:', event.selectedRows.length);
  }
  
  private viewMember(member: Member) {
    console.log('View member:', member.username);
    // Navigate to profile or show modal
  }
  
  private editMember(member: Member) {
    console.log('Edit member:', member.username);
    // Open edit dialog
  }
  
  private approveMember(member: Member) {
    console.log('Approve member:', member.username);
    this.memberFacade.approveMember(member.id);
  }
  
  private banMember(member: Member) {
    console.log('Ban member:', member.username);
    // Show confirmation dialog then ban
  }
}
```

---

## 🎯 Cas d'Usage

### 1. Liste de Membres Discord
- Colonnes : Username, Roles, Join Date, Messages
- Actions : View Profile, Edit, Ban, Kick
- Sélection multiple pour actions groupées

### 2. Liste de Channels
- Colonnes : Name, Type, Category, Members Count
- Actions : Edit, Delete, Archive
- Tri par type ou catégorie

### 3. Liste de Rôles
- Colonnes : Name, Color, Permissions Count, Members Count
- Actions : Edit, Delete, Clone
- Recherche par nom

### 4. Logs/Audit
- Colonnes : Timestamp, User, Action, Details
- Scrollable avec hauteur fixe
- Pas de sélection, pas d'actions

### 5. Produits/Plans
- Colonnes : Name, Price, Features, Stock
- Actions conditionnelles (Restock si stock bas)
- Pipes pour prix (currency)

---

## 🚀 Améliorations Futures

### v2 - Server-side
- [ ] Pagination server-side
- [ ] Tri server-side
- [ ] Recherche server-side avec debounce

### v2 - Filtres
- [ ] Filtres par colonne
- [ ] Filtres multiples
- [ ] Filtres sauvegardables

### v2 - Export
- [ ] Export CSV
- [ ] Export Excel
- [ ] Export PDF

### v3 - Advanced
- [ ] Colonnes redimensionnables
- [ ] Colonnes réordonnables (drag & drop)
- [ ] Templates custom par cellule
- [ ] Grouping par colonne
- [ ] Expansion rows

---

## 📚 Documentation

Pour une documentation complète avec exemples interactifs, visitez :
👉 **http://localhost:4200/uikit/data-table**

---

## ✅ Checklist d'Utilisation

- [ ] Import du composant
- [ ] Définir le type de vos données
- [ ] Configurer les colonnes
- [ ] Configurer les actions (si nécessaire)
- [ ] Gérer l'événement `onAction`
- [ ] Gérer l'événement `onSelectionChange` (si sélection activée)
- [ ] Tester le tri
- [ ] Tester la recherche
- [ ] Tester la pagination
- [ ] Gérer le loading state
- [ ] Personnaliser l'empty state

---

**Bon développement ! 🚀**