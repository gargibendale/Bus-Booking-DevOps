import { Component, effect, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BusService } from '../bus-service';
import { Ticket } from '../ticket';
import { DatePipe } from '@angular/common';
import { StatusEnum } from '../ticket';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-ticket-details',
  imports: [DatePipe],
  templateUrl: './ticket-details.html',
  styleUrl: './ticket-details.scss',
})
export class TicketDetails implements OnInit {

  private route = inject(ActivatedRoute);
  private busService = inject(BusService);
  private router = inject(Router)
  private snackBar = inject(MatSnackBar);

  ticket: Ticket | null = null;
  loading = false;
  error: string | null = null;
  showCancelModal = false;
  canCancel = true;

  ngOnInit() {

    const ticketId = this.route.snapshot.paramMap.get('ticket_id');
    if (ticketId) {
      this.fetchTicket(ticketId);
    }
  }

  isPastTravelDate(): boolean {
    if (!this.ticket?.travel_date) return false;

    // Convert travel_date to Date object
    const travelDate = new Date(this.ticket.travel_date);

    // Remove time from today (so only date is compared)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return travelDate < today;
  }



  fetchTicket(ticketId: string) {
    this.loading = true;
    this.error = null;

    this.busService.fetchTicketById(ticketId).subscribe({
      next: (data) => {
        this.ticket = data;
        console.log(this.ticket);
        console.log(this.ticket.bus);
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load ticket details';
        this.snackBar.open(
          `Failed to load details: ${err.error.detail}`,
          'OK',
          {
            duration: 3000,
            panelClass: ['error-snackbar']
          }
        );
        this.loading = false;
      }
    });
  }

  formatTime(time: string | undefined): string {
    if (!time) return '';

    const [hourStr, minuteStr] = time.split(':');
    let hour = Number(hourStr);
    const minute = minuteStr;

    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;

    return `${hour}:${minute} ${ampm}`;
  }

  confirmCancel() {
    if (!this.ticket?.ticket_id) return;
    this.showCancelModal = false;

    this.busService.cancelTicket(this.ticket.ticket_id).subscribe({
      next: () => {
        console.log("Ticket cancelled:", this.ticket?.ticket_id);

        this.snackBar.open(
          `Ticked cancelled successfully`,
          'OK',
          {
            duration: 3000,
            panelClass: ['success-snackbar']
          }
        );

        this.loading = false;

        this.ticket!.status = StatusEnum.cancelled;

        this.router.navigate(['/bookinghistory']);
      },
      error: (err) => {
        console.error("Cancellation failed", err);
        this.snackBar.open(
          `Cancellation failed: ${err.error.detail}`,
          'OK',
          {
            duration: 3000,
            panelClass: ['error-snackbar']
          }
        );
        this.loading = false;
        this.error = "Failed to cancel ticket. Please try again.";
      }
    });
  }

}
