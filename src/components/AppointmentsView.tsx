import { useState } from 'react';
import { useLang } from '../context/LanguageContext';
import { Appointment, Patient } from '../types';

interface AppointmentsViewProps {
  appointments: Appointment[];
  patients: Patient[];
  onAdd: (a: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => void;
  onEdit: (a: Appointment) => void;
  onDelete: (id: string) => void;
  defaultDate?: string;
}

const TREATMENTS = [
  'cleaning','filling','extraction','rootCanal','crown',
  'braces','whitening','consultation','xray','implant'
] as const;

const STATUS_LIST = ['pending','confirmed','completed','cancelled'] as const;

const emptyForm = (date?: string): Omit<Appointment, 'id' | 'created_at' | 'updated_at'> => ({
  patient_name: '',
  patient_phone: '',
  patient_id: undefined,
  appointment_date: date || new Date().toISOString().split('T')[0],
  appointment_time: '09:00',
  duration: 30,
  treatment_type: '',
  status: 'pending',
  notes: '',
});

export default function AppointmentsView({
  appointments, patients, onAdd, onEdit, onDelete, defaultDate
}: AppointmentsViewProps) {
  const { t, isRTL } = useLang();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [showForm, setShowForm] = useState(!!defaultDate);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [form, setForm] = useState(emptyForm(defaultDate));
  const [search, setSearch] = useState('');

  const filtered = appointments
    .filter(a => filterStatus === 'all' || a.status === filterStatus)
    .filter(a => !filterDate || a.appointment_date === filterDate)
    .filter(a =>
      a.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      (a.treatment_type || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const d = b.appointment_date.localeCompare(a.appointment_date);
      return d !== 0 ? d : a.appointment_time.localeCompare(b.appointment_time);
    });

  const openAdd = () => {
    setForm(emptyForm(defaultDate));
    setEditingAppt(null);
    setShowForm(true);
  };

  const openEdit = (a: Appointment) => {
    setForm({
      patient_name: a.patient_name,
      patient_phone: a.patient_phone || '',
      patient_id: a.patient_id,
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time,
      duration: a.duration || 30,
      treatment_type: a.treatment_type || '',
      status: a.status,
      notes: a.notes || '',
    });
    setEditingAppt(a);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.patient_name.trim() || !form.appointment_date || !form.appointment_time) return;
    if (editingAppt) {
      onEdit({ ...editingAppt, ...form });
    } else {
      onAdd(form);
    }
    setShowForm(false);
    setEditingAppt(null);
    setForm(emptyForm());
  };

  const handlePatientSelect = (id: string) => {
    const p = patients.find(p => p.id === id);
    if (p) {
      setForm(f => ({ ...f, patient_id: p.id, patient_name: p.full_name, patient_phone: p.phone || '' }));
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      confirmed: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-amber-100 text-amber-700',
      completed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className={`flex flex-col gap-4 ${isRTL ? 'font-tajawal' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t('appointments')}</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md shadow-blue-500/25 transition-all"
        >
          <span>+</span>
          <span>{t('addAppointment')}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <span className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('search')}
            className={`w-full bg-white border border-slate-200 rounded-xl py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'pr-9 pl-4 text-right' : 'pl-9 pr-4'}`}
          />
        </div>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {['all', ...STATUS_LIST].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === s ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {s === 'all' ? t('all') : t(`status${s.charAt(0).toUpperCase() + s.slice(1)}` as any)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[t('appointmentDate'), t('appointmentTime'), t('patientName'), t('treatmentType'), t('duration'), 'Status', ''].map((h, i) => (
                  <th key={i} className={`px-4 py-3 text-xs font-semibold text-slate-500 ${isRTL ? 'text-right' : 'text-left'} whitespace-nowrap`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-300">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="text-sm">{t('noData')}</p>
                  </td>
                </tr>
              ) : (
                filtered.map(appt => (
                  <tr key={appt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-700">{appt.appointment_date}</td>
                    <td className="px-4 py-3 text-sm font-bold text-blue-600">{appt.appointment_time.slice(0, 5)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800">{appt.patient_name}</p>
                      {appt.patient_phone && <p className="text-xs text-slate-400">{appt.patient_phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{appt.treatment_type || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{appt.duration ? `${appt.duration}m` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusBadge(appt.status)}`}>
                        {t(`status${appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}` as any)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(appt)} className="text-xs text-blue-500 hover:text-blue-700 font-medium">{t('edit')}</button>
                        <button onClick={() => onDelete(appt.id)} className="text-xs text-red-400 hover:text-red-600 font-medium">{t('delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-screen overflow-y-auto ${isRTL ? 'text-right' : ''}`}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">
                {editingAppt ? t('editAppointment') : t('addAppointment')}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 text-xl">×</button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Select existing patient */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">{t('selectPatient')}</label>
                <select
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'text-right' : ''}`}
                  value={form.patient_id || ''}
                  onChange={e => e.target.value ? handlePatientSelect(e.target.value) : setForm(f => ({ ...f, patient_id: undefined }))}
                >
                  <option value="">— {t('newPatient')} —</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{t('patientName')} *</label>
                  <input
                    className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'text-right' : ''}`}
                    value={form.patient_name}
                    onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{t('patientPhone')}</label>
                  <input
                    className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'text-right' : ''}`}
                    value={form.patient_phone}
                    onChange={e => setForm(f => ({ ...f, patient_phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{t('treatmentType')}</label>
                  <select
                    className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'text-right' : ''}`}
                    value={form.treatment_type}
                    onChange={e => setForm(f => ({ ...f, treatment_type: e.target.value }))}
                  >
                    <option value="">—</option>
                    {TREATMENTS.map(tr => (
                      <option key={tr} value={t(tr)}>{t(tr)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{t('appointmentDate')} *</label>
                  <input
                    type="date"
                    className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'text-right' : ''}`}
                    value={form.appointment_date}
                    onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{t('appointmentTime')} *</label>
                  <input
                    type="time"
                    className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'text-right' : ''}`}
                    value={form.appointment_time}
                    onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{t('duration')}</label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'text-right' : ''}`}
                    value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Status</label>
                  <select
                    className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'text-right' : ''}`}
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                  >
                    {STATUS_LIST.map(s => (
                      <option key={s} value={s}>{t(`status${s.charAt(0).toUpperCase() + s.slice(1)}` as any)}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{t('appointmentNotes')}</label>
                  <textarea
                    rows={2}
                    className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none ${isRTL ? 'text-right' : ''}`}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSubmit}
                className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
              >
                {t('save')}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
