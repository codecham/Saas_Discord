import { inject } from '@angular/core';
import { AuthFacadeService } from './services/auth/auth-facade.service';

export function initializeApp() {
  const authFacade = inject(AuthFacadeService);
  
  return () => {
    // Cette fonction DOIT retourner une Promise
    // Angular attendra qu'elle soit résolue avant de démarrer l'app
    return new Promise<void>((resolve) => {
      // Laisser un tick pour que tous les services s'initialisent
      setTimeout(() => {
        console.log('App initialized');
        resolve();
      }, 0);
    });
  };
}