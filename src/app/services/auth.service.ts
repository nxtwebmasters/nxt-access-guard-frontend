import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

// Import the WebAuthn client library
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';

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
  passkeys?: Passkey[];
}

interface Passkey {
  credID: string;
  publicKey?: string;
  // You might add more properties if your backend sends them and they're useful
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api/auth';
  private userSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadCurrentUser();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('iam_token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private saveToken(token: string, user: User): void {
    localStorage.setItem('iam_token', token);
    this.userSubject.next(user);
  }

  private removeToken(): void {
    localStorage.removeItem('iam_token');
  }

  private loadCurrentUser(): void {
    const token = localStorage.getItem('iam_token');
    if (token) {
      this.verifyToken().subscribe(
        (userFromBackend: any) => {
          this.userSubject.next(userFromBackend.user);
        },
        error => {
          console.error('Failed to verify token on load:', error);
          this.logout();
        }
      );
    }
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData).pipe(
      catchError(this.handleError)
    );
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((res: any) => {
        this.saveToken(res.token, res.user);
      }),
      catchError(this.handleError)
    );
  }

  verifyToken(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/verify-token`, { headers: this.getAuthHeaders() }).pipe(
      tap((res: any) => {
        this.userSubject.next(res.user);
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

  // --- 2FA Methods ---
  generate2FASecret(): Observable<any> {
    return this.http.post(`${this.apiUrl}/2fa/generate-secret`, {}, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  verifyAndEnable2FA(otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/2fa/verify-and-enable`, { otp }, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
        this.verifyToken().subscribe();
      }),
      catchError(this.handleError)
    );
  }

  disable2FA(): Observable<any> {
    return this.http.post(`${this.apiUrl}/2fa/disable`, {}, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
        this.verifyToken().subscribe();
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Helper function to conditionally convert ArrayBuffer to Base64URL string.
   * If input is already a string, it's returned as-is.
   * If input is ArrayBuffer, it's converted.
   * If input is null/undefined, it's returned as-is.
   */
  private convertBufferToBase64url(value: string | ArrayBuffer | null | undefined): string | null {
    if (value === null || typeof value === 'undefined') {
      return null;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (value instanceof ArrayBuffer) {
      return btoa(String.fromCharCode(...new Uint8Array(value)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, ''); // Remove padding
    }
    console.warn('Unexpected type for conversion to Base64URL:', typeof value, value);
    return null; // Or throw an error depending on desired strictness
  }


  async registerPasskey(): Promise<any> {
    try {
      const options = await this.http.post<any>(`${this.apiUrl}/passkey/register/start`, {}, { headers: this.getAuthHeaders() }).toPromise();

      if (!options) {
        throw new Error('Failed to get passkey registration options from backend.');
      }

      const attestationResponseFromBrowser = await startRegistration(options);

      // ***** THIS IS THE CRITICAL CHANGE *****
      const attestationResponseForBackend = {
        id: attestationResponseFromBrowser.id, // <--- Use attestationResponseFromBrowser.id DIRECTLY
        rawId: this.convertBufferToBase64url(attestationResponseFromBrowser.rawId), // <--- Use attestationResponseFromBrowser.rawId and convert it
        response: {
          attestationObject: this.convertBufferToBase64url(attestationResponseFromBrowser.response.attestationObject),
          clientDataJSON: this.convertBufferToBase64url(attestationResponseFromBrowser.response.clientDataJSON),
          transports: attestationResponseFromBrowser.response.transports || [],
        },
        type: attestationResponseFromBrowser.type,
      };

      const backendResponse = await this.http.post<any>(`${this.apiUrl}/passkey/register/finish`, { attestationResponse: attestationResponseForBackend }, { headers: this.getAuthHeaders() }).toPromise();

      this.verifyToken().subscribe();

      return backendResponse;

    } catch (error: any) {
      console.error('Passkey registration failed:', error);
      if (error.name === 'NotAllowedError') {
        throw new Error('Passkey operation cancelled or blocked by user/browser.');
      } else if (error.error && error.error.message) {
        throw new Error(error.error.message);
      }
      throw new Error(error.message || 'Unknown error during passkey registration.');
    }
  }

  async loginWithPasskey(identifier: string): Promise<any> {
    try {
      const options = await this.http.post<any>(`${this.apiUrl}/passkey/login/start`, { identifier }).toPromise();

      if (!options) {
        throw new Error('Failed to get passkey authentication options from backend.');
      }

      const assertionResponseFromBrowser = await startAuthentication(options);

      // The 'id' property from @simplewebauthn/browser should already be a string (base64url).
      // No conversion needed for 'id' here.
      // 'rawId', 'authenticatorData', 'clientDataJSON', 'signature', 'userHandle' are ArrayBuffers and need conversion.
      const assertionResponseForBackend = {
        id: assertionResponseFromBrowser.id, // Directly use 'id' as it should be a string
        rawId: this.convertBufferToBase64url(assertionResponseFromBrowser.rawId),
        response: {
          authenticatorData: this.convertBufferToBase64url(assertionResponseFromBrowser.response.authenticatorData),
          clientDataJSON: this.convertBufferToBase64url(assertionResponseFromBrowser.response.clientDataJSON),
          signature: this.convertBufferToBase64url(assertionResponseFromBrowser.response.signature),
          userHandle: this.convertBufferToBase64url(assertionResponseFromBrowser.response.userHandle),
        },
        type: assertionResponseFromBrowser.type,
      };

      const backendResponse = await this.http.post<any>(`${this.apiUrl}/passkey/login/finish`, { assertionResponse: assertionResponseForBackend }).toPromise();

      this.saveToken(backendResponse.token, backendResponse.user);

      return backendResponse;

    } catch (error: any) {
      console.error('Passkey login failed:', error);
      if (error.name === 'NotAllowedError') {
        throw new Error('Passkey operation cancelled or blocked by user/browser.');
      } else if (error.error && error.error.message) {
        throw new Error(error.error.message);
      }
      throw new Error(error.message || 'Unknown error during passkey login.');
    }
  }

  deletePasskey(credID: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/passkey/${credID}`, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
        this.verifyToken().subscribe();
      }),
      catchError(this.handleError)
    );
  }

  logout(): void {
    this.removeToken();
    this.userSubject.next(null);
    this.router.navigate(['/login']);
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
    console.error('An error occurred:', error.error.message || error.message, error);
    let errorMessage = 'Server error. Please try again later.';
    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return throwError(() => new Error(errorMessage));
  }
}