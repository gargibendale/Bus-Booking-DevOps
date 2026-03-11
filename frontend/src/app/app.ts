import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Home } from './home/home';
import { RouterLink } from '@angular/router';
import { UserService } from './user-service';
import { Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { AuthService } from './auth-service';
import { take } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, AsyncPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('bus-booking');
  authService: AuthService = inject(AuthService);
  user: any;
  constructor(public userService: UserService, private router: Router) { }

  logout() {
    this.userService.logout();
    this.router.navigate(['/']);
  }

  accessProfile() {
    this.router.navigate(['/profile']);
  }


  accessTicketHistory() {
    this.router.navigate(['/bookinghistory']);
  }


}
