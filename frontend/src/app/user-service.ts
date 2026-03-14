import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { User } from './user';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { AuthService } from './auth-service';
import { catchError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {

  apiUrl = "/api/busapp/sign_up";
  tokenUrl = "/api/busapp/token";
  passwordUrl = "/api/busapp/change_password";
  editProfileUrl = "/api/busapp/update_user/";

  // auth state
  private _isLoggedIn$ = new BehaviorSubject<boolean>(!!localStorage.getItem('access_token'));
  public isLoggedIn$ = this._isLoggedIn$.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) { }

  signUp(user: User): Observable<any> {
    return this.http.post(`${this.apiUrl}`, user);
  }

  logIn(email: string, pass: string) {
    // OAuth2PasswordRequestForm expects form-urlencoded body with fields: grant_type(optional), username, password, scope, client_id, client_secret
    const body = new HttpParams()
      .set('username', email)
      .set('password', pass);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<{ access_token: string, token_type: string, user: any }>(this.tokenUrl, body.toString(), { headers }).pipe(
      tap(res => {
        if (res?.access_token) {
          localStorage.setItem('access_token', res.access_token);
          // optionally store token_type if you want
          this._isLoggedIn$.next(true);
          //console.log(res.user);
          this.authService.setUser(res.user);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('access_token');
    this._isLoggedIn$.next(false);
    this.authService.clearUser();
  }

  getMe() {
    return this.http.get<User>('/api/busapp/me');
  }

  userUpdate(id: string, name: string,
    age: number,
    gender: string,
    email: string,
    phone: string): Observable<any> {

    //console.log(this.editProfileUrl + `${id}`)

    return this.http.put(this.editProfileUrl + `${id}`, { name, age, gender, email, phone });

  }

  passwordUpdate(old_password: string, password: string): Observable<any> {
    return this.http.post(this.passwordUrl, { old_password, password });
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
