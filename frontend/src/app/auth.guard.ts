import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth-service';
import { toSignal } from '@angular/core/rxjs-interop';
import { take, map, tap, of } from 'rxjs';
import { UserService } from './user-service';
import { catchError } from 'rxjs';

export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const userService = inject(UserService);
    const router = inject(Router);

    const user = authService.getUser();
    if (user) {
        return true;
    }

    // If token exists but user not in memory, fetch profile
    return userService.getMe().pipe(
        tap(user => authService.setUser(user)),
        map(() => true),
        catchError(() => {
            router.navigate(['/login']);
            return of(false);
        })
    );
};
