import { useState } from 'react';
import { useLang } from '../context/LanguageContext';
import { Appointment } from '../types';

interface CalendarViewProps {
  appointments: Appointment[];
  onNewAppointment: (date?: string) => void;
  onSelectAppointment: (appt: Appointment) => void;
}

const MONTHS = [
  'january','february','march','april','may','june',
  'july','august','september','october','november','december'
] as const;

const DAYS = ['sun','mon','tue','wed','thu','fri','sat'] as const;

export default function CalendarView({ appointments, onNewAppointment, onSelectAppointment }: CalendarViewProps) {
  const { t, isRTL } = useLang();

  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().split('T')[0]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const getDateStr = (d: number) => {
    const m = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${year}-${m}-${dd}`;
  };

  const getApptForDate = (dateStr: string) =>
    appointments.filter(a => a.appointment_date === dateStr);

  const selectedAppts = getApptForDate(selectedDate)
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  const cells: { day: number; dateStr: string; current: boolean }[] = [];

  // Prev month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, dateStr: '', current: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: getDateStr(d), current: true });
  }

  // Next month padding
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, dateStr: '', current: false });
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-500';
      case 'pending': return 'bg-amber-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-400';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${isRTL ? 'font-tajawal' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t('calendarTitle')}</h1>
        <button
          onClick={() => onNewAppointment(selectedDate)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md shadow-blue-500/25 transition-all"
        >
          <span>+</span>
          <span>{t('newAppointment')}</span>
        </button>
      </div>

      <div className="flex gap-4 flex-1">
        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          {/* Month Nav */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={isRTL ? nextMonth : prevMonth}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              {isRTL ? '›' : '‹'}
            </button>
            <h2 className="text-base font-bold text-slate-800">
              {t(MONTHS[month])} {year}
            </h2>
            <button
              onClick={isRTL ? prevMonth : nextMonth}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              {isRTL ? '‹' : '›'}
            </button>
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">
                {t(d)}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => {
              const isToday = cell.dateStr === today.toISOString().split('T')[0];
              const isSelected = cell.dateStr === selectedDate && cell.current;
              const appts = cell.current ? getApptForDate(cell.dateStr) : [];

              return (
                <button
                  key={idx}
                  onClick={() => cell.current && cell.dateStr && setSelectedDate(cell.dateStr)}
                  className={`aspect-square p-1 rounded-xl flex flex-col items-center transition-all duration-150 ${
                    !cell.current ? 'opacity-25 cursor-default' :
                    isSelected ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30' :
                    isToday ? 'bg-blue-50 text-blue-600 font-bold ring-2 ring-blue-300' :
                    'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-xs font-semibold leading-none mt-1">{cell.day}</span>
                  {appts.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                      {appts.slice(0, 3).map((a, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/70' : statusColor(a.status)}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 flex-wrap">
            {[
              { label: t('confirmed'), color: 'bg-emerald-500' },
              { label: t('pending'), color: 'bg-amber-500' },
              { label: t('completed'), color: 'bg-blue-500' },
              { label: t('cancelled'), color: 'bg-red-400' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-xs text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day Detail Panel */}
        <div className="w-72 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">
              {selectedDate
                ? new Date(selectedDate + 'T00:00:00').toLocaleDateString(
                    isRTL ? 'ar-MA' : undefined,
                    { weekday: 'long', day: 'numeric', month: 'long' }
                  )
                : t('todaySchedule')}
            </h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
              {selectedAppts.length}
            </span>
          </div>

          {selectedAppts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-2">
              <span className="text-4xl">📭</span>
              <p className="text-xs">{t('noAppointmentsToday')}</p>
              <button
                onClick={() => onNewAppointment(selectedDate)}
                className="mt-2 text-xs text-blue-500 hover:text-blue-700 font-semibold"
              >
                + {t('newAppointment')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
              {selectedAppts.map(appt => (
                <button
                  key={appt.id}
                  onClick={() => onSelectAppointment(appt)}
                  className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-blue-600">{appt.appointment_time.slice(0, 5)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      appt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                      appt.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      appt.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {t(`status${appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}` as any)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 truncate">{appt.patient_name}</p>
                  <p className="text-xs text-slate-400 truncate">{appt.treatment_type || '—'}</p>
                  {appt.duration && (
                    <p className="text-[10px] text-slate-400 mt-1">⏱ {appt.duration} min</p>
                  )}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => onNewAppointment(selectedDate)}
            className="mt-3 w-full py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors"
          >
            + {t('newAppointment')}
          </button>
        </div>
      </div>
    </div>
  );
}
