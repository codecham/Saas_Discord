import { Component, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppMenuComponent } from '@app/shared/components/domain/menu.component';
import { GuildSelectorComponent } from '@app/shared/components/domain/guild-selector.component';
import { GuildFacadeService } from '@app/core/services/guild/guild-facade.service';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        AppMenuComponent,
        GuildSelectorComponent,
        ButtonModule
    ],
    template: `
        <div class="layout-sidebar">
            @if (guildFacade.hasSelectedGuild()) {
                <!-- Guild sélectionnée : afficher le sélecteur + menu -->
                <app-guild-selector />
                <app-menu />
            } @else {
                <!-- Aucune guild sélectionnée : afficher un message -->
                <div class="flex flex-col items-center justify-center h-full p-6 text-center">
                    <h3 class="text-xl font-semibold mb-2">Aucun serveur sélectionné</h3>
                    <p class="text-muted-color mb-6">
                        Veuillez sélectionner un serveur Discord pour accéder au panneau d'administration.
                    </p>
                    <button 
                        pButton
                        label="Choisir un serveur"
                        icon="pi pi-arrow-right"
                        [routerLink]="['/server-list']"
                        severity="primary"
                    >
                    </button>
                </div>
            }
        </div>
    `
})
export class AppSidebarComponent {
    guildFacade = inject(GuildFacadeService);
    
    constructor(public el: ElementRef) {}
}