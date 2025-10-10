// apps/sakai/src/app/services/member/member-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { 
  DiscordGuildMemberDTO, 
  ModifyGuildMemberDTO,
  CreateGuildBanDTO 
} from '@my-project/shared-types';

/**
 * Service API pour les membres Discord
 * Gère les appels HTTP vers le backend
 */
@Injectable({
  providedIn: 'root'
})
export class MemberApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Récupère la liste des membres d'une guild
   * @param guildId ID de la guild
   * @param limit Nombre maximum de membres à récupérer (défaut: 100, max: 1000)
   * @param after ID du membre après lequel commencer la pagination
   */
  getMembers(
    guildId: string, 
    limit: number = 100, 
    after?: string
  ): Observable<DiscordGuildMemberDTO[]> {
    let params = new HttpParams().set('limit', limit.toString());
    
    if (after) {
      params = params.set('after', after);
    }

    return this.http.get<DiscordGuildMemberDTO[]>(
      `${this.apiUrl}/discord/guilds/${guildId}/members`,
      { params }
    );
  }

  /**
   * Recherche des membres par nom d'utilisateur ou pseudo
   * @param guildId ID de la guild
   * @param query Terme de recherche
   * @param limit Nombre maximum de résultats (défaut: 100, max: 1000)
   */
  searchMembers(
    guildId: string, 
    query: string, 
    limit: number = 100
  ): Observable<DiscordGuildMemberDTO[]> {
    const params = new HttpParams()
      .set('query', query)
      .set('limit', limit.toString());

    return this.http.get<DiscordGuildMemberDTO[]>(
      `${this.apiUrl}/discord/guilds/${guildId}/members/search`,
      { params }
    );
  }

  /**
   * Récupère les détails d'un membre spécifique
   * @param guildId ID de la guild
   * @param userId ID de l'utilisateur
   */
  getMember(guildId: string, userId: string): Observable<DiscordGuildMemberDTO> {
    return this.http.get<DiscordGuildMemberDTO>(
      `${this.apiUrl}/discord/guilds/${guildId}/members/${userId}`
    );
  }

  /**
   * Modifie un membre (pseudo, rôles, mute, deaf, etc.)
   * @param guildId ID de la guild
   * @param userId ID de l'utilisateur
   * @param data Données de modification
   * @param reason Raison de la modification (pour l'audit log)
   */
  modifyMember(
    guildId: string,
    userId: string,
    data: ModifyGuildMemberDTO,
    reason?: string
  ): Observable<DiscordGuildMemberDTO> {
    if (reason) {
      return this.http.patch<DiscordGuildMemberDTO>(
        `${this.apiUrl}/discord/guilds/${guildId}/members/${userId}`,
        data,
        { headers: { 'X-Audit-Log-Reason': reason } }
      );
    }
    
    return this.http.patch<DiscordGuildMemberDTO>(
      `${this.apiUrl}/discord/guilds/${guildId}/members/${userId}`,
      data
    );
  }

  /**
   * Ajoute un rôle à un membre
   * @param guildId ID de la guild
   * @param userId ID de l'utilisateur
   * @param roleId ID du rôle à ajouter
   * @param reason Raison (pour l'audit log)
   */
  addMemberRole(
    guildId: string,
    userId: string,
    roleId: string,
    reason?: string
  ): Observable<void> {
    if (reason) {
      return this.http.put<void>(
        `${this.apiUrl}/discord/guilds/${guildId}/members/${userId}/roles/${roleId}`,
        {},
        { 
          headers: { 'X-Audit-Log-Reason': reason },
          responseType: 'text' as 'json'
        }
      );
    }
    
    return this.http.put<void>(
      `${this.apiUrl}/discord/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      {},
      { responseType: 'text' as 'json' }
    );
  }

  /**
   * Retire un rôle d'un membre
   * @param guildId ID de la guild
   * @param userId ID de l'utilisateur
   * @param roleId ID du rôle à retirer
   * @param reason Raison (pour l'audit log)
   */
  removeMemberRole(
    guildId: string,
    userId: string,
    roleId: string,
    reason?: string
  ): Observable<void> {
    if (reason) {
      return this.http.delete<void>(
        `${this.apiUrl}/discord/guilds/${guildId}/members/${userId}/roles/${roleId}`,
        { 
          headers: { 'X-Audit-Log-Reason': reason },
          responseType: 'text' as 'json'
        }
      );
    }
    
    return this.http.delete<void>(
      `${this.apiUrl}/discord/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      { responseType: 'text' as 'json' }
    );
  }

  /**
   * Met un membre en timeout (mute temporaire)
   * @param guildId ID de la guild
   * @param userId ID de l'utilisateur
   * @param until Date/heure de fin du timeout (ISO 8601)
   * @param reason Raison (pour l'audit log)
   */
  timeoutMember(
    guildId: string,
    userId: string,
    until: string,
    reason?: string
  ): Observable<DiscordGuildMemberDTO> {
    if (reason) {
      return this.http.patch<DiscordGuildMemberDTO>(
        `${this.apiUrl}/discord/guilds/${guildId}/members/${userId}/timeout`,
        { communication_disabled_until: until },
        { headers: { 'X-Audit-Log-Reason': reason } }
      );
    }
    
    return this.http.patch<DiscordGuildMemberDTO>(
      `${this.apiUrl}/discord/guilds/${guildId}/members/${userId}/timeout`,
      { communication_disabled_until: until }
    );
  }

  /**
   * Retire le timeout d'un membre
   * @param guildId ID de la guild
   * @param userId ID de l'utilisateur
   * @param reason Raison (pour l'audit log)
   */
  removeTimeout(
    guildId: string,
    userId: string,
    reason?: string
  ): Observable<DiscordGuildMemberDTO> {
    return this.timeoutMember(guildId, userId, null as any, reason);
  }

  /**
   * Expulse un membre de la guild (kick)
   * @param guildId ID de la guild
   * @param userId ID de l'utilisateur à expulser
   * @param reason Raison (pour l'audit log)
   */
  kickMember(
    guildId: string,
    userId: string,
    reason?: string
  ): Observable<void> {
    if (reason) {
      return this.http.delete<void>(
        `${this.apiUrl}/discord/guilds/${guildId}/members/${userId}`,
        { 
          headers: { 'X-Audit-Log-Reason': reason },
          responseType: 'text' as 'json'
        }
      );
    }
    
    return this.http.delete<void>(
      `${this.apiUrl}/discord/guilds/${guildId}/members/${userId}`,
      { responseType: 'text' as 'json' }
    );
  }

  /**
   * Bannit un membre de la guild
   * @param guildId ID de la guild
   * @param userId ID de l'utilisateur à bannir
   * @param data Options de ban (nombre de jours de messages à supprimer)
   * @param reason Raison (pour l'audit log)
   */
  banMember(
    guildId: string,
    userId: string,
    data: CreateGuildBanDTO = {},
    reason?: string
  ): Observable<void> {
    if (reason) {
      return this.http.put<void>(
        `${this.apiUrl}/discord/guilds/${guildId}/bans/${userId}`,
        data,
        { 
          headers: { 'X-Audit-Log-Reason': reason },
          responseType: 'text' as 'json'
        }
      );
    }
    
    return this.http.put<void>(
      `${this.apiUrl}/discord/guilds/${guildId}/bans/${userId}`,
      data,
      { responseType: 'text' as 'json' }
    );
  }

  /**
   * Révoque le ban d'un utilisateur (unban)
   * @param guildId ID de la guild
   * @param userId ID de l'utilisateur à débannir
   * @param reason Raison (pour l'audit log)
   */
  unbanMember(
    guildId: string,
    userId: string,
    reason?: string
  ): Observable<void> {
    if (reason) {
      return this.http.delete<void>(
        `${this.apiUrl}/discord/guilds/${guildId}/bans/${userId}`,
        { 
          headers: { 'X-Audit-Log-Reason': reason },
          responseType: 'text' as 'json'
        }
      );
    }
    
    return this.http.delete<void>(
      `${this.apiUrl}/discord/guilds/${guildId}/bans/${userId}`,
      { responseType: 'text' as 'json' }
    );
  }
}