// apps/sakai/src/app/features/dashboard/dashboard.component.ts

import { Component, inject } from '@angular/core';
import { StatisticsFacadeService } from '@app/services/statistics/statistics-facade.service';
// import { StatsCardsWidgetComponent } from '@components/widgets/stats-cards-widget.component';
import { StatsCardsWidgetComponent } from '@app/components/widgets/stats-card-widget.component';
// import { ActivityChartWidgetComponent } from "@app/components/widgets/activity-chart-widget.component";
// import { LeaderboardWidgetComponent } from "@app/components/widgets/leaderboard-widget.component";

/**
 * 📊 Page Dashboard principale
 * 
 * Affiche les widgets de statistiques pour la guild sélectionnée
 */
@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [StatsCardsWidgetComponent],
    template: `
        <div class="grid grid-cols-12 gap-8">
            <!-- Stats Cards Widget -->
            <app-stats-cards-widget />
            
            <!-- Placeholder pour les prochains widgets -->
            <!-- <app-activity-chart-widget />
            <app-leaderboard-widget /> -->
            <div>Dashboard works!</div>
        </div>
    `
})
export class DemoDashboardComponent {
    private statFacade = inject(StatisticsFacadeService);
}