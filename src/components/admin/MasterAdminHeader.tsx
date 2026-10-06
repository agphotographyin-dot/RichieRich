import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  Search,
  AlertTriangle,
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
  Scan,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { RichieRichLogo } from '../common/RichieRichLogo';
import { soundEffects } from '../../services/audio';

interface MasterAdminHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  lowStockCount: number;
  storesCount: number;
  totalOrdersCount: number;
  onOpenAddItem: () => void;
  onOpenScanner: () => void;
  onOpenStatement: () => void;
  onRefresh: () => void;
  onLogout: () => void;
  onNavigateToStoreAdmin?: () => void;
  onNavigateToWarehouse?: () => void;
  onNavigateToPOS?: () => void;
  onNavigateToLanding?: () => void;
}

export const MasterAdminHeader: React.FC<MasterAdminHeaderProps> = ({
  searchQuery,
  onSearchChange,
  lowStockCount,
  storesCount,
  totalOrdersCount,
  onOpenAddItem,
  onOpenScanner,
  onOpenStatement,
  onRefresh,
  onLogout,
  onNavigateToStoreAdmin,
  onNavigateToWarehouse,
  onNavigateToPOS,
  onNavigateToLanding,
}) => {
  const [isPortalsMenuOpen, setIsPortalsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const portalsMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (portalsMenuRef.current && !portalsMenuRef.current.contains(e.target as Node)) {
        setIsPortalsMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-[#0F172A] border-b border-slate-800 text-white sticky top-0 z-40 select-none shadow-md">
      <div className="px-3 sm:px-5 lg:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Brand / System Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <RichieRichLogo size="sm" showText={false} />
            <div className="hidden sm:block">
              <span className="font-black text-sm text-white tracking-wide block">
                MASTER ADMIN PORTAL
              </span>
              <span className="text-[10px] font-mono text-amber-400 block -mt-0.5">
                Central Headquarters & Multi-Store Control
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-slate-800 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 font-bold flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Central Cloud Live</span>
            </span>

            {lowStockCount > 0 ? (
              <span className="px-2.5 py-1 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/80 font-bold flex items-center gap-1.5 shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{lowStockCount} Low Stock</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Stock Healthy</span>
              </span>
            )}

            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span>{storesCount} Active Outlets</span>
            </span>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search master products, SKU, barcode, orders, customers..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-700/90 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Quick Action Buttons & Menu Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Add Product Button */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playClick();
              onOpenAddItem();
            }}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all border border-amber-400/40"
            title="Create New SKU / Product Catalog Entry"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Add Product</span>
          </button>

          {/* Barcode Scanner */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playClick();
              onOpenScanner();
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl transition-colors cursor-pointer border border-slate-700 shadow-2xs"
            title="Open Camera Barcode Scanner"
          >
            <Scan className="w-4 h-4" />
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playClick();
              onRefresh();
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer border border-slate-700 shadow-2xs"
            title="Refresh All Real-time Data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Portals Switcher Menu */}
          <div className="relative" ref={portalsMenuRef}>
            <button
              type="button"
              onClick={() => setIsPortalsMenuOpen(!isPortalsMenuOpen)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              title="Open Portal Switcher"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Portals</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isPortalsMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Switch Operational Portal
                </div>

                {onNavigateToStoreAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPortalsMenuOpen(false);
                      onNavigateToStoreAdmin();
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Store className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <div className="font-bold">Store Admin Portal</div>
                      <div className="text-[10px] text-slate-400">Outlets P&L & Petty Expenses</div>
                    </div>
                  </button>
                )}

                {onNavigateToWarehouse && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPortalsMenuOpen(false);
                      onNavigateToWarehouse();
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-bold">Central Warehouse Hub</div>
                      <div className="text-[10px] text-slate-400">Master Stock & Indents</div>
                    </div>
                  </button>
                )}

                {onNavigateToPOS && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPortalsMenuOpen(false);
                      onNavigateToPOS();
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold">POS Counter Terminal</div>
                      <div className="text-[10px] text-slate-400">24x7 Counter Billing</div>
                    </div>
                  </button>
                )}

                {onNavigateToLanding && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPortalsMenuOpen(false);
                      onNavigateToLanding();
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-800 mt-1 pt-2"
                  >
                    <Home className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Landing Portal Hub</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* User Menu & Logout */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-2xs">
                HQ
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                <div className="px-3 py-2 border-b border-slate-800">
                  <span className="font-bold text-xs text-white block">Master Administrator</span>
                  <span className="text-[10px] text-amber-400 font-mono block">Central System HQ</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenStatement();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Financial Statement</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-400 hover:bg-rose-950/60 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout Master Session</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
