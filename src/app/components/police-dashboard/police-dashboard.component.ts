import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { GuestService, Guest } from '../../services/guest.service';
import { PoliceService, Alert, WantedPerson } from '../../services/police.service';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-police-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatBadgeModule,
  ],
  template: `
    <div class="police-dashboard-container">
      <h1>Police Dashboard</h1>

      <div class="stats-row">
        <mat-card class="stat-card">
          <mat-card-header>
            <mat-card-title>Open Alerts</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stat-value alert-value">{{ openAlerts.length }}</div>
            <div class="stat-label">Active</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-header>
            <mat-card-title>Wanted Persons</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stat-value">{{ wantedPersons.length }}</div>
            <div class="stat-label">Active</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-header>
            <mat-card-title>All Guests</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stat-value">{{ allGuests.length }}</div>
            <div class="stat-label">Registered</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-header>
            <mat-card-title>Flagged Guests</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stat-value flagged-value">{{ flaggedGuests.length }}</div>
            <div class="stat-label">Flagged</div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="search-card">
        <mat-card-header>
          <mat-card-title>Search</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="searchForm" (ngSubmit)="onSearch()" class="search-form">
            <mat-form-field>
              <mat-label>Search Query</mat-label>
              <input matInput formControlName="query" placeholder="Search by name, ID, or phone">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Search Type</mat-label>
              <mat-select formControlName="searchType">
                <mat-option value="guests">Guests</mat-option>
                <mat-option value="wanted">Wanted Persons</mat-option>
                <mat-option value="alerts">Alerts</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit" [disabled]="loading">
              @if (loading) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Search
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-tab-group>
        <mat-tab label="Alerts">
          <div class="content-section">
            @if (loadingAlerts) {
              <mat-spinner diameter="40" class="loading-spinner"></mat-spinner>
            } @else if (openAlerts.length === 0) {
              <p>No open alerts.</p>
            } @else {
              <mat-list>
                @for (alert of openAlerts; track alert.id) {
                  <mat-list-item>
                    <mat-icon matListIcon [color]="getAlertColor(alert.severity)">
                      {{ getAlertIcon(alert.severity) }}
                    </mat-icon>
                    <h3 matLine>{{ alert.title }}</h3>
                    <p matLine>
                      <span>{{ alert.description }}</span>
                      <mat-chip [color]="getAlertColor(alert.severity)" class="severity-chip">
                        {{ alert.severity }}
                      </mat-chip>
                      <mat-chip color="accent" class="status-chip">
                        {{ alert.status }}
                      </mat-chip>
                    </p>
                    @if (alert.guestId) {
                      <button mat-icon-button (click)="viewGuestDetails(alert.guestId)">
                        <mat-icon>info</mat-icon>
                      </button>
                    }
                  </mat-list-item>
                }
              </mat-list>
            }
          </div>
        </mat-tab>

        <mat-tab label="Wanted Persons">
          <div class="content-section">
            @if (loadingWanted) {
              <mat-spinner diameter="40" class="loading-spinner"></mat-spinner>
            } @else if (wantedPersons.length === 0) {
              <p>No wanted persons in the system.</p>
            } @else {
              <div class="wanted-grid">
                @for (person of wantedPersons; track person.id) {
                  <mat-card class="wanted-card">
                    <mat-card-header>
                      <mat-card-title>{{ person.name }}</mat-card-title>
                      <mat-card-subtitle>ID: {{ person.governmentId }}</mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <p><strong>Reason:</strong> {{ person.reason }}</p>
                      <p><strong>Description:</strong> {{ person.description }}</p>
                      <p><strong>Last Seen:</strong> {{ person.lastSeen }}</p>
                      @if (person.image) {
                        <img [src]="person.image" alt="Wanted person" class="wanted-image">
                      }
                    </mat-card-content>
                    <mat-card-actions>
                      <button mat-button color="warn" (click)="alertAboutPerson(person)">
                        <mat-icon>add_alert</mat-icon> Create Alert
                      </button>
                    </mat-card-actions>
                  </mat-card>
                }
              </div>
            }
          </div>
        </mat-tab>

        <mat-tab label="All Guests">
          <div class="content-section">
            @if (loadingGuests) {
              <mat-spinner diameter="40" class="loading-spinner"></mat-spinner>
            } @else if (allGuests.length === 0) {
              <p>No guests registered.</p>
            } @else {
              <mat-list>
                @for (guest of allGuests; track guest.id) {
                  <mat-list-item>
                    <mat-icon matListIcon [color]="getGuestStatusColor(guest.status)">
                      {{ getGuestStatusIcon(guest.status) }}
                    </mat-icon>
                    <h3 matLine>{{ guest.name }}</h3>
                    <p matLine>
                      <span>ID: {{ guest.governmentId }}</span>
                      <span>Phone: {{ guest.phone }}</span>
                      <mat-chip [color]="getGuestStatusColor(guest.status)" class="status-chip">
                        {{ guest.status }}
                      </mat-chip>
                    </p>
                    <button mat-icon-button (click)="viewGuestDetails(guest.id)">
                      <mat-icon>visibility</mat-icon>
                    </button>
                  </mat-list-item>
                }
              </mat-list>
            }
          </div>
        </mat-tab>

        <mat-tab label="Flagged Guests">
          <div class="content-section">
            @if (loadingFlagged) {
              <mat-spinner diameter="40" class="loading-spinner"></mat-spinner>
            } @else if (flaggedGuests.length === 0) {
              <p>No flagged guests.</p>
            } @else {
              <mat-list>
                @for (guest of flaggedGuests; track guest.id) {
                  <mat-list-item>
                    <mat-icon matListIcon color="warn">flag</mat-icon>
                    <h3 matLine>{{ guest.name }}</h3>
                    <p matLine>
                      <span>ID: {{ guest.governmentId }}</span>
                      <span>Phone: {{ guest.phone }}</span>
                      <mat-chip color="warn" class="status-chip">Flagged</mat-chip>
                    </p>
                    <button mat-icon-button (click)="viewGuestDetails(guest.id)">
                      <mat-icon>visibility</mat-icon>
                    </button>
                  </mat-list-item>
                }
              </mat-list>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `.police-dashboard-container {
      padding: 20px;
    }`,
    `.stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }`,
    `.stat-card {
      text-align: center;
    }`,
    `.stat-value {
      font-size: 32px;
      font-weight: bold;
      margin: 10px 0;
    }`,
    `.alert-value {
      color: #f44336;
    }`,
    `.flagged-value {
      color: #ff5722;
    }`,
    `.stat-label {
      color: #666;
      font-size: 14px;
    }`,
    `.search-card {
      margin-bottom: 20px;
    }`,
    `.search-form {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }`,
    `.search-form .mat-form-field {
      flex: 1;
      min-width: 200px;
    }`,
    `.content-section {
      padding: 16px;
    }`,
    `.loading-spinner {
      display: block;
      margin: 20px auto;
    }`,
    `.wanted-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }`,
    `.wanted-card {
      margin: 8px;
    }`,
    `.wanted-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 4px;
      margin-top: 16px;
    }`,
    `.severity-chip, .status-chip {
      margin-left: 8px;
    }`,
    `@media (max-width: 768px) {
      .search-form {
        flex-direction: column;
      }
      .search-form .mat-form-field {
        width: 100%;
      }
      .wanted-grid {
        grid-template-columns: 1fr;
      }
    }`,
  ],
})
export class PoliceDashboardComponent implements OnInit {
  // Data
  allGuests: Guest[] = [];
  openAlerts: Alert[] = [];
  wantedPersons: WantedPerson[] = [];
  flaggedGuests: Guest[] = [];

  // Form
  searchForm: FormGroup;

  // Loading states
  loading = false;
  loadingGuests = true;
  loadingAlerts = true;
  loadingWanted = true;
  loadingFlagged = true;

  constructor(
    private fb: FormBuilder,
    private guestService: GuestService,
    private policeService: PoliceService,
    public authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.searchForm = this.fb.group({
      query: [''],
      searchType: ['guests'],
    });
  }

  ngOnInit(): void {
    this.loadAllGuests();
    this.loadOpenAlerts();
    this.loadWantedPersons();
    this.loadFlaggedGuests();
  }

  loadAllGuests(): void {
    this.loadingGuests = true;
    this.guestService.getGuests().subscribe({
      next: (guests) => {
        this.allGuests = guests;
        this.loadingGuests = false;
      },
      error: (err) => {
        console.error('Error loading guests:', err);
        this.loadingGuests = false;
        this.snackBar.open('Failed to load guests', 'Close', { duration: 3000 });
      },
    });
  }

  loadOpenAlerts(): void {
    this.loadingAlerts = true;
    this.policeService.getOpenAlerts().subscribe({
      next: (alerts) => {
        this.openAlerts = alerts;
        this.loadingAlerts = false;
      },
      error: (err) => {
        console.error('Error loading alerts:', err);
        this.loadingAlerts = false;
        this.snackBar.open('Failed to load alerts', 'Close', { duration: 3000 });
      },
    });
  }

  loadWantedPersons(): void {
    this.loadingWanted = true;
    this.policeService.getWantedPersons().subscribe({
      next: (persons) => {
        this.wantedPersons = persons;
        this.loadingWanted = false;
      },
      error: (err) => {
        console.error('Error loading wanted persons:', err);
        this.loadingWanted = false;
        this.snackBar.open('Failed to load wanted persons', 'Close', { duration: 3000 });
      },
    });
  }

  loadFlaggedGuests(): void {
    this.loadingFlagged = true;
    this.guestService.getGuestsByStatus('flagged').subscribe({
      next: (guests) => {
        this.flaggedGuests = guests;
        this.loadingFlagged = false;
      },
      error: (err) => {
        console.error('Error loading flagged guests:', err);
        this.loadingFlagged = false;
        this.snackBar.open('Failed to load flagged guests', 'Close', { duration: 3000 });
      },
    });
  }

  onSearch(): void {
    if (this.searchForm.invalid) return;

    const { query, searchType } = this.searchForm.value;
    this.loading = true;

    switch (searchType) {
      case 'guests':
        this.guestService.searchGuests(query).subscribe({
          next: (guests) => {
            this.allGuests = guests;
            this.loading = false;
          },
          error: (err) => {
            console.error('Search error:', err);
            this.loading = false;
            this.snackBar.open('Search failed', 'Close', { duration: 3000 });
          },
        });
        break;
      case 'wanted':
        this.policeService.searchWantedPersons(query).subscribe({
          next: (persons) => {
            this.wantedPersons = persons;
            this.loading = false;
          },
          error: (err) => {
            console.error('Search error:', err);
            this.loading = false;
            this.snackBar.open('Search failed', 'Close', { duration: 3000 });
          },
        });
        break;
      case 'alerts':
        // In a real implementation, you would have a search for alerts
        this.snackBar.open('Alert search not implemented yet', 'Close', { duration: 3000 });
        this.loading = false;
        break;
    }
  }

  getAlertIcon(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'help_outline';
      default:
        return 'notifications';
    }
  }

  getAlertColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'warn';
      case 'high':
        return 'warn';
      case 'medium':
        return 'accent';
      case 'low':
        return 'primary';
      default:
        return 'primary';
    }
  }

  getGuestStatusIcon(status: string): string {
    switch (status) {
      case 'verified':
        return 'check_circle';
      case 'pending':
        return 'schedule';
      case 'rejected':
        return 'cancel';
      case 'flagged':
        return 'flag';
      default:
        return 'help_circle';
    }
  }

  getGuestStatusColor(status: string): string {
    switch (status) {
      case 'verified':
        return 'primary';
      case 'pending':
        return 'accent';
      case 'rejected':
        return 'warn';
      case 'flagged':
        return 'warn';
      default:
        return 'primary';
    }
  }

  viewGuestDetails(guestId: string): void {
    // In a real app, you would navigate to a guest detail page
    // For now, we'll just show a message
    this.snackBar.open(`Viewing details for guest ${guestId}`, 'Close', { duration: 2000 });
    console.log('Viewing guest details:', guestId);
  }

  alertAboutPerson(person: WantedPerson): void {
    // Create an alert for this wanted person
    const alert: Omit<Alert, 'id' | 'createdAt'> = {
      type: 'wanted',
      title: `Wanted Person Sighting: ${person.name}`,
      description: `Wanted person ${person.name} (ID: ${person.governmentId}) may be in the area. Reason: ${person.reason}`,
      severity: 'high',
      status: 'open',
    };

    this.policeService.createAlert(alert).subscribe({
      next: (createdAlert) => {
        this.snackBar.open(`Alert created for ${person.name}`, 'Close', { duration: 3000 });
        this.openAlerts = [createdAlert, ...this.openAlerts];
      },
      error: (err) => {
        console.error('Error creating alert:', err);
        this.snackBar.open('Failed to create alert', 'Close', { duration: 3000 });
      },
    });
  }
}
