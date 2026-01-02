
export interface User {
  id: string;
  username: string;
  name: string;
  nip: string;
  role: string;
  avatar: string;
  school: string;
  employmentStatus: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'sick' | 'permission' | 'teaching';

export interface AttendanceRecord {
  id: string;
  date: string;
  type: 'clock-in' | 'clock-out' | 'teaching' | 'leave';
  time: string;
  location?: string;
  note?: string;
  subject?: string;
  className?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
