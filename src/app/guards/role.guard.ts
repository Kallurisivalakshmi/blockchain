import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const requiredRoles = next.data['roles'] as Array<string>;

    if (!requiredRoles || requiredRoles.length === 0) {
      // If no roles are required, just check if authenticated
      return this.authService.isAuthenticated().pipe(
        map((isAuthenticated) => {
          if (!isAuthenticated) {
            this.router.navigate(['/login'], {
              queryParams: { returnUrl: state.url },
            });
            return false;
          }
          return true;
        })
      );
    }

    return this.authService.isAuthenticated().pipe(
      map((isAuthenticated) => {
        if (!isAuthenticated) {
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: state.url },
          });
          this.snackBar.open('Please login to access this page', 'Close', {
            duration: 3000,
          });
          return false;
        }

        // Check if user has any of the required roles
        const user = this.authService.getCurrentUser();
        const hasRequiredRole = user && requiredRoles.includes(user.role);

        if (hasRequiredRole) {
          return true;
        } else {
          // User doesn't have required role
          this.snackBar.open(
            `You don't have permission to access this page. Required role: ${requiredRoles.join(', ')}`,
            'Close',
            { duration: 5000 }
          );
          
          // Redirect to appropriate dashboard based on user's role
          if (user?.role === 'hotel') {
            this.router.navigate(['/dashboard']);
          } else if (user?.role === 'police') {
            this.router.navigate(['/police-dashboard']);
          } else {
            this.router.navigate(['/']);
          }
          return false;
        }
      }),
      catchError((error) => {
        console.error('Error checking role:', error);
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
