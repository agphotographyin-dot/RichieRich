import React, { useState, useRef, useEffect } from 'react';
import {
  Boxes,
  LayoutDashboard,
  Truck,
  Building2,
  FileSpreadsheet,
  AlertTriangle,
  History,
  BarChart3,
  Search,
  Plus,
  ChevronDown,
  UserCheck,
  PackagePlus,
  Store,
  ArrowDownLeft,
  Sparkles,
} from 'lucide-react';
import { WarehouseTab, WarehouseSubRole } from '../../types/warehouse';

interface WarehouseHeaderProps {
  activeTab: WarehouseTab;
  onSelectTab: (tab: WarehouseTab) => void;
  subRole: WarehouseSubRole;
  onChangeSubRole: (role: WarehouseSubRole) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenNewPO: () => void;
  onOpenInwardBill: () => void;
  onOpenTransfer: () => void;
  onOpenIndent: () => void;
  onOpenAdjustment: () => void;
  onOpenAddItem?: () => void;
  onOpenPipelineTester?: () => void;
  nearExpiryCount: number;
  inTransitCount: number;
  lowStockCount: number;
  overdueBillsCount: number;
  layoutMode?: 'modern' | 'classic';
  onToggleLayoutMode?: () => void;
}

export const WarehouseHeader: React.FC<WarehouseHeaderProps> = ({
  activeTab,
  onSelectTab,
  subRole,
  onChangeSubRole,
  searchQuery,
  onSearchChange,
  onOpenNewPO,
  onOpenInwardBill,
  onOpenTransfer,
  onOpenIndent,
  onOpenAdjustment,
  onOpenAddItem,
  nearExpiryCount,
  inTransitCount,
  lowStockCount,
  overdueBillsCount,
  layoutMode = 'classic',
  onToggleLayoutMode,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 4 Core Main Required Tabs
  const primaryTabs: { id: WarehouseTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'inventory', label: 'Master Inventory', icon: Boxes, badge: lowStockCount || undefined },
    { id: 'transfers', label: 'Transfers & Indents', icon: Truck, badge: inTransitCount || undefined },
    { id: 'purchases', label: 'Purchases & Bills', icon: FileSpreadsheet, badge: overdueBillsCount || undefined },
  ];

  // Secondary Operations in the Clean "More Operations" Dropdown
  const secondaryTabs: { id: WarehouseTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'store_stock', label: 'Store Stock Allocation', icon: Store },
    { id: 'adjustments', label: 'Adjustments & Scrap', icon: AlertTriangle, badge: nearExpiryCount || undefined },
    { id: 'audit_trail', label: 'Movement Audit Trail', icon: History },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  ];

  const isSecondaryActive = secondaryTabs.some((t) => t.id === activeTab);
  const activeSecondaryLabel = secondaryTabs.find((t) => t.id === activeTab)?.label;

  return (
    <div className="bg-[#1E293B] border border-slate-700/80 text-white rounded-2xl shadow-sm mb-6 relative">
      {/* Top Banner with Role Switcher & Live Quick Actions */}
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-700/60 rounded-t-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shadow-xs">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>Warehouse & Supply Chain</span>
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-amber-400/10 border border-amber-400/20 text-amber-300">
                Central Logistics Hub
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Central Warehouse • Multi-Store Stock Replenishment
            </p>
          </div>
        </div>

        {/* Role Switcher & Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
          {/* Sub-Role Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs">
            <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400 text-[11px] hidden sm:inline">Role:</span>
            <select
              value={subRole}
              onChange={(e) => onChangeSubRole(e.target.value as WarehouseSubRole)}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="admin" className="bg-[#1E293B] text-white">Master Admin</option>
              <option value="warehouse_manager" className="bg-[#1E293B] text-white">Warehouse Manager</option>
              <option value="store_manager" className="bg-[#1E293B] text-white">Store Manager</option>
              <option value="purchase_manager" className="bg-[#1E293B] text-white">Purchase Manager</option>
              <option value="accountant" className="bg-[#1E293B] text-white">Accountant</option>
            </select>
          </div>

          {/* Layout Mode Switcher */}
          {onToggleLayoutMode && (
            <button
              type="button"
              onClick={onToggleLayoutMode}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Toggle to Modern Workspace Layout"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Modern UI</span>
            </button>
          )}

          {/* Quick Actions */}
          {(subRole === 'admin' || subRole === 'warehouse_manager') && onOpenAddItem && (
            <button
              type="button"
              onClick={onOpenAddItem}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Product</span>
            </button>
          )}

          {(subRole === 'admin' || subRole === 'purchase_manager') && (
            <button
              type="button"
              onClick={onOpenNewPO}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New PO</span>
            </button>
          )}

          {(subRole === 'admin' || subRole === 'warehouse_manager') && (
            <button
              type="button"
              onClick={onOpenInwardBill}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <PackagePlus className="w-3.5 h-3.5 text-amber-400" />
              <span>GRN Inward</span>
            </button>
          )}

          {(subRole === 'admin' || subRole === 'warehouse_manager') && (
            <button
              type="button"
              onClick={onOpenTransfer}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Transfer Stock</span>
            </button>
          )}

          {(subRole === 'admin' || subRole === 'store_manager') && (
            <button
              type="button"
              onClick={onOpenIndent}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Store Indent</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Bar: Core Tabs + More Menu Dropdown + Fast Search */}
      <div className="px-4 py-2.5 bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-3 rounded-b-2xl relative z-30">
        {/* Navigation Tabs */}
        <div className="flex items-center flex-wrap gap-1.5 w-full md:w-auto py-0.5">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => {
                  onSelectTab(tab.id);
                  setIsMoreMenuOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                    isActive ? 'bg-slate-900 text-amber-400' : 'bg-amber-500 text-slate-950'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* More Operations Dropdown */}
          <div className="relative inline-block" ref={moreMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMoreMenuOpen((prev) => !prev);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                isSecondaryActive
                  ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                  : isMoreMenuOpen
                  ? 'bg-slate-800 text-white border-amber-400/80 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700/60'
              }`}
              aria-haspopup="true"
              aria-expanded={isMoreMenuOpen}
            >
              <span>{isSecondaryActive ? activeSecondaryLabel : 'More Operations'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMoreMenuOpen ? 'rotate-180 text-amber-400' : 'text-slate-400'}`} />
            </button>

            {isMoreMenuOpen && (
              <div 
                className="absolute left-0 top-full mt-2 w-64 rounded-xl bg-[#0F172A] border border-slate-700 shadow-2xl py-1.5 z-[100] animate-in fade-in zoom-in-95 duration-100"
                style={{ filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.5))' }}
              >
                <div className="px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800 font-bold flex items-center justify-between">
                  <span>Additional Modules</span>
                  <span className="text-[9px] text-amber-400 font-semibold">{secondaryTabs.length} Views</span>
                </div>
                <div className="p-1 space-y-0.5">
                  {secondaryTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        type="button"
                        key={tab.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTab(tab.id);
                          setIsMoreMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          isActive
                            ? 'text-amber-400 bg-slate-800/90 font-bold border border-amber-500/30'
                            : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isActive ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span>{tab.label}</span>
                        </div>
                        {Boolean(tab.badge && tab.badge > 0) && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded-full font-bold bg-amber-500 text-slate-950">
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Multi-Entity Search Bar */}
        <div className="relative w-full md:w-64 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search SKU, Batch, PO, Store..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-slate-800 font-mono transition-all"
          />
        </div>
      </div>
    </div>
  );
};
