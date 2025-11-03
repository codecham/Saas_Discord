// apps/sakai/src/app/services/onboarding/onboarding-api.service.ts

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import {
  GuildSetupStatusDto,
  GuildSettingsDto,
  UpdateGuildSettingsDto
} from '@my-project/shared-types';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OnboardingApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/guilds`;

  // ============================================
  // SETUP ENDPOINTS
  // ============================================

  /**
   * Génère l'URL d'invitation Discord
   */
  getInviteUrl(guildId: string): Observable<{ inviteUrl: string }> {
    console.log('[OnboardingApi] Getting invite URL for guild:', guildId);
    return this.http.get<{ inviteUrl: string }>(
      `${this.baseUrl}/${guildId}/setup/invite-url`
    );
  }

  /**
   * Récupère le status du setup (polling)
   */
  getSetupStatus(guildId: string): Observable<GuildSetupStatusDto> {
    console.log('[OnboardingApi] Getting setup status for guild:', guildId);
    return this.http.get<GuildSetupStatusDto>(
      `${this.baseUrl}/${guildId}/setup/status`
    );
  }

  /**
   * Retry un setup échoué
   */
  retrySetup(guildId: string, force: boolean = false): Observable<GuildSetupStatusDto> {
    console.log('[OnboardingApi] Retrying setup for guild:', guildId);
    return this.http.post<GuildSetupStatusDto>(
      `${this.baseUrl}/${guildId}/setup/retry`,
      { force }
    );
  }

  // ============================================
  // SETTINGS ENDPOINTS
  // ============================================

  getSettings(guildId: string): Observable<GuildSettingsDto> {
    return this.http.get<GuildSettingsDto>(
      `${this.baseUrl}/${guildId}/settings`
    );
  }

  updateSettings(
    guildId: string,
    updates: Omit<UpdateGuildSettingsDto, 'guildId'>
  ): Observable<GuildSettingsDto> {
    return this.http.patch<GuildSettingsDto>(
      `${this.baseUrl}/${guildId}/settings`,
      updates
    );
  }
}