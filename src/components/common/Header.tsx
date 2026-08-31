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
  Store,
  Sparkles,
} from 'lucide-react';
import { Role, PushNotification, AdminTab, Customer } from '../../types';
import { RichieRichLogo } from './RichieRichLogo';

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
  warehouseLayoutMode?: 'modern' | 'classic';
  onToggleWarehouseLayoutMode?: () => void;
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
  warehouseLayoutMode,
  onToggleWarehouseLayoutMode,
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
    <header className="sticky top-0 z-40 bg-[#1E293B] border-b border-slate-700/80 text-white shadow-md">
      {/* Top Primary Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Store Title */}
          <div
            onClick={onNavigateLanding}
            className={`flex items-center gap-3 shrink-0 ${onNavigateLanding ? 'cursor-pointer group' : ''}`}
            title={onNavigateLanding ? 'Go to Home / Portal Selection' : undefined}
          >
            <RichieRichLogo size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-base sm:text-lg tracking-wider uppercase text-white group-hover:text-amber-400 transition-colors">
                  RICHIE RICH
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-300 uppercase tracking-wider hidden sm:inline-block">
                  PAN HOUSE
                </span>
              </div>
              <p className="text-[11px] text-amber-300/90 hidden sm:block font-medium tracking-tight">
                Pan | Coffee | Essentials | 24x7
              </p>
            </div>
          </div>

          {/* Current Portal Active Badge */}
          <div className="flex items-center">
            {currentRole === 'landing' && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 shadow-xs">
                <Home className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold tracking-tight">Portal Selection</span>
              </div>
            )}

            {currentRole === 'admin' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 text-white border border-slate-700 shadow-xs">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold tracking-tight">Master Admin</span>
                <span className="text-[10px] font-mono text-slate-400 hidden md:inline">(/admin)</span>
              </div>
            )}

            {currentRole === 'pos' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 text-white border border-slate-700 shadow-xs">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold tracking-tight">POS Billing Terminal</span>
                <span className="text-[10px] font-mono text-slate-400 hidden md:inline">(/pos)</span>
              </div>
            )}

            {currentRole === 'customer' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 text-white border border-slate-700 shadow-xs">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold tracking-tight">Customer Portal</span>
                {currentCustomer && (
                  <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded-md text-amber-300 border border-slate-700 hidden sm:inline">
                    {currentCustomer.phone}
                  </span>
                )}
              </div>
            )}

            {currentRole === 'warehouse' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 text-white border border-slate-700 shadow-xs">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold tracking-tight">Central Warehouse</span>
                <span className="text-[10px] font-mono text-slate-400 hidden md:inline">(/warehouse)</span>
              </div>
            )}

            {currentRole === 'store_admin' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 text-white border border-slate-700 shadow-xs">
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold tracking-tight">Store Admin Portal</span>
                <span className="text-[10px] font-mono text-amber-300 hidden md:inline">(/store-admin)</span>
              </div>
            )}
          </div>

          {/* Quick Action Badges & Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Low Stock Warning Pill for Admin/POS */}
            {currentRole !== 'customer' && currentRole !== 'landing' && lowStockCount > 0 && (
              <div
                title={`${lowStockCount} items below threshold`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold cursor-pointer hover:bg-red-900 transition-colors"
                onClick={onOpenNotifications}
              >
                <div className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                <span className="hidden sm:inline">{lowStockCount} LOW STOCK</span>
                <span className="sm:hidden">{lowStockCount} Low</span>
              </div>
            )}

            {/* Barcode Scanner Modal Button (Admin & POS) */}
            {(currentRole === 'admin' || currentRole === 'pos') && onOpenScanner && (
              <button
                onClick={onOpenScanner}
                title="Open Barcode Scanner"
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-700 shadow-xs"
              >
                <Scan className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Scanner</span>
              </button>
            )}

            {/* Notifications Bell */}
            {currentRole !== 'landing' && (
              <button
                onClick={onOpenNotifications}
                className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center border-2 border-[#1E293B] shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Warehouse Layout Mode Toggle (Modern / Classic) */}
            {currentRole === 'warehouse' && onToggleWarehouseLayoutMode && (
              <button
                type="button"
                onClick={onToggleWarehouseLayoutMode}
                title={`Switch to ${warehouseLayoutMode === 'modern' ? 'Classic UI' : 'Modern UI'}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{warehouseLayoutMode === 'modern' ? 'Modern UI' : 'Classic UI'}</span>
              </button>
            )}

            {/* Switch / Home Button */}
            {currentRole !== 'landing' && onNavigateLanding && (
              <button
                onClick={onNavigateLanding}
                title="Return to Portal Selection"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Home className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Portals</span>
              </button>
            )}

            {/* Logout / Exit Session Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Log Out of this Portal"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/80 hover:text-red-300 hover:border-red-500/50 text-slate-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-xs"
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
        <div className="border-t border-slate-700/60 bg-slate-900 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none">
            {adminTabs.map((tab) => {
              const isActive = activeAdminTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectAdminTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-xs font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
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
