// login.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar'; // Import MatSnackBar

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  // New: Identifier for passkey login. Could be the same as general login form, or separate.
  // For simplicity, we'll use the existing identifier field.
  passkeyIdentifier: string = '';


  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar // Inject MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      identifier: ['', Validators.required], // Can be username or email
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    this.errorMessage = '';
    if (this.loginForm.valid) {
      this.authService.login(this.loginForm.value).subscribe(
        () => {
          this.router.navigate(['/dashboard']);
        },
        error => {
          this.errorMessage = error.message;
          this.snackBar.open(this.errorMessage, 'Close', { duration: 3000, panelClass: ['snackbar-error'] });
        }
      );
    } else {
      this.errorMessage = 'Please fill in all required fields.';
      this.snackBar.open(this.errorMessage, 'Close', { duration: 3000, panelClass: ['snackbar-error'] });
    }
  }

    // New method for Passkey Login
  async onPasskeyLogin(): Promise<void> {
    this.errorMessage = '';
    // Use the identifier from the form, or prompt user for it if you want passkey-only login
    this.passkeyIdentifier = this.loginForm.get('identifier')?.value;

    if (!this.passkeyIdentifier) {
      this.errorMessage = 'Please enter your username or email to use passkey login.';
      this.snackBar.open(this.errorMessage, 'Close', { duration: 3000, panelClass: ['snackbar-error'] });
      return;
    }

    try {
      await this.authService.loginWithPasskey(this.passkeyIdentifier);
      this.snackBar.open('Logged in with Passkey successfully!', 'Close', { duration: 3000, panelClass: ['snackbar-success'] });
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error('Passkey login failed:', error);
      this.errorMessage = error.message || 'Passkey login failed. Make sure you have a passkey registered for this account.';
      this.snackBar.open(this.errorMessage, 'Close', { duration: 5000, panelClass: ['snackbar-error'] });
    }
  }
}