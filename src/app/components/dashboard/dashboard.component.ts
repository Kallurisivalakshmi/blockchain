import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GuestService, Guest } from '../../services/guest.service';
import { BlockchainService, BlockchainStatus } from '../../services/blockchain.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="dashboard-container">
      <h1>Hotel Dashboard</h1>

      <div class="stats-row">
        <mat-card class="stat-card">
          <mat-card-header>
            <mat-card-title>Today's Check-ins</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stat-value">{{ todayCheckIns.length }}</div>
            <div class="stat-label">Guests</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-header>
            <mat-card-title>Alerts</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stat-value alert-value">{{ alerts.length }}</div>
            <div class="stat-label">Active</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-header>
            <mat-card-title>Recent Guests</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stat-value">{{ recentGuests.length }}</div>
            <div class="stat-label">Today</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-header>
            <mat-card-title>Blockchain Status</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="blockchain-status" [class.failed]="!blockchainStatus?.isConnected">
              @if (blockchainStatus) {
                <mat-icon>{{ blockchainStatus.isConnected ? 'check_circle' : 'error' }}</mat-icon>
                <span>{{ blockchainStatus.isConnected ? 'Connected' : 'Disconnected' }}</span>
              } @else {
                <mat-spinner diameter="20"></mat-spinner>
                <span>Loading...</span>
              }
            </div>
            <div class="stat-details">
              <small>Network: {{ blockchainStatus?.network || 'N/A' }}</small><br>
              <small>Last Block: {{ blockchainStatus?.lastBlockNumber || 'N/A' }}</small>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="content-row">
        <div class="content-section">
          <mat-card>
            <mat-card-header>
              <mat-card-title>Today's Check-ins</mat-card-title>
              <button mat-icon-button routerLink="/register">
                <mat-icon>add</mat-icon>
              </button>
            </mat-card-header>
            <mat-card-content>
              @if (loadingCheckIns) {
                <mat-spinner diameter="40" class="loading-spinner"></mat-spinner>
              } @else if (todayCheckIns.length === 0) {
                <p>No check-ins today.</p>
              } @else {
                <mat-list>
                  @for (guest of todayCheckIns; track guest.id) {
                    <mat-list-item>
                      <mat-icon matListIcon>person</mat-icon>
                      <h3 matLine>{{ guest.name }}</h3>
                      <p matLine>
                        <span>ID: {{ guest.governmentId }}</span>
                        <span class="guest-status {{ guest.status }}">{{ guest.status }}</span>
                      </p>
                      <button mat-icon-button routerLink="/verification/{{ guest.id }}">
                        <mat-icon>visibility</mat-icon>
                      </button>
                    </mat-list-item>
                  }
                </mat-list>
              }
            </mat-card-content>
          </mat-card>
        </div>

        <div class="content-section">
          <mat-card>
            <mat-card-header>
              <mat-card-title>Recent Guests</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (loadingRecent) {
                <mat-spinner diameter="40" class="loading-spinner"></mat-spinner>
              } @else if (recentGuests.length === 0) {
                <p>No recent guests.</p>
              } @else {
                <mat-list>
                  @for (guest of recentGuests; track guest.id) {
                    <mat-list-item>
                      <mat-icon matListIcon>history</mat-icon>
                      <h3 matLine>{{ guest.name }}</h3>
                      <p matLine>
                        <span>Phone: {{ guest.phone }}</span>
                        <span class="guest-status {{ guest.status }}">{{ guest.status }}</span>
                      </p>
                    </mat-list-item>
                  }
                </mat-list>
              }
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [
    `.dashboard-container {
      padding: 20px;
    }`,
    `.stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
    `.stat-label {
      color: #666;
      font-size: 14px;
    }`,
    `.stat-details {
      margin-top: 10px;
      color: #666;
      font-size: 12px;
    }`,
    `.content-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }`,
    `.content-section {
      width: 100%;
    }`,
    `.loading-spinner {
      display: block;
      margin: 20px auto;
    }`,
    `.guest-status {
      margin-left: 10px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }`,
    `.guest-status.verified {
      background-color: #e8f5e9;
      color: #2e7d32;
    }`,
    `.guest-status.pending {
      background-color: #fff8e1;
      color: #ff8f00;
    }`,
    `.guest-status.rejected {
      background-color: #ffebee;
      color: #c62828;
    }`,
    `.guest-status.flagged {
      background-color: #fce4ec;
      color: #c2185b;
    }`,
    `.blockchain-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin: 10px 0;
    }`,
    `.blockchain-status.failed {
      color: #f44336;
    }`,
    `@media (max-width: 768px) {
      .content-row {
        grid-template-columns: 1fr;
      }
    }`,
  ],
})
export class DashboardComponent implements OnInit {
  todayCheckIns: Guest[] = [];
  recentGuests: Guest[] = [];
  blockchainStatus: BlockchainStatus | null = null;
  alerts: any[] = []; // This would be from PoliceService in a real implementation
  loadingCheckIns = true;
  loadingRecent = true;

  constructor(
    private guestService: GuestService,
    private blockchainService: BlockchainService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadTodayCheckIns();
    this.loadRecentGuests();
    this.loadBlockchainStatus();
    // In a real implementation, you would also load alerts for hotel staff
    // who have been granted access to see them
  }

  loadTodayCheckIns(): void {
    this.loadingCheckIns = true;
    this.guestService.getTodayCheckIns().subscribe({
      next: (guests) => {
        this.todayCheckIns = guests;
        this.loadingCheckIns = false;
      },
      error: (err) => {
        console.error('Error loading today check-ins:', err);
        this.loadingCheckIns = false;
      },
    });
  }

  loadRecentGuests(): void {
    this.loadingRecent = true;
    this.guestService.getRecentGuests(5).subscribe({
      next: (guests) => {
        this.recentGuests = guests;
        this.loadingRecent = false;
      },
      error: (err) => {
        console.error('Error loading recent guests:', err);
        this.loadingRecent = false;
      },
    });
  }

  loadBlockchainStatus(): void {
    this.blockchainService.getStatus().subscribe({
      next: (status) => {
        this.blockchainStatus = status;
      },
      error: (err) => {
        console.error('Error loading blockchain status:', err);
        this.blockchainStatus = {
          isConnected: false,
          network: 'Unknown',
          lastBlockNumber: 0,
          transactionCount: 0,
          peerCount: 0,
        };
      },
    });
  }
}
