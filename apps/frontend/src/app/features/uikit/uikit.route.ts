import { Routes } from '@angular/router';

/**
 * 🎨 Routes UIKit - Composants Custom
 * 
 * Documentation visuelle et exemples d'utilisation
 * des composants réutilisables de Discord Admin App
 */
export default [
    {
        path: '',
        data: { breadcrumb: 'UIKit' },
        loadComponent: () => import('./pages/overview/overview.component')
            .then(m => m.UikitOverviewComponent)
    },
    {
        path: 'stat-card',
        data: { breadcrumb: 'Stat Card' },
        loadComponent: () => import('./pages/star-card-demo/stat-card-demo.component')
            .then(m => m.StatCardDemoComponent)
    },
    // 🔮 Future components
    // {
    //     path: 'data-table',
    //     data: { breadcrumb: 'Data Table' },
    //     loadComponent: () => import('./pages/data-table-demo/data-table-demo.component')
    //         .then(m => m.DataTableDemoComponent)
    // },
    // {
    //     path: 'chart-card',
    //     data: { breadcrumb: 'Chart Card' },
    //     loadComponent: () => import('./pages/chart-card-demo/chart-card-demo.component')
    //         .then(m => m.ChartCardDemoComponent)
    // },
    {
        path: '**',
        redirectTo: ''
    }
] as Routes;