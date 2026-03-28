import { useState } from 'react';
import { useLang } from '../context/LanguageContext';
import { Patient, Appointment } from '../types';

interface PatientsViewProps {
  patients: Patient[];
  appointments: Appointment[];
  onAddPatient: (p: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => void;
  onEditPatient: (p: Patient) => void;
  onDeletePatient: (id: string) => void;
}

const emptyForm = (): Omit<Patient, 'id' | 'created_at' | 'updated_at'> => ({
  full_name: '',
  phone: '',
  email: '',
  date_of_birth: '',
  gender: undefined,
  address: '',
  notes: '',
});

export default function PatientsView({ patients, appointments, onAddPatient, onEditPatient, onDeletePatient }: PatientsViewProps) {
  const { t, isRTL } = useLang();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const filtered = patients.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search) ||
    (p.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setForm(emptyForm());
    setEditingPatient(null);
    setShowForm(true);
  };

  const openEdit = (p: Patient) => {
    setForm({
      full_name: p.full_name,
      phone: p.phone || '',
      email: p.email || '',
      date_of_birth: p.date_of_birth || '',
      gender: p.gender,
      address: p.address || '',
      notes: p.notes || '',
    });
    setEditingPatient(p);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.full_name.trim()) return;
    if (editingPatient) {
      onEditPatient({ ...editingPatient, ...form });
    } else {
      onAddPatient(form);
    }
    setShowForm(false);
    setForm(emptyForm());
    setEditingPatient(null);
  };

  const getPatientAppts = (id: string) =>
    appointments.filter(a => a.patient_id === id);

  const getLastVisit = (id: string) => {
    const past = getPatientAppts(id)
      .filter(a => a.appointment_date < new Date().toISOString().split('T')[0])
      .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));
    return past[0]?.appointment_date || null;
  };

  return (
    <div className={`flex flex-col gap-4 ${isRTL ? 'font-tajawal' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t('patientList')}</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md shadow-blue-500/25 transition-all"
        >
          <span>+</span>
          <span>{t('addPatient')}</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <span className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`}>🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('searchPatients')}
          className={`w-full bg-white border border-slate-200 rounded-xl py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'pr-9 pl-4 text-right' : 'pl-9 pr-4'}`}
        />
      </div>

      {/* Layout */}
      <div className="flex gap-4">
        {/* Patient List */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">{filtered.length} {t('totalPatients')}</p>
          </div>
          <div className="divide-y divide-slate-50 overflow-y-auto max-h-[calc(100vh-280px)]">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-300">
                <div className="text-5xl mb-3">👥</div>
                <p className="text-sm">{t('noData')}</p>
              </div>
            ) : (
              filtered.map(p => {
                const apptCount = getPatientAppts(p.id).length;
                const lastVisit = getLastVisit(p.id);
                const isSelected = selectedPatient?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatient(isSelected ? null : p)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${p.gender === 'female' ? 'bg-pink-400' : 'bg-blue-400'}`}>
                      {p.full_name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.full_name}</p>
                      <p className="text-xs text-slate-400 truncate">{p.phone || p.email || '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-blue-600">{apptCount} {t('totalVisits').toLowerCase()}</p>
                      {lastVisit && (
                        <p className="text-[10px] text-slate-400">{lastVisit}</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Patient Detail */}
        {selectedPatient && (
          <div className="w-80 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg ${selectedPatient.gender === 'female' ? 'bg-pink-400' : 'bg-blue-400'}`}>
                  {selectedPatient.full_name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">{selectedPatient.full_name}</h3>
                  <p className="text-xs text-slate-400">{selectedPatient.gender ? t(selectedPatient.gender) : '—'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="text-slate-400 hover:text-slate-700 text-lg">×</button>
            </div>

            {/* Info */}
            <div className="flex flex-col gap-2">
              {[
                { icon: '📞', val: selectedPatient.phone },
                { icon: '✉️', val: selectedPatient.email },
                { icon: '🎂', val: selectedPatient.date_of_birth },
                { icon: '📍', val: selectedPatient.address },
              ].map(({ icon, val }) => val ? (
                <div key={icon} className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="w-5 shrink-0">{icon}</span>
                  <span className="truncate">{val}</span>
                </div>
              ) : null)}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-blue-600">{getPatientAppts(selectedPatient.id).length}</p>
                <p className="text-xs text-slate-500">{t('totalVisits')}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-emerald-600">
                  {getPatientAppts(selectedPatient.id).filter(a => a.status === 'completed').length}
                </p>
                <p className="text-xs text-slate-500">{t('completed')}</p>
              </div>
            </div>

            {/* Notes */}
            {selectedPatient.notes && (
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">📝 {t('patientNotes')}</p>
                <p className="text-xs text-slate-600">{selectedPatient.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => openEdit(selectedPatient)}
                className="flex-1 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors"
              >
                {t('edit')}
              </button>
              <button
                onClick={() => {
                  onDeletePatient(selectedPatient.id);
                  setSelectedPatient(null);
                }}
                className="flex-1 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 text-sm font-semibold transition-colors"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 ${isRTL ? 'text-right' : ''}`}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">
                {editingPatient ? t('editPatient') : t('addPatient')}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 text-xl">×</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">{t('patientName')} *</label>
                <input
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'text-right' : ''}`}
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">{t('patientPhone')}</label>
                <input
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'text-right' : ''}`}
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">{t('patientEmail')}</label>
                <input
                  type="email"
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'text-right' : ''}`}
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">{t('patientDOB')}</label>
                <input
                  type="date"
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'text-right' : ''}`}
                  value={form.date_of_birth}
                  onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">{t('patientGender')}</label>
                <select
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'text-right' : ''}`}
                  value={form.gender || ''}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value as 'male' | 'female' || undefined }))}
                >
                  <option value="">—</option>
                  <option value="male">{t('male')}</option>
                  <option value="female">{t('female')}</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">{t('patientAddress')}</label>
                <input
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'text-right' : ''}`}
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">{t('patientNotes')}</label>
                <textarea
                  rows={2}
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none ${isRTL ? 'text-right' : ''}`}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
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
