import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

export interface User {
  id: string;
  username: string;
  role: 'hotel' | 'police';
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  private readonly TOKEN_KEY = 'hotel_police_token';
  private readonly USER_KEY = 'hotel_police_user';

  constructor(private router: Router, private http: HttpClient) {
    const storedUser = localStorage.getItem(this.USER_KEY);
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
  }

  get currentUser$(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  getCurrentUser(): string | null {
    return this.currentUserSubject.value?.username || null;
  }

  getCurrentRole(): 'hotel' | 'police' | null {
    return this.currentUserSubject.value?.role || null;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  login(username: string, password: string, role: 'hotel' | 'police'): Observable<User> {
    // Simulate API call - in a real app, this would be a POST to your backend
    const mockUser: User = {
      id: '1',
      username,
      role,
      token: 'mock-jwt-token-' + Math.random().toString(36).substring(2),
    };

    // For demo purposes, we'll simulate a successful login
    // In production, replace with actual HTTP call:
    // return this.http.post<User>('/api/auth/login', { username, password, role })

    return of(mockUser).pipe(
      tap((user) => {
        localStorage.setItem(this.TOKEN_KEY, user.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  checkRole(role: 'hotel' | 'police'): boolean {
    const currentRole = this.getCurrentRole();
    return currentRole === role;
  }

  hasRole(role: 'hotel' | 'police'): boolean {
    return this.isAuthenticated() && this.checkRole(role);
  }
}
