import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { logger } from './common/logger/winston.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ],
    credentials: true,
  });

  const port = process.env.GATEWAY_PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 Gateway démarrée sur le port ${port}`, 'Bootstrap');
  logger.log(`📡 WebSocket disponible sur ws://localhost:${port}`, 'Bootstrap');
  logger.log(
    `📊 Logs envoyés vers Loki: ${process.env.LOKI_URL || 'http://localhost:3100'}`,
    'Bootstrap',
  );
}

void bootstrap();
