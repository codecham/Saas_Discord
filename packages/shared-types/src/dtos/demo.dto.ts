export interface HealthCheckDto {
  status: 'ok' | 'error';
  timestamp: Date;
  services: ServiceStatus[];
}

export interface ServiceStatus {
  name: string;
  status: 'ok' | 'error';
  message: string;
  responseTime?: number;
}

export interface DatabaseInfoDto {
  connected: boolean;
  userCount: number;
  accountCount: number;
  lastMigration?: string;
}

export interface SharedTypesTestDto {
  message: string;
  typesWorking: boolean;
  frontend: string;
  backend: string;
}