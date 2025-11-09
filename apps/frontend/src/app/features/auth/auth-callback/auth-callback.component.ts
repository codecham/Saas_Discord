import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthFacadeService } from '../../../core/services/auth/auth-facade.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      @if (loading) {
        <div class="loading">
          <div class="spinner"></div>
          <p class="mt-4">Authentification en cours...</p>
          <p class="text-sm text-gray-500">Veuillez patienter</p>
        </div>
      } @else if (error) {
        <div class="error">
          <i class="pi pi-exclamation-triangle text-4xl mb-4"></i>
          <p class="font-bold mb-2">Échec de l'authentification</p>
          <p class="text-sm mb-4">{{ error }}</p>
          <button (click)="goToLogin()" class="btn-primary">
            Retourner à la connexion
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      text-align: center;
    }
    
    .loading, .error {
      background: white;
      padding: 3rem;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 400px;
    }
    
    .loading {
      color: #333;
    }
    
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .error {
      color: #e74c3c;
    }
    
    .btn-primary {
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background-color: #667eea;
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 600;
      transition: background-color 0.3s;
    }
    
    .btn-primary:hover {
      background-color: #5568d3;
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authFacade = inject(AuthFacadeService);
  
  loading = true;
  error: string | null = null;

  async ngOnInit() {
    try {
      const params = this.route.snapshot.queryParams;
      
      // 🔒 MODIFIÉ: On récupère maintenant le sessionId au lieu des tokens
      const sessionId = params['session'];

      if (!sessionId) {
        throw new Error('Session ID manquant dans le callback URL');
      }

      // 🔒 MODIFIÉ: Échanger le sessionId contre les tokens
      await this.authFacade.handleOAuthCallback(sessionId);
      
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Erreur inconnue';
      this.loading = false;
    }
  }

  goToLogin() {
    window.location.href = '/auth/login';
  }
}