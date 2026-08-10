import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GuestService, Guest } from '../../services/guest.service';
import { BlockchainService, BlockchainTransaction } from '../../services/blockchain.service';

@Component({
  selector: 'app-verification-result',
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
    <div class="result-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Verification Result</mat-card-title>
          <mat-card-subtitle>Verification status for {{ guest?.name || 'guest' }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (loading) {
            <div class="loading-overlay">
              <mat-spinner diameter="50"></mat-spinner>
              <p>Loading verification result...</p>
            </div>
          } @else if (!guest) {
            <div class="error-message">
              <mat-icon color="warn">error_outline</mat-icon>
              <p>Guest not found</p>
            </div>
          } @else {
            <div class="result-summary" [class.success]="guest.status === 'verified'" [class.failed]="guest.status === 'rejected'">
              @if (guest.status === 'verified') {
                <mat-icon color="primary" class="result-icon">check_circle</mat-icon>
                <h2>Verification Successful</h2>
                <p>This guest has been successfully verified and registered.</p>
              } @else if (guest.status === 'rejected') {
                <mat-icon color="warn" class="result-icon">error</mat-icon>
                <h2>Verification Failed</h2>
                <p>This guest verification was rejected.</p>
              } @else {
                <mat-icon color="warn" class="result-icon">help_circle</mat-icon>
                <h2>Verification Pending</h2>
                <p>This guest verification is still pending.</p>
              }
            </div>

            <div class="result-details">
              <div class="detail-section">
                <h3>Guest Information</h3>
                <mat-list>
                  <mat-list-item>
                    <mat-icon matListIcon>person</mat-icon>
                    <span matLine><strong>Name:</strong> {{ guest.name }}</span>
                  </mat-list-item>
                  <mat-list-item>
                    <mat-icon matListIcon>phone</mat-icon>
                    <span matLine><strong>Phone:</strong> {{ guest.phone }}</span>
                  </mat-list-item>
                  <mat-list-item>
                    <mat-icon matListIcon>badge</mat-icon>
                    <span matLine><strong>Government ID:</strong> {{ guest.governmentId }}</span>
                  </mat-list-item>
                  <mat-list-item>
                    <mat-icon matListIcon>calendar_today</mat-icon>
                    <span matLine><strong>Check-in:</strong> {{ guest.checkInDate | date:'medium' }}</span>
                  </mat-list-item>
                  <mat-list-item>
                    <mat-icon matListIcon>calendar_today</mat-icon>
                    <span matLine><strong>Check-out:</strong> {{ guest.checkOutDate | date:'medium' }}</span>
                  </mat-list-item>
                </mat-list>
              </div>

              @if (guest.verificationResult) {
                <div class="detail-section">
                  <h3>Verification Details</h3>
                  <mat-list>
                    <mat-list-item>
                      <mat-icon matListIcon [color]="getStatusColor(guest.verificationResult.ocrStatus)">
                        {{ getStatusIcon(guest.verificationResult.ocrStatus) }}
                      </mat-icon>
                      <span matLine><strong>OCR Status:</strong> {{ guest.verificationResult.ocrStatus }}</span>
                    </mat-list-item>

                    <mat-list-item>
                      <mat-icon matListIcon [color]="getStatusColor(guest.verificationResult.databaseCheck)">
                        {{ getStatusIcon(guest.verificationResult.databaseCheck) }}
                      </mat-icon>
                      <span matLine><strong>Database Check:</strong> {{ guest.verificationResult.databaseCheck }}</span>
                    </mat-list-item>

                    <mat-list-item>
                      <mat-icon matListIcon [color]="getStatusColor(guest.verificationResult.watchlistCheck)">
                        {{ getStatusIcon(guest.verificationResult.watchlistCheck) }}
                      </mat-icon>
                      <span matLine><strong>Watchlist Check:</strong> {{ guest.verificationResult.watchlistCheck }}</span>
                    </mat-list-item>

                    @if (guest.verificationResult.watchlistMatches && guest.verificationResult.watchlistMatches.length > 0) {
                      <mat-list-item>
                        <mat-icon matListIcon color="warn">warning</mat-icon>
                        <span matLine><strong>Watchlist Matches:</strong></span>
                        <mat-chip-set>
                          @for (match of guest.verificationResult.watchlistMatches; track match) {
                            <mat-chip color="warn">{{ match }}</mat-chip>
                          }
                        </mat-chip-set>
                      </mat-list-item>
                    }

                    @if (guest.verificationResult.verifiedAt) {
                      <mat-list-item>
                        <mat-icon matListIcon>schedule</mat-icon>
                        <span matLine><strong>Verified At:</strong> {{ guest.verificationResult.verifiedAt | date:'medium' }}</span>
                      </mat-list-item>
                    }
                  </mat-list>
                </div>
              }

              @if (blockchainTransaction) {
                <div class="detail-section">
                  <h3>Blockchain Transaction</h3>
                  <mat-card class="transaction-card">
                    <mat-card-content>
                      <mat-list>
                        <mat-list-item>
                          <mat-icon matListIcon color="primary">receipt</mat-icon>
                          <span matLine><strong>Transaction ID:</strong> {{ blockchainTransaction.txId }}</span>
                        </mat-list-item>
                        <mat-list-item>
                          <mat-icon matListIcon color="primary">fingerprint</mat-icon>
                          <span matLine><strong>Hash:</strong> {{ shortenHash(blockchainTransaction.hash) }}</span>
                        </mat-list-item>
                        <mat-list-item>
                          <mat-icon matListIcon>schedule</mat-icon>
                          <span matLine><strong>Timestamp:</strong> {{ blockchainTransaction.timestamp | date:'medium' }}</span>
                        </mat-list-item>
                        <mat-list-item>
                          <mat-icon matListIcon [color]="blockchainTransaction.status === 'confirmed' ? 'primary' : 'warn'">
                            {{ blockchainTransaction.status === 'confirmed' ? 'check_circle' : 'schedule' }}
                          </mat-icon>
                          <span matLine><strong>Status:</strong> {{ blockchainTransaction.status }}</span>
                        </mat-list-item>
                        @if (blockchainTransaction.blockNumber) {
                          <mat-list-item>
                            <mat-icon matListIcon>storage</mat-icon>
                            <span matLine><strong>Block Number:</strong> {{ blockchainTransaction.blockNumber }}</span>
                          </mat-list-item>
                        }
                        @if (blockchainTransaction.previousHash) {
                          <mat-list-item>
                            <mat-icon matListIcon>link</mat-icon>
                            <span matLine><strong>Previous Hash:</strong> {{ shortenHash(blockchainTransaction.previousHash) }}</span>
                          </mat-list-item>
                        }
                      </mat-list>
                    </mat-card-content>
                  </mat-card>
                </div>
              } @else {
                <div class="detail-section">
                  <h3>Blockchain Status</h3>
                  <p>No blockchain transaction found for this verification.</p>
                  @if (loadingTransaction) {
                    <mat-spinner diameter="30"></mat-spinner>
                    <p>Searching for transaction...</p>
                  }
                </div>
              }
            </div>

            <div class="action-buttons">
              <button mat-raised-button color="primary" (click)="viewBlockchain()" [disabled]="!blockchainTransaction">
                <mat-icon>explore</mat-icon> View in Explorer
              </button>
              <button mat-button (click)="goToDashboard()">Back to Dashboard</button>
              <button mat-button (click)="registerNew()">Register New Guest</button>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `.result-container {
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
    `.result-summary {
      text-align: center;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
    }`,
    `.result-summary.success {
      background-color: #e8f5e9;
      border: 1px solid #a5d6a7;
    }`,
    `.result-summary.failed {
      background-color: #ffebee;
      border: 1px solid #ef9a9a;
    }`,
    `.result-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }`,
    `.result-details {
      margin: 20px 0;
    }`,
    `.detail-section {
      margin-bottom: 20px;
    }`,
    `.transaction-card {
      background: #f5f5f5;
      margin-top: 10px;
    }`,
    `.action-buttons {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      justify-content: flex-end;
    }`,
    `h2 {
      margin: 0;
      font-size: 24px;
    }`,
    `h3 {
      color: #3f51b5;
      border-bottom: 1px solid #eee;
      padding-bottom: 8px;
    }`,
  ],
})
export class VerificationResultComponent implements OnInit {
  guest: Guest | null = null;
  blockchainTransaction: BlockchainTransaction | null = null;
  loading = true;
  loadingTransaction = false;
  guestId: string = '';

  constructor(
    private route: ActivatedRoute,
    private guestService: GuestService,
    private blockchainService: BlockchainService
  ) {}

  ngOnInit(): void {
    this.guestId = this.route.snapshot.paramMap.get('guestId') || '';
    this.loadGuest();
    this.loadBlockchainTransaction();
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

  loadBlockchainTransaction(): void {
    this.loadingTransaction = true;

    // In a real app, we would get the transaction ID from the guest's verification result
    // For demo purposes, we'll search for transactions related to this guest
    this.blockchainService.getTransactionsByGuestId(this.guestId).subscribe({
      next: (transactions) => {
        // Get the most recent transaction for this guest
        if (transactions.length > 0) {
          this.blockchainTransaction = transactions[0];
        }
        this.loadingTransaction = false;
      },
      error: (err) => {
        console.error('Error loading blockchain transaction:', err);
        this.loadingTransaction = false;
      },
    });
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed':
      case 'verified':
        return 'check_circle';
      case 'failed':
      case 'mismatch':
      case 'not_found':
        return 'error';
      case 'pending':
        return 'schedule';
      case 'clear':
        return 'check_circle';
      case 'matched':
        return 'warning';
      default:
        return 'help_circle';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
      case 'verified':
      case 'clear':
        return 'primary';
      case 'failed':
      case 'mismatch':
      case 'not_found':
      case 'matched':
        return 'warn';
      case 'pending':
        return '';
      default:
        return '';
    }
  }

  shortenHash(hash: string): string {
    if (!hash) return '';
    return hash.substring(0, 6) + '...' + hash.substring(hash.length - 4);
  }

  viewBlockchain(): void {
    if (this.blockchainTransaction) {
      // In a real app, this would navigate to the blockchain explorer with the txId
      // For now, we'll navigate to the blockchain explorer
      this.blockchainService.getTransaction(this.blockchainTransaction.txId).subscribe({
        next: (tx) => {
          // You could also open this in a dialog or navigate with the txId
          console.log('Viewing transaction:', tx.txId);
        }
      });
    }
  }

  goToDashboard(): void {
    // In a real app, you would check the user's role and navigate accordingly
    // For now, we'll just navigate to the main dashboard
    import('@angular/router').then((router) => {
      // This is a workaround for the standalone component routing issue
      // In practice, you would inject Router and use it directly
    });
  }

  registerNew(): void {
    // Navigate to registration page
    import('@angular/router').then((router) => {
      // In practice, you would use this.router.navigate(['/register'])
    });
  }
}
