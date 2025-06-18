// src/app/components/admin-panel/admin-panel.component.ts
import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
// Import AbstractControl and FormControl
import { FormBuilder, FormGroup, Validators, AbstractControl, FormControl } from '@angular/forms';

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss']
})
export class AdminPanelComponent implements OnInit {
  users: any[] = [];
  errorMessage: string = '';
  successMessage: string = '';

  selectedUser: any = null;
  userEditForm: FormGroup;
  allRoles: string[] = ['user', 'admin', 'editor', 'manager'];
  allPermissions: string[] = ['read:users', 'write:users', 'delete:users', 'read:products', 'write:products', 'delete:data', 'read:sensitive_data']; // Define available permissions

  constructor(
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.userEditForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      isActive: [true],
      isVerified: [false],
      roles: [[]],
      permissions: [[]],
      customFields: this.fb.group({}) // Dynamic custom fields
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.userService.getAllUsers().subscribe(
      (data) => {
        this.users = data;
      },
      (error) => {
        this.errorMessage = error.message || 'Failed to load users.';
      }
    );
  }

  onSelectUser(user: any): void {
    this.selectedUser = { ...user }; // Create a copy to avoid direct mutation
    this.userEditForm.patchValue({
      username: user.username,
      email: user.email,
      isActive: user.isActive,
      isVerified: user.isVerified,
      roles: user.roles || [],
      permissions: user.permissions || [],
    });

    // Dynamically create form controls for custom fields
    const customFieldsGroup = this.fb.group({});
    if (user.customFields) { // Safe check for customFields
      Object.keys(user.customFields).forEach(key => {
        customFieldsGroup.addControl(key, this.fb.control(user.customFields[key]));
      });
    }
    this.userEditForm.setControl('customFields', customFieldsGroup);
  }

  onUpdateUser(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (this.userEditForm.valid && this.selectedUser) {
      const updatedData = {
        ...this.userEditForm.value,
        customFields: this.userEditForm.get('customFields')?.value // Safely access value
      };
      this.userService.updateUser(this.selectedUser.id, updatedData).subscribe(
        () => {
          this.successMessage = 'User updated successfully!';
          this.loadUsers(); // Reload users to reflect changes
          this.selectedUser = null; // Close edit form
        },
        (error) => {
          this.errorMessage = error.message || 'Failed to update user.';
        }
      );
    } else {
      this.errorMessage = 'Please correct the form errors.';
    }
  }

  onDeleteUser(id: string): void {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      this.errorMessage = '';
      this.successMessage = '';
      this.userService.deleteUser(id).subscribe(
        () => {
          this.successMessage = 'User deleted successfully!';
          this.loadUsers();
        },
        (error) => {
          this.errorMessage = error.message || 'Failed to delete user.';
        }
      );
    }
  }

  // Helper for adding/removing roles/permissions
  onRoleChange(role: string, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    // Safely get roles, provide empty array if null
    const currentRoles = this.userEditForm.get('roles')?.value as string[] || [];
    if (isChecked && !currentRoles.includes(role)) {
      this.userEditForm.get('roles')?.setValue([...currentRoles, role]);
    } else if (!isChecked && currentRoles.includes(role)) {
      this.userEditForm.get('roles')?.setValue(currentRoles.filter(r => r !== role));
    }
  }

  onPermissionChange(permission: string, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    // Safely get permissions, provide empty array if null
    const currentPermissions = this.userEditForm.get('permissions')?.value as string[] || [];
    if (isChecked && !currentPermissions.includes(permission)) {
      this.userEditForm.get('permissions')?.setValue([...currentPermissions, permission]);
    } else if (!isChecked && currentPermissions.includes(permission)) {
      this.userEditForm.get('permissions')?.setValue(currentPermissions.filter(p => p !== permission));
    }
  }

  // For adding new custom fields in the edit form
  addCustomField(key: string, value: string): void {
    const customFieldsGroup = this.userEditForm.get('customFields') as FormGroup;
    if (key && !customFieldsGroup.contains(key)) {
      customFieldsGroup.addControl(key, this.fb.control(value));
    }
  }

  removeCustomField(key: string): void {
    const customFieldsGroup = this.userEditForm.get('customFields') as FormGroup;
    if (customFieldsGroup.contains(key)) {
      customFieldsGroup.removeControl(key);
    }
  }

  // Casts AbstractControl to FormControl for template binding
  getCustomFieldControl(control: AbstractControl): FormControl {
    return control as FormControl;
  }

  // Returns the controls of the customFields FormGroup
  getCustomFieldControls(): { [key: string]: AbstractControl } {
    return (this.userEditForm.get('customFields') as FormGroup)?.controls || {};
  }
}