import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthFacadeService } from '../services/auth/auth-facade.service';

export const guestGuard: CanActivateFn = () => {
  const authFacade = inject(AuthFacadeService);
  const router = inject(Router);

  if (authFacade.isAuthenticated()) {
    // Utilisateur déjà connecté, rediriger vers le dashboard
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
