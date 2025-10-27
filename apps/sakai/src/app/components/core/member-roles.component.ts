import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { RoleFacadeService } from '@app/services/role/role-facade.service';

/**
 * Composant pour afficher les rôles d'un membre
 * Affiche les 3 premiers rôles avec leur nom et couleur, + un compteur si plus de rôles
 * Style moderne "liquid glass" inspiré d'Apple
 */
@Component({
  selector: 'app-member-roles',
  standalone: true,
  imports: [CommonModule, TooltipModule],
  template: `
    <div class="flex flex-wrap gap-1.5">
      @for (role of displayedRoles(); track role.id) {
        <span
          class="role-badge"
          [style.color]="role.colorHex !== '#000000' ? role.colorHex : '#99AAB5'"
          [style.background]="getRoleBackground(role.colorHex)"
          [style.border-color]="getRoleBorderColor(role.colorHex)"
          [pTooltip]="role.memberCount !== undefined ? role.memberCount + ' membre(s)' : role.name"
          tooltipPosition="top"
        >
          {{ role.name }}
        </span>
      }
      @if (remainingCount() > 0) {
        <span
          class="role-badge role-badge-remaining"
          [pTooltip]="remainingRolesTooltip()"
          tooltipPosition="top"
        >
          +{{ remainingCount() }}
        </span>
      }
    </div>
  `,
  styles: [`
    .role-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.375rem 0.75rem;
      border-radius: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      border: 1px solid;
      transition: all 0.2s ease;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 
        0 1px 2px 0 rgba(0, 0, 0, 0.05),
        inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
      cursor: default;
    }

    .role-badge:hover {
      transform: translateY(-1px);
      box-shadow: 
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06),
        inset 0 1px 0 0 rgba(255, 255, 255, 0.15);
    }

    .role-badge-remaining {
      background: linear-gradient(135deg, 
        rgba(156, 163, 175, 0.15) 0%, 
        rgba(156, 163, 175, 0.05) 100%);
      color: #6b7280;
      border-color: rgba(156, 163, 175, 0.2);
    }

    .role-badge-remaining:hover {
      background: linear-gradient(135deg, 
        rgba(156, 163, 175, 0.2) 0%, 
        rgba(156, 163, 175, 0.1) 100%);
    }

    /* Animation subtile au chargement */
    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .role-badge {
      animation: fadeInScale 0.2s ease-out;
    }
  `]
})
export class MemberRolesComponent {
  @Input({ required: true }) roleIds: string[] = [];
  @Input() maxDisplay: number = 3;

  private roleFacade = inject(RoleFacadeService);

  /**
   * Rôles complets à afficher
   */
  displayedRoles = computed(() => {
    return this.roleIds
      .slice(0, this.maxDisplay)
      .map(id => this.roleFacade.getRoleById(id))
      .filter(role => role !== undefined);
  });

  /**
   * Nombre de rôles restants non affichés
   */
  remainingCount = computed(() => {
    const total = this.roleIds.length;
    return total > this.maxDisplay ? total - this.maxDisplay : 0;
  });

  /**
   * Tooltip pour les rôles restants
   */
  remainingRolesTooltip = computed(() => {
    const remaining = this.roleIds
      .slice(this.maxDisplay)
      .map(id => this.roleFacade.getRoleById(id))
      .filter(role => role !== undefined)
      .map(role => role.name);
    
    return remaining.join(', ');
  });

  /**
   * Génère un background dégradé avec la couleur du rôle
   * Style "liquid glass" avec transparence et blur
   */
  getRoleBackground(hexColor: string): string {
    if (hexColor === '#000000') {
      // Rôle @everyone ou sans couleur
      return 'linear-gradient(135deg, rgba(156, 163, 175, 0.15) 0%, rgba(156, 163, 175, 0.05) 100%)';
    }

    const rgb = this.hexToRgb(hexColor);
    
    // Créer un dégradé avec la couleur du rôle mais très atténuée
    return `linear-gradient(135deg, 
      rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15) 0%, 
      rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05) 100%)`;
  }

  /**
   * Génère une couleur de bordure subtile basée sur la couleur du rôle
   */
  getRoleBorderColor(hexColor: string): string {
    if (hexColor === '#000000') {
      return 'rgba(156, 163, 175, 0.2)';
    }

    const rgb = this.hexToRgb(hexColor);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
  }

  /**
   * Convertit une couleur hex en RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
}