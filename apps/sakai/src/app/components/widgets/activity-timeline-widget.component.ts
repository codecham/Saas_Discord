import { Component, inject, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CheckboxModule } from 'primeng/checkbox';
import { SkeletonModule } from 'primeng/skeleton';
import { ChartModule } from 'primeng/chart';
import { debounceTime, Subscription } from 'rxjs';
import { StatisticsFacadeService } from '@services/statistics/statistics-facade.service';
import { LayoutService } from '@services/layout.service';
import { STATS_PERIODS, type StatsPeriod } from '@services/statistics/statistics.types';

interface PeriodOption {
  label: string;
  value: StatsPeriod;
}

interface MetricToggle {
  key: 'messages' | 'voice' | 'reactions';
  label: string;
  color: string;
  enabled: boolean;
}

/**
 * 📈 Widget Timeline d'Activité Temps Réel
 * 
 * Affiche un chart multi-lignes avec:
 * - Messages, Voice, Reactions (toggleable)
 * - Sélecteur de période (Today/Week/Month/All)
 * - Animations smooth
 * - Responsive mobile
 */
@Component({
  selector: 'app-activity-timeline-widget',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectButtonModule,
    CheckboxModule,
    SkeletonModule,
    ChartModule,
  ],
  template: `
    <div class="card">
      <!-- Header avec titre et contrôles -->
      <div class="flex flex-col gap-4 mb-6">
        <!-- Ligne 1: Titre + Sélecteur période -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0">
              Activity Timeline
            </h2>
            <p class="text-muted-color text-sm mt-1">
              Real-time activity across all metrics
            </p>
          </div>
          
          <p-selectButton
            [options]="periodOptions"
            [(ngModel)]="selectedPeriod"
            (onChange)="onPeriodChange()"
            optionLabel="label"
            optionValue="value"
            [disabled]="statsFacade.isLoadingTimeline()"
            styleClass="flex-shrink-0"
          />
        </div>

        <!-- Ligne 2: Toggles métriques -->
        <div class="flex flex-wrap gap-4">
          @for (metric of metrics(); track metric.key) {
            <div class="flex items-center gap-2">
              <p-checkbox
                [(ngModel)]="metric.enabled"
                [binary]="true"
                [inputId]="metric.key"
                (onChange)="onMetricToggle()"
              />
              <label 
                [for]="metric.key" 
                class="cursor-pointer select-none font-medium"
                [style.color]="metric.enabled ? metric.color : 'var(--text-color-secondary)'"
              >
                {{ metric.label }}
              </label>
            </div>
          }
        </div>
      </div>

      <!-- Chart -->
      <div class="relative" style="min-height: 300px;">
        @if (statsFacade.isLoadingTimeline()) {
          <!-- Loading skeleton -->
          <div class="space-y-4">
            <p-skeleton width="100%" height="300px" />
          </div>
        } @else if (chartData(); as data) {
          <p-chart
            type="line"
            [data]="data"
            [options]="chartOptions()"
            [style]="{ height: chartHeight() }"
            class="w-full"
          />
        } @else {
          <!-- Empty state -->
          <div class="flex flex-col items-center justify-center py-16 text-muted-color">
            <i class="pi pi-chart-line text-6xl mb-4 opacity-50"></i>
            <p class="text-lg">No activity data available</p>
            <p class="text-sm">Try selecting a different period</p>
          </div>
        }
      </div>

      <!-- Legend info (optional, déjà dans le chart) -->
      @if (!statsFacade.isLoadingTimeline() && chartData()) {
        <div class="mt-4 pt-4 border-t border-surface-border">
          <div class="flex flex-wrap gap-4 text-sm text-muted-color">
            <div class="flex items-center gap-2">
              <i class="pi pi-info-circle"></i>
              <span>Click on legend items to toggle visibility</span>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class ActivityTimelineWidgetComponent implements OnInit, OnDestroy {
  protected readonly statsFacade = inject(StatisticsFacadeService);
  private readonly layoutService = inject(LayoutService);

  private themeSubscription?: Subscription;

  // Options du sélecteur de période
  protected periodOptions: PeriodOption[] = [
    { label: 'Today', value: STATS_PERIODS.TODAY },
    { label: 'Week', value: STATS_PERIODS.WEEK },
    { label: 'Month', value: STATS_PERIODS.MONTH },
    { label: 'All', value: STATS_PERIODS.ALL },
  ];

  // Période sélectionnée
  protected selectedPeriod: StatsPeriod = STATS_PERIODS.WEEK;

  // Métriques avec toggles
  protected metrics = signal<MetricToggle[]>([
    { key: 'messages', label: 'Messages', color: '#3B82F6', enabled: true }, // blue-500
    { key: 'voice', label: 'Voice Minutes', color: '#10B981', enabled: true }, // green-500
    { key: 'reactions', label: 'Reactions', color: '#A855F7', enabled: true }, // purple-500
  ]);

  // Hauteur responsive du chart
  protected chartHeight = computed(() => {
    if (typeof window === 'undefined') return '300px';
    
    // Mobile: plus petit
    if (window.innerWidth < 640) return '250px';
    // Tablet: medium
    if (window.innerWidth < 1024) return '300px';
    // Desktop: plus grand
    return '350px';
  });

  // Données du chart calculées dynamiquement
  protected chartData = computed(() => {
    const timelineResponse = this.statsFacade.timeline();
    if (!timelineResponse?.dataPoints || timelineResponse.dataPoints.length === 0) return null;

    const enabledMetrics = this.metrics().filter(m => m.enabled);
    if (enabledMetrics.length === 0) return null;

    const timeline = timelineResponse.dataPoints;

    // Formater les labels selon la période
    const labels = timeline.map(point => this.formatDateLabel(point.date));

    // Créer les datasets pour chaque métrique activée
    const datasets = enabledMetrics.map(metric => ({
      label: metric.label,
      data: timeline.map(point => {
        switch (metric.key) {
          case 'messages':
            return point.messages;
          case 'voice':
            return point.voice;
          case 'reactions':
            return point.reactions;
          default:
            return 0;
        }
      }),
      borderColor: metric.color,
      backgroundColor: metric.color + '33', // 20% opacity
      tension: 0.4, // Courbes smooth
      fill: true,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: metric.color,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    }));

    return { labels, datasets };
  });

  // Options du chart (dynamiques selon le thème)
  protected chartOptions = computed(() => {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    return {
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            color: textColor,
            usePointStyle: true,
            padding: 15,
            font: {
              size: 13,
              weight: '500',
            },
          },
        },
        tooltip: {
          backgroundColor: documentStyle.getPropertyValue('--surface-overlay'),
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: surfaceBorder,
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: (context: any) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              
              // Format selon le type de métrique
              if (label.includes('Voice')) {
                return `${label}: ${this.formatDuration(value)}`;
              }
              return `${label}: ${this.formatNumber(value)}`;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          ticks: {
            color: textColorSecondary,
            font: {
              size: 12,
            },
            maxRotation: 45,
            minRotation: 0,
          },
          grid: {
            display: false,
          },
        },
        y: {
          display: true,
          ticks: {
            color: textColorSecondary,
            font: {
              size: 12,
            },
            callback: (value: any) => {
              // Formatter les valeurs de l'axe Y
              if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'k';
              }
              return value;
            },
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
          },
          beginAtZero: true,
        },
      },
      animation: {
        duration: 750,
        easing: 'easeInOutQuart' as const,
      },
    };
  });

  async ngOnInit(): Promise<void> {
    // Charger les données timeline
    await this.loadTimeline();

    // S'abonner aux changements de thème pour mettre à jour les couleurs
    this.themeSubscription = this.layoutService.configUpdate$
      .pipe(debounceTime(25))
      .subscribe(() => {
        // Le computed chartOptions() se mettra à jour automatiquement
      });
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
  }

  /**
   * Charge les données timeline
   */
  private async loadTimeline(): Promise<void> {
    try {
      await this.statsFacade.loadTimeline(
        undefined, // guildId (auto depuis le contexte)
        { period: this.selectedPeriod }
      );
    } catch (error) {
      console.error('[ActivityTimelineWidget] Failed to load timeline:', error);
    }
  }

  /**
   * Handler quand la période change
   */
  protected async onPeriodChange(): Promise<void> {
    console.log('[ActivityTimelineWidget] Period changed to:', this.selectedPeriod);
    await this.loadTimeline();
  }

  /**
   * Handler quand une métrique est toggle
   */
  protected onMetricToggle(): void {
    console.log('[ActivityTimelineWidget] Metrics toggled:', this.metrics());
    // Le computed chartData() se mettra à jour automatiquement
  }

  /**
   * Formate un nombre avec séparateurs de milliers
   */
  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  /**
   * Formate une durée en minutes
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
   * Formate un label de date selon la période
   */
  private formatDateLabel(dateString: string): string {
    const date = new Date(dateString);
    
    switch (this.selectedPeriod) {
      case STATS_PERIODS.TODAY:
        // Format: "14:00"
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      
      case STATS_PERIODS.WEEK:
        // Format: "Mon 26"
        return date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          day: 'numeric' 
        });
      
      case STATS_PERIODS.MONTH:
        // Format: "Jan 26"
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      
      case STATS_PERIODS.ALL:
        // Format: "Jan 2025"
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        });
      
      default:
        return date.toLocaleDateString('en-US');
    }
  }
}

