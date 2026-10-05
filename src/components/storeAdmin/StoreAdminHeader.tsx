import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  Search,
  AlertTriangle,
  Truck,
  Clock,
  Sparkles,
  ChevronDown,
  Shield,
  CreditCard,
  Store,
  ShoppingBag,
  Home,
  LogOut,
  Plus,
  Receipt,
  RotateCcw,
  Printer,
  Download,
  Package,
  Layers,
  X,
  PackagePlus,
  PackageCheck,
} from 'lucide-react';
import { StoreLocation, StoreFinancialSummary } from '../../types';
import { RichieRichLogo } from '../common/RichieRichLogo';
import { authService } from '../../services/auth';

interface StoreAdminHeaderProps {
  stores: StoreLocation[];
  activeStore: StoreLocation;
  onSelectStore: (storeId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeDirectPOCount: number;
  pendingIndentsCount: number;
  lowStockCount: number;
  onOpenAddExpense: () => void;
  onOpenDirectPO: () => void;
  onOpenReceiveGoods: () => void;
  onOpenIndent: () => void;
  onOpenStatement: () => void;
  onExportPDF: () => void;
  onRefresh: () => void;
  onLogout: () => void;
  onNavigateToWarehouse?: () => void;
  onNavigateToAdmin?: () => void;
  adminName?: string;
}

export const StoreAdminHeader: React.FC<StoreAdminHeaderProps> = ({
  stores,
  activeStore,
  onSelectStore,
  searchQuery,
  onSearchChange,
  activeDirectPOCount,
  pendingIndentsCount,
  lowStockCount,
  onOpenAddExpense,
  onOpenDirectPO,
  onOpenReceiveGoods,
  onOpenIndent,
  onOpenStatement,
  onExportPDF,
  onRefresh,
  onLogout,
  onNavigateToWarehouse,
  onNavigateToAdmin,
  adminName = 'Store Manager',
}) => {
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  const storeDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target as Node)) {
        setIsStoreDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (quickActionsRef.current && !quickActionsRef.current.contains(e.target as Node)) {
        setIsQuickActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-[#0F172A] border-b border-slate-800 text-white sticky top-0 z-40 select-none shadow-md">
      <div className="px-3 sm:px-5 h-16 flex items-center justify-between gap-3">
        {/* Left: Brand + Store Selector */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <RichieRichLogo className="w-8 h-8 rounded-xl shadow-xs" />
            <div className="hidden lg:block">
              <span className="font-black text-sm tracking-tight text-white block leading-tight">
                RICHIE RICH
              </span>
              <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider block">
                Store Admin
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>

          {/* Store Location Selector Dropdown */}
          <div className="relative" ref={storeDropdownRef}>
            <button
              type="button"
              onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="text-left">
                <span className="text-white block font-black leading-tight truncate max-w-[130px] sm:max-w-[180px]">
                  {activeStore.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:block">
                  {activeStore.counters.length} POS Stations • {activeStore.id}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {isStoreDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Store Outlet
                </div>
                <div className="py-1 space-y-1">
                  {stores.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onSelectStore(s.id);
                        setIsStoreDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                        s.id === activeStore.id
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-extrabold truncate">{s.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {s.area} • {s.countersCount} Counters
                        </div>
                      </div>
                      {s.id === activeStore.id && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Quick search products, orders, bills, expenses..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-amber-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Quick Action Buttons & Profile Switcher */}
        <div className="flex items-center gap-2">
          {/* Quick Metrics Alerts */}
          <div className="hidden xl:flex items-center gap-2">
            {activeDirectPOCount > 0 && (
              <div
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold flex items-center gap-1.5"
                title={`${activeDirectPOCount} Direct POs active/in-transit`}
              >
                <Truck className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span>{activeDirectPOCount} Direct POs</span>
              </div>
            )}

            {pendingIndentsCount > 0 && (
              <div
                className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-mono font-bold flex items-center gap-1.5"
                title={`${pendingIndentsCount} Warehouse Indents pending`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>{pendingIndentsCount} Indents</span>
              </div>
            )}

            {lowStockCount > 0 && (
              <div
                className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-mono font-bold flex items-center gap-1.5"
                title={`${lowStockCount} items at or below low stock threshold`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>{lowStockCount} Low Stock</span>
              </div>
            )}
          </div>

          {/* Quick Action Dropdown */}
          <div className="relative" ref={quickActionsRef}>
            <button
              type="button"
              onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all border border-amber-500/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Actions</span>
              <ChevronDown className="w-3 h-3 text-amber-200" />
            </button>

            {isQuickActionsOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Store Operations
                </div>
                <div className="py-1 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      onOpenDirectPO();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-bold text-white hover:bg-amber-600 hover:text-white transition-colors cursor-pointer"
                  >
                    <Truck className="w-4 h-4 text-amber-400" />
                    <span>Create Direct Store PO</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      onOpenReceiveGoods();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-bold text-white hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                  >
                    <PackageCheck className="w-4 h-4 text-emerald-400" />
                    <span>Direct Receive Goods</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      onOpenAddExpense();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-bold text-white hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                  >
                    <Receipt className="w-4 h-4 text-amber-400" />
                    <span>Record Store Expense</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      onOpenIndent();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-bold text-white hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span>Order Stock from Warehouse</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      onOpenStatement();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-bold text-white hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-400" />
                    <span>Print Financial Statement</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            title="Refresh Live Data"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700/80"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* User Profile & Navigation Switcher */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs">
                {adminName.slice(0, 1).toUpperCase()}
              </div>
              <span className="hidden sm:block text-slate-200 truncate max-w-[100px]">
                {adminName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-2.5 border-b border-slate-800">
                  <div className="font-extrabold text-white text-xs">{adminName}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Store Manager • {activeStore.name}
                  </div>
                </div>

                <div className="py-1 space-y-1">
                  {onNavigateToWarehouse && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onNavigateToWarehouse();
                      }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <Building2 className="w-4 h-4 text-indigo-400" />
                      <span>Switch to Central Warehouse</span>
                    </button>
                  )}

                  {onNavigateToAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onNavigateToAdmin();
                      }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-amber-400" />
                      <span>Switch to Master Admin</span>
                    </button>
                  )}

                  <div className="border-t border-slate-800 my-1"></div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out Store Admin</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
