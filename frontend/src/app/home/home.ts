import { Component, inject } from '@angular/core';
import { Bus } from '../bus/bus';
import { BusSearchResult } from '../bus-info';
import { BusService } from '../bus-service';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-home',
  imports: [Bus, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  busSearchResults: BusSearchResult[] = [];
  busService: BusService = inject(BusService);

  fromLocation: string = '';
  toLocation: string = '';
  travelDate: string = '';
  minDate!: string;
  maxDate!: string;

  constructor(private snackBar: MatSnackBar) {
    const savedParams = localStorage.getItem('busSearchParams');

    if (savedParams) {
      const params = JSON.parse(savedParams);
      this.fromLocation = params.from;
      this.toLocation = params.to;
      this.travelDate = params.date;
    }

    const today = new Date();
    this.minDate = this.formatDate(today);

    // const min = new Date();
    // min.setDate(today.getDate() + 1);
    // this.minDate = this.formatDate(min);

    const max = new Date();
    max.setDate(today.getDate() + 5);
    this.maxDate = this.formatDate(max);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // yyyy-mm-dd
  }


  onSearch() {
    this.busService.lazyLoadSchedule({
      start: this.fromLocation,
      end: this.toLocation,
      date: this.travelDate
    }
    ).subscribe({
      next: (data) => {
        this.busSearchResults = data;
        this.busService.setSearchResults(data);
        this.busService.setSearchParams({
          from: this.fromLocation,
          to: this.toLocation,
          date: this.travelDate
        });

      },
      error: (err) => {
        const message =
          err?.error?.detail?.message ||  // structured error
          err?.error?.detail ||           // simple string error
          "Something went wrong. Please try again.";

        this.snackBar.open(message, "Close", {
          duration: 3000,
          horizontalPosition: "center",
          verticalPosition: "top",
        });
      }
    });
  }

}
