import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { GuildFacadeService } from '@app/services/guild/guild-facade.service';

/**
 * Guard qui vérifie qu'une guild est sélectionnée
 * Redirige vers /server-list si aucune guild n'est sélectionnée
 */
export const guildGuard: CanActivateFn = (route, state) => {
  const guildFacade = inject(GuildFacadeService);
  const router = inject(Router);

  console.log('[GuildGuard] Checking guild selection...');

  // Vérifier si une guild est sélectionnée
  if (guildFacade.hasSelectedGuild()) {
    console.log('[GuildGuard] Guild selected, access granted');
    return true;
  }

  // Aucune guild sélectionnée, rediriger vers la liste
  console.log('[GuildGuard] No guild selected, redirecting to server-list');
  return router.createUrlTree(['/server-list']);
};