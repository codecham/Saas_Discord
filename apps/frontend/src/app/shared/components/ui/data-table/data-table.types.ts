/**
 * Types and interfaces for DataTable component
 */

/**
 * Column definition for the data table
 */
export interface DataTableColumn<T = any> {
  /** Unique field identifier */
  field: keyof T | string;
  /** Column header label */
  label: string;
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Column width (CSS value) */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Angular pipe to apply to the value (e.g., 'date', 'currency') */
  pipe?: string;
  /** Pipe arguments */
  pipeArgs?: any;
  /** Custom template key for rendering */
  templateKey?: string;
}

/**
 * Action button configuration for table rows
 */
export interface DataTableAction {
  /** Unique action identifier */
  id: string;
  /** Action label (for tooltip) */
  label: string;
  /** PrimeIcons icon class */
  icon: string;
  /** Button severity style */
  severity?: 'success' | 'info' | 'danger' | 'help' | 'secondary' | 'contrast';
  /** Whether the action is disabled */
  disabled?: boolean;
  /** Whether to show the action (can be a function for conditional display) */
  visible?: boolean | ((row: any) => boolean);
}

/**
 * Event emitted when an action is triggered
 */
export interface DataTableActionEvent<T = any> {
  /** Action identifier */
  actionId: string;
  /** Row data */
  row: T;
  /** Row index */
  index: number;
}

/**
 * Event emitted when selection changes
 */
export interface DataTableSelectionEvent<T = any> {
  /** Selected rows */
  selectedRows: T[];
  /** All row indices that are selected */
  selectedIndices: number[];
}

/**
 * Sort configuration
 */
export interface DataTableSort {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: 'asc' | 'desc' | null;
}

/**
 * Pagination configuration
 */
export interface DataTablePagination {
  /** Current page (0-indexed) */
  page: number;
  /** Number of rows per page */
  pageSize: number;
  /** Total number of rows */
  totalRows: number;
}

/**
 * Empty state configuration
 */
export interface DataTableEmptyState {
  /** Icon to display */
  icon?: string;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
}

/**
 * DataTable size variants
 */
export type DataTableSize = 'compact' | 'default' | 'comfortable';

/**
 * DataTable style variants
 */
export type DataTableVariant = 'default' | 'striped' | 'bordered';