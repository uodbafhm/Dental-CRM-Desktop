import { useState, useEffect, useCallback, useRef } from 'react';
import { LanguageProvider, useLang } from './context/LanguageContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import PatientsView from './components/PatientsView';
import AppointmentsView from './components/AppointmentsView';
import AnalyticsView from './components/AnalyticsView';
import NotificationsView from './components/NotificationsView';
import SettingsView from './components/SettingsView';
import QueueView from './components/QueueView';
import { Appointment, Patient, Notification, Settings } from './types';
import {
  fetchPatients, fetchAppointments, fetchNotifications,
  insertPatient, updatePatient, deletePatientDB,
  insertAppointment, updateAppointment, deleteAppointmentDB,
  insertNotification, markNotificationRead, markAllNotificationsRead, deleteNotificationDB,
  subscribeToAppointments, subscribeToNotifications, subscribeToPatients,
} from './lib/supabaseService';

type View = 'dashboard' | 'calendar' | 'patients' | 'appointments' | 'analytics' | 'notifications' | 'settings' | 'queue';

const DEFAULT_SETTINGS: Settings = {
  clinicName: 'Cabinet Dentaire',
  doctorName: 'Dr. Mohammed',
  soundAlerts: true,
  emailNotifications: false,
  workingHoursStart: '08:00',
  workingHoursEnd: '18:00',
};

// ─── Realtime Toast (big popup for website appointments) ──────────────────────
function RealtimeToast({ appt, onClose, lang }: { appt: Appointment; onClose: () => void; lang: string }) {
  useEffect(() => {
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-5 right-5 z-[9999] animate-slide-in">
      <div className="bg-white border-2 border-blue-500 rounded-2xl shadow-2xl p-5 min-w-80 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 text-2xl">
            🌐
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800 text-sm">
              {lang === 'ar' ? '📅 موعد جديد من الموقع!' :
               lang === 'fr' ? '📅 Nouveau RDV du site web!' :
               '📅 New appointment from website!'}
            </p>
            <p className="text-blue-600 font-semibold mt-1">{appt.patient_name}</p>
            <p className="text-slate-500 text-xs mt-0.5">
              {appt.appointment_date} — {appt.appointment_time} | {appt.treatment_type || '—'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold shrink-0">×</button>
        </div>
        <div className="flex gap-2 mt-3">
          <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
            appt.source === 'website' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {appt.source === 'website' ? '🌐 Website' : appt.source === 'phone' ? '📞 Phone' : '🖥️ Desktop'}
          </div>
          <div className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">
            ⏳ Pending
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Simple Toast ─────────────────────────────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-[999] animate-slide-in">
      <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-72 max-w-sm">
        <p className="text-sm font-medium flex-1">{message}</p>
        <button onClick={onClose} className="text-slate-400 hover:text-white shrink-0 text-lg">×</button>
      </div>
    </div>
  );
}

// ─── Connection Status Banner ─────────────────────────────────────────────────
function ConnectionBanner({ connected }: { connected: boolean | null }) {
  if (connected === true) return null;
  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 px-4 py-2 text-xs font-semibold text-center ${
      connected === null ? 'bg-amber-400 text-amber-900' : 'bg-red-500 text-white'
    }`}>
      {connected === null ? '⏳ Connecting to Supabase...' : '❌ Offline — changes will not sync'}
    </div>
  );
}

// ─── Inner App ────────────────────────────────────────────────────────────────
function AppInner() {
  const { isRTL, t, lang } = useLang();
  const [activeView, setActiveView] = useState<View>('dashboard');

  // Data state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<Settings>(() => {
    try { return JSON.parse(localStorage.getItem('crm_settings') || '') || DEFAULT_SETTINGS; }
    catch { return DEFAULT_SETTINGS; }
  });

  const [toast, setToast] = useState<string | null>(null);
  const [realtimeToast, setRealtimeToast] = useState<Appointment | null>(null);
  const [calendarDate, setCalendarDate] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);

  // Track known appointment IDs to detect new ones
  const knownApptIds = useRef<Set<string>>(new Set());

  // ─── Sound alert ────────────────────────────────────────────────────────────
  const playAlert = useCallback(() => {
    if (!settings.soundAlerts) return;
    try {
      const ctx = new AudioContext();
      const notes = [880, 1100, 880, 1100];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.2);
        gain.gain.setValueAtTime(0.35, ctx.currentTime + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.18);
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 0.2);
      });
    } catch (_) {}
  }, [settings.soundAlerts]);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  // ─── Load initial data ───────────────────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const [p, a, n] = await Promise.all([
          fetchPatients(),
          fetchAppointments(),
          fetchNotifications(),
        ]);
        setPatients(p);
        setAppointments(a);
        setNotifications(n);
        // Seed known IDs — don't trigger alerts for existing appointments
        a.forEach(ap => knownApptIds.current.add(ap.id));
        setConnected(true);
      } catch {
        setConnected(false);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  // ─── Realtime subscriptions ──────────────────────────────────────────────────
  useEffect(() => {
    // Appointments realtime
    const apptSub = subscribeToAppointments((payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;

      if (eventType === 'INSERT' && newRow.id) {
        const appt: Appointment = {
          id: newRow.id as string,
          patient_id: newRow.patient_id as string | undefined,
          patient_name: newRow.patient_name as string,
          patient_phone: newRow.patient_phone as string | undefined,
          appointment_date: newRow.appointment_date as string,
          appointment_time: (newRow.appointment_time as string)?.slice(0, 5) ?? '',
          duration: newRow.duration as number | undefined,
          treatment_type: newRow.treatment_type as string | undefined,
          status: newRow.status as Appointment['status'],
          notes: newRow.notes as string | undefined,
          source: newRow.source as Appointment['source'],
          created_at: newRow.created_at as string | undefined,
        };

        // Only alert if it's a new appointment we haven't seen
        if (!knownApptIds.current.has(appt.id)) {
          knownApptIds.current.add(appt.id);
          setAppointments(prev => [...prev, appt]);

          // Show big popup + sound for website/phone appointments
          if (appt.source === 'website' || appt.source === 'phone') {
            setRealtimeToast(appt);
            playAlert();
            // Add notification
            setNotifications(prev => [{
              id: `notif-${appt.id}`,
              appointment_id: appt.id,
              title: t('newAppointmentRequest'),
              message: `${appt.patient_name} — ${appt.appointment_date} ${appt.appointment_time}`,
              is_read: false,
              type: 'appointment',
              created_at: new Date().toISOString(),
            }, ...prev]);
          }
        }
      }

      if (eventType === 'UPDATE' && newRow.id) {
        setAppointments(prev => prev.map(a =>
          a.id === newRow.id ? {
            ...a,
            status: newRow.status as Appointment['status'],
            appointment_date: newRow.appointment_date as string,
            appointment_time: (newRow.appointment_time as string)?.slice(0, 5) ?? a.appointment_time,
            treatment_type: newRow.treatment_type as string | undefined,
            notes: newRow.notes as string | undefined,
          } : a
        ));
      }

      if (eventType === 'DELETE' && oldRow?.id) {
        setAppointments(prev => prev.filter(a => a.id !== oldRow.id));
      }
    });

    // Notifications realtime
    const notifSub = subscribeToNotifications((payload) => {
      const { eventType, new: newRow } = payload;
      if (eventType === 'INSERT' && newRow.id) {
        const notif: Notification = {
          id: newRow.id as string,
          appointment_id: newRow.appointment_id as string | undefined,
          title: newRow.title as string,
          message: newRow.message as string | undefined,
          is_read: newRow.is_read as boolean,
          created_at: newRow.created_at as string | undefined,
        };
        setNotifications(prev => {
          if (prev.find(n => n.id === notif.id)) return prev;
          return [notif, ...prev];
        });
      }
    });

    // Patients realtime
    const patientSub = subscribeToPatients((payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;
      if (eventType === 'INSERT' && newRow.id) {
        const p: Patient = {
          id: newRow.id as string,
          full_name: newRow.full_name as string,
          phone: newRow.phone as string | undefined,
          email: newRow.email as string | undefined,
          gender: newRow.gender as Patient['gender'],
          date_of_birth: newRow.date_of_birth as string | undefined,
          address: newRow.address as string | undefined,
          notes: (newRow.medical_notes || newRow.notes) as string | undefined,
          created_at: newRow.created_at as string | undefined,
        };
        setPatients(prev => {
          if (prev.find(x => x.id === p.id)) return prev;
          return [p, ...prev];
        });
      }
      if (eventType === 'DELETE' && oldRow?.id) {
        setPatients(prev => prev.filter(p => p.id !== oldRow.id));
      }
    });

    return () => {
      apptSub.unsubscribe();
      notifSub.unsubscribe();
      patientSub.unsubscribe();
    };
  }, [playAlert, t]);

  // ─── Persist settings only ──────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('crm_settings', JSON.stringify(settings));
  }, [settings]);

  // ─── Patient CRUD ────────────────────────────────────────────────────────────
  const addPatient = async (p: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => {
    const result = await insertPatient(p);
    if (result) {
      setPatients(prev => [result, ...prev]);
      showToast(`✅ Patient added: ${p.full_name}`);
    } else {
      showToast('❌ Failed to add patient');
    }
  };

  const editPatient = async (p: Patient) => {
    const result = await updatePatient(p);
    if (result) {
      setPatients(prev => prev.map(x => x.id === p.id ? result : x));
      showToast(`✅ Patient updated`);
    }
  };

  const deletePatient = async (id: string) => {
    const ok = await deletePatientDB(id);
    if (ok) {
      setPatients(prev => prev.filter(x => x.id !== id));
    }
  };

  // ─── Appointment CRUD ────────────────────────────────────────────────────────
  const addAppointment = async (a: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => {
    const result = await insertAppointment(a);
    if (result) {
      knownApptIds.current.add(result.id);
      setAppointments(prev => [...prev, result]);

      // Create notification in Supabase
      const notif = await insertNotification({
        appointment_id: result.id,
        title: t('newAppointmentRequest'),
        message: `${a.patient_name} — ${a.appointment_date} ${a.appointment_time}`,
        is_read: false,
      });
      if (notif) {
        setNotifications(prev => [notif, ...prev]);
      }
      showToast(`🦷 New appointment: ${a.patient_name}`);
    } else {
      showToast('❌ Failed to add appointment');
    }
  };

  const editAppointment = async (a: Appointment) => {
    const result = await updateAppointment(a);
    if (result) {
      setAppointments(prev => prev.map(x => x.id === a.id ? result : x));
      showToast(`✅ Appointment updated`);
    }
  };

  const deleteAppointment = async (id: string) => {
    const ok = await deleteAppointmentDB(id);
    if (ok) {
      setAppointments(prev => prev.filter(x => x.id !== id));
    }
  };

  // ─── Notifications CRUD ──────────────────────────────────────────────────────
  const markNotifRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllNotifRead = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotif = async (id: string) => {
    await deleteNotificationDB(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNewAppointment = (date?: string) => {
    setCalendarDate(date);
    setActiveView('appointments');
  };

  const handleSelectAppointment = (_appt: Appointment) => {
    setActiveView('appointments');
  };

  const renderView = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-semibold">Loading data from Supabase...</p>
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <Dashboard appointments={appointments} patients={patients} />;
      case 'calendar':
        return <CalendarView appointments={appointments} onNewAppointment={handleNewAppointment} onSelectAppointment={handleSelectAppointment} />;
      case 'patients':
        return <PatientsView patients={patients} appointments={appointments} onAddPatient={addPatient} onEditPatient={editPatient} onDeletePatient={deletePatient} />;
      case 'appointments':
        return <AppointmentsView appointments={appointments} patients={patients} onAdd={addAppointment} onEdit={editAppointment} onDelete={deleteAppointment} defaultDate={calendarDate} />;
      case 'analytics':
        return <AnalyticsView appointments={appointments} patients={patients} />;
      case 'notifications':
        return <NotificationsView notifications={notifications} onMarkRead={markNotifRead} onMarkAllRead={markAllNotifRead} onDelete={deleteNotif} />;
      case 'queue':
        return (
          <QueueView
            appointments={appointments}
            patients={patients}
            onEditAppointment={editAppointment}
            onDeleteAppointment={deleteAppointment}
            onDeletePatient={deletePatient}
          />
        );
      case 'settings':
        return <SettingsView settings={settings} onSave={s => { setSettings(s); showToast('✅ Settings saved!'); }} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`flex h-screen w-screen bg-slate-50 overflow-hidden select-none ${isRTL ? 'flex-row-reverse font-tajawal' : 'flex-row'}`}
      style={{ fontFamily: isRTL ? "'Tajawal', sans-serif" : "'Inter', sans-serif" }}
    >
      <Sidebar
        activeView={activeView}
        setActiveView={(v) => { setActiveView(v); setCalendarDate(undefined); }}
        notificationCount={unreadCount}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>

      {/* Connection banner */}
      <ConnectionBanner connected={connected} />

      {/* Realtime popup for new website appointments */}
      {realtimeToast && (
        <RealtimeToast
          appt={realtimeToast}
          lang={lang}
          onClose={() => setRealtimeToast(null)}
        />
      )}

      {/* Simple toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Root App with Provider ───────────────────────────────────────────────────
export default function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  );
}
