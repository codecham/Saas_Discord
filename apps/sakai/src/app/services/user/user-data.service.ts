import { Injectable, signal } from '@angular/core';
import { DiscordUserDto, UserDto } from '@my-project/shared-types';

@Injectable({
  providedIn: 'root'
})
export class UserDataService {

  private readonly _discordUser = signal<DiscordUserDto | null>(null);
  
}
