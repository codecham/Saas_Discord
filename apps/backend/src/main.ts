import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  console.log(
    `🚀 Backend running on https://855e70039085.ngrok-free.app and http://localhost:${port}`,
  );
  console.log('🔒 Cookies support enabled with CORS credentials');
  console.log('🔒 Global validation pipe enabled');
}

void bootstrap();
