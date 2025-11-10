import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent } from '@app/shared/components/ui/data-table/data-table.component';
import { DataTableColumn } from '@app/shared/components/ui/data-table/data-table.types';

/**
 * Test ULTRA Minimal - Juste le tableau, rien d'autre
 */
@Component({
  selector: 'app-data-table-minimal',
  standalone: true,
  imports: [CommonModule, DataTableComponent],
  template: `
    <h1>Test Minimal DataTable</h1>
    
    <app-data-table
      [data]="data()"
      [columns]="columns"
    />
  `,
})
export class DataTableMinimalComponent {
  data = signal([
    { id: 1, name: 'Product 1', price: 10 },
    { id: 2, name: 'Product 2', price: 20 },
    { id: 3, name: 'Product 3', price: 30 },
  ]);

  columns: DataTableColumn[] = [
    { field: 'name', label: 'Name', sortable: true },
    { field: 'price', label: 'Price', sortable: true },
  ];
}