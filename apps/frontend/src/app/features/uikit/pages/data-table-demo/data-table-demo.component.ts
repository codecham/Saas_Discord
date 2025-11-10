import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DataTableComponent } from '@app/shared/components/ui/data-table/data-table.component';
import {
  DataTableColumn,
  DataTableAction,
  DataTableActionEvent,
  DataTableSelectionEvent,
} from '@app/shared/components/ui/data-table/data-table.types';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  joinedAt: Date;
  lastActive: Date;
  messagesCount: number;
}

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  rating: number;
  inStock: boolean;
}

/**
 * DataTable Component Demo Page
 * Showcases all features and variants of the DataTable component
 */
@Component({
  selector: 'app-data-table-demo',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, DataTableComponent],
  template: `
    <div class="grid">
      <div class="col-12">
        <div class="card">
          <h1 class="text-4xl font-bold mb-2">DataTable Component</h1>
          <p class="text-lg text-500 mb-4">
            A powerful and flexible table component with sorting, pagination, search, and actions.
          </p>
        </div>
      </div>

      <!-- Basic Example -->
      <div class="col-12">
        <div class="card">
          <div class="flex justify-content-between align-items-center mb-4">
            <h2 class="text-2xl font-semibold m-0">Basic Table</h2>
            <p-button
              [label]="showBasicCode() ? 'Hide Code' : 'Show Code'"
              icon="pi pi-code"
              [text]="true"
              (onClick)="showBasicCode.set(!showBasicCode())"
            />
          </div>

          <app-data-table
            [data]="users()"
            [columns]="userColumns()"
            [actions]="userActions()"
            [loading]="loadingUsers()"
            (onAction)="handleAction($event)"
          />

          @if (showBasicCode()) {
            <div class="mt-4 p-3 surface-ground border-round">
              <pre class="m-0"><code>{{ basicCode }}</code></pre>
            </div>
          }
        </div>
      </div>

      <!-- With Selection -->
      <div class="col-12">
        <div class="card">
          <div class="flex justify-content-between align-items-center mb-4">
            <h2 class="text-2xl font-semibold m-0">With Selection</h2>
            <p-button
              [label]="showSelectionCode() ? 'Hide Code' : 'Show Code'"
              icon="pi pi-code"
              [text]="true"
              (onClick)="showSelectionCode.set(!showSelectionCode())"
            />
          </div>

          @if (selectedUsers().length > 0) {
            <div class="mb-4 p-3 bg-primary-50 border-round">
              <p class="m-0 font-semibold">
                {{ selectedUsers().length }} user(s) selected
              </p>
              <p class="m-0 text-sm mt-2">
                IDs: {{ getSelectedUserIds() }}
              </p>
            </div>
          }

          <app-data-table
            [data]="users()"
            [columns]="userColumns()"
            [actions]="userActions()"
            [selectable]="true"
            (onSelectionChange)="handleSelectionChange($event)"
          />

          @if (showSelectionCode()) {
            <div class="mt-4 p-3 surface-ground border-round">
              <pre class="m-0"><code>{{ selectionCode }}</code></pre>
            </div>
          }
        </div>
      </div>

      <!-- Different Sizes -->
      <div class="col-12">
        <div class="card">
          <h2 class="text-2xl font-semibold mb-4">Size Variants</h2>
        </div>
      </div>

      <!-- Compact -->
      <div class="col-12">
        <div class="card">
          <h3 class="text-lg font-semibold mb-3">Compact</h3>
          <app-data-table
            [data]="products().slice(0, 3)"
            [columns]="productColumns()"
            [size]="'compact'"
            [paginated]="false"
            [searchable]="false"
            [showHeader]="false"
          />
        </div>
      </div>

      <!-- Default -->
      <div class="col-12">
        <div class="card">
          <h3 class="text-lg font-semibold mb-3">Default</h3>
          <app-data-table
            [data]="products().slice(0, 3)"
            [columns]="productColumns()"
            [size]="'default'"
            [paginated]="false"
            [searchable]="false"
            [showHeader]="false"
          />
        </div>
      </div>

      <!-- Comfortable -->
      <div class="col-12">
        <div class="card">
          <h3 class="text-lg font-semibold mb-3">Comfortable</h3>
          <app-data-table
            [data]="products().slice(0, 3)"
            [columns]="productColumns()"
            [size]="'comfortable'"
            [paginated]="false"
            [searchable]="false"
            [showHeader]="false"
          />
        </div>
      </div>

      <!-- Style Variants -->
      <div class="col-12">
        <div class="card">
          <h2 class="text-2xl font-semibold mb-4">Style Variants</h2>
        </div>
      </div>

      <!-- Default -->
      <div class="col-12">
        <div class="card">
          <h3 class="text-lg font-semibold mb-3">Default</h3>
          <app-data-table
            [data]="products().slice(0, 5)"
            [columns]="productColumns()"
            [variant]="'default'"
            [paginated]="false"
            [searchable]="false"
            [showHeader]="false"
          />
        </div>
      </div>

      <!-- Striped -->
      <div class="col-12">
        <div class="card">
          <h3 class="text-lg font-semibold mb-3">Striped</h3>
          <app-data-table
            [data]="products().slice(0, 5)"
            [columns]="productColumns()"
            [variant]="'striped'"
            [paginated]="false"
            [searchable]="false"
            [showHeader]="false"
          />
        </div>
      </div>

      <!-- Bordered -->
      <div class="col-12">
        <div class="card">
          <h3 class="text-lg font-semibold mb-3">Bordered</h3>
          <app-data-table
            [data]="products().slice(0, 5)"
            [columns]="productColumns()"
            [variant]="'bordered'"
            [paginated]="false"
            [searchable]="false"
            [showHeader]="false"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div class="col-12">
        <div class="card">
          <div class="flex justify-content-between align-items-center mb-4">
            <h2 class="text-2xl font-semibold m-0">Loading State</h2>
            <p-button
              label="Toggle Loading"
              icon="pi pi-sync"
              [outlined]="true"
              (onClick)="toggleLoading()"
            />
          </div>

          <app-data-table
            [data]="products()"
            [columns]="productColumns()"
            [loading]="loadingProducts()"
            [pageSize]="5"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div class="col-12">
        <div class="card">
          <h2 class="text-2xl font-semibold mb-4">Empty State</h2>

          <app-data-table
            [data]="[]"
            [columns]="productColumns()"
            [emptyState]="{
              icon: 'pi pi-shopping-cart',
              title: 'No products found',
              description: 'Start by adding your first product to the inventory.'
            }"
          />
        </div>
      </div>

      <!-- With Custom Actions -->
      <div class="col-12">
        <div class="card">
          <h2 class="text-2xl font-semibold mb-4">Custom Actions & Conditional Visibility</h2>

          <app-data-table
            [data]="products()"
            [columns]="productColumns()"
            [actions]="productActions()"
            (onAction)="handleProductAction($event)"
          />
        </div>
      </div>

      <!-- Scrollable Table -->
      <div class="col-12">
        <div class="card">
          <h2 class="text-2xl font-semibold mb-4">Scrollable Table (Fixed Height)</h2>

          <app-data-table
            [data]="users()"
            [columns]="userColumns()"
            [scrollable]="true"
            [scrollHeight]="'300px'"
            [paginated]="false"
          />
        </div>
      </div>

      <!-- API Reference -->
      <div class="col-12">
        <div class="card">
          <h2 class="text-2xl font-semibold mb-4">API Reference</h2>

          <div class="mb-4">
            <h3 class="text-xl font-semibold mb-3">Inputs</h3>
            <div class="surface-ground p-3 border-round">
              <table class="w-full">
                <thead>
                  <tr class="border-bottom-1 surface-border">
                    <th class="text-left p-2">Property</th>
                    <th class="text-left p-2">Type</th>
                    <th class="text-left p-2">Default</th>
                    <th class="text-left p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="border-bottom-1 surface-border">
                    <td class="p-2"><code>data</code></td>
                    <td class="p-2">T[]</td>
                    <td class="p-2">required</td>
                    <td class="p-2">Array of data to display</td>
                  </tr>
                  <tr class="border-bottom-1 surface-border">
                    <td class="p-2"><code>columns</code></td>
                    <td class="p-2">DataTableColumn[]</td>
                    <td class="p-2">required</td>
                    <td class="p-2">Column definitions</td>
                  </tr>
                  <tr class="border-bottom-1 surface-border">
                    <td class="p-2"><code>actions</code></td>
                    <td class="p-2">DataTableAction[]</td>
                    <td class="p-2">[]</td>
                    <td class="p-2">Action buttons for each row</td>
                  </tr>
                  <tr class="border-bottom-1 surface-border">
                    <td class="p-2"><code>loading</code></td>
                    <td class="p-2">boolean</td>
                    <td class="p-2">false</td>
                    <td class="p-2">Show loading skeleton</td>
                  </tr>
                  <tr class="border-bottom-1 surface-border">
                    <td class="p-2"><code>selectable</code></td>
                    <td class="p-2">boolean</td>
                    <td class="p-2">false</td>
                    <td class="p-2">Enable row selection</td>
                  </tr>
                  <tr class="border-bottom-1 surface-border">
                    <td class="p-2"><code>searchable</code></td>
                    <td class="p-2">boolean</td>
                    <td class="p-2">true</td>
                    <td class="p-2">Enable search input</td>
                  </tr>
                  <tr class="border-bottom-1 surface-border">
                    <td class="p-2"><code>paginated</code></td>
                    <td class="p-2">boolean</td>
                    <td class="p-2">true</td>
                    <td class="p-2">Enable pagination</td>
                  </tr>
                  <tr class="border-bottom-1 surface-border">
                    <td class="p-2"><code>pageSize</code></td>
                    <td class="p-2">number</td>
                    <td class="p-2">10</td>
                    <td class="p-2">Rows per page</td>
                  </tr>
                  <tr class="border-bottom-1 surface-border">
                    <td class="p-2"><code>size</code></td>
                    <td class="p-2">'compact' | 'default' | 'comfortable'</td>
                    <td class="p-2">'default'</td>
                    <td class="p-2">Table size variant</td>
                  </tr>
                  <tr class="border-bottom-1 surface-border">
                    <td class="p-2"><code>variant</code></td>
                    <td class="p-2">'default' | 'striped' | 'bordered'</td>
                    <td class="p-2">'default'</td>
                    <td class="p-2">Table style variant</td>
                  </tr>
                  <tr class="border-bottom-1 surface-border">
                    <td class="p-2"><code>scrollable</code></td>
                    <td class="p-2">boolean</td>
                    <td class="p-2">false</td>
                    <td class="p-2">Enable scrollable mode</td>
                  </tr>
                  <tr class="border-bottom-1 surface-border">
                    <td class="p-2"><code>scrollHeight</code></td>
                    <td class="p-2">string</td>
                    <td class="p-2">'400px'</td>
                    <td class="p-2">Scroll height when scrollable</td>
                  </tr>
                  <tr class="border-bottom-1 surface-border">
                    <td class="p-2"><code>emptyState</code></td>
                    <td class="p-2">DataTableEmptyState</td>
                    <td class="p-2">default</td>
                    <td class="p-2">Empty state configuration</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="mb-4">
            <h3 class="text-xl font-semibold mb-3">Outputs</h3>
            <div class="surface-ground p-3 border-round">
              <table class="w-full">
                <thead>
                  <tr class="border-bottom-1 surface-border">
                    <th class="text-left p-2">Event</th>
                    <th class="text-left p-2">Type</th>
                    <th class="text-left p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="border-bottom-1 surface-border">
                    <td class="p-2"><code>onAction</code></td>
                    <td class="p-2">DataTableActionEvent</td>
                    <td class="p-2">Emitted when an action button is clicked</td>
                  </tr>
                  <tr>
                    <td class="p-2"><code>onSelectionChange</code></td>
                    <td class="p-2">DataTableSelectionEvent</td>
                    <td class="p-2">Emitted when row selection changes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 class="text-xl font-semibold mb-3">Interfaces</h3>
            <div class="surface-ground p-3 border-round">
              <pre class="m-0"><code>{{ interfacesCode }}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DataTableDemoComponent {
  // Code visibility toggles
  showBasicCode = signal(false);
  showSelectionCode = signal(false);

  // Loading states
  loadingUsers = signal(false);
  loadingProducts = signal(false);

  // Selection state
  selectedUsers = signal<User[]>([]);

  // Mock data - Users
  users = signal<User[]>([
    {
      id: 1,
      username: 'john_doe',
      email: 'john@example.com',
      role: 'Admin',
      status: 'active',
      joinedAt: new Date('2024-01-15'),
      lastActive: new Date(),
      messagesCount: 1234,
    },
    {
      id: 2,
      username: 'jane_smith',
      email: 'jane@example.com',
      role: 'Moderator',
      status: 'active',
      joinedAt: new Date('2024-02-20'),
      lastActive: new Date(Date.now() - 3600000),
      messagesCount: 856,
    },
    {
      id: 3,
      username: 'bob_wilson',
      email: 'bob@example.com',
      role: 'Member',
      status: 'inactive',
      joinedAt: new Date('2024-03-10'),
      lastActive: new Date(Date.now() - 86400000 * 5),
      messagesCount: 342,
    },
    {
      id: 4,
      username: 'alice_johnson',
      email: 'alice@example.com',
      role: 'Member',
      status: 'active',
      joinedAt: new Date('2024-04-05'),
      lastActive: new Date(Date.now() - 7200000),
      messagesCount: 567,
    },
    {
      id: 5,
      username: 'charlie_brown',
      email: 'charlie@example.com',
      role: 'Member',
      status: 'pending',
      joinedAt: new Date('2024-05-12'),
      lastActive: new Date(Date.now() - 86400000),
      messagesCount: 123,
    },
  ]);

  // Mock data - Products
  products = signal<Product[]>([
    {
      id: 1,
      name: 'Premium Plan',
      category: 'Subscription',
      price: 29.99,
      stock: 100,
      rating: 4.8,
      inStock: true,
    },
    {
      id: 2,
      name: 'Basic Plan',
      category: 'Subscription',
      price: 9.99,
      stock: 500,
      rating: 4.5,
      inStock: true,
    },
    {
      id: 3,
      name: 'Custom Bot',
      category: 'Service',
      price: 199.99,
      stock: 5,
      rating: 4.9,
      inStock: true,
    },
    {
      id: 4,
      name: 'Pro Plan',
      category: 'Subscription',
      price: 49.99,
      stock: 0,
      rating: 4.7,
      inStock: false,
    },
    {
      id: 5,
      name: 'Enterprise',
      category: 'Subscription',
      price: 299.99,
      stock: 50,
      rating: 5.0,
      inStock: true,
    },
  ]);

  // User columns configuration
  userColumns = signal<DataTableColumn<User>[]>([
    { field: 'username', label: 'Username', sortable: true },
    { field: 'email', label: 'Email', sortable: true },
    { field: 'role', label: 'Role', sortable: true, align: 'center' },
    { field: 'status', label: 'Status', sortable: true, align: 'center' },
    { field: 'joinedAt', label: 'Joined', sortable: true, pipe: 'date', pipeArgs: 'short' },
    { field: 'messagesCount', label: 'Messages', sortable: true, align: 'right' },
  ]);

  // User actions configuration
  userActions = signal<DataTableAction[]>([
    {
      id: 'edit',
      label: 'Edit',
      icon: 'pi pi-pencil',
      severity: 'info',
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'pi pi-trash',
      severity: 'danger',
    },
  ]);

  // Product columns configuration
  productColumns = signal<DataTableColumn<Product>[]>([
    { field: 'name', label: 'Product', sortable: true },
    { field: 'category', label: 'Category', sortable: true },
    {
      field: 'price',
      label: 'Price',
      sortable: true,
      align: 'right',
      pipe: 'currency',
      pipeArgs: 'USD',
    },
    { field: 'stock', label: 'Stock', sortable: true, align: 'right' },
    { field: 'rating', label: 'Rating', sortable: true, align: 'center' },
  ]);

  // Product actions with conditional visibility
  productActions = signal<DataTableAction[]>([
    {
      id: 'view',
      label: 'View Details',
      icon: 'pi pi-eye',
      severity: 'info',
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: 'pi pi-pencil',
      severity: 'secondary',
    },
    {
      id: 'restock',
      label: 'Restock',
      icon: 'pi pi-plus',
      severity: 'success',
      visible: (row: Product) => !row.inStock || row.stock < 10,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'pi pi-trash',
      severity: 'danger',
    },
  ]);

  /**
   * Handle action click
   */
  handleAction(event: DataTableActionEvent<User>): void {
    console.log('Action:', event.actionId, 'User:', event.row.username);
    alert(`Action: ${event.actionId} on ${event.row.username}`);
  }

  /**
   * Handle product action click
   */
  handleProductAction(event: DataTableActionEvent<Product>): void {
    console.log('Action:', event.actionId, 'Product:', event.row.name);
    alert(`Action: ${event.actionId} on ${event.row.name}`);
  }

  /**
   * Handle selection change
   */
  handleSelectionChange(event: DataTableSelectionEvent<User>): void {
    this.selectedUsers.set(event.selectedRows);
    console.log('Selected users:', event.selectedRows);
  }

  /**
   * Get selected user IDs as comma-separated string
   */
  getSelectedUserIds(): string {
    return this.selectedUsers().map(u => u.id).join(', ');
  }

  /**
   * Toggle loading state
   */
  toggleLoading(): void {
    this.loadingProducts.set(true);
    setTimeout(() => {
      this.loadingProducts.set(false);
    }, 2000);
  }

  // Code examples
  basicCode = `<app-data-table
  [data]="users"
  [columns]="columns"
  [actions]="actions"
  (onAction)="handleAction($event)"
/>

// Column definition
columns = [
  { field: 'username', label: 'Username', sortable: true },
  { field: 'email', label: 'Email', sortable: true },
  { field: 'role', label: 'Role', sortable: true }
];

// Actions definition
actions = [
  { id: 'edit', label: 'Edit', icon: 'pi pi-pencil', severity: 'info' },
  { id: 'delete', label: 'Delete', icon: 'pi pi-trash', severity: 'danger' }
];`;

  selectionCode = `<app-data-table
  [data]="users"
  [columns]="columns"
  [selectable]="true"
  (onSelectionChange)="handleSelectionChange($event)"
/>

handleSelectionChange(event: DataTableSelectionEvent) {
  console.log('Selected:', event.selectedRows);
}`;

  interfacesCode = `interface DataTableColumn<T> {
  field: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  pipe?: string;  // 'date', 'currency', 'number', 'percent'
  pipeArgs?: any;
}

interface DataTableAction {
  id: string;
  label: string;
  icon: string;
  severity?: 'success' | 'info' | 'warning' | 'danger';
  disabled?: boolean;
  visible?: boolean | ((row: any) => boolean);
}

interface DataTableActionEvent<T> {
  actionId: string;
  row: T;
  index: number;
}

interface DataTableSelectionEvent<T> {
  selectedRows: T[];
  selectedIndices: number[];
}`;
}