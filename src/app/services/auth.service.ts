import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  isVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  customFields?: { [key: string]: any };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/auth'; // Replace with your backend URL
  private userSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadCurrentUser();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('iam_token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private saveToken(token: string): void {
    localStorage.setItem('iam_token', token);
  }

  private removeToken(): void {
    localStorage.removeItem('iam_token');
  }

  private loadCurrentUser(): void {
    const token = localStorage.getItem('iam_token');
    if (token) {
      this.verifyToken().subscribe(
        user => this.userSubject.next(user),
        error => {
          console.error('Failed to verify token on load:', error);
          this.logout(); // Clear invalid token
        }
      );
    }
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData).pipe(
      tap((res: any) => {
        // Registration doesn't auto-login if email verification is enabled
        // this.saveToken(res.token);
        // this.userSubject.next(res.user);
      }),
      catchError(this.handleError)
    );
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((res: any) => {
        this.saveToken(res.token);
        this.userSubject.next(res.user);
      }),
      catchError(this.handleError)
    );
  }

  verifyToken(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/verify-token`, { headers: this.getAuthHeaders() }).pipe(
      tap((res: any) => {
        this.userSubject.next(res.user); // Update user if token is valid
      }),
      catchError(this.handleError)
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email }).pipe(
      catchError(this.handleError)
    );
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password/${token}`, { newPassword }).pipe(
      catchError(this.handleError)
    );
  }

  // 2FA Methods (conceptual, requires 'otpauth' library on frontend for real generation/verification)
  generate2FASecret(): Observable<any> {
    return this.http.post(`${this.apiUrl}/2fa/generate-secret`, {}, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  verifyAndEnable2FA(otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/2fa/verify-and-enable`, { otp }, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
        // Update user state to reflect 2FA enabled
        const currentUser = this.userSubject.getValue();
        if (currentUser) {
          this.userSubject.next({ ...currentUser, twoFactorEnabled: true });
        }
      }),
      catchError(this.handleError)
    );
  }

  disable2FA(): Observable<any> {
    return this.http.post(`${this.apiUrl}/2fa/disable`, {}, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
        // Update user state to reflect 2FA disabled
        const currentUser = this.userSubject.getValue();
        if (currentUser) {
          this.userSubject.next({ ...currentUser, twoFactorEnabled: false, twoFactorSecret: undefined }); // Clear secret locally
        }
      }),
      catchError(this.handleError)
    );
  }


  logout(): void {
    this.removeToken();
    this.userSubject.next(null);
    this.router.navigate(['/login']); // Redirect to login page
  }

  hasRole(role: string): boolean {
    const user = this.userSubject.getValue();
    return user ? user.roles.includes(role) : false;
  }

  hasPermission(permission: string): boolean {
    const user = this.userSubject.getValue();
    return user ? user.permissions.includes(permission) : false;
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('iam_token');
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error.error.message || error.message);
    return throwError(() => new Error(error.error.message || 'Server error'));
  }
}
