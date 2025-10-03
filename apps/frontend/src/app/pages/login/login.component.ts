import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthFacadeService } from '@app/services/auth/auth-facade.service';
import { LoginDto } from '@my-project/shared-types';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly authFacade = inject(AuthFacadeService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // ===== SIGNAUX POUR L'ÉTAT LOCAL =====
  showPassword = signal(false);
  availableProviders = signal<string[]>([]);

  // ===== SIGNAUX DE LA FAÇADE =====
  isLoading = this.authFacade.isLoading;
  error = this.authFacade.error;

  // ===== FORMULAIRE =====
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor() {
    this.loadAvailableProviders();
  }

  // ===== GETTERS POUR LE TEMPLATE =====
  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  get isFormValid() {
    return this.loginForm.valid;
  }

  // ===== MÉTHODES D'AUTHENTIFICATION =====

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const credentials: LoginDto = this.loginForm.value;
    
    try {
      await this.authFacade.login(credentials);
      // La redirection est gérée automatiquement par la façade
    } catch (error) {
      // L'erreur est gérée automatiquement par la façade
      console.error('Erreur lors de la connexion:', error);
    }
  }

  loginWithGoogle(): void {
    this.authFacade.loginWithGoogle();
  }

  loginWithDiscord(): void {
    this.authFacade.loginWithDiscord();
  }

  // ===== MÉTHODES UTILITAIRES =====

  togglePasswordVisibility(): void {
    this.showPassword.update(current => !current);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  private async loadAvailableProviders(): Promise<void> {
    try {
      const providers = await this.authFacade.getAvailableProviders();
      this.availableProviders.set(providers);
    } catch (error) {
      console.warn('Impossible de charger les providers OAuth:', error);
    }
  }

  // ===== VALIDATION HELPERS POUR LE TEMPLATE =====

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    
    if (field?.errors) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} est requis`;
      }
      if (field.errors['email']) {
        return 'Format d\'email invalide';
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} doit contenir au moins ${field.errors['minlength'].requiredLength} caractères`;
      }
    }
    
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      email: 'L\'email',
      password: 'Le mot de passe'
    };
    return labels[fieldName] || fieldName;
  }
}
