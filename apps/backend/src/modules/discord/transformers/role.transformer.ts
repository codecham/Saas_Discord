/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, Logger } from '@nestjs/common';
import { DiscordRoleDTO, GuildRoleDTO } from '@my-project/shared-types';

/**
 * Transformer pour convertir les rôles Discord bruts en rôles enrichis
 *
 * Responsabilités:
 * - Calculer les champs computed (colorHex, isAdmin, isEveryone)
 * - Générer les URLs CDN pour les icônes de rôles
 * - Aplatir et enrichir les données
 */
@Injectable()
export class RoleTransformer {
  private readonly logger = new Logger(RoleTransformer.name);
  private readonly CDN_BASE = 'https://cdn.discordapp.com';

  /**
   * Transforme un rôle Discord brut en rôle enrichi
   *
   * @param raw - DTO Discord brut depuis l'API
   * @param guildId - ID de la guild
   * @param memberCount - Nombre de membres ayant ce rôle (optionnel)
   */
  transform(
    raw: DiscordRoleDTO,
    guildId: string,
    memberCount?: number,
  ): GuildRoleDTO {
    const colorHex = this.colorToHex(raw.color);
    const isAdmin = this.checkIsAdmin(raw.permissions);
    const isEveryone = raw.id === guildId; // Le rôle @everyone a le même ID que la guild
    const iconUrl = raw.icon
      ? this.getRoleIconUrl(raw.id, raw.icon)
      : undefined;

    return {
      // ===== Identifiants =====
      id: raw.id,
      guildId,

      // ===== Informations de base =====
      name: raw.name,
      color: raw.color,
      colorHex,
      position: raw.position,
      permissions: raw.permissions,

      // ===== Flags =====
      isManaged: raw.managed,
      isMentionable: raw.mentionable,
      isHoisted: raw.hoist,

      // ===== Icône =====
      icon: raw.icon ?? undefined,
      iconUrl,

      // ===== Computed =====
      isAdmin,
      isEveryone,
      memberCount,
    };
  }

  /**
   * Transforme plusieurs rôles en batch
   *
   * @param rawRoles - Array de rôles Discord bruts
   * @param guildId - ID de la guild
   * @param memberCounts - Map optionnelle des counts par roleId
   */
  transformMany(
    rawRoles: DiscordRoleDTO[],
    guildId: string,
    memberCounts?: Map<string, number>,
  ): GuildRoleDTO[] {
    this.logger.debug(
      `Transforming ${rawRoles.length} roles for guild ${guildId}`,
    );

    const transformed = rawRoles
      .map((raw) => {
        try {
          const memberCount = memberCounts?.get(raw.id);
          return this.transform(raw, guildId, memberCount);
        } catch (error) {
          this.logger.error(
            `Failed to transform role ${raw.id} in guild ${guildId}:`,
            error,
          );
          return null;
        }
      })
      .filter((role): role is GuildRoleDTO => role !== null);

    this.logger.debug(
      `Successfully transformed ${transformed.length}/${rawRoles.length} roles`,
    );

    return transformed;
  }

  // =========================================================================
  // MÉTHODES PRIVÉES - CALCULS
  // =========================================================================

  /**
   * Convertit une couleur décimale en hex (#RRGGBB)
   */
  private colorToHex(color: number): string {
    if (color === 0) {
      return '#000000';
    }
    return `#${color.toString(16).padStart(6, '0').toUpperCase()}`;
  }

  /**
   * Vérifie si un rôle a la permission ADMINISTRATOR
   */
  private checkIsAdmin(permissions: string): boolean {
    const ADMINISTRATOR_PERMISSION = 0x0000000000000008n; // 1 << 3
    const perms = BigInt(permissions);
    return (perms & ADMINISTRATOR_PERMISSION) === ADMINISTRATOR_PERMISSION;
  }

  /**
   * Génère l'URL CDN pour l'icône d'un rôle
   */
  private getRoleIconUrl(roleId: string, iconHash: string): string {
    return `${this.CDN_BASE}/role-icons/${roleId}/${iconHash}.png`;
  }
}
