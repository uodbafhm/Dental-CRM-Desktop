export interface Patient {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female';
  address?: string;
  notes?: string;
  medical_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Appointment {
  id: string;
  patient_id?: string;
  patient_name: string;
  patient_phone?: string;
  appointment_date: string;
  appointment_time: string;
  duration?: number;
  treatment_type?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  source?: 'desktop' | 'website' | 'phone';
  created_at?: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  appointment_id?: string;
  title: string;
  message?: string;
  is_read: boolean;
  type?: 'appointment' | 'queue' | 'system';
  created_at?: string;
}

export interface Settings {
  clinicName: string;
  doctorName: string;
  soundAlerts: boolean;
  emailNotifications: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
}
