import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { StatCardComponent } from '@app/shared/components/ui/stat-card/stat-card.component';

/**
 * 📊 StatCard Demo
 * 
 * Page de démonstration du composant StatCard
 * avec tous les exemples d'utilisation organisés par catégories
 */
@Component({
    selector: 'app-stat-card-demo',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        CardModule,
        ButtonModule,
        DividerModule,
        StatCardComponent
    ],
    template: `
        <div class="grid">
            
            <!-- Header -->
            <div class="col-span-12">
                <div class="card">
                    <div class="flex items-center gap-3 mb-4">
                        <p-button
                            icon="pi pi-arrow-left"
                            [text]="true"
                            [rounded]="true"
                            routerLink="/uikit"
                            label="Retour"
                        />
                        <div>
                            <h1 class="text-4xl font-bold m-0">📊 Stat Card</h1>
                            <p class="text-muted-color mt-2">
                                Composant de card de statistique réutilisable avec icône, valeur et options avancées
                            </p>
                        </div>
                    </div>

                    <!-- Quick Info -->
                    <div class="flex flex-wrap gap-2">
                        <span class="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-500 rounded text-sm font-medium">
                            <i class="pi pi-palette mr-2"></i>
                            8 couleurs
                        </span>
                        <span class="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-500 rounded text-sm font-medium">
                            <i class="pi pi-arrows-alt mr-2"></i>
                            3 tailles
                        </span>
                        <span class="inline-flex items-center px-3 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-500 rounded text-sm font-medium">
                            <i class="pi pi-chart-line mr-2"></i>
                            Trends
                        </span>
                        <span class="inline-flex items-center px-3 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-500 rounded text-sm font-medium">
                            <i class="pi pi-spinner mr-2"></i>
                            Loading state
                        </span>
                        <span class="inline-flex items-center px-3 py-1 bg-cyan-100 dark:bg-cyan-900/20 text-cyan-500 rounded text-sm font-medium">
                            <i class="pi pi-mouse-pointer mr-2"></i>
                            Clickable
                        </span>
                    </div>
                </div>
            </div>

            <!-- Section: Basic Usage -->
            <div class="col-span-12">
                <p-card>
                    <ng-template pTemplate="header">
                        <div class="px-6 pt-6">
                            <h2 class="text-2xl font-bold m-0">🎯 Basic Usage</h2>
                            <p class="text-muted-color mt-2">Exemples d'utilisation basique du composant</p>
                        </div>
                    </ng-template>

                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                            <app-stat-card
                                title="Total Membres"
                                [value]="152"
                                icon="pi pi-users"
                                color="blue"
                            />
                        </div>

                        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                            <app-stat-card
                                title="Messages"
                                [value]="1247"
                                icon="pi pi-comments"
                                color="green"
                                subtitle="aujourd'hui"
                            />
                        </div>

                        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                            <app-stat-card
                                title="Channels"
                                [value]="42"
                                icon="pi pi-hashtag"
                                color="orange"
                            />
                        </div>

                        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                            <app-stat-card
                                title="Roles"
                                [value]="18"
                                icon="pi pi-shield"
                                color="cyan"
                            />
                        </div>
                    </div>

                    <ng-template pTemplate="footer">
                        <div class="flex items-center gap-2">
                            <i class="pi pi-code text-muted-color"></i>
                            <p-button
                                [label]="showBasicCode() ? 'Hide Code' : 'Show Code'"
                                [text]="true"
                                size="small"
                                (onClick)="showBasicCode.set(!showBasicCode())"
                            />
                        </div>
                        @if (showBasicCode()) {
                            <pre class="bg-surface-50 dark:bg-surface-800 p-4 rounded mt-3 overflow-x-auto"><code>&lt;app-stat-card
  title="Total Membres"
  [value]="152"
  icon="pi pi-users"
  color="blue"
/&gt;</code></pre>
                        }
                    </ng-template>
                </p-card>
            </div>

            <!-- Section: With Subtitle -->
            <div class="col-span-12">
                <p-card>
                    <ng-template pTemplate="header">
                        <div class="px-6 pt-6">
                            <h2 class="text-2xl font-bold m-0">📝 With Subtitle</h2>
                            <p class="text-muted-color mt-2">Subtitle simple ou avec highlight</p>
                        </div>
                    </ng-template>

                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                            <app-stat-card
                                title="Revenue"
                                [value]="'$2,100'"
                                icon="pi pi-dollar"
                                color="orange"
                                [subtitle]="{ highlight: '24 new', text: 'since last visit' }"
                            />
                        </div>

                        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                            <app-stat-card
                                title="Active Users"
                                [value]="2841"
                                icon="pi pi-users"
                                color="blue"
                                [subtitle]="{ highlight: '520', text: 'newly registered' }"
                            />
                        </div>

                        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                            <app-stat-card
                                title="Server Uptime"
                                [value]="'99.9%'"
                                icon="pi pi-check-circle"
                                color="green"
                                [subtitle]="{ highlight: '30 days', text: 'sans incident' }"
                            />
                        </div>
                    </div>

                    <ng-template pTemplate="footer">
                        <div class="flex items-center gap-2">
                            <i class="pi pi-code text-muted-color"></i>
                            <p-button
                                [label]="showSubtitleCode() ? 'Hide Code' : 'Show Code'"
                                [text]="true"
                                size="small"
                                (onClick)="showSubtitleCode.set(!showSubtitleCode())"
                            />
                        </div>
                        @if (showSubtitleCode()) {
                            <pre class="bg-surface-50 dark:bg-surface-800 p-4 rounded mt-3 overflow-x-auto"><code>&lt;app-stat-card
  title="Revenue"
  [value]="'$2,100'"
  icon="pi pi-dollar"
  color="orange"
  [subtitle]="&#123; highlight: '24 new', text: 'since last visit' &#125;"
/&gt;</code></pre>
                        }
                    </ng-template>
                </p-card>
            </div>

            <!-- Section: With Trends -->
            <div class="col-span-12">
                <p-card>
                    <ng-template pTemplate="header">
                        <div class="px-6 pt-6">
                            <h2 class="text-2xl font-bold m-0">📈 With Trends</h2>
                            <p class="text-muted-color mt-2">Indicateurs de progression positifs et négatifs</p>
                        </div>
                    </ng-template>

                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                            <app-stat-card
                                title="Active Users"
                                [value]="2841"
                                icon="pi pi-users"
                                color="cyan"
                                [trend]="{ value: 12, label: 'vs last month' }"
                            />
                        </div>

                        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                            <app-stat-card
                                title="Server Load"
                                [value]="'45%'"
                                icon="pi pi-server"
                                color="red"
                                [trend]="{ value: -8, label: 'depuis hier' }"
                            />
                        </div>

                        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                            <app-stat-card
                                title="Error Rate"
                                [value]="'0.02%'"
                                icon="pi pi-exclamation-triangle"
                                color="green"
                                [trend]="{ value: -15, label: 'vs last week', invertColors: true }"
                            />
                        </div>
                    </div>

                    <ng-template pTemplate="footer">
                        <div class="flex items-center gap-2">
                            <i class="pi pi-info-circle text-blue-500"></i>
                            <span class="text-sm text-muted-color">
                                Utilisez <code class="bg-surface-100 dark:bg-surface-700 px-2 py-1 rounded">invertColors: true</code> 
                                pour les métriques où une baisse est positive (ex: taux d'erreur)
                            </span>
                        </div>
                    </ng-template>
                </p-card>
            </div>

            <!-- Section: Sizes -->
            <div class="col-span-12">
                <p-card>
                    <ng-template pTemplate="header">
                        <div class="px-6 pt-6">
                            <h2 class="text-2xl font-bold m-0">📏 Sizes</h2>
                            <p class="text-muted-color mt-2">Trois tailles disponibles : small, medium, large</p>
                        </div>
                    </ng-template>

                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                            <app-stat-card
                                title="Small Card"
                                [value]="99"
                                icon="pi pi-star"
                                color="pink"
                                size="small"
                            />
                        </div>

                        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                            <app-stat-card
                                title="Medium Card"
                                [value]="152"
                                icon="pi pi-star"
                                color="purple"
                                size="medium"
                            />
                        </div>

                        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                            <app-stat-card
                                title="Large Card"
                                [value]="1234"
                                icon="pi pi-star"
                                color="indigo"
                                size="large"
                            />
                        </div>
                    </div>
                </p-card>
            </div>

            <!-- Section: All Colors -->
            <div class="col-span-12">
                <p-card>
                    <ng-template pTemplate="header">
                        <div class="px-6 pt-6">
                            <h2 class="text-2xl font-bold m-0">🎨 All Colors</h2>
                            <p class="text-muted-color mt-2">8 couleurs disponibles</p>
                        </div>
                    </ng-template>

                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                            <app-stat-card title="Blue" [value]="1" icon="pi pi-circle-fill" color="blue" />
                        </div>
                        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                            <app-stat-card title="Orange" [value]="2" icon="pi pi-circle-fill" color="orange" />
                        </div>
                        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                            <app-stat-card title="Cyan" [value]="3" icon="pi pi-circle-fill" color="cyan" />
                        </div>
                        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                            <app-stat-card title="Purple" [value]="4" icon="pi pi-circle-fill" color="purple" />
                        </div>
                        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                            <app-stat-card title="Green" [value]="5" icon="pi pi-circle-fill" color="green" />
                        </div>
                        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                            <app-stat-card title="Red" [value]="6" icon="pi pi-circle-fill" color="red" />
                        </div>
                        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                            <app-stat-card title="Pink" [value]="7" icon="pi pi-circle-fill" color="pink" />
                        </div>
                        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                            <app-stat-card title="Indigo" [value]="8" icon="pi pi-circle-fill" color="indigo" />
                        </div>
                    </div>
                </p-card>
            </div>

            <!-- Section: Interactive -->
            <div class="col-span-12">
                <p-card>
                    <ng-template pTemplate="header">
                        <div class="px-6 pt-6">
                            <h2 class="text-2xl font-bold m-0">🖱️ Interactive States</h2>
                            <p class="text-muted-color mt-2">Clickable et loading states</p>
                        </div>
                    </ng-template>

                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                            <app-stat-card
                                title="Pending Tasks"
                                [value]="12"
                                icon="pi pi-clock"
                                color="purple"
                                subtitle="nécessitent une action"
                                [clickable]="true"
                                (cardClick)="handleCardClick('tasks')"
                            />
                        </div>

                        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                            <app-stat-card
                                title="Clickable Card"
                                [value]="42"
                                icon="pi pi-external-link"
                                color="blue"
                                subtitle="click me!"
                                [clickable]="true"
                                (cardClick)="handleCardClick('demo')"
                            />
                        </div>

                        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                            <app-stat-card
                                title="Loading..."
                                [value]="0"
                                [loading]="true"
                            />
                        </div>
                    </div>

                    @if (lastClickedCard()) {
                        <p-divider />
                        <div class="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                            <i class="pi pi-info-circle text-blue-500"></i>
                            <span class="text-sm">
                                Dernière card cliquée : <strong>{{ lastClickedCard() }}</strong>
                            </span>
                        </div>
                    }
                </p-card>
            </div>

        </div>
    `
})
export class StatCardDemoComponent {
    // Code visibility toggles
    protected showBasicCode = signal(false);
    protected showSubtitleCode = signal(false);

    // Interactive demo state
    protected lastClickedCard = signal<string>('');

    /**
     * Handler pour les cards cliquables
     */
    protected handleCardClick(cardName: string): void {
        this.lastClickedCard.set(cardName);
        console.log(`Card clicked: ${cardName}`);
    }
}