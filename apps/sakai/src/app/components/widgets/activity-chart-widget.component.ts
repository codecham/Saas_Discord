import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { StatisticsFacadeService } from '@services/statistics/statistics-facade.service';
import { debounceTime, Subscription } from 'rxjs';
import { LayoutService } from '@services/layout.service';

/**
 * 📈 Widget affichant l'évolution des métriques d'activité
 * 
 * - Messages (ligne bleue)
 * - Voice Minutes (ligne verte)  
 * - Reactions (ligne violette)
 * 
 * Adapté au layout dashboard et responsive mobile
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
      <div class="card mb-0">
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-semibold text-surface-900 dark:text-surface-0">
            Activity Trends
          </h3>
          <div class="flex gap-3 flex-wrap">
            <!-- Légendes -->
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-blue-500"></span>
              <span class="text-sm text-muted-color">Messages</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-green-500"></span>
              <span class="text-sm text-muted-color">Voice (min)</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-purple-500"></span>
              <span class="text-sm text-muted-color">Reactions</span>
            </div>
          </div>
        </div>

        <!-- Chart ou Loading -->
        @if (statsFacade.isLoadingGuildStats()) {
          <p-skeleton width="100%" height="300px" borderRadius="8px" />
        } @else if (statsFacade.guildStats(); as stats) {
          <div class="h-[300px] sm:h-[350px]">
            <p-chart 
              type="line" 
              [data]="chartData" 
              [options]="chartOptions"
              class="h-full"
            />
          </div>
        } @else {
          <div class="flex items-center justify-center h-[300px] text-muted-color">
            <div class="text-center">
              <i class="pi pi-chart-line text-4xl mb-3 opacity-50"></i>
              <p>No activity data available</p>
            </div>
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
  statsFacade = inject(StatisticsFacadeService);
  private layoutService = inject(LayoutService);
  
  chartData: any;
  chartOptions: any;
  
  private subscription?: Subscription;

  ngOnInit() {
    this.initChartData();
    this.initChartOptions();
    
    // Écouter les changements de thème pour mettre à jour les couleurs du chart
    this.subscription = this.layoutService.configUpdate$
      .pipe(debounceTime(200))
      .subscribe(() => {
        this.initChartOptions();
      });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  private initChartData() {
    // Générer des données factices pour la démo
    // TODO: Remplacer par vraies données du backend
    const labels = this.generateLabels();
    
    this.chartData = {
      labels,
      datasets: [
        {
          label: 'Messages',
          data: this.generateMockData(30, 50, 500),
          fill: false,
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f6',
          tension: 0.4,
          borderWidth: 2,
        },
        {
          label: 'Voice Minutes',
          data: this.generateMockData(30, 20, 300),
          fill: false,
          borderColor: '#10b981',
          backgroundColor: '#10b981',
          tension: 0.4,
          borderWidth: 2,
        },
        {
          label: 'Reactions',
          data: this.generateMockData(30, 10, 200),
          fill: false,
          borderColor: '#a855f7',
          backgroundColor: '#a855f7',
          tension: 0.4,
          borderWidth: 2,
        }
      ]
    };
  }

  private initChartOptions() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    this.chartOptions = {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: {
          display: false, // On utilise nos propres légendes dans le header
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: documentStyle.getPropertyValue('--surface-ground'),
          titleColor: textColor,
          bodyColor: textColorSecondary,
          borderColor: surfaceBorder,
          borderWidth: 1,
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary,
            font: {
              size: 12
            }
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false
          }
        },
        y: {
          ticks: {
            color: textColorSecondary,
            font: {
              size: 12
            }
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    };
  }

  private generateLabels(): string[] {
    // Générer les 7 derniers jours
    const labels: string[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    
    return labels;
  }

  private generateMockData(count: number, min: number, max: number): number[] {
    // Générer des données aléatoires pour la démo
    return Array.from({ length: count }, () => 
      Math.floor(Math.random() * (max - min + 1)) + min
    );
  }
}