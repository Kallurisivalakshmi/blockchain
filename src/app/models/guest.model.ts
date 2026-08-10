export interface Guest {
  id: string;
  name: string;
  phone: string;
  governmentId: string;
  idDocument: File | string | null;
  checkInDate: Date | string;
  checkOutDate: Date | string;
  status: 'pending' | 'verified' | 'rejected' | 'flagged';
  verificationResult?: VerificationResult;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface VerificationResult {
  id: string;
  ocrStatus: 'pending' | 'completed' | 'failed';
  ocrData?: OcrData;
  databaseCheck: 'pending' | 'verified' | 'mismatch' | 'not_found';
  watchlistCheck: 'pending' | 'clear' | 'matched';
  watchlistMatches?: string[];
  verifiedAt: Date | string;
}

export interface OcrData {
  name: string;
  idNumber: string;
  idType: string;
  issueDate?: string;
  expiryDate?: string;
}

export interface GuestRegistration {
  name: string;
  phone: string;
  governmentId: string;
  idDocument: File | string;
  checkInDate: Date | string;
  checkOutDate: Date | string;
}
