import React, { useEffect, useState } from 'react';
import { NotificationItem } from '../../types/index.ts';
import { Check, CheckCircle2, AlertCircle, Info, ShieldAlert } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Notification Center
          </h2>
          <p className="text-xs text-[#848E9C] mt-1">
            System announcements, blockchain deposit confirmations, withdrawal payouts, and security alerts.
          </p>
        </div>

        {notifications.some(n => !n.is_read) && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E2329] hover:bg-[#2B313A] text-xs font-semibold text-white shrink-0 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4 text-[#F0B90B]" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
        <div className="space-y-3">
          {loading ? (
            <div className="py-8 text-center text-xs text-[#848E9C] font-sans">
              Loading notification feed...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#848E9C] font-sans">
              No notifications yet. You will receive updates on deposits, withdrawals, and strategy yields here.
            </div>
          ) : (
            notifications.map((n) => {
              const isUnread = !n.is_read;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  className={`p-4 rounded-xl border transition-all flex items-start gap-4 cursor-pointer ${
                    isUnread
                      ? 'bg-[#1E2329] border-[#F0B90B]/40 shadow-sm'
                      : 'bg-[#181A20] border-[#2B313A] hover:bg-[#1E2329]/50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    n.type === 'success'
                      ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                      : n.type === 'warning'
                      ? 'bg-[#F0B90B]/15 text-[#F0B90B]'
                      : n.type === 'security'
                      ? 'bg-[#F6465D]/15 text-[#F6465D]'
                      : 'bg-[#2B313A] text-white'
                  }`}>
                    {n.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                    {n.type === 'warning' && <AlertCircle className="w-4 h-4" />}
                    {n.type === 'security' && <ShieldAlert className="w-4 h-4" />}
                    {n.type === 'info' && <Info className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className={`text-xs font-bold truncate ${isUnread ? 'text-white' : 'text-[#848E9C]'}`}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-[#5E6673] font-mono shrink-0">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-[#848E9C] leading-relaxed">
                      {n.message}
                    </p>
                  </div>

                  {isUnread && (
                    <span className="w-2 h-2 rounded-full bg-[#F0B90B] shrink-0 self-center" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
