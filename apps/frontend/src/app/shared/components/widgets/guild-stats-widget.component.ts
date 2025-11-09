import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberFacadeService } from '@app/core/services/member/member-facade.service';
import { ChannelFacadeService } from '@app/core/services/channel/channel-facade.service';
import { RoleFacadeService } from '@app/core/services/role/role-facade.service';

/**
 * 📊 Widget de statistiques de la guild
 * 
 * Affiche 4 cards avec les métriques principales :
 * - Total Membres
 * - Total Channels
 * - Total Roles
 * - Total Moderators
 * 
 * Style identique à StatsWidget du template Sakai
 */
@Component({
  standalone: true,
  selector: 'app-guild-stats-widget',
  imports: [CommonModule],
  template: `
    <!-- Card 1: Total Membres -->
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <div class="card mb-0">
        <div class="flex justify-between mb-4">
          <div>
            <span class="block text-muted-color font-medium mb-4">Total Membres</span>
            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
              {{ totalMembers() }}
            </div>
          </div>
          <div 
            class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" 
            style="width: 2.5rem; height: 2.5rem"
          >
            <i class="pi pi-users text-blue-500 text-xl!"></i>
          </div>
        </div>
        <span class="text-primary font-medium">{{ loadedMembers() }} </span>
        <span class="text-muted-color">chargés en cache</span>
      </div>
    </div>

    <!-- Card 2: Total Channels -->
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <div class="card mb-0">
        <div class="flex justify-between mb-4">
          <div>
            <span class="block text-muted-color font-medium mb-4">Total Channels</span>
            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
              {{ totalChannels() }}
            </div>
          </div>
          <div 
            class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-border" 
            style="width: 2.5rem; height: 2.5rem"
          >
            <i class="pi pi-hashtag text-orange-500 text-xl!"></i>
          </div>
        </div>
        <span class="text-primary font-medium">{{ textChannelsCount() }} texte </span>
        <span class="text-muted-color">· {{ voiceChannelsCount() }} vocal</span>
      </div>
    </div>

    <!-- Card 3: Total Roles -->
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <div class="card mb-0">
        <div class="flex justify-between mb-4">
          <div>
            <span class="block text-muted-color font-medium mb-4">Total Roles</span>
            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
              {{ totalRoles() }}
            </div>
          </div>
          <div 
            class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-border" 
            style="width: 2.5rem; height: 2.5rem"
          >
            <i class="pi pi-id-card text-cyan-500 text-xl!"></i>
          </div>
        </div>
        <span class="text-primary font-medium">{{ adminRolesCount() }} admin </span>
        <span class="text-muted-color">· {{ managedRolesCount() }} managés</span>
      </div>
    </div>

    <!-- Card 4: Total Moderators -->
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <div class="card mb-0">
        <div class="flex justify-between mb-4">
          <div>
            <span class="block text-muted-color font-medium mb-4">Total Moderators</span>
            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
              {{ totalModerators() }}
            </div>
          </div>
          <div 
            class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border" 
            style="width: 2.5rem; height: 2.5rem"
          >
            <i class="pi pi-shield text-purple-500 text-xl!"></i>
          </div>
        </div>
        <span class="text-primary font-medium">{{ adminsCount() }} admins </span>
        <span class="text-muted-color">actifs</span>
      </div>
    </div>
  `
})
export class GuildStatsWidget {
  // ============================================
  // INJECTION DES SERVICES FACADE
  // ============================================

  private readonly memberFacade = inject(MemberFacadeService);
  private readonly channelFacade = inject(ChannelFacadeService);
  private readonly roleFacade = inject(RoleFacadeService);

  // ============================================
  // COMPUTED SIGNALS - STATISTIQUES MEMBRES
  // ============================================

  /**
   * Nombre total de membres du serveur
   */
  readonly totalMembers = computed(() => 
    this.memberFacade.totalMembers() || 0
  );

  /**
   * Nombre de membres chargés en cache
   */
  readonly loadedMembers = computed(() => 
    this.memberFacade.loadedCount() || 0
  );

  /**
   * Nombre d'admins
   */
  readonly adminsCount = computed(() => 
    this.memberFacade.admins().length || 0
  );

  /**
   * Nombre total de moderators
   * TODO: Implémenter la logique réelle quand le système de modération sera prêt
   * Pour l'instant, on compte les admins + moderators
   */
  readonly totalModerators = computed(() => {
    const admins = this.memberFacade.admins().length;
    const moderators = this.memberFacade.moderators().length;
    return admins + moderators;
  });

  // ============================================
  // COMPUTED SIGNALS - STATISTIQUES CHANNELS
  // ============================================

  /**
   * Nombre total de channels
   */
  readonly totalChannels = computed(() => 
    this.channelFacade.totalChannels() || 0
  );

  /**
   * Nombre de channels texte
   */
  readonly textChannelsCount = computed(() => 
    this.channelFacade.textChannels().length || 0
  );

  /**
   * Nombre de channels vocaux
   */
  readonly voiceChannelsCount = computed(() => 
    this.channelFacade.voiceChannels().length || 0
  );

  // ============================================
  // COMPUTED SIGNALS - STATISTIQUES ROLES
  // ============================================

  /**
   * Nombre total de rôles
   */
  readonly totalRoles = computed(() => 
    this.roleFacade.totalRoles() || 0
  );

  /**
   * Nombre de rôles avec permissions admin
   */
  readonly adminRolesCount = computed(() => 
    this.roleFacade.adminRoles().length || 0
  );

  /**
   * Nombre de rôles managés (bots, intégrations)
   */
  readonly managedRolesCount = computed(() => 
    this.roleFacade.managedRoles().length || 0
  );
}