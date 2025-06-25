// WinMix Authentication Modal Component

import { storageService } from '@/services/storage';
import { isValidEmail } from '@/utils/helpers';

export class AuthModal {
  private modal: HTMLElement | null = null;
  private isLoginMode = true;

  constructor() {
    this.createModal();
    this.bindEvents();
  }

  private createModal(): void {
    const modalHTML = `
      <div id="authModal" class="modal hidden fixed inset-0 bg-black bg-opacity-50 z-50">
        <div class="modal-content bg-gray-800 p-6 rounded-lg max-w-md mx-auto mt-20">
          <div class="flex justify-between items-center mb-4">
            <h2 id="authTitle" class="text-xl font-bold text-white">Bejelentkezés</h2>
            <button id="closeAuthModal" class="text-gray-400 hover:text-white">
              <i class="ri-close-line text-xl"></i>
            </button>
          </div>
          
          <form id="authForm" class="space-y-4">
            <div id="usernameField" class="hidden">
              <label class="block text-sm font-medium text-gray-300 mb-1">Felhasználónév</label>
              <input 
                type="text" 
                id="username" 
                class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-primary-500"
                required
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input 
                type="email" 
                id="email" 
                class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-primary-500"
                required
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Jelszó</label>
              <input 
                type="password" 
                id="password" 
                class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-primary-500"
                required
              />
            </div>
            
            <div id="confirmPasswordField" class="hidden">
              <label class="block text-sm font-medium text-gray-300 mb-1">Jelszó megerősítése</label>
              <input 
                type="password" 
                id="confirmPassword" 
                class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-primary-500"
              />
            </div>
            
            <div id="errorMessage" class="hidden text-red-400 text-sm"></div>
            
            <button 
              type="submit" 
              id="authSubmit"
              class="w-full bg-primary-500 text-black py-2 rounded font-semibold hover:bg-primary-600 transition-colors"
            >
              Bejelentkezés
            </button>
          </form>
          
          <div class="mt-4 text-center">
            <button id="toggleAuthMode" class="text-primary-500 hover:text-primary-400 text-sm">
              Nincs még fiókod? Regisztrálj!
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('authModal');
  }

  private bindEvents(): void {
    // Close modal
    document.getElementById('closeAuthModal')?.addEventListener('click', () => {
      this.hide();
    });

    // Click outside to close
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });

    // Toggle between login and register
    document.getElementById('toggleAuthMode')?.addEventListener('click', () => {
      this.toggleMode();
    });

    // Form submission
    document.getElementById('authForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }

  private toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    
    const title = document.getElementById('authTitle');
    const usernameField = document.getElementById('usernameField');
    const confirmPasswordField = document.getElementById('confirmPasswordField');
    const submitButton = document.getElementById('authSubmit');
    const toggleButton = document.getElementById('toggleAuthMode');

    if (this.isLoginMode) {
      title!.textContent = 'Bejelentkezés';
      usernameField?.classList.add('hidden');
      confirmPasswordField?.classList.add('hidden');
      submitButton!.textContent = 'Bejelentkezés';
      toggleButton!.textContent = 'Nincs még fiókod? Regisztrálj!';
    } else {
      title!.textContent = 'Regisztráció';
      usernameField?.classList.remove('hidden');
      confirmPasswordField?.classList.remove('hidden');
      submitButton!.textContent = 'Regisztráció';
      toggleButton!.textContent = 'Van már fiókod? Jelentkezz be!';
    }

    this.clearError();
  }

  private handleSubmit(): void {
    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;

    if (!isValidEmail(email)) {
      this.showError('Érvényes email címet adj meg!');
      return;
    }

    if (password.length < 8) {
      this.showError('A jelszónak legalább 8 karakter hosszúnak kell lennie!');
      return;
    }

    if (!this.isLoginMode) {
      const username = (document.getElementById('username') as HTMLInputElement).value;
      const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement).value;

      if (username.length < 3) {
        this.showError('A felhasználónévnek legalább 3 karakter hosszúnak kell lennie!');
        return;
      }

      if (password !== confirmPassword) {
        this.showError('A jelszavak nem egyeznek!');
        return;
      }

      this.register(username, email, password);
    } else {
      this.login(email, password);
    }
  }

  private async login(email: string, password: string): Promise<void> {
    try {
      // Simple client-side auth simulation
      // In a real app, this would be a server call
      const token = this.generateToken(email);
      storageService.setAuthToken(token);
      
      this.showSuccess('Sikeres bejelentkezés!');
      setTimeout(() => {
        this.hide();
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      this.showError('Bejelentkezési hiba!');
    }
  }

  private async register(username: string, email: string, password: string): Promise<void> {
    try {
      // Simple client-side registration simulation
      const token = this.generateToken(email);
      storageService.setAuthToken(token);
      
      this.showSuccess('Sikeres regisztráció!');
      setTimeout(() => {
        this.hide();
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      this.showError('Regisztrációs hiba!');
    }
  }

  private generateToken(email: string): string {
    return btoa(`${email}:${Date.now()}`);
  }

  private showError(message: string): void {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
    }
  }

  private showSuccess(message: string): void {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.className = 'text-green-400 text-sm';
    }
  }

  private clearError(): void {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
      errorDiv.classList.add('hidden');
      errorDiv.className = 'hidden text-red-400 text-sm';
    }
  }

  show(): void {
    this.modal?.classList.remove('hidden');
  }

  hide(): void {
    this.modal?.classList.add('hidden');
    this.clearError();
  }

  isAuthenticated(): boolean {
    return storageService.getAuthToken() !== null;
  }

  logout(): void {
    storageService.clearAuthToken();
    window.location.reload();
  }
}