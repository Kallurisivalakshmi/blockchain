import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export interface Guest {
  id: string;
  name: string;
  phone: string;
  governmentId: string;
  idDocument: File | string | null;
  checkInDate: Date;
  checkOutDate: Date;
  status: 'pending' | 'verified' | 'rejected' | 'flagged';
  verificationResult?: VerificationResult;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationResult {
  id: string;
  ocrStatus: 'pending' | 'completed' | 'failed';
  ocrData?: {
    name: string;
    idNumber: string;
    idType: string;
    issueDate: string;
    expiryDate: string;
  };
  databaseCheck: 'pending' | 'verified' | 'not_found' | 'mismatch';
  watchlistCheck: 'pending' | 'clear' | 'matched';
  watchlistMatches?: string[];
  blockchainTxId?: string;
  verifiedAt?: Date;
}

@Injectable({
  providedIn: 'root',
})
export class GuestService {
  private readonly API_URL = '/api/guests';
  private guests: Guest[] = [];

  constructor(private http: HttpClient) {
    // Mock data for demo purposes
    this.guests = [
      {
        id: '1',
        name: 'John Doe',
        phone: '+1234567890',
        governmentId: 'ID123456789',
        idDocument: 'base64-encoded-id',
        checkInDate: new Date(),
        checkOutDate: new Date(Date.now() + 86400000),
        status: 'verified',
        verificationResult: {
          id: '1',
          ocrStatus: 'completed',
          ocrData: {
            name: 'John Doe',
            idNumber: 'ID123456789',
            idType: 'Passport',
            issueDate: '2020-01-01',
            expiryDate: '2030-01-01',
          },
          databaseCheck: 'verified',
          watchlistCheck: 'clear',
          blockchainTxId: 'tx-123456789',
          verifiedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Jane Smith',
        phone: '+1987654321',
        governmentId: 'ID987654321',
        idDocument: 'base64-encoded-id-2',
        checkInDate: new Date(),
        checkOutDate: new Date(Date.now() + 86400000),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  getGuests(): Observable<Guest[]> {
    // In production: return this.http.get<Guest[]>(this.API_URL);
    return of(this.guests);
  }

  getGuestById(id: string): Observable<Guest | undefined> {
    // In production: return this.http.get<Guest>(`${this.API_URL}/${id}`);
    return of(this.guests.find((guest) => guest.id === id));
  }

  createGuest(guest: Omit<Guest, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Observable<Guest> {
    const newGuest: Guest = {
      ...guest,
      id: Date.now().toString(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.guests.push(newGuest);
    // In production: return this.http.post<Guest>(this.API_URL, newGuest);
    return of(newGuest);
  }

  updateGuest(id: string, updates: Partial<Guest>): Observable<Guest> {
    const index = this.guests.findIndex((g) => g.id === id);
    if (index === -1) {
      throw new Error('Guest not found');
    }
    this.guests[index] = { ...this.guests[index], ...updates, updatedAt: new Date() };
    // In production: return this.http.patch<Guest>(`${this.API_URL}/${id}`, updates);
    return of(this.guests[index]);
  }

  getTodayCheckIns(): Observable<Guest[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getGuests().pipe(
      map((guests) =>
        guests.filter((guest) => {
          const checkInDate = new Date(guest.checkInDate);
          return checkInDate >= today && checkInDate < tomorrow;
        })
      )
    );
  }

  getRecentGuests(limit = 10): Observable<Guest[]> {
    return this.getGuests().pipe(
      map((guests) =>
        [...guests]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit)
      )
    );
  }

  getGuestsByStatus(status: Guest['status']): Observable<Guest[]> {
    return this.getGuests().pipe(
      map((guests) => guests.filter((guest) => guest.status === status))
    );
  }

  searchGuests(query: string): Observable<Guest[]> {
    return this.getGuests().pipe(
      map((guests) =>
        guests.filter(
          (guest) =>
            guest.name.toLowerCase().includes(query.toLowerCase()) ||
            guest.phone.includes(query) ||
            guest.governmentId.includes(query)
        )
      )
    );
  }
}
