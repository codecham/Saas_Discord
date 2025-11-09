// guards/role.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthFacadeService } from '../services/auth/auth-facade.service';

export const roleGuard: CanActivateFn = (route) => {
  const authFacade = inject(AuthFacadeService);
  const router = inject(Router);

  if (!authFacade.isAuthenticated()) {
    router.navigate(['/auth/login']);
    return false;
  }

  // Récupérer les rôles autorisés depuis les données de la route
  const allowedRoles = route.data['roles'] as string[];
  
  if (!allowedRoles || allowedRoles.length === 0) {
    // Aucun rôle spécifié, autoriser l'accès
    return true;
  }

  // Vérifier si l'utilisateur a l'un des rôles autorisés
  // if (authFacade.hasAnyRole(allowedRoles)) {
  //   return true;
  // }

  // Utilisateur n'a pas le bon rôle
  router.navigate(['/unauthorized']);
  return false;
};