import { Routes } from '@angular/router';
import { AppLayoutComponent } from '@/layout/layout.component';
import { LoginComponent } from '@app/features/auth/login/login.component';
import { guestGuard } from '@app/guards/guest.guard';
import { authGuard } from '@app/guards/auth.guard';

export const appRoutes: Routes = [
    {
        path: 'auth',
        canActivate: [guestGuard], // Empêche les utilisateurs connectés d'accéder
        children: [
            {
                path: 'login',
                component: LoginComponent,
                title: 'Login' // Titre de la page (apparaît dans l'onglet)
            },
            {
                path: 'callback',
                loadComponent: () => import('./app/features/auth/auth-callback/auth-callback.component')
                    .then(m => m.AuthCallbackComponent),
                title: 'Authenticating...'
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
            {
                path: 'dashboard',
                loadComponent: () => import('./app/features/dashboard/dashboard.component')
                .then(m => m.DemoDashboardComponent)
            },
            {
                path: 'members',
                loadComponent: () => import('./app/features/members/members.component')
                .then(m => m.MembersComponent)
            },
            {
                path: 'channels',
                loadComponent: () => import('./app/features/channels/channels.component')
                .then(m => m.ChannelsComponent)
            },
            {
                path: 'roles',
                loadComponent: () => import('./app/features/roles/roles.component')
                .then(m => m.RolesComponent)
            },
            {
                path: 'profile',
                loadComponent: () => import('./app/features/profile/profile.component')
                .then(m => m.ProfileComponent)
            },
            { path: 'uikit', loadChildren: () => import('./app/features/uikit/uikit.routes') },
        ]
    },
];

