/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsString, Length, Matches } from 'class-validator';

/**
 * DTO pour l'échange de session OAuth
 *
 * 🔒 Validation stricte:
 * - Le sessionId doit être exactement 64 caractères hexadécimaux
 * - Format: [a-f0-9]{64}
 */
export class ExchangeSessionDTO {
  @IsString({ message: 'Le sessionId doit être une chaîne de caractères' })
  @Length(64, 64, {
    message: 'Le sessionId doit faire exactement 64 caractères',
  })
  @Matches(/^[a-f0-9]{64}$/, {
    message:
      'Le sessionId doit contenir uniquement des caractères hexadécimaux (0-9, a-f)',
  })
  sessionId!: string;
}
