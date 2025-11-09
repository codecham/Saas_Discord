import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

/**
 * 🎨 UIKit Overview
 * 
 * Page d'accueil du UIKit listant tous les composants custom disponibles
 * avec navigation vers leurs pages de démonstration respectives
 */
@Component({
    selector: 'app-uikit-overview',
    standalone: true,
    imports: [CommonModule, RouterModule, CardModule, ButtonModule],
    template: `
        <div class="grid">
            <!-- Header -->
            <div class="col-span-12">
                <div class="card">
                    <h1 class="text-4xl font-bold mb-2">🎨 UIKit - Composants Custom</h1>
                    <p class="text-muted-color text-lg">
                        Bibliothèque de composants réutilisables pour Discord Admin App
                    </p>
                </div>
            </div>

            <!-- Categories -->
            
            <!-- Data Display Components -->
            <div class="col-span-12">
                <h2 class="text-2xl font-semibold mb-4">📊 Data Display</h2>
            </div>

            @for (component of dataDisplayComponents; track component.id) {
                <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                    <p-card>
                        <ng-template pTemplate="header">
                            <div class="p-6 bg-primary-50 dark:bg-primary-900/20">
                                <div class="flex items-center gap-3">
                                    <div 
                                        class="flex items-center justify-center rounded-lg w-12 h-12"
                                        [ngClass]="component.iconBg"
                                    >
                                        <i [class]="component.icon + ' text-2xl'"></i>
                                    </div>
                                    <div>
                                        <h3 class="text-xl font-bold m-0">{{ component.title }}</h3>
                                        <span class="text-sm text-muted-color">{{ component.category }}</span>
                                    </div>
                                </div>
                            </div>
                        </ng-template>
                        
                        <p class="text-muted-color mb-4">{{ component.description }}</p>
                        
                        <div class="flex flex-wrap gap-2 mb-4">
                            @for (feature of component.features; track feature) {
                                <span class="inline-flex items-center px-2 py-1 bg-surface-100 dark:bg-surface-700 rounded text-xs">
                                    <i class="pi pi-check text-green-500 mr-1"></i>
                                    {{ feature }}
                                </span>
                            }
                        </div>

                        <ng-template pTemplate="footer">
                            <div class="flex gap-2">
                                <p-button
                                    label="Voir Exemples"
                                    icon="pi pi-eye"
                                    [routerLink]="[component.route]"
                                    styleClass="w-full"
                                />
                            </div>
                        </ng-template>
                    </p-card>
                </div>
            }

            <!-- Forms Components (Future) -->
            <div class="col-span-12 mt-6">
                <h2 class="text-2xl font-semibold mb-4">📝 Forms (Coming Soon)</h2>
            </div>

            @for (component of formsComponents; track component.id) {
                <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                    <p-card>
                        <ng-template pTemplate="header">
                            <div class="p-6 bg-surface-100 dark:bg-surface-700">
                                <div class="flex items-center gap-3">
                                    <div 
                                        class="flex items-center justify-center rounded-lg w-12 h-12"
                                        [ngClass]="component.iconBg"
                                    >
                                        <i [class]="component.icon + ' text-2xl'"></i>
                                    </div>
                                    <div>
                                        <h3 class="text-xl font-bold m-0">{{ component.title }}</h3>
                                        <span class="text-sm text-muted-color">{{ component.category }}</span>
                                    </div>
                                </div>
                            </div>
                        </ng-template>
                        
                        <p class="text-muted-color mb-4">{{ component.description }}</p>
                        
                        <ng-template pTemplate="footer">
                            <p-button
                                label="Coming Soon"
                                icon="pi pi-clock"
                                [disabled]="true"
                                styleClass="w-full"
                                severity="secondary"
                            />
                        </ng-template>
                    </p-card>
                </div>
            }

            <!-- Feedback Components (Future) -->
            <div class="col-span-12 mt-6">
                <h2 class="text-2xl font-semibold mb-4">💬 Feedback (Coming Soon)</h2>
            </div>

            @for (component of feedbackComponents; track component.id) {
                <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                    <p-card>
                        <ng-template pTemplate="header">
                            <div class="p-6 bg-surface-100 dark:bg-surface-700">
                                <div class="flex items-center gap-3">
                                    <div 
                                        class="flex items-center justify-center rounded-lg w-12 h-12"
                                        [ngClass]="component.iconBg"
                                    >
                                        <i [class]="component.icon + ' text-2xl'"></i>
                                    </div>
                                    <div>
                                        <h3 class="text-xl font-bold m-0">{{ component.title }}</h3>
                                        <span class="text-sm text-muted-color">{{ component.category }}</span>
                                    </div>
                                </div>
                            </div>
                        </ng-template>
                        
                        <p class="text-muted-color mb-4">{{ component.description }}</p>
                        
                        <ng-template pTemplate="footer">
                            <p-button
                                label="Coming Soon"
                                icon="pi pi-clock"
                                [disabled]="true"
                                styleClass="w-full"
                                severity="secondary"
                            />
                        </ng-template>
                    </p-card>
                </div>
            }

        </div>
    `
})
export class UikitOverviewComponent {
    /**
     * Composants de type Data Display (disponibles)
     */
    protected dataDisplayComponents = [
        {
            id: 'stat-card',
            title: 'Stat Card',
            category: 'Data Display',
            description: 'Card de statistique avec icône, valeur, trend indicator et subtitle flexible.',
            icon: 'pi pi-chart-line',
            iconBg: 'bg-blue-100 dark:bg-blue-900/20 text-blue-500',
            route: '/uikit/stat-card',
            features: ['8 couleurs', '3 tailles', 'Trends', 'Clickable', 'Loading state']
        }
    ];

    /**
     * Composants de type Forms (à venir)
     */
    protected formsComponents = [
        {
            id: 'data-table',
            title: 'Data Table',
            category: 'Data Display',
            description: 'Table de données avec sorting, filtering, pagination et actions.',
            icon: 'pi pi-table',
            iconBg: 'bg-orange-100 dark:bg-orange-900/20 text-orange-500'
        },
        {
            id: 'chart-card',
            title: 'Chart Card',
            category: 'Data Display',
            description: 'Card avec graphique intégré (ligne, barre, donut, etc.).',
            icon: 'pi pi-chart-bar',
            iconBg: 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-500'
        }
    ];

    /**
     * Composants de type Feedback (à venir)
     */
    protected feedbackComponents = [
        {
            id: 'config-section',
            title: 'Config Section',
            category: 'Forms',
            description: 'Section de configuration pour modules avec toggle et settings.',
            icon: 'pi pi-cog',
            iconBg: 'bg-purple-100 dark:bg-purple-900/20 text-purple-500'
        },
        {
            id: 'empty-state',
            title: 'Empty State',
            category: 'Feedback',
            description: 'État vide avec illustration et call-to-action.',
            icon: 'pi pi-inbox',
            iconBg: 'bg-pink-100 dark:bg-pink-900/20 text-pink-500'
        }
    ];
}