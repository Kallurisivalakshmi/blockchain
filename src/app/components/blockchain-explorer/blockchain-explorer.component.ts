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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { BlockchainService, BlockchainTransaction, BlockchainStatus } from '../../services/blockchain.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-blockchain-explorer',
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
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
  ],
  template: `
    <div class="explorer-container">
      <h1>Blockchain Explorer</h1>

      <div class="stats-row">
        <mat-card class="stat-card">
          <mat-card-header>
            <mat-card-title>Network Status</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="network-status" [class.connected]="status?.isConnected">
              @if (loadingStatus) {
                <mat-spinner diameter="20"></mat-spinner>
                <span>Loading...</span>
              } @else if (status) {
                <mat-icon>{{ status.isConnected ? 'check_circle' : 'error' }}</mat-icon>
                <span>{{ status.isConnected ? 'Connected' : 'Disconnected' }}</span>
              }
            </div>
            <div class="stat-details">
              <small>Network: {{ status?.network || 'N/A' }}</small><br>
              <small>Peers: {{ status?.peerCount || 'N/A' }}</small><br>
              <small>Last Block: {{ status?.lastBlockNumber || 'N/A' }}</small>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-header>
            <mat-card-title>Transaction Stats</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stat-value">{{ blockchainStats?.totalTransactions || 0 }}</div>
            <div class="stat-label">Total Transactions</div>
            <div class="stat-details">
              <small>Confirmed: {{ blockchainStats?.confirmedTransactions || 0 }}</small><br>
              <small>Pending: {{ blockchainStats?.pendingTransactions || 0 }}</small><br>
              <small>Health: {{ blockchainStats?.networkHealth || 'N/A' }}</small>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="search-card">
        <mat-card-header>
          <mat-card-title>Search Transactions</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="searchForm" (ngSubmit)="onSearch()" class="search-form">
            <mat-form-field>
              <mat-label>Transaction ID</mat-label>
              <input matInput formControlName="txId" placeholder="Enter transaction ID">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Guest ID</mat-label>
              <input matInput formControlName="guestId" placeholder="Enter guest ID">
              <mat-icon matSuffix>person</mat-icon>
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

      <mat-card>
        <mat-card-header>
          <mat-card-title>Recent Transactions</mat-card-title>
          <button mat-icon-button (click)="refreshTransactions()">
            <mat-icon>refresh</mat-icon>
          </button>
        </mat-card-header>
        <mat-card-content>
          @if (loadingTransactions) {
            <mat-spinner diameter="40" class="loading-spinner"></mat-spinner>
          } @else if (transactions.length === 0) {
            <p>No transactions found.</p>
          } @else {
            <div class="table-container">
              <table mat-table [dataSource]="transactions" class="transactions-table">
                <ng-container matColumnDef="txId">
                  <th mat-header-cell *matHeaderCellDef>Transaction ID</th>
                  <td mat-cell *matCellDef="let tx">{{ shortenId(tx.txId) }}</td>
                </ng-container>

                <ng-container matColumnDef="hash">
                  <th mat-header-cell *matHeaderCellDef>Hash</th>
                  <td mat-cell *matCellDef="let tx">{{ shortenHash(tx.hash) }}</td>
                </ng-container>

                <ng-container matColumnDef="timestamp">
                  <th mat-header-cell *matHeaderCellDef>Timestamp</th>
                  <td mat-cell *matCellDef="let tx">{{ tx.timestamp | date:'medium' }}</td>
                </ng-container>

                <ng-container matColumnDef="action">
                  <th mat-header-cell *matHeaderCellDef>Action</th>
                  <td mat-cell *matCellDef="let tx">{{ getActionFromData(tx.data) }}</td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let tx">
                    <span class="status-badge {{ tx.status }}">{{ tx.status }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="blockNumber">
                  <th mat-header-cell *matHeaderCellDef>Block</th>
                  <td mat-cell *matCellDef="let tx">{{ tx.blockNumber || 'N/A' }}</td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let tx">
                    <button mat-icon-button (click)="viewTransaction(tx.txId)">
                      <mat-icon color="primary">visibility</mat-icon>
                    </button>
                    <button mat-icon-button (click)="verifyTransaction(tx.txId)" [disabled]="tx.status !== 'pending'">
                      <mat-icon color="accent">check_circle</mat-icon>
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
              </table>
            </div>
          }
        </mat-card-content>
      </mat-card>

      @if (selectedTransaction) {
        <mat-card class="transaction-detail-card">
          <mat-card-header>
            <mat-card-title>Transaction Details</mat-card-title>
            <button mat-icon-button (click)="closeDetails()">
              <mat-icon>close</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content>
            <mat-list class="transaction-details">
              <mat-list-item>
                <mat-icon matListIcon color="primary">receipt</mat-icon>
                <span matLine><strong>Transaction ID:</strong> {{ selectedTransaction.txId }}</span>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListIcon color="primary">fingerprint</mat-icon>
                <span matLine><strong>Hash:</strong> {{ selectedTransaction.hash }}</span>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListIcon>schedule</mat-icon>
                <span matLine><strong>Timestamp:</strong> {{ selectedTransaction.timestamp | date:'medium' }}</span>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListIcon>storage</mat-icon>
                <span matLine><strong>Block Number:</strong> {{ selectedTransaction.blockNumber || 'N/A' }}</span>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListIcon>link</mat-icon>
                <span matLine><strong>Previous Hash:</strong> {{ selectedTransaction.previousHash || 'N/A' }}</span>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListIcon [color]="selectedTransaction.status === 'confirmed' ? 'primary' : 'warn'">
                  {{ selectedTransaction.status === 'confirmed' ? 'check_circle' : 'schedule' }}
                </mat-icon>
                <span matLine><strong>Status:</strong> {{ selectedTransaction.status }}</span>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListIcon>data_object</mat-icon>
                <span matLine><strong>Data:</strong></span>
                <pre class="transaction-data">{{ selectedTransaction.data | json }}</pre>
              </mat-list-item>
            </mat-list>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `.explorer-container {
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
    `.stat-label {
      color: #666;
      font-size: 14px;
    }`,
    `.stat-details {
      margin-top: 10px;
      color: #666;
      font-size: 12px;
    }`,
    `.network-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin: 10px 0;
    }`,
    `.network-status.connected {
      color: #4caf50;
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
    `.loading-spinner {
      display: block;
      margin: 20px auto;
    }`,
    `.table-container {
      overflow-x: auto;
    }`,
    `.transactions-table {
      width: 100%;
      min-width: 800px;
    }`,
    `.status-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }`,
    `.status-badge.confirmed {
      background-color: #e8f5e9;
      color: #2e7d32;
    }`,
    `.status-badge.pending {
      background-color: #fff8e1;
      color: #ff8f00;
    }`,
    `.status-badge.failed {
      background-color: #ffebee;
      color: #c62828;
    }`,
    `.transaction-detail-card {
      margin-top: 20px;
    }`,
    `.transaction-details {
      background: #f5f5f5;
      padding: 16px;
    }`,
    `.transaction-data {
      background: white;
      padding: 12px;
      border-radius: 4px;
      margin-top: 8px;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-all;
    }`,
    `@media (max-width: 768px) {
      .search-form {
        flex-direction: column;
      }
      .search-form .mat-form-field {
        width: 100%;
      }
      .transactions-table {
        font-size: 12px;
      }
    }`,
  ],
})
export class BlockchainExplorerComponent implements OnInit {
  // Data
  transactions: BlockchainTransaction[] = [];
  status: BlockchainStatus | null = null;
  blockchainStats: {
    totalTransactions: number;
    pendingTransactions: number;
    confirmedTransactions: number;
    networkHealth: string;
  } | null = null;

  // Form
  searchForm: FormGroup;

  // Selected transaction
  selectedTransaction: BlockchainTransaction | null = null;

  // Loading states
  loading = false;
  loadingTransactions = true;
  loadingStatus = true;
  loadingStats = true;

  // Table columns
  displayedColumns: string[] = ['txId', 'hash', 'timestamp', 'action', 'status', 'blockNumber', 'actions'];

  constructor(
    private fb: FormBuilder,
    private blockchainService: BlockchainService,
    private snackBar: MatSnackBar
  ) {
    this.searchForm = this.fb.group({
      txId: [''],
      guestId: [''],
    });
  }

  ngOnInit(): void {
    this.loadStatus();
    this.loadStats();
    this.loadTransactions();
  }

  loadStatus(): void {
    this.loadingStatus = true;
    this.blockchainService.getStatus().subscribe({
      next: (status) => {
        this.status = status;
        this.loadingStatus = false;
      },
      error: (err) => {
        console.error('Error loading status:', err);
        this.loadingStatus = false;
        this.snackBar.open('Failed to load network status', 'Close', { duration: 3000 });
      },
    });
  }

  loadStats(): void {
    this.loadingStats = true;
    this.blockchainService.getBlockchainStats().subscribe({
      next: (stats) => {
        this.blockchainStats = stats;
        this.loadingStats = false;
      },
      error: (err) => {
        console.error('Error loading stats:', err);
        this.loadingStats = false;
        this.snackBar.open('Failed to load blockchain stats', 'Close', { duration: 3000 });
      },
    });
  }

  loadTransactions(limit = 20): void {
    this.loadingTransactions = true;
    this.blockchainService.getTransactions(limit).subscribe({
      next: (transactions) => {
        this.transactions = transactions;
        this.loadingTransactions = false;
      },
      error: (err) => {
        console.error('Error loading transactions:', err);
        this.loadingTransactions = false;
        this.snackBar.open('Failed to load transactions', 'Close', { duration: 3000 });
      },
    });
  }

  onSearch(): void {
    if (this.searchForm.invalid) return;

    const { txId, guestId } = this.searchForm.value;
    this.loading = true;

    if (txId) {
      this.blockchainService.getTransaction(txId).subscribe({
        next: (transaction) => {
          if (transaction) {
            this.transactions = [transaction];
          } else {
            this.snackBar.open('Transaction not found', 'Close', { duration: 3000 });
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Search error:', err);
          this.loading = false;
          this.snackBar.open('Search failed', 'Close', { duration: 3000 });
        },
      });
    } else if (guestId) {
      this.blockchainService.getTransactionsByGuestId(guestId).subscribe({
        next: (transactions) => {
          this.transactions = transactions;
          this.loading = false;
          if (transactions.length === 0) {
            this.snackBar.open('No transactions found for this guest', 'Close', { duration: 3000 });
          }
        },
        error: (err) => {
          console.error('Search error:', err);
          this.loading = false;
          this.snackBar.open('Search failed', 'Close', { duration: 3000 });
        },
      });
    } else {
      this.loadTransactions();
      this.loading = false;
    }
  }

  refreshTransactions(): void {
    this.loadTransactions();
  }

  viewTransaction(txId: string): void {
    this.blockchainService.getTransaction(txId).subscribe({
      next: (transaction) => {
        if (transaction) {
          this.selectedTransaction = transaction;
        } else {
          this.snackBar.open('Transaction not found', 'Close', { duration: 3000 });
        }
      },
      error: (err) => {
        console.error('Error loading transaction:', err);
        this.snackBar.open('Failed to load transaction', 'Close', { duration: 3000 });
      },
    });
  }

  verifyTransaction(txId: string): void {
    this.loading = true;
    this.blockchainService.verifyTransaction(txId).subscribe({
      next: (isValid) => {
        if (isValid) {
          this.snackBar.open('Transaction verified successfully', 'Close', { duration: 3000 });
          // Refresh the transaction to update its status
          this.viewTransaction(txId);
        } else {
          this.snackBar.open('Transaction verification failed', 'Close', { duration: 3000 });
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Verification error:', err);
        this.loading = false;
        this.snackBar.open('Failed to verify transaction', 'Close', { duration: 3000 });
      },
    });
  }

  closeDetails(): void {
    this.selectedTransaction = null;
  }

  getActionFromData(data: any): string {
    if (!data) return 'Unknown';
    if (data.action) return data.action;
    if (data.type) return data.type;
    return 'Unknown';
  }

  shortenId(id: string): string {
    if (!id) return '';
    return id.length > 10 ? id.substring(0, 10) + '...' : id;
  }

  shortenHash(hash: string): string {
    if (!hash) return '';
    return hash.substring(0, 8) + '...' + hash.substring(hash.length - 4);
  }
}
