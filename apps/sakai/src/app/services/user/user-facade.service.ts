import { inject, Injectable } from '@angular/core';
import { UserDataService } from './user-data.service';
import { UserApiService } from './user-api.service';
import { DiscordUserDto, UserDto } from '@my-project/shared-types';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserFacadeService {
  private readonly userData = inject(UserDataService);
  private readonly userApi = inject(UserApiService);

  readonly user = this.userData.user;
  readonly discordUser = this.userData.discordUser;
  readonly isLoading = this.userData.isLoading;


  /**
   * Initialise le user service
   */
  async initializeUserService() {
    this.userData.setLoading(true);
    try {
      const user: UserDto = await firstValueFrom(this.userApi.getUser());
      const discordUser: DiscordUserDto = await firstValueFrom(this.userApi.getDiscordUser());
      this.setUser(user);
      this.setDiscordUser(discordUser);
    } catch (error: any) {
        this.clearUserData();
        throw error;
    } finally {
      this.userData.setLoading(false);
    }
  }

  /**
   * Définit l'utilisateur (appelé par AuthFacadeService après login)
   */
  setUser(user: UserDto | null): void {
    this.userData.setUser(user);
  }

  /**
   * Définit le profil Discord (appelé par AuthFacadeService après login)
   */
  setDiscordUser(discordUser: DiscordUserDto | null): void {
    this.userData.setDiscordUser(discordUser);
  }


  /**
   * Nettoie toutes les données (appelé par AuthFacadeService au logout)
   */
  clearUserData(): void {
    this.userData.clearAll();
  }

  
}
