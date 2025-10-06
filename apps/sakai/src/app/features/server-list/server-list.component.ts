import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuildFacadeService } from '@app/services/guild/guild-facade.service';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-server-list',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ProgressSpinnerModule,
    DividerModule
  ],
  template: `
    <div class="server-list-container p-4">
      <div class="mb-4">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Sélectionnez un serveur
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          Choisissez le serveur Discord que vous souhaitez administrer
        </p>
      </div>

      <!-- Loading -->
      <div *ngIf="guildFacade.isLoading()" class="flex justify-center items-center py-12">
        <p-progressSpinner 
          styleClass="w-16 h-16" 
          strokeWidth="4"
          animationDuration="1s">
        </p-progressSpinner>
      </div>

      <!-- Error -->
      <div *ngIf="guildFacade.error()" class="mb-4">
        <p-card styleClass="border-l-4 border-red-500">
          <div class="flex items-center gap-3">
            <i class="pi pi-exclamation-triangle text-red-500 text-2xl"></i>
            <div>
              <p class="font-semibold text-red-700 dark:text-red-400">Erreur</p>
              <p class="text-red-600 dark:text-red-300">{{ guildFacade.error() }}</p>
            </div>
          </div>
        </p-card>
      </div>

      <!-- Active Guilds -->
      <div *ngIf="!guildFacade.isLoading() && guildFacade.activeGuilds().length > 0">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Serveurs actifs ({{ guildFacade.totalActiveGuilds() }})
          </h2>
          <p-button 
            label="Rafraîchir" 
            icon="pi pi-refresh" 
            [outlined]="true"
            (onClick)="refreshGuilds()"
            [loading]="guildFacade.isLoading()">
          </p-button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <p-card 
            *ngFor="let guild of guildFacade.activeGuilds()"
            styleClass="hover:shadow-lg transition-shadow cursor-pointer"
            [class.ring-2]="guildFacade.isGuildSelected(guild.id)"
            [class.ring-blue-500]="guildFacade.isGuildSelected(guild.id)">
            <ng-template pTemplate="header">
              <div class="flex justify-center items-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
                <img 
                  *ngIf="guild.icon; else noIcon"
                  [src]="getGuildIconUrl(guild)" 
                  [alt]="guild.name"
                  class="w-24 h-24 rounded-full border-4 border-white dark:border-gray-600 shadow-md">
                <ng-template #noIcon>
                  <div class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-md">
                    {{ guild.name.charAt(0).toUpperCase() }}
                  </div>
                </ng-template>
              </div>
            </ng-template>

            <div class="text-center">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {{ guild.name }}
              </h3>
              
              <div class="flex flex-wrap justify-center gap-2 mb-3">
                <span 
                  *ngIf="guild.owner" 
                  class="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs rounded-full">
                  <i class="pi pi-crown mr-1"></i>Propriétaire
                </span>
                <span 
                  *ngIf="guild.isActive" 
                  class="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs rounded-full">
                  <i class="pi pi-check-circle mr-1"></i>Actif
                </span>
              </div>

              <p-button 
                label="Administrer" 
                icon="pi pi-sign-in"
                [loading]="guildFacade.isLoadingGuildDetails() && selectedGuildId === guild.id"
                (onClick)="selectGuild(guild)"
                styleClass="w-full">
              </p-button>
            </div>
          </p-card>
        </div>
      </div>

      <!-- No Active Guilds -->
      <div *ngIf="!guildFacade.isLoading() && guildFacade.activeGuilds().length === 0">
        <p-card>
          <div class="text-center py-8">
            <i class="pi pi-inbox text-6xl text-gray-400 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Aucun serveur actif
            </h3>
            <p class="text-gray-500 dark:text-gray-400 mb-4">
              Vous n'avez pas encore ajouté le bot à vos serveurs Discord
            </p>
            <p-button 
              label="Ajouter le bot" 
              icon="pi pi-plus"
              [outlined]="true"
              (onClick)="addBot()">
            </p-button>
          </div>
        </p-card>
      </div>

      <!-- Divider -->
      <p-divider *ngIf="!guildFacade.isLoading() && guildFacade.activeGuilds().length > 0"></p-divider>

      <!-- Info Section -->
      <div *ngIf="!guildFacade.isLoading()" class="mt-6">
        <p-card>
          <div class="text-center text-sm text-gray-600 dark:text-gray-400">
            <i class="pi pi-info-circle mr-2"></i>
            Vous pouvez administrer uniquement les serveurs où le bot est présent et où vous avez les permissions nécessaires.
          </div>
        </p-card>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .server-list-container {
      max-width: 1400px;
      margin: 0 auto;
    }
  `]
})
export class ServerListComponent implements OnInit {
  protected readonly guildFacade = inject(GuildFacadeService);
  protected selectedGuildId: string | null = null;

  ngOnInit(): void {
    // Les guilds sont déjà chargées par AuthFacade
    // Mais on peut forcer un refresh si nécessaire
    if (this.guildFacade.activeGuilds().length === 0 && !this.guildFacade.isLoading()) {
      this.guildFacade.refreshGuildsList();
    }
  }

  async selectGuild(guild: { id: string; name: string }): Promise<void> {
    this.selectedGuildId = guild.id;
    try {
      await this.guildFacade.selectGuild(guild);
    } catch (error) {
      console.error('Failed to select guild:', error);
      this.selectedGuildId = null;
    }
  }

  async refreshGuilds(): Promise<void> {
    await this.guildFacade.refreshGuildsList();
  }

  getGuildIconUrl(guild: any): string {
    if (!guild.icon) return '';
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`;
  }

  addBot(): void {
    // TODO: Implémenter la logique pour ajouter le bot
    window.open('YOUR_BOT_INVITE_URL', '_blank');
  }
}