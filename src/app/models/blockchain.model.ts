export interface BlockchainTransaction {
  txId: string;
  hash: string;
  previousHash: string;
  blockNumber: number;
  timestamp: Date | string;
  data: any;
  status: 'pending' | 'confirmed' | 'failed';
  guestId?: string;
  type?: string;
}

export interface BlockchainStatus {
  isConnected: boolean;
  network: string;
  peerCount: number;
  lastBlockNumber: number;
  lastBlockHash: string;
  chainHeight: number;
  version: string;
}

export interface BlockchainStats {
  totalTransactions: number;
  pendingTransactions: number;
  confirmedTransactions: number;
  networkHealth: string;
  averageBlockTime: number;
  totalBlocks: number;
}

export interface CreateTransactionRequest {
  guestId: string;
  action: string;
  result?: string;
  timestamp: Date | string;
  data: any;
}
