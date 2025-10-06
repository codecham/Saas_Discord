import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GuildStorageService {
  private readonly SELECTED_GUILD_KEY = 'selectedGuildId';

  /**
   * Sauvegarde l'ID de la guild sélectionnée
   */
  setSelectedGuildId(guildId: string): void {
    try {
      localStorage.setItem(this.SELECTED_GUILD_KEY, guildId);
      console.log('[GuildStorage] Saved guild ID:', guildId);
    } catch (error) {
      console.error('[GuildStorage] Failed to save guild ID:', error);
    }
  }

  /**
   * Récupère l'ID de la guild sélectionnée
   */
  getSelectedGuildId(): string | null {
    try {
      const guildId = localStorage.getItem(this.SELECTED_GUILD_KEY);
      console.log('[GuildStorage] Retrieved guild ID:', guildId);
      return guildId;
    } catch (error) {
      console.error('[GuildStorage] Failed to retrieve guild ID:', error);
      return null;
    }
  }

  /**
   * Supprime l'ID de la guild sélectionnée
   */
  clearSelectedGuildId(): void {
    try {
      localStorage.removeItem(this.SELECTED_GUILD_KEY);
      console.log('[GuildStorage] Cleared guild ID');
    } catch (error) {
      console.error('[GuildStorage] Failed to clear guild ID:', error);
    }
  }

  /**
   * Vérifie si une guild est sélectionnée
   */
  hasSelectedGuild(): boolean {
    return this.getSelectedGuildId() !== null;
  }
}