import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.isAuthenticated().pipe(
      map((isAuthenticated) => {
        if (isAuthenticated) {
          return true;
        } else {
          // Redirect to login page
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: state.url },
          });
          this.snackBar.open('Please login to access this page', 'Close', {
            duration: 3000,
          });
          return false;
        }
      }),
      catchError((error) => {
        console.error('Error checking authentication:', error);
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: state.url },
        });
        this.snackBar.open('Authentication error. Please login again.', 'Close', {
          duration: 3000,
        });
        return of(false);
      })
    );
  }
}
