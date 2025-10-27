import { Routes } from '@angular/router';
import { AppLayoutComponent } from '@/layout/layout.component';
import { LoginComponent } from '@app/features/auth/login/login.component';
import { guestGuard } from '@app/guards/guest.guard';
import { authGuard } from '@app/guards/auth.guard';
import { guildGuard } from '@app/guards/guild.guard';

export const appRoutes: Routes = [
    {
        path: 'auth',
        canActivate: [guestGuard],
        children: [
            {
                path: 'login',
                component: LoginComponent,
            },
            {
                path: 'callback',
                loadComponent: () => import('./app/features/auth/auth-callback/auth-callback.component')
                    .then(m => m.AuthCallbackComponent),
            },
            {
                path: '',
                redirectTo: 'login',
                pathMatch: 'full'
            }
        ]
    },
    {
        path: '',
        component: AppLayoutComponent,
        canActivate: [authGuard],
        children: [
            // Page de sélection de serveur (pas de guildGuard)
            {
                path: 'server-list',
                loadComponent: () => import('./app/features/server-list/server-list.component')
                    .then(m => m.ServerListComponent)
            },
            // Routes protégées par guildGuard (nécessitent une guild sélectionnée)
            {
                path: 'dashboard',
                canActivate: [guildGuard],
                loadComponent: () => import('./app/features/dashboard/dashboard.component')
                    .then(m => m.DashboardComponent)
            },
            {
                path: 'server-info',
                canActivate: [guildGuard],
                loadComponent: () => import('./app/features/server-info/server-info.component')
                    .then(m => m.ServerInfoComponent)
            },
            {
                path: 'members',
                canActivate: [guildGuard],
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./app/features/members/members.component')
                            .then(m => m.MembersComponent)
                    },
                    // {
                    //     path: ':userId/stats',
                    //     loadComponent: () => import('./app/features/member-stats/member-stats.component')
                    //         .then(m => m.MemberStatsComponent)
                    // }
                ]
            },
            {
                path: 'channels',
                canActivate: [guildGuard],
                loadComponent: () => import('./app/features/channels/channels.component')
                    .then(m => m.ChannelsComponent)
            },
            {
                path: 'roles',
                canActivate: [guildGuard],
                loadComponent: () => import('./app/features/roles/roles.component')
                    .then(m => m.RolesComponent)
            },
            {
                path: 'profile',
                loadComponent: () => import('./app/features/profile/profile.component')
                    .then(m => m.ProfileComponent)
            },
            {
                path: 'endpoint-tester',
                canActivate: [guildGuard],
                loadComponent: () => import('./app/features/endpoints-tester/endpoints-tester.component')
                    .then(m => m.EndpointTesterComponent)
            },
            { 
                path: 'uikit', 
                loadChildren: () => import('./app/features/uikit/uikit.routes') 
            },
            // Redirection par défaut
            {
                path: '',
                redirectTo: 'server-list',
                pathMatch: 'full'
            }
        ]
    },
];