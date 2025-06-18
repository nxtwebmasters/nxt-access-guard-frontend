import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    return this.authService.currentUser$.pipe(
      take(1), // Take the current value and complete
      map(user => {
        if (user) {
          // If user exists, check if verified (if required for the route)
          // For simplicity, we'll allow all authenticated users, but you could add a
          // `verifiedOnly` data property to routes.
          return true;
        } else {
          // Not logged in, redirect to login page
          return this.router.createUrlTree(['/login']);
        }
      })
    );
  }
}