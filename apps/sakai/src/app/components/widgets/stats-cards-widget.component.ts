import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { StatisticsFacadeService } from '@services/statistics/statistics-facade.service';
import { 
  formatNumber, 
  formatDuration, 
  formatPercentageChange,
  type StatsPeriod 
} from '@services/statistics/statistics.models';

interface PeriodOption {
  label: string;
  value: StatsPeriod;
}

/**
 * 📊 Widget affichant les 4 cards de statistiques principales
 * 
 * - Total Messages + change %
 * - Voice Minutes + change %
 * - Reactions + change %
 * - Active Users + change %
 * 
 * Avec sélecteur de période global en haut
 */
@Component({
  selector: 'app-stats-cards-widget',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectButtonModule,
    SkeletonModule,
  ],
  template: `
    <div class="col-span-12">
      <!-- Header avec sélecteur de période -->
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0">
          Statistics Overview
        </h2>
        
        <p-selectButton
          [options]="periodOptions"
          [(ngModel)]="selectedPeriod"
          (onChange)="onPeriodChange()"
          optionLabel="label"
          optionValue="value"
          [disabled]="statsFacade.isLoadingDashboard()"
        />
      </div>

      <!-- Grid des 4 cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        <!-- Card 1: Total Messages -->
        <div class="card mb-0 transition-all duration-300 hover:shadow-lg h-[160px] flex flex-col">
          @if (statsFacade.isLoadingDashboard()) {
            <!-- Loading skeleton -->
            <div class="flex justify-between mb-4">
              <div class="flex-1">
                <p-skeleton width="8rem" styleClass="mb-4" />
                <p-skeleton width="6rem" height="2rem" />
              </div>
              <p-skeleton shape="circle" size="2.5rem" />
            </div>
            <div class="mt-auto">
              <p-skeleton width="10rem" />
            </div>
          } @else if (statsFacade.dashboardStats(); as stats) {
            <!-- Contenu de la card -->
            <div class="flex justify-between mb-4">
              <div>
                <span class="block text-muted-color font-medium mb-4">
                  Total Messages
                </span>
                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                  {{ formatNumber(stats.totalMessages) }}
                </div>
              </div>
              <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                <i class="pi pi-comments text-blue-500 text-xl!"></i>
              </div>
            </div>
            <div class="mt-auto">
              <span 
                class="font-medium"
                [class]="getChangeColorClass(stats.messagesChange)">
                {{ formatPercentageChange(stats.messagesChange) }}
              </span>
              <span class="text-muted-color ml-2">vs previous period</span>
            </div>
          } @else {
            <!-- État vide / erreur -->
            <div class="flex items-center justify-center h-full text-muted-color">
              No data available
            </div>
          }
        </div>

        <!-- Card 2: Voice Minutes -->
        <div class="card mb-0 transition-all duration-300 hover:shadow-lg h-[160px] flex flex-col">
          @if (statsFacade.isLoadingDashboard()) {
            <div class="flex justify-between mb-4">
              <div class="flex-1">
                <p-skeleton width="8rem" styleClass="mb-4" />
                <p-skeleton width="6rem" height="2rem" />
              </div>
              <p-skeleton shape="circle" size="2.5rem" />
            </div>
            <div class="mt-auto">
              <p-skeleton width="10rem" />
            </div>
          } @else if (statsFacade.dashboardStats(); as stats) {
            <div class="flex justify-between mb-4">
              <div>
                <span class="block text-muted-color font-medium mb-4">
                  Voice Time
                </span>
                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                  {{ formatDuration(stats.totalVoiceMinutes) }}
                </div>
              </div>
              <div class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                <i class="pi pi-microphone text-orange-500 text-xl!"></i>
              </div>
            </div>
            <div class="mt-auto">
              <span 
                class="font-medium"
                [class]="getChangeColorClass(stats.voiceMinutesChange)">
                {{ formatPercentageChange(stats.voiceMinutesChange) }}
              </span>
              <span class="text-muted-color ml-2">vs previous period</span>
            </div>
          } @else {
            <div class="flex items-center justify-center h-full text-muted-color">
              No data available
            </div>
          }
        </div>

        <!-- Card 3: Reactions -->
        <div class="card mb-0 transition-all duration-300 hover:shadow-lg h-[160px] flex flex-col">
          @if (statsFacade.isLoadingDashboard()) {
            <div class="flex justify-between mb-4">
              <div class="flex-1">
                <p-skeleton width="8rem" styleClass="mb-4" />
                <p-skeleton width="6rem" height="2rem" />
              </div>
              <p-skeleton shape="circle" size="2.5rem" />
            </div>
            <div class="mt-auto">
              <p-skeleton width="10rem" />
            </div>
          } @else if (statsFacade.dashboardStats(); as stats) {
            <div class="flex justify-between mb-4">
              <div>
                <span class="block text-muted-color font-medium mb-4">
                  Total Reactions
                </span>
                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                  {{ formatNumber(stats.totalReactions) }}
                </div>
              </div>
              <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                <i class="pi pi-heart text-purple-500 text-xl!"></i>
              </div>
            </div>
            <div class="mt-auto">
              <span 
                class="font-medium"
                [class]="getChangeColorClass(stats.reactionsChange)">
                {{ formatPercentageChange(stats.reactionsChange) }}
              </span>
              <span class="text-muted-color ml-2">vs previous period</span>
            </div>
          } @else {
            <div class="flex items-center justify-center h-full text-muted-color">
              No data available
            </div>
          }
        </div>

        <!-- Card 4: Active Users -->
        <div class="card mb-0 transition-all duration-300 hover:shadow-lg h-[160px] flex flex-col">
          @if (statsFacade.isLoadingDashboard()) {
            <div class="flex justify-between mb-4">
              <div class="flex-1">
                <p-skeleton width="8rem" styleClass="mb-4" />
                <p-skeleton width="6rem" height="2rem" />
              </div>
              <p-skeleton shape="circle" size="2.5rem" />
            </div>
            <div class="mt-auto">
              <p-skeleton width="10rem" />
            </div>
          } @else if (statsFacade.dashboardStats(); as stats) {
            <div class="flex justify-between mb-4">
              <div>
                <span class="block text-muted-color font-medium mb-4">
                  Active Users
                </span>
                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                  {{ stats.uniqueActiveUsers }}
                </div>
              </div>
              <div class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                <i class="pi pi-users text-cyan-500 text-xl!"></i>
              </div>
            </div>
            <div class="mt-auto">
              <span 
                class="font-medium"
                [class]="getChangeColorClass(stats.activeUsersChange)">
                {{ formatPercentageChange(stats.activeUsersChange) }}
              </span>
              <span class="text-muted-color ml-2">vs previous period</span>
            </div>
          } @else {
            <div class="flex items-center justify-center h-full text-muted-color">
              No data available
            </div>
          }
        </div>

      </div>

      <!-- Message d'erreur global si besoin -->
      @if (statsFacade.error(); as error) {
        <div class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p class="text-red-700 dark:text-red-400">
            <i class="pi pi-exclamation-triangle mr-2"></i>
            {{ error }}
          </p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class StatsCardsWidgetComponent implements OnInit, OnDestroy {
  protected readonly statsFacade = inject(StatisticsFacadeService);

  // Exposer les helpers au template
  protected readonly formatNumber = formatNumber;
  protected readonly formatDuration = formatDuration;
  protected readonly formatPercentageChange = formatPercentageChange;

  // Options du sélecteur de période
  protected periodOptions: PeriodOption[] = [
    { label: 'Today', value: 'today' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'All', value: 'all' },
  ];

  // Période sélectionnée (par défaut: week)
  protected selectedPeriod: StatsPeriod = 'week';

  async ngOnInit(): Promise<void> {
    // Charger les stats au démarrage
    await this.loadStats();
  }

  ngOnDestroy(): void {
    // Cleanup si nécessaire
  }

  /**
   * Charge les stats pour la période sélectionnée
   */
  private async loadStats(): Promise<void> {
    try {
      await this.statsFacade.loadDashboardStats(this.selectedPeriod);
    } catch (error) {
      console.error('[StatsCardsWidget] Failed to load stats:', error);
      // L'erreur est déjà gérée par le facade et affichée dans le template
    }
  }

  /**
   * Handler quand la période change
   */
  protected async onPeriodChange(): Promise<void> {
    console.log('[StatsCardsWidget] Period changed to:', this.selectedPeriod);
    await this.loadStats();
  }

  /**
   * Retourne la classe CSS selon le changement (positif/négatif/neutre)
   */
  protected getChangeColorClass(change: number): string {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  }
}