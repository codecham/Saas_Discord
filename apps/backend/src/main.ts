import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { logger } from './common/logger/winston.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  // 🔒 AJOUT: Support des cookies httpOnly
  app.use(cookieParser());

  // 🔒 AJOUT: Configuration du ValidationPipe global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Supprime les propriétés non déclarées dans le DTO
      forbidNonWhitelisted: true, // Retourne une erreur si propriétés inconnues
      transform: true, // Auto-transformation des types
      transformOptions: {
        enableImplicitConversion: true, // Conversion automatique des types
      },
    }),
  );

  // 🔒 MODIFIÉ: Configuration CORS avec credentials
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true, // ✅ Permettre les cookies cross-origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Backend running on http://localhost:${port}`, 'Bootstrap');
  logger.log('🔒 Cookies support enabled with CORS credentials', 'Bootstrap');
  logger.log('🔒 Global validation pipe enabled', 'Bootstrap');
  logger.log(
    `📊 Logs envoyés vers Loki: ${process.env.LOKI_URL || 'http://localhost:3100'}`,
    'Bootstrap',
  );
}

void bootstrap();
