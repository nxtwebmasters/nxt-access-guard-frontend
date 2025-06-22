// app/components/admin-panel/admin-panel.component.ts
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { UserService } from '../../services/user.service'; // Assuming you have a UserService
import { AuthService } from '../../services/auth.service'; // Assuming you have an AuthService
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar'; // For displaying messages

// Define the User interface directly within this file, as there is no separate user.model.ts
interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  isVerified: boolean;
  isActive: boolean; // Added isActive based on UserService
  twoFactorEnabled?: boolean; // Optional, as it might not be in all user representations
  twoFactorSecret?: string; // Optional
  customFields?: { [key: string]: any };
}


@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss']
})
export class AdminPanelComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['username', 'email', 'roles', 'isActive', 'isVerified', 'actions'];
  dataSource = new MatTableDataSource<User>([]);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  users: User[] = [];
  selectedUser: User | null = null;
  userEditForm!: FormGroup;

  errorMessage: string = '';
  successMessage: string = '';

  // Mock data for roles and permissions (replace with actual data from backend)
  allRoles: string[] = ['user', 'admin', 'manager', 'editor'];
  allPermissions: string[] = [
    'read:users', 'write:users', 'delete:users',
    'read:sensitive_data', 'manage:products', 'view:reports'
  ];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private snackBar: MatSnackBar // Inject MatSnackBar
  ) {
    this.initUserEditForm();
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  /**
   * Initializes the user edit form with form controls.
   */
  private initUserEditForm(): void {
    this.userEditForm = this.fb.group({
      id: [''],
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      isActive: [false],
      isVerified: [false],
      roles: [[]],
      permissions: [[]],
      customFields: this.fb.group({}) // Nested FormGroup for custom fields
    });
  }

  /**
   * Loads all users from the backend and updates the table data source.
   */
  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users: User[]) => {
        this.users = users;
        this.dataSource.data = this.users; // Update MatTableDataSource
        this.successMessage = 'Users loaded successfully.';
        this.errorMessage = '';
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.errorMessage = 'Failed to load users: ' + (err.error?.message || err.message);
        this.successMessage = '';
      }
    });
  }

  /**
   * Selects a user for editing and populates the form.
   * @param user The user object to be edited.
   */
  onSelectUser(user: User): void {
    this.selectedUser = { ...user }; // Create a copy to prevent direct modification
    this.userEditForm.patchValue({
      id: user.id,
      username: user.username,
      email: user.email,
      isActive: user.isActive,
      isVerified: user.isVerified,
      roles: user.roles || [],
      permissions: user.permissions || []
    });

    // Clear existing custom fields and add new ones
    const customFieldsGroup = this.userEditForm.get('customFields') as FormGroup;
    Object.keys(customFieldsGroup.controls).forEach(key => customFieldsGroup.removeControl(key));
    if (user.customFields) {
      for (const key in user.customFields) {
        if (Object.prototype.hasOwnProperty.call(user.customFields, key)) {
          customFieldsGroup.addControl(key, new FormControl(user.customFields[key]));
        }
      }
    }
    this.errorMessage = ''; // Clear previous errors when selecting a new user
    this.successMessage = '';
  }

  /**
   * Updates the selected user's information.
   */
  onUpdateUser(): void {
    if (this.userEditForm.invalid || !this.selectedUser?.id) {
      this.userEditForm.markAllAsTouched();
      this.snackBar.open('Please correct the form errors.', 'Close', { duration: 3000 });
      return;
    }

    const updatedUser: User = {
      ...this.selectedUser,
      ...this.userEditForm.value,
      customFields: this.userEditForm.get('customFields')?.value || {}
    };

    this.userService.updateUser(updatedUser.id, updatedUser).subscribe({
      next: (res) => {
        this.snackBar.open('User updated successfully!', 'Close', { duration: 3000, panelClass: ['snackbar-success'] });
        this.successMessage = 'User updated successfully!';
        this.errorMessage = '';
        this.loadUsers(); // Reload users to reflect changes
        this.selectedUser = null; // Clear selected user
      },
      error: (err) => {
        console.error('Error updating user:', err);
        this.errorMessage = 'Failed to update user: ' + (err.error?.message || err.message);
        this.snackBar.open('Failed to update user.', 'Close', { duration: 3000, panelClass: ['snackbar-error'] });
        this.successMessage = '';
      }
    });
  }

  /**
   * Deletes a user.
   * @param userId The ID of the user to delete.
   */
  onDeleteUser(userId: string | undefined): void {
    if (!userId) {
      this.errorMessage = 'User ID is missing for deletion.';
      this.snackBar.open(this.errorMessage, 'Close', { duration: 3000 });
      return;
    }

    // A simple confirmation for deletion (can be replaced with MatDialog)
    if (confirm('Are you sure you want to delete this user?')) {
      this.userService.deleteUser(userId).subscribe({
        next: (res) => {
          this.snackBar.open('User deleted successfully!', 'Close', { duration: 3000, panelClass: ['snackbar-success'] });
          this.successMessage = 'User deleted successfully!';
          this.errorMessage = '';
          this.loadUsers(); // Reload users to reflect deletion
          this.selectedUser = null; // Clear selected user if it was the one deleted
        },
        error: (err) => {
          console.error('Error deleting user:', err);
          this.errorMessage = 'Failed to delete user: ' + (err.error?.message || err.message);
          this.snackBar.open('Failed to delete user.', 'Close', { duration: 3000, panelClass: ['snackbar-error'] });
          this.successMessage = '';
        }
      });
    }
  }

  /**
   * Handles changes to user roles.
   * @param role The role being changed.
   * @param event The change event.
   */
  onRoleChange(role: string, event: any): void {
    const roles = this.userEditForm.get('roles')?.value as string[];
    if (event.checked) {
      if (!roles.includes(role)) {
        roles.push(role);
      }
    } else {
      const index = roles.indexOf(role);
      if (index > -1) {
        roles.splice(index, 1);
      }
    }
    this.userEditForm.get('roles')?.setValue(roles);
  }

  /**
   * Handles changes to user permissions.
   * @param permission The permission being changed.
   * @param event The change event.
   */
  onPermissionChange(permission: string, event: any): void {
    const permissions = this.userEditForm.get('permissions')?.value as string[];
    if (event.checked) {
      if (!permissions.includes(permission)) {
        permissions.push(permission);
      }
    } else {
      const index = permissions.indexOf(permission);
      if (index > -1) {
        permissions.splice(index, 1);
      }
    }
    this.userEditForm.get('permissions')?.setValue(permissions);
  }

  /**
   * Adds a new custom field to the user edit form.
   * @param key The key/name of the custom field.
   * @param value The value of the custom field.
   */
  addCustomField(key: string, value: string): void {
    if (key && !this.getCustomFieldControls().contains(key)) {
      (this.userEditForm.get('customFields') as FormGroup).addControl(key, new FormControl(value));
    } else if (key && this.getCustomFieldControls().contains(key)) {
      this.snackBar.open(`Custom field '${key}' already exists.`, 'Close', { duration: 3000, panelClass: ['snackbar-error'] });
    } else {
      this.snackBar.open('Please provide a field name.', 'Close', { duration: 3000, panelClass: ['snackbar-error'] });
    }
  }

  /**
   * Removes a custom field from the user edit form.
   * @param key The key/name of the custom field to remove.
   */
  removeCustomField(key: string): void {
    (this.userEditForm.get('customFields') as FormGroup).removeControl(key);
  }

  /**
   * Helper to get custom field form controls for iteration.
   */
  getCustomFieldControls(): FormGroup {
    return this.userEditForm.get('customFields') as FormGroup;
  }
}
