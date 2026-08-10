import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export interface BlockchainTransaction {
  txId: string;
  hash: string;
  timestamp: Date;
  data: any;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  previousHash?: string;
}

export interface BlockchainStatus {
  isConnected: boolean;
  network: string;
  lastBlockNumber: number;
  transactionCount: number;
  peerCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class BlockchainService {
  private readonly API_URL = '/api/blockchain';
  private transactions: BlockchainTransaction[] = [];
  private status: BlockchainStatus = {
    isConnected: true,
    network: 'hotel-police-network',
    lastBlockNumber: 12345,
    transactionCount: 42,
    peerCount: 4,
  };

  constructor(private http: HttpClient) {
    // Mock transactions
    this.transactions = [
      {
        txId: 'tx-123456789',
        hash: 'a1b2c3d4e5f6...',
        timestamp: new Date(),
        data: { guestId: '1', action: 'verify', result: 'success' },
        status: 'confirmed',
        blockNumber: 12345,
        previousHash: 'z9y8x7w6...',
      },
      {
        txId: 'tx-987654321',
        hash: 'f6e5d4c3b2a1...',
        timestamp: new Date(Date.now() - 3600000),
        data: { guestId: '2', action: 'register', result: 'pending' },
        status: 'confirmed',
        blockNumber: 12344,
        previousHash: 'y8z9x0w1...',
      },
    ];
  }

  getStatus(): Observable<BlockchainStatus> {
    // In production: return this.http.get<BlockchainStatus>(`${this.API_URL}/status`);
    return of(this.status);
  }

  getTransaction(txId: string): Observable<BlockchainTransaction | undefined> {
    // In production: return this.http.get<BlockchainTransaction>(`${this.API_URL}/transactions/${txId}`);
    return of(this.transactions.find((tx) => tx.txId === txId));
  }

  getTransactions(limit = 10): Observable<BlockchainTransaction[]> {
    // In production: return this.http.get<BlockchainTransaction[]>(`${this.API_URL}/transactions?limit=${limit}`);
    return of(
      [...this.transactions].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, limit)
    );
  }

  getTransactionsByGuestId(guestId: string): Observable<BlockchainTransaction[]> {
    // In production: return this.http.get<BlockchainTransaction[]>(`${this.API_URL}/transactions?guestId=${guestId}`);
    return of(
      this.transactions.filter((tx) => tx.data?.guestId === guestId)
    );
  }

  createTransaction(data: any): Observable<BlockchainTransaction> {
    const newTx: BlockchainTransaction = {
      txId: 'tx-' + Date.now().toString(),
      hash: this.generateMockHash(),
      timestamp: new Date(),
      data,
      status: 'pending',
    };
    this.transactions.push(newTx);
    // In production: return this.http.post<BlockchainTransaction>(`${this.API_URL}/transactions`, data);
    
    // Simulate confirmation after a short delay
    setTimeout(() => {
      newTx.status = 'confirmed';
      newTx.blockNumber = this.status.lastBlockNumber + 1;
      newTx.previousHash = this.transactions[this.transactions.length - 2]?.hash || 'genesis';
      this.status.lastBlockNumber++;
      this.status.transactionCount++;
    }, 2000);
    
    return of(newTx);
  }

  private generateMockHash(): string {
    const chars = 'abcdef0123456789';
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
  }

  verifyTransaction(txId: string): Observable<boolean> {
    // In production: return this.http.get<boolean>(`${this.API_URL}/transactions/${txId}/verify`);
    return this.getTransaction(txId).pipe(
      map((tx) => tx?.status === 'confirmed' || false)
    );
  }

  getBlockchainStats(): Observable<{
    totalTransactions: number;
    pendingTransactions: number;
    confirmedTransactions: number;
    networkHealth: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    const total = this.transactions.length;
    const pending = this.transactions.filter((tx) => tx.status === 'pending').length;
    const confirmed = this.transactions.filter((tx) => tx.status === 'confirmed').length;
    
    return of({
      totalTransactions: total,
      pendingTransactions: pending,
      confirmedTransactions: confirmed,
      networkHealth: this.status.isConnected ? 'healthy' : 'unhealthy',
    });
  }
}
