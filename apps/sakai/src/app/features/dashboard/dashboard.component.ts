import { Component } from '@angular/core';
import { NotificationsWidget } from '../../components/widgets/notificationswidget.component';
import { StatsWidget } from '../../components/widgets/statswidget.component';
import { RecentSalesWidget } from '../../components/widgets/recentsaleswidget.component';
import { BestSellingWidget } from '../../components/widgets/bestsellingwidget.component';
import { RevenueStreamWidget } from '../../components/widgets/revenuestreamwidget.component';

@Component({
    selector: 'app-dashboard',
    imports: [StatsWidget, RecentSalesWidget, BestSellingWidget, RevenueStreamWidget, NotificationsWidget],
    template: `
        <div class="grid grid-cols-12 gap-8">
            <app-stats-widget class="contents" />
            <div class="col-span-12 xl:col-span-6">
                <app-recent-sales-widget />
                <app-best-selling-widget />
            </div>
            <div class="col-span-12 xl:col-span-6">
                <app-revenue-stream-widget />
                <app-notifications-widget />
            </div>
        </div>
    `
})
export class DemoDashboardComponent {}
