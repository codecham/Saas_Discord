import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import type { HealthCheckDto, DatabaseInfoDto, SharedTypesTestDto } from '@my-project/shared-types';

@Injectable({
  providedIn: 'root'
})
export class DemoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/demo`;

  // Signaux pour stocker les résultats des tests
  healthStatus = signal<HealthCheckDto | null>(null);
  databaseInfo = signal<DatabaseInfoDto | null>(null);
  sharedTypesTest = signal<SharedTypesTestDto | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  async runAllTests() {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Tester tous les endpoints
      const [health, database, sharedTypes] = await Promise.all([
        this.http.get<HealthCheckDto>(`${this.apiUrl}/health`).toPromise(),
        this.http.get<DatabaseInfoDto>(`${this.apiUrl}/database`).toPromise(),
        this.http.get<SharedTypesTestDto>(`${this.apiUrl}/shared-types`).toPromise(),
      ]);

      this.healthStatus.set(health || null);
      this.databaseInfo.set(database || null);
      this.sharedTypesTest.set(sharedTypes || null);
    } catch (err) {
      this.error.set('Erreur lors des tests de l\'API');
      console.error('Erreur tests demo:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async testEndpoint(endpoint: 'health' | 'database' | 'shared-types') {
    this.loading.set(true);
    this.error.set(null);

    try {
      switch (endpoint) {
        case 'health':
          const health = await this.http.get<HealthCheckDto>(`${this.apiUrl}/health`).toPromise();
          this.healthStatus.set(health || null);
          break;
        case 'database':
          const database = await this.http.get<DatabaseInfoDto>(`${this.apiUrl}/database`).toPromise();
          this.databaseInfo.set(database || null);
          break;
        case 'shared-types':
          const sharedTypes = await this.http.get<SharedTypesTestDto>(`${this.apiUrl}/shared-types`).toPromise();
          this.sharedTypesTest.set(sharedTypes || null);
          break;
      }
    } catch (err) {
      this.error.set(`Erreur lors du test ${endpoint}`);
      console.error(`Erreur test ${endpoint}:`, err);
    } finally {
      this.loading.set(false);
    }
  }
}