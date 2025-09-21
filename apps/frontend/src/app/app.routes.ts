import { Routes } from '@angular/router';
import { DemoComponent } from './pages/demo/demo.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { AuthCallbackComponent } from './pages/auth-callback/auth-callback.component';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    {
      path: 'login',
      component: LoginComponent,
      canActivate: [guestGuard],
    },
    {
      path: 'auth/callback',
      component: AuthCallbackComponent
    },
    {
      path: 'dashboard',
      component: DashboardComponent,
      canActivate: [authGuard],
    },
    {
      path: 'demo',
      component: DemoComponent,
      canActivate: [authGuard],
    },
    { path: '**', redirectTo: '/dashboard' }
];

