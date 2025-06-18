// dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { map, Observable } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: any; // Or use the User interface
  isAdmin$: Observable<boolean>;
  isManager$: Observable<boolean>;

  constructor(public authService: AuthService) {
    this.isAdmin$ = this.authService.currentUser$.pipe(
      map((user: any) => user ? user.roles.includes('admin') : false)
    );
    this.isManager$ = this.authService.currentUser$.pipe(
      map((user: any) => user ? user.roles.includes('manager') : false)
    );
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  logout(): void {
    this.authService.logout();
  }
}