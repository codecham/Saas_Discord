import { Component } from '@angular/core';
import { NotificationsWidget } from '@app/components/ui-kit/notificationswidget.component';
import { StatsWidget } from '@app/components/ui-kit/statswidget.component';
import { RecentSalesWidget } from '@app/components/ui-kit/recentsaleswidget.component';
import { BestSellingWidget } from '@app/components/ui-kit/bestsellingwidget.component';
import { RevenueStreamWidget } from '@app/components/ui-kit/revenuestreamwidget.component';

@Component({
    selector: 'app-dashboard-demo',
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
export class DemoDashboardComponentDemo {}
