// apps/sakai/src/app/services/member/member-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { 
  GuildMemberDTO,
  MemberListResponseDTO,
  ModifyGuildMemberDTO,
  CreateGuildBanDTO 
} from '@my-project/shared-types';

/**
 * Service API pour les membres Discord
 * Gère uniquement les appels HTTP vers le backend
 * 
 * Tous les types utilisent maintenant les DTOs enrichis (GuildMemberDTO)
 * au lieu des DTOs Discord bruts (DiscordGuildMemberDTO)
 */
@Injectable({
  providedIn: 'root'
})
export class MemberApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // ============================================
  // LECTURE - GET
  // ============================================

  /**
   * Récupère la liste paginée des membres d'une guild
   * Retourne maintenant MemberListResponseDTO avec métadonnées
   * 
   * @param guildId - ID de la guild
   * @param limit - Nombre de membres à récupérer (défaut: 1000, max: 1000)
   * @param after - Cursor pour pagination (ID du dernier membre)
   */
  getMembers(
    guildId: string, 
    limit: number = 1000, 
    after?: string
  ): Observable<MemberListResponseDTO> {
    let params = new HttpParams().set('limit', limit.toString());
    
    if (after) {
      params = params.set('after', after);
    }

    return this.http.get<MemberListResponseDTO>(
      `${this.apiUrl}/discord/guilds/${guildId}/members`,
      { params }
    );
  }

  /**
   * Recherche des membres par nom d'utilisateur ou pseudo
   * Retourne GuildMemberDTO[] enrichis
   * 
   * @param guildId - ID de la guild
   * @param query - Terme de recherche
   * @param limit - Nombre maximum de résultats (défaut: 100, max: 1000)
   */
  searchMembers(
    guildId: string, 
    query: string, 
    limit: number = 100
  ): Observable<GuildMemberDTO[]> {
    const params = new HttpParams()
      .set('query', query)
      .set('limit', limit.toString());

    return this.http.get<GuildMemberDTO[]>(
      `${this.apiUrl}/discord/guilds/${guildId}/members/search`,
      { params }
    );
  }

  /**
   * Récupère les détails d'un membre spécifique
   * Retourne GuildMemberDTO enrichi
   * 
   * @param guildId - ID de la guild
   * @param userId - ID de l'utilisateur
   */
  getMember(
    guildId: string, 
    userId: string
  ): Observable<GuildMemberDTO> {
    return this.http.get<GuildMemberDTO>(
      `${this.apiUrl}/discord/guilds/${guildId}/members/${userId}`
    );
  }

  // ============================================
  // MODIFICATION - PATCH/PUT
  // ============================================

  /**
   * Modifie un membre (pseudo, rôles, mute, deaf, timeout, etc.)
   * Retourne le membre enrichi modifié
   * 
   * @param guildId - ID de la guild
   * @param userId - ID de l'utilisateur
   * @param data - Données de modification
   * @param reason - Raison de la modification (pour l'audit log Discord)
   */
  modifyMember(
    guildId: string,
    userId: string,
    data: ModifyGuildMemberDTO,
    reason?: string
  ): Observable<GuildMemberDTO> {
    const headers: Record<string, string> = {};
    
    if (reason) {
      headers['X-Audit-Log-Reason'] = reason;
    }

    return this.http.patch<GuildMemberDTO>(
      `${this.apiUrl}/discord/guilds/${guildId}/members/${userId}`,
      data,
      { headers }
    );
  }

  /**
   * Change le pseudo d'un membre
   * 
   * @param guildId - ID de la guild
   * @param userId - ID de l'utilisateur
   * @param nickname - Nouveau pseudo (null pour reset)
   * @param reason - Raison du changement
   */
  changeNickname(
    guildId: string,
    userId: string,
    nickname: string | null,
    reason?: string
  ): Observable<GuildMemberDTO> {
    return this.modifyMember(
      guildId,
      userId,
      { nick: nickname },
      reason
    );
  }

  /**
   * Définit les rôles d'un membre (remplace tous les rôles)
   * 
   * @param guildId - ID de la guild
   * @param userId - ID de l'utilisateur
   * @param roleIds - Array des IDs de rôles
   * @param reason - Raison de la modification
   */
  setMemberRoles(
    guildId: string,
    userId: string,
    roleIds: string[],
    reason?: string
  ): Observable<GuildMemberDTO> {
    return this.modifyMember(
      guildId,
      userId,
      { roles: roleIds },
      reason
    );
  }

  /**
   * Timeout un membre (mute temporaire)
   * 
   * @param guildId - ID de la guild
   * @param userId - ID de l'utilisateur
   * @param until - Date de fin du timeout (ISO string)
   * @param reason - Raison du timeout
   */
  timeoutMember(
    guildId: string,
    userId: string,
    until: string,
    reason?: string
  ): Observable<GuildMemberDTO> {
    return this.http.patch<GuildMemberDTO>(
      `${this.apiUrl}/discord/guilds/${guildId}/members/${userId}/timeout`,
      { until },
      { headers: reason ? { 'X-Audit-Log-Reason': reason } : {} }
    );
  }

  /**
   * Retire le timeout d'un membre
   * 
   * @param guildId - ID de la guild
   * @param userId - ID de l'utilisateur
   * @param reason - Raison
   */
  removeTimeout(
    guildId: string,
    userId: string,
    reason?: string
  ): Observable<GuildMemberDTO> {
    return this.http.delete<GuildMemberDTO>(
      `${this.apiUrl}/discord/guilds/${guildId}/members/${userId}/timeout`,
      { headers: reason ? { 'X-Audit-Log-Reason': reason } : {} }
    );
  }

  // ============================================
  // MODÉRATION - DELETE
  // ============================================

  /**
   * Kick un membre du serveur
   * 
   * @param guildId - ID de la guild
   * @param userId - ID de l'utilisateur
   * @param reason - Raison du kick
   */
  kickMember(
    guildId: string,
    userId: string,
    reason?: string
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/discord/guilds/${guildId}/members/${userId}`,
      { headers: reason ? { 'X-Audit-Log-Reason': reason } : {} }
    );
  }

  /**
   * Ban un membre du serveur
   * 
   * @param guildId - ID de la guild
   * @param userId - ID de l'utilisateur
   * @param data - Options du ban (durée suppression messages, etc.)
   * @param reason - Raison du ban
   */
  banMember(
    guildId: string,
    userId: string,
    data: CreateGuildBanDTO = {},
    reason?: string
  ): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/discord/guilds/${guildId}/bans/${userId}`,
      data,
      { headers: reason ? { 'X-Audit-Log-Reason': reason } : {} }
    );
  }

  /**
   * Unban un membre
   * 
   * @param guildId - ID de la guild
   * @param userId - ID de l'utilisateur
   * @param reason - Raison de l'unban
   */
  unbanMember(
    guildId: string,
    userId: string,
    reason?: string
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/discord/guilds/${guildId}/bans/${userId}`,
      { headers: reason ? { 'X-Audit-Log-Reason': reason } : {} }
    );
  }

  // ============================================
  // VOCAL - Voice State
  // ============================================

  /**
   * Mute un membre en vocal
   * 
   * @param guildId - ID de la guild
   * @param userId - ID de l'utilisateur
   * @param reason - Raison
   */
  muteMember(
    guildId: string,
    userId: string,
    reason?: string
  ): Observable<GuildMemberDTO> {
    return this.modifyMember(
      guildId,
      userId,
      { mute: true },
      reason
    );
  }

  /**
   * Unmute un membre en vocal
   * 
   * @param guildId - ID de la guild
   * @param userId - ID de l'utilisateur
   * @param reason - Raison
   */
  unmuteMember(
    guildId: string,
    userId: string,
    reason?: string
  ): Observable<GuildMemberDTO> {
    return this.modifyMember(
      guildId,
      userId,
      { mute: false },
      reason
    );
  }

  /**
   * Deafen un membre en vocal
   * 
   * @param guildId - ID de la guild
   * @param userId - ID de l'utilisateur
   * @param reason - Raison
   */
  deafenMember(
    guildId: string,
    userId: string,
    reason?: string
  ): Observable<GuildMemberDTO> {
    return this.modifyMember(
      guildId,
      userId,
      { deaf: true },
      reason
    );
  }

  /**
   * Undeafen un membre en vocal
   * 
   * @param guildId - ID de la guild
   * @param userId - ID de l'utilisateur
   * @param reason - Raison
   */
  undeafenMember(
    guildId: string,
    userId: string,
    reason?: string
  ): Observable<GuildMemberDTO> {
    return this.modifyMember(
      guildId,
      userId,
      { deaf: false },
      reason
    );
  }

  /**
   * Déplace un membre vers un channel vocal
   * 
   * @param guildId - ID de la guild
   * @param userId - ID de l'utilisateur
   * @param channelId - ID du channel vocal de destination
   * @param reason - Raison
   */
  moveMember(
    guildId: string,
    userId: string,
    channelId: string,
    reason?: string
  ): Observable<GuildMemberDTO> {
    return this.modifyMember(
      guildId,
      userId,
      { channel_id: channelId },
      reason
    );
  }

  /**
   * Déconnecte un membre du vocal
   * 
   * @param guildId - ID de la guild
   * @param userId - ID de l'utilisateur
   * @param reason - Raison
   */
  disconnectMember(
    guildId: string,
    userId: string,
    reason?: string
  ): Observable<GuildMemberDTO> {
    return this.modifyMember(
      guildId,
      userId,
      { channel_id: null },
      reason
    );
  }
}