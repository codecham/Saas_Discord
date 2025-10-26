import { Component, inject, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { debounceTime, Subscription } from 'rxjs';
import { StatisticsFacadeService } from '@services/statistics/statistics-facade.service';
import { LayoutService } from '@services/layout.service';
import { STATS_PERIODS, type StatsPeriod } from '@services/statistics/statistics.types';

interface PeriodOption {
  label: string;
  value: StatsPeriod;
}

interface MetricOption {
  label: string;
  value: 'all' | 'messages' | 'voice' | 'reactions';
}

interface HeatmapCell {
  day: number; // 0-6 (Lun-Dim)
  hour: number; // 0-23
  value: number;
  label: string;
  tooltip: string;
  color: string;
}

/**
 * 🔥 Widget Heatmap d'Activité (GitHub-style)
 * 
 * Affiche une heatmap 7 jours × 24 heures avec:
 * - Gradient de couleurs selon intensité
 * - Sélecteur de période (Today/Week/Month)
 * - Toggle métrique (All/Messages/Voice/Reactions)
 * - Tooltip détaillé au hover
 * - Responsive mobile
 */
@Component({
  selector: 'app-activity-heatmap-widget',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectButtonModule,
    SkeletonModule,
    TooltipModule,
  ],
  template: `
    <div class="card">
      <!-- Header -->
      <div class="flex flex-col gap-4 mb-6">
        <!-- Ligne 1: Titre + Contrôles -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0">
              Activity Heatmap
            </h2>
            <p class="text-muted-color text-sm mt-1">
              Hourly activity pattern over time
            </p>
          </div>
          
          <div class="flex flex-col sm:flex-row gap-3">
            <!-- Sélecteur métrique -->
            <p-selectButton
              [options]="metricOptions"
              [(ngModel)]="selectedMetric"
              (onChange)="onMetricChange()"
              optionLabel="label"
              optionValue="value"
              [disabled]="statsFacade.isLoadingTimeline()"
              styleClass="flex-shrink-0"
            />
            
            <!-- Sélecteur période -->
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
        </div>
      </div>

      <!-- Heatmap -->
      <div class="relative overflow-x-auto">
        @if (statsFacade.isLoadingTimeline()) {
          <!-- Loading skeleton -->
          <div class="space-y-2">
            @for (i of [0,1,2,3,4,5,6]; track i) {
              <p-skeleton width="100%" height="24px" />
            }
          </div>
        } @else if (heatmapData(); as data) {
          <div class="flex flex-col gap-1 min-w-max">
            <!-- Header avec les heures -->
            <div class="flex items-center gap-1 ml-12">
              @for (hour of hours; track hour) {
                <div class="w-6 h-6 flex items-center justify-center text-xs text-muted-color">
                  {{ hour % 3 === 0 ? hour : '' }}
                </div>
              }
            </div>

            <!-- Lignes pour chaque jour -->
            @for (day of days; track day.index) {
              <div class="flex items-center gap-1">
                <!-- Label du jour -->
                <div class="w-10 text-right text-sm text-muted-color font-medium">
                  {{ day.label }}
                </div>
                
                <!-- Cellules de la heatmap -->
                @for (hour of hours; track hour) {
                  @if (getCellData(day.index, hour); as cell) {
                    <div
                      class="w-6 h-6 rounded-sm cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-primary hover:scale-110"
                      [style.backgroundColor]="cell.color"
                      [pTooltip]="cell.tooltip"
                      tooltipPosition="top"
                    ></div>
                  }
                }
              </div>
            }
          </div>

          <!-- Légende -->
          <div class="flex items-center justify-between mt-6 pt-6 border-t border-surface-border">
            <div class="text-sm text-muted-color">
              <span class="font-medium">{{ getMetricLabel() }}</span> activity intensity
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted-color">Less</span>
              @for (color of legendColors(); track color) {
                <div 
                  class="w-4 h-4 rounded-sm"
                  [style.backgroundColor]="color"
                ></div>
              }
              <span class="text-xs text-muted-color">More</span>
            </div>
          </div>
        } @else {
          <!-- Empty state -->
          <div class="flex flex-col items-center justify-center py-16 text-muted-color">
            <i class="pi pi-table text-6xl mb-4 opacity-50"></i>
            <p class="text-lg">No activity data available</p>
            <p class="text-sm">Try selecting a different period</p>
          </div>
        }
      </div>
    </div>
  `
})
export class ActivityHeatmapWidgetComponent implements OnInit, OnDestroy {
  protected readonly statsFacade = inject(StatisticsFacadeService);
  private readonly layoutService = inject(LayoutService);

  private themeSubscription?: Subscription;

  // Options du sélecteur de période
  protected periodOptions: PeriodOption[] = [
    { label: 'Today', value: STATS_PERIODS.TODAY },
    { label: 'Week', value: STATS_PERIODS.WEEK },
    { label: 'Month', value: STATS_PERIODS.MONTH },
  ];

  // Options du sélecteur de métrique
  protected metricOptions: MetricOption[] = [
    { label: 'All', value: 'all' },
    { label: 'Messages', value: 'messages' },
    { label: 'Voice', value: 'voice' },
    { label: 'Reactions', value: 'reactions' },
  ];

  // Période sélectionnée
  protected selectedPeriod: StatsPeriod = STATS_PERIODS.WEEK;

  // Métrique sélectionnée
  protected selectedMetric: 'all' | 'messages' | 'voice' | 'reactions' = 'all';

  // Jours de la semaine
  protected days = [
    { index: 1, label: 'Mon' },
    { index: 2, label: 'Tue' },
    { index: 3, label: 'Wed' },
    { index: 4, label: 'Thu' },
    { index: 5, label: 'Fri' },
    { index: 6, label: 'Sat' },
    { index: 0, label: 'Sun' },
  ];

  // Heures (0-23)
  protected hours = Array.from({ length: 24 }, (_, i) => i);

  // Couleurs de la légende (du plus clair au plus foncé)
  protected legendColors = computed(() => {
    const isDark = this.isDarkMode();
    return this.getColorScale(isDark);
  });

  // Données de la heatmap
  protected heatmapData = computed(() => {
    const timelineResponse = this.statsFacade.timeline();
    if (!timelineResponse?.dataPoints || timelineResponse.dataPoints.length === 0) {
      return null;
    }

    // Créer une matrice [jour][heure] -> valeur
    const matrix = new Map<string, number>();
    let maxValue = 0;

    timelineResponse.dataPoints.forEach(point => {
      const date = new Date(point.date);
      const day = date.getDay(); // 0-6 (Dim-Sam)
      const hour = date.getHours();

      // Calculer la valeur selon la métrique sélectionnée
      let value = 0;
      switch (this.selectedMetric) {
        case 'messages':
          value = point.messages;
          break;
        case 'voice':
          value = point.voice;
          break;
        case 'reactions':
          value = point.reactions;
          break;
        case 'all':
          value = point.messages + point.voice + point.reactions;
          break;
      }

      const key = `${day}-${hour}`;
      matrix.set(key, (matrix.get(key) || 0) + value);
      maxValue = Math.max(maxValue, matrix.get(key) || 0);
    });

    return { matrix, maxValue };
  });

  async ngOnInit(): Promise<void> {
    // Charger les données timeline avec granularité horaire
    await this.loadTimeline();

    // S'abonner aux changements de thème
    this.themeSubscription = this.layoutService.configUpdate$
      .pipe(debounceTime(25))
      .subscribe(() => {
        // Force le recalcul des couleurs
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
        undefined,
        { period: this.selectedPeriod }
      );
    } catch (error) {
      console.error('[ActivityHeatmapWidget] Failed to load timeline:', error);
    }
  }

  /**
   * Handler quand la période change
   */
  protected async onPeriodChange(): Promise<void> {
    console.log('[ActivityHeatmapWidget] Period changed to:', this.selectedPeriod);
    await this.loadTimeline();
  }

  /**
   * Handler quand la métrique change
   */
  protected onMetricChange(): void {
    console.log('[ActivityHeatmapWidget] Metric changed to:', this.selectedMetric);
    // Le computed heatmapData() se mettra à jour automatiquement
  }

  /**
   * Récupère les données d'une cellule de la heatmap
   */
  protected getCellData(day: number, hour: number): HeatmapCell | null {
    const data = this.heatmapData();
    if (!data) return null;

    const key = `${day}-${hour}`;
    const value = data.matrix.get(key) || 0;

    // Calculer l'intensité (0-1)
    const intensity = data.maxValue > 0 ? value / data.maxValue : 0;

    // Obtenir la couleur selon l'intensité
    const color = this.getColorForIntensity(intensity);

    // Créer le label pour le tooltip
    const dayLabel = this.days.find(d => d.index === day)?.label || '';
    const tooltip = this.createTooltip(dayLabel, hour, value);

    return {
      day,
      hour,
      value,
      label: `${dayLabel} ${hour}:00`,
      tooltip,
      color,
    };
  }

  /**
   * Crée le texte du tooltip
   */
  private createTooltip(day: string, hour: number, value: number): string {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    
    let valueStr = '';
    switch (this.selectedMetric) {
      case 'messages':
        valueStr = `${value} messages`;
        break;
      case 'voice':
        valueStr = `${value} minutes`;
        break;
      case 'reactions':
        valueStr = `${value} reactions`;
        break;
      case 'all':
        valueStr = `${value} total activity`;
        break;
    }

    return `${day} ${timeStr}\n${valueStr}`;
  }

  /**
   * Retourne la couleur pour une intensité donnée (0-1)
   */
  private getColorForIntensity(intensity: number): string {
    const isDark = this.isDarkMode();
    const colors = this.getColorScale(isDark);

    if (intensity === 0) return colors[0];
    if (intensity < 0.25) return colors[1];
    if (intensity < 0.5) return colors[2];
    if (intensity < 0.75) return colors[3];
    return colors[4];
  }

  /**
   * Retourne l'échelle de couleurs selon le thème
   */
  private getColorScale(isDark: boolean): string[] {
    if (isDark) {
      // Dark mode: du gris foncé au bleu vif
      return [
        '#161b22', // Vide
        '#0e4429', // Très faible
        '#006d32', // Faible
        '#26a641', // Moyen
        '#39d353', // Fort
      ];
    } else {
      // Light mode: du gris clair au vert vif
      return [
        '#ebedf0', // Vide
        '#9be9a8', // Très faible
        '#40c463', // Faible
        '#30a14e', // Moyen
        '#216e39', // Fort
      ];
    }
  }

  /**
   * Détecte si le thème est en mode sombre
   */
  private isDarkMode(): boolean {
    if (typeof document === 'undefined') return false;
    
    const html = document.documentElement;
    return html.classList.contains('dark') || 
           html.classList.contains('app-dark');
  }

  /**
   * Retourne le label de la métrique sélectionnée
   */
  protected getMetricLabel(): string {
    const option = this.metricOptions.find(o => o.value === this.selectedMetric);
    return option?.label || 'All';
  }

  /**
   * Formate un nombre avec séparateurs de milliers
   */
  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }
}