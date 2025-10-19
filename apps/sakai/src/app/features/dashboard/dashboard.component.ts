// apps/sakai/src/app/features/dashboard/dashboard.component.ts

import { Component } from '@angular/core';
import { StatsCardsWidgetComponent } from '@components/widgets/stats-cards-widget.component';
import { ActivityChartWidgetComponent } from "@app/components/widgets/activity-chart-widget.component";
import { LeaderboardWidgetComponent } from "@app/components/widgets/leaderboard-widget.component";

/**
 * 📊 Page Dashboard principale
 * 
 * Affiche les widgets de statistiques pour la guild sélectionnée
 */
@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
    StatsCardsWidgetComponent,
    ActivityChartWidgetComponent,
    LeaderboardWidgetComponent
],
    template: `
        <div class="grid grid-cols-12 gap-8">
            <!-- Stats Cards Widget -->
            <app-stats-cards-widget />
            
            <!-- Placeholder pour les prochains widgets -->
            <app-activity-chart-widget />
            <app-leaderboard-widget />
        </div>
    `
})
export class DemoDashboardComponent {}