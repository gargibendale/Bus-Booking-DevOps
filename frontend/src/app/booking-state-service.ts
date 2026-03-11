import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

//this service is not needed since query params can be used to get travel_date using url
export class BookingStateService {

  private travelDateSubject = new BehaviorSubject<any>(null);
  travelDate$ = this.travelDateSubject.asObservable();

  setTravelDate(date: string) {
    this.travelDateSubject.next(date);
  }

  getTravelDateSnapshot(): string | null {
    return this.travelDateSubject.value;
  }

}
