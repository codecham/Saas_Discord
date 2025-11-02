import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Service de chiffrement/déchiffrement pour les tokens Discord
 * Utilise AES-256-GCM pour une sécurité maximale
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const keyString = this.configService.getOrThrow<string>('ENCRYPTION_KEY');

    if (!keyString) {
      throw new Error(
        "ENCRYPTION_KEY is not defined. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }

    if (keyString.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be 64 characters (32 bytes in hex)');
    }

    this.key = Buffer.from(keyString, 'hex');
    this.logger.log('Encryption service initialized');
  }

  /**
   * Chiffre un texte
   * Format de sortie: iv:authTag:encryptedData (tous en hex)
   */
  encrypt(text: string): string {
    try {
      // Générer un IV aléatoire pour chaque chiffrement
      const iv = crypto.randomBytes(16);

      // Créer le cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      // Chiffrer le texte
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Récupérer l'auth tag pour l'authentification
      const authTag = cipher.getAuthTag();

      // Format: iv:authTag:encryptedData
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Déchiffre un texte chiffré
   * Attend le format: iv:authTag:encryptedData
   */
  decrypt(encryptedText: string): string {
    try {
      // Séparer les composants
      const parts = encryptedText.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, authTagHex, encrypted] = parts;

      // Reconstruire les buffers
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Créer le decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      // Déchiffrer
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Teste le service de chiffrement
   * Utile pour valider que la clé est correcte
   */
  test(): boolean {
    try {
      const testString = 'test-encryption-key';
      const encrypted = this.encrypt(testString);
      const decrypted = this.decrypt(encrypted);

      return testString === decrypted;
    } catch (error) {
      this.logger.error('Encryption test failed', error);
      return false;
    }
  }
}
