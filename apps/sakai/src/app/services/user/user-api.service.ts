import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { DiscordGuildMemberDTO, DiscordUserGuildDTO } from '@my-project/shared-types';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserApiService {
    private readonly baseUrlDiscord = `${environment.apiUrl}`;
    private http = inject(HttpClient);

    getDiscordUser(): Observable<DiscordGuildMemberDTO> {
      return this.http.get<DiscordGuildMemberDTO>(`${this.baseUrlDiscord}/api/auth/me`);
    }

    getUserGuild(): Observable<DiscordUserGuildDTO[]> {
      return this.http.get<DiscordUserGuildDTO[]>(`${this.baseUrlDiscord}/discord/users/@me/guilds`);
    }
}
