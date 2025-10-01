import { Routes } from '@angular/router';
import { DemoComponent } from './pages/demo/demo.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { AuthCallbackComponent } from './pages/auth-callback/auth-callback.component';
import { guestGuard } from './guards/guest.guard';
import { EndpointTesterComponent } from './pages/endpoints-tester/endpoints-tester.component';
import { testGuard } from './guards/test.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    {
      path: 'login',
      component: LoginComponent,
      // canActivate: [guestGuard],
    },
    {
      path: 'auth/callback',
      component: AuthCallbackComponent
    },
    {
      path: 'dashboard',
      component: DashboardComponent,
      canActivate: [testGuard],
    },
    {
      path: 'demo',
      component: DemoComponent,
      canActivate: [authGuard],
    },
    {
      path: 'endpoint-tester',
      component: EndpointTesterComponent,
      title: 'API Endpoint Tester',
      canActivate: [authGuard],
    },
    { path: '**', redirectTo: '/dashboard' }
];

