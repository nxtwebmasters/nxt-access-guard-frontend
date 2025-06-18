// src/app/components/profile/profile.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
// Import AbstractControl and FormControl
import { FormBuilder, FormGroup, Validators, AbstractControl, FormControl } from '@angular/forms';
import { filter } from 'rxjs/operators';

interface User {
  username: string;
  email: string;
  customFields?: { [key: string]: any }; // customFields is optional
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  currentUser: any; // Or use the User interface if imported
  profileForm!: FormGroup;
  passwordChangeForm: FormGroup;
  message: string = '';
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.profileForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      customFields: this.fb.group({}) // For dynamic custom fields
    });

    this.passwordChangeForm = this.fb.group({
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmNewPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // This is a placeholder for how you might get your user data.
    // In a real application, this would likely come from a service.
    const user: User | null = this.getLoggedInUser(); // user can be null or User

    // Initialize the form only if user data is available
    if (user) {
      this.profileForm = this.fb.group({
        username: [user.username], // No need for non-null assertion here if 'user' is checked
        email: [user.email],     // No need for non-null assertion here if 'user' is checked
        customFields: this.fb.group({}) // Initialize customFields as an empty FormGroup
      });

      const customFieldsGroup = this.profileForm.get('customFields') as FormGroup;

      // Safely access customFields
      if (user.customFields) { // Safe check for customFields
        Object.keys(user.customFields).forEach(key => {
          // No need for non-null assertion here as customFields is checked
          customFieldsGroup.addControl(key, this.fb.control(user.customFields![key]));
        });
      }
    } else {
      // Handle the case where user is null, e.g., redirect to login or show an error
      console.error('User data not found. Cannot load profile.');
      // Optionally, initialize with default empty values or redirect
      this.profileForm = this.fb.group({
        username: [''],
        email: [''],
        customFields: this.fb.group({})
      });
    }
  }

  // Placeholder for a method that would fetch the user
  private getLoggedInUser(): User | null {
    // In a real app, you'd fetch this from a service, localStorage, etc.
    // For demonstration, let's return a sample user or null
    return {
      username: 'johndoe',
      email: 'john.doe@example.com',
      customFields: {
        occupation: 'Software Engineer',
        city: 'New York'
      }
    };
    // return null; // Uncomment to test the null user scenario
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('newPassword')?.value === form.get('confirmNewPassword')?.value
      ? null : { mismatch: true };
  }

  onUpdateProfile(): void {
    this.message = '';
    this.errorMessage = '';
    if (this.profileForm.valid && this.currentUser) {
      const updatedData = {
        username: this.profileForm.get('username')?.value,
        email: this.profileForm.get('email')?.value,
        customFields: this.profileForm.get('customFields')?.value, // Safely access value
      };
      this.userService.updateUser(this.currentUser.id, updatedData).subscribe(
        () => {
          this.message = 'Profile updated successfully!';
          // Refresh current user data in AuthService
          this.authService.verifyToken().subscribe();
        },
        error => {
          this.errorMessage = error.message;
        }
      );
    } else {
      this.errorMessage = 'Please correct the profile form errors.';
    }
  }

  onChangePassword(): void {
    this.message = '';
    this.errorMessage = '';
    if (this.passwordChangeForm.valid && this.currentUser) {
      const { oldPassword, newPassword } = this.passwordChangeForm.value;
      this.userService.changePassword(this.currentUser.id, { oldPassword, newPassword }).subscribe(
        () => {
          this.message = 'Password changed successfully!';
          this.passwordChangeForm.reset();
          // Optionally log out user to force re-login with new password
          // this.authService.logout();
        },
        error => {
          this.errorMessage = error.message;
        }
      );
    } else {
      this.errorMessage = 'Please correct the password change form errors.';
    }
  }

  // Casts AbstractControl to FormControl for template binding
  getCustomFieldControl(control: AbstractControl): FormControl {
    return control as FormControl;
  }

  // Returns the controls of the customFields FormGroup
  getCustomFieldControls(): { [key: string]: AbstractControl } {
    return (this.profileForm.get('customFields') as FormGroup)?.controls || {};
  }
}