import React from 'react';
import { X, Bell, Check, Trash2, ShieldAlert, Sparkles, ShoppingBag, Database, ArrowRight } from 'lucide-react';
import { PushNotification } from '../../types';
import { storage } from '../../services/storage';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: PushNotification[];
  onNavigateTab?: (tab: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  const handleNotificationClick = (n: PushNotification) => {
    storage.markNotificationAsRead(n.id);
    if (n.linkTab && onNavigateTab) {
      onNavigateTab(n.linkTab);
      onClose();
    }
  };

  const getIcon = (type: PushNotification['type']) => {
    switch (type) {
      case 'low_stock':
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
      case 'order_update':
        return <ShoppingBag className="w-4 h-4 text-emerald-400" />;
      case 'discount_promo':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'system_backup':
        return <Database className="w-4 h-4 text-sky-400" />;
      default:
        return <Bell className="w-4 h-4 text-amber-400" />;
    }
  };

  const requestBrowserPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        storage.addNotification({
          title: '🔔 Push Notifications Enabled!',
          message: 'You will now receive instant alerts for low-stock triggers, POS transactions, and customer orders.',
          type: 'discount_promo',
          targetRole: 'all',
          read: false,
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">System & Push Alerts</h3>
              <p className="text-[11px] text-slate-500">
                {notifications.filter((n) => !n.read).length} unread notifications
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => storage.markAllNotificationsAsRead()}
              title="Mark all read"
              className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-slate-200 text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => storage.clearNotifications()}
              title="Clear all"
              className="p-1.5 rounded-md text-slate-500 hover:text-red-700 hover:bg-slate-200 text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Browser Permission Banner */}
        {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-2">
            <p className="text-xs text-amber-900 font-medium">
              Allow browser push notifications for background alerts.
            </p>
            <button
              onClick={requestBrowserPermission}
              className="px-2.5 py-1 bg-[#1E293B] hover:bg-slate-900 text-white font-bold text-[11px] rounded-md transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              Enable
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Bell className="w-10 h-10 stroke-1 mb-2 text-slate-400" />
              <p className="text-sm font-bold text-slate-600">All caught up!</p>
              <p className="text-xs text-slate-400 mt-1">No alerts or low-stock warnings right now.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  notif.read
                    ? 'bg-slate-50 border-slate-200 text-slate-600'
                    : 'bg-white border-slate-300 text-slate-900 shadow-xs'
                } hover:border-slate-400 hover:shadow-sm`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold truncate text-slate-800">{notif.title}</h4>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                      <span>{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {notif.linkTab && (
                        <span className="text-slate-800 flex items-center gap-0.5 font-bold">
                          View in {notif.linkTab} <ArrowRight className="w-3 h-3 text-slate-500" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
          Richie Rich Pan House Real-time Push Dispatcher
        </div>
      </div>
    </div>
  );
};
