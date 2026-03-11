import { Component } from '@angular/core';
import { OnInit } from '@angular/core';
import { AuthService } from '../auth-service';
import { BusService } from '../bus-service';
import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Ticket } from '../ticket';
import { Router } from '@angular/router';
import { effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NgClass } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-tickets',
  imports: [DatePipe, NgClass],
  templateUrl: './tickets.html',
  styleUrl: './tickets.scss',
})
export class Tickets {
  private authService = inject(AuthService);
  private busService = inject(BusService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  user = toSignal(this.authService.user$);

  tickets: Ticket[] = [];
  loading = false;
  error: string | null = null;
  user_id = '';
  private userEffect = effect(() => {
    const user = this.user();
    if (!user || this.user_id) return;

    this.user_id = user.uid;
    this.callFetchTickets(this.user_id);
  });
  callFetchTickets(uid: string) {
    this.loading = true;
    this.error = null;

    this.busService.fetchTickets(uid).subscribe({
      next: (tickets) => {
        this.tickets = tickets;
        this.loading = false;

      },
      error: (err) => {
        this.error = 'Failed to load tickets';
        this.snackBar.open(
          `Failed to load tickets: ${err.error.detail}`,
          'OK',
          {
            duration: 3000,
            panelClass: ['error-snackbar']
          }
        );
        this.loading = false;
        console.error(err);
      },
    });
  }

  openTicket(ticket: Ticket) {
    this.router.navigate(['/ticket_details', ticket.ticket_id]);
  }


}
