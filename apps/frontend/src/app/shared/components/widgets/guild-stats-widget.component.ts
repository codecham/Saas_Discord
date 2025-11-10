import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MemberFacadeService } from '@app/core/services/member/member-facade.service';
import { ChannelFacadeService } from '@app/core/services/channel/channel-facade.service';
import { RoleFacadeService } from '@app/core/services/role/role-facade.service';
import { StatCardComponent } from '@app/shared/components/ui/stat-card/stat-card.component';
import { StatCardSubtitle } from '../ui/stat-card/stat-card.types';

/**
 * 📊 Widget de statistiques de la guild
 * 
 * Affiche 4 cards avec les métriques principales :
 * - Total Membres
 * - Total Channels
 * - Total Roles
 * - Total Moderators
 * 
 * Utilise le composant réutilisable StatCard
 * 
 * @example
 * ```html
 * <app-guild-stats-widget class="contents" />
 * ```
 */
@Component({
  standalone: true,
  selector: 'app-guild-stats-widget',
  imports: [CommonModule, StatCardComponent],
  template: `
    <!-- Card 1: Total Membres -->
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <app-stat-card
        title="Total Membres"
        [value]="totalMembers()"
        icon="pi pi-users"
        color="blue"
        [clickable]="true"
        (cardClick)="navigateToMembers()"
      />
    </div>

    <!-- Card 2: Total Channels -->
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <app-stat-card
        title="Total Channels"
        [value]="totalChannels()"
        icon="pi pi-hashtag"
        color="orange"
        [clickable]="true"
        (cardClick)="navigateToChannels()"
      />
    </div>

    <!-- Card 3: Total Roles -->
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <app-stat-card
        title="Total Roles"
        [value]="totalRoles()"
        icon="pi pi-shield"
        color="cyan"
        [clickable]="true"
        (cardClick)="navigateToRoles()"
      />
    </div>

    <!-- Card 4: Total Moderators -->
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <app-stat-card
        title="Total Moderators"
        [value]="totalModerators"
        icon="pi pi-verified"
        color="purple"
      />
    </div>
  `
})
export class GuildStatsWidget {
  // ========================================
  // Dependencies
  // ========================================
  private memberFacade = inject(MemberFacadeService);
  private channelFacade = inject(ChannelFacadeService);
  private roleFacade = inject(RoleFacadeService);
  private router = inject(Router);

  // ========================================
  // Computed - Members
  // ========================================

  /**
   * Nombre total de membres
   */
  protected totalMembers = computed(() => {
    return this.memberFacade.totalMembers();
  });

  /**
   * Nombre de membres chargés en cache
   */
  protected loadedMembers = computed(() => {
    return this.memberFacade.loadedCount();
  });

  /**
   * Subtitle pour la card Members
   */
  protected membersSubtitle = computed((): StatCardSubtitle => {
    const loaded = this.loadedMembers();
    return {
      highlight: `${loaded}`,
      text: 'chargés en cache'
    };
  });

  // ========================================
  // Computed - Channels
  // ========================================

  /**
   * Nombre total de channels
   */
  protected totalChannels = computed(() => {
    return this.channelFacade.totalChannels() || 0;
  });


  // ========================================
  // Computed - Roles
  // ========================================

  /**
   * Nombre total de roles
   */
  protected totalRoles = computed(() => {
    return this.roleFacade.totalRoles();
  });


  // ========================================
  // Computed - Moderators
  // ========================================

  /**
   * Nombre total de modérateurs
   */
  // protected totalModerators = computed(() => {
  //   return this.memberFacade.totalModerators();
  // });
    protected totalModerators = 0;

  /**
   * Subtitle pour la card Moderators
   */

  // ========================================
  // Navigation Methods
  // ========================================

  /**
   * Navigue vers la liste des membres
   */
  protected navigateToMembers(): void {
    this.router.navigate(['/members']);
  }

  /**
   * Navigue vers la liste des channels
   */
  protected navigateToChannels(): void {
    this.router.navigate(['/channels']);
  }

  /**
   * Navigue vers la liste des roles
   */
  protected navigateToRoles(): void {
    this.router.navigate(['/roles']);
  }
}