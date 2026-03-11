import { Component, input } from '@angular/core';
import { BusSearchResult } from '../bus-info';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-bus',
  imports: [CommonModule, RouterLink],
  templateUrl: './bus.html',
  styleUrl: './bus.scss',
})
export class Bus {
  busSearchResult = input.required<BusSearchResult>();
  formatDuration(seconds: string): string {
    const hours = Math.floor(Number(seconds) / 3600);
    const minutes = Math.floor((Number(seconds) % 3600) / 60);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;
  }

}
