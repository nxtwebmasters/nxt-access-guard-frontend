import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    const expectedRoles = route.data['roles'] as Array<string>;

    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user && expectedRoles && expectedRoles.some(role => user.roles.includes(role))) {
          return true; // User has one of the required roles
        } else {
          // User not logged in, or doesn't have the required role
          this.router.navigate(['/dashboard']); // Redirect to a dashboard or unauthorized page
          return false;
        }
      })
    );
  }
}
