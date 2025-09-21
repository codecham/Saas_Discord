import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  HealthCheckDto,
  DatabaseInfoDto,
  SharedTypesTestDto,
  ServiceStatus,
} from '@my-project/shared-types';

@Injectable()
export class DemoService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealthCheck(): Promise<HealthCheckDto> {
    const startTime = Date.now();
    const services: ServiceStatus[] = [];

    // Test base de données
    try {
      await this.prisma.user.count();
      services.push({
        name: 'PostgreSQL',
        status: 'ok',
        message: 'Connection successful',
        responseTime: Date.now() - startTime,
      });
    } catch (error) {
      services.push({
        name: 'PostgreSQL',
        status: 'error',
        message: `Connection failed: ${(error as Error).message}`,
      });
    }

    // Test des types partagés
    services.push({
      name: 'Shared Types',
      status: 'ok',
      message: 'TypeScript types working correctly',
    });

    const allOk = services.every(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (service: ServiceStatus) => service.status === 'ok',
    );

    return {
      status: allOk ? 'ok' : 'error',
      timestamp: new Date(),
      services,
    };
  }

  async getDatabaseInfo(): Promise<DatabaseInfoDto> {
    try {
      const userCount = await this.prisma.user.count();
      const accountCount = await this.prisma.account.count();

      return {
        connected: true,
        userCount,
        accountCount,
      };
    } catch {
      return {
        connected: false,
        userCount: 0,
        accountCount: 0,
      };
    }
  }

  getSharedTypesTest(): SharedTypesTestDto {
    return {
      message:
        'Les types partagés fonctionnent correctement entre frontend et backend',
      typesWorking: true,
      frontend: 'Angular 20',
      backend: 'NestJS 10+',
    };
  }
}
