import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthFacadeService } from '@app/services/auth/auth-facade.service';

@Component({
  selector: 'app-profile',
  imports: [],
  template: `
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Header avec message de bienvenue -->
      <div class="bg-white overflow-hidden shadow-sm rounded-lg mb-8">
        <div class="px-6 py-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">
                {{ getWelcomeMessage() }}, {{ user()?.name || 'Utilisateur' }} !
              </h1>
              <p class="mt-1 text-sm text-gray-600">
                Bienvenue sur votre tableau de bord
              </p>

              @if (discordUser()) {
                <div class="mt-3 flex items-center space-x-2">
                  <div class="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.195.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900">
                      Discord: {{ discordUser()?.username }}#{{ discordUser()?.discriminator }}
                    </p>
                    <p class="text-xs text-gray-500">Compte Discord connecté</p>
                  </div>
                </div>
              }
            </div>
            
            <!-- Avatar utilisateur -->
            <div class="flex-shrink-0">
              @if (discordUser()?.avatar) {
                <img 
                  class="h-16 w-16 rounded-full object-cover border-2 border-indigo-300"
                  [src]="getDiscordAvatarUrl()"
                  [alt]="discordUser()?.username"
                  title="Avatar Discord"
                />
              } @else if (user()?.avatar) {
                <img 
                  class="h-16 w-16 rounded-full object-cover border-2 border-gray-300"
                  [src]="user()?.avatar" 
                  [alt]="user()?.name"
                />
              } @else {
                <div class="h-16 w-16 rounded-full bg-indigo-500 flex items-center justify-center border-2 border-gray-300">
                  <span class="text-xl font-medium text-white">
                    {{ user()?.name?.charAt(0)?.toUpperCase() || 'U' }}
                  </span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Grille d'informations utilisateur -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        <!-- Informations personnelles -->
        <div class="bg-white overflow-hidden shadow-sm rounded-lg">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Informations personnelles</h3>
          </div>
          <div class="px-6 py-4 space-y-4">
            
            <!-- Email -->
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-500">Email</span>
              <div class="flex items-center">
                <span class="text-sm text-gray-900">{{ user()?.email }}</span>
                @if (isEmailVerified()) {
                  <svg class="ml-2 w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                } @else {
                  <svg class="ml-2 w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                  </svg>
                }
              </div>
            </div>

            <!-- Rôle -->
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-500">Rôle</span>
              <span [class]="'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' + getRoleBadgeClass()">
                {{ userRole() }}
              </span>
            </div>

            <!-- Statut du compte -->
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-500">Statut</span>
              @if (isActive()) {
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Actif
                </span>
              } @else {
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Inactif
                </span>
              }
            </div>

            <!-- Date de création -->
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-500">Membre depuis</span>
              <span class="text-sm text-gray-900">
                {{ formatDate(user()?.createdAt!) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Actions rapides -->
        <div class="bg-white overflow-hidden shadow-sm rounded-lg">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Actions rapides</h3>
          </div>
          <div class="px-6 py-4 space-y-4">
            
            <!-- Modifier le profil -->
            <button
              (click)="navigateToProfile()"
              class="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <div class="flex items-center">
                <svg class="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                Modifier mon profil
              </div>
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>

            <!-- Paramètres -->
            <button
              class="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <div class="flex items-center">
                <svg class="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                Paramètres
              </div>
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Section de déconnexion -->
      <div class="bg-white overflow-hidden shadow-sm rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Sécurité</h3>
          <p class="mt-1 text-sm text-gray-600">
            Gérez vos sessions et votre sécurité
          </p>
        </div>
        <div class="px-6 py-4">
          <div class="flex flex-col sm:flex-row gap-4">
            
            <!-- Déconnexion simple -->
            <button
              (click)="logout()"
              [disabled]="isLoading()"
              class="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              @if (isLoading()) {
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              } @else {
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
              }
              Se déconnecter
            </button>

            <!-- Déconnexion de tous les appareils -->
            <button
              (click)="logoutAll()"
              [disabled]="isLoading()"
              class="flex-1 inline-flex justify-center items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              @if (isLoading()) {
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              } @else {
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              }
              Déconnecter tous les appareils
            </button>
          </div>
          
          <p class="mt-3 text-xs text-gray-500">
            La déconnexion de tous les appareils invalidera toutes vos sessions actives sur tous vos appareils.
          </p>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: ``
})
export class ProfileComponent {
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
