import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeUrl } from '@angular/platform-browser';

/**
 * Service de sanitization pour protéger contre les attaques XSS
 * 
 * 🔒 QUAND L'UTILISER :
 * - Seulement quand vous utilisez [innerHTML] pour afficher du contenu dynamique
 * - Pour du contenu provenant de sources externes (Discord API, utilisateurs, etc.)
 * 
 * ⚠️ QUAND NE PAS L'UTILISER :
 * - Pour l'interpolation normale {{ }} (Angular protège automatiquement)
 * - Pour [src], [href] standards (Angular protège automatiquement)
 * 
 * @example
 * // Dans votre component
 * export class MessageComponent {
 *   private sanitization = inject(SanitizationService);
 *   
 *   get safeContent(): SafeHtml {
 *     return this.sanitization.sanitizeHtml(this.message.content);
 *   }
 * }
 * 
 * // Dans votre template
 * <div [innerHTML]="safeContent"></div>
 */
@Injectable({
  providedIn: 'root'
})
export class SanitizationService {
  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Sanitize du contenu HTML pour prévenir les attaques XSS
   * 
   * @param content - Le contenu HTML à sanitizer
   * @returns Le contenu sanitizé sécurisé pour l'affichage
   * 
   * @example
   * const safeHtml = this.sanitization.sanitizeHtml('<p>Hello <script>alert("XSS")</script></p>');
   * // Retourne: '<p>Hello </p>' (le script est supprimé)
   */
  sanitizeHtml(content: string | null | undefined): SafeHtml | string {
    if (!content) {
      return '';
    }
    // sanitize() retourne déjà une string sécurisée
    return this.sanitizer.sanitize(1 /* HTML */, content) || '';
  }

  /**
   * Sanitize une URL pour prévenir les attaques XSS via liens malveillants
   * 
   * @param url - L'URL à sanitizer
   * @returns L'URL sanitizée sécurisée
   * 
   * @example
   * const safeUrl = this.sanitization.sanitizeUrl('javascript:alert("XSS")');
   * // Retourne: 'unsafe:javascript:alert("XSS")' (bloquée par Angular)
   */
  sanitizeUrl(url: string | null | undefined): string {
    if (!url) {
      return '';
    }
    return this.sanitizer.sanitize(4 /* URL */, url) || '';
  }

  /**
   * Bypass la sanitization d'Angular pour du HTML de confiance
   * 
   * ⚠️ ATTENTION : N'utilisez cette méthode QUE si vous êtes ABSOLUMENT SÛR
   * que le contenu est sûr et provient d'une source de confiance.
   * 
   * @param content - Le contenu HTML de confiance
   * @returns Le contenu marqué comme sûr
   * 
   * @example
   * // ❌ MAUVAIS : Contenu utilisateur
   * const unsafe = this.sanitization.trustHtml(userInput);
   * 
   * // ✅ BON : Contenu statique de confiance
   * const safe = this.sanitization.trustHtml('<div class="my-safe-html">Trusted</div>');
   */
  trustHtml(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  /**
   * Bypass la sanitization d'Angular pour une URL de confiance
   * 
   * ⚠️ ATTENTION : Utilisez avec précaution
   * 
   * @param url - L'URL de confiance
   * @returns L'URL marquée comme sûre
   */
  trustUrl(url: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }
}