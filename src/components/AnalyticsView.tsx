
import { useLang } from '../context/LanguageContext';
import { Appointment, Patient } from '../types';
import { translations } from '../i18n/translations';

interface AnalyticsViewProps {
  appointments: Appointment[];
  patients: Patient[];
}

export default function AnalyticsView({ appointments, patients }: AnalyticsViewProps) {
  const { t, lang, isRTL } = useLang();

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  // Weekly appointments per day
  const weekDayLabels = translations[lang].weekdays as string[];
  const weekBarData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    return appointments.filter(a => a.appointment_date === dateStr).length;
  });
  const maxBar = Math.max(...weekBarData, 1);

  // Monthly data (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
    const monthAppts = appointments.filter(a => {
      const ad = new Date(a.appointment_date);
      return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear();
    });
    return {
      label: d.toLocaleDateString(lang === 'ar' ? 'ar-MA' : lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' }),
      count: monthAppts.length,
    };
  });
  const maxMonthly = Math.max(...monthlyData.map(m => m.count), 1);

  // Treatment breakdown
  const treatmentMap: Record<string, number> = {};
  appointments.forEach(a => {
    if (a.treatment_type) {
      treatmentMap[a.treatment_type] = (treatmentMap[a.treatment_type] || 0) + 1;
    }
  });
  const topTreatments = Object.entries(treatmentMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const totalTreatments = appointments.filter(a => a.treatment_type).length;

  // Status breakdown
  const statuses = ['pending','confirmed','completed','cancelled'];
  const statusCounts = statuses.map(s => ({
    label: t(`status${s.charAt(0).toUpperCase() + s.slice(1)}` as any),
    count: appointments.filter(a => a.status === s).length,
    color: s === 'confirmed' ? '#10b981' : s === 'pending' ? '#f59e0b' : s === 'completed' ? '#3b82f6' : '#f87171',
    bg: s === 'confirmed' ? 'bg-emerald-500' : s === 'pending' ? 'bg-amber-500' : s === 'completed' ? 'bg-blue-500' : 'bg-red-400',
  }));
  const totalStatusCount = appointments.length || 1;

  // This week stats
  const thisWeekAppts = appointments.filter(a => {
    const d = new Date(a.appointment_date);
    return d >= weekStart && d <= today;
  });
  const confirmedThisWeek = thisWeekAppts.filter(a => a.status === 'confirmed').length;
  const completedThisWeek = thisWeekAppts.filter(a => a.status === 'completed').length;

  const treatmentColors = ['bg-blue-500','bg-cyan-500','bg-teal-500','bg-indigo-500','bg-purple-500','bg-pink-500'];

  return (
    <div className={`flex flex-col gap-5 ${isRTL ? 'font-tajawal' : ''}`}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t('analyticsTitle')}</h1>
        <span className="text-sm text-slate-400 bg-white rounded-xl px-4 py-2 border border-slate-100 shadow-sm">
          {t('thisWeek')}: {thisWeekAppts.length}
        </span>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: t('totalPatients'), val: patients.length, icon: '👥', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t('weekAppointments'), val: thisWeekAppts.length, icon: '📅', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: t('confirmed'), val: confirmedThisWeek, icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: t('completed'), val: completedThisWeek, icon: '🏁', color: 'text-cyan-600', bg: 'bg-cyan-50' },
        ].map(({ label, val, icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 flex items-center gap-3`}>
            <span className="text-2xl">{icon}</span>
            <div>
              <p className={`text-2xl font-bold ${color}`}>{val}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Weekly Bar Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-5">{t('appointmentsByDay')}</h3>
          <div className="flex items-end gap-2 h-40">
            {weekBarData.map((val, i) => {
              const height = (val / maxBar) * 100;
              const isToday = i === today.getDay();
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">{val || ''}</span>
                  <div className="w-full rounded-t-xl overflow-hidden" style={{ height: `${Math.max(height, 6)}%` }}>
                    <div className={`w-full h-full ${isToday ? 'bg-gradient-to-t from-blue-600 to-blue-400' : 'bg-slate-200 hover:bg-slate-300'} transition-colors`} />
                  </div>
                  <span className={`text-[10px] font-medium ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{weekDayLabels[i]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-5">{t('patientGrowth')}</h3>
          <div className="flex items-end gap-2 h-40">
            {monthlyData.map((m, i) => {
              const height = (m.count / maxMonthly) * 100;
              const isLast = i === monthlyData.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">{m.count || ''}</span>
                  <div className="w-full rounded-t-xl overflow-hidden" style={{ height: `${Math.max(height, 6)}%` }}>
                    <div className={`w-full h-full ${isLast ? 'bg-gradient-to-t from-indigo-600 to-indigo-400' : 'bg-slate-200'} transition-colors`} />
                  </div>
                  <span className={`text-[10px] font-medium ${isLast ? 'text-indigo-600' : 'text-slate-400'}`}>{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Status Breakdown */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-4">{t('weeklyStats')}</h3>
          <div className="flex flex-col gap-3">
            {statusCounts.map(({ label, count, bg }) => {
              const pct = Math.round((count / totalStatusCount) * 100);
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-20 shrink-0">{label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className={`${bg} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-600 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Treatment Breakdown */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-4">{t('treatmentBreakdown')}</h3>
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
                    <div className="w-24 bg-slate-100 rounded-full h-1.5">
                      <div className={`${treatmentColors[i]} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
