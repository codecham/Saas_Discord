import { Injectable, signal } from '@angular/core';
import { DiscordUserDto, UserDto } from '@my-project/shared-types';

@Injectable({
  providedIn: 'root'
})
export class UserDataService {

  private readonly _discordUser = signal<DiscordUserDto | null>(null);
  private readonly _user = signal<UserDto | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly discordUser = this._discordUser.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // =========================================================================
  // SETTERS
  // =========================================================================
  
  setDiscordUser(discordUser: DiscordUserDto | null) {
    this._discordUser.set(discordUser);
  }

  setUser(user: UserDto | null): void {
    this._user.set(user);
  }

  setLoading(loading: boolean): void {
    this._isLoading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  clearAll(): void {
    this._discordUser.set(null);
    this._user.set(null);
    this._isLoading.set(false);
    this._error.set(null);
  }
}
