import { useState, useEffect } from 'react';
import { useLang } from '../context/LanguageContext';
import { Lang } from '../i18n/translations';
import { Settings } from '../types';
import { supabase } from '../lib/supabase';

interface SettingsViewProps {
  settings: Settings;
  onSave: (s: Settings) => void;
}

export default function SettingsView({ settings, onSave }: SettingsViewProps) {
  const { t, lang, setLang, isRTL } = useLang();
  const [form, setForm] = useState<Settings>(settings);
  const [saved, setSaved] = useState(false);
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testConnection = async () => {
    setTesting(true);
    setConnectionOk(null);
    try {
      const { error } = await supabase.from('appointments').select('id').limit(1);
      setConnectionOk(!error);
    } catch {
      setConnectionOk(false);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  const langs: { code: Lang; label: string; native: string; flag: string }[] = [
    { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
    { code: 'fr', label: 'French', native: 'Français', flag: '🇫🇷' },
    { code: 'ar', label: 'Arabic', native: 'العربية', flag: '🇲🇦' },
  ];

  return (
    <div className={`flex flex-col gap-5 max-w-2xl ${isRTL ? 'font-tajawal' : ''}`}>
      <h1 className="text-2xl font-bold text-slate-800">{t('settingsTitle')}</h1>

      {/* Clinic Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-4">🏥 {t('clinicName')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">{t('clinicName')}</label>
            <input
              className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'text-right' : ''}`}
              value={form.clinicName}
              onChange={e => setForm(f => ({ ...f, clinicName: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">{t('doctorName')}</label>
            <input
              className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${isRTL ? 'text-right' : ''}`}
              value={form.doctorName}
              onChange={e => setForm(f => ({ ...f, doctorName: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">{t('workingHours')} (Start)</label>
            <input
              type="time"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={form.workingHoursStart}
              onChange={e => setForm(f => ({ ...f, workingHoursStart: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">{t('workingHours')} (End)</label>
            <input
              type="time"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={form.workingHoursEnd}
              onChange={e => setForm(f => ({ ...f, workingHoursEnd: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-4">🌐 {t('language')}</h3>
        <div className="flex gap-3">
          {langs.map(({ code, label, native, flag }) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                lang === code
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="text-lg mb-1">{flag}</div>
              <div>{native}</div>
              <div className="text-[10px] opacity-60">{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-4">🔔 {t('notifications')}</h3>
        <div className="flex flex-col gap-4">
          {[
            { key: 'soundAlerts', label: t('soundAlerts'), icon: '🔊' },
            { key: 'emailNotifications', label: t('emailNotifications'), icon: '✉️' },
          ].map(({ key, label, icon }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{icon}</span>
                <span className="text-sm text-slate-700">{label}</span>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, [key]: !f[key as keyof Settings] }))}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                  form[key as keyof Settings] ? 'bg-blue-500' : 'bg-slate-200'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${
                  form[key as keyof Settings] ? (isRTL ? 'right-1' : 'left-7') : (isRTL ? 'right-7' : 'left-1')
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Supabase Connection Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-4">⚡ Supabase Connection</h3>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className={`w-3 h-3 rounded-full ${
            connectionOk === null ? 'bg-slate-300' :
            connectionOk ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
          }`} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-700">
              {connectionOk === null ? '⏳ Checking...' :
               connectionOk ? '✅ Connected to Supabase' : '❌ Connection Failed'}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">hqntzhmamugzukwuobmz.supabase.co</p>
          </div>
          <button
            onClick={testConnection}
            disabled={testing}
            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {testing ? '⏳' : '🔌 Test'}
          </button>
        </div>

        {connectionOk === true && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-xs text-emerald-700 font-semibold">
              ✅ Realtime active — All data syncs automatically with your website
            </p>
          </div>
        )}
        {connectionOk === false && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs text-red-700 font-semibold">
              ❌ Cannot connect. Check your internet connection or Supabase project status.
            </p>
          </div>
        )}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
          saved
            ? 'bg-emerald-500 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25'
        }`}
      >
        {saved ? '✅ Saved!' : t('saveSettings')}
      </button>
    </div>
  );
}
