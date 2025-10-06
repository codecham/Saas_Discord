import { computed, inject, Injectable } from '@angular/core';
import { UserDataService } from './user-data.service';
import { UserApiService } from './user-api.service';
import { DiscordGuildMemberDTO, DiscordUserGuildDTO } from '@my-project/shared-types';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserFacadeService {
  private readonly userData = inject(UserDataService);
  private readonly userApi = inject(UserApiService);

  readonly discordUser = this.userData.discordUser;
  readonly userGuilds = this.userData.userGuilds;
  readonly isLoading = this.userData.isLoading;


  readonly user = computed(() => this.discordUser() ?? null);
  readonly guilds = computed(() => this.userGuilds() ?? null);
  // readonly discordId = computed(() => this.discordUser()?.id ?? null);
  // readonly username = computed(() => this.discordUser()?.username ?? null);
  // readonly discriminator = computed(() => this.discordUser()?.discriminator ?? null);
  // readonly globalname = computed(() => this.discordUser()?.globalname ?? null);
  
  // readonly avatar = computed(() => {
  //   const discord = this.discordUser();
  //   if (!discord?.avatar) return '/assets/default-avatar.png';
  //   return `https://cdn.discordapp.com/avatars/${discord.id}/${discord.avatar}.png?size=256`;
  // });
  
  // readonly bannerUrl = computed(() => {
  //   const discord = this.discordUser();
  //   if (!discord?.banner) return null;
  //   return `https://cdn.discordapp.com/banners/${discord.id}/${discord.banner}.png?size=600`;
  // });
  
  // readonly accentColor = computed(() => {
  //   const discord = this.discordUser();
  //   if (!discord?.accent_color) return null;
  //   return `#${discord.accent_color.toString(16).padStart(6, '0')}`;
  // });

  // readonly initials = computed(() => {
  //   const username = this.discordUser()?.username;
  //   if (!username) return 'G';
  //   return username.substring(0, 2).toUpperCase();
  // });

  // readonly locale = computed(() => this.discordUser()?.locale ?? 'en-US');

  // readonly premiumType = computed(() => this.discordUser()?.premium_type ?? 0);
  // readonly hasNitro = computed(() => this.premiumType() > 0);
  // readonly mfaEnabled = computed(() => this.discordUser()?.mfa_enabled ?? false);
  // readonly isVerified = computed(() => this.discordUser()?.verified ?? false);


  // readonly premiumTypeName = computed(() => {
  //   const type = this.premiumType();
  //   switch (type) {
  //     case 1: return 'Nitro Classic';
  //     case 2: return 'Nitro';
  //     case 3: return 'Nitro Basic';
  //     default: return 'None';
  //   }
  // });


  /**
   * Initialise le user service
   */
  async initializeUserService() {
    this.userData.setLoading(true);
    try {
      const discordUser: DiscordGuildMemberDTO = await firstValueFrom(this.userApi.getDiscordUser());
      this.setDiscordUser(discordUser);
    } catch (error: any) {
        this.clearUserData();
        throw error;
    } finally {
      const userGuild: DiscordUserGuildDTO[] = await firstValueFrom(this.userApi.getUserGuild());
      this.setUserGuild(userGuild);
      this.userData.setLoading(false);
      console.log(`User set: ${JSON.stringify(this.user())}`);
      console .log(`Guild set: ${JSON.stringify(this.userGuilds())}`);
    }
  }


  /**
   * Définit le profil Discord (appelé par AuthFacadeService après login)
   */
  setDiscordUser(discordUser: DiscordGuildMemberDTO | null): void {
    this.userData.setDiscordUser(discordUser);
  }

  setUserGuild(guilds: DiscordUserGuildDTO[] | null): void {
    this.userData.setUserGuild(guilds);
  }

  /**
   * Nettoie toutes les données (appelé par AuthFacadeService au logout)
   */
  clearUserData(): void {
    this.userData.clearAll();
  }

  // =========================================================================
  // MÉTHODES UTILITAIRES
  // =========================================================================

  /**
   * Obtient l'URL de l'avatar avec une taille personnalisée
   */
  // getAvatarUrl(size: number = 256): string {
  //   const discord = this.discordUser();
  //   if (!discord?.avatar) return '/assets/default-avatar.png';
  //   return `https://cdn.discordapp.com/avatars/${discord.id}/${discord.avatar}.png?size=${size}`;
  // }

  // /**
  //  * Obtient l'URL de la bannière avec une taille personnalisée
  //  */
  // getBannerUrl(size: number = 600): string | null {
  //   const discord = this.discordUser();
  //   if (!discord?.banner) return null;
  //   return `https://cdn.discordapp.com/banners/${discord.id}/${discord.banner}.png?size=${size}`;
  // }

  
}
