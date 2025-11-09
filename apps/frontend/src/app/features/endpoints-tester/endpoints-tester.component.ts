import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { AccordionModule } from 'primeng/accordion';
import { FieldsetModule } from 'primeng/fieldset';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { BadgeModule } from 'primeng/badge';

// Services & Interfaces
import { AuthFacadeService } from '@app/core/services/auth/auth-facade.service';
import { TEST_ENDPOINTS, getEndpointsByCategory } from '@app/shared/config/test-endpoints.config';
import { ApiEndpoint, EndpointTestResult, ParameterValues } from '@app/shared/interfaces/endpoint-tester.interface';
import { EndpointTesterService } from '@app/core/services/endoints-tester/endpoints-tester.service';

@Component({
  selector: 'app-endpoint-tester',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AccordionModule,
    FieldsetModule,
    ButtonModule,
    TagModule,
    MessageModule,
    InputTextModule,
    BadgeModule
  ],
  template: `
    <div class="card">
      <!-- Header -->
      <div class="mb-6">
        <div class="font-semibold text-xl mb-2">🧪 API Endpoint Tester</div>
        <p class="text-surface-600 dark:text-surface-400">
          Testez rapidement tous vos endpoints Discord avec gestion des paramètres
        </p>
        
        <!-- Status de connexion -->
        <div class="mt-4 flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-2">
            <i [class]="authStatusIcon()" class="text-lg"></i>
            <span class="font-medium">{{ authStatusText() }}</span>
          </div>
          
          @if (testResults().length > 0) {
            <p-button 
              (onClick)="clearAllResults()"
              label="Effacer tous les résultats" 
              icon="pi pi-trash"
              severity="danger"
              [outlined]="true"
              size="small" />
          }
        </div>
      </div>

      <!-- Accordion par catégorie -->
      <p-accordion [value]="'0'" [multiple]="true">
        @for (category of categories(); track category.name; let idx = $index) {
          <p-accordion-panel [value]="idx.toString()">
            <p-accordion-header>
              <div class="flex items-center justify-between w-full pr-4">
                <div class="flex items-center gap-3">
                  <span class="font-bold">{{ category.name }}</span>
                  <p-badge [value]="category.endpoints.length.toString()" />
                </div>
                
                @if (category.endpoints.length > 1) {
                  <p-button 
                    (onClick)="testCategory(category.endpoints, $event)"
                    [disabled]="isTestingCategory().has(category.name)"
                    [label]="isTestingCategory().has(category.name) ? 'Test en cours...' : 'Tester tout'"
                    icon="pi pi-play"
                    size="small"
                    [text]="true"
                    severity="secondary" />
                }
              </div>
            </p-accordion-header>
            
            <p-accordion-content>
              <div class="flex flex-col gap-4">
                @for (endpoint of category.endpoints; track endpoint.id) {
                  <p-fieldset 
                    [legend]="endpoint.name" 
                    [toggleable]="true" 
                    [collapsed]="false">
                    
                    <!-- En-tête de l'endpoint -->
                    <div class="flex items-start gap-4 mb-4 flex-wrap">
                      <p-tag 
                        [value]="endpoint.method" 
                        [severity]="getMethodSeverity(endpoint.method)" />
                      
                      @if (endpoint.requiresAuth) {
                        <p-tag value="🔒 Auth requise" severity="warn" />
                      }
                    </div>

                    <p class="mb-4 text-surface-700 dark:text-surface-300">
                      {{ endpoint.description }}
                    </p>

                    @if (endpoint.note) {
                      <p-message 
                        severity="info" 
                        [text]="endpoint.note"
                        styleClass="mb-4" />
                    }

                    <!-- Formulaire de paramètres -->
                    @if (endpoint.parameters && endpoint.parameters.length > 0) {
                      <div class="mb-4">
                        <div class="font-semibold mb-4">Paramètres</div>
                        <div class="flex flex-col gap-4">
                          @for (param of endpoint.parameters; track param.name) {
                            <div class="flex flex-col gap-2">
                              <label [for]="endpoint.id + '-' + param.name" class="font-medium">
                                {{ param.name }}
                                @if (param.required) {
                                  <span class="text-red-500 ml-1">*</span>
                                }
                              </label>
                              <input 
                                pInputText 
                                [id]="endpoint.id + '-' + param.name"
                                [(ngModel)]="parameterValues()[endpoint.id][param.name]"
                                [placeholder]="param.placeholder || ''"
                                class="w-full" />
                              <small class="text-surface-600 dark:text-surface-400">
                                {{ param.description }}
                                @if (!param.required) {
                                  <span class="text-surface-500"> (Optionnel)</span>
                                }
                              </small>
                            </div>
                          }
                        </div>
                      </div>
                    }

                    <!-- Bouton de test -->
                    <p-button 
                      (onClick)="testSingleEndpoint(endpoint)"
                      [disabled]="isTestingEndpoint().has(endpoint.id) || (endpoint.requiresAuth && !isAuthenticated())"
                      [label]="getTestButtonText(endpoint)"
                      [icon]="isTestingEndpoint().has(endpoint.id) ? 'pi pi-spin pi-spinner' : 'pi pi-play'"
                      [severity]="(endpoint.requiresAuth && !isAuthenticated()) ? 'secondary' : 'primary'"
                      styleClass="w-full" />

                    <!-- Résultat du dernier test -->
                    @if (getLatestResult(endpoint.id); as result) {
                      <div class="mt-4">
                        <!-- Message de résultat -->
                        <p-message 
                          [severity]="result.success ? 'success' : 'error'"
                          styleClass="w-full">
                          <div class="flex flex-col gap-2 w-full">
                            <div class="flex items-center justify-between flex-wrap gap-2">
                              <span class="font-semibold">
                                {{ result.status }} {{ result.statusText }}
                              </span>
                              <span class="text-sm">
                                {{ result.responseTime }}ms
                              </span>
                            </div>
                            
                            <div class="text-sm">
                              {{ formatTime(result.timestamp) }}
                            </div>

                            @if (result.requestUrl) {
                              <div class="text-xs font-mono break-all bg-surface-100 dark:bg-surface-800 p-2 rounded">
                                {{ result.requestUrl }}
                              </div>
                            }

                            @if (result.error) {
                              <div class="text-sm mt-2">
                                {{ result.error }}
                              </div>
                            }
                          </div>
                        </p-message>

                        <!-- Bouton pour afficher les détails -->
                        <p-button 
                          (onClick)="toggleDetails(endpoint.id)"
                          [label]="showDetails().has(endpoint.id) ? 'Masquer les détails' : 'Afficher les détails'"
                          [icon]="showDetails().has(endpoint.id) ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
                          [text]="true"
                          size="small"
                          styleClass="mt-2 w-full" />

                        <!-- Détails extensibles -->
                        @if (showDetails().has(endpoint.id)) {
                          <div class="mt-4 flex flex-col gap-4">
                            
                            <!-- Headers de réponse -->
                            @if (result.headers && Object.keys(result.headers).length > 0) {
                              <div>
                                <div class="font-semibold mb-2">📋 Headers de réponse</div>
                                <pre class="bg-surface-100 dark:bg-surface-800 p-3 rounded text-sm overflow-auto">{{ formatJson(result.headers) }}</pre>
                              </div>
                            }

                            <!-- Request Body -->
                            @if (result.requestBody) {
                              <div>
                                <div class="font-semibold mb-2">📤 Request Body</div>
                                <pre class="bg-surface-100 dark:bg-surface-800 p-3 rounded text-sm overflow-auto">{{ formatJson(result.requestBody) }}</pre>
                              </div>
                            }

                            <!-- Response Data -->
                            @if (result.data) {
                              <div>
                                <div class="font-semibold mb-2">📦 Response Data</div>
                                <pre class="bg-surface-100 dark:bg-surface-800 p-3 rounded text-sm overflow-auto max-h-96">{{ formatJson(result.data) }}</pre>
                              </div>
                            }

                            <!-- Error Details -->
                            @if (result.errorDetails) {
                              <div>
                                <div class="font-semibold mb-2 text-red-600 dark:text-red-400">❌ Détails de l'erreur</div>
                                <pre class="bg-red-50 dark:bg-red-950 p-3 rounded text-sm overflow-auto">{{ formatJson(result.errorDetails) }}</pre>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    }
                  </p-fieldset>
                }
              </div>
            </p-accordion-content>
          </p-accordion-panel>
        }
      </p-accordion>
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

  authStatusIcon = computed(() => {
    return this.isAuthenticated() 
      ? 'pi pi-check-circle text-green-500'
      : 'pi pi-times-circle text-red-500';
  });

  authStatusText = computed(() => {
    return this.isAuthenticated() 
      ? 'Authentifié - Tous les endpoints disponibles'
      : 'Non authentifié - Seulement les endpoints publics';
  });

  constructor() {
    // Initialiser les valeurs de paramètres pour tous les endpoints
    const initialValues: Record<string, ParameterValues> = {};
    TEST_ENDPOINTS.forEach(endpoint => {
      initialValues[endpoint.id] = {};
      endpoint.parameters?.forEach(param => {
        if (param.defaultValue !== undefined) {
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

  async testCategory(endpoints: ApiEndpoint[], event?: Event): Promise<void> {
    // Empêcher la propagation pour ne pas toggle l'accordion
    if (event) {
      event.stopPropagation();
    }
    
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

  getMethodSeverity(method: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (method) {
      case 'GET': return 'info';
      case 'POST': return 'success';
      case 'PUT': return 'warn';
      case 'PATCH': return 'warn';
      case 'DELETE': return 'danger';
      default: return 'secondary';
    }
  }

  getTestButtonText(endpoint: ApiEndpoint): string {
    if (this.isTestingEndpoint().has(endpoint.id)) {
      return 'Test en cours...';
    }
    
    if (endpoint.requiresAuth && !this.isAuthenticated()) {
      return 'Connexion requise';
    }
    
    return 'Tester cet endpoint';
  }

  // Helper pour utiliser Object dans le template
  Object = Object;
}