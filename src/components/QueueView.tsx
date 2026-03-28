import { useState, useCallback, useEffect } from 'react';
import { useLang } from '../context/LanguageContext';
import { Appointment, Patient } from '../types';
import {
  fetchQueue, insertQueueEntry, updateQueueEntry,
  deleteQueueEntry, reorderQueue, subscribeToQueue,
  QueueEntryDB,
} from '../lib/supabaseService';

interface DeleteModal {
  entryId: string;
  patientName: string;
  appointmentId?: string;
  patientId?: string;
}

interface QueueViewProps {
  appointments: Appointment[];
  patients: Patient[];
  onEditAppointment: (a: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
  onDeletePatient: (id: string) => void;
}

function playCallSound() {
  try {
    const ctx = new AudioContext();
    [0, 0.35, 0.7].forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, ctx.currentTime + t);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + t + 0.25);
      gain.gain.setValueAtTime(0.45, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.28);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    });
  } catch (_) {}
}

const TODAY = new Date().toISOString().split('T')[0];

const ORDINALS: Record<string, string[]> = {
  en: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'],
  fr: ['1er', '2ème', '3ème', '4ème', '5ème', '6ème', '7ème', '8ème', '9ème', '10ème'],
  ar: ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'],
};

function ordinal(pos: number, lang: string): string {
  const arr = ORDINALS[lang] ?? ORDINALS['en'];
  return arr[pos - 1] ?? `#${pos}`;
}

const TREATMENTS = [
  'Cleaning', 'Filling', 'Extraction', 'Root Canal',
  'Crown', 'Consultation', 'X-Ray', 'Whitening', 'Implant', 'Braces',
];

export default function QueueView({
  appointments,
  onDeleteAppointment,
  onDeletePatient,
}: QueueViewProps) {
  const { t, lang, isRTL } = useLang();

  const [queue, setQueue] = useState<QueueEntryDB[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [called, setCalled] = useState(false);
  const [deleteModal, setDeleteModal] = useState<DeleteModal | null>(null);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addTreatment, setAddTreatment] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [undoEntry, setUndoEntry] = useState<{ entry: QueueEntryDB; snapshot: QueueEntryDB[] } | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const todayAppts = appointments.filter(
    a => a.appointment_date === TODAY && a.status !== 'completed' && a.status !== 'cancelled'
  ).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  const waitingList = queue.filter(e => e.status === 'waiting');
  const currentEntry = queue.find(e => e.status === 'in_progress') ?? null;
  const nextEntry = waitingList[0] ?? null;
  const doneCount = queue.filter(e => e.status === 'done').length;

  // ─── Load queue from Supabase ──────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoadingQueue(true);
      const data = await fetchQueue(TODAY);
      setQueue(data);
      setLoadingQueue(false);
    }
    load();
  }, []);

  // ─── Realtime queue subscription ──────────────────────────────────────────
  useEffect(() => {
    const sub = subscribeToQueue((payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;
      if (eventType === 'INSERT' && newRow.id) {
        const entry = newRow as unknown as QueueEntryDB;
        if (entry.queue_date === TODAY) {
          setQueue(prev => {
            if (prev.find(e => e.id === entry.id)) return prev;
            return [...prev, entry].sort((a, b) => a.position - b.position);
          });
        }
      }
      if (eventType === 'UPDATE' && newRow.id) {
        setQueue(prev => prev.map(e =>
          e.id === newRow.id ? { ...e, ...(newRow as unknown as QueueEntryDB) } : e
        ).sort((a, b) => a.position - b.position));
      }
      if (eventType === 'DELETE' && oldRow?.id) {
        setQueue(prev => prev.filter(e => e.id !== oldRow.id));
      }
    });
    return () => { sub.unsubscribe(); };
  }, []);

  // ─── Get next position ─────────────────────────────────────────────────────
  function getNextPosition(): number {
    if (queue.length === 0) return 1;
    return Math.max(...queue.map(e => e.position)) + 1;
  }

  // ─── Add walk-in ───────────────────────────────────────────────────────────
  const addWalkIn = useCallback(async () => {
    if (!addName.trim()) return;
    const entry = await insertQueueEntry({
      patient_name: addName.trim(),
      patient_phone: addPhone.trim() || undefined,
      treatment_type: addTreatment || undefined,
      position: getNextPosition(),
      status: 'waiting',
      queue_date: TODAY,
    });
    if (entry) {
      setQueue(prev => [...prev, entry]);
    }
    setAddName(''); setAddPhone(''); setAddTreatment('');
    setShowAddForm(false);
  }, [addName, addPhone, addTreatment, queue]);

  // ─── Add from today's appointment ─────────────────────────────────────────
  const addFromAppt = useCallback(async (appt: Appointment) => {
    const already = queue.find(e =>
      e.appointment_id === appt.id || e.patient_name === appt.patient_name
    );
    if (already) return;
    const entry = await insertQueueEntry({
      patient_name: appt.patient_name,
      patient_phone: appt.patient_phone,
      treatment_type: appt.treatment_type,
      appointment_id: appt.id,
      patient_id: appt.patient_id,
      position: getNextPosition(),
      status: 'waiting',
      queue_date: TODAY,
    });
    if (entry) {
      setQueue(prev => [...prev, entry]);
    }
  }, [queue]);

  // ─── Call next ─────────────────────────────────────────────────────────────
  const callNext = useCallback(async () => {
    if (!nextEntry) return;
    playCallSound();
    setCalled(true);
    setTimeout(() => setCalled(false), 1200);

    // Mark current as done
    if (currentEntry) {
      await updateQueueEntry(currentEntry.id, { status: 'done' });
      setQueue(prev => prev.map(e => e.id === currentEntry.id ? { ...e, status: 'done' } : e));
    }

    // Mark next as in_progress
    await updateQueueEntry(nextEntry.id, { status: 'in_progress' });
    setQueue(prev => prev.map(e => e.id === nextEntry.id ? { ...e, status: 'in_progress' } : e));
  }, [nextEntry, currentEntry]);

  // ─── Left clinic (current leaves without being called next) ───────────────
  const leftClinic = useCallback(async () => {
    if (!currentEntry) return;
    await updateQueueEntry(currentEntry.id, { status: 'done' });
    setQueue(prev => prev.map(e => e.id === currentEntry.id ? { ...e, status: 'done' } : e));
  }, [currentEntry]);

  // ─── Delete from queue only (with undo) ───────────────────────────────────
  const removeFromQueueOnly = useCallback(async (entryId: string) => {
    const snapshot = [...queue];
    const entry = queue.find(e => e.id === entryId);
    if (!entry) return;

    // Remove locally
    const filtered = queue.filter(e => e.id !== entryId);
    // Re-number waiting entries
    const renumbered: QueueEntryDB[] = [];
    let pos = 1;
    for (const e of filtered) {
      if (e.status === 'waiting') {
        renumbered.push({ ...e, position: pos++ });
      } else {
        renumbered.push(e);
      }
    }
    setQueue(renumbered);

    // Delete from Supabase
    await deleteQueueEntry(entryId);
    await reorderQueue(renumbered.filter(e => e.status === 'waiting'));

    // Undo timer
    if (undoTimer) clearTimeout(undoTimer);
    setUndoEntry({ entry, snapshot });
    const timer = setTimeout(() => setUndoEntry(null), 5000);
    setUndoTimer(timer);
    setDeleteModal(null);
  }, [queue, undoTimer]);

  // ─── Undo remove ──────────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    if (!undoEntry) return;
    if (undoTimer) clearTimeout(undoTimer);
    setUndoTimer(null);

    // Re-insert
    const restored = await insertQueueEntry({
      patient_name: undoEntry.entry.patient_name,
      patient_phone: undoEntry.entry.patient_phone,
      treatment_type: undoEntry.entry.treatment_type,
      appointment_id: undoEntry.entry.appointment_id,
      patient_id: undoEntry.entry.patient_id,
      position: undoEntry.entry.position,
      status: 'waiting',
      queue_date: TODAY,
    });
    if (restored) {
      setQueue(prev => [...prev, restored].sort((a, b) => a.position - b.position));
    }
    setUndoEntry(null);
  }, [undoEntry, undoTimer]);

  // ─── Full delete (queue + appointment + patient) ───────────────────────────
  const handleFullDelete = useCallback(async (modal: DeleteModal) => {
    await deleteQueueEntry(modal.entryId);
    setQueue(prev => prev.filter(e => e.id !== modal.entryId));
    if (modal.appointmentId) await onDeleteAppointment(modal.appointmentId);
    if (modal.patientId) await onDeletePatient(modal.patientId);
    setDeleteModal(null);
  }, [onDeleteAppointment, onDeletePatient]);

  // ─── Already in queue check ────────────────────────────────────────────────
  const isInQueue = (appt: Appointment) =>
    queue.some(e => e.appointment_id === appt.id || e.patient_name === appt.patient_name);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col gap-5 ${isRTL ? 'font-tajawal' : ''}`}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🪑 {t('waitingRoom')}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString(lang === 'ar' ? 'ar-MA' : lang === 'fr' ? 'fr-FR' : 'en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="flex gap-2">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-amber-600 font-semibold">{t('waiting')}</p>
              <p className="text-2xl font-black text-amber-600">{waitingList.length}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-emerald-600 font-semibold">{t('done')}</p>
              <p className="text-2xl font-black text-emerald-600">{doneCount}</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all"
          >
            <span className="text-lg">+</span> {t('addWalkIn')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">

        {/* ── LEFT: Big Board ── */}
        <div className="col-span-8 flex flex-col gap-4">

          {/* Current Patient — Big Board */}
          <div className={`relative overflow-hidden rounded-3xl p-8 transition-all duration-500 ${
            currentEntry
              ? 'bg-gradient-to-br from-blue-600 to-blue-800 shadow-2xl shadow-blue-500/30'
              : 'bg-gradient-to-br from-slate-700 to-slate-900'
          } ${called ? 'scale-[1.02]' : 'scale-100'}`}>

            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-8 text-9xl font-black text-white">🦷</div>
            </div>

            <div className="relative z-10">
              <p className="text-blue-200 text-sm font-bold uppercase tracking-widest mb-2">
                {currentEntry ? t('nowServing') : t('noCurrentPatient')}
              </p>

              {currentEntry ? (
                <>
                  {/* Big Number */}
                  <div className={`text-[120px] font-black leading-none text-white transition-all duration-300 ${called ? 'scale-110' : ''}`}>
                    {String(currentEntry.position).padStart(2, '0')}
                  </div>
                  {/* Name */}
                  <div className="mt-3">
                    <p className="text-3xl font-bold text-white">{currentEntry.patient_name}</p>
                    {currentEntry.treatment_type && (
                      <p className="text-blue-200 text-lg mt-1">{currentEntry.treatment_type}</p>
                    )}
                  </div>
                  {/* Left clinic button */}
                  <button
                    onClick={leftClinic}
                    className="mt-5 px-5 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    🚪 {t('leftClinic')}
                  </button>
                </>
              ) : (
                <div className="text-[80px] font-black text-slate-500 leading-none">--</div>
              )}
            </div>

            {/* Called animation */}
            {called && (
              <div className="absolute inset-0 bg-white/10 rounded-3xl animate-ping pointer-events-none" />
            )}
          </div>

          {/* Next Patient + Call Button */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('nextPatient')}</p>
                {nextEntry ? (
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center">
                      <span className="text-2xl font-black text-amber-600">
                        {String(nextEntry.position).padStart(2, '0')}
                      </span>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-slate-800">{nextEntry.patient_name}</p>
                      <p className="text-sm text-slate-400">{nextEntry.treatment_type || '—'}</p>
                      <p className="text-xs text-amber-500 font-semibold mt-0.5">
                        {ordinal(nextEntry.position, lang)} {lang === 'ar' ? 'في الانتظار' : lang === 'fr' ? 'en attente' : 'in queue'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-sm mt-1">{t('queueEmpty')}</p>
                )}
              </div>

              {/* Call Next Button */}
              <button
                onClick={callNext}
                disabled={!nextEntry}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-lg ${
                  nextEntry
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30 hover:scale-105 active:scale-95'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                <span className="text-2xl">🔔</span>
                {t('callNext')}
              </button>
            </div>
          </div>

          {/* Loading state */}
          {loadingQueue && (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm ml-3">Loading queue from Supabase...</p>
            </div>
          )}

          {/* Waiting List */}
          {!loadingQueue && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-700">
                  🪑 {t('waitingList')} ({waitingList.length})
                </h3>
                {/* Supabase badge */}
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-xs text-emerald-600 font-semibold">Live • Supabase</span>
                </div>
              </div>

              {waitingList.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-4xl mb-3">🪑</p>
                  <p className="text-slate-400 font-medium">{t('queueEmpty')}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {waitingList.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                        idx === 0 ? 'bg-amber-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Position badge */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${
                        idx === 0 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {String(entry.position).padStart(2, '0')}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{entry.patient_name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {entry.patient_phone && (
                            <span className="text-xs text-slate-400">{entry.patient_phone}</span>
                          )}
                          {entry.treatment_type && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                              {entry.treatment_type}
                            </span>
                          )}
                          {entry.appointment_id && (
                            <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                              📅 {lang === 'ar' ? 'موعد' : lang === 'fr' ? 'RDV' : 'Appt'}
                            </span>
                          )}
                          {idx === 0 && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                              {lang === 'ar' ? '← التالي' : lang === 'fr' ? '← Suivant' : '← Next'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => setDeleteModal({
                          entryId: entry.id,
                          patientName: entry.patient_name,
                          appointmentId: entry.appointment_id,
                          patientId: entry.patient_id,
                        })}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                        title="Remove"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Today's Appointments ── */}
        <div className="col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-700">📅 {t('todaySchedule')}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'ar' ? 'اضغط + لإضافة للطابور' : lang === 'fr' ? 'Cliquez + pour ajouter' : 'Click + to add to queue'}
              </p>
            </div>

            {todayAppts.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-3xl mb-2">📅</p>
                <p className="text-slate-400 text-sm">{t('noAppointments')}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-[540px] overflow-y-auto">
                {todayAppts.map(appt => {
                  const inQueue = isInQueue(appt);
                  return (
                    <div
                      key={appt.id}
                      className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                        inQueue ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-12 text-center shrink-0">
                        <p className="text-xs font-black text-blue-500">{appt.appointment_time}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{appt.patient_name}</p>
                        <p className="text-xs text-slate-400 truncate">{appt.treatment_type || '—'}</p>
                        {/* Source badge */}
                        {appt.source && appt.source !== 'desktop' && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            appt.source === 'website'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-orange-100 text-orange-600'
                          }`}>
                            {appt.source === 'website' ? '🌐 Web' : '📞 Tel'}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => !inQueue && addFromAppt(appt)}
                        disabled={inQueue}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all shrink-0 ${
                          inQueue
                            ? 'bg-emerald-100 text-emerald-600 cursor-default'
                            : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-110 shadow-sm'
                        }`}
                        title={inQueue ? 'Already in queue' : 'Add to queue'}
                      >
                        {inQueue ? '✓' : '+'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Done list today */}
          {doneCount > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-700">✅ {t('done')} ({doneCount})</h3>
              </div>
              <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                {queue.filter(e => e.status === 'done').map(e => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3 opacity-60">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-xs font-black text-emerald-600">
                      {String(e.position).padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-600 truncate">{e.patient_name}</p>
                    </div>
                    <span className="text-emerald-500 text-sm">✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Walk-in Modal ── */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddForm(false)}>
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800 text-lg">🚶 {t('addWalkIn')}</h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">{t('patientName')} *</label>
                <input
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'text-right' : ''}`}
                  placeholder={t('patientName')}
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">{t('phone')}</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="06xxxxxxxx"
                  value={addPhone}
                  onChange={e => setAddPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">{t('treatmentType')}</label>
                <select
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white ${isRTL ? 'text-right' : ''}`}
                  value={addTreatment}
                  onChange={e => setAddTreatment(e.target.value)}
                >
                  <option value="">— {t('selectTreatment')} —</option>
                  {TREATMENTS.map(tr => <option key={tr} value={tr}>{tr}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddForm(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors">
                {t('cancel')}
              </button>
              <button
                onClick={addWalkIn}
                disabled={!addName.trim()}
                className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                ✅ {t('addToQueue')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">⚠️</div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">
                {lang === 'ar' ? 'حذف المريض' : lang === 'fr' ? 'Supprimer le patient' : 'Remove Patient'}
              </h3>
              <p className="text-blue-600 font-semibold">{deleteModal.patientName}</p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Queue only */}
              <button
                onClick={() => removeFromQueueOnly(deleteModal.entryId)}
                className="w-full py-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                🪑 {lang === 'ar' ? 'حذف من الطابور فقط' : lang === 'fr' ? 'Supprimer de la file uniquement' : 'Remove from Queue only'}
              </button>

              {/* Full delete */}
              {(deleteModal.appointmentId || deleteModal.patientId) && (
                <button
                  onClick={() => handleFullDelete(deleteModal)}
                  className="w-full py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  🗑️ {lang === 'ar' ? 'حذف من كامل النظام' : lang === 'fr' ? 'Supprimer du système complet' : 'Delete from entire system'}
                </button>
              )}

              {/* Cancel */}
              <button
                onClick={() => setDeleteModal(null)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl transition-colors"
              >
                ❌ {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Undo Banner ── */}
      {undoEntry && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[998] animate-slide-in">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4">
            <span className="text-sm font-medium">
              🗑️ <strong>{undoEntry.entry.patient_name}</strong> {lang === 'ar' ? 'تم الحذف من الطابور' : lang === 'fr' ? 'retiré de la file' : 'removed from queue'}
            </span>
            <button
              onClick={handleUndo}
              className="px-4 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-black rounded-xl transition-colors"
            >
              ↩ {lang === 'ar' ? 'تراجع' : lang === 'fr' ? 'Annuler' : 'Undo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
