// app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service'; // Assuming you have an AuthService
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators'; // Import map operator

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'nxt-access-guard-frontend';
  isAdmin$: Observable<boolean> | undefined;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Corrected to use hasRole from AuthService and map the currentUser$ observable
    this.isAdmin$ = this.authService.currentUser$.pipe(
      map(user => user?.roles.includes('admin') || false)
    );
  }

  // Corrected to use isLoggedIn() from AuthService
  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  // Handle user logout
  logout(): void {
    this.authService.logout(); // Assuming logout() handles token removal and redirect
    this.router.navigate(['/login']);
  }
}
