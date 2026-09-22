import React, { useState } from 'react';
import {
  X,
  Bell,
  Check,
  Trash2,
  ShieldAlert,
  Sparkles,
  ShoppingBag,
  Database,
  ArrowRight,
  Boxes,
  Store,
  CreditCard,
  Building2,
  CheckCheck,
} from 'lucide-react';
import { PushNotification } from '../../types';
import { storage } from '../../services/storage';
import { resolveNotificationDestination } from '../../utils/notificationRouter';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: PushNotification[];
  onNavigateToNotification?: (notif: PushNotification) => void;
  onNavigateTab?: (tab: string) => void;
  onMarkAllAsRead?: () => void;
  onClearAll?: () => void;
}

type FilterCategory = 'all' | 'unread' | 'stock' | 'orders';

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onNavigateToNotification,
  onNavigateTab,
  onMarkAllAsRead,
  onClearAll,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');

  if (!isOpen) return null;

  const handleNotificationClick = (n: PushNotification) => {
    storage.markNotificationAsRead(n.id);
    if (onNavigateToNotification) {
      onNavigateToNotification(n);
    } else if (n.linkTab && onNavigateTab) {
      onNavigateTab(n.linkTab);
      onClose();
    }
  };

  const getIcon = (notif: PushNotification) => {
    const dest = resolveNotificationDestination(notif);
    if (notif.type === 'low_stock' || notif.title.toLowerCase().includes('stock')) {
      return <ShieldAlert className="w-4 h-4 text-amber-500" />;
    }
    if (dest.role === 'warehouse') {
      return <Boxes className="w-4 h-4 text-emerald-600" />;
    }
    if (dest.role === 'store_admin') {
      return <Store className="w-4 h-4 text-purple-600" />;
    }
    if (dest.role === 'pos') {
      return <CreditCard className="w-4 h-4 text-blue-600" />;
    }
    if (notif.type === 'order_update') {
      return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
    }
    if (notif.type === 'discount_promo' || notif.type === 'loyalty_reward') {
      return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
    if (notif.type === 'system_backup') {
      return <Database className="w-4 h-4 text-sky-600" />;
    }
    return <Bell className="w-4 h-4 text-slate-600" />;
  };

  const requestBrowserPermission = async () => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
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
    } catch {
      // safely handle permission error
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.read;
    if (activeFilter === 'stock') {
      return (
        n.type === 'low_stock' ||
        n.title.toLowerCase().includes('stock') ||
        (n.linkTab && ['inventory', 'store_stock', 'transfers', 'adjustments'].includes(n.linkTab))
      );
    }
    if (activeFilter === 'orders') {
      return (
        n.type === 'order_update' ||
        n.title.toLowerCase().includes('order') ||
        n.title.toLowerCase().includes('bill') ||
        n.title.toLowerCase().includes('purchase')
      );
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                System & Push Alerts
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500">
                Click any notification to open its relevant page
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onMarkAllAsRead ? onMarkAllAsRead() : storage.markAllNotificationsAsRead()}
              title="Mark all as read"
              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-slate-200 text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
            <button
              onClick={() => onClearAll ? onClearAll() : storage.clearNotifications()}
              title="Clear all notifications"
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-slate-200 text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Close drawer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Quick Pills */}
        <div className="px-3.5 py-2 bg-white border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === 'unread'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setActiveFilter('stock')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === 'stock'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Stock Alerts
          </button>
          <button
            onClick={() => setActiveFilter('orders')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === 'orders'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Orders & Bills
          </button>
        </div>

        {/* Browser Permission Banner */}
        {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-2 shrink-0">
            <p className="text-xs text-amber-900 font-medium">
              Enable background alerts for inventory drops & orders.
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
          {filteredNotifications.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Bell className="w-10 h-10 stroke-1 mb-2 text-slate-400" />
              <p className="text-sm font-bold text-slate-600">All caught up!</p>
              <p className="text-xs text-slate-400 mt-1">
                {activeFilter === 'all'
                  ? 'No alerts or notifications right now.'
                  : `No notifications matching the "${activeFilter}" filter.`}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const dest = resolveNotificationDestination(notif);

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                    notif.read
                      ? 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-50'
                      : 'bg-white border-amber-200/80 text-slate-900 shadow-xs hover:border-amber-400'
                  } hover:shadow-md`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-slate-100 border border-slate-200/80 shrink-0 mt-0.5 group-hover:bg-amber-50 group-hover:border-amber-200 transition-colors">
                      {getIcon(notif)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors leading-snug">
                          {notif.title}
                        </h4>
                        {!notif.read && (
                          <span
                            title="Unread"
                            className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1 animate-pulse"
                          />
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>

                      {/* Navigation Destination Link Button */}
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[10px]">
                        <span className="text-slate-400 font-medium">
                          {new Date(notif.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md border text-[10px] transition-all ${dest.badgeBg} ${dest.badgeColor} ${dest.badgeBorder} group-hover:brightness-95`}
                        >
                          <span>Go to {dest.destinationLabel}</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span>Richie Rich Live Alerts</span>
          <span className="text-[10px] text-slate-400">Clicking opens relevant portal</span>
        </div>
      </div>
    </div>
  );
};
