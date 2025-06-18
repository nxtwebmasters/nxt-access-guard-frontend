// two-factor-auth.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-two-factor-auth',
  templateUrl: './two-factor-auth.component.html',
  styleUrls: ['./two-factor-auth.component.scss']
})
export class TwoFactorAuthComponent implements OnInit {
  currentUser: any;
  secret: string = '';
  qrCodeUrl: string = '';
  otpForm: FormGroup;
  message: string = '';
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] // 6 digit OTP
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.pipe(
      filter(user => !!user)
    ).subscribe(user => {
      this.currentUser = user;
    });
  }

  generateSecret(): void {
    this.message = '';
    this.errorMessage = '';
    this.authService.generate2FASecret().subscribe(
      (res) => {
        this.secret = res.secret;
        this.qrCodeUrl = res.qrCodeUrl;
        this.message = res.message;
      },
      error => {
        this.errorMessage = error.message;
      }
    );
  }

  verifyAndEnable2FA(): void {
    this.message = '';
    this.errorMessage = '';
    if (this.otpForm.valid) {
      this.authService.verifyAndEnable2FA(this.otpForm.value.otp).subscribe(
        (res) => {
          this.message = res.message;
          this.otpForm.reset();
          this.secret = ''; // Clear secret after successful setup
          this.qrCodeUrl = '';
        },
        error => {
          this.errorMessage = error.message;
        }
      );
    } else {
      this.errorMessage = 'Please enter a valid 6-digit OTP.';
    }
  }

  disable2FA(): void {
    if (confirm('Are you sure you want to disable Two-Factor Authentication?')) {
      this.message = '';
      this.errorMessage = '';
      this.authService.disable2FA().subscribe(
        (res) => {
          this.message = res.message;
        },
        error => {
          this.errorMessage = error.message;
        }
      );
    }
  }
}
