import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { 
  GuildRoleDTO, 
  CreateRoleDTO, 
  ModifyRoleDTO,
  ModifyRolePositionsDTO 
} from '@my-project/shared-types';

/**
 * Service API pour les appels HTTP liés aux rôles
 * Gère uniquement la communication avec le backend
 */
@Injectable({
  providedIn: 'root'
})
export class RoleApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/discord/guilds`;

  /**
   * Récupère tous les rôles d'une guild
   * GET /discord/guilds/:guildId/roles
   */
  getRoles(guildId: string): Observable<GuildRoleDTO[]> {
    return this.http.get<GuildRoleDTO[]>(`${this.baseUrl}/${guildId}/roles`);
  }

  /**
   * Crée un nouveau rôle
   * POST /discord/guilds/:guildId/roles
   */
  createRole(guildId: string, data?: CreateRoleDTO): Observable<GuildRoleDTO> {
    return this.http.post<GuildRoleDTO>(
      `${this.baseUrl}/${guildId}/roles`,
      data || {}
    );
  }

  /**
   * Modifie un rôle existant
   * PATCH /discord/guilds/:guildId/roles/:roleId
   */
  modifyRole(
    guildId: string, 
    roleId: string, 
    data: ModifyRoleDTO
  ): Observable<GuildRoleDTO> {
    return this.http.patch<GuildRoleDTO>(
      `${this.baseUrl}/${guildId}/roles/${roleId}`,
      data
    );
  }

  /**
   * Modifie les positions de plusieurs rôles
   * PATCH /discord/guilds/:guildId/roles
   */
  modifyRolePositions(
    guildId: string, 
    positions: ModifyRolePositionsDTO[]
  ): Observable<GuildRoleDTO[]> {
    return this.http.patch<GuildRoleDTO[]>(
      `${this.baseUrl}/${guildId}/roles`,
      positions
    );
  }

  /**
   * Supprime un rôle
   * DELETE /discord/guilds/:guildId/roles/:roleId
   */
  deleteRole(guildId: string, roleId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${guildId}/roles/${roleId}`
    );
  }

  /**
   * Ajoute un rôle à un membre
   * PUT /discord/guilds/:guildId/members/:userId/roles/:roleId
   */
  addRoleToMember(
    guildId: string,
    userId: string,
    roleId: string,
    reason?: string
  ): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/${guildId}/members/${userId}/roles/${roleId}`,
      { reason }
    );
  }

  /**
   * Retire un rôle d'un membre
   * DELETE /discord/guilds/:guildId/members/:userId/roles/:roleId
   */
  removeRoleFromMember(
    guildId: string,
    userId: string,
    roleId: string,
    reason?: string
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${guildId}/members/${userId}/roles/${roleId}`,
      { body: { reason } }
    );
  }
}