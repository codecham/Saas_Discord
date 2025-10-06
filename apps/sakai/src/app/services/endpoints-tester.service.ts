// apps/frontend/src/app/services/endpoint-tester.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthFacadeService } from './auth/auth-facade.service';
import { ApiEndpoint, EndpointTestResult } from '@app/interfaces/endpoint-tester.interface';
import { environment } from 'src/environments/environment';
import { UserFacadeService } from './user/user-facade.service';


@Injectable({
  providedIn: 'root',
})
export class EndpointTesterService {
  private http = inject(HttpClient);
  private authFacade = inject(AuthFacadeService);
  private userFacade = inject(UserFacadeService)

  // Signal pour stocker les résultats des tests
  testResults = signal<EndpointTestResult[]>([]);

  /**
   * Teste un endpoint spécifique
   */
  async testEndpoint(endpoint: ApiEndpoint): Promise<EndpointTestResult> {
    const startTime = Date.now();
    
    try {
      // Préparer les headers
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
      });

      // Ajouter l'authentification si nécessaire
      let authHeaders = headers;
      if (endpoint.requiresAuth) {
        const isAuthenticated = this.authFacade.isAuthenticated();
        if (!isAuthenticated) {
          throw new Error('Authentication required but user is not authenticated');
        }
        
        // L'intercepteur auth ajoutera automatiquement le token
        // Pas besoin de l'ajouter manuellement
      }

      // Construire l'URL complète
      let fullUrl = `${environment.apiUrl}${endpoint.url}`;

      // if (endpoint.url == '/api/discord/v1/user/') {
      //   fullUrl + this.userFacade.discordUser()?.id;
      // }

      // Faire la requête
      const response = await this.http.request(endpoint.method, fullUrl, {
        headers: authHeaders,
        observe: 'response', // Pour avoir accès au status et aux headers
      }).toPromise();

      const responseTime = Date.now() - startTime;

      const result: EndpointTestResult = {
        endpoint,
        success: true,
        status: response?.status || 200,
        data: response?.body,
        responseTime,
        timestamp: new Date(),
      };

      this.addTestResult(result);
      return result;

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      const result: EndpointTestResult = {
        endpoint,
        success: false,
        status: error?.status || 0,
        error: this.formatError(error),
        responseTime,
        timestamp: new Date(),
      };

      this.addTestResult(result);
      return result;
    }
  }

  /**
   * Teste tous les endpoints d'une catégorie
   */
  async testCategory(endpoints: ApiEndpoint[]): Promise<EndpointTestResult[]> {
    const results: EndpointTestResult[] = [];
    
    for (const endpoint of endpoints) {
      const result = await this.testEndpoint(endpoint);
      results.push(result);
      
      // Petit délai entre les requêtes pour éviter de spam l'API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }

  /**
   * Ajoute un résultat de test au signal
   */
  private addTestResult(result: EndpointTestResult): void {
    const currentResults = this.testResults();
    
    // Garder seulement les 50 derniers résultats pour éviter la surcharge
    const updatedResults = [result, ...currentResults].slice(0, 50);
    
    this.testResults.set(updatedResults);
  }

  /**
   * Efface tous les résultats de test
   */
  clearResults(): void {
    this.testResults.set([]);
  }

  /**
   * Formate les erreurs de façon lisible
   */
  private formatError(error: any): string {
    if (error?.error?.message) {
      return error.error.message;
    }
    
    if (error?.message) {
      return error.message;
    }

    if (error?.status) {
      return `HTTP ${error.status}: ${error.statusText || 'Unknown error'}`;
    }

    return 'Unknown error occurred';
  }

  /**
   * Récupère les résultats pour un endpoint spécifique
   */
  getResultsForEndpoint(endpointId: string): EndpointTestResult[] {
    return this.testResults().filter(result => result.endpoint.id === endpointId);
  }

  /**
   * Récupère le dernier résultat pour un endpoint
   */
  getLatestResultForEndpoint(endpointId: string): EndpointTestResult | null {
    const results = this.getResultsForEndpoint(endpointId);
    return results.length > 0 ? results[0] : null;
  }
}