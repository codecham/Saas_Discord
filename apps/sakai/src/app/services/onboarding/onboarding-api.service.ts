import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import {
  GuildSetupStatusDto,
  QuickStartOptionsDto,
  QuickStartAnswersDto,
  QuickStartResponseDto,
  GuildSettingsDto,
  UpdateGuildSettingsDto
} from '@my-project/shared-types';
import { Observable } from 'rxjs';

/**
 * Service API pour l'onboarding des guilds
 * 
 * Responsabilités:
 * - Appels HTTP vers le backend
 * - Gestion des endpoints /guilds/:guildId/setup/*
 * - Gestion des endpoints /guilds/:guildId/settings
 * - Pas de logique métier (juste HTTP)
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

  /**
   * Récupère les options pour le Quick Start Wizard
   * Channels disponibles, recommendations, etc.
   * 
   * @param guildId - ID de la guild Discord
   * @returns Observable des options du wizard
   */
  getQuickStartOptions(guildId: string): Observable<QuickStartOptionsDto> {
    return this.http.get<QuickStartOptionsDto>(
      `${this.baseUrl}/${guildId}/setup/quick-start`
    );
  }

  /**
   * Soumet les réponses du Quick Start Wizard
   * Configure les modules et settings selon les choix
   * 
   * @param guildId - ID de la guild Discord
   * @param answers - Réponses du wizard
   * @returns Observable de la réponse avec next steps
   */
  submitQuickStartAnswers(
    guildId: string, 
    answers: QuickStartAnswersDto
  ): Observable<QuickStartResponseDto> {
    return this.http.post<QuickStartResponseDto>(
      `${this.baseUrl}/${guildId}/setup/quick-start`,
      answers
    );
  }

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