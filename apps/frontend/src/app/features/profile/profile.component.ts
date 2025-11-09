// profile.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { UserFacadeService } from '@app/core/services/user/user-facade.service';
import { AuthFacadeService } from '@app/core/services/auth/auth-facade.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule,
    DividerModule,
    SkeletonModule,
    ConfirmDialogModule,
    TooltipModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="max-w-5xl mx-auto p-4 md:p-8">
      <p-confirmDialog />
      
      <!-- Loading State -->
      <div *ngIf="isLoading()" class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8">
        <div class="flex flex-col items-center gap-4">
          <p-skeleton shape="circle" size="8rem" />
          <p-skeleton width="200px" height="2rem" styleClass="mb-2" />
          <p-skeleton width="150px" height="1.5rem" />
        </div>
      </div>

      <!-- Profile Content -->
      <div *ngIf="!isLoading() && user()" class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <!-- Header -->
        <div class="p-6 md:p-8 border-b border-gray-200 dark:border-gray-700">
          <div class="flex flex-col md:flex-row justify-between gap-6">
            <div class="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
              <img 
                [src]="avatar()" 
                [alt]="displayName() + ' avatar'"
                class="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-primary-500 object-cover shadow-lg"
              />
              <div class="flex flex-col items-center md:items-start gap-2">
                <h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  {{ displayName() }}
                </h1>
                <p class="text-lg text-gray-600 dark:text-gray-400">
                  {{ userTag() }}
                </p>
                <p-tag 
                  [value]="role()" 
                  [severity]="role() === 'ADMIN' ? 'danger' : 'info'"
                  styleClass="mt-1"
                />
              </div>
            </div>
            
            <div class="flex justify-center md:justify-end">
              <p-button 
                icon="pi pi-sign-out" 
                label="Logout"
                severity="danger"
                (onClick)="confirmLogout($event)"
                [outlined]="true"
              />
            </div>
          </div>
        </div>

        <!-- Account Information -->
        <div class="p-6 md:p-8">
          <h2 class="flex items-center gap-3 text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            <i class="pi pi-user text-primary-500"></i>
            Account Information
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Discord ID -->
            <div 
              (click)="copyToClipboard(discordId()!, 'Discord ID')" 
              pTooltip="Click to copy"
              class="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div class="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
                <i class="pi pi-id-card text-primary-500"></i>
                Discord ID
              </div>
              <div class="text-base font-medium text-gray-900 dark:text-white break-all">
                {{ discordId() }}
              </div>
            </div>

            <!-- Email -->
            <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
                <i class="pi pi-envelope text-primary-500"></i>
                Email
              </div>
              <div class="text-base font-medium text-gray-900 dark:text-white break-all">
                {{ email() || 'Not provided' }}
              </div>
            </div>

            <!-- Role -->
            <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
                <i class="pi pi-shield text-primary-500"></i>
                Role
              </div>
              <div class="text-base font-medium text-gray-900 dark:text-white">
                {{ role() }}
              </div>
            </div>

            <!-- Member Since -->
            <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
                <i class="pi pi-calendar text-primary-500"></i>
                Member Since
              </div>
              <div class="text-base font-medium text-gray-900 dark:text-white">
                {{ createdAt() | date:'medium' }}
              </div>
            </div>

            <!-- Last Login -->
            <div *ngIf="lastLoginAt()" class="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
                <i class="pi pi-clock text-primary-500"></i>
                Last Login
              </div>
              <div class="text-base font-medium text-gray-900 dark:text-white">
                {{ lastLoginAt() | date:'medium' }}
              </div>
            </div>
          </div>
        </div>

        <div class="px-6 md:px-8">
          <p-divider />
        </div>

        <!-- Discord Profile -->
        <div class="p-6 md:p-8">
          <h2 class="flex items-center gap-3 text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            <i class="pi pi-discord text-primary-500"></i>
            Discord Profile
          </h2>
          
          <div class="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <!-- Profile Preview -->
            <div class="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <img 
                [src]="avatar()" 
                [alt]="displayName()"
                class="w-16 h-16 rounded-full object-cover"
              />
              <div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ displayName() }}
                </h3>
                <p class="text-gray-600 dark:text-gray-400">
                  {{ userTag() }}
                </p>
              </div>
            </div>
            
            <!-- Discord Details -->
            <div class="space-y-3">
              <div class="flex justify-between items-center py-2">
                <span class="font-semibold text-gray-600 dark:text-gray-400">Username:</span>
                <span class="text-gray-900 dark:text-white">{{ username() }}</span>
              </div>
              
              <div *ngIf="discriminator() && discriminator() !== '0'" class="flex justify-between items-center py-2 border-t border-gray-200 dark:border-gray-700">
                <span class="font-semibold text-gray-600 dark:text-gray-400">Discriminator:</span>
                <span class="text-gray-900 dark:text-white">#{{ discriminator() }}</span>
              </div>
              
              <div *ngIf="globalName()" class="flex justify-between items-center py-2 border-t border-gray-200 dark:border-gray-700">
                <span class="font-semibold text-gray-600 dark:text-gray-400">Display Name:</span>
                <span class="text-gray-900 dark:text-white">{{ globalName() }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="!isLoading() && !user()" class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
        <i class="pi pi-exclamation-circle text-6xl text-red-500 mb-4"></i>
        <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Failed to Load Profile</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">Unable to retrieve your profile information.</p>
        <p-button 
          label="Retry" 
          icon="pi pi-refresh" 
          (onClick)="userFacade.initializeUserService()"
        />
      </div>
    </div>
  `
})
export class ProfileComponent {
  readonly userFacade = inject(UserFacadeService);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly user = this.userFacade.user;
  readonly isLoading = this.userFacade.isLoading;
  readonly avatar = this.userFacade.avatar;
  readonly displayName = this.userFacade.displayName;
  readonly userTag = this.userFacade.userTag;
  readonly discordId = this.userFacade.discordId;
  readonly email = this.userFacade.email;
  readonly role = this.userFacade.role;
  readonly createdAt = this.userFacade.createdAt;
  readonly lastLoginAt = this.userFacade.lastLoginAt;
  readonly username = this.userFacade.username;
  readonly discriminator = this.userFacade.discriminator;
  readonly globalName = this.userFacade.globalName;

  confirmLogout(event: Event): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Are you sure you want to log out?',
      header: 'Logout Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.logout();
      }
    });
  }

  private async logout(): Promise<void> {
    try {
      await this.authFacade.logout();
      this.messageService.add({
        severity: 'success',
        summary: 'Logged Out',
        detail: 'You have been successfully logged out.',
        life: 3000
      });
      await this.router.navigate(['/auth/login']);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to logout. Please try again.',
        life: 3000
      });
    }
  }

  copyToClipboard(value: string, label: string): void {
    navigator.clipboard.writeText(value);
    this.messageService.add({
      severity: 'success',
      summary: 'Copied',
      detail: `${label} copied to clipboard`,
      life: 2000
    });
  }
}