import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  token: string = '';
  message: string = '';
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmNewPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.token = params['token'];
      if (!this.token) {
        this.errorMessage = 'No reset token found. Please use the link from your email.';
      }
    });
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('newPassword')?.value === form.get('confirmNewPassword')?.value
      ? null : { mismatch: true };
  }

  onSubmit(): void {
    this.message = '';
    this.errorMessage = '';
    if (!this.token) {
      this.errorMessage = 'Invalid or missing reset token.';
      return;
    }

    if (this.resetPasswordForm.valid) {
      this.authService.resetPassword(this.token, this.resetPasswordForm.value.newPassword).subscribe(
        (res) => {
          this.message = res.message || 'Your password has been reset successfully. You can now log in.';
          this.resetPasswordForm.reset();
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000); // Redirect to login after 3 seconds
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
