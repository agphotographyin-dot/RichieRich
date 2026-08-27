import React from 'react';
import {
  Crown,
  Shield,
  CreditCard,
  ShoppingBag,
  Bell,
  Scan,
  LogOut,
  LayoutDashboard,
  Package,
  TrendingUp,
  Receipt,
  Gift,
  HardDrive,
  Users,
  Home,
  Building2,
} from 'lucide-react';
import { Role, PushNotification, AdminTab, Customer } from '../../types';

interface HeaderProps {
  currentRole: Role;
  activeAdminTab?: AdminTab;
  onSelectAdminTab?: (tab: AdminTab) => void;
  notifications: PushNotification[];
  onOpenNotifications: () => void;
  onOpenScanner?: () => void;
  lowStockCount?: number;
  onLogout?: () => void;
  currentCustomer?: Customer | null;
  onNavigateLanding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  activeAdminTab = 'dashboard',
  onSelectAdminTab,
  notifications,
  onOpenNotifications,
  onOpenScanner,
  lowStockCount = 0,
  onLogout,
  currentCustomer,
  onNavigateLanding,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const adminTabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
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
          <div
            onClick={onNavigateLanding}
            className={`flex items-center gap-3 shrink-0 ${onNavigateLanding ? 'cursor-pointer group' : ''}`}
            title={onNavigateLanding ? 'Go to Home / Portal Selection' : undefined}
          >
            <div className="w-10 h-10 rounded-xl bg-[#1E293B] shadow-xs flex items-center justify-center text-amber-400 font-bold border border-slate-700 group-hover:scale-105 transition-transform">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 group-hover:text-slate-700 transition-colors">
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

          {/* Current Portal Active Badge */}
          <div className="flex items-center">
            {currentRole === 'landing' && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                <Home className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-bold tracking-tight">Portal Selection</span>
              </div>
            )}

            {currentRole === 'admin' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-xs">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold tracking-tight">Admin Dashboard</span>
                <span className="text-[10px] font-mono text-slate-400 hidden md:inline">(/admin)</span>
              </div>
            )}

            {currentRole === 'pos' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-700 text-white border border-emerald-600 shadow-xs">
                <CreditCard className="w-4 h-4 text-emerald-200" />
                <span className="text-xs font-bold tracking-tight">POS Dashboard</span>
                <span className="text-[10px] font-mono text-emerald-200 hidden md:inline">(/pos)</span>
              </div>
            )}

            {currentRole === 'customer' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-700 text-white border border-purple-600 shadow-xs">
                <ShoppingBag className="w-4 h-4 text-purple-200" />
                <span className="text-xs font-bold tracking-tight">Customer Portal</span>
                {currentCustomer && (
                  <span className="text-[10px] font-mono bg-purple-900/60 px-2 py-0.5 rounded-md text-purple-100 hidden sm:inline">
                    📱 {currentCustomer.phone}
                  </span>
                )}
              </div>
            )}

            {currentRole === 'warehouse' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-900 text-white border border-indigo-700 shadow-xs">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold tracking-tight">Warehouse & Inventory Hub</span>
                <span className="text-[10px] font-mono text-indigo-300 hidden md:inline">(/warehouse)</span>
              </div>
            )}
          </div>

          {/* Quick Action Badges & Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Low Stock Warning Pill for Admin/POS */}
            {currentRole !== 'customer' && currentRole !== 'landing' && lowStockCount > 0 && (
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

            {/* Barcode Scanner Modal Button (Admin & POS) */}
            {(currentRole === 'admin' || currentRole === 'pos') && onOpenScanner && (
              <button
                onClick={onOpenScanner}
                title="Open Barcode Scanner"
                className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Scan className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Scanner</span>
              </button>
            )}

            {/* Notifications Bell */}
            {currentRole !== 'landing' && (
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
            )}

            {/* Switch / Home Button */}
            {currentRole !== 'landing' && onNavigateLanding && (
              <button
                onClick={onNavigateLanding}
                title="Return to Portal Selection"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Portals</span>
              </button>
            )}

            {/* Logout / Exit Session Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Log Out of this Portal"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
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
