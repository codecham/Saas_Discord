import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthFacadeService } from '@app/services/auth/auth-facade.service';
import { UserFacadeService } from '@app/services/user/user-facade.service';

@Component({
  selector: 'app-profile',
  imports: [],
  template: `
  <div>
		<button
				(click)="logout()"
				class="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
				</svg>
				Se déconnecter
		</button>
	</div>
  `,
  styles: ``
})
export class ProfileComponent {
  private readonly authFacade = inject(AuthFacadeService);
  private readonly userFacade = inject(UserFacadeService);
  private readonly router = inject(Router);

  // ===== SIGNAUX DE LA FAÇADE =====

  // ===== MÉTHODES DE DÉCONNEXION =====

  async logout(): Promise<void> {
    try {
      await this.authFacade.logout();
      // La redirection est gérée automatiquement par la façade
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  }

  async logoutAll(): Promise<void> {
    if (!confirm('Êtes-vous sûr de vouloir vous déconnecter de tous les appareils ?')) {
      return;
    }

    try {
      await this.authFacade.logoutAll();
      // La redirection est gérée automatiquement par la façade
    } catch (error) {
      console.error('Erreur lors de la déconnexion globale:', error);
    }
  }

  // ===== MÉTHODES UTILITAIRES =====

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  getWelcomeMessage(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

//   getRoleBadgeClass(): string {
//     const role = this.userRole;
//     switch (role) {
//       case 'ADMIN':
//         return 'bg-red-100 text-red-800';
//       case 'MODERATOR':
//         return 'bg-yellow-100 text-yellow-800';
//       default:
//         return 'bg-blue-100 text-blue-800';
//     }
//   }

//   getDiscordAvatarUrl(): string {
//   const discord = this.discordUser();
//   if (!discord?.avatar) return '';
//     return `https://cdn.discordapp.com/avatars/${discord.id}/${discord.avatar}.png`;
//   }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

}