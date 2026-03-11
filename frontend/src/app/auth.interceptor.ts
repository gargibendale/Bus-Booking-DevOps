import { inject, Injectable } from '@angular/core';
import { HttpInterceptor } from '@angular/common/http';
import { HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { catchError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './auth-service';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const token = localStorage.getItem('access_token');

    const authReq = token
        ? req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        })
        : req;

    return next(authReq).pipe(
        catchError(err => {
            if (err.status === 401 && !req.url.includes('/token')) {
                authService.clearUser();
                localStorage.removeItem('access_token');
                router.navigate(['/login']);
            }
            return throwError(() => err);
        })

    );
};
