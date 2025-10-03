import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthFacadeService } from '../../../services/auth/auth-facade.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      @if (loading) {
        <div class="loading">
          <p>Processing authentication...</p>
        </div>
      } @else if (error) {
        <div class="error">
          <p>Authentication failed: {{ error }}</p>
          <button (click)="goToLogin()">Return to Login</button>
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
      text-align: center;
    }
    .loading, .error {
      padding: 2rem;
    }
    .error {
      color: red;
    }
    button {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
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
      const token = params['token'];
      const refreshToken = params['refresh'];

      if (!token || !refreshToken) {
        throw new Error('Missing tokens in callback URL');
      }

      await this.authFacade.handleOAuthCallback(token, refreshToken);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unknown error';
      this.loading = false;
    }
  }

  goToLogin() {
    // La navigation sera gérée par la facade en cas d'erreur
    window.location.href = '/login';
  }
}