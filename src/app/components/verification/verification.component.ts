import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatLinearProgressModule } from '@angular/material/progress-bar';
import { GuestService, Guest } from '../../services/guest.service';
import { PoliceService } from '../../services/police.service';
import { BlockchainService } from '../../services/blockchain.service';
import { interval, Observable, timer } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-verification',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatLinearProgressModule,
  ],
  template: `
    <div class="verification-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Guest Verification</mat-card-title>
          <mat-card-subtitle>Verifying guest information</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (loading) {
            <div class="loading-overlay">
              <mat-spinner diameter="50"></mat-spinner>
              <p>Loading guest data...</p>
            </div>
          } @else if (!guest) {
            <div class="error-message">
              <mat-icon color="warn">error_outline</mat-icon>
              <p>Guest not found</p>
            </div>
          } @else {
            <div class="guest-info">
              <h3>Guest Information</h3>
              <mat-list class="guest-details">
                <mat-list-item>
                  <mat-icon matListIcon>person</mat-icon>
                  <span matLine>Name: {{ guest.name }}</span>
                </mat-list-item>
                <mat-list-item>
                  <mat-icon matListIcon>phone</mat-icon>
                  <span matLine>Phone: {{ guest.phone }}</span>
                </mat-list-item>
                <mat-list-item>
                  <mat-icon matListIcon>badge</mat-icon>
                  <span matLine>ID: {{ guest.governmentId }}</span>
                </mat-list-item>
                <mat-list-item>
                  <mat-icon matListIcon>calendar_today</mat-icon>
                  <span matLine>Check-in: {{ guest.checkInDate | date:'medium' }}</span>
                </mat-list-item>
                <mat-list-item>
                  <mat-icon matListIcon>calendar_today</mat-icon>
                  <span matLine>Check-out: {{ guest.checkOutDate | date:'medium' }}</span>
                </mat-list-item>
              </mat-list>
            </div>

            <div class="verification-steps">
              <h3>Verification Process</h3>

              <!-- OCR Verification Step -->
              <mat-card class="step-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon [color]="ocrStatus === 'completed' ? 'primary' : ocrStatus === 'failed' ? 'warn' : ''">
                      {{ ocrStatus === 'completed' ? 'check_circle' : ocrStatus === 'failed' ? 'error' : 'image_search' }}
                    </mat-icon>
                    OCR Verification
                  </mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <p>Extracting information from ID document</p>
                  <mat-linear-progress 
                    mode="determinate" 
                    [value]="ocrProgress"
                    *ngIf="ocrStatus !== 'completed' && ocrStatus !== 'failed'">
                  </mat-linear-progress>
                  @if (ocrStatus === 'completed' && ocrData) {
                    <mat-list class="verification-results">
                      <mat-list-item>
                        <span matLine>Extracted Name: {{ ocrData.name }}</span>
                      </mat-list-item>
                      <mat-list-item>
                        <span matLine>Extracted ID: {{ ocrData.idNumber }}</span>
                      </mat-list-item>
                      <mat-list-item>
                        <span matLine>ID Type: {{ ocrData.idType }}</span>
                      </mat-list-item>
                    </mat-list>
                  } @else if (ocrStatus === 'failed') {
                    <p class="error-message">OCR failed to extract data from document</p>
                  } @else {
                    <p>Processing document...</p>
                  }
                </mat-card-content>
              </mat-card>

              <!-- Database Verification Step -->
              <mat-card class="step-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon [color]="dbStatus === 'verified' ? 'primary' : dbStatus === 'mismatch' || dbStatus === 'not_found' ? 'warn' : ''">
                      {{ dbStatus === 'verified' ? 'check_circle' : dbStatus === 'mismatch' || dbStatus === 'not_found' ? 'error' : 'search' }}
                    </mat-icon>
                    Database Verification
                  </mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <p>Checking guest information against government database</p>
                  <mat-linear-progress 
                    mode="determinate" 
                    [value]="dbProgress"
                    *ngIf="dbStatus === 'pending'">
                  </mat-linear-progress>
                  @if (dbStatus === 'verified') {
                    <p class="success-message">✓ Information verified against government database</p>
                  } @else if (dbStatus === 'mismatch') {
                    <p class="error-message">⚠ Information does not match database records</p>
                  } @else if (dbStatus === 'not_found') {
                    <p class="error-message">⚠ No matching records found in database</p>
                  } @else {
                    <p>Verifying with database...</p>
                  }
                </mat-card-content>
              </mat-card>

              <!-- Watchlist Verification Step -->
              <mat-card class="step-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon [color]="watchlistStatus === 'clear' ? 'primary' : watchlistStatus === 'matched' ? 'warn' : ''">
                      {{ watchlistStatus === 'clear' ? 'check_circle' : watchlistStatus === 'matched' ? 'warning' : 'search' }}
                    </mat-icon>
                    Watchlist Check
                  </mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <p>Checking against police watchlist</p>
                  <mat-linear-progress 
                    mode="determinate" 
                    [value]="watchlistProgress"
                    *ngIf="watchlistStatus === 'pending'">
                  </mat-linear-progress>
                  @if (watchlistStatus === 'clear') {
                    <p class="success-message">✓ No watchlist matches found</p>
                  } @else if (watchlistStatus === 'matched') {
                    <p class="error-message">⚠ MATCH FOUND! This guest appears on the watchlist</p>
                    @if (watchlistMatches && watchlistMatches.length > 0) {
                      <mat-chip-set>
                        @for (match of watchlistMatches; track match) {
                          <mat-chip color="warn">{{ match }}</mat-chip>
                        }
                      </mat-chip-set>
                    }
                  } @else {
                    <p>Checking watchlist...</p>
                  }
                </mat-card-content>
              </mat-card>
            </div>

            <div class="action-buttons">
              @if (allStepsCompleted()) {
                <button mat-raised-button color="primary" 
                        (click)="completeVerification()" 
                        [disabled]="completing">
                  @if (completing) {
                    <mat-spinner diameter="20"></mat-spinner> Completing...
                  } @else {
                    Complete Verification
                  }
                </button>
              } @else if (verificationFailed()) {
                <button mat-raised-button color="warn" 
                        (click)="rejectGuest()" 
                        [disabled]="processing">
                  @if (processing) {
                    <mat-spinner diameter="20"></mat-spinner> Processing...
                  } @else {
                    Reject Guest
                  }
                </button>
              }
              <button mat-button (click)="goBack()">Back to Dashboard</button>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `.verification-container {
      padding: 20px;
      max-width: 1000px;
      margin: 0 auto;
    }`,
    `.loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      text-align: center;
    }`,
    `.error-message {
      color: #f44336;
      text-align: center;
      padding: 20px;
    }`,
    `.success-message {
      color: #4caf50;
      font-weight: bold;
    }`,
    `.guest-info {
      margin-bottom: 20px;
    }`,
    `.guest-details {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
    }`,
    `.verification-steps {
      margin: 20px 0;
    }`,
    `.step-card {
      margin-bottom: 16px;
    }`,
    `.verification-results {
      background: #fafafa;
      padding: 8px;
      border-radius: 4px;
      margin-top: 8px;
    }`,
    `.action-buttons {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      justify-content: flex-end;
    }`,
    `.mat-linear-progress {
      margin: 10px 0;
      border-radius: 4px;
    }`,
  ],
})
export class VerificationComponent implements OnInit {
  guest: Guest | null = null;
  loading = true;
  guestId: string = '';

  // OCR Verification
  ocrStatus: 'pending' | 'completed' | 'failed' = 'pending';
  ocrProgress = 0;
  ocrData: any = null;

  // Database Verification
  dbStatus: 'pending' | 'verified' | 'mismatch' | 'not_found' = 'pending';
  dbProgress = 0;

  // Watchlist Verification
  watchlistStatus: 'pending' | 'clear' | 'matched' = 'pending';
  watchlistProgress = 0;
  watchlistMatches: string[] = [];

  // Actions
  completing = false;
  processing = false;

  constructor(
    private route: ActivatedRoute,
    private guestService: GuestService,
    private policeService: PoliceService,
    private blockchainService: BlockchainService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.guestId = this.route.snapshot.paramMap.get('guestId') || '';
    this.loadGuest();
    this.startVerificationProcess();
  }

  loadGuest(): void {
    this.guestService.getGuestById(this.guestId).subscribe({
      next: (guest) => {
        this.guest = guest || null;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading guest:', err);
        this.loading = false;
      },
    });
  }

  startVerificationProcess(): void {
    // Simulate OCR processing
    this.simulateOCRProcessing();

    // Check database after OCR completes
    timer(2000).subscribe(() => {
      this.simulateDatabaseCheck();
    });

    // Check watchlist after database check
    timer(4000).subscribe(() => {
      this.simulateWatchlistCheck();
    });
  }

  simulateOCRProcessing(): void {
    const interval = setInterval(() => {
      this.ocrProgress += 25;
      if (this.ocrProgress >= 100) {
        clearInterval(interval);
        this.ocrStatus = 'completed';
        // Mock OCR data - in real app this would come from OCR service
        this.ocrData = {
          name: this.guest?.name || 'Unknown',
          idNumber: this.guest?.governmentId || 'Unknown',
          idType: 'Passport',
          issueDate: '2020-01-01',
          expiryDate: '2030-01-01',
        };
      }
    }, 500);
  }

  simulateDatabaseCheck(): void {
    this.dbStatus = 'pending';
    const interval = setInterval(() => {
      this.dbProgress += 20;
      if (this.dbProgress >= 100) {
        clearInterval(interval);
        // In a real app, this would be an actual database check
        // For demo, we'll assume it's verified
        this.dbStatus = 'verified';
      }
    }, 400);
  }

  simulateWatchlistCheck(): void {
    this.watchlistStatus = 'pending';
    const interval = setInterval(() => {
      this.watchlistProgress += 15;
      if (this.watchlistProgress >= 100) {
        clearInterval(interval);
        // In a real app, this would be an actual watchlist check
        // For demo, we'll check against our mock wanted persons
        this.policeService.checkGuestAgainstWatchlist(this.guest?.governmentId || '').subscribe({
          next: (isMatched) => {
            this.watchlistStatus = isMatched ? 'matched' : 'clear';
            if (isMatched) {
              this.watchlistMatches = ['Wanted for fraud', 'Multiple alias detected'];
            }
          },
          error: (err) => {
            console.error('Error checking watchlist:', err);
            this.watchlistStatus = 'clear';
          },
        });
      }
    }, 300);
  }

  allStepsCompleted(): boolean {
    return (
      this.ocrStatus === 'completed' &&
      this.dbStatus === 'verified' &&
      this.watchlistStatus === 'clear'
    );
  }

  verificationFailed(): boolean {
    return (
      this.ocrStatus === 'failed' ||
      this.dbStatus === 'mismatch' ||
      this.dbStatus === 'not_found' ||
      this.watchlistStatus === 'matched'
    );
  }

  completeVerification(): void {
    if (!this.guest) return;

    this.completing = true;

    // Update guest status to verified
    this.guestService.updateGuest(this.guest.id, {
      status: 'verified',
      verificationResult: {
        id: Date.now().toString(),
        ocrStatus: this.ocrStatus,
        ocrData: this.ocrData,
        databaseCheck: this.dbStatus,
        watchlistCheck: this.watchlistStatus,
        watchlistMatches: this.watchlistMatches,
        verifiedAt: new Date(),
      },
    }).subscribe({
      next: (guest) => {
        // Create blockchain transaction for verification
        const txData = {
          guestId: guest.id,
          action: 'verify',
          result: 'success',
          timestamp: new Date(),
          data: {
            name: guest.name,
            governmentId: guest.governmentId,
            verificationResult: guest.verificationResult,
          },
        };

        this.blockchainService.createTransaction(txData).subscribe({
          next: (transaction) => {
            this.completing = false;
            // Navigate to verification result
            this.router.navigate([`/verification-result/${guest.id}`]);
          },
          error: (txErr) => {
            console.error('Error creating blockchain transaction:', txErr);
            this.completing = false;
            // Still navigate to result page, transaction might be pending
            this.router.navigate([`/verification-result/${guest.id}`]);
          },
        });
      },
      error: (err) => {
        console.error('Error updating guest:', err);
        this.completing = false;
      },
    });
  }

  rejectGuest(): void {
    if (!this.guest) return;

    this.processing = true;

    // Update guest status to rejected
    this.guestService.updateGuest(this.guest.id, {
      status: 'rejected',
      verificationResult: {
        id: Date.now().toString(),
        ocrStatus: this.ocrStatus,
        ocrData: this.ocrData,
        databaseCheck: this.dbStatus,
        watchlistCheck: this.watchlistStatus,
        watchlistMatches: this.watchlistMatches,
        verifiedAt: new Date(),
      },
    }).subscribe({
      next: () => {
        this.processing = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Error rejecting guest:', err);
        this.processing = false;
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
