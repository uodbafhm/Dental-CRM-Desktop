import React from 'react';
import { useLang } from '../context/LanguageContext';
import { Lang } from '../i18n/translations';

type View = 'dashboard' | 'calendar' | 'patients' | 'appointments' | 'analytics' | 'notifications' | 'settings' | 'queue';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  notificationCount: number;
}

const navItems: { key: View }[] = [
  { key: 'dashboard' },
  { key: 'queue' },
  { key: 'calendar' },
  { key: 'patients' },
  { key: 'appointments' },
  { key: 'analytics' },
  { key: 'notifications' },
  { key: 'settings' },
];

const LangIcon: React.FC<{ code: Lang; current: Lang; onClick: () => void }> = ({
  code, current, onClick,
}) => {
  const labels: Record<Lang, string> = { en: 'EN', fr: 'FR', ar: 'ع' };
  const isActive = code === current;
  return (
    <button
      onClick={onClick}
      className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
        isActive
          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
          : 'text-slate-400 hover:text-white hover:bg-slate-700'
      }`}
    >
      {labels[code]}
    </button>
  );
};

export default function Sidebar({ activeView, setActiveView, notificationCount }: SidebarProps) {
  const { lang, setLang, t, isRTL } = useLang();

  return (
    <aside
      className={`w-[72px] bg-slate-900 flex flex-col items-center py-5 gap-1 shrink-0 h-screen sticky top-0 z-50 ${
        isRTL ? 'border-l border-slate-800' : 'border-r border-slate-800'
      }`}
    >
      {/* Logo */}
      <div className="mb-4 flex flex-col items-center">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
          <span className="text-white text-lg">🦷</span>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col gap-1 w-full px-2 flex-1">
        {navItems.map(({ key }) => {
          const isActive = activeView === key;
          return (
            <button
              key={key}
              onClick={() => setActiveView(key)}
              title={t(key)}
              className={`relative w-full flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span className="text-lg leading-none">
                {key === 'dashboard' ? '🏠' :
                 key === 'queue' ? '🪑' :
                 key === 'calendar' ? '📅' :
                 key === 'patients' ? '👥' :
                 key === 'appointments' ? '📋' :
                 key === 'analytics' ? '📊' :
                 key === 'notifications' ? '🔔' : '⚙️'}
              </span>
              <span className="text-[9px] mt-1 font-medium leading-none opacity-80">
                {t(key).slice(0, 6)}
              </span>

              {/* Notification badge */}
              {key === 'notifications' && notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}

              {/* Tooltip */}
              <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl`}>
                {t(key)}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Language Switcher */}
      <div className="w-full px-2 mt-auto">
        <div className="bg-slate-800 rounded-xl p-1.5 flex flex-col gap-1">
          {(['en', 'fr', 'ar'] as Lang[]).map((code) => (
            <LangIcon
              key={code}
              code={code}
              current={lang}
              onClick={() => setLang(code)}
            />
          ))}
        </div>
        <p className={`text-[9px] text-slate-600 text-center mt-2 ${isRTL ? 'font-tajawal' : ''}`}>
          {t('language')}
        </p>
      </div>
    </aside>
  );
}
