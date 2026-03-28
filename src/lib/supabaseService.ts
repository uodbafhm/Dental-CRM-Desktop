import { supabase } from './supabase';
import { Patient, Appointment, Notification } from '../types';

// ─────────────────────────────────────────────
// PATIENTS
// ─────────────────────────────────────────────

export async function fetchPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchPatients:', error.message); return []; }
  return (data || []).map(normalizePatient);
}

export async function insertPatient(p: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .insert([{
      full_name: p.full_name,
      phone: p.phone || null,
      email: p.email || null,
      date_of_birth: p.date_of_birth || null,
      gender: p.gender || null,
      address: p.address || null,
      medical_notes: p.notes || null,
    }])
    .select()
    .single();
  if (error) { console.error('insertPatient:', error.message); return null; }
  return normalizePatient(data);
}

export async function updatePatient(p: Patient): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .update({
      full_name: p.full_name,
      phone: p.phone || null,
      email: p.email || null,
      date_of_birth: p.date_of_birth || null,
      gender: p.gender || null,
      address: p.address || null,
      medical_notes: p.notes || null,
    })
    .eq('id', p.id)
    .select()
    .single();
  if (error) { console.error('updatePatient:', error.message); return null; }
  return normalizePatient(data);
}

export async function deletePatientDB(id: string): Promise<boolean> {
  const { error } = await supabase.from('patients').delete().eq('id', id);
  if (error) { console.error('deletePatient:', error.message); return false; }
  return true;
}

function normalizePatient(d: Record<string, unknown>): Patient {
  return {
    id: d.id as string,
    full_name: d.full_name as string,
    phone: d.phone as string | undefined,
    email: d.email as string | undefined,
    date_of_birth: d.date_of_birth as string | undefined,
    gender: d.gender as 'male' | 'female' | undefined,
    address: d.address as string | undefined,
    notes: (d.medical_notes || d.notes) as string | undefined,
    created_at: d.created_at as string | undefined,
    updated_at: d.updated_at as string | undefined,
  };
}

// ─────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────

export async function fetchAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true });
  if (error) { console.error('fetchAppointments:', error.message); return []; }
  return (data || []).map(normalizeAppointment);
}

export async function insertAppointment(a: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .insert([{
      patient_id: a.patient_id || null,
      patient_name: a.patient_name,
      patient_phone: a.patient_phone || null,
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time,
      duration: a.duration || 30,
      treatment_type: a.treatment_type || null,
      status: a.status || 'pending',
      notes: a.notes || null,
      source: 'desktop',
    }])
    .select()
    .single();
  if (error) { console.error('insertAppointment:', error.message); return null; }
  return normalizeAppointment(data);
}

export async function updateAppointment(a: Appointment): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .update({
      patient_id: a.patient_id || null,
      patient_name: a.patient_name,
      patient_phone: a.patient_phone || null,
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time,
      duration: a.duration || 30,
      treatment_type: a.treatment_type || null,
      status: a.status,
      notes: a.notes || null,
    })
    .eq('id', a.id)
    .select()
    .single();
  if (error) { console.error('updateAppointment:', error.message); return null; }
  return normalizeAppointment(data);
}

export async function deleteAppointmentDB(id: string): Promise<boolean> {
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) { console.error('deleteAppointment:', error.message); return false; }
  return true;
}

function normalizeAppointment(d: Record<string, unknown>): Appointment {
  return {
    id: d.id as string,
    patient_id: d.patient_id as string | undefined,
    patient_name: d.patient_name as string,
    patient_phone: d.patient_phone as string | undefined,
    appointment_date: d.appointment_date as string,
    appointment_time: (d.appointment_time as string)?.slice(0, 5) ?? '',
    duration: d.duration as number | undefined,
    treatment_type: d.treatment_type as string | undefined,
    status: d.status as Appointment['status'],
    notes: d.notes as string | undefined,
    created_at: d.created_at as string | undefined,
    updated_at: d.updated_at as string | undefined,
  };
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────

export async function fetchNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { console.error('fetchNotifications:', error.message); return []; }
  return (data || []).map(normalizeNotification);
}

export async function insertNotification(n: Omit<Notification, 'id' | 'created_at'>): Promise<Notification | null> {
  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      appointment_id: n.appointment_id || null,
      title: n.title,
      message: n.message || null,
      is_read: false,
      type: 'appointment',
    }])
    .select()
    .single();
  if (error) { console.error('insertNotification:', error.message); return null; }
  return normalizeNotification(data);
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

export async function markAllNotificationsRead(): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
}

export async function deleteNotificationDB(id: string): Promise<void> {
  await supabase.from('notifications').delete().eq('id', id);
}

function normalizeNotification(d: Record<string, unknown>): Notification {
  return {
    id: d.id as string,
    appointment_id: d.appointment_id as string | undefined,
    title: d.title as string,
    message: d.message as string | undefined,
    is_read: d.is_read as boolean,
    created_at: d.created_at as string | undefined,
  };
}

// ─────────────────────────────────────────────
// QUEUE
// ─────────────────────────────────────────────

export interface QueueEntryDB {
  id: string;
  patient_name: string;
  patient_phone?: string;
  treatment_type?: string;
  appointment_id?: string;
  patient_id?: string;
  position: number;
  status: 'waiting' | 'in_progress' | 'done';
  queue_date: string;
  created_at?: string;
}

export async function fetchQueue(date: string): Promise<QueueEntryDB[]> {
  const { data, error } = await supabase
    .from('queue')
    .select('*')
    .eq('queue_date', date)
    .order('position', { ascending: true });
  if (error) { console.error('fetchQueue:', error.message); return []; }
  return data || [];
}

export async function insertQueueEntry(entry: Omit<QueueEntryDB, 'id' | 'created_at'>): Promise<QueueEntryDB | null> {
  const { data, error } = await supabase
    .from('queue')
    .insert([entry])
    .select()
    .single();
  if (error) { console.error('insertQueueEntry:', error.message); return null; }
  return data;
}

export async function updateQueueEntry(id: string, updates: Partial<QueueEntryDB>): Promise<void> {
  await supabase.from('queue').update(updates).eq('id', id);
}

export async function deleteQueueEntry(id: string): Promise<void> {
  await supabase.from('queue').delete().eq('id', id);
}

export async function reorderQueue(entries: QueueEntryDB[]): Promise<void> {
  // Update positions for all entries
  const updates = entries.map((e, i) => ({ id: e.id, position: i + 1 }));
  for (const u of updates) {
    await supabase.from('queue').update({ position: u.position }).eq('id', u.id);
  }
}

// ─────────────────────────────────────────────
// REALTIME SUBSCRIPTIONS
// ─────────────────────────────────────────────

type RealtimeCallback<T> = (payload: { eventType: string; new: T; old: T }) => void;

export function subscribeToAppointments(cb: RealtimeCallback<Record<string, unknown>>) {
  return supabase
    .channel('appointments-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, cb)
    .subscribe();
}

export function subscribeToNotifications(cb: RealtimeCallback<Record<string, unknown>>) {
  return supabase
    .channel('notifications-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, cb)
    .subscribe();
}

export function subscribeToQueue(cb: RealtimeCallback<Record<string, unknown>>) {
  return supabase
    .channel('queue-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, cb)
    .subscribe();
}

export function subscribeToPatients(cb: RealtimeCallback<Record<string, unknown>>) {
  return supabase
    .channel('patients-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, cb)
    .subscribe();
}
