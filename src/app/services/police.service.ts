import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Guest } from './guest.service';

export interface Alert {
  id: string;
  type: 'wanted' | 'suspicious' | 'missing' | 'other';
  title: string;
  description: string;
  guestId?: string;
  createdAt: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
}

export interface Investigation {
  id: string;
  alertId: string;
  guestId: string;
  officerId: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'open' | 'in_progress' | 'completed';
}

export interface WantedPerson {
  id: string;
  name: string;
  governmentId: string;
  description: string;
  reason: string;
  lastSeen: string;
  image?: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PoliceService {
  private readonly API_URL = '/api/police';
  private alerts: Alert[] = [];
  private wantedPersons: WantedPerson[] = [];
  private investigations: Investigation[] = [];

  constructor(private http: HttpClient) {
    // Mock data
    this.alerts = [
      {
        id: '1',
        type: 'wanted',
        title: 'Suspicious Activity',
        description: 'Guest matching wanted person description',
        guestId: '2',
        createdAt: new Date(),
        severity: 'high',
        status: 'open',
      },
      {
        id: '2',
        type: 'suspicious',
        title: 'Multiple ID Attempts',
        description: 'Guest tried to register with multiple IDs',
        guestId: '3',
        createdAt: new Date(Date.now() - 3600000),
        severity: 'medium',
        status: 'investigating',
      },
    ];

    this.wantedPersons = [
      {
        id: '1',
        name: 'Jane Smith',
        governmentId: 'ID987654321',
        description: 'Wanted for fraud',
        reason: 'Credit card fraud and identity theft',
        lastSeen: 'New York, NY',
        isActive: true,
      },
      {
        id: '2',
        name: 'Bob Johnson',
        governmentId: 'ID555555555',
        description: 'Wanted for theft',
        reason: 'Grand theft auto',
        lastSeen: 'Los Angeles, CA',
        isActive: true,
      },
    ];

    this.investigations = [
      {
        id: '1',
        alertId: '1',
        guestId: '2',
        officerId: 'police-1',
        notes: 'Investigating suspicious activity',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'in_progress',
      },
    ];
  }

  getAlerts(): Observable<Alert[]> {
    // In production: return this.http.get<Alert[]>(`${this.API_URL}/alerts`);
    return of(this.alerts);
  }

  getAlertById(id: string): Observable<Alert | undefined> {
    // In production: return this.http.get<Alert>(`${this.API_URL}/alerts/${id}`);
    return of(this.alerts.find((alert) => alert.id === id));
  }

  createAlert(alert: Omit<Alert, 'id' | 'createdAt'>): Observable<Alert> {
    const newAlert: Alert = {
      ...alert,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    this.alerts.push(newAlert);
    // In production: return this.http.post<Alert>(`${this.API_URL}/alerts`, newAlert);
    return of(newAlert);
  }

  updateAlert(id: string, updates: Partial<Alert>): Observable<Alert> {
    const index = this.alerts.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error('Alert not found');
    }
    this.alerts[index] = { ...this.alerts[index], ...updates };
    // In production: return this.http.patch<Alert>(`${this.API_URL}/alerts/${id}`, updates);
    return of(this.alerts[index]);
  }

  getWantedPersons(): Observable<WantedPerson[]> {
    // In production: return this.http.get<WantedPerson[]>(`${this.API_URL}/wanted`);
    return of(this.wantedPersons.filter((p) => p.isActive));
  }

  getWantedPersonById(id: string): Observable<WantedPerson | undefined> {
    // In production: return this.http.get<WantedPerson>(`${this.API_URL}/wanted/${id}`);
    return of(this.wantedPersons.find((p) => p.id === id && p.isActive));
  }

  searchGuests(query: string): Observable<Guest[]> {
    // In production, this would call the guest service or a combined endpoint
    // For now, return empty as we'll use the GuestService for actual guest data
    return of([]);
  }

  getInvestigationHistory(guestId: string): Observable<Investigation[]> {
    // In production: return this.http.get<Investigation[]>(`${this.API_URL}/investigations?guestId=${guestId}`);
    return of(this.investigations.filter((i) => i.guestId === guestId));
  }

  getOpenAlerts(): Observable<Alert[]> {
    return this.getAlerts().pipe(
      map((alerts) => alerts.filter((a) => a.status === 'open' || a.status === 'investigating'))
    );
  }

  getAlertsBySeverity(severity: Alert['severity']): Observable<Alert[]> {
    return this.getAlerts().pipe(
      map((alerts) => alerts.filter((a) => a.severity === severity))
    );
  }

  searchWantedPersons(query: string): Observable<WantedPerson[]> {
    return this.getWantedPersons().pipe(
      map((persons) =>
        persons.filter(
          (p) =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.governmentId.includes(query) ||
            p.reason.toLowerCase().includes(query.toLowerCase())
        )
      )
    );
  }

  checkGuestAgainstWatchlist(guestId: string): Observable<boolean> {
    // In production: return this.http.get<boolean>(`${this.API_URL}/watchlist/check?guestId=${guestId}`);
    // Mock implementation
    const matchedIds = this.wantedPersons.map((p) => p.governmentId);
    return of(matchedIds.includes(guestId));
  }
}
