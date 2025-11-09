// guards/auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject, effect } from '@angular/core';
import { AuthFacadeService } from '@app/core/services/auth/auth-facade.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authFacade = inject(AuthFacadeService);
  const router = inject(Router);

  // 🔒 MODIFIÉ: Attendre que l'initialisation soit TERMINÉE
  if (!authFacade.isInitialized()) {
    console.log('[Guard] Waiting for auth initialization...');
    
    await new Promise<void>(resolve => {
      const effectRef = effect(() => {
        const initialized = authFacade.isInitialized();
        if (initialized) {
          console.log('[Guard] Auth initialization complete');
          effectRef.destroy();
          resolve();
        }
      });
    });
  }

  // Maintenant vérifier l'authentification
  if (authFacade.isAuthenticated()) {
    console.log('[Guard] User authenticated, access granted');
    return true;
  }

  console.log('[Guard] User not authenticated, redirecting to login');
  sessionStorage.setItem('returnUrl', state.url);
  
  return router.parseUrl('/auth/login');
};