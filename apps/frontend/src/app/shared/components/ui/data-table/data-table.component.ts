import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import {
  DataTableColumn,
  DataTableAction,
  DataTableActionEvent,
  DataTableSelectionEvent,
  DataTableSort,
  DataTableEmptyState,
  DataTableSize,
  DataTableVariant,
} from './data-table.types';

/**
 * Reusable DataTable component with sorting, pagination, selection, and actions
 *
 * @example
 * ```html
 * <app-data-table
 *   [data]="users"
 *   [columns]="columns"
 *   [actions]="actions"
 *   [loading]="isLoading"
 *   [pageSize]="10"
 *   (onAction)="handleAction($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    InputTextModule,
    SkeletonModule,
    TooltipModule,
  ],
  template: `
    <div class="data-table-wrapper" [class]="'size-' + size() + ' variant-' + variant()">
      <!-- Header Section -->
      @if (showHeader()) {
        <div class="data-table-header mb-4 flex flex-column md:flex-row gap-3 justify-content-between">
          <!-- Search -->
          @if (searchable()) {
            <div class="search-container flex-1">
              <span class="p-input-icon-left w-full">
                <i class="pi pi-search"></i>
                <input
                  pInputText
                  type="text"
                  [placeholder]="searchPlaceholder()"
                  [(ngModel)]="searchQuery"
                  (ngModelChange)="onSearchChange($event)"
                  class="w-full"
                />
              </span>
            </div>
          }

          <!-- Selection Info -->
          @if (selectable() && selectedRows().length > 0) {
            <div class="selection-info flex align-items-center gap-2">
              <span class="text-sm">
                {{ selectedRows().length }} selected
              </span>
              <p-button
                icon="pi pi-times"
                [text]="true"
                [rounded]="true"
                size="small"
                severity="secondary"
                (onClick)="clearSelection()"
              />
            </div>
          }
        </div>
      }

      <!-- Table Card -->
      <p-card [style]="{ padding: '0' }">
        <p-table
          [value]="paginatedData()"
          [rows]="pageSize()"
          [loading]="loading()"
          [scrollable]="scrollable()"
          [scrollHeight]="scrollHeight()"
          styleClass="p-datatable-sm"
          [rowHover]="true"
        >
          <!-- Header -->
          <ng-template pTemplate="header">
            <tr>
              <!-- Selection Column -->
              @if (selectable()) {
                <th style="width: 3rem">
                  <p-checkbox
                    [(ngModel)]="selectAll"
                    [binary]="true"
                    (onChange)="onSelectAllChange()"
                  />
                </th>
              }

              <!-- Data Columns -->
              @for (column of columns(); track column.field) {
                <th
                  [style.width]="column.width"
                  [style.text-align]="column.align || 'left'"
                  [class.cursor-pointer]="column.sortable"
                  (click)="handleColumnClick(column)"
                >
                  <div class="flex align-items-center gap-2">
                    <span>{{ column.label }}</span>
                    @if (column.sortable) {
                      <i
                        class="pi text-sm"
                        [class.pi-sort-alt]="currentSort().field !== column.field"
                        [class.pi-sort-amount-up-alt]="
                          currentSort().field === column.field && currentSort().direction === 'asc'
                        "
                        [class.pi-sort-amount-down]="
                          currentSort().field === column.field && currentSort().direction === 'desc'
                        "
                      ></i>
                    }
                  </div>
                </th>
              }

              <!-- Actions Column -->
              @if (actions().length > 0) {
                <th style="width: auto; text-align: center">Actions</th>
              }
            </tr>
          </ng-template>

          <!-- Body -->
          <ng-template pTemplate="body" let-row let-rowIndex="rowIndex">
            <tr>
              <!-- Selection Cell -->
              @if (selectable()) {
                <td>
                  <p-checkbox
                    [ngModel]="isRowSelected(row)"
                    [binary]="true"
                    (onChange)="onRowSelect(row)"
                  />
                </td>
              }

              <!-- Data Cells -->
              @for (column of columns(); track column.field) {
                <td [style.text-align]="column.align || 'left'">
                  {{ formatCellValue(row, column) }}
                </td>
              }

              <!-- Actions Cell -->
              @if (actions().length > 0) {
                <td style="text-align: center">
                  <div class="flex gap-1 justify-content-center">
                    @for (action of getVisibleActions(row); track action.id) {
                      <p-button
                        [icon]="action.icon"
                        [severity]="action.severity || 'secondary'"
                        [text]="true"
                        [rounded]="true"
                        size="small"
                        [pTooltip]="action.label"
                        tooltipPosition="top"
                        [disabled]="action.disabled"
                        (onClick)="onActionClick(action.id, row, rowIndex)"
                      />
                    }
                  </div>
                </td>
              }
            </tr>
          </ng-template>

          <!-- Loading State -->
          <ng-template pTemplate="loadingbody">
            @for (i of [].constructor(pageSize()); track i) {
              <tr>
                @if (selectable()) {
                  <td><p-skeleton width="1.5rem" height="1.5rem" /></td>
                }
                @for (column of columns(); track column.field) {
                  <td><p-skeleton /></td>
                }
                @if (actions().length > 0) {
                  <td><p-skeleton width="5rem" height="2rem" /></td>
                }
              </tr>
            }
          </ng-template>

          <!-- Empty State -->
          <ng-template pTemplate="emptymessage">
            <tr>
              <td [attr.colspan]="getColspan()" class="text-center py-6">
                <div class="flex flex-column align-items-center gap-3">
                  <i
                    [class]="emptyState().icon || 'pi pi-inbox'"
                    class="text-5xl text-400"
                  ></i>
                  <div>
                    <p class="text-xl font-semibold m-0 mb-2">
                      {{ emptyState().title || 'No data available' }}
                    </p>
                    <p class="text-sm text-500 m-0">
                      {{ emptyState().description || 'There are no records to display.' }}
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>

        <!-- Pagination -->
        @if (paginated() && filteredData().length > 0) {
          <div class="pagination-footer p-3 border-top-1 surface-border">
            <div class="flex flex-column md:flex-row justify-content-between align-items-center gap-3">
              <div class="text-sm text-500">
                Showing {{ paginationInfo().start }} to {{ paginationInfo().end }} of
                {{ paginationInfo().total }} entries
              </div>
              <div class="flex gap-2">
                <p-button
                  icon="pi pi-angle-left"
                  [text]="true"
                  [disabled]="currentPage() === 0"
                  (onClick)="previousPage()"
                  size="small"
                />
                @for (page of visiblePages(); track page) {
                  <p-button
                    [label]="(page + 1).toString()"
                    [text]="currentPage() !== page"
                    [outlined]="currentPage() === page"
                    (onClick)="goToPage(page)"
                    size="small"
                  />
                }
                <p-button
                  icon="pi pi-angle-right"
                  [text]="true"
                  [disabled]="currentPage() === totalPages() - 1"
                  (onClick)="nextPage()"
                  size="small"
                />
              </div>
            </div>
          </div>
        }
      </p-card>
    </div>
  `,
  styles: [
    `
      .data-table-wrapper {
        &.size-compact {
          ::ng-deep .p-datatable {
            font-size: 0.875rem;

            .p-datatable-thead > tr > th {
              padding: 0.5rem;
            }

            .p-datatable-tbody > tr > td {
              padding: 0.5rem;
            }
          }
        }

        &.size-comfortable {
          ::ng-deep .p-datatable {
            .p-datatable-thead > tr > th {
              padding: 1.25rem 1rem;
            }

            .p-datatable-tbody > tr > td {
              padding: 1.25rem 1rem;
            }
          }
        }

        &.variant-striped {
          ::ng-deep .p-datatable .p-datatable-tbody > tr:nth-child(even) {
            background-color: var(--surface-50);
          }
        }

        &.variant-bordered {
          ::ng-deep .p-datatable {
            .p-datatable-thead > tr > th,
            .p-datatable-tbody > tr > td {
              border: 1px solid var(--surface-border);
            }
          }
        }
      }

      ::ng-deep .p-datatable .p-datatable-thead > tr > th {
        background-color: var(--surface-50);
        font-weight: 600;
        color: var(--text-color);
      }

      .cursor-pointer {
        cursor: pointer;
        user-select: none;

        &:hover {
          background-color: var(--surface-100) !important;
        }
      }
    `,
  ],
})
export class DataTableComponent<T = any> {
  /** Table data */
  data = input.required<T[]>();

  /** Column definitions */
  columns = input.required<DataTableColumn<T>[]>();

  /** Action buttons for each row */
  actions = input<DataTableAction[]>([]);

  /** Loading state */
  loading = input<boolean>(false);

  /** Enable row selection */
  selectable = input<boolean>(false);

  /** Enable search */
  searchable = input<boolean>(true);

  /** Search placeholder */
  searchPlaceholder = input<string>('Search...');

  /** Enable pagination */
  paginated = input<boolean>(true);

  /** Rows per page */
  pageSize = input<number>(10);

  /** Table size variant */
  size = input<DataTableSize>('default');

  /** Table style variant */
  variant = input<DataTableVariant>('default');

  /** Enable scrollable table */
  scrollable = input<boolean>(false);

  /** Scroll height (when scrollable is true) */
  scrollHeight = input<string>('400px');

  /** Show header section */
  showHeader = input<boolean>(true);

  /** Empty state configuration */
  emptyState = input<DataTableEmptyState>({
    icon: 'pi pi-inbox',
    title: 'No data available',
    description: 'There are no records to display.',
  });

  /** Event emitted when an action is clicked */
  onAction = output<DataTableActionEvent<T>>();

  /** Event emitted when selection changes */
  onSelectionChange = output<DataTableSelectionEvent<T>>();

  /** Internal state */
  searchQuery = signal<string>('');
  currentSort = signal<DataTableSort>({ field: '', direction: null });
  currentPage = signal<number>(0);
  selectedRows = signal<T[]>([]);
  selectAll = signal<boolean>(false);

  /**
   * Filtered data based on search query
   */
  filteredData = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.data();

    return this.data().filter((row) => {
      return this.columns().some((column) => {
        const value = this.getCellValue(row, column);
        return value?.toString().toLowerCase().includes(query);
      });
    });
  });

  /**
   * Sorted data based on current sort
   */
  sortedData = computed(() => {
    const sort = this.currentSort();
    if (!sort.field || !sort.direction) return this.filteredData();

    const data = [...this.filteredData()];
    return data.sort((a, b) => {
      const aValue = this.getCellValue(a, { field: sort.field } as DataTableColumn);
      const bValue = this.getCellValue(b, { field: sort.field } as DataTableColumn);

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  });

  /**
   * Paginated data for current page
   */
  paginatedData = computed(() => {
    if (!this.paginated()) return this.sortedData();

    const start = this.currentPage() * this.pageSize();
    const end = start + this.pageSize();
    return this.sortedData().slice(start, end);
  });

  /**
   * Total number of pages
   */
  totalPages = computed(() => {
    return Math.ceil(this.sortedData().length / this.pageSize());
  });

  /**
   * Visible page numbers for pagination
   */
  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const maxVisible = 5;

    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i);
    }

    const start = Math.max(0, current - Math.floor(maxVisible / 2));
    const end = Math.min(total, start + maxVisible);
    return Array.from({ length: end - start }, (_, i) => start + i);
  });

  /**
   * Pagination information
   */
  paginationInfo = computed(() => {
    const total = this.sortedData().length;
    const start = this.currentPage() * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, total);

    return { start, end, total };
  });

  /**
   * Get cell value from row data
   */
  private getCellValue(row: T, column: DataTableColumn<T>): any {
    const field = column.field as string;
    return field.split('.').reduce((obj: any, key) => obj?.[key], row);
  }

  /**
   * Format cell value with pipe if specified
   */
  formatCellValue(row: T, column: DataTableColumn<T>): string {
    const value = this.getCellValue(row, column);

    if (value === null || value === undefined) return '-';

    // Apply pipe if specified (basic implementation)
    if (column.pipe) {
      switch (column.pipe) {
        case 'date':
          return new DatePipe('en-US').transform(value, column.pipeArgs || 'short') || '-';
        case 'currency':
          return new CurrencyPipe('en-US').transform(value, column.pipeArgs || 'USD') || '-';
        case 'number':
          return new DecimalPipe('en-US').transform(value, column.pipeArgs) || '-';
        case 'percent':
          return new PercentPipe('en-US').transform(value, column.pipeArgs) || '-';
        default:
          return value.toString();
      }
    }

    return value.toString();
  }

  /**
   * Get visible actions for a row (based on visible property)
   */
  getVisibleActions(row: T): DataTableAction[] {
    return this.actions().filter((action) => {
      if (action.visible === undefined) return true;
      if (typeof action.visible === 'boolean') return action.visible;
      return action.visible(row);
    });
  }

  /**
   * Handle search query change
   */
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(0); // Reset to first page
  }

  /**
   * Handle column header click
   */
  handleColumnClick(column: DataTableColumn<T>): void {
    if (column.sortable) {
      this.onSort(String(column.field));
    }
  }

  /**
   * Handle column sort
   */
  onSort(field: string): void {
    const current = this.currentSort();
    let direction: 'asc' | 'desc' | null = 'asc';

    if (current.field === field) {
      direction = current.direction === 'asc' ? 'desc' : current.direction === 'desc' ? null : 'asc';
    }

    this.currentSort.set({ field: direction ? field : '', direction });
  }

  /**
   * Handle action button click
   */
  onActionClick(actionId: string, row: T, index: number): void {
    this.onAction.emit({ actionId, row, index });
  }

  /**
   * Check if a row is selected
   */
  isRowSelected(row: T): boolean {
    return this.selectedRows().includes(row);
  }

  /**
   * Handle row selection toggle
   */
  onRowSelect(row: T): void {
    const selected = [...this.selectedRows()];
    const index = selected.indexOf(row);

    if (index > -1) {
      selected.splice(index, 1);
    } else {
      selected.push(row);
    }

    this.selectedRows.set(selected);
    this.updateSelectAll();
    this.emitSelectionChange();
  }

  /**
   * Handle select all toggle
   */
  onSelectAllChange(): void {
    if (this.selectAll()) {
      this.selectedRows.set([...this.paginatedData()]);
    } else {
      this.selectedRows.set([]);
    }
    this.emitSelectionChange();
  }

  /**
   * Update select all checkbox state
   */
  private updateSelectAll(): void {
    const allSelected = this.paginatedData().every((row) => this.selectedRows().includes(row));
    this.selectAll.set(allSelected && this.paginatedData().length > 0);
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.selectedRows.set([]);
    this.selectAll.set(false);
    this.emitSelectionChange();
  }

  /**
   * Emit selection change event
   */
  private emitSelectionChange(): void {
    const selectedIndices = this.selectedRows().map((row) => this.data().indexOf(row));
    this.onSelectionChange.emit({
      selectedRows: this.selectedRows(),
      selectedIndices,
    });
  }

  /**
   * Get total colspan for empty message
   */
  getColspan(): number {
    let count = this.columns().length;
    if (this.selectable()) count++;
    if (this.actions().length > 0) count++;
    return count;
  }

  /**
   * Navigate to previous page
   */
  previousPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  /**
   * Navigate to next page
   */
  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  /**
   * Navigate to specific page
   */
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
    }
  }
}