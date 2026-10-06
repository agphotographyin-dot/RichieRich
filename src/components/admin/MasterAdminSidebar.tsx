import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Store,
  Receipt,
  Sparkles,
  ShieldCheck,
  Package,
  Plus,
  Scan,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2,
  Truck,
  RotateCcw,
  Printer,
  LogOut,
  Users,
  Shield,
  Layers,
  ShoppingBag,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { RichieRichLogo } from '../common/RichieRichLogo';
import { AdminTab, StoreLocation } from '../../types';
import { soundEffects } from '../../services/audio';

interface MasterAdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenAddItem: () => void;
  onOpenScanner: () => void;
  onOpenStatement?: () => void;
  storesCount: number;
  totalOrdersCount: number;
  totalItemsCount: number;
  lowStockCount: number;
  customersCount: number;
  backupsCount: number;
  onLogout?: () => void;
  onNavigateToStoreAdmin?: () => void;
  onNavigateToWarehouse?: () => void;
  onNavigateToPOS?: () => void;
}

export const MasterAdminSidebar: React.FC<MasterAdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  onOpenAddItem,
  onOpenScanner,
  onOpenStatement,
  storesCount,
  totalOrdersCount,
  totalItemsCount,
  lowStockCount,
  customersCount,
  backupsCount,
  onLogout,
  onNavigateToStoreAdmin,
  onNavigateToWarehouse,
  onNavigateToPOS,
}) => {
  const [isPortalsDropdownOpen, setIsPortalsDropdownOpen] = useState(false);
  const portalsDropdownRef = useRef<HTMLDivElement>(null);

  // Close portals dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (portalsDropdownRef.current && !portalsDropdownRef.current.contains(e.target as Node)) {
        setIsPortalsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTabClick = (tab: AdminTab) => {
    soundEffects.playClick();
    onSelectTab(tab);
  };

  return (
    <aside
      className={`bg-[#0F172A] border-r border-slate-800 text-slate-300 transition-all duration-300 ease-in-out flex flex-col z-30 shrink-0 select-none ${
        isCollapsed ? 'w-16 md:w-20' : 'w-72 sm:w-80'
      }`}
    >
      {/* 1. Brand Logo & Collapse Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 min-w-0">
            <RichieRichLogo size="sm" showText={false} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white tracking-wide truncate">
                  RICHIE RICH
                </span>
                <span className="px-1.5 py-0.5 rounded-sm bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[9px] uppercase tracking-wider">
                  HQ
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-400 truncate">
                Central Master Portal
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex items-center justify-center">
            <RichieRichLogo size="sm" showText={false} />
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer hidden md:flex items-center justify-center shrink-0"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* 2. Fast Operational Action Buttons */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        {!isCollapsed ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                onOpenAddItem();
              }}
              className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add SKU</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                onOpenScanner();
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-400 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Barcode</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                onOpenAddItem();
              }}
              className="w-10 h-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl flex items-center justify-center shadow-xs cursor-pointer"
              title="Add New SKU / Product"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
            </button>
            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                onOpenScanner();
              }}
              className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl flex items-center justify-center border border-slate-700 cursor-pointer"
              title="Barcode Scanner"
            >
              <Scan className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Navigation Sections & Tab Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
        {/* GROUP 1: EXECUTIVE & FINANCIALS */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Executive & Finance</span>
              <span className="text-[9px] text-amber-400/80 font-mono">LIVE HQ</span>
            </div>
          )}

          {/* Tab: Dashboard Overview */}
          <button
            type="button"
            onClick={() => handleTabClick('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title="Enterprise Executive Dashboard"
          >
            <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-white' : 'text-amber-400'}`} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left truncate">Executive Dashboard</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Live Synced"></span>
              </>
            )}
          </button>

          {/* Tab: Analytics & P&L */}
          <button
            type="button"
            onClick={() => handleTabClick('analytics')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title="Financial Analytics & Profit Analysis"
          >
            <BarChart3 className={`w-4 h-4 shrink-0 ${activeTab === 'analytics' ? 'text-white' : 'text-amber-400'}`} />
            {!isCollapsed && <span className="flex-1 text-left truncate">Financial Analytics</span>}
          </button>
        </div>

        {/* GROUP 2: OUTLET OPERATIONS & ORDERS */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Outlet Operations
            </div>
          )}

          {/* Tab: Staff & Counters */}
          <button
            type="button"
            onClick={() => handleTabClick('staff_counters')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'staff_counters'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title="Store Outlets, Staff & Counter Stations"
          >
            <Store className={`w-4 h-4 shrink-0 ${activeTab === 'staff_counters' ? 'text-white' : 'text-amber-400'}`} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left truncate">Stores & Counter Staff</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                  {storesCount}
                </span>
              </>
            )}
          </button>

          {/* Tab: Orders Register */}
          <button
            type="button"
            onClick={() => handleTabClick('orders')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title="Central Billed Orders Register"
          >
            <Receipt className={`w-4 h-4 shrink-0 ${activeTab === 'orders' ? 'text-white' : 'text-amber-400'}`} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left truncate">Central Billed Orders</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                  {totalOrdersCount}
                </span>
              </>
            )}
          </button>
        </div>

        {/* GROUP 3: CATALOG & WAREHOUSE OPERATIONS */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Inventory & Operations
            </div>
          )}

          {/* Tab: Master Products & Inventory */}
          <button
            type="button"
            onClick={() => handleTabClick('inventory')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title="Master Products Catalog, POs, Inward & Stock Transfers"
          >
            <Package className={`w-4 h-4 shrink-0 ${activeTab === 'inventory' ? 'text-white' : 'text-amber-400'}`} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left truncate">Inventory & Catalog</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                  {totalItemsCount}
                </span>
              </>
            )}
          </button>

          {/* Tab: Loyalty & Promos */}
          <button
            type="button"
            onClick={() => handleTabClick('loyalty_promos')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'loyalty_promos'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title="Loyalty Rewards & Promotional Campaigns"
          >
            <Sparkles className={`w-4 h-4 shrink-0 ${activeTab === 'loyalty_promos' ? 'text-white' : 'text-amber-400'}`} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left truncate">Loyalty & Promos</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                  {customersCount}
                </span>
              </>
            )}
          </button>

          {/* Tab: Security & Backups */}
          <button
            type="button"
            onClick={() => handleTabClick('backups')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'backups'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title="Security, PIN Locks & Cloud Backups"
          >
            <ShieldCheck className={`w-4 h-4 shrink-0 ${activeTab === 'backups' ? 'text-white' : 'text-amber-400'}`} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left truncate">Security & Backups</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                  {backupsCount}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Bottom Footer: Portals Switcher & Master Admin Profile */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
        {/* Portals Switcher */}
        <div className="relative" ref={portalsDropdownRef}>
          <button
            type="button"
            onClick={() => setIsPortalsDropdownOpen(!isPortalsDropdownOpen)}
            className={`w-full p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Switch Operational Portals"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Layers className="w-4 h-4 text-amber-400 shrink-0" />
              {!isCollapsed && <span className="truncate">Switch Portal</span>}
            </div>
            {!isCollapsed && <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isPortalsDropdownOpen ? 'rotate-180' : ''}`} />}
          </button>

          {isPortalsDropdownOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Enterprise Portals
              </div>

              {onNavigateToStoreAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsPortalsDropdownOpen(false);
                    onNavigateToStoreAdmin();
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Store className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Store Admin Portal</span>
                </button>
              )}

              {onNavigateToWarehouse && (
                <button
                  type="button"
                  onClick={() => {
                    setIsPortalsDropdownOpen(false);
                    onNavigateToWarehouse();
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Central Warehouse Hub</span>
                </button>
              )}

              {onNavigateToPOS && (
                <button
                  type="button"
                  onClick={() => {
                    setIsPortalsDropdownOpen(false);
                    onNavigateToPOS();
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>POS Counter Terminal</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* User Info & Logout */}
        <div className={`flex items-center justify-between gap-2 pt-1 ${isCollapsed ? 'flex-col' : ''}`}>
          {!isCollapsed ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                <span className="text-xs font-extrabold text-white truncate">
                  Master Administrator
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-400 truncate">
                Central HQ Superuser
              </p>
            </div>
          ) : (
            <div className="w-2 h-2 rounded-full bg-emerald-400" title="Super Admin Active"></div>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer shrink-0"
              title="Secure Master Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
