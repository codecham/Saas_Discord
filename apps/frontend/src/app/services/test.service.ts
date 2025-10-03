import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import type { TestDto } from '@my-project/shared-types';

@Injectable({
  providedIn: 'root'
})
export class TestService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  testData = signal<TestDto | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  async loadTest() {
    this.loading.set(true);
    this.error.set(null);
    
    try {
      const data = await this.http.get<TestDto>(this.apiUrl).toPromise();
      this.testData.set(data || null);
    } catch (err) {
      this.error.set('Erreur lors du chargement');
      console.error('Erreur:', err);
    } finally {
      this.loading.set(false);
    }
  }
}