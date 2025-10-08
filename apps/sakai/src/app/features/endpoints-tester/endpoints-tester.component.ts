import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthFacadeService } from '@app/services/auth/auth-facade.service';
import { TEST_ENDPOINTS, getEndpointsByCategory } from '@app/config/test-endpoints.config';
import { ApiEndpoint, EndpointTestResult, ParameterValues } from '@app/interfaces/endpoint-tester.interface';
import { EndpointTesterService } from '@app/services/endpoints-tester.service';

@Component({
  selector: 'app-endpoint-tester',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .json-viewer {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-all;
    }
  `],
  template: `
    <div class="container mx-auto p-6 max-w-7xl">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">🧪 API Endpoint Tester</h1>
        <p class="text-gray-600">
          Testez rapidement tous vos endpoints Discord avec gestion des paramètres
        </p>
        
        <!-- Status de connexion -->
        <div class="mt-4 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <div [class]="authStatusClass()"></div>
            <span class="text-sm font-medium">{{ authStatusText() }}</span>
          </div>
          
          @if (testResults().length > 0) {
            <button 
              (click)="clearAllResults()"
              class="px-3 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded transition">
              🗑️ Effacer tous les résultats
            </button>
          }
        </div>
      </div>

      <!-- Endpoints par catégorie -->
      @for (category of categories(); track category.name) {
        <div class="mb-8">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-gray-800">
              {{ category.name }}
              <span class="text-sm text-gray-500 ml-2">({{ category.endpoints.length }} endpoints)</span>
            </h2>
            
            @if (category.endpoints.length > 1) {
              <button 
                (click)="testCategory(category.endpoints)"
                [disabled]="isTestingCategory().has(category.name)"
                class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 transition">
                {{ isTestingCategory().has(category.name) ? '⏳ Test en cours...' : '▶️ Tester tout' }}
              </button>
            }
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            @for (endpoint of category.endpoints; track endpoint.id) {
              <div class="border rounded-lg bg-white shadow-sm overflow-hidden">
                <!-- Header de la card -->
                <div class="p-4 border-b bg-gray-50">
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex items-center space-x-2">
                      <span [class]="getMethodBadgeClass(endpoint.method)">
                        {{ endpoint.method }}
                      </span>
                      @if (endpoint.requiresAuth) {
                        <span class="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                          🔐 Auth
                        </span>
                      }
                      @if (endpoint.parameters && endpoint.parameters.length > 0) {
                        <span class="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                          ⚙️ {{ endpoint.parameters.length }} param(s)
                        </span>
                      }
                    </div>
                    
                    <button
                      (click)="toggleCard(endpoint.id)"
                      class="text-gray-500 hover:text-gray-700">
                      {{ isCardExpanded(endpoint.id) ? '▼' : '▶' }}
                    </button>
                  </div>
                  
                  <h3 class="font-semibold text-gray-900 text-lg">{{ endpoint.name }}</h3>
                  <p class="text-sm text-gray-600 mt-1">{{ endpoint.description }}</p>
                  <code class="text-xs text-blue-600 block mt-2 bg-blue-50 p-1 rounded">{{ endpoint.url }}</code>
                  
                  @if (endpoint.note) {
                    <p class="text-xs text-orange-600 mt-2">💡 {{ endpoint.note }}</p>
                  }
                </div>

                <!-- Contenu extensible -->
                @if (isCardExpanded(endpoint.id)) {
                  <div class="p-4 bg-white">
                    <!-- Formulaire de paramètres -->
                    @if (endpoint.parameters && endpoint.parameters.length > 0) {
                      <div class="mb-4 p-3 bg-gray-50 rounded">
                        <h4 class="text-sm font-semibold text-gray-700 mb-3">⚙️ Paramètres</h4>
                        @for (param of endpoint.parameters; track param.name) {
                          <div class="mb-3">
                            <label class="block text-xs font-medium text-gray-700 mb-1">
                              {{ param.description }}
                              @if (param.required) {
                                <span class="text-red-500">*</span>
                              }
                              @if (param.autoSource) {
                                <span class="text-green-600 text-xs">(auto: {{ param.autoSource }})</span>
                              }
                            </label>
                            
                            @if (param.options && param.options.length > 0) {
                              <!-- Select pour options prédéfinies -->
                              <select
                                [(ngModel)]="parameterValues()[endpoint.id][param.name]"
                                class="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500">
                                <option value="">-- Sélectionner --</option>
                                @for (option of param.options; track option) {
                                  <option [value]="option">{{ option }}</option>
                                }
                              </select>
                            } @else {
                              <!-- Input texte -->
                              <input
                                type="text"
                                [(ngModel)]="parameterValues()[endpoint.id][param.name]"
                                [placeholder]="param.placeholder || 'Entrez ' + param.name"
                                class="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                              />
                            }
                            <p class="text-xs text-gray-500 mt-1">
                              Type: {{ param.type }} | 
                              {{ param.required ? 'Obligatoire' : 'Optionnel' }}
                            </p>
                          </div>
                        }
                      </div>
                    }

                    <!-- Bouton de test -->
                    <button 
                      (click)="testSingleEndpoint(endpoint)"
                      [disabled]="isTestingEndpoint().has(endpoint.id) || (endpoint.requiresAuth && !isAuthenticated())"
                      [class]="getTestButtonClass(endpoint)">
                      {{ getTestButtonText(endpoint) }}
                    </button>

                    <!-- Résultat du dernier test -->
                    @if (getLatestResult(endpoint.id); as result) {
                      <div class="mt-4">
                        <!-- Summary du résultat -->
                        <div class="p-3 rounded" [class]="getResultClass(result)">
                          <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center space-x-2">
                              <span class="text-lg">{{ result.success ? '✅' : '❌' }}</span>
                              <span class="font-semibold">
                                {{ result.status }} {{ result.statusText }}
                              </span>
                            </div>
                            <span class="text-sm">
                              {{ result.responseTime }}ms
                            </span>
                          </div>
                          
                          <div class="text-xs text-gray-600">
                            {{ formatTime(result.timestamp) }}
                            @if (result.requestUrl) {
                              <br/>URL: {{ result.requestUrl }}
                            }
                          </div>

                          @if (result.error) {
                            <div class="mt-2 p-2 bg-red-100 text-red-800 text-sm rounded">
                              {{ result.error }}
                            </div>
                          }
                        </div>

                        <!-- Détails du résultat (extensible) -->
                        <button
                          (click)="toggleDetails(endpoint.id)"
                          class="w-full mt-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition">
                          {{ showDetails().has(endpoint.id) ? '▼ Masquer les détails' : '▶ Afficher les détails' }}
                        </button>

                        @if (showDetails().has(endpoint.id)) {
                          <div class="mt-3 space-y-3">
                            <!-- Response Data -->
                            @if (result.data) {
                              <div>
                                <h5 class="text-sm font-semibold text-gray-700 mb-2">📦 Response Data</h5>
                                <div class="bg-gray-900 text-green-400 p-3 rounded overflow-x-auto json-viewer">{{ formatJson(result.data) }}</div>
                              </div>
                            }

                            <!-- Error Details -->
                            @if (result.errorDetails) {
                              <div>
                                <h5 class="text-sm font-semibold text-red-700 mb-2">🐛 Error Details</h5>
                                <div class="bg-red-50 text-red-900 p-3 rounded overflow-x-auto json-viewer">{{ formatJson(result.errorDetails) }}</div>
                              </div>
                            }

                            <!-- Request Body -->
                            @if (result.requestBody) {
                              <div>
                                <h5 class="text-sm font-semibold text-gray-700 mb-2">📤 Request Body</h5>
                                <div class="bg-blue-50 text-blue-900 p-3 rounded overflow-x-auto json-viewer">{{ formatJson(result.requestBody) }}</div>
                              </div>
                            }

                            <!-- Response Headers -->
                            @if (result.headers && Object.keys(result.headers).length > 0) {
                              <div>
                                <h5 class="text-sm font-semibold text-gray-700 mb-2">📋 Response Headers</h5>
                                <div class="bg-gray-50 p-3 rounded text-xs">
                                  @for (header of Object.keys(result.headers); track header) {
                                    <div class="mb-1">
                                      <span class="font-semibold">{{ header }}:</span>
                                      <span class="ml-2 text-gray-600">{{ result.headers[header] }}</span>
                                    </div>
                                  }
                                </div>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
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
  expandedCards = signal(new Set<string>());
  isTestingEndpoint = signal(new Set<string>());
  isTestingCategory = signal(new Set<string>());
  
  // Valeurs des paramètres pour chaque endpoint
  parameterValues = signal<Record<string, ParameterValues>>({});

  // Computed
  categories = computed(() => {
    const endpointsByCategory = getEndpointsByCategory();
    return Object.entries(endpointsByCategory).map(([name, endpoints]) => ({
      name,
      endpoints
    }));
  });

  authStatusClass = computed(() => {
    return this.isAuthenticated() 
      ? 'w-3 h-3 bg-green-500 rounded-full'
      : 'w-3 h-3 bg-red-500 rounded-full';
  });

  authStatusText = computed(() => {
    return this.isAuthenticated() 
      ? '✅ Authentifié - Tous les endpoints disponibles'
      : '❌ Non authentifié - Seulement les endpoints publics';
  });

  constructor() {
    // Initialiser les valeurs de paramètres pour tous les endpoints
    const initialValues: Record<string, ParameterValues> = {};
    TEST_ENDPOINTS.forEach(endpoint => {
      initialValues[endpoint.id] = {};
      endpoint.parameters?.forEach(param => {
        if (param.defaultValue) {
          initialValues[endpoint.id][param.name] = param.defaultValue;
        }
      });
    });
    this.parameterValues.set(initialValues);
  }

  async testSingleEndpoint(endpoint: ApiEndpoint): Promise<void> {
    const testing = new Set(this.isTestingEndpoint());
    testing.add(endpoint.id);
    this.isTestingEndpoint.set(testing);

    try {
      const params = this.parameterValues()[endpoint.id];
      await this.testerService.testEndpoint(endpoint, params);
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

  toggleCard(endpointId: string): void {
    const current = new Set(this.expandedCards());
    if (current.has(endpointId)) {
      current.delete(endpointId);
    } else {
      current.add(endpointId);
    }
    this.expandedCards.set(current);
  }

  isCardExpanded(endpointId: string): boolean {
    return this.expandedCards().has(endpointId);
  }

  clearAllResults(): void {
    this.testerService.clearResults();
    this.showDetails.set(new Set());
  }

  getLatestResult(endpointId: string): EndpointTestResult | null {
    return this.testerService.getLatestResultForEndpoint(endpointId);
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatJson(data: any): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  getMethodBadgeClass(method: string): string {
    const baseClass = 'px-2 py-1 text-xs font-bold rounded uppercase';
    switch (method) {
      case 'GET': return `${baseClass} bg-green-100 text-green-800`;
      case 'POST': return `${baseClass} bg-blue-100 text-blue-800`;
      case 'PUT': return `${baseClass} bg-yellow-100 text-yellow-800`;
      case 'PATCH': return `${baseClass} bg-orange-100 text-orange-800`;
      case 'DELETE': return `${baseClass} bg-red-100 text-red-800`;
      default: return `${baseClass} bg-gray-100 text-gray-800`;
    }
  }

  getTestButtonClass(endpoint: ApiEndpoint): string {
    const baseClass = 'w-full px-4 py-2 text-sm font-semibold rounded transition-colors';
    const isDisabled = this.isTestingEndpoint().has(endpoint.id) || 
                      (endpoint.requiresAuth && !this.isAuthenticated());
    
    if (isDisabled) {
      return `${baseClass} bg-gray-100 text-gray-400 cursor-not-allowed`;
    }
    
    return `${baseClass} bg-blue-600 text-white hover:bg-blue-700`;
  }

  getTestButtonText(endpoint: ApiEndpoint): string {
    if (this.isTestingEndpoint().has(endpoint.id)) {
      return '⏳ Test en cours...';
    }
    
    if (endpoint.requiresAuth && !this.isAuthenticated()) {
      return '🔒 Connexion requise';
    }
    
    return '▶️ Tester cet endpoint';
  }

  getResultClass(result: EndpointTestResult): string {
    return result.success 
      ? 'bg-green-50 border border-green-200'
      : 'bg-red-50 border border-red-200';
  }

  Object = Object; // Pour utiliser Object.keys dans le template
}