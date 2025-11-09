import { Component, inject } from '@angular/core';
import { GuildStatsWidget } from "@app/components/widgets/guild-stats-widget.component";

/**
 * 📊 Page Dashboard principale
 * 
 * Affiche les widgets de statistiques pour la guild sélectionnée
 */
@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [GuildStatsWidget],
    template: `
        <div class="grid grid-cols-12 gap-8">
            <app-guild-stats-widget class="contents" />
        </div>
    `
})
export class DashboardComponent {}
