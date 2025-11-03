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

/**
 * 🌐 Service API pour l'onboarding des guilds
 * 
 * Responsabilités:
 * - Appels HTTP vers le backend
 * - Gestion des endpoints /guilds/:guildId/setup/*
 * - Gestion des endpoints /guilds/:guildId/settings
 * - Pas de logique métier (juste HTTP)
 * 
 * Pattern: API Layer (uniquement HTTP)
 */
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
   * Récupère le statut du setup d'une guild
   * Utilisé pour le polling pendant le setup
   * 
   * @param guildId - ID de la guild Discord
   * @returns Observable du statut du setup
   */
  getSetupStatus(guildId: string): Observable<GuildSetupStatusDto> {
    return this.http.get<GuildSetupStatusDto>(
      `${this.baseUrl}/${guildId}/setup/status`
    );
  }

  /**
   * Retry un setup qui a échoué
   * 
   * @param guildId - ID de la guild Discord
   * @param force - Forcer le retry même si en cours
   * @returns Observable de la réponse
   */
  retrySetup(guildId: string, force: boolean = false): Observable<GuildSetupStatusDto> {
    return this.http.post<GuildSetupStatusDto>(
      `${this.baseUrl}/${guildId}/setup/retry`,
      { force }
    );
  }

  // ============================================
  // NOTE: Pas de QuickStart dans le backend
  // Le wizard modifie directement les settings après le setup
  // ============================================

  /**
   * Génère l'URL d'invitation Discord OAuth pour ajouter le bot
   * Pré-remplit le guild_id pour une expérience fluide
   * 
   * @param guildId - ID de la guild Discord
   * @returns Observable contenant l'URL d'invitation
   */
  getInviteUrl(guildId: string): Observable<{ inviteUrl: string }> {
    return this.http.get<{ inviteUrl: string }>(
      `${this.baseUrl}/${guildId}/setup/invite-url`
    );
  }

  // ============================================
  // SETTINGS ENDPOINTS
  // ============================================

  /**
   * Récupère les settings d'une guild
   * 
   * @param guildId - ID de la guild Discord
   * @returns Observable des settings
   */
  getSettings(guildId: string): Observable<GuildSettingsDto> {
    return this.http.get<GuildSettingsDto>(
      `${this.baseUrl}/${guildId}/settings`
    );
  }

  /**
   * Met à jour les settings d'une guild (partiel)
   * 
   * @param guildId - ID de la guild Discord
   * @param updates - Settings à mettre à jour
   * @returns Observable des settings mis à jour
   */
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