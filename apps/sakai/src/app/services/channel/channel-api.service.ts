import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { 
  GuildChannelDTO,
  CreateChannelDTO,
  ModifyChannelDTO,
  EditChannelPermissionsDTO
} from '@my-project/shared-types';

/**
 * Service API pour les appels HTTP liés aux channels
 * Gère uniquement la communication avec le backend
 * 
 * Endpoints:
 * - GET    /discord/guilds/:guildId/channels
 * - POST   /discord/guilds/:guildId/channels
 * - POST   /discord/guilds/:guildId/channels/:channelId/clone
 * - GET    /discord/channels/:channelId
 * - PATCH  /discord/channels/:channelId
 * - DELETE /discord/channels/:channelId
 * - PUT    /discord/channels/:channelId/permissions/:overwriteId
 * - DELETE /discord/channels/:channelId/permissions/:overwriteId
 */
@Injectable({
  providedIn: 'root'
})
export class ChannelApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/discord`;

  /**
   * Récupère tous les channels d'une guild
   * GET /discord/guilds/:guildId/channels
   */
  getChannels(guildId: string): Observable<GuildChannelDTO[]> {
    return this.http.get<GuildChannelDTO[]>(`${this.baseUrl}/guilds/${guildId}/channels`);
  }

  /**
   * Récupère un channel spécifique
   * GET /discord/channels/:channelId
   */
  getChannel(channelId: string): Observable<GuildChannelDTO> {
    return this.http.get<GuildChannelDTO>(`${this.baseUrl}/channels/${channelId}`);
  }

  /**
   * Crée un nouveau channel
   * POST /discord/guilds/:guildId/channels
   */
  createChannel(guildId: string, data: CreateChannelDTO): Observable<GuildChannelDTO> {
    return this.http.post<GuildChannelDTO>(
      `${this.baseUrl}/guilds/${guildId}/channels`,
      data
    );
  }

  /**
   * Clone un channel existant (crée une copie)
   * POST /discord/guilds/:guildId/channels/:channelId/clone
   */
  cloneChannel(guildId: string, channelId: string): Observable<GuildChannelDTO> {
    return this.http.post<GuildChannelDTO>(
      `${this.baseUrl}/guilds/${guildId}/channels/${channelId}/clone`,
      {}
    );
  }

  /**
   * Modifie un channel existant
   * PATCH /discord/channels/:channelId
   */
  modifyChannel(channelId: string, data: ModifyChannelDTO): Observable<GuildChannelDTO> {
    return this.http.patch<GuildChannelDTO>(
      `${this.baseUrl}/channels/${channelId}`,
      data
    );
  }

  /**
   * Supprime un channel
   * DELETE /discord/channels/:channelId
   */
  deleteChannel(channelId: string, reason?: string): Observable<void> {
    const options = reason ? { 
      headers: { 'X-Audit-Log-Reason': reason }
    } : {};
    
    return this.http.delete<void>(
      `${this.baseUrl}/channels/${channelId}`,
      options
    );
  }

  /**
   * Modifie les permissions d'un channel pour un role/membre
   * PUT /discord/channels/:channelId/permissions/:overwriteId
   */
  editChannelPermissions(
    channelId: string,
    overwriteId: string,
    data: EditChannelPermissionsDTO
  ): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/channels/${channelId}/permissions/${overwriteId}`,
      data
    );
  }

  /**
   * Supprime les permissions d'un channel pour un role/membre
   * DELETE /discord/channels/:channelId/permissions/:overwriteId
   */
  deleteChannelPermission(
    channelId: string,
    overwriteId: string,
    reason?: string
  ): Observable<void> {
    const options = reason ? { 
      headers: { 'X-Audit-Log-Reason': reason }
    } : {};

    return this.http.delete<void>(
      `${this.baseUrl}/channels/${channelId}/permissions/${overwriteId}`,
      options
    );
  }
}