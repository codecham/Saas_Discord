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
    <div class="grid grid-cols-12 gap-4 md:gap-6">
      <!-- ============================================ -->
      <!-- HEADER -->
      <!-- ============================================ -->
      <div class="col-span-12">
        <div class="card">
          <h1 class="text-4xl font-bold mb-2">DataTable Component</h1>
          <p class="text-lg text-muted-color mb-0">
            A powerful and flexible table component with sorting, pagination, search, and actions.
          </p>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- BASIC EXAMPLE -->
      <!-- ============================================ -->
      <div class="col-span-12">
        <div class="card">
          <div class="flex justify-between items-center mb-4">
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
            <div class="mt-4 p-3 bg-surface-ground rounded-border">
              <pre class="m-0"><code>{{ basicCode }}</code></pre>
            </div>
          }
        </div>
      </div>

      <!-- ============================================ -->
      <!-- WITH SELECTION -->
      <!-- ============================================ -->
      <div class="col-span-12">
        <div class="card">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-semibold m-0">With Selection</h2>
            <p-button
              [label]="showSelectionCode() ? 'Hide Code' : 'Show Code'"
              icon="pi pi-code"
              [text]="true"
              (onClick)="showSelectionCode.set(!showSelectionCode())"
            />
          </div>

          <app-data-table
            [data]="users()"
            [columns]="userColumns()"
            [selectable]="true"
            [loading]="loadingUsers()"
            (onSelectionChange)="handleSelectionChange($event)"
          />

          @if (selectedUsers().length > 0) {
            <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-border">
              <p class="font-semibold mb-2">Selected: {{ selectedUsers().length }} user(s)</p>
              <div class="flex gap-2 flex-wrap">
                @for (user of selectedUsers(); track user.id) {
                  <span class="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 rounded-border text-sm">
                    {{ user.username }}
                  </span>
                }
              </div>
            </div>
          }

          @if (showSelectionCode()) {
            <div class="mt-4 p-3 bg-surface-ground rounded-border">
              <pre class="m-0"><code>{{ selectionCode }}</code></pre>
            </div>
          }
        </div>
      </div>

      <!-- ============================================ -->
      <!-- WITH CUSTOM ACTIONS -->
      <!-- ============================================ -->
      <div class="col-span-12">
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

      <!-- ============================================ -->
      <!-- SCROLLABLE TABLE -->
      <!-- ============================================ -->
      <div class="col-span-12">
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

      <!-- ============================================ -->
      <!-- SIZE VARIANTS -->
      <!-- ============================================ -->
      <div class="col-span-12">
        <div class="card">
          <h2 class="text-2xl font-semibold mb-4">Size Variants</h2>
        </div>
      </div>

      <!-- Compact -->
      <div class="col-span-12">
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
      <div class="col-span-12">
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
      <div class="col-span-12">
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

      <!-- ============================================ -->
      <!-- STYLE VARIANTS -->
      <!-- ============================================ -->
      <div class="col-span-12">
        <div class="card">
          <h2 class="text-2xl font-semibold mb-4">Style Variants</h2>
        </div>
      </div>

      <!-- Default -->
      <div class="col-span-12">
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
      <div class="col-span-12">
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
      <div class="col-span-12">
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

      <!-- ============================================ -->
      <!-- API REFERENCE -->
      <!-- ============================================ -->
      <div class="col-span-12">
        <div class="card">
          <h2 class="text-2xl font-semibold mb-4">API Reference</h2>

          <div class="mb-4">
            <h3 class="text-xl font-semibold mb-3">Inputs</h3>
            <div class="bg-surface-ground p-3 rounded-border overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-surface-border">
                    <th class="text-left p-2">Property</th>
                    <th class="text-left p-2">Type</th>
                    <th class="text-left p-2">Default</th>
                    <th class="text-left p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="border-b border-surface-border">
                    <td class="p-2"><code>data</code></td>
                    <td class="p-2">T[]</td>
                    <td class="p-2">required</td>
                    <td class="p-2">Array of data to display</td>
                  </tr>
                  <tr class="border-b border-surface-border">
                    <td class="p-2"><code>columns</code></td>
                    <td class="p-2">DataTableColumn[]</td>
                    <td class="p-2">required</td>
                    <td class="p-2">Column definitions</td>
                  </tr>
                  <tr class="border-b border-surface-border">
                    <td class="p-2"><code>actions</code></td>
                    <td class="p-2">DataTableAction[]</td>
                    <td class="p-2">[]</td>
                    <td class="p-2">Action buttons for each row</td>
                  </tr>
                  <tr class="border-b border-surface-border">
                    <td class="p-2"><code>loading</code></td>
                    <td class="p-2">boolean</td>
                    <td class="p-2">false</td>
                    <td class="p-2">Show loading skeleton</td>
                  </tr>
                  <tr class="border-b border-surface-border">
                    <td class="p-2"><code>selectable</code></td>
                    <td class="p-2">boolean</td>
                    <td class="p-2">false</td>
                    <td class="p-2">Enable row selection</td>
                  </tr>
                  <tr class="border-b border-surface-border">
                    <td class="p-2"><code>searchable</code></td>
                    <td class="p-2">boolean</td>
                    <td class="p-2">true</td>
                    <td class="p-2">Enable search input</td>
                  </tr>
                  <tr class="border-b border-surface-border">
                    <td class="p-2"><code>paginated</code></td>
                    <td class="p-2">boolean</td>
                    <td class="p-2">true</td>
                    <td class="p-2">Enable pagination</td>
                  </tr>
                  <tr class="border-b border-surface-border">
                    <td class="p-2"><code>pageSize</code></td>
                    <td class="p-2">number</td>
                    <td class="p-2">10</td>
                    <td class="p-2">Rows per page</td>
                  </tr>
                  <tr class="border-b border-surface-border">
                    <td class="p-2"><code>size</code></td>
                    <td class="p-2">'compact' | 'default' | 'comfortable'</td>
                    <td class="p-2">'default'</td>
                    <td class="p-2">Table size variant</td>
                  </tr>
                  <tr class="border-b border-surface-border">
                    <td class="p-2"><code>variant</code></td>
                    <td class="p-2">'default' | 'striped' | 'bordered'</td>
                    <td class="p-2">'default'</td>
                    <td class="p-2">Table style variant</td>
                  </tr>
                  <tr class="border-b border-surface-border">
                    <td class="p-2"><code>scrollable</code></td>
                    <td class="p-2">boolean</td>
                    <td class="p-2">false</td>
                    <td class="p-2">Enable scrollable mode</td>
                  </tr>
                  <tr class="border-b border-surface-border">
                    <td class="p-2"><code>scrollHeight</code></td>
                    <td class="p-2">string</td>
                    <td class="p-2">'400px'</td>
                    <td class="p-2">Height when scrollable</td>
                  </tr>
                  <tr class="border-b border-surface-border">
                    <td class="p-2"><code>showHeader</code></td>
                    <td class="p-2">boolean</td>
                    <td class="p-2">true</td>
                    <td class="p-2">Show header section</td>
                  </tr>
                  <tr class="border-b border-surface-border">
                    <td class="p-2"><code>emptyState</code></td>
                    <td class="p-2">DataTableEmptyState</td>
                    <td class="p-2">default</td>
                    <td class="p-2">Empty state config</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="mb-4">
            <h3 class="text-xl font-semibold mb-3">Outputs</h3>
            <div class="bg-surface-ground p-3 rounded-border overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-surface-border">
                    <th class="text-left p-2">Event</th>
                    <th class="text-left p-2">Type</th>
                    <th class="text-left p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="border-b border-surface-border">
                    <td class="p-2"><code>onAction</code></td>
                    <td class="p-2">DataTableActionEvent</td>
                    <td class="p-2">Emitted when action is clicked</td>
                  </tr>
                  <tr class="border-b border-surface-border">
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
            <div class="bg-surface-ground p-3 rounded-border">
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
      stock: 0,
      rating: 4.2,
      inStock: false,
    },
    {
      id: 3,
      name: 'Enterprise Plan',
      category: 'Subscription',
      price: 99.99,
      stock: 50,
      rating: 4.9,
      inStock: true,
    },
    {
      id: 4,
      name: 'Custom Module',
      category: 'Add-on',
      price: 49.99,
      stock: 25,
      rating: 4.5,
      inStock: true,
    },
    {
      id: 5,
      name: 'Support Package',
      category: 'Service',
      price: 199.99,
      stock: 10,
      rating: 4.7,
      inStock: true,
    },
  ]);

  // Column definitions
  userColumns = signal<DataTableColumn<User>[]>([
    {
      field: 'username',
      label: 'Username',
      sortable: true,
    },
    {
      field: 'email',
      label: 'Email',
      sortable: true,
    },
    {
      field: 'role',
      label: 'Role',
      sortable: true,
    },
    {
      field: 'status',
      label: 'Status',
      sortable: true,
      align: 'center',
    },
    {
      field: 'messagesCount',
      label: 'Messages',
      sortable: true,
      align: 'center',
    },
  ]);

  productColumns = signal<DataTableColumn<Product>[]>([
    {
      field: 'name',
      label: 'Product',
      sortable: true,
    },
    {
      field: 'category',
      label: 'Category',
      sortable: true,
    },
    {
      field: 'price',
      label: 'Price',
      sortable: true,
      align: 'right',
      pipe: 'currency',
      pipeArgs: 'USD',
    },
    {
      field: 'stock',
      label: 'Stock',
      sortable: true,
      align: 'center',
    },
    {
      field: 'inStock',
      label: 'Status',
      sortable: true,
      align: 'center',
    },
  ]);

  // Action definitions
  userActions = signal<DataTableAction[]>([
    {
      id: 'view',
      label: 'View',
      icon: 'pi pi-eye',
      severity: 'secondary',
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: 'pi pi-pencil',
      severity: 'secondary',
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'pi pi-trash',
      severity: 'danger',
    },
  ]);

  productActions = signal<DataTableAction[]>([
    {
      id: 'edit',
      label: 'Edit',
      icon: 'pi pi-pencil',
      severity: 'secondary',
    },
    {
      id: 'restock',
      label: 'Restock',
      icon: 'pi pi-box',
      severity: 'success',
      visible: (product: Product) => !product.inStock,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'pi pi-trash',
      severity: 'danger',
    },
  ]);

  // Event handlers
  handleAction(event: DataTableActionEvent<User>): void {
    console.log('Action clicked:', event);
    alert(`Action: ${event.actionId} on user: ${event.row.username}`);
  }

  handleSelectionChange(event: DataTableSelectionEvent<User>): void {
    this.selectedUsers.set(event.selectedRows);
    console.log('Selection changed:', event);
  }

  handleProductAction(event: DataTableActionEvent<Product>): void {
    console.log('Product action clicked:', event);
    alert(`Action: ${event.actionId} on product: ${event.row.name}`);
  }

  // Code examples
  basicCode = `
<app-data-table
  [data]="users()"
  [columns]="userColumns()"
  [actions]="userActions()"
  [loading]="loadingUsers()"
  (onAction)="handleAction($event)"
/>`;

  selectionCode = `
<app-data-table
  [data]="users()"
  [columns]="userColumns()"
  [selectable]="true"
  [loading]="loadingUsers()"
  (onSelectionChange)="handleSelectionChange($event)"
/>`;

  interfacesCode = `
interface DataTableColumn<T> {
  field: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: T) => string;
}

interface DataTableAction {
  id: string;
  label: string;
  icon?: string;
  severity?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger';
  visible?: (row: any) => boolean;
}

interface DataTableActionEvent<T> {
  action: DataTableAction;
  row: T;
}

interface DataTableSelectionEvent<T> {
  selectedRows: T[];
}`;
}