import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import type { TestDto } from '@my-project/shared-types';
import { PrismaService } from './modules/prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getHello(): Promise<TestDto> {
    const userCount: number = await this.prisma.user.count();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const refreshTokenCount: number = await this.prisma.refreshToken.count();

    return {
      id: 1,
      message: `${this.appService.getHello()} - Users: ${userCount}, RefreshTokens: ${refreshTokenCount}`,
      createdAt: new Date(),
    };
  }
}
