import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Boxes,
  Truck,
  FileSpreadsheet,
  Store,
  AlertTriangle,
  Building2,
  History,
  BarChart3,
  Plus,
  PackagePlus,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shield,
  Sparkles,
  Layers,
  IndianRupee,
  Receipt,
  ShoppingBag,
  Users,
  Package,
  PackageCheck,
  ClipboardCheck,
  Printer,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Key,
  X,
} from 'lucide-react';
import { RichieRichLogo } from '../common/RichieRichLogo';
import { StoreLocation } from '../../types';
import { authService } from '../../services/auth';
import { soundEffects } from '../../services/audio';

export type StoreAdminTabId =
  | 'financials'
  | 'expenses'
  | 'sales_orders'
  | 'staff_counters'
  | 'store_inventory'
  | 'manage_stock'
  | 'suppliers'
  | 'stock_indents'
  | 'printer_setup';

interface StoreAdminSidebarProps {
  activeTab: StoreAdminTabId;
  onSelectTab: (tab: StoreAdminTabId) => void;
  activeStore: StoreLocation;
  stores?: StoreLocation[];
  onSelectStore?: (storeId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenAddExpense: () => void;
  onOpenDirectPO: () => void;
  onOpenReceiveGoods: () => void;
  onOpenIndent: () => void;
  onOpenAuditStock?: () => void;
  activeDirectPOCount: number;
  pendingIndentsCount: number;
  lowStockCount: number;
  totalExpensesCount: number;
  totalOrdersCount: number;
  suppliersCount?: number;
  adminName?: string;
  onLogout?: () => void;
}

export const StoreAdminSidebar: React.FC<StoreAdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  activeStore,
  stores = [],
  onSelectStore,
  isCollapsed,
  onToggleCollapse,
  onOpenAddExpense,
  onOpenDirectPO,
  onOpenReceiveGoods,
  onOpenIndent,
  onOpenAuditStock,
  activeDirectPOCount,
  pendingIndentsCount,
  lowStockCount,
  totalExpensesCount,
  totalOrdersCount,
  suppliersCount,
  adminName = 'Store Manager',
  onLogout,
}) => {
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const storeDropdownRef = useRef<HTMLDivElement>(null);

  // Store Switching Password Verification State
  const [targetStoreToSwitch, setTargetStoreToSwitch] = useState<StoreLocation | null>(null);
  const [switchPassword, setSwitchPassword] = useState('');
  const [showSwitchPassword, setShowSwitchPassword] = useState(false);
  const [switchPasswordError, setSwitchPasswordError] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target as Node)) {
        setIsStoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInitiateStoreSwitch = (target: StoreLocation) => {
    setIsStoreDropdownOpen(false);
    if (target.id === activeStore.id) return;

    setTargetStoreToSwitch(target);
    setSwitchPassword('');
    setSwitchPasswordError('');
    setShowSwitchPassword(false);
  };

  const handleConfirmStoreSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStoreToSwitch) return;

    if (!switchPassword.trim()) {
      setSwitchPasswordError(`Password is required to switch to ${targetStoreToSwitch.name}.`);
      soundEffects.playWarningChime();
      return;
    }

    setIsSwitching(true);
    setSwitchPasswordError('');

    const verifyRes = authService.verifyStoreAdminPassword(targetStoreToSwitch.id, switchPassword);

    if (!verifyRes.success) {
      setIsSwitching(false);
      setSwitchPasswordError(verifyRes.error || `Invalid Store Admin Password for ${targetStoreToSwitch.name}. Authorization denied.`);
      soundEffects.playWarningChime();
      return;
    }

    // Update session storage for the new store outlet
    try {
      const currentSession = authService.getStoreAdminAuthState();
      if (currentSession) {
        currentSession.storeId = targetStoreToSwitch.id;
        currentSession.storeName = targetStoreToSwitch.name;
        if (verifyRes.adminName) currentSession.adminName = verifyRes.adminName;
        localStorage.setItem('rr_auth_store_admin', JSON.stringify(currentSession));
      }
    } catch {
      // ignore
    }

    setIsSwitching(false);
    soundEffects.playSuccessChime();
    const newStoreId = targetStoreToSwitch.id;
    setTargetStoreToSwitch(null);
    setSwitchPassword('');
    onSelectStore?.(newStoreId);
  };

  const navGroups: Array<{
    groupTitle?: string;
    items: Array<{
      id: StoreAdminTabId;
      label: string;
      icon: React.FC<{ className?: string }>;
      badge?: number;
      badgeVariant?: 'red' | 'amber' | 'blue' | 'slate';
    }>;
  }> = [
    {
      groupTitle: 'Financials & Store POS',
      items: [
        {
          id: 'financials',
          label: 'Financial Statement',
          icon: IndianRupee,
        },
        {
          id: 'expenses',
          label: 'Store Expenses',
          icon: Receipt,
          badge: totalExpensesCount || undefined,
          badgeVariant: 'slate',
        },
        {
          id: 'sales_orders',
          label: 'Orders & Sales Ledger',
          icon: ShoppingBag,
          badge: totalOrdersCount || undefined,
          badgeVariant: 'amber',
        },
        {
          id: 'staff_counters',
          label: 'Staff & Counters',
          icon: Users,
        },
        {
          id: 'printer_setup',
          label: 'Printer & Thermal Setup',
          icon: Printer,
        },
      ],
    },
    {
      groupTitle: 'Inventory & Procurement',
      items: [
        {
          id: 'store_inventory',
          label: 'Store Stock Catalog',
          icon: Package,
          badge: lowStockCount || undefined,
          badgeVariant: 'red',
        },
        {
          id: 'manage_stock',
          label: 'Direct Store POs',
          icon: Truck,
          badge: activeDirectPOCount || undefined,
          badgeVariant: 'amber',
        },
        {
          id: 'suppliers',
          label: 'Supplier Management',
          icon: Building2,
          badge: suppliersCount || undefined,
          badgeVariant: 'slate',
        },
        {
          id: 'stock_indents',
          label: 'Warehouse Indents',
          icon: Layers,
          badge: pendingIndentsCount || undefined,
          badgeVariant: 'blue',
        },
      ],
    },
  ];

  return (
    <aside
      className={`bg-[#0F172A] border-r border-slate-800/90 text-white flex flex-col justify-between transition-all duration-300 select-none z-30 shrink-0 h-full overflow-hidden ${
        isCollapsed ? 'w-14 sm:w-15' : 'w-56 sm:w-60'
      }`}
    >
      {/* Top Section: Outlet Identity & Collapse Toggle */}
      <div className={`border-b border-slate-800/80 transition-all ${isCollapsed ? 'p-2 flex flex-col items-center' : 'p-2.5 sm:p-3'}`}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2 w-full">
            <div
              className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0 shadow-xs"
              title={`${activeStore.name} - Active`}
            >
              <Store className="w-4 h-4" />
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand Sidebar"
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative" ref={storeDropdownRef}>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left p-1.5 -m-1.5 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer group"
                title="Switch Store Outlet (Store Admin Password Required)"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0 shadow-xs group-hover:border-amber-500/50 relative">
                  <Store className="w-4 h-4" />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400">
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs sm:text-sm text-white tracking-tight truncate">
                      {activeStore.name}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                    <span className="text-[10px] text-slate-400 font-mono tracking-tight truncate">
                      {activeStore.counters?.length || 1} Counters • Locked
                    </span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onToggleCollapse}
                title="Collapse Sidebar"
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Store Selection Dropdown */}
            {isStoreDropdownOpen && stores.length > 0 && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl p-2.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-2.5 py-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                  <span>Switch Store Outlet</span>
                  <span className="flex items-center gap-1 text-slate-400 normal-case font-normal text-[10px]">
                    <Lock className="w-3 h-3 text-amber-400" /> Password Required
                  </span>
                </div>
                <div className="py-1.5 max-h-64 overflow-y-auto space-y-1">
                  {stores.map((s) => {
                    const isCurrent = s.id === activeStore.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleInitiateStoreSwitch(s)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold truncate flex items-center gap-1.5">
                            <span>{s.name}</span>
                            {!isCurrent && (
                              <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {s.area || s.id} • {s.countersCount || s.counters?.length || 1} Station(s)
                          </div>
                        </div>

                        {isCurrent ? (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700 shrink-0">
                            Switch
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Launch Buttons (When expanded) */}
        {!isCollapsed && (
          <div className="mt-2 space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={onOpenDirectPO}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-amber-600/90 hover:bg-amber-600 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer border border-amber-500/30"
                title="Raise Direct Purchase Order to Supplier"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Direct PO</span>
              </button>

              <button
                type="button"
                onClick={onOpenReceiveGoods}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer border border-emerald-500/30"
                title="Inward Goods Received from Supplier"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Receive</span>
              </button>
            </div>

            {onOpenAuditStock && (
              <button
                type="button"
                onClick={onOpenAuditStock}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold border border-slate-700 shadow-2xs transition-colors cursor-pointer"
                title="Perform Physical Stock Count Audit (Store Admin Password Required)"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Audit Store Stock</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation Links (Scrollable Independently) */}
      <div className="flex-1 min-h-0 overflow-y-auto py-2 px-1.5 sm:px-2 space-y-2.5 custom-scrollbar">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-0.5">
            {!isCollapsed && group.groupTitle && (
              <div className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {group.groupTitle}
              </div>
            )}

            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-xs font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80 font-semibold'
                  } ${isCollapsed ? 'justify-center px-0 py-2' : ''}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-amber-400'
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="text-xs tracking-tight truncate">{item.label}</span>
                    )}
                  </div>

                  {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                        item.badgeVariant === 'red'
                          ? 'bg-red-500 text-white animate-pulse'
                          : item.badgeVariant === 'amber'
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : item.badgeVariant === 'blue'
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer / Quick Status */}
      <div className="p-2 sm:p-2.5 border-t border-slate-800/80 bg-slate-950/40">
        {!isCollapsed ? (
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Store Admin v2.6</span>
            <span className="text-emerald-400 font-bold">● Live Sync</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live Sync"></span>
          </div>
        )}
      </div>

      {/* Password Authorization Modal to Switch Store Outlet */}
      {targetStoreToSwitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150 text-slate-900">
          <div className="bg-[#0F172A] border border-slate-700 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl text-white space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Store Admin Authorization Required
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Switching store outlets is password protected.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTargetStoreToSwitch(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Switch details */}
            <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs space-y-2 font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span>Current Outlet:</span>
                <span className="font-bold text-slate-200">{activeStore.name}</span>
              </div>
              <div className="flex items-center justify-between text-amber-300 pt-1 border-t border-slate-800">
                <span>Target Outlet:</span>
                <span className="font-extrabold text-amber-400">{targetStoreToSwitch.name}</span>
              </div>
            </div>

            {/* Password input form */}
            <form onSubmit={handleConfirmStoreSwitch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Password for {targetStoreToSwitch.name}</span>
                </label>
                <div className="relative">
                  <input
                    type={showSwitchPassword ? 'text' : 'password'}
                    placeholder={`Enter Store Admin password (e.g. RR${targetStoreToSwitch.id} or RRadmin)...`}
                    value={switchPassword}
                    onChange={(e) => {
                      setSwitchPassword(e.target.value);
                      setSwitchPasswordError('');
                    }}
                    autoFocus
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSwitchPassword(!showSwitchPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showSwitchPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {switchPasswordError && (
                <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-center gap-2 animate-in fade-in font-semibold">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{switchPasswordError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTargetStoreToSwitch(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSwitching}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-amber-500/40"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>{isSwitching ? 'Verifying...' : 'Authorize & Switch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
