import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';

export interface AppError {
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private readonly messageService = inject(MessageService);

  /**
   * Gère une erreur et l'affiche via PrimeNG Toast
   * @param error L'erreur à gérer
   * @param context Contexte de l'erreur (ex: "Auth", "Guild", "User")
   * @param showToast Afficher ou non le toast (défaut: true)
   * @returns AppError normalisée
   */
  handleError(
    error: any,
    context: string,
    showToast: boolean = true
  ): AppError {
    const appError = this.normalizeError(error, context);

    // Logger l'erreur en console (utile pour le debug)
    console.error(`[${context}] Error:`, {
      message: appError.message,
      code: appError.code,
      details: appError.details,
      originalError: error
    });

    // Afficher le toast si demandé
    if (showToast) {
      this.showErrorToast(appError, context);
    }

    return appError;
  }

  /**
   * Normalise une erreur en AppError
   */
  private normalizeError(error: any, context: string): AppError {
    const timestamp = new Date();

    // Erreur HTTP
    if (error instanceof HttpErrorResponse) {
      return {
        message: this.extractHttpErrorMessage(error),
        code: error.status.toString(),
        details: error.error,
        timestamp
      };
    }

    // Erreur avec message
    if (error?.message) {
      return {
        message: error.message,
        code: error.code || 'UNKNOWN',
        details: error,
        timestamp
      };
    }

    // Erreur string
    if (typeof error === 'string') {
      return {
        message: error,
        code: 'STRING_ERROR',
        timestamp
      };
    }

    // Erreur inconnue
    return {
      message: `Une erreur inattendue est survenue dans ${context}`,
      code: 'UNKNOWN',
      details: error,
      timestamp
    };
  }

  /**
   * Extrait le message d'une HttpErrorResponse
   */
  private extractHttpErrorMessage(error: HttpErrorResponse): string {
    // Message du backend
    if (error.error?.message) {
      return error.error.message;
    }

    // Message d'erreur standard
    if (error.message) {
      return error.message;
    }

    // Fallback selon le status code
    switch (error.status) {
      case 0:
        return 'Impossible de contacter le serveur. Vérifiez votre connexion.';
      case 400:
        return 'Requête invalide. Vérifiez les données envoyées.';
      case 401:
        return 'Non autorisé. Veuillez vous reconnecter.';
      case 403:
        return 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
      case 404:
        return 'Ressource introuvable.';
      case 429:
        return 'Trop de requêtes. Veuillez patienter.';
      case 500:
        return 'Erreur serveur. Veuillez réessayer plus tard.';
      case 503:
        return 'Service temporairement indisponible.';
      default:
        return `Erreur ${error.status}: ${error.statusText}`;
    }
  }

  /**
   * Affiche un toast d'erreur
   */
  private showErrorToast(error: AppError, context: string): void {
    this.messageService.add({
      severity: 'error',
      summary: `Erreur - ${context}`,
      detail: error.message,
      life: 5000,
      sticky: false
    });
  }

  /**
   * Affiche un toast de succès
   */
  showSuccess(message: string, summary: string = 'Succès'): void {
    this.messageService.add({
      severity: 'success',
      summary,
      detail: message,
      life: 3000
    });
  }

  /**
   * Affiche un toast d'information
   */
  showInfo(message: string, summary: string = 'Information'): void {
    this.messageService.add({
      severity: 'info',
      summary,
      detail: message,
      life: 3000
    });
  }

  /**
   * Affiche un toast d'avertissement
   */
  showWarning(message: string, summary: string = 'Attention'): void {
    this.messageService.add({
      severity: 'warn',
      summary,
      detail: message,
      life: 4000
    });
  }
}