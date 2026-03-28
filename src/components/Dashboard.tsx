import React from 'react';
import { useLang } from '../context/LanguageContext';
import { Appointment, Patient } from '../types';

interface DashboardProps {
  appointments: Appointment[];
  patients: Patient[];
}

const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: string;
  color: string;
  bg: string;
  sub?: string;
}> = ({ label, value, icon, color, bg, sub }) => (
  <div className={`rounded-2xl p-5 ${bg} border border-white/10 shadow-sm flex flex-col gap-3`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${bg === 'bg-white' ? 'bg-slate-50' : 'bg-white/20'}`}>
        {icon}
      </div>
    </div>
  </div>
);

export default function Dashboard({ appointments, patients }: DashboardProps) {
  const { t, isRTL } = useLang();

  const today = new Date().toISOString().split('T')[0];
  const todayAppts = appointments.filter(a => a.appointment_date === today);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekAppts = appointments.filter(a => {
    const d = new Date(a.appointment_date);
    return d >= weekStart;
  });

  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  const confirmedToday = todayAppts.filter(a => a.status === 'confirmed').length;
  const completedToday = todayAppts.filter(a => a.status === 'completed').length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('goodMorning') : hour < 17 ? t('goodAfternoon') : t('goodEvening');

  // Weekly bar chart data
  const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekBarData = weekDayLabels.map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    return appointments.filter(a => a.appointment_date === dateStr).length;
  });
  const maxBar = Math.max(...weekBarData, 1);

  // Treatment breakdown
  const treatmentMap: Record<string, number> = {};
  appointments.forEach(a => {
    if (a.treatment_type) {
      treatmentMap[a.treatment_type] = (treatmentMap[a.treatment_type] || 0) + 1;
    }
  });
  const topTreatments = Object.entries(treatmentMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const totalTreatments = topTreatments.reduce((s, [, v]) => s + v, 0);

  const treatmentColors = [
    'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-indigo-500', 'bg-purple-500'
  ];

  return (
    <div className={`flex flex-col gap-6 ${isRTL ? 'font-tajawal' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{greeting} 👋</p>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5">{t('dashboard')}</h1>
        </div>
        <div className="text-sm text-slate-400 bg-white rounded-xl px-4 py-2 shadow-sm border border-slate-100">
          {new Date().toLocaleDateString(
            isRTL ? 'ar-MA' : undefined,
            { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label={t('todayAppointments')}
          value={todayAppts.length}
          icon="📅"
          color="text-blue-600"
          bg="bg-white"
          sub={`${confirmedToday} ${t('confirmed')}`}
        />
        <StatCard
          label={t('totalPatients')}
          value={patients.length}
          icon="👥"
          color="text-emerald-600"
          bg="bg-white"
        />
        <StatCard
          label={t('weekAppointments')}
          value={weekAppts.length}
          icon="📆"
          color="text-indigo-600"
          bg="bg-white"
        />
        <StatCard
          label={t('pendingApproval')}
          value={pendingCount}
          icon="⏳"
          color="text-amber-600"
          bg="bg-white"
          sub={`${completedToday} ${t('completed')}`}
        />
      </div>

      {/* Two columns: Weekly chart + Treatment breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Weekly Bar Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('weeklyStats')}</h3>
          <div className="flex items-end gap-2 h-36">
            {weekBarData.map((val, i) => {
              const label = [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')][i];
              const height = maxBar > 0 ? (val / maxBar) * 100 : 0;
              const isToday = i === new Date().getDay();
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-500 font-medium">{val}</span>
                  <div className="w-full rounded-t-lg transition-all duration-500 relative group" style={{ height: `${Math.max(height, 4)}%` }}>
                    <div
                      className={`w-full h-full rounded-t-lg ${isToday ? 'bg-blue-500' : 'bg-slate-200 group-hover:bg-slate-300'}`}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Treatment Breakdown */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('treatmentBreakdown')}</h3>
          {topTreatments.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-300 text-sm">{t('noData')}</div>
          ) : (
            <div className="flex flex-col gap-3">
              {topTreatments.map(([name, count], i) => {
                const pct = totalTreatments > 0 ? Math.round((count / totalTreatments) * 100) : 0;
                return (
                  <div key={name} className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${treatmentColors[i]}`} />
                    <span className="text-xs text-slate-600 flex-1 truncate">{name}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-[120px]">
                      <div
                        className={`h-1.5 rounded-full ${treatmentColors[i]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 font-medium w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Today's Schedule Mini */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('todaySchedule')}</h3>
        {todayAppts.length === 0 ? (
          <div className="text-center py-8 text-slate-300">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm">{t('noAppointmentsToday')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {todayAppts
              .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
              .slice(0, 6)
              .map(appt => (
                <div key={appt.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="text-center w-12 shrink-0">
                    <p className="text-xs font-bold text-blue-600">{appt.appointment_time.slice(0, 5)}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{appt.patient_name}</p>
                    <p className="text-xs text-slate-400 truncate">{appt.treatment_type}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    appt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                    appt.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    appt.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {t(`status${appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}` as any)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}


