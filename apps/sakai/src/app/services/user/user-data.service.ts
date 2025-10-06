import { Injectable, signal } from '@angular/core';
import { DiscordGuildMemberDTO, DiscordUserGuildDTO } from '@my-project/shared-types';

@Injectable({
  providedIn: 'root'
})
export class UserDataService {

  private readonly _discordUser = signal<DiscordGuildMemberDTO | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _userGuilds = signal<DiscordUserGuildDTO[] | null>(null);
  private readonly _error = signal<string | null>(null);

  readonly discordUser = this._discordUser.asReadonly();
  readonly userGuilds = this._userGuilds.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // =========================================================================
  // SETTERS
  // =========================================================================
  
  setDiscordUser(discordUser: DiscordGuildMemberDTO | null) {
    this._discordUser.set(discordUser);
  }

  setUserGuild(guilds: DiscordUserGuildDTO[] | null) {
    this._userGuilds.set(guilds);
  }

  setLoading(loading: boolean): void {
    this._isLoading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  clearAll(): void {
    this._discordUser.set(null);
    this._userGuilds.set(null);
    this._isLoading.set(false);
    this._error.set(null);
  }
}
