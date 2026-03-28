
import { useLang } from '../context/LanguageContext';
import { Notification } from '../types';

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
}

function timeAgo(dateStr: string, t: (k: any) => string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (minutes < 1) return t('justNow');
  if (minutes < 60) return `${minutes} ${t('minutesAgo')}`;
  if (hours < 24) return `${hours} ${t('hoursAgo')}`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsView({ notifications, onMarkRead, onMarkAllRead, onDelete }: NotificationsViewProps) {
  const { t, isRTL } = useLang();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className={`flex flex-col gap-4 ${isRTL ? 'font-tajawal' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">{t('notificationsTitle')}</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-sm text-blue-500 hover:text-blue-700 font-semibold"
          >
            {t('markAllRead')}
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-300">
            <div className="text-6xl mb-4">🔔</div>
            <p className="text-sm font-medium">{t('noNotifications')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications
              .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
              .map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors ${!n.is_read ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-blue-500' : 'bg-slate-200'}`}>
                    <span className="text-lg">{!n.is_read ? '🔔' : '✅'}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${!n.is_read ? 'text-slate-800' : 'text-slate-600'}`}>
                        {n.title}
                      </p>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {n.created_at ? timeAgo(n.created_at, t) : ''}
                      </span>
                    </div>
                    {n.message && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    )}
                    {!n.is_read && (
                      <button
                        onClick={() => onMarkRead(n.id)}
                        className="text-xs text-blue-500 hover:text-blue-700 font-medium mt-1"
                      >
                        {t('markAllRead').split(' ').slice(-1)[0]}
                      </button>
                    )}
                  </div>

                  {/* Unread dot */}
                  {!n.is_read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => onDelete(n.id)}
                    className="text-slate-300 hover:text-red-400 text-lg shrink-0 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
