import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';
import { 
  StatCardColor, 
  StatCardSize, 
  StatCardVariant, 
  StatCardTrend, 
  StatCardSubtitle 
} from './stat-card.types';

/**
 * 📊 Composant StatCard réutilisable
 * 
 * Card de statistique avec icône, titre, valeur et options avancées.
 * Basé sur le design du template Sakai (StatsWidget).
 * 
 * @example
 * ```html
 * <!-- Usage basique -->
 * <app-stat-card
 *   title="Total Membres"
 *   [value]="152"
 *   icon="pi pi-users"
 *   color="blue"
 * />
 * 
 * <!-- Avec subtitle flexible -->
 * <app-stat-card
 *   title="Revenue"
 *   [value]="'$2,100'"
 *   icon="pi pi-dollar"
 *   color="orange"
 *   [subtitle]="{ highlight: '24 new', text: 'since last visit' }"
 * />
 * 
 * <!-- Avec trend indicator -->
 * <app-stat-card
 *   title="Orders"
 *   [value]="152"
 *   icon="pi pi-shopping-cart"
 *   color="blue"
 *   [trend]="{ value: 12, label: 'vs last month' }"
 * />
 * 
 * <!-- Clickable -->
 * <app-stat-card
 *   title="Comments"
 *   [value]="'152 Unread'"
 *   icon="pi pi-comment"
 *   color="purple"
 *   [clickable]="true"
 *   (cardClick)="handleClick()"
 * />
 * 
 * <!-- Loading state -->
 * <app-stat-card
 *   title="Loading..."
 *   [value]="0"
 *   [loading]="true"
 * />
 * ```
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  template: `
    <div 
      class="card mb-0"
      [class.cursor-pointer]="clickable()"
      [class.hover:shadow-md]="clickable()"
      [class.transition-shadow]="clickable()"
      [class.duration-200]="clickable()"
      (click)="handleClick()"
    >
      @if (loading()) {
        <!-- Loading Skeleton -->
        <div class="flex justify-between mb-4">
          <div class="flex-1">
            <p-skeleton width="8rem" height="1rem" styleClass="mb-4" />
            <p-skeleton width="5rem" height="2rem" />
          </div>
          <p-skeleton shape="circle" size="2.5rem" />
        </div>
        <p-skeleton width="10rem" height="1rem" />
      } @else {
        <!-- Content -->
        <div class="flex justify-between mb-4">
          <div [class]="contentWidthClass()">
            <!-- Title -->
            <span class="block text-muted-color font-medium mb-4" [class]="titleSizeClass()">
              {{ title() }}
            </span>

            <!-- Value -->
            <div 
              class="text-surface-900 dark:text-surface-0 font-medium" 
              [class]="valueSizeClass()"
            >
              {{ value() }}
            </div>
          </div>

          <!-- Icon -->
          @if (icon()) {
            <div 
              class="flex items-center justify-center rounded-border"
              [class]="iconContainerClass()"
              [style.width]="iconContainerSize()"
              [style.height]="iconContainerSize()"
            >
              <i [class]="iconClass() + ' ' + iconSizeClass()"></i>
            </div>
          }
        </div>

        <!-- Subtitle or Trend -->
        @if (subtitle() || trend()) {
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Trend Indicator -->
            @if (trend(); as trendData) {
              <div class="flex items-center gap-1" [class]="trendColorClass(trendData)">
                <i [class]="trendIconClass(trendData)"></i>
                <span class="font-medium text-sm">
                  {{ formatTrendValue(trendData.value) }}
                </span>
                @if (trendData.label) {
                  <span class="text-muted-color text-sm">{{ trendData.label }}</span>
                }
              </div>
            }

            <!-- Subtitle -->
            @if (subtitle(); as sub) {
              @if (typeof sub === 'string') {
                <span class="text-muted-color text-sm">{{ sub }}</span>
              } @else {
                <div class="flex items-center gap-1 flex-wrap">
                  @if (sub.highlight) {
                    <span class="text-primary font-medium text-sm">{{ sub.highlight }}</span>
                  }
                  <span class="text-muted-color text-sm">{{ sub.text }}</span>
                </div>
              }
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class StatCardComponent {
  // ========================================
  // Inputs (Required)
  // ========================================
  
  /**
   * Titre de la card
   * @example "Total Membres"
   */
  title = input.required<string>();

  /**
   * Valeur à afficher
   * @example 152 ou "$2,100"
   */
  value = input.required<string | number>();

  // ========================================
  // Inputs (Optional)
  // ========================================

  /**
   * Icône PrimeNG
   * @example "pi pi-users"
   */
  icon = input<string>();

  /**
   * Couleur de l'icône et du badge
   * @default 'blue'
   */
  color = input<StatCardColor>('blue');

  /**
   * Taille du composant
   * @default 'medium'
   */
  size = input<StatCardSize>('medium');

  /**
   * Variant du composant
   * @default 'default'
   */
  variant = input<StatCardVariant>('default');

  /**
   * Subtitle (texte simple ou objet avec highlight)
   * @example "depuis hier"
   * @example { highlight: "24 new", text: "since last visit" }
   */
  subtitle = input<string | StatCardSubtitle>();

  /**
   * Indicateur de trend (+X% depuis X)
   */
  trend = input<StatCardTrend>();

  /**
   * État de chargement (affiche skeleton)
   * @default false
   */
  loading = input<boolean>(false);

  /**
   * Card cliquable (cursor pointer + hover effect)
   * @default false
   */
  clickable = input<boolean>(false);

  // ========================================
  // Outputs
  // ========================================

  /**
   * Émis quand la card est cliquée (si clickable = true)
   */
  cardClick = output<void>();

  // ========================================
  // Computed Styles
  // ========================================

  /**
   * Classes CSS pour le container de l'icône
   */
  protected iconContainerClass = computed(() => {
    const colorMap: Record<StatCardColor, string> = {
      blue: 'bg-blue-100 dark:bg-blue-400/10',
      orange: 'bg-orange-100 dark:bg-orange-400/10',
      cyan: 'bg-cyan-100 dark:bg-cyan-400/10',
      purple: 'bg-purple-100 dark:bg-purple-400/10',
      green: 'bg-green-100 dark:bg-green-400/10',
      red: 'bg-red-100 dark:bg-red-400/10',
      pink: 'bg-pink-100 dark:bg-pink-400/10',
      indigo: 'bg-indigo-100 dark:bg-indigo-400/10'
    };
    return colorMap[this.color()];
  });

  /**
   * Classes CSS pour l'icône
   */
  protected iconClass = computed(() => {
    const colorMap: Record<StatCardColor, string> = {
      blue: 'text-blue-500',
      orange: 'text-orange-500',
      cyan: 'text-cyan-500',
      purple: 'text-purple-500',
      green: 'text-green-500',
      red: 'text-red-500',
      pink: 'text-pink-500',
      indigo: 'text-indigo-500'
    };
    return `${this.icon()} ${colorMap[this.color()]}`;
  });

  /**
   * Taille du container d'icône selon size
   */
  protected iconContainerSize = computed(() => {
    const sizeMap: Record<StatCardSize, string> = {
      small: '2rem',
      medium: '2.5rem',
      large: '3rem'
    };
    return sizeMap[this.size()];
  });

  /**
   * Taille de l'icône selon size
   */
  protected iconSizeClass = computed(() => {
    const sizeMap: Record<StatCardSize, string> = {
      small: 'text-lg',
      medium: 'text-xl',
      large: 'text-2xl'
    };
    return sizeMap[this.size()];
  });

  /**
   * Taille du titre selon size
   */
  protected titleSizeClass = computed(() => {
    const sizeMap: Record<StatCardSize, string> = {
      small: 'text-xs',
      medium: 'text-sm',
      large: 'text-base'
    };
    return sizeMap[this.size()];
  });

  /**
   * Taille de la valeur selon size
   */
  protected valueSizeClass = computed(() => {
    const sizeMap: Record<StatCardSize, string> = {
      small: 'text-lg',
      medium: 'text-xl',
      large: 'text-2xl'
    };
    return sizeMap[this.size()];
  });

  /**
   * Largeur du contenu selon si icon présent
   */
  protected contentWidthClass = computed(() => {
    return this.icon() ? 'flex-1' : 'w-full';
  });

  /**
   * Classe de couleur pour le trend
   */
  protected trendColorClass(trend: StatCardTrend): string {
    const isPositive = trend.value > 0;
    const invert = trend.invertColors ?? false;

    if (isPositive && !invert) return 'text-green-500';
    if (isPositive && invert) return 'text-red-500';
    if (!isPositive && !invert) return 'text-red-500';
    return 'text-green-500';
  }

  /**
   * Icône pour le trend (arrow up/down)
   */
  protected trendIconClass(trend: StatCardTrend): string {
    return trend.value > 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down';
  }

  /**
   * Formate la valeur du trend avec %
   */
  protected formatTrendValue(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}%`;
  }

  /**
   * Type guard pour savoir si subtitle est string
   */
  protected typeof(value: unknown): string {
    return typeof value;
  }

  // ========================================
  // Methods
  // ========================================

  /**
   * Gère le clic sur la card
   */
  protected handleClick(): void {
    if (this.clickable() && !this.loading()) {
      this.cardClick.emit();
    }
  }
}