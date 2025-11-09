// interceptors/auth.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, switchMap, from } from 'rxjs';

import { TokenService } from '../services/auth/token.service';
// ❌ NE PAS importer AuthFacadeService ici (dépendance circulaire)

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);

  // Routes d'authentification qui ne nécessitent pas de token
  const authRoutes = ['/auth/login', '/auth/register', '/auth/refresh'];
  const isAuthRoute = authRoutes.some(route => req.url.includes(route));

  // Ajouter le token à la requête si disponible
  let authReq = req;
  const token = tokenService.getAccessToken();
  
  if (token && !isAuthRoute) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Gestion des erreurs 401 (non autorisé)
      if (error.status === 401 && !isAuthRoute) {
        // Si le token a expiré, nettoyer le localStorage
        // La façade detectera automatiquement le changement via les effects
        if (tokenService.isTokenExpired()) {
          tokenService.clearTokens();
        }
      }
      
      return throwError(() => error);
    })
  );
};