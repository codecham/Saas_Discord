/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard JWT optionnel
 * Permet d'accéder à la route même sans token
 * Utile pour les routes qui changent de comportement selon l'auth
 */
@Injectable()
export class JwtOptionalGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // Retourner null si pas d'utilisateur (au lieu de throw)
    // La route sera accessible mais req.user sera undefined
    return user || null;
  }
}
