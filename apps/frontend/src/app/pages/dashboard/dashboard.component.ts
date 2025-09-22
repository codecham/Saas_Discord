// pages/dashboard/dashboard.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthFacadeService } from '../../services/auth/auth-facade.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  private readonly authFacade = inject(AuthFacadeService);
  private readonly router = inject(Router);

  // ===== SIGNAUX DE LA FAÇADE =====
  user = this.authFacade.user;
  discordUser = this.authFacade.discordUser;
  isLoading = this.authFacade.isLoading;
  userRole = this.authFacade.userRole;
  isEmailVerified = this.authFacade.isEmailVerified;
  isActive = this.authFacade.isActive;

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

  getRoleBadgeClass(): string {
    const role = this.userRole();
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'MODERATOR':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  }

  getDiscordAvatarUrl(): string {
  const discord = this.discordUser();
  if (!discord?.avatar) return '';
    return `https://cdn.discordapp.com/avatars/${discord.id}/${discord.avatar}.png`;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}