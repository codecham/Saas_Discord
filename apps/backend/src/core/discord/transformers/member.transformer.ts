/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, Logger } from '@nestjs/common';
import {
  DiscordGuildMemberDTO,
  GuildMemberDTO,
} from '@my-project/shared-types';

/**
 * Transformer pour convertir les DTOs Discord bruts en DTOs application enrichis
 *
 * Responsabilités:
 * - Flatten la structure (plus de nested user)
 * - Calculer les champs computed (displayName, isAdmin, etc.)
 * - Générer les URLs CDN complètes
 * - Calculer les permissions et status
 */
@Injectable()
export class MemberTransformer {
  private readonly logger = new Logger(MemberTransformer.name);

  /**
   * Transforme un membre Discord brut en membre enrichi
   *
   * @param raw - DTO Discord brut depuis l'API
   * @param guildId - ID de la guild
   * @param ownerId - ID du propriétaire de la guild
   * @param adminRoleIds - IDs des rôles avec permission ADMINISTRATOR
   * @param moderatorRoleIds - IDs des rôles avec permissions de modération (optionnel)
   */
  transform(
    raw: DiscordGuildMemberDTO,
    guildId: string,
    ownerId: string,
    adminRoleIds: string[] = [],
    moderatorRoleIds: string[] = [],
  ): GuildMemberDTO {
    // Validation
    if (!raw.user) {
      this.logger.warn(`Member without user object in guild ${guildId}`);
      throw new Error('Invalid member: missing user data');
    }

    const user = raw.user;

    // Calculs des status
    const isOwner = user.id === ownerId;
    const isAdmin = isOwner || this.hasAdminRole(raw.roles, adminRoleIds);
    const isModerator =
      isAdmin || this.hasModeratorRole(raw.roles, moderatorRoleIds);
    const isTimedOut = this.checkIsTimedOut(raw.communication_disabled_until);

    return {
      // ===== Identifiants =====
      id: user.id,
      guildId,

      // ===== Identité (flatten depuis user) =====
      username: user.username,
      discriminator: user.discriminator || '0',
      globalName: user.global_name,
      displayName: this.computeDisplayName(raw),

      // ===== Avatars (URLs précomputées) =====
      avatar: user.avatar,
      avatarUrl: this.getAvatarUrl(user.id, user.avatar, user.discriminator),
      guildAvatar: raw.avatar || undefined,
      guildAvatarUrl: raw.avatar
        ? this.getGuildAvatarUrl(guildId, user.id, raw.avatar)
        : undefined,

      // ===== Flags utilisateur =====
      isBot: user.bot || false,
      isSystem: user.system || false,

      // ===== Informations guild =====
      nickname: raw.nick || undefined,
      roles: raw.roles,
      joinedAt: raw.joined_at,
      premiumSince: raw.premium_since || undefined,

      // ===== Permissions & Status (computed) =====
      isOwner,
      isAdmin,
      isModerator,
      permissions: raw.permissions,

      // ===== Modération =====
      isMuted: raw.mute,
      isDeafened: raw.deaf,
      isTimedOut,
      timeoutEndsAt: raw.communication_disabled_until || undefined,

      // ===== Autres =====
      isPending: raw.pending || false,
      flags: raw.flags,
    };
  }

  /**
   * Transforme plusieurs membres en batch (optimisé)
   *
   * @param rawMembers - Array de membres Discord bruts
   * @param guildId - ID de la guild
   * @param ownerId - ID du propriétaire
   * @param adminRoleIds - IDs des rôles admin
   * @param moderatorRoleIds - IDs des rôles modérateur
   */
  transformMany(
    rawMembers: DiscordGuildMemberDTO[],
    guildId: string,
    ownerId: string,
    adminRoleIds: string[] = [],
    moderatorRoleIds: string[] = [],
  ): GuildMemberDTO[] {
    this.logger.debug(
      `Transforming ${rawMembers.length} members for guild ${guildId}`,
    );

    const transformed = rawMembers
      .filter((raw) => raw.user) // Filtrer les membres invalides
      .map((raw) => {
        try {
          return this.transform(
            raw,
            guildId,
            ownerId,
            adminRoleIds,
            moderatorRoleIds,
          );
        } catch (error) {
          this.logger.error(
            `Failed to transform member ${raw.user?.id} in guild ${guildId}:`,
            error,
          );
          return null;
        }
      })
      .filter((member): member is GuildMemberDTO => member !== null);

    this.logger.debug(
      `Successfully transformed ${transformed.length}/${rawMembers.length} members`,
    );

    return transformed;
  }

  // =========================================================================
  // MÉTHODES PRIVÉES - CALCULS
  // =========================================================================

  /**
   * Calcule le nom d'affichage (displayName)
   * Priorité: nickname > globalName > username
   */
  private computeDisplayName(raw: DiscordGuildMemberDTO): string {
    if (raw.nick) {
      return raw.nick;
    }

    if (raw.user?.global_name) {
      return raw.user.global_name;
    }

    return raw.user?.username || 'Unknown User';
  }

  /**
   * Génère l'URL CDN de l'avatar utilisateur
   * Gère les cas: avatar custom, avatar animé, avatar par défaut
   */
  private getAvatarUrl(
    userId: string,
    avatarHash: string | null | undefined,
    discriminator: string | null | undefined,
  ): string {
    // Pas d'avatar custom -> avatar par défaut Discord
    if (!avatarHash) {
      return this.getDefaultAvatarUrl(userId, discriminator);
    }

    // Avatar custom
    const format = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${format}?size=128`;
  }

  /**
   * Génère l'URL de l'avatar par défaut Discord
   * Nouveau système: basé sur (user_id >> 22) % 6
   * Ancien système: discriminator % 5
   */
  private getDefaultAvatarUrl(
    userId: string,
    discriminator: string | null | undefined,
  ): string {
    // Nouveau système (discriminator = "0" ou absent)
    if (!discriminator || discriminator === '0') {
      // Calculer l'index avec BigInt pour éviter les problèmes de précision
      const index = Number((BigInt(userId) >> 22n) % 6n);
      return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    }

    // Ancien système (discriminator présent)
    const index = parseInt(discriminator, 10) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }

  /**
   * Génère l'URL de l'avatar spécifique à la guild (guild avatar)
   */
  private getGuildAvatarUrl(
    guildId: string,
    userId: string,
    guildAvatarHash: string,
  ): string {
    const format = guildAvatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/guilds/${guildId}/users/${userId}/avatars/${guildAvatarHash}.${format}?size=128`;
  }

  /**
   * Vérifie si le membre est en timeout
   */
  private checkIsTimedOut(timeoutEnd?: string | null): boolean {
    if (!timeoutEnd) {
      return false;
    }

    return new Date(timeoutEnd) > new Date();
  }

  /**
   * Vérifie si le membre a un rôle admin
   * Un rôle est admin s'il a la permission ADMINISTRATOR
   */
  private hasAdminRole(
    memberRoleIds: string[],
    adminRoleIds: string[],
  ): boolean {
    return memberRoleIds.some((roleId) => adminRoleIds.includes(roleId));
  }

  /**
   * Vérifie si le membre a un rôle modérateur
   * Un rôle est modérateur s'il a des permissions de modération
   * (KICK_MEMBERS, BAN_MEMBERS, MANAGE_MESSAGES, MODERATE_MEMBERS, etc.)
   */
  private hasModeratorRole(
    memberRoleIds: string[],
    moderatorRoleIds: string[],
  ): boolean {
    return memberRoleIds.some((roleId) => moderatorRoleIds.includes(roleId));
  }

  // =========================================================================
  // MÉTHODES UTILITAIRES PUBLIQUES
  // =========================================================================

  /**
   * Extrait les IDs des rôles admin depuis une liste de rôles complets
   * Utile pour préparer les paramètres de transformation
   *
   * @param roles - Array de rôles Discord complets
   * @returns Array d'IDs de rôles avec permission ADMINISTRATOR
   */
  extractAdminRoleIds(roles: any[]): string[] {
    const ADMINISTRATOR_PERMISSION = 0x0000000000000008n; // 1 << 3

    return roles
      .filter((role) => {
        const permissions = BigInt(role.permissions);
        return (
          (permissions & ADMINISTRATOR_PERMISSION) === ADMINISTRATOR_PERMISSION
        );
      })
      .map((role) => role.id);
  }

  /**
   * Extrait les IDs des rôles modérateur depuis une liste de rôles
   *
   * @param roles - Array de rôles Discord complets
   * @returns Array d'IDs de rôles avec permissions de modération
   */
  extractModeratorRoleIds(roles: any[]): string[] {
    const KICK_MEMBERS = 0x0000000000000002n; // 1 << 1
    const BAN_MEMBERS = 0x0000000000000004n; // 1 << 2
    const MANAGE_MESSAGES = 0x0000000000002000n; // 1 << 13
    const MODERATE_MEMBERS = 0x0010000000000000n; // 1 << 40

    const MODERATOR_PERMISSIONS =
      KICK_MEMBERS | BAN_MEMBERS | MANAGE_MESSAGES | MODERATE_MEMBERS;

    return roles
      .filter((role) => {
        const permissions = BigInt(role.permissions);
        // Si le rôle a AU MOINS une permission de modération
        return (permissions & MODERATOR_PERMISSIONS) !== 0n;
      })
      .map((role) => role.id);
  }
}
