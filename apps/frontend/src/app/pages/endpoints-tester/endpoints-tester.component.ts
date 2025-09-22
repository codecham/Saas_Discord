import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthFacadeService } from '../../services/auth/auth-facade.service';
import { TEST_ENDPOINTS, getEndpointsByCategory } from '../../config/test-endpoints.config';
import { EndpointTesterService } from '@app/services/endpoints-tester.service';
import { ApiEndpoint, EndpointTestResult } from '@app/interfaces/endpoint-tester.interface';

@Component({
  selector: 'app-endpoint-tester',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto p-6 max-w-7xl">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">API Endpoint Tester</h1>
        <p class="text-gray-600">
          Testez rapidement tous vos endpoints Discord sans Postman
        </p>
        
        <!-- Status de connexion -->
        <div class="mt-4 flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <div [class]="authStatusClass()"></div>
            <span class="text-sm font-medium">{{ authStatusText() }}</span>
          </div>
          
          @if (testResults().length > 0) {
            <button 
              (click)="clearAllResults()"
              class="text-sm text-red-600 hover:text-red-700 underline">
              Effacer les résultats
            </button>
          }
        </div>
      </div>

      <!-- Endpoints par catégorie -->
      @for (category of categories(); track category.name) {
        <div class="mb-8">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-gray-800">{{ category.name }}</h2>
            
            @if (category.endpoints.length > 1) {
              <button 
                (click)="testCategory(category.endpoints)"
                [disabled]="isTestingCategory().has(category.name)"
                class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50">
                {{ isTestingCategory().has(category.name) ? 'Test en cours...' : 'Tester tout' }}
              </button>
            }
          </div>

          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            @for (endpoint of category.endpoints; track endpoint.id) {
              <div class="border rounded-lg p-4 bg-white shadow-sm">
                <!-- En-tête de l'endpoint -->
                <div class="mb-3">
                  <div class="flex items-center space-x-2 mb-2">
                    <span [class]="getMethodBadgeClass(endpoint.method)">
                      {{ endpoint.method }}
                    </span>
                    @if (endpoint.requiresAuth) {
                      <span class="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                        🔐 Auth requise
                      </span>
                    }
                  </div>
                  
                  <h3 class="font-medium text-gray-900">{{ endpoint.name }}</h3>
                  <p class="text-sm text-gray-600 mt-1">{{ endpoint.description }}</p>
                  <code class="text-xs text-blue-600 block mt-1">{{ endpoint.url }}</code>
                </div>

                <!-- Bouton de test -->
                <button 
                  (click)="testSingleEndpoint(endpoint)"
                  [disabled]="isTestingEndpoint().has(endpoint.id) || (endpoint.requiresAuth && !isAuthenticated())"
                  [class]="getTestButtonClass(endpoint)">
                  {{ getTestButtonText(endpoint) }}
                </button>

                <!-- Dernier résultat -->
                @if (getLatestResult(endpoint.id); as result) {
                  <div class="mt-3 p-3 rounded" [class]="getResultClass(result)">
                    <div class="flex items-center justify-between text-sm">
                      <span [class]="result.success ? 'text-green-700' : 'text-red-700'">
                        {{ result.success ? '✅ Succès' : '❌ Erreur' }}
                      </span>
                      <span class="text-gray-500">
                        {{ result.responseTime }}ms - {{ formatTime(result.timestamp) }}
                      </span>
                    </div>

                    @if (result.success) {
                      <div class="text-xs text-gray-600 mt-1">
                        Status: {{ result.status }} | 
                        Type: {{ endpoint.expectedResponse }}
                      </div>
                    } @else {
                      <div class="text-xs text-red-600 mt-1">
                        {{ result.error }}
                      </div>
                    }

                    <!-- Données de réponse (collapsible) -->
                    @if (result.data && showDetails().has(endpoint.id)) {
                      <pre class="text-xs mt-2 p-2 bg-gray-100 rounded overflow-x-auto">{{ formatJson(result.data) }}</pre>
                    }
                    
                    @if (result.data) {
                      <button 
                        (click)="toggleDetails(endpoint.id)"
                        class="text-xs text-blue-600 hover:underline mt-1">
                        {{ showDetails().has(endpoint.id) ? 'Masquer' : 'Voir' }} les données
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Section des résultats récents -->
      @if (recentResults().length > 0) {
        <div class="mt-12">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Historique récent</h2>
          <div class="bg-white rounded-lg border">
            @for (result of recentResults(); track $index) {
              <div class="p-4 border-b last:border-b-0">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <span [class]="getMethodBadgeClass(result.endpoint.method)">
                      {{ result.endpoint.method }}
                    </span>
                    <span class="font-medium">{{ result.endpoint.name }}</span>
                    <span [class]="result.success ? 'text-green-600' : 'text-red-600'">
                      {{ result.success ? '✅' : '❌' }}
                    </span>
                  </div>
                  <div class="text-sm text-gray-500">
                    {{ formatTime(result.timestamp) }} ({{ result.responseTime }}ms)
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class EndpointTesterComponent {
  private testerService = inject(EndpointTesterService);
  private authFacade = inject(AuthFacadeService);

  // Signals
  testResults = this.testerService.testResults;
  isAuthenticated = this.authFacade.isAuthenticated;
  showDetails = signal(new Set<string>());
  isTestingEndpoint = signal(new Set<string>());
  isTestingCategory = signal(new Set<string>());

  // Computed
  categories = computed(() => {
    const endpointsByCategory = getEndpointsByCategory();
    return Object.entries(endpointsByCategory).map(([name, endpoints]) => ({
      name,
      endpoints
    }));
  });

  recentResults = computed(() => {
    return this.testResults().slice(0, 10);
  });

  authStatusClass = computed(() => {
    return this.isAuthenticated() 
      ? 'w-3 h-3 bg-green-500 rounded-full'
      : 'w-3 h-3 bg-red-500 rounded-full';
  });

  authStatusText = computed(() => {
    return this.isAuthenticated() 
      ? 'Authentifié - Tous les endpoints disponibles'
      : 'Non authentifié - Seulement les endpoints publics';
  });

  async testSingleEndpoint(endpoint: ApiEndpoint): Promise<void> {
    const testing = new Set(this.isTestingEndpoint());
    testing.add(endpoint.id);
    this.isTestingEndpoint.set(testing);

    try {
      await this.testerService.testEndpoint(endpoint);
    } finally {
      testing.delete(endpoint.id);
      this.isTestingEndpoint.set(testing);
    }
  }

  async testCategory(endpoints: ApiEndpoint[]): Promise<void> {
    const categoryName = endpoints[0]?.category || 'Unknown';
    const testing = new Set(this.isTestingCategory());
    testing.add(categoryName);
    this.isTestingCategory.set(testing);

    try {
      await this.testerService.testCategory(endpoints);
    } finally {
      testing.delete(categoryName);
      this.isTestingCategory.set(testing);
    }
  }

  toggleDetails(endpointId: string): void {
    const current = new Set(this.showDetails());
    if (current.has(endpointId)) {
      current.delete(endpointId);
    } else {
      current.add(endpointId);
    }
    this.showDetails.set(current);
  }

  clearAllResults(): void {
    this.testerService.clearResults();
    this.showDetails.set(new Set());
  }

  getLatestResult(endpointId: string): EndpointTestResult | null {
    return this.testerService.getLatestResultForEndpoint(endpointId);
  }

  getMethodBadgeClass(method: string): string {
    const baseClass = 'px-2 py-1 text-xs font-medium rounded';
    switch (method) {
      case 'GET': return `${baseClass} bg-green-100 text-green-800`;
      case 'POST': return `${baseClass} bg-blue-100 text-blue-800`;
      case 'PUT': return `${baseClass} bg-yellow-100 text-yellow-800`;
      case 'DELETE': return `${baseClass} bg-red-100 text-red-800`;
      default: return `${baseClass} bg-gray-100 text-gray-800`;
    }
  }

  getTestButtonClass(endpoint: ApiEndpoint): string {
    const baseClass = 'w-full px-3 py-2 text-sm font-medium rounded transition-colors';
    const isDisabled = this.isTestingEndpoint().has(endpoint.id) || 
                      (endpoint.requiresAuth && !this.isAuthenticated());
    
    if (isDisabled) {
      return `${baseClass} bg-gray-100 text-gray-400 cursor-not-allowed`;
    }
    
    return `${baseClass} bg-blue-600 text-white hover:bg-blue-700`;
  }

  getTestButtonText(endpoint: ApiEndpoint): string {
    if (this.isTestingEndpoint().has(endpoint.id)) {
      return 'Test en cours...';
    }
    
    if (endpoint.requiresAuth && !this.isAuthenticated()) {
      return 'Connexion requise';
    }
    
    return 'Tester';
  }

  getResultClass(result: EndpointTestResult): string {
    return result.success 
      ? 'bg-green-50 border border-green-200' 
      : 'bg-red-50 border border-red-200';
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  formatJson(data: any): string {
    return JSON.stringify(data, null, 2);
  }
}