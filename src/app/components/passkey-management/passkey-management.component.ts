// src/app/components/passkey-management/passkey-management.component.ts

import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';

interface User {
  id: string;
  username: string;
  email: string;
  passkeys?: Passkey[]; // Make sure this is part of the User interface
}

interface Passkey {
  credID: string;
  name?: string; // Optional: A user-given name for the passkey
  createdAt?: Date;
  lastUsedAt?: Date;
  transports?: string[];
}

@Component({
  selector: 'app-passkey-management',
  templateUrl: './passkey-management.component.html',
  styleUrls: ['./passkey-management.component.scss']
})
export class PasskeyManagementComponent implements OnInit {
  currentUser: User | null = null;
  passkeys: Passkey[] = [];
  message: string = '';
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$.pipe(
      filter(user => !!user)
    ).subscribe(user => {
      this.currentUser = user;
      this.passkeys = user?.passkeys || [];
    });
  }

  async registerPasskey(): Promise<void> {
    this.message = '';
    this.errorMessage = '';
    if (!this.currentUser) {
      this.errorMessage = 'You must be logged in to register a passkey.';
      return;
    }

    try {
      // The service call handles startRegistration and finishRegistration
      await this.authService.registerPasskey();
      this.snackBar.open('Passkey registered successfully!', 'Close', { duration: 3000, panelClass: ['snackbar-success'] });
      this.message = 'Passkey registered successfully! Your passkeys list has been updated.';
    } catch (error: any) {
      console.error('Passkey registration error in component:', error);
      this.errorMessage = error.message || 'Failed to register passkey. Please try again.';
      this.snackBar.open(this.errorMessage, 'Close', { duration: 5000, panelClass: ['snackbar-error'] });
    }
  }

  deletePasskey(credID: string): void {
    if (!this.currentUser || !credID) {
      this.errorMessage = 'Invalid request to delete passkey.';
      return;
    }

    if (confirm('Are you sure you want to delete this passkey? You might not be able to log in with it again.')) {
      this.message = '';
      this.errorMessage = '';
      this.authService.deletePasskey(credID).subscribe({
        next: (res) => {
          this.snackBar.open('Passkey deleted successfully!', 'Close', { duration: 3000, panelClass: ['snackbar-success'] });
          this.message = res.message || 'Passkey removed.';
        },
        error: (err) => {
          console.error('Error deleting passkey:', err);
          this.errorMessage = err.message || 'Failed to delete passkey.';
          this.snackBar.open(this.errorMessage, 'Close', { duration: 5000, panelClass: ['snackbar-error'] });
        }
      });
    }
  }

  // Helper to format date if needed
  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }
}