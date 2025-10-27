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
    imports: [StatsCardsWidgetComponent],
    template: `
        <div class="grid grid-cols-12 gap-8">
            <!-- Stats Cards Widget -->
            <app-stats-cards-widget />
            <!-- <app-activity-timeline-widget /> -->
            <!-- <app-activity-heatmap-widget /> -->
        </div>
    `
})
export class DashboardComponent {
    private statFacade = inject(StatisticsFacadeService);
}
