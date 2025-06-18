// register.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  message: string = '';
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      customField1: [''], // Example custom field
      customField2: ['']  // Another example
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  onSubmit(): void {
    this.message = '';
    this.errorMessage = '';
    if (this.registerForm.valid) {
      const { username, email, password, customField1, customField2 } = this.registerForm.value;
      const userData = {
        username,
        email,
        password,
        customFields: {
          department: customField1, // Map to actual field names for backend
          hireDate: customField2
        }
      };

      this.authService.register(userData).subscribe(
        (res) => {
          this.message = res.message || 'Registration successful! Please check your email for verification.';
          this.registerForm.reset();
        },
        error => {
          this.errorMessage = error.message;
        }
      );
    } else {
      this.errorMessage = 'Please correct the form errors.';
    }
  }
}