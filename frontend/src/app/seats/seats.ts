import { Component, input } from '@angular/core';
import { Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-seats',
  imports: [],
  templateUrl: './seats.html',
  styleUrl: './seats.scss',
})
export class Seats {

  /** Inputs from parent */
  @Input() bookedSeats: number[] = [];

  /** Output to parent */
  @Output() seatsSelected = new EventEmitter<number[]>();

  /** Internal state */
  selectedSeats: number[] = [];

  /** Generated seat layout */
  seatRows = this.generateSeatRows();

  private generateSeatRows() {
    const rows: { left: number[]; right: number[] }[] = [];
    let seatNumber = 1;

    for (let i = 0; i < 10; i++) {
      rows.push({
        left: [seatNumber++, seatNumber++],
        right: [seatNumber++, seatNumber++]
      });
    }
    return rows;
  }

  /** Last column (5 seats) */
  lastRowSeats = [41, 42, 43, 44, 45];

  toggleSeat(seat: number) {
    if (this.bookedSeats.includes(seat)) return;

    if (this.selectedSeats.includes(seat)) {
      this.selectedSeats = this.selectedSeats.filter(s => s !== seat);
    } else {
      this.selectedSeats = [...this.selectedSeats, seat];
    }

    /** emit to parent */
    this.seatsSelected.emit(this.selectedSeats);

  }

  isBooked(seat: number) {
    return this.bookedSeats.includes(seat);
  }

  isSelected(seat: number) {
    return this.selectedSeats.includes(seat);
  }
}
