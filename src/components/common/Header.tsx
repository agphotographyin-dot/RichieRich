import React from 'react';
import {
  Crown,
  Shield,
  CreditCard,
  ShoppingBag,
  Bell,
  Scan,
  AlertTriangle,
  Radio,
  Sparkles,
  LayoutDashboard,
  Package,
  TrendingUp,
  Receipt,
  Gift,
  HardDrive,
  Users,
} from 'lucide-react';
import { Role, PushNotification, AdminTab } from '../../types';

interface HeaderProps {
  currentRole: Role;
  onSelectRole: (role: Role) => void;
  activeAdminTab?: AdminTab;
  onSelectAdminTab?: (tab: AdminTab) => void;
  notifications: PushNotification[];
  onOpenNotifications: () => void;
  onOpenScanner?: () => void;
  lowStockCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onSelectRole,
  activeAdminTab = 'dashboard',
  onSelectAdminTab,
  notifications,
  onOpenNotifications,
  onOpenScanner,
  lowStockCount = 0,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const adminTabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: 'inventory', label: 'Inventory', icon: <Package className="w-3.5 h-3.5" /> },
    { id: 'staff_counters', label: 'Staff & POS PINs', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'orders', label: 'Orders', icon: <Receipt className="w-3.5 h-3.5" /> },
    { id: 'loyalty_promos', label: 'Loyalty & Promos', icon: <Gift className="w-3.5 h-3.5" /> },
    { id: 'backups', label: 'System & Backups', icon: <HardDrive className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-800 shadow-xs">
      {/* Top Primary Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Store Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#1E293B] shadow-xs flex items-center justify-center text-amber-400 font-bold border border-slate-700">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                  Richie Rich
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 uppercase tracking-wider hidden sm:inline-block">
                  PAN HOUSE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                Luxury Pan Lounge, Confectioneries & Mukhwas Bar
              </p>
            </div>
          </div>

          {/* Role Switcher Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <button
              onClick={() => onSelectRole('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentRole === 'admin'
                  ? 'bg-[#1E293B] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden md:inline">1. Admin</span>
              <span className="md:hidden">Admin</span>
            </button>

            <button
              onClick={() => onSelectRole('pos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentRole === 'pos'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span className="hidden md:inline">2. Point of Sale</span>
              <span className="md:hidden">POS</span>
            </button>

            <button
              onClick={() => onSelectRole('customer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentRole === 'customer'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden md:inline">3. End Customer</span>
              <span className="md:hidden">Order</span>
            </button>
          </div>

          {/* Quick Action Badges & Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Sync Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Sync: Active</span>
            </div>

            {/* Low Stock Warning Pill */}
            {lowStockCount > 0 && (
              <div
                title={`${lowStockCount} items below threshold`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-bold cursor-pointer hover:bg-red-100 transition-colors"
                onClick={onOpenNotifications}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="hidden sm:inline">{lowStockCount} LOW STOCK</span>
                <span className="sm:hidden">{lowStockCount} Low</span>
              </div>
            )}

            {/* Barcode Scanner Modal Button */}
            {onOpenScanner && (
              <button
                onClick={onOpenScanner}
                title="Open Barcode Scanner"
                className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Scan className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Open Scanner</span>
              </button>
            )}

            {/* Notifications Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User Avatar Pill */}
            <div className="w-8 h-8 rounded-full bg-amber-500 border-2 border-slate-100 shadow-xs flex items-center justify-center text-slate-950 text-xs font-bold">
              RR
            </div>
          </div>
        </div>
      </div>

      {/* Admin Sub Navigation Tabs Bar */}
      {currentRole === 'admin' && onSelectAdminTab && (
        <div className="border-t border-slate-200 bg-slate-50/80 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none">
            {adminTabs.map((tab) => {
              const isActive = activeAdminTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectAdminTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#1E293B] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};

