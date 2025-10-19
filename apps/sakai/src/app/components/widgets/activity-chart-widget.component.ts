import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { debounceTime, Subscription } from 'rxjs';
import { LayoutService } from '@app/services/layout.service';
import { StatisticsFacadeService } from '@services/statistics/statistics-facade.service';
import { formatDuration } from '@services/statistics/statistics.models';

/**
 * 📈 Widget affichant le graphique d'activité (line chart)
 * 
 * - 2 lignes : Messages (bleu) et Voice Minutes (orange)
 * - Timeline sur l'axe X
 * - Tooltip interactif
 * - Légende cliquable pour toggle les lignes
 * - Adapté au thème dark
 */
@Component({
  selector: 'app-activity-chart-widget',
  standalone: true,
  imports: [
    CommonModule,
    ChartModule,
    SkeletonModule,
  ],
  template: `
    <div class="col-span-12">
      <div class="card">
        <div class="font-semibold text-xl mb-4">Activity Timeline</div>
        
        @if (statsFacade.isLoadingActivity()) {
          <!-- Loading skeleton -->
          <div class="space-y-4">
            <p-skeleton width="100%" height="300px" />
          </div>
        } @else if (statsFacade.activityTimeline(); as timeline) {
          <!-- Chart -->
          <p-chart 
            type="line" 
            [data]="chartData" 
            [options]="chartOptions"
            class="h-[300px]"
          />
        } @else {
          <!-- État vide -->
          <div class="flex items-center justify-center h-[300px] text-muted-color">
            <div class="text-center">
              <i class="pi pi-chart-line text-4xl mb-4"></i>
              <p>No activity data available</p>
            </div>
          </div>
        }

        @if (statsFacade.error(); as error) {
          <div class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p class="text-red-700 dark:text-red-400 text-sm">
              <i class="pi pi-exclamation-triangle mr-2"></i>
              {{ error }}
            </p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class ActivityChartWidgetComponent implements OnInit, OnDestroy {
  protected readonly statsFacade = inject(StatisticsFacadeService);
  private readonly layoutService = inject(LayoutService);

  protected chartData: any;
  protected chartOptions: any;

  private subscription!: Subscription;

  ngOnInit(): void {
    // Initialiser le chart
    this.initChart();

    // Charger les données (utilise la période du dashboard)
    this.loadActivityData();

    // S'abonner aux changements de thème pour mettre à jour les couleurs du chart
    // IMPORTANT: Doit être après l'initialisation pour forcer le re-render
    this.subscription = this.layoutService.configUpdate$
      .pipe(debounceTime(25))
      .subscribe(() => {
        // Forcer la re-création complète du chart avec les nouvelles couleurs
        this.initChart();
      });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  /**
   * Initialise ou met à jour la configuration du chart
   */
  private initChart(): void {
    const timeline = this.statsFacade.activityTimeline();
    
    if (!timeline) {
      return;
    }

    // Récupérer les couleurs du thème
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    // Préparer les labels (dates formatées)
    const labels = timeline.dataPoints.map(point => {
      const date = new Date(point.timestamp);
      
      // Format selon la granularité
      if (timeline.granularity === 'hour') {
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else if (timeline.granularity === 'day') {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      }
    });

    // Données des messages
    const messagesData = timeline.dataPoints.map(point => point.totalMessages);

    // Données du temps vocal (en minutes)
    const voiceData = timeline.dataPoints.map(point => point.totalVoiceMinutes);

    // Configuration des datasets
    this.chartData = {
      labels: labels,
      datasets: [
        {
          label: 'Messages',
          data: messagesData,
          fill: false,
          backgroundColor: documentStyle.getPropertyValue('--p-blue-500'),
          borderColor: documentStyle.getPropertyValue('--p-blue-500'),
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
        {
          label: 'Voice Minutes',
          data: voiceData,
          fill: false,
          backgroundColor: documentStyle.getPropertyValue('--p-orange-500'),
          borderColor: documentStyle.getPropertyValue('--p-orange-500'),
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2,
        }
      ]
    };

    // Options du chart
    this.chartOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.8,
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          labels: {
            color: textColor,
            usePointStyle: true,
            padding: 15,
          },
          position: 'top',
          align: 'end',
        },
        tooltip: {
          backgroundColor: documentStyle.getPropertyValue('--surface-card'),
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: surfaceBorder,
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            // Formatter personnalisé pour le tooltip
            label: (context: any) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              
              // Formatter différemment selon le dataset
              if (label === 'Voice Minutes') {
                return `${label}: ${formatDuration(value)}`;
              }
              
              return `${label}: ${value.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary,
            maxRotation: 45,
            minRotation: 0,
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
            lineWidth: 1,
          }
        },
        y: {
          ticks: {
            color: textColorSecondary,
            callback: function(value: any) {
              // Formatter les nombres avec des k pour les milliers
              if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'k';
              }
              return value;
            }
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
            lineWidth: 1,
          }
        }
      }
    };
  }

  /**
   * Charge les données d'activité
   */
  private async loadActivityData(): Promise<void> {
    try {
      // Récupérer la période actuelle du dashboard
      const currentPeriod = this.statsFacade.currentPeriod();
      
      // Déterminer la granularité selon la période
      let granularity: 'hour' | 'day' | 'week' = 'day';
      
      if (currentPeriod === 'today') {
        granularity = 'hour';
      } else if (currentPeriod === 'week' || currentPeriod === 'month') {
        granularity = 'day';
      } else {
        granularity = 'week';
      }

      // Charger les données
      await this.statsFacade.loadActivityTimeline({
        period: currentPeriod,
        granularity: granularity
      });

      // Re-initialiser le chart avec les nouvelles données
      this.initChart();
      
    } catch (error) {
      console.error('[ActivityChartWidget] Failed to load activity data:', error);
    }
  }
}