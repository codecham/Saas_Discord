import { Component, inject, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { StatisticsFacadeService } from '@services/statistics/statistics-facade.service';
import { STATS_PERIODS, type StatsPeriod } from '@services/statistics/statistics.types';

interface PeriodOption {
  label: string;
  value: StatsPeriod;
}

interface MetricOption {
  label: string;
  value: 'messages' | 'voice' | 'reactions' | 'all';
}

/**
 * 🏆 Widget Podium Top 3 Contributors
 * 
 * Affiche un podium animé avec les 3 meilleurs contributeurs :
 * - Style podium olympique (2nd, 1st, 3rd)
 * - Avatars + médailles
 * - Animations d'entrée en cascade
 * - Sélecteurs période et métrique
 */
@Component({
  selector: 'app-top-contributors-podium-widget',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectButtonModule,
    SkeletonModule,
    AvatarModule,
    TagModule,
  ],
  styles: [`
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-slide-in-1 {
      animation: slideInUp 0.6s ease-out 0.2s both;
    }

    .animate-slide-in-2 {
      animation: slideInUp 0.6s ease-out 0s both;
    }

    .animate-slide-in-3 {
      animation: slideInUp 0.6s ease-out 0.4s both;
    }

    .podium-item:hover {
      transform: translateY(-8px);
    }
  `],
  template: `
    <div class="card">
      <!-- Header -->
      <div class="flex flex-col gap-4 mb-8">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0">
              🏆 Top Contributors
            </h2>
            <p class="text-muted-color text-sm mt-1">
              Hall of fame - Most active members
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
              [disabled]="statsFacade.isLoadingRankings()"
              styleClass="flex-shrink-0"
            />
            
            <!-- Sélecteur période -->
            <p-selectButton
              [options]="periodOptions"
              [(ngModel)]="selectedPeriod"
              (onChange)="onPeriodChange()"
              optionLabel="label"
              optionValue="value"
              [disabled]="statsFacade.isLoadingRankings()"
              styleClass="flex-shrink-0"
            />
          </div>
        </div>
      </div>

      <!-- Podium -->
      @if (statsFacade.isLoadingRankings()) {
        <!-- Loading skeleton -->
        <div class="flex justify-center items-end gap-4 h-96">
          @for (i of [0,1,2]; track i) {
            <div class="flex flex-col items-center gap-4" style="width: 200px;">
              <p-skeleton shape="circle" size="5rem" />
              <p-skeleton width="100%" height="150px" />
              <p-skeleton width="60%" height="1.5rem" />
            </div>
          }
        </div>
      } @else if (topThree(); as top3) {
        @if (top3.length > 0) {
          <!-- Podium avec ordre: 2nd, 1st, 3rd -->
          <div class="flex justify-center items-end gap-2 sm:gap-6 pb-8">
            <!-- 2ème place -->
            @if (top3[1]) {
              <div class="flex flex-col items-center animate-slide-in-2">
                <div class="podium-item flex flex-col items-center gap-3 p-4 transition-all duration-300">
                  <!-- Médaille -->
                  <div class="text-4xl mb-2">🥈</div>
                  
                  <!-- Avatar -->
                  <div class="relative">
                    @if (top3[1].avatar) {
                      <img 
                        [src]="top3[1].avatar" 
                        [alt]="top3[1].username"
                        class="w-20 h-20 rounded-full border-4 border-gray-400 dark:border-gray-500 shadow-lg"
                      />
                    } @else {
                      <p-avatar
                        [label]="getInitials(top3[1].username)"
                        size="xlarge"
                        shape="circle"
                        styleClass="border-4 border-gray-400 dark:border-gray-500"
                      />
                    }
                    <p-tag 
                      value="2" 
                      severity="secondary"
                      styleClass="absolute -top-2 -right-2"
                    />
                  </div>
                  
                  <!-- Nom -->
                  <div class="text-center">
                    <div class="font-semibold text-surface-900 dark:text-surface-0 text-lg">
                      {{ top3[1].username }}
                    </div>
                    <div class="text-muted-color text-sm mt-1">
                      {{ formatScore(top3[1]) }}
                    </div>
                  </div>
                  
                  <!-- Podium base -->
                  <div class="w-32 sm:w-40 h-32 bg-gradient-to-t from-gray-400 to-gray-300 dark:from-gray-600 dark:to-gray-500 rounded-t-lg flex flex-col items-center justify-center shadow-xl">
                    <div class="text-white font-bold text-2xl">#2</div>
                    <div class="text-white text-sm opacity-90">{{ getSecondaryStats(top3[1]) }}</div>
                  </div>
                </div>
              </div>
            }

            <!-- 1ère place (plus haute) -->
            @if (top3[0]) {
              <div class="flex flex-col items-center animate-slide-in-1">
                <div class="podium-item flex flex-col items-center gap-3 p-4 transition-all duration-300">
                  <!-- Couronne -->
                  <div class="text-5xl mb-2">👑</div>
                  
                  <!-- Avatar -->
                  <div class="relative">
                    @if (top3[0].avatar) {
                      <img 
                        [src]="top3[0].avatar" 
                        [alt]="top3[0].username"
                        class="w-24 h-24 rounded-full border-4 border-yellow-400 dark:border-yellow-500 shadow-2xl ring-4 ring-yellow-200 dark:ring-yellow-900"
                      />
                    } @else {
                      <p-avatar
                        [label]="getInitials(top3[0].username)"
                        size="xlarge"
                        shape="circle"
                        styleClass="border-4 border-yellow-400 dark:border-yellow-500 w-24 h-24"
                      />
                    }
                    <p-tag 
                      value="1" 
                      severity="warn"
                      styleClass="absolute -top-2 -right-2"
                    />
                  </div>
                  
                  <!-- Nom -->
                  <div class="text-center">
                    <div class="font-bold text-surface-900 dark:text-surface-0 text-xl">
                      {{ top3[0].username }}
                    </div>
                    <div class="text-muted-color text-sm mt-1">
                      {{ formatScore(top3[0]) }}
                    </div>
                  </div>
                  
                  <!-- Podium base (plus haute) -->
                  <div class="w-32 sm:w-40 h-40 bg-gradient-to-t from-yellow-500 to-yellow-400 dark:from-yellow-600 dark:to-yellow-500 rounded-t-lg flex flex-col items-center justify-center shadow-2xl">
                    <div class="text-white font-bold text-3xl">#1</div>
                    <div class="text-white text-sm opacity-90">{{ getSecondaryStats(top3[0]) }}</div>
                  </div>
                </div>
              </div>
            }

            <!-- 3ème place -->
            @if (top3[2]) {
              <div class="flex flex-col items-center animate-slide-in-3">
                <div class="podium-item flex flex-col items-center gap-3 p-4 transition-all duration-300">
                  <!-- Médaille -->
                  <div class="text-4xl mb-2">🥉</div>
                  
                  <!-- Avatar -->
                  <div class="relative">
                    @if (top3[2].avatar) {
                      <img 
                        [src]="top3[2].avatar" 
                        [alt]="top3[2].username"
                        class="w-20 h-20 rounded-full border-4 border-orange-400 dark:border-orange-500 shadow-lg"
                      />
                    } @else {
                      <p-avatar
                        [label]="getInitials(top3[2].username)"
                        size="xlarge"
                        shape="circle"
                        styleClass="border-4 border-orange-400 dark:border-orange-500"
                      />
                    }
                    <p-tag 
                      value="3" 
                      severity="contrast"
                      styleClass="absolute -top-2 -right-2"
                    />
                  </div>
                  
                  <!-- Nom -->
                  <div class="text-center">
                    <div class="font-semibold text-surface-900 dark:text-surface-0 text-lg">
                      {{ top3[2].username }}
                    </div>
                    <div class="text-muted-color text-sm mt-1">
                      {{ formatScore(top3[2]) }}
                    </div>
                  </div>
                  
                  <!-- Podium base -->
                  <div class="w-32 sm:w-40 h-24 bg-gradient-to-t from-orange-400 to-orange-300 dark:from-orange-600 dark:to-orange-500 rounded-t-lg flex flex-col items-center justify-center shadow-xl">
                    <div class="text-white font-bold text-2xl">#3</div>
                    <div class="text-white text-sm opacity-90">{{ getSecondaryStats(top3[2]) }}</div>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Stats supplémentaires -->
          <div class="mt-8 pt-6 border-t border-surface-border">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              @for (member of top3; track member.userId; let i = $index) {
                <div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                  <div class="text-2xl">{{ getMedalEmoji(i) }}</div>
                  <div class="flex-1">
                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0">
                      {{ member.username }}
                    </div>
                    <div class="text-xs text-muted-color">
                      {{ getDetailedStats(member) }}
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        } @else {
          <!-- Empty state -->
          <div class="flex flex-col items-center justify-center py-16 text-muted-color">
            <i class="pi pi-trophy text-6xl mb-4 opacity-50"></i>
            <p class="text-lg">No rankings available yet</p>
            <p class="text-sm">Activity data will appear here once members start participating</p>
          </div>
        }
      }
    </div>
  `
})
export class TopContributorsPodiumWidgetComponent implements OnInit, OnDestroy {
  protected readonly statsFacade = inject(StatisticsFacadeService);

  // Options du sélecteur de période
  protected periodOptions: PeriodOption[] = [
    { label: 'Today', value: STATS_PERIODS.TODAY },
    { label: 'Week', value: STATS_PERIODS.WEEK },
    { label: 'Month', value: STATS_PERIODS.MONTH },
    { label: 'All', value: STATS_PERIODS.ALL },
  ];

  // Options du sélecteur de métrique
  protected metricOptions: MetricOption[] = [
    { label: 'Overall', value: 'all' },
    { label: 'Messages', value: 'messages' },
    { label: 'Voice', value: 'voice' },
    { label: 'Reactions', value: 'reactions' },
  ];

  // Période sélectionnée
  protected selectedPeriod: StatsPeriod = STATS_PERIODS.WEEK;

  // Métrique sélectionnée
  protected selectedMetric: 'messages' | 'voice' | 'reactions' | 'all' = 'all';

  // Top 3 membres
  protected topThree = computed(() => {
    const rankings = this.statsFacade.rankings();
    if (!rankings || !rankings.entries) return [];
    return rankings.entries.slice(0, 3);
  });

  async ngOnInit(): Promise<void> {
    await this.loadRankings();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  /**
   * Charge les rankings
   */
  private async loadRankings(): Promise<void> {
    try {
      await this.statsFacade.loadRankings(
        undefined,
        {
          metric: this.selectedMetric,
          period: this.selectedPeriod,
          limit: 3,
        }
      );
    } catch (error) {
      console.error('[TopContributorsPodium] Failed to load rankings:', error);
    }
  }

  /**
   * Handler quand la période change
   */
  protected async onPeriodChange(): Promise<void> {
    console.log('[TopContributorsPodium] Period changed to:', this.selectedPeriod);
    await this.loadRankings();
  }

  /**
   * Handler quand la métrique change
   */
  protected async onMetricChange(): Promise<void> {
    console.log('[TopContributorsPodium] Metric changed to:', this.selectedMetric);
    await this.loadRankings();
  }

  /**
   * Récupère les initiales d'un username
   */
  protected getInitials(username: string): string {
    return username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Formate le score principal selon la métrique
   */
  protected formatScore(member: any): string {
    const score = member.score || 0;
    
    switch (this.selectedMetric) {
      case 'messages':
        return `${this.formatNumber(score)} messages`;
      case 'voice':
        return `${this.formatDuration(score)} in voice`;
      case 'reactions':
        return `${this.formatNumber(score)} reactions`;
      case 'all':
        return `${this.formatNumber(score)} total activity`;
      default:
        return `${this.formatNumber(score)}`;
    }
  }

  /**
   * Récupère les stats secondaires (affichées sur le podium)
   */
  protected getSecondaryStats(member: any): string {
    const stats = member.stats;
    if (!stats) return '';

    switch (this.selectedMetric) {
      case 'messages':
        return `${this.formatDuration(stats.voiceMinutes)} voice`;
      case 'voice':
        return `${this.formatNumber(stats.messages)} msgs`;
      case 'reactions':
        return `${this.formatNumber(stats.messages)} msgs`;
      case 'all':
        return `${this.formatNumber(stats.messages)} msgs`;
      default:
        return '';
    }
  }

  /**
   * Récupère les stats détaillées (affichées dans les cards du bas)
   */
  protected getDetailedStats(member: any): string {
    const stats = member.stats;
    if (!stats) return '';

    return `${this.formatNumber(stats.messages)} msgs • ${this.formatDuration(stats.voiceMinutes)} voice • ${this.formatNumber(stats.reactions)} reactions`;
  }

  /**
   * Retourne l'emoji de médaille selon le rang
   */
  protected getMedalEmoji(index: number): string {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '🏅';
    }
  }

  /**
   * Formate un nombre avec séparateurs
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
    
    return `${hours}h${remainingMinutes}m`;
  }
}