// apps/sakai/src/app/services/statistics/statistics-facade.service.ts
import { Injectable, inject, effect } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StatisticsApiService } from './statistics-api.service';
import { StatisticsDataService } from './statistics-data.service';
import { GuildFacadeService } from '../guild/guild-facade.service';
import { ErrorHandlerService } from '../error-handler.service';
import {
  StatsPeriod,
  StatsMetricType,
  StatsSortBy,
  StatsSortOrder,
  STATS_PERIODS,
} from './statistics.types';

/**
 * Service Facade pour les statistiques
 * Interface publique pour les composants
 * 
 * Responsabilités:
 * - Auto-loading au changement de serveur
 * - Orchestration entre API et Data services
 * - Gestion du cache
 * - Méthodes publiques pour les components
 */
@Injectable({
  providedIn: 'root'
})
export class StatisticsFacadeService {
  private readonly statsApi = inject(StatisticsApiService);
  private readonly statsData = inject(StatisticsDataService);
  private readonly guildFacade = inject(GuildFacadeService);
  private readonly errorHandler = inject(ErrorHandlerService);

  // ============================================
  // EXPOSITION DES SIGNALS PUBLICS
  // ============================================

  readonly guildStats = this.statsData.guildStats;
  readonly memberStats = this.statsData.memberStats;
  readonly membersList = this.statsData.membersList;
  readonly rankings = this.statsData.rankings;
  readonly timeline = this.statsData.timeline;

  readonly isLoadingGuildStats = this.statsData.isLoadingGuildStats;
  readonly isLoadingMemberStats = this.statsData.isLoadingMemberStats;
  readonly isLoadingMembersList = this.statsData.isLoadingMembersList;
  readonly isLoadingRankings = this.statsData.isLoadingRankings;
  readonly isLoadingTimeline = this.statsData.isLoadingTimeline;

  readonly error = this.statsData.error;

  readonly hasGuildStats = this.statsData.hasGuildStats;
  readonly hasRankings = this.statsData.hasRankings;
  readonly members = this.statsData.members;
  readonly pagination = this.statsData.pagination;
  readonly topThree = this.statsData.topThree;
  readonly remainingRankings = this.statsData.remainingRankings;

  // ============================================
  // CONSTRUCTOR - AUTO-LOADING
  // ============================================

  constructor() {
    // Écouter les changements de serveur pour auto-loading
    effect(() => {
      const guildId = this.guildFacade.selectedGuildId();
      
      if (guildId) {
        // Essayer de charger depuis le cache
        const fromCache = this.statsData.loadFromCache(guildId);
        
        if (fromCache) {
          console.log('[StatsFacade] Stats chargées depuis le cache');
        } else {
          // Pas en cache, charger depuis l'API
          console.log('[StatsFacade] Chargement des stats depuis l\'API');
          this.loadAllStats(guildId).catch(err => {
            console.error('[StatsFacade] Erreur auto-loading:', err);
          });
        }
      } else {
        // Pas de serveur sélectionné, clear
        this.statsData.clearAll();
      }
    });
  }

  // ============================================
  // CHARGEMENT DES STATS
  // ============================================

  /**
   * Charge toutes les stats principales d'une guild
   * Appelé automatiquement au changement de serveur
   */
  async loadAllStats(guildId?: string, forceRefresh: boolean = false): Promise<void> {
    const targetGuildId = guildId || this.guildFacade.selectedGuildId();
    
    if (!targetGuildId) {
      throw new Error('Aucune guild sélectionnée');
    }

    // Si pas de force refresh, vérifier le cache
    if (!forceRefresh) {
      const fromCache = this.statsData.loadFromCache(targetGuildId);
      if (fromCache) {
        console.log('[StatsFacade] Utilisé le cache');
        return;
      }
    }

    try {
      this.statsData.setError(null);

      // Charger en parallèle les stats principales
      await Promise.all([
        this.loadGuildStats(targetGuildId, STATS_PERIODS.WEEK),
        this.loadRankings(targetGuildId),
        this.loadTimeline(targetGuildId),
      ]);

      this.printData();
      // Sauvegarder dans le cache
      this.statsData.saveToCache(targetGuildId);

    } catch (error) {
      const message = this.errorHandler.handleError(error, 'Chargement des statistiques');
      this.statsData.setError(message.message);
      throw error;
    }
  }

  /**
   * Charge les stats dashboard de la guild
   */
  async loadGuildStats(guildId?: string, period: StatsPeriod = '7d'): Promise<void> {
    const targetGuildId = guildId || this.guildFacade.selectedGuildId();
    
    if (!targetGuildId) {
      throw new Error('Aucune guild sélectionnée');
    }

    try {
      this.statsData.setLoadingGuildStats(true);
      this.statsData.setError(null);

      const stats = await firstValueFrom(
        this.statsApi.getGuildStats(targetGuildId, period)
      );

      this.statsData.setGuildStats(stats);

    } catch (error) {
      const message = this.errorHandler.handleError(error, 'Chargement des stats guild');
      this.statsData.setError(message.message);
      throw error;
    } finally {
      this.statsData.setLoadingGuildStats(false);
    }
  }

  /**
   * Charge les stats d'un membre spécifique
   */
  async loadMemberStats(userId: string, period: StatsPeriod = STATS_PERIODS.MONTH): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    
    if (!guildId) {
      throw new Error('Aucune guild sélectionnée');
    }

    try {
      this.statsData.setLoadingMemberStats(true);
      this.statsData.setError(null);

      const stats = await firstValueFrom(
        this.statsApi.getMemberStats(guildId, userId, period)
      );

      this.statsData.setMemberStats(stats);

    } catch (error) {
      const message = this.errorHandler.handleError(error, 'Chargement des stats membre');
      this.statsData.setError(message.message);
      throw error;
    } finally {
      this.statsData.setLoadingMemberStats(false);
    }
  }

  /**
   * Charge la liste paginée des membres avec leurs stats
   */
  async loadMembersList(options?: {
    page?: number;
    pageSize?: number;
    sortBy?: StatsSortBy;
    sortOrder?: StatsSortOrder;
    minMessages?: number;
    minVoiceMinutes?: number;
    activeOnly?: boolean;
  }): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    
    if (!guildId) {
      throw new Error('Aucune guild sélectionnée');
    }

    try {
      this.statsData.setLoadingMembersList(true);
      this.statsData.setError(null);

      const list = await firstValueFrom(
        this.statsApi.getMembersList(guildId, options)
      );

      this.statsData.setMembersList(list);

    } catch (error) {
      const message = this.errorHandler.handleError(error, 'Chargement de la liste des membres');
      this.statsData.setError(message.message);
      throw error;
    } finally {
      this.statsData.setLoadingMembersList(false);
    }
  }

  /**
   * Charge le leaderboard
   */
  async loadRankings(guildId?: string, options?: {
    metric?: StatsMetricType;
    period?: StatsPeriod;
    limit?: number;
  }): Promise<void> {
    const targetGuildId = guildId || this.guildFacade.selectedGuildId();
    
    if (!targetGuildId) {
      throw new Error('Aucune guild sélectionnée');
    }

    try {
      this.statsData.setLoadingRankings(true);
      this.statsData.setError(null);

      const rankings = await firstValueFrom(
        this.statsApi.getRankings(targetGuildId, options)
      );

      this.statsData.setRankings(rankings);

    } catch (error) {
      const message = this.errorHandler.handleError(error, 'Chargement du leaderboard');
      this.statsData.setError(message.message);
      throw error;
    } finally {
      this.statsData.setLoadingRankings(false);
    }
  }

  /**
   * Charge la timeline d'activité
   */
  async loadTimeline(guildId?: string, options?: {
    period?: StatsPeriod;
    metrics?: StatsMetricType[];
    userId?: string;
  }): Promise<void> {
    const targetGuildId = guildId || this.guildFacade.selectedGuildId();
    
    if (!targetGuildId) {
      throw new Error('Aucune guild sélectionnée');
    }

    try {
      this.statsData.setLoadingTimeline(true);
      this.statsData.setError(null);

      const timeline = await firstValueFrom(
        this.statsApi.getTimeline(targetGuildId, options)
      );

      this.statsData.setTimeline(timeline);

    } catch (error) {
      const message = this.errorHandler.handleError(error, 'Chargement de la timeline');
      this.statsData.setError(message.message);
      throw error;
    } finally {
      this.statsData.setLoadingTimeline(false);
    }
  }

  // ============================================
  // UTILITAIRES
  // ============================================

  /**
   * Rafraîchit toutes les données (force reload)
   */
  async refresh(): Promise<void> {
    const guildId = this.guildFacade.selectedGuildId();
    if (guildId) {
      this.statsData.invalidateCache(guildId);
      await this.loadAllStats(guildId, true);
    }
  }

  /**
   * Invalide le cache pour forcer un rechargement au prochain accès
   */
  invalidateCache(): void {
    const guildId = this.guildFacade.selectedGuildId();
    if (guildId) {
      this.statsData.invalidateCache(guildId);
    }
  }


  printData(): void {
    console.log(`[Statistics Facade]:`);
    console.log(`guildStats: ${JSON.stringify(this.guildStats())}`);
    console.log(`memberStats: ${JSON.stringify(this.memberStats())}`);
    console.log(`membersList: ${JSON.stringify(this.membersList())}`);
    console.log(`rankings: ${JSON.stringify(this.rankings())}`);
    console.log(`timeline: ${JSON.stringify(this.timeline())}`);
    console.log(`members: ${JSON.stringify(this.members())}`);
    console.log(`pagination: ${JSON.stringify(this.pagination())}`);
    console.log(`topThree: ${JSON.stringify(this.topThree())}`);
    console.log(`remainingRankings: ${JSON.stringify(this.remainingRankings())}`);
  }
}