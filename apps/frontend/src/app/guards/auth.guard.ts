// guards/auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthFacadeService } from '@app/services/auth/auth-facade.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authFacade = inject(AuthFacadeService);
  const router = inject(Router);

  if (authFacade.isAuthenticated()) {
    return true;
  }

  console.log('User not authenticated')
  // Stocker l'URL pour redirection après connexion
  sessionStorage.setItem('returnUrl', state.url);
  
  // Rediriger vers la page de connexion
  // router.navigate(['/login']);
  // return false;
  return router.parseUrl('/login');
};