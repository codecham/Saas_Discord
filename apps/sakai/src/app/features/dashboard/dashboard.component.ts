import { Component, inject } from '@angular/core';
import { StatisticsFacadeService } from '@app/services/statistics/statistics-facade.service';
import { StatsCardsWidgetComponent } from '@app/components/widgets/stats-card-widget.component';
import { ActivityTimelineWidgetComponent } from '@app/components/widgets/activity-timeline-widget.component';
import { ActivityHeatmapWidgetComponent } from '@app/components/widgets/activity-heatmap-widget.component';

/**
 * 📊 Page Dashboard principale
 * 
 * Affiche les widgets de statistiques pour la guild sélectionnée
 */
@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [StatsCardsWidgetComponent, ActivityTimelineWidgetComponent, ActivityHeatmapWidgetComponent],
    template: `
        <div class="grid grid-cols-12 gap-8">
            <!-- Stats Cards Widget -->
            <app-stats-cards-widget />
            <div class="col-span-6">
                <app-activity-timeline-widget />
            </div>
            <div class="col-span-6">
                <app-activity-heatmap-widget />
            </div>
            <div class="col-span-4">
                <!-- <app-top-contributors-podium-widget /> -->
            </div>


            
            <!-- Placeholder pour les prochains widgets -->
            <!-- <app-activity-chart-widget />
            <app-leaderboard-widget /> -->
        </div>
    `
})
export class DemoDashboardComponent {
    private statFacade = inject(StatisticsFacadeService);
}