import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { UserDTO, UserGuildsCategorizedDTO } from '@my-project/shared-types';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserApiService {
    private readonly baseUrlDiscord = `${environment.apiUrl}`;
    private http = inject(HttpClient);

    getDiscordUser(): Observable<UserDTO> {
      return this.http.get<UserDTO>(`${this.baseUrlDiscord}/api/auth/me`);
    }

    getUserGuild(): Observable<UserGuildsCategorizedDTO> {
      return this.http.get<UserGuildsCategorizedDTO>(`${this.baseUrlDiscord}/discord/users/@me/guilds/categorized`);
    }
}
