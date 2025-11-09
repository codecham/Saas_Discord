import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { DiscordGuildDTO, UserGuildsCategorizedDTO } from '@my-project/shared-types';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GuildApiService {
  private readonly baseUrlDiscord = `${environment.apiUrl}`;
  private http = inject(HttpClient);

  getUserGuildList(): Observable<UserGuildsCategorizedDTO> {
    return this.http.get<UserGuildsCategorizedDTO>(`${this.baseUrlDiscord}/discord/users/@me/guilds/categorized`);
  }

  getGuild(guildId: string): Observable<DiscordGuildDTO> {
    return this.http.get<DiscordGuildDTO>(`${this.baseUrlDiscord}/discord/guilds/${guildId}`);
  }
}
