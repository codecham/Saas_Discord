// apps/sakai/src/app/features/members/components/member-action-modals.component.ts
import { Component, EventEmitter, Output, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { GuildMemberDTO } from '@my-project/shared-types';

/**
 * Interface pour les actions de modération
 */
export interface KickMemberAction {
  memberId: string;
  reason?: string;
}

export interface BanMemberAction {
  memberId: string;
  reason?: string;
  deleteMessageDays: number;
}

export interface TimeoutMemberAction {
  memberId: string;
  duration: string; // ISO date string
  reason?: string;
}

export interface NicknameChangeAction {
  memberId: string;
  nickname: string;
  reason?: string;
}

/**
 * Options de durée pour les timeouts
 */
interface TimeoutDurationOption {
  label: string;
  value: number; // Durée en minutes
  icon: string;
}

/**
 * Composant réutilisable pour toutes les modals d'actions sur les membres
 * 
 * Features:
 * - Modal Kick avec raison
 * - Modal Ban avec raison + durée de suppression messages
 * - Modal Timeout avec sélection de durée prédéfinie
 * - Modal Change Nickname avec validation
 * 
 * Usage:
 * <app-member-action-modals
 *   [member]="selectedMember"
 *   (onKick)="handleKick($event)"
 *   (onBan)="handleBan($event)"
 *   (onTimeout)="handleTimeout($event)"
 *   (onNicknameChange)="handleNicknameChange($event)"
 * />
 */
@Component({
  selector: 'app-member-action-modals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    CheckboxModule,
    AvatarModule,
    DividerModule
  ],
  template: `
    <!-- ============================================ -->
    <!-- MODAL: KICK MEMBER -->
    <!-- ============================================ -->
    <p-dialog
      [(visible)]="showKickModal"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="true"
      [style]="{ width: '90vw', maxWidth: '500px' }"
      header="Expulser le membre"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center gap-3">
          <i class="pi pi-sign-out text-red-500 text-2xl"></i>
          <span class="font-semibold text-xl">Expulser le membre</span>
        </div>
      </ng-template>

      @if (member()) {
        <div class="flex flex-col gap-4 py-4">
          <!-- Member Info -->
          <div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
            <p-avatar
              [image]="member()!.guildAvatarUrl || member()!.avatarUrl"
              shape="circle"
              size="large"
            />
            <div>
              <div class="font-semibold">{{ member()!.displayName }}</div>
              <div class="text-sm text-muted-color">@{{ member()!.username }}</div>
            </div>
          </div>

          <!-- Reason Input -->
          <div class="flex flex-col gap-2">
            <label for="kick-reason" class="font-medium">
              Raison <span class="text-muted-color">(optionnelle)</span>
            </label>
            <textarea
              id="kick-reason"
              pTextarea
              [(ngModel)]="kickReason"
              placeholder="Ex: Comportement inapproprié, spam..."
              rows="3"
              class="w-full"
            ></textarea>
            <small class="text-muted-color">
              Cette raison sera visible dans les logs d'audit de Discord
            </small>
          </div>

          <!-- Warning -->
          <div class="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <i class="pi pi-exclamation-triangle text-orange-500 mt-1"></i>
            <div class="text-sm">
              <strong>Attention :</strong> Le membre sera retiré du serveur mais pourra revenir via une invitation.
            </div>
          </div>
        </div>
      }

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="Annuler"
            severity="secondary"
            [text]="true"
            (onClick)="closeKickModal()"
          />
          <p-button
            label="Expulser"
            severity="danger"
            icon="pi pi-sign-out"
            (onClick)="confirmKick()"
            [loading]="isKicking()"
          />
        </div>
      </ng-template>
    </p-dialog>

    <!-- ============================================ -->
    <!-- MODAL: BAN MEMBER -->
    <!-- ============================================ -->
    <p-dialog
      [(visible)]="showBanModal"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="true"
      [style]="{ width: '90vw', maxWidth: '500px' }"
      header="Bannir le membre"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center gap-3">
          <i class="pi pi-times-circle text-red-600 text-2xl"></i>
          <span class="font-semibold text-xl">Bannir le membre</span>
        </div>
      </ng-template>

      @if (member()) {
        <div class="flex flex-col gap-4 py-4">
          <!-- Member Info -->
          <div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
            <p-avatar
              [image]="member()!.guildAvatarUrl || member()!.avatarUrl"
              shape="circle"
              size="large"
            />
            <div>
              <div class="font-semibold">{{ member()!.displayName }}</div>
              <div class="text-sm text-muted-color">@{{ member()!.username }}</div>
            </div>
          </div>

          <!-- Reason Input -->
          <div class="flex flex-col gap-2">
            <label for="ban-reason" class="font-medium">
              Raison <span class="text-muted-color">(optionnelle)</span>
            </label>
            <textarea
              id="ban-reason"
              pTextarea
              [(ngModel)]="banReason"
              placeholder="Ex: Violation répétée des règles, comportement toxique..."
              rows="3"
              class="w-full"
            ></textarea>
          </div>

          <!-- Delete Messages Option -->
          <div class="flex flex-col gap-2">
            <label class="font-medium">Supprimer les messages récents</label>
            <div class="flex items-center gap-2">
              <p-checkbox
                [(ngModel)]="banDeleteMessages"
                [binary]="true"
                inputId="ban-delete-msgs"
              />
              <label for="ban-delete-msgs" class="cursor-pointer">
                Supprimer les messages des 7 derniers jours
              </label>
            </div>
            <small class="text-muted-color">
              Les messages du membre dans tous les salons seront supprimés
            </small>
          </div>

          <p-divider />

          <!-- Danger Warning -->
          <div class="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <i class="pi pi-ban text-red-600 mt-1"></i>
            <div class="text-sm">
              <strong>⚠️ Action définitive :</strong> Le membre ne pourra plus rejoindre le serveur sans que son ban soit révoqué.
            </div>
          </div>
        </div>
      }

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="Annuler"
            severity="secondary"
            [text]="true"
            (onClick)="closeBanModal()"
          />
          <p-button
            label="Bannir définitivement"
            severity="danger"
            icon="pi pi-times-circle"
            (onClick)="confirmBan()"
            [loading]="isBanning()"
          />
        </div>
      </ng-template>
    </p-dialog>

    <!-- ============================================ -->
    <!-- MODAL: TIMEOUT MEMBER -->
    <!-- ============================================ -->
    <p-dialog
      [(visible)]="showTimeoutModal"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="true"
      [style]="{ width: '90vw', maxWidth: '500px' }"
      header="Mettre en timeout"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center gap-3">
          <i class="pi pi-ban text-orange-500 text-2xl"></i>
          <span class="font-semibold text-xl">Mettre en timeout</span>
        </div>
      </ng-template>

      @if (member()) {
        <div class="flex flex-col gap-4 py-4">
          <!-- Member Info -->
          <div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
            <p-avatar
              [image]="member()!.guildAvatarUrl || member()!.avatarUrl"
              shape="circle"
              size="large"
            />
            <div>
              <div class="font-semibold">{{ member()!.displayName }}</div>
              <div class="text-sm text-muted-color">@{{ member()!.username }}</div>
            </div>
          </div>

          <!-- Duration Selection -->
          <div class="flex flex-col gap-2">
            <label for="timeout-duration" class="font-medium">Durée du timeout</label>
            <p-select
              [(ngModel)]="selectedTimeoutDuration"
              [options]="timeoutDurations"
              optionLabel="label"
              placeholder="Sélectionner une durée"
              [style]="{ width: '100%' }"
              inputId="timeout-duration"
            >
              <ng-template let-duration #item>
                <div class="flex items-center gap-2">
                  <i [class]="duration.icon"></i>
                  <span>{{ duration.label }}</span>
                </div>
              </ng-template>
            </p-select>
            <small class="text-muted-color">
              Le membre ne pourra ni écrire ni parler pendant cette durée
            </small>
          </div>

          <!-- Reason Input -->
          <div class="flex flex-col gap-2">
            <label for="timeout-reason" class="font-medium">
              Raison <span class="text-muted-color">(optionnelle)</span>
            </label>
            <textarea
              id="timeout-reason"
              pTextarea
              [(ngModel)]="timeoutReason"
              placeholder="Ex: Spam, flood, comportement déplacé..."
              rows="2"
              class="w-full"
            ></textarea>
          </div>

          <!-- Info -->
          <div class="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <i class="pi pi-info-circle text-blue-500 mt-1"></i>
            <div class="text-sm">
              Le timeout peut être retiré manuellement à tout moment. Le membre sera automatiquement débloqué à la fin de la durée.
            </div>
          </div>
        </div>
      }

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="Annuler"
            severity="secondary"
            [text]="true"
            (onClick)="closeTimeoutModal()"
          />
          <p-button
            label="Appliquer le timeout"
            severity="warn"
            icon="pi pi-ban"
            (onClick)="confirmTimeout()"
            [loading]="isTimingOut()"
            [disabled]="!selectedTimeoutDuration"
          />
        </div>
      </ng-template>
    </p-dialog>

    <!-- ============================================ -->
    <!-- MODAL: CHANGE NICKNAME -->
    <!-- ============================================ -->
    <p-dialog
      [(visible)]="showNicknameModal"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="true"
      [style]="{ width: '90vw', maxWidth: '500px' }"
      header="Modifier le pseudo"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center gap-3">
          <i class="pi pi-pencil text-primary text-2xl"></i>
          <span class="font-semibold text-xl">Modifier le pseudo</span>
        </div>
      </ng-template>

      @if (member()) {
        <div class="flex flex-col gap-4 py-4">
          <!-- Member Info -->
          <div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
            <p-avatar
              [image]="member()!.guildAvatarUrl || member()!.avatarUrl"
              shape="circle"
              size="large"
            />
            <div>
              <div class="font-semibold">{{ member()!.displayName }}</div>
              <div class="text-sm text-muted-color">@{{ member()!.username }}</div>
            </div>
          </div>

          <!-- Current Nickname -->
          @if (member()!.nickname) {
            <div class="flex flex-col gap-1">
              <span class="text-sm text-muted-color">Pseudo actuel</span>
              <span class="font-medium">{{ member()!.nickname }}</span>
            </div>
          }

          <!-- New Nickname Input -->
          <div class="flex flex-col gap-2">
            <label for="new-nickname" class="font-medium">
              Nouveau pseudo
            </label>
            <input
              id="new-nickname"
              type="text"
              pInputText
              [(ngModel)]="newNickname"
              placeholder="Laissez vide pour réinitialiser"
              maxlength="32"
              class="w-full"
            />
            <small class="text-muted-color">
              Maximum 32 caractères. Laissez vide pour utiliser le nom d'utilisateur Discord.
            </small>
          </div>

          <!-- Reason Input (optional) -->
          <div class="flex flex-col gap-2">
            <label for="nickname-reason" class="font-medium">
              Raison <span class="text-muted-color">(optionnelle)</span>
            </label>
            <input
              id="nickname-reason"
              type="text"
              pInputText
              [(ngModel)]="nicknameReason"
              placeholder="Ex: Pseudo inapproprié, clarification..."
              class="w-full"
            />
          </div>
        </div>
      }

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="Annuler"
            severity="secondary"
            [text]="true"
            (onClick)="closeNicknameModal()"
          />
          <p-button
            label="Modifier"
            icon="pi pi-check"
            (onClick)="confirmNicknameChange()"
            [loading]="isChangingNickname()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    :host ::ng-deep {
      .p-dialog-header {
        padding: 1.5rem;
      }
      
      .p-dialog-content {
        padding: 0 1.5rem;
      }
      
      .p-dialog-footer {
        padding: 1.5rem;
      }
    }
  `]
})
export class MemberActionModalsComponent {
  // ============================================
  // INPUTS
  // ============================================
  member = input<GuildMemberDTO | null>(null);

  // ============================================
  // OUTPUTS
  // ============================================
  @Output() onKick = new EventEmitter<KickMemberAction>();
  @Output() onBan = new EventEmitter<BanMemberAction>();
  @Output() onTimeout = new EventEmitter<TimeoutMemberAction>();
  @Output() onNicknameChange = new EventEmitter<NicknameChangeAction>();

  // ============================================
  // MODAL VISIBILITY
  // ============================================
  showKickModal = signal(false);
  showBanModal = signal(false);
  showTimeoutModal = signal(false);
  showNicknameModal = signal(false);

  // ============================================
  // LOADING STATES
  // ============================================
  isKicking = signal(false);
  isBanning = signal(false);
  isTimingOut = signal(false);
  isChangingNickname = signal(false);

  // ============================================
  // FORM DATA
  // ============================================
  
  // Kick
  kickReason = '';

  // Ban
  banReason = '';
  banDeleteMessages = false;

  // Timeout
  timeoutReason = '';
  selectedTimeoutDuration: TimeoutDurationOption | null = null;
  
  timeoutDurations: TimeoutDurationOption[] = [
    { label: '5 minutes', value: 5, icon: 'pi pi-clock' },
    { label: '10 minutes', value: 10, icon: 'pi pi-clock' },
    { label: '30 minutes', value: 30, icon: 'pi pi-clock' },
    { label: '1 heure', value: 60, icon: 'pi pi-clock' },
    { label: '6 heures', value: 360, icon: 'pi pi-clock' },
    { label: '12 heures', value: 720, icon: 'pi pi-clock' },
    { label: '1 jour', value: 1440, icon: 'pi pi-calendar' },
    { label: '3 jours', value: 4320, icon: 'pi pi-calendar' },
    { label: '1 semaine', value: 10080, icon: 'pi pi-calendar' }
  ];

  // Nickname
  newNickname = '';
  nicknameReason = '';

  // ============================================
  // PUBLIC METHODS - OPEN MODALS
  // ============================================

  openKickModal(): void {
    this.kickReason = '';
    this.showKickModal.set(true);
  }

  openBanModal(): void {
    this.banReason = '';
    this.banDeleteMessages = false;
    this.showBanModal.set(true);
  }

  openTimeoutModal(): void {
    this.timeoutReason = '';
    this.selectedTimeoutDuration = null;
    this.showTimeoutModal.set(true);
  }

  openNicknameModal(): void {
    this.newNickname = this.member()?.nickname || '';
    this.nicknameReason = '';
    this.showNicknameModal.set(true);
  }

  // ============================================
  // PUBLIC METHODS - CLOSE MODALS
  // ============================================

  closeKickModal(): void {
    this.showKickModal.set(false);
    this.isKicking.set(false);
  }

  closeBanModal(): void {
    this.showBanModal.set(false);
    this.isBanning.set(false);
  }

  closeTimeoutModal(): void {
    this.showTimeoutModal.set(false);
    this.isTimingOut.set(false);
  }

  closeNicknameModal(): void {
    this.showNicknameModal.set(false);
    this.isChangingNickname.set(false);
  }

  // ============================================
  // PUBLIC METHODS - CONFIRM ACTIONS
  // ============================================

  confirmKick(): void {
    const member = this.member();
    if (!member) return;

    this.isKicking.set(true);

    this.onKick.emit({
      memberId: member.id,
      reason: this.kickReason || undefined
    });
  }

  confirmBan(): void {
    const member = this.member();
    if (!member) return;

    this.isBanning.set(true);

    this.onBan.emit({
      memberId: member.id,
      reason: this.banReason || undefined,
      deleteMessageDays: this.banDeleteMessages ? 7 : 0
    });
  }

  confirmTimeout(): void {
    const member = this.member();
    if (!member || !this.selectedTimeoutDuration) return;

    this.isTimingOut.set(true);

    // Calculer la date de fin du timeout
    const durationMs = this.selectedTimeoutDuration.value * 60 * 1000;
    const timeoutUntil = new Date(Date.now() + durationMs).toISOString();

    this.onTimeout.emit({
      memberId: member.id,
      duration: timeoutUntil,
      reason: this.timeoutReason || undefined
    });
  }

  confirmNicknameChange(): void {
    const member = this.member();
    if (!member) return;

    this.isChangingNickname.set(true);

    this.onNicknameChange.emit({
      memberId: member.id,
      nickname: this.newNickname,
      reason: this.nicknameReason || undefined
    });
  }

  // ============================================
  // PUBLIC METHODS - RESET LOADING STATES
  // ============================================

  /**
   * Appelé après succès d'une action pour fermer la modal
   */
  resetAndClose(action: 'kick' | 'ban' | 'timeout' | 'nickname'): void {
    switch (action) {
      case 'kick':
        this.closeKickModal();
        break;
      case 'ban':
        this.closeBanModal();
        break;
      case 'timeout':
        this.closeTimeoutModal();
        break;
      case 'nickname':
        this.closeNicknameModal();
        break;
    }
  }

  /**
   * Appelé après échec d'une action pour retirer le loading
   */
  resetLoading(action: 'kick' | 'ban' | 'timeout' | 'nickname'): void {
    switch (action) {
      case 'kick':
        this.isKicking.set(false);
        break;
      case 'ban':
        this.isBanning.set(false);
        break;
      case 'timeout':
        this.isTimingOut.set(false);
        break;
      case 'nickname':
        this.isChangingNickname.set(false);
        break;
    }
  }
}