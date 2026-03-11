import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusService } from '../bus-service';
import { BusSearchResult } from '../bus-info';
import { OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Seats } from '../seats/seats';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { effect } from '@angular/core';
import { AuthService } from '../auth-service';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BusSchedule } from '../bus-schedule';

@Component({
  selector: 'app-bus-details',
  imports: [Seats, ReactiveFormsModule],
  templateUrl: './bus-details.html',
  styleUrl: './bus-details.scss',
})
export class BusDetails implements OnInit {
  private userEffect = effect(() => {
    const user = this.user();
    if (!user) return;
    this.user_id = user.uid;
  });

  private authService = inject(AuthService);
  // Convert Observable to Signal (Modern standard)
  user = toSignal(this.authService.user$);
  user_id = '';
  dateStr = '';

  route: ActivatedRoute = inject(ActivatedRoute);
  router: Router = inject(Router);

  busService: BusService = inject(BusService);
  schedule: BusSchedule | null = null;

  fb: FormBuilder = inject(FormBuilder);

  busSearchResult: BusSearchResult | undefined;

  bookedSeats: number[] = [];
  selectedSeats: number[] = [];

  busId = -1;
  busRoute = '';
  price = 0;
  availableSeats = -1;

  bookingSuccess = false;
  successMessage = '';
  errorMessage = '';

  constructor(private snackBar: MatSnackBar,) {
  }

  passengerForm!: FormGroup;

  get passengers(): FormArray {
    return this.passengerForm.get('passengers') as FormArray;
  }


  ngOnInit() {
    this.busId = Number(this.route.snapshot.params['bus_id']);
    this.dateStr = this.route.snapshot.queryParamMap.get('travelDate')!;

    this.busService.getSchedule(this.busId, this.dateStr)
      .subscribe({
        next: (data) => {
          console.log(data);
          this.schedule = data;
          this.price = data.bus.price;
          this.availableSeats = data.available_seats;
          this.busRoute = data.bus.route;
        },
        error: (err) => {
          this.errorMessage = err.error.detail;
          this.snackBar.open(
            `Failed to get schedule ${this.errorMessage}`,
            'OK',
            {
              duration: 3000,
              panelClass: ['error-snackbar']
            }
          );
          console.log(this.errorMessage);
        }
      });

    if (!this.dateStr) {
      this.router.navigate(['/']);
      return;
    }

    this.busService.fetchSeats(this.busId, this.dateStr).subscribe({
      next: res => this.bookedSeats = res,
      error: err => {
        console.error(err);
        this.snackBar.open(
          `Failed to fetch seats ${err.error?.detail}`,
          'OK',
          {
            duration: 3000,
            panelClass: ['error-snackbar']
          }
        );
        //alert('Failed to fetch seats: ' + err.error?.detail);
      }
    });

    this.passengerForm = this.fb.group({
      passengers: this.fb.array([])
    });

    this.passengerForm.valueChanges.subscribe(() => {
      this.saveDraft();
    });

    this.restoreDraft();
  }



  onSeatsSelected(seats: number[]) {
    // Merge old + new instead of replacing
    const mergedSeats = Array.from(
      new Set([...this.selectedSeats, ...seats])
    );

    this.selectedSeats = mergedSeats;

    // Add missing passenger forms
    while (this.passengers.length < this.selectedSeats.length) {
      this.passengers.push(this.createPassengerGroup());
    }

    // Remove excess passenger forms
    while (this.passengers.length > this.selectedSeats.length) {
      this.passengers.removeAt(this.passengers.length - 1);
    }

    this.saveDraft();
  }


  private createPassengerGroup(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      age: ['', [Validators.required, Validators.min(1)]],
      gender: ['', Validators.required]
    });
  }

  bookTickets() {
    if (this.passengerForm.invalid) {
      this.passengerForm.markAllAsTouched();
      return;
    }

    const passengersPayload = this.passengerForm.value.passengers.map(
      (p: any, index: number) => ({
        name: p.name,
        age: Number(p.age),
        gender: p.gender,
        seat: this.selectedSeats[index]
      })
    );

    const bookingPayload = {
      uid: this.user_id,
      bus_id: this.busId,
      route: this.busRoute,
      travel_date: this.dateStr,
      available: this.availableSeats,
      total_seats: 45,
      amt_paid: this.selectedSeats.length * this.price,
      passengers: passengersPayload
    };

    this.busService.bookTicket(bookingPayload).subscribe({
      next: res => {
        localStorage.removeItem(this.storageKey);

        this.successMessage = 'Tickets booked successfully!';
        this.bookingSuccess = true;

        this.snackBar.open(
          '🎉 Tickets booked successfully!',
          'OK',
          {
            duration: 2000,          // auto close after 2s
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          }
        );

        // navigate after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 2000);

      },
      error: err => {
        console.error('Booking failed', err);
        console.error('FASTAPI DETAIL:', err.error);
        console.error('VALIDATION ERRORS:', err.error?.detail);
        this.snackBar.open(
          `❌ Booking failed. Please try again. ${err.error?.detail}`,
          'Close',
          {
            duration: 3000,
            panelClass: ['error-snackbar']
          }
        );
      }
    });


    return;
  }

  private get storageKey(): string {
    return `booking_draft_${this.busId}_${this.dateStr}`;
  }


  private saveDraft() {
    const draft = {
      selectedSeats: this.selectedSeats,
      passengers: this.passengerForm.value.passengers
    };

    localStorage.setItem(this.storageKey, JSON.stringify(draft));
  }

  private restoreDraft() {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return;

    const draft = JSON.parse(raw);

    if (draft.selectedSeats?.length) {
      // IMPORTANT: clone array to trigger change detection
      this.selectedSeats = [...draft.selectedSeats];

      this.passengers.clear();

      draft.passengers.forEach((p: any) => {
        this.passengers.push(
          this.fb.group({
            name: [p.name, Validators.required],
            age: [p.age, [Validators.required, Validators.min(1)]],
            gender: [p.gender, Validators.required]
          })
        );
      });
    }
  }

  removePassenger(index: number) {
    this.selectedSeats.splice(index, 1);
    this.passengers.removeAt(index);
    this.saveDraft();
  }


}
