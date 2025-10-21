import { Component, inject, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { StatisticsFacadeService } from '@services/statistics/statistics-facade.service';
import { MemberFacadeService } from '@services/member/member-facade.service';
import { GuildMemberDTO } from '@my-project/shared-types';
import { 
  formatNumber, 
  formatDuration,
  type LeaderboardDto
} from '@services/statistics/statistics.models';

interface CategoryOption {
  label: string;
  value: 'messages' | 'voice' | 'reactions' | 'overall';
  icon: string;
}

interface LeaderboardEntryWithMember {
  rank: number;
  userId: string;
  score: number;
  totalMessages: number;
  totalVoiceMinutes: number;
  totalReactions: number;
  badge?: 'gold' | 'silver' | 'bronze';
  member?: GuildMemberDTO; // Données enrichies du membre
}

/**
 * 🏆 Widget affichant le leaderboard (top 10 membres)
 * 
 * - Affichage en liste avec ranks
 * - Badges gold/silver/bronze pour le top 3
 * - Avatars Discord réels (via memberFacade)
 * - Noms d'utilisateur réels (displayName)
 * - Stats détaillées (messages, voice, reactions)
 * - Sélecteur de catégorie
 * 
 * Architecture:
 * - Attend que les membres soient chargés avant d'afficher
 * - Utilise getMemberById() pour enrichir chaque entrée
 * - Fallback vers "Unknown User" si membre non trouvé
 */
@Component({
  selector: 'app-leaderboard-widget',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectButtonModule,
    SkeletonModule,
    TagModule,
  ],
  template: `
    <div class="col-span-12 xl:col-span-6">
      <div class="card">
        <!-- Header avec sélecteur de catégorie -->
        <div class="flex justify-between items-center mb-6">
          <div class="font-semibold text-xl mb-4">
            Top Members
          </div>
          
          <p-selectButton
            [options]="categoryOptions"
            [(ngModel)]="selectedCategory"
            (onChange)="onCategoryChange()"
            optionLabel="label"
            optionValue="value"
            [disabled]="isLoading()"
          >
            <ng-template #item let-option>
              <i class="pi" [ngClass]="option.icon"></i>
            </ng-template>
          </p-selectButton>
        </div>

        @if (isLoading()) {
          <!-- Loading skeletons -->
          <div class="space-y-4">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="flex items-center gap-4 p-3 border-b border-surface">
                <p-skeleton shape="circle" size="3rem" />
                <div class="flex-1">
                  <p-skeleton width="60%" styleClass="mb-2" />
                  <p-skeleton width="40%" />
                </div>
              </div>
            }
          </div>
        } @else if (enrichedLeaderboard(); as entries) {
          <!-- Liste du leaderboard enrichie -->
          <ul class="list-none p-0 m-0">
            @for (entry of entries; track entry.userId; let isLast = $last) {
              <li 
                class="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-surface-50 dark:hover:bg-surface-800 rounded-lg cursor-pointer"
                [class.border-b]="!isLast"
                [class.border-surface]="!isLast">
                
                <!-- Rank avec badge -->
                <div class="flex items-center justify-center w-12">
                  @if (entry.badge) {
                    <!-- Badge pour top 3 -->
                    <div 
                      class="flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg"
                      [class]="getBadgeClass(entry.badge)">
                      {{ entry.rank }}
                    </div>
                  } @else {
                    <!-- Rank normal -->
                    <span class="text-xl font-semibold text-muted-color">
                      {{ entry.rank }}
                    </span>
                  }
                </div>

                <!-- Avatar -->
                <div class="relative">
                  <img 
                    [src]="getMemberAvatar(entry)" 
                    [alt]="getMemberDisplayName(entry)"
                    class="w-12 h-12 rounded-full object-cover border-2"
                    [class]="getAvatarBorderClass(entry.badge)"
                    (error)="onAvatarError($event)"
                  />
                  @if (entry.badge) {
                    <div class="absolute -bottom-1 -right-1 text-lg">
                      {{ getBadgeEmoji(entry.badge) }}
                    </div>
                  }
                </div>

                <!-- Username et stats -->
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-surface-900 dark:text-surface-0 truncate mb-1">
                    {{ getMemberDisplayName(entry) }}
                  </div>
                  <div class="flex flex-wrap gap-3 text-sm text-muted-color">
                    <span class="flex items-center gap-1">
                      <i class="pi pi-comments text-blue-500"></i>
                      {{ formatNumber(entry.totalMessages) }}
                    </span>
                    <span class="flex items-center gap-1">
                      <i class="pi pi-microphone text-orange-500"></i>
                      {{ formatDuration(entry.totalVoiceMinutes) }}
                    </span>
                    <span class="flex items-center gap-1">
                      <i class="pi pi-heart text-purple-500"></i>
                      {{ formatNumber(entry.totalReactions) }}
                    </span>
                  </div>
                </div>

                <!-- Score (pour la catégorie sélectionnée) -->
                <div class="text-right">
                  <div class="text-2xl font-bold text-primary">
                    {{ formatScore(entry.score, selectedCategory) }}
                  </div>
                  <div class="text-xs text-muted-color">
                    {{ getCategoryLabel(selectedCategory) }}
                  </div>
                </div>
              </li>
            }
          </ul>

          <!-- Message si leaderboard vide -->
          @if (entries.length === 0) {
            <div class="text-center py-8 text-muted-color">
              <i class="pi pi-users text-4xl mb-4"></i>
              <p>No active members yet</p>
            </div>
          }
        } @else {
          <!-- État vide -->
          <div class="text-center py-8 text-muted-color">
            <i class="pi pi-trophy text-4xl mb-4"></i>
            <p>No leaderboard data available</p>
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
export class LeaderboardWidgetComponent implements OnInit, OnDestroy {
  protected readonly statsFacade = inject(StatisticsFacadeService);
  protected readonly memberFacade = inject(MemberFacadeService);

  // Exposer les helpers au template
  protected readonly formatNumber = formatNumber;
  protected readonly formatDuration = formatDuration;

  // Options du sélecteur de catégorie
  protected categoryOptions: CategoryOption[] = [
    { label: 'Messages', value: 'messages', icon: 'pi-comments' },
    { label: 'Voice', value: 'voice', icon: 'pi-microphone' },
    { label: 'Reactions', value: 'reactions', icon: 'pi-heart' },
    { label: 'Overall', value: 'overall', icon: 'pi-star' },
  ];

  // Catégorie sélectionnée
  protected selectedCategory: 'messages' | 'voice' | 'reactions' | 'overall' = 'messages';

  // ============================================
  // COMPUTED SIGNALS
  // ============================================

  /**
   * Indique si on est en train de charger (leaderboard OU membres)
   */
  protected isLoading = computed(() => {
    return this.statsFacade.isLoadingLeaderboard() || this.memberFacade.isLoading();
  });

  /**
   * Leaderboard enrichi avec les données des membres
   * Attend que les membres soient chargés pour enrichir les données
   */
  protected enrichedLeaderboard = computed<LeaderboardEntryWithMember[]>(() => {
    const leaderboard = this.statsFacade.leaderboard();
    
    // Pas de leaderboard disponible
    if (!leaderboard) {
      return [];
    }

    // Pas de membres chargés, on ne peut pas enrichir
    if (this.memberFacade.isLoading()) {
      return [];
    }

    // Enrichir chaque entrée avec les données du membre
    return leaderboard.entries.map(entry => ({
      ...entry,
      member: this.memberFacade.getMemberById(entry.userId)
    }));
  });

  // ============================================
  // LIFECYCLE HOOKS
  // ============================================

  async ngOnInit(): Promise<void> {
    await this.loadLeaderboard();
  }

  ngOnDestroy(): void {
    // Cleanup si nécessaire
  }

  // ============================================
  // MÉTHODES DE CHARGEMENT
  // ============================================

  /**
   * Charge le leaderboard
   */
  private async loadLeaderboard(): Promise<void> {
    try {
      const currentPeriod = this.statsFacade.currentPeriod();
      
      await this.statsFacade.loadLeaderboard({
        category: this.selectedCategory,
        period: currentPeriod,
        limit: 10
      });
    } catch (error) {
      console.error('[LeaderboardWidget] Failed to load leaderboard:', error);
    }
  }

  /**
   * Handler quand la catégorie change
   */
  protected async onCategoryChange(): Promise<void> {
    console.log('[LeaderboardWidget] Category changed to:', this.selectedCategory);
    await this.loadLeaderboard();
  }

  // ============================================
  // MÉTHODES D'AFFICHAGE DES MEMBRES
  // ============================================

  /**
   * Retourne le displayName du membre (ou fallback)
   */
  protected getMemberDisplayName(entry: LeaderboardEntryWithMember): string {
    if (entry.member) {
      return entry.member.displayName;
    }
    
    // Fallback si membre non trouvé
    return `Unknown User #${entry.userId.slice(-4)}`;
  }

  /**
   * Retourne l'URL de l'avatar du membre (ou fallback)
   */
  protected getMemberAvatar(entry: LeaderboardEntryWithMember): string {
    if (entry.member) {
      // Priorité à l'avatar de guild si disponible
      return entry.member.guildAvatarUrl || entry.member.avatarUrl;
    }
    
    // Fallback vers un avatar par défaut Discord
    return this.getDefaultAvatarUrl(entry.userId);
  }

  /**
   * Génère une URL d'avatar par défaut Discord
   * Utilise le nouveau système (user_id >> 22) % 6
   */
  private getDefaultAvatarUrl(userId: string): string {
    try {
      // Nouveau système Discord: (user_id >> 22) % 6
      const index = Number((BigInt(userId) >> 22n) % 6n);
      return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    } catch {
      // Fallback si conversion échoue
      return `https://cdn.discordapp.com/embed/avatars/0.png`;
    }
  }

  /**
   * Handler pour l'erreur de chargement d'avatar
   */
  protected onAvatarError(event: any): void {
    // Fallback vers un avatar par défaut
    event.target.src = `https://cdn.discordapp.com/embed/avatars/0.png`;
  }

  // ============================================
  // MÉTHODES DE STYLE ET FORMATAGE
  // ============================================

  /**
   * Retourne la classe CSS pour le badge
   */
  protected getBadgeClass(badge: 'gold' | 'silver' | 'bronze'): string {
    const classes = {
      gold: 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg',
      silver: 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-lg',
      bronze: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg',
    };
    return classes[badge];
  }

  /**
   * Retourne la classe CSS pour la bordure de l'avatar
   */
  protected getAvatarBorderClass(badge?: 'gold' | 'silver' | 'bronze'): string {
    if (!badge) return 'border-surface';
    
    const classes = {
      gold: 'border-yellow-400 shadow-md shadow-yellow-400/50',
      silver: 'border-gray-400 shadow-md shadow-gray-400/50',
      bronze: 'border-orange-400 shadow-md shadow-orange-400/50',
    };
    return classes[badge];
  }

  /**
   * Retourne l'emoji du badge
   */
  protected getBadgeEmoji(badge: 'gold' | 'silver' | 'bronze'): string {
    const emojis = {
      gold: '🥇',
      silver: '🥈',
      bronze: '🥉'
    };
    return emojis[badge];
  }

  /**
   * Formate le score selon la catégorie
   */
  protected formatScore(score: number, category: string): string {
    if (category === 'voice') {
      return formatDuration(score);
    }
    return formatNumber(score);
  }

  /**
   * Retourne le label de la catégorie
   */
  protected getCategoryLabel(category: string): string {
    const labels = {
      messages: 'messages',
      voice: 'voice time',
      reactions: 'reactions',
      overall: 'score'
    };
    return labels[category as keyof typeof labels] || category;
  }
}