import { Controller, Get } from '@nestjs/common';
import { DemoService } from './demo.service';
import type {
  HealthCheckDto,
  DatabaseInfoDto,
  SharedTypesTestDto,
} from '@my-project/shared-types';

@Controller('api/demo')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Get('health')
  async getHealthCheck(): Promise<HealthCheckDto> {
    return this.demoService.getHealthCheck();
  }

  @Get('database')
  async getDatabaseInfo(): Promise<DatabaseInfoDto> {
    return this.demoService.getDatabaseInfo();
  }

  @Get('shared-types')
  getSharedTypesTest(): SharedTypesTestDto {
    return this.demoService.getSharedTypesTest();
  }
}
