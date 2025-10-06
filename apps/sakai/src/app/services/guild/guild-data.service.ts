import { Injectable, signal, computed } from '@angular/core';
import { DiscordGuildDTO, UserGuildsCategorizedDTO } from '@my-project/shared-types';

@Injectable({
  providedIn: 'root'
})
export class GuildDataService {
  // Signals privés
  private readonly _selectedGuild = signal<DiscordGuildDTO | null>(null);
  private readonly _selectedGuildId = signal<string | null>(null);
  private readonly _userGuildsList = signal<UserGuildsCategorizedDTO | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _isLoadingGuildDetails = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Signals readonly publics
  readonly selectedGuild = this._selectedGuild.asReadonly();
  readonly selectedGuildId = this._selectedGuildId.asReadonly();
  readonly userGuildsList = this._userGuildsList.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isLoadingGuildDetails = this._isLoadingGuildDetails.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signals pour un accès facile
  readonly hasSelectedGuild = computed(() => this._selectedGuild() !== null);
  readonly activeGuilds = computed(() => this._userGuildsList()?.active || []);
  readonly inactiveGuilds = computed(() => this._userGuildsList()?.inactive || []);
  readonly notAddedGuilds = computed(() => this._userGuildsList()?.notAdded || []);
  readonly totalActiveGuilds = computed(() => this.activeGuilds().length);

  // =========================================================================
  // SETTERS
  // =========================================================================

  setSelectedGuild(guild: DiscordGuildDTO | null): void {
    this._selectedGuild.set(guild);
    this._selectedGuildId.set(guild?.id || null);
  }

  setSelectedGuildId(guildId: string | null): void {
    this._selectedGuildId.set(guildId);
  }

  setUserGuildsList(guilds: UserGuildsCategorizedDTO | null): void {
    this._userGuildsList.set(guilds);
  }

  setLoading(loading: boolean): void {
    this._isLoading.set(loading);
  }

  setLoadingGuildDetails(loading: boolean): void {
    this._isLoadingGuildDetails.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  clearAll(): void {
    this._selectedGuild.set(null);
    this._userGuildsList.set(null);
    this._selectedGuildId.set(null);
    this._isLoading.set(false);
    this._isLoadingGuildDetails.set(false);
    this._error.set(null);
  }
}