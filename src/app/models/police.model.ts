export interface Alert {
  id: string;
  type: 'wanted' | 'suspicious' | 'other';
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'closed' | 'resolved';
  guestId?: string;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface WantedPerson {
  id: string;
  name: string;
  governmentId: string;
  reason: string;
  description: string;
  image?: string;
  lastSeen: string;
  dateOfBirth?: string;
  height?: string;
  weight?: string;
  distinguishingFeatures?: string;
  aliases?: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Investigation {
  id: string;
  guestId: string;
  alertId?: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed' | 'resolved';
  assignedTo: string;
  evidence: Evidence[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Evidence {
  id: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'note';
  name: string;
  url?: string;
  content?: string;
  uploadedBy: string;
  uploadedAt: Date | string;
}

export interface CreateAlertRequest {
  type: 'wanted' | 'suspicious' | 'other';
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  guestId?: string;
}
