import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BusSearchResult } from './bus-info';
import { UserService } from './user-service';
import { Ticket } from './ticket';
import { BusSchedule } from './bus-schedule';

@Injectable({
  providedIn: 'root',
})
export class BusService {

  private lastSearchResults: BusSearchResult[] = [];
  private lastSearchParams: { from: string; to: string; date: string } | null = null;
  userService: UserService = inject(UserService);

  setSearchResults(results: BusSearchResult[]) {
    this.lastSearchResults = results;
  }

  getSearchResults(): BusSearchResult[] {
    return this.lastSearchResults;
  }

  setSearchParams(params: { from: string; to: string; date: string }) {
    this.lastSearchParams = params;
    localStorage.setItem('busSearchParams', JSON.stringify(params));
  }

  getSearchParams() {
    const data = localStorage.getItem('busSearchParams');
    return data ? JSON.parse(data) : null;
  }

  apiUrl = "http://localhost:8000/busapp/search";
  seatsUrl = "http://localhost:8000/busapp/fetch_seats";
  bookingUrl = "http://localhost:8000/busapp/book_ticket";
  lazyLoadUrl = "http://localhost:8000/busapp/search_lazy_load";
  fetchTicketsUrl = "http://localhost:8000/busapp/tickets";
  fetchTicketByIDUrl = "http://localhost:8000/busapp/fetch_ticket";
  cancelTicketUrl = "http://localhost:8000/busapp/cancel_ticket";

  constructor(private http: HttpClient) { }

  searchBuses(
    start_loc: string,
    end_loc: string,
    travel_date: string
  ): Observable<BusSearchResult[]> {
    //const headers = this.userService.getAuthHeaders();
    const params = new HttpParams()
      .set('start_loc', start_loc)
      .set('end_loc', end_loc)
      .set('travel_date', travel_date);
    return this.http.get<BusSearchResult[]>(this.apiUrl, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  fetchSeats(bus_id: number, travel_date: string): Observable<number[]> {
    const params = new HttpParams()
      .set('bus_id', bus_id)
      .set('travel_date', travel_date);
    return this.http.get<number[]>(this.seatsUrl, { params });
  }

  bookTicket(bookingPayload: { uid: string; bus_id: number; route: string; travel_date: string; available: number; total_seats: number; amt_paid: number; passengers: any; }) {

    return this.http.post(
      this.bookingUrl,
      bookingPayload
    );

  }

  fetchTickets(uid: string) {
    return this.http
      .get<Ticket[]>(`${this.fetchTicketsUrl}/${uid}`)
      .pipe(catchError(this.handleError));
  }

  fetchTicketById(ticketId: string) {
    return this.http.get<Ticket>(`${this.fetchTicketByIDUrl}/${ticketId}`);
  }

  cancelTicket(tid: string) {
    return this.http.post(
      this.cancelTicketUrl,
      null,   // no body
      {
        params: { tid }  // query parameter
      }
    );
  }

  getSchedule(busId: number, travelDate: string) {
    return this.http.get<BusSchedule>(
      `http://localhost:8000/busapp/schedule/${busId}`,
      { params: { travel_date: travelDate } }
    );
  }



  lazyLoadSchedule(
    lazyLoadPayload: { start: string, end: string, date: string }
  ): Observable<any> {
    return this.http.post(
      this.lazyLoadUrl,
      lazyLoadPayload
    );
  }

  private handleError(error: HttpErrorResponse) {
    let message = "An unknown error occurred.";

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      message = `Client Error: ${error.error.message}`;
    } else {
      // Backend error
      message = `Server Error ${error.status}: ${error.error?.detail || error.message}`;
    }

    return throwError(() => new Error(message));
  }

}
