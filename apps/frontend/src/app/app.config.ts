import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withEnabledBlockingInitialNavigation } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptor/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(), // Binding automatique des params de route
      withEnabledBlockingInitialNavigation() // Navigation initiale bloquante
    ),
    provideHttpClient(
      withFetch(), // Utilise fetch() au lieu de XMLHttpRequest
      withInterceptors([authInterceptor])
    ) // Remplace HttpClientModule
  ]
};
