import { Component, OnInit, OnDestroy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';

// Services
import { StatisticsFacadeService } from '@app/services/statistics/statistics-facade.service';
import { GuildFacadeService } from '@app/core/services/guild/guild-facade.service';

// Types
// import { MemberStatsDto } from '@packages/shared-types';

/**
 * Page de statistiques détaillées d'un membre
 * Route: /members/:userId/stats
 */
@Component({
  selector: 'app-member-stats',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    SkeletonModule,
    ChartModule,
    TagModule,
    AvatarModule,
    ProgressBarModule,
    TooltipModule
  ],
  template: `
		<div class="grid">
		<!-- Header avec breadcrumb et actions -->
		<div class="col-span-12">
			<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
			<div class="flex items-center gap-3">
				<p-button
				icon="pi pi-arrow-left"
				[text]="true"
				[rounded]="true"
				(onClick)="navigateBack()"
				pTooltip="Retour à la liste"
				tooltipPosition="bottom"
				/>
				<div>
				<h1 class="font-semibold text-3xl m-0">Statistiques du Membre</h1>
				@if (selectedGuild(); as guild) {
					<p class="text-muted-color text-sm mt-1">{{ guild.name }}</p>
				}
				</div>
			</div>
			<p-button
				icon="pi pi-refresh"
				label="Actualiser"
				[outlined]="true"
				(onClick)="refresh()"
				[loading]="loading()"
			/>
			</div>
		</div>

		<!-- Loading State -->
		@if (loading() && !memberStats()) {
			<div class="col-span-12">
			<div class="card">
				<div class="flex flex-col gap-4">
				<p-skeleton width="100%" height="120px" borderRadius="8px" />
				<div class="grid">
					<div class="col-span-12 md:col-span-3">
					<p-skeleton width="100%" height="100px" borderRadius="8px" />
					</div>
					<div class="col-span-12 md:col-span-3">
					<p-skeleton width="100%" height="100px" borderRadius="8px" />
					</div>
					<div class="col-span-12 md:col-span-3">
					<p-skeleton width="100%" height="100px" borderRadius="8px" />
					</div>
					<div class="col-span-12 md:col-span-3">
					<p-skeleton width="100%" height="100px" borderRadius="8px" />
					</div>
				</div>
				<p-skeleton width="100%" height="300px" borderRadius="8px" />
				</div>
			</div>
			</div>
		}

		<!-- Error State -->
		@if (error() && !loading()) {
			<div class="col-span-12">
			<div class="card">
				<div class="flex flex-col items-center justify-center py-8 gap-4">
				<i class="pi pi-exclamation-triangle text-6xl text-red-500"></i>
				<h3 class="font-semibold text-xl m-0">Erreur de chargement</h3>
				<p class="text-muted-color text-center">{{ error() }}</p>
				<p-button
					label="Réessayer"
					icon="pi pi-refresh"
					(onClick)="refresh()"
				/>
				</div>
			</div>
			</div>
		}

		<!-- Member Stats Content -->
		@if (memberStats(); as stats) {
			<!-- Hero Card - Informations du Membre -->
			<div class="col-span-12">
			<div class="card mb-0">
				<div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
				<!-- Avatar -->
				<p-avatar
					[label]="stats.userId.charAt(0).toUpperCase()"
					size="xlarge"
					shape="circle"
					styleClass="text-4xl"
				/>
				
				<!-- Informations -->
				<div class="flex-1">
					<h2 class="font-semibold text-2xl m-0 mb-2">
					Membre #{{ stats.userId }}
					</h2>
					<div class="flex flex-wrap gap-2">
					@if (stats.rank?.messages) {
						@let badge = getRankBadge(stats.rank?.messages);
						<p-tag
						[value]="badge.text + ' Messages'"
						[severity]="badge.severity"
						[icon]="'pi ' + badge.icon"
						/>
					}
					@if (stats.rank?.voice) {
						@let badge = getRankBadge(stats.rank?.voice);
						<p-tag
						[value]="badge.text + ' Vocal'"
						[severity]="badge.severity"
						[icon]="'pi ' + badge.icon"
						/>
					}
					</div>
				</div>

				<!-- Date d'arrivée -->
				@if (stats.joinedAt) {
					<div class="text-right">
					<div class="text-sm text-muted-color">Membre depuis</div>
					<div class="font-semibold text-lg">
						{{ stats.joinedAt | date:'dd/MM/yyyy' }}
					</div>
					</div>
				}
				</div>
			</div>
			</div>

			<!-- Stats Cards -->
			<div class="col-span-12 md:col-span-6 lg:col-span-3">
			<div class="card mb-0">
				<div class="flex items-center gap-4">
				<div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width:3.5rem;height:3.5rem">
					<i class="pi pi-comments text-blue-500 text-2xl"></i>
				</div>
				<div>
					<span class="block text-muted-color font-medium mb-1">Messages</span>
					<div class="font-semibold text-2xl">{{ stats.totalMessages }}</div>
					@if (stats.lastMessageAt) {
					<div class="text-xs text-muted-color mt-1">
						{{ formatRelativeDate(stats.lastMessageAt) }}
					</div>
					}
				</div>
				</div>
			</div>
			</div>

			<div class="col-span-12 md:col-span-6 lg:col-span-3">
			<div class="card mb-0">
				<div class="flex items-center gap-4">
				<div class="flex items-center justify-center bg-green-100 dark:bg-green-400/10 rounded-border" style="width:3.5rem;height:3.5rem">
					<i class="pi pi-microphone text-green-500 text-2xl"></i>
				</div>
				<div>
					<span class="block text-muted-color font-medium mb-1">Vocal</span>
					<div class="font-semibold text-2xl">{{ stats.totalVoiceMinutes }}</div>
					<div class="text-xs text-muted-color">minutes</div>
					@if (stats.lastVoiceAt) {
					<div class="text-xs text-muted-color mt-1">
						{{ formatRelativeDate(stats.lastVoiceAt) }}
					</div>
					}
				</div>
				</div>
			</div>
			</div>

			<div class="col-span-12 md:col-span-6 lg:col-span-3">
			<div class="card mb-0">
				<div class="flex items-center gap-4">
				<div class="flex items-center justify-center bg-pink-100 dark:bg-pink-400/10 rounded-border" style="width:3.5rem;height:3.5rem">
					<i class="pi pi-heart text-pink-500 text-2xl"></i>
				</div>
				<div class="flex-1">
					<span class="block text-muted-color font-medium mb-1">Réactions</span>
					<div class="flex gap-3 items-baseline">
					<div>
						<div class="font-semibold text-xl">{{ stats.totalReactionsGiven }}</div>
						<div class="text-xs text-muted-color">Données</div>
					</div>
					<div class="text-muted-color">/</div>
					<div>
						<div class="font-semibold text-xl">{{ stats.totalReactionsReceived }}</div>
						<div class="text-xs text-muted-color">Reçues</div>
					</div>
					</div>
				</div>
				</div>
			</div>
			</div>

			<div class="col-span-12 md:col-span-6 lg:col-span-3">
			<div class="card mb-0">
				<div class="flex items-center gap-4">
				<div class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-border" style="width:3.5rem;height:3.5rem">
					<i class="pi pi-clock text-orange-500 text-2xl"></i>
				</div>
				<div>
					<span class="block text-muted-color font-medium mb-1">Dernière activité</span>
					<div class="font-semibold text-lg">
					{{ formatRelativeDate(stats.lastSeen) }}
					</div>
				</div>
				</div>
			</div>
			</div>

			<!-- Charts Section -->
			<div class="col-span-12 lg:col-span-6">
			<div class="card">
				<div class="font-semibold text-xl mb-4">Activité Messages</div>
				<p class="text-muted-color text-sm mb-4">Évolution des messages envoyés sur les 7 derniers jours</p>
				@if (messageChartData()) {
				<p-chart
					type="line"
					[data]="messageChartData()"
					[options]="chartOptions"
					[style]="{ height: '300px' }"
				/>
				}
			</div>
			</div>

			<div class="col-span-12 lg:col-span-6">
			<div class="card">
				<div class="font-semibold text-xl mb-4">Activité Vocale</div>
				<p class="text-muted-color text-sm mb-4">Minutes passées en vocal sur les 7 derniers jours</p>
				@if (voiceChartData()) {
				<p-chart
					type="line"
					[data]="voiceChartData()"
					[options]="chartOptions"
					[style]="{ height: '300px' }"
				/>
				}
			</div>
			</div>

			<!-- Comparison Section -->
			<div class="col-span-12">
			<div class="card">
				<div class="font-semibold text-xl mb-4">Comparaison avec la Moyenne du Serveur</div>
				<p class="text-muted-color text-sm mb-4">Performance par rapport aux autres membres actifs</p>

				@if (comparisonData(); as comparison) {
				<div class="grid">
					<!-- Messages Comparison -->
					<div class="col-span-12 md:col-span-4">
					<div class="p-4 bg-blue-50 dark:bg-blue-400/10 rounded-border">
						<div class="flex justify-between items-center mb-3">
						<span class="font-semibold">Messages</span>
						<p-tag 
							[value]="comparison.messages.percentage + '%'" 
							[severity]="comparison.messages.percentage >= 100 ? 'success' : 'secondary'"
						/>
						</div>
						<p-progressBar
						[value]="comparison.messages.percentage > 200 ? 200 : comparison.messages.percentage"
						[showValue]="false"
						styleClass="mb-3"
						[style]="{ height: '8px' }"
						/>
						<div class="flex justify-between text-sm">
						<span class="text-muted-color">Vous: <strong class="text-color">{{ comparison.messages.user }}</strong></span>
						<span class="text-muted-color">Moy: <strong class="text-color">{{ comparison.messages.average }}</strong></span>
						</div>
					</div>
					</div>

					<!-- Voice Comparison -->
					<div class="col-span-12 md:col-span-4">
					<div class="p-4 bg-green-50 dark:bg-green-400/10 rounded-border">
						<div class="flex justify-between items-center mb-3">
						<span class="font-semibold">Minutes Vocales</span>
						<p-tag 
							[value]="comparison.voice.percentage + '%'" 
							[severity]="comparison.voice.percentage >= 100 ? 'success' : 'secondary'"
						/>
						</div>
						<p-progressBar
						[value]="comparison.voice.percentage > 200 ? 200 : comparison.voice.percentage"
						[showValue]="false"
						styleClass="mb-3"
						[style]="{ height: '8px' }"
						/>
						<div class="flex justify-between text-sm">
						<span class="text-muted-color">Vous: <strong class="text-color">{{ comparison.voice.user }}</strong></span>
						<span class="text-muted-color">Moy: <strong class="text-color">{{ comparison.voice.average }}</strong></span>
						</div>
					</div>
					</div>

					<!-- Reactions Comparison -->
					<div class="col-span-12 md:col-span-4">
					<div class="p-4 bg-pink-50 dark:bg-pink-400/10 rounded-border">
						<div class="flex justify-between items-center mb-3">
						<span class="font-semibold">Réactions</span>
						<p-tag 
							[value]="comparison.reactions.percentage + '%'" 
							[severity]="comparison.reactions.percentage >= 100 ? 'success' : 'secondary'"
						/>
						</div>
						<p-progressBar
						[value]="comparison.reactions.percentage > 200 ? 200 : comparison.reactions.percentage"
						[showValue]="false"
						styleClass="mb-3"
						[style]="{ height: '8px' }"
						/>
						<div class="flex justify-between text-sm">
						<span class="text-muted-color">Vous: <strong class="text-color">{{ comparison.reactions.user }}</strong></span>
						<span class="text-muted-color">Moy: <strong class="text-color">{{ comparison.reactions.average }}</strong></span>
						</div>
					</div>
					</div>
				</div>
				}
			</div>
			</div>
		}
		</div>
		`
})
export class MemberStatsComponent implements OnInit, OnDestroy {
  // Services injectés
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly statsFacade = inject(StatisticsFacadeService);
  private readonly guildFacade = inject(GuildFacadeService);

  // Destruction
  private readonly destroy$ = new Subject<void>();

  // Données
  readonly memberStats = this.statsFacade.selectedMemberStats;
  readonly loading = this.statsFacade.isLoadingMembers;
  readonly error = this.statsFacade.error;
  readonly selectedGuild = this.guildFacade.selectedGuild;

  // ID du membre depuis l'URL
  readonly userId = signal<string | null>(null);

  // Période sélectionnée (pour future implémentation)
  readonly selectedPeriod = signal<string>('week');

  // Charts data
  readonly messageChartData = computed(() => this.buildMessageChartData());
  readonly voiceChartData = computed(() => this.buildVoiceChartData());
  readonly comparisonData = computed(() => this.buildComparisonData());

  // Chart options PrimeNG
  readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  ngOnInit(): void {
    // Récupérer l'ID du membre depuis l'URL
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const memberId = params.get('userId');
        if (memberId) {
          this.userId.set(memberId);
          this.loadMemberStats(memberId);
        } else {
          this.navigateBack();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charge les statistiques du membre
   */
  async loadMemberStats(userId: string): Promise<void> {
    try {
      await this.statsFacade.loadMemberStatsById(userId);
    } catch (error) {
      console.error('[MemberStats] Erreur chargement stats:', error);
    }
  }

  /**
   * Rafraîchit les données
   */
  async refresh(): Promise<void> {
    const id = this.userId();
    if (id) {
      await this.loadMemberStats(id);
    }
  }

  /**
   * Retour à la liste des membres
   */
  navigateBack(): void {
    this.router.navigate(['/members']);
  }

  /**
   * Change la période affichée (pour future implémentation)
   */
  changePeriod(period: string): void {
    this.selectedPeriod.set(period);
    // TODO: Recharger les données avec la nouvelle période
    // await this.statsFacade.loadMemberStatsWithPeriod(userId, period);
  }

  /**
   * Construit les données pour le chart des messages
   * TODO: Récupérer les vraies données temporelles depuis l'API
   */
  private buildMessageChartData(): any {
    const stats = this.memberStats();
    if (!stats) return null;

    // Données mockées pour la démo
    return {
      labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      datasets: [
        {
          label: 'Messages',
          data: [65, 59, 80, 81, 56, 55, 40],
          fill: false,
          borderColor: '#3B82F6',
          backgroundColor: '#3B82F6',
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  }

  /**
   * Construit les données pour le chart vocal
   * TODO: Récupérer les vraies données temporelles depuis l'API
   */
  private buildVoiceChartData(): any {
    const stats = this.memberStats();
    if (!stats) return null;

    // Données mockées pour la démo
    return {
      labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      datasets: [
        {
          label: 'Minutes Vocales',
          data: [28, 48, 40, 19, 86, 27, 90],
          fill: true,
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          borderColor: '#22C55E',
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  }

  /**
   * Construit les données de comparaison avec la moyenne serveur
   * TODO: Récupérer la moyenne du serveur depuis l'API
   */
  private buildComparisonData(): any {
    const stats = this.memberStats();
    if (!stats) return null;

    // Moyenne du serveur (mockée pour la démo)
    const serverAverage = {
      messages: 150,
      voiceMinutes: 60,
      reactions: 30
    };

    return {
      messages: {
        user: stats.totalMessages,
        average: serverAverage.messages,
        percentage: this.calculatePercentage(stats.totalMessages, serverAverage.messages)
      },
      voice: {
        user: stats.totalVoiceMinutes,
        average: serverAverage.voiceMinutes,
        percentage: this.calculatePercentage(stats.totalVoiceMinutes, serverAverage.voiceMinutes)
      },
      reactions: {
        user: stats.totalReactionsGiven,
        average: serverAverage.reactions,
        percentage: this.calculatePercentage(stats.totalReactionsGiven, serverAverage.reactions)
      }
    };
  }

  /**
   * Calcule le pourcentage par rapport à la moyenne
   */
  private calculatePercentage(value: number, average: number): number {
    if (average === 0) return 0;
    return Math.round((value / average) * 100);
  }

  /**
   * Formate une date relative (il y a X heures/jours)
   */
  formatRelativeDate(dateString: string | null): string {
    if (!dateString) return 'Jamais';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'À l\'instant';
    } else if (diffMins < 60) {
      return `Il y a ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 30) {
      return `Il y a ${diffDays}j`;
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  }

  /**
   * Obtient le badge de classement selon le rang
   */
  getRankBadge(rank: number | undefined): { severity: 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'; icon: string; text: string  } {
    if (!rank) return { severity: 'secondary', icon: 'pi-user', text: 'N/A' };

    if (rank === 1) {
      return { severity: 'warn', icon: 'pi-trophy', text: '🥇 1er' };
    } else if (rank === 2) {
      return { severity: 'info', icon: 'pi-trophy', text: '🥈 2ème' };
    } else if (rank === 3) {
      return { severity: 'success', icon: 'pi-trophy', text: '🥉 3ème' };
    } else if (rank <= 10) {
      return { severity: 'secondary', icon: 'pi-star', text: `Top ${rank}` };
    } else {
      return { severity: 'secondary', icon: 'pi-user', text: `#${rank}` };
    }
  }
}