export interface User {
  id: string;
  username: string;
  email: string;
  role: 'hotel' | 'police' | 'admin';
  hotelId?: string; // For hotel staff
  policeId?: string; // For police officers
  name?: string;
  phone?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  role: 'hotel' | 'police';
}

export interface LoginResponse {
  user: User;
  token: string;
  expiresIn: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}
