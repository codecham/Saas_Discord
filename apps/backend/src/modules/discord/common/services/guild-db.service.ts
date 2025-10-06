// apps/backend/src/modules/guilds/guilds-db.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';

@Injectable()
export class GuildsDbService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupère toutes les guilds par leurs IDs Discord
   */
  async findManyByDiscordIds(discordGuildIds: string[]) {
    return this.prisma.guild.findMany({
      where: {
        guildId: {
          in: discordGuildIds,
        },
      },
    });
  }

  /**
   * Vérifie si une guild existe et est active
   */
  async isGuildActive(discordGuildId: string): Promise<boolean> {
    const guild = await this.prisma.guild.findUnique({
      where: { guildId: discordGuildId },
      select: { isActive: true },
    });
    return guild?.isActive ?? false;
  }
}
