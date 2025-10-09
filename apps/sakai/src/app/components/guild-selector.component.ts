import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuildFacadeService } from '@app/services/guild/guild-facade.service';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';

@Component({
  selector: 'app-guild-selector',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="p-4 border-b border-surface">
      @if (guildFacade.selectedGuild(); as guild) {
        <div class="flex flex-col gap-2">
          <!-- Informations de la guild -->
          <div class="flex items-center gap-3">
            <!-- Icône de la guild -->
            @if (guildFacade.getSelectedGuildIconUrl()) {
              <img 
                [src]="guildFacade.getSelectedGuildIconUrl()!" 
                [alt]="guild.name"
                class="w-12 h-12 rounded-lg object-cover"
              />
            } @else {
              <div class="w-12 h-12 m-0 rounded-lg bg-primary-500 flex items-center justify-center text-white text-xl font-bold">
                {{ guild.name.charAt(0).toUpperCase() }}
              </div>
            }

            <!-- Nom de la guild -->
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-base truncate">{{ guild.name }}</h3>
            </div>
          </div>

          <!-- Bouton pour désélectionner -->
          <button 
            pButton
            label="Changer de serveur"
            icon="pi pi-arrow-left"
            [outlined]="true"
            size="small"
            class="w-full"
            (click)="onClearGuild()">
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    h3 {
      margin: 0
    }
  `]
})
export class GuildSelectorComponent {
  guildFacade = inject(GuildFacadeService);
  private router = inject(Router);

  /**
   * Désélectionne la guild et redirige vers la liste des serveurs
   */
  async onClearGuild(): Promise<void> {
    this.guildFacade.clearSelectedGuild();
    await this.router.navigate(['/server-list']);
  }
}