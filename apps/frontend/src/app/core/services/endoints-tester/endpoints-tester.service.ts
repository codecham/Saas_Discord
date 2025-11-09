import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GuildFacadeService } from '../guild/guild-facade.service';
import { UserFacadeService } from '../user/user-facade.service';
import { 
  ApiEndpoint, 
  EndpointTestResult, 
  ParameterValues 
} from '@app/shared/interfaces/endpoint-tester.interface';
import { environment } from 'src/environments/environment';
import { AuthFacadeService } from '@app/core/services/auth/auth-facade.service';

@Injectable({
  providedIn: 'root',
})
export class EndpointTesterService {
  private http = inject(HttpClient);
  private authFacade = inject(AuthFacadeService);
  private guildFacade = inject(GuildFacadeService);
  private userFacade = inject(UserFacadeService);

  // Signal pour stocker les résultats des tests
  testResults = signal<EndpointTestResult[]>([]);

  /**
   * Teste un endpoint avec des valeurs de paramètres optionnelles
   */
  async testEndpoint(
    endpoint: ApiEndpoint, 
    parameterValues?: ParameterValues
  ): Promise<EndpointTestResult> {
    const startTime = Date.now();
    
    try {
      // Vérifier l'authentification
      if (endpoint.requiresAuth && !this.authFacade.isAuthenticated()) {
        throw new Error('Authentication required but user is not authenticated');
      }

      // Résoudre les paramètres automatiques si nécessaire
      const resolvedParams = await this.resolveParameters(endpoint, parameterValues);

      // Construire l'URL avec les paramètres
      const { url, queryParams, body } = this.buildRequest(endpoint, resolvedParams);

      // Préparer les headers
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
      });

      // Faire la requête
      const response = await this.http.request(endpoint.method, url, {
        headers,
        params: queryParams,
        body: body,
        observe: 'response',
      }).toPromise();

      const responseTime = Date.now() - startTime;

      const result: EndpointTestResult = {
        endpoint,
        success: true,
        status: response?.status || 200,
        statusText: response?.statusText,
        data: response?.body,
        responseTime,
        timestamp: new Date(),
        headers: this.extractHeaders(response?.headers),
        requestUrl: url,
        requestBody: body,
      };

      this.addTestResult(result);
      return result;

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      const result: EndpointTestResult = {
        endpoint,
        success: false,
        status: error?.status || 0,
        statusText: error?.statusText,
        error: this.formatError(error),
        errorDetails: error?.error,
        responseTime,
        timestamp: new Date(),
        headers: this.extractHeaders(error?.headers),
      };

      this.addTestResult(result);
      return result;
    }
  }

  /**
   * Résout les paramètres automatiques (ex: firstGuild, currentUserId)
   */
  private async resolveParameters(
    endpoint: ApiEndpoint, 
    userValues?: ParameterValues
  ): Promise<ParameterValues> {
    const resolved: ParameterValues = { ...userValues };

    if (!endpoint.parameters) return resolved;

    for (const param of endpoint.parameters) {
      // Si l'utilisateur a déjà fourni une valeur, on l'utilise
      if (resolved[param.name]) continue;

      // Si pas de source automatique, utiliser la valeur par défaut
      if (!param.autoSource) {
        if (param.defaultValue) {
          resolved[param.name] = param.defaultValue;
        }
        continue;
      }

      // Résoudre les sources automatiques
      switch (param.autoSource) {
        case 'selectedGuild': {
          const selectedGuild = this.guildFacade.selectedGuild();
          if (selectedGuild?.id) {
            resolved[param.name] = selectedGuild.id;
          }
          break;
        }
        case 'currentUserId': {
          const user = this.userFacade.user();
          if (user?.id) {
            resolved[param.name] = user.id;
          }
          break;
        }
        case 'firstChannel': {
          // TODO: Implémenter quand le service channels sera disponible
          break;
        }
      }
    }

    return resolved;
  }

  /**
   * Construit l'URL et les paramètres de la requête
   */
  private buildRequest(
    endpoint: ApiEndpoint, 
    parameterValues: ParameterValues
  ): { url: string; queryParams: Record<string, string>; body?: any } {
    let url = `${environment.apiUrl}${endpoint.url}`;
    const queryParams: Record<string, string> = {};
    let body = endpoint.bodyExample;

    if (!endpoint.parameters) {
      return { url, queryParams, body };
    }

    for (const param of endpoint.parameters) {
      const value = parameterValues[param.name];
      
      if (!value) {
        if (param.required) {
          throw new Error(`Required parameter '${param.name}' is missing`);
        }
        continue;
      }

      switch (param.type) {
        case 'path':
          // Remplacer {paramName} dans l'URL
          url = url.replace(`{${param.name}}`, value);
          break;
        
        case 'query':
          // Ajouter aux query params
          queryParams[param.name] = value;
          break;
        
        case 'body':
          // Créer ou mettre à jour le body
          if (!body) body = {};
          body[param.name] = value;
          break;
      }
    }

    return { url, queryParams, body };
  }

  /**
   * Extrait les headers de la réponse
   */
  private extractHeaders(headers: any): Record<string, string> {
    if (!headers) return {};
    
    const result: Record<string, string> = {};
    headers.keys()?.forEach((key: string) => {
      result[key] = headers.get(key);
    });
    return result;
  }

  /**
   * Teste tous les endpoints d'une catégorie
   */
  async testCategory(endpoints: ApiEndpoint[]): Promise<EndpointTestResult[]> {
    const results: EndpointTestResult[] = [];
    
    for (const endpoint of endpoints) {
      // Skip endpoints avec paramètres obligatoires pour les tests en masse
      if (endpoint.parameters?.some(p => p.required && !p.autoSource && !p.defaultValue)) {
        console.log(`Skipping ${endpoint.name} - requires manual parameters`);
        continue;
      }

      const result = await this.testEndpoint(endpoint);
      results.push(result);
      
      // Délai entre requêtes
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }

  /**
   * Ajoute un résultat de test au signal
   */
  private addTestResult(result: EndpointTestResult): void {
    const currentResults = this.testResults();
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