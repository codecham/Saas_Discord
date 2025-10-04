import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { DiscordUserDto, UserDto } from '@my-project/shared-types';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserApiService {
    private readonly baseUrl = `${environment.apiUrl}/api/auth`; // Ajuste selon ton config
    private readonly baseUrlDiscord = `${environment.apiUrl}/api/discord`;
    private http = inject(HttpClient);


    getUser(): Observable<UserDto> {
      return this.http.get<UserDto>(`${this.baseUrl}/profile`);
    }

    getDiscordUser(): Observable<DiscordUserDto> {
      return this.http.get<DiscordUserDto>(`${this.baseUrlDiscord}/user`);
    }
  
}
