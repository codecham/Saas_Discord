import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { StatisticsFacadeService } from '@services/statistics/statistics-facade.service';
import { STATS_PERIODS, type StatsPeriod } from '@services/statistics/statistics.types';

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
          [disabled]="statsFacade.isLoadingGuildStats()"
        />
      </div>

      <!-- Grid des 4 cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        <!-- Card 1: Total Messages -->
        <div class="card mb-0 transition-all duration-300 hover:shadow-lg h-[160px] flex flex-col">
          @if (statsFacade.isLoadingGuildStats()) {
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
          } @else if (statsFacade.guildStats(); as stats) {
            <!-- Contenu de la card -->
            <div class="flex justify-between mb-4">
              <div>
                <span class="block text-muted-color font-medium mb-4">
                  Total Messages
                </span>
                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                  {{ formatNumber(stats.current.messages) }}
                </div>
              </div>
              <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                <i class="pi pi-comments text-blue-500 text-xl!"></i>
              </div>
            </div>
            <div class="mt-auto">
              <span 
                class="font-medium"
                [class]="getChangeColorClass(stats.changes.messagesChange)">
                {{ formatPercentageChange(stats.changes.messagesChange) }}
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
          @if (statsFacade.isLoadingGuildStats()) {
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
          } @else if (statsFacade.guildStats(); as stats) {
            <div class="flex justify-between mb-4">
              <div>
                <span class="block text-muted-color font-medium mb-4">
                  Voice Time
                </span>
                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                  {{ formatDuration(stats.current.voiceMinutes) }}
                </div>
              </div>
              <div class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                <i class="pi pi-microphone text-orange-500 text-xl!"></i>
              </div>
            </div>
            <div class="mt-auto">
              <span 
                class="font-medium"
                [class]="getChangeColorClass(stats.changes.voiceChange)">
                {{ formatPercentageChange(stats.changes.voiceChange) }}
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
          @if (statsFacade.isLoadingGuildStats()) {
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
          } @else if (statsFacade.guildStats(); as stats) {
            <div class="flex justify-between mb-4">
              <div>
                <span class="block text-muted-color font-medium mb-4">
                  Total Reactions
                </span>
                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                  {{ formatNumber(stats.current.reactions) }}
                </div>
              </div>
              <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                <i class="pi pi-heart text-purple-500 text-xl!"></i>
              </div>
            </div>
            <div class="mt-auto">
              <span 
                class="font-medium"
                [class]="getChangeColorClass(stats.changes.reactionsChange)">
                {{ formatPercentageChange(stats.changes.reactionsChange) }}
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
          @if (statsFacade.isLoadingGuildStats()) {
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
          } @else if (statsFacade.guildStats(); as stats) {
            <div class="flex justify-between mb-4">
              <div>
                <span class="block text-muted-color font-medium mb-4">
                  Active Users
                </span>
                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                  {{ stats.current.activeMembers }}
                </div>
              </div>
              <div class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                <i class="pi pi-users text-cyan-500 text-xl!"></i>
              </div>
            </div>
            <div class="mt-auto">
              <span 
                class="font-medium"
                [class]="getChangeColorClass(stats.changes.membersChange)">
                {{ formatPercentageChange(stats.changes.membersChange) }}
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

  // Options du sélecteur de période
  protected periodOptions: PeriodOption[] = [
    { label: 'Today', value: STATS_PERIODS.TODAY },
    { label: 'Week', value: STATS_PERIODS.WEEK },
    { label: 'Month', value: STATS_PERIODS.MONTH },
    { label: 'All', value: STATS_PERIODS.ALL },
  ];

  // Période sélectionnée (par défaut: week)
  protected selectedPeriod: StatsPeriod = STATS_PERIODS.WEEK;

  async ngOnInit(): Promise<void> {
    // Les stats sont déjà chargées automatiquement par le facade
    // On peut juste changer la période si besoin
    if (this.selectedPeriod !== STATS_PERIODS.WEEK) {
      await this.loadStats();
    }
  }

  ngOnDestroy(): void {
    // Cleanup si nécessaire
  }

  /**
   * Charge les stats pour la période sélectionnée
   */
  private async loadStats(): Promise<void> {
    try {
      await this.statsFacade.loadGuildStats(undefined, this.selectedPeriod);
    } catch (error) {
      console.error('[StatsCardsWidget] Failed to load stats:', error);
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
   * Formate un nombre avec des séparateurs de milliers
   */
  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  /**
   * Formate une durée en minutes vers un format lisible
   */
  protected formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Formate un pourcentage de changement avec le signe + ou -
   */
  protected formatPercentageChange(change: number): string {
    if (change === 0) return '0%';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
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