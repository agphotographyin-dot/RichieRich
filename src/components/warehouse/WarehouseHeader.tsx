import React from 'react';
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
  ArrowRightLeft,
  ShieldCheck,
  UserCheck,
  PackagePlus,
  FileText,
  BadgeAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Store,
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
  nearExpiryCount: number;
  inTransitCount: number;
  lowStockCount: number;
  overdueBillsCount: number;
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
  nearExpiryCount,
  inTransitCount,
  lowStockCount,
  overdueBillsCount,
}) => {
  const tabs: { id: WarehouseTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Central Stock & Batches', icon: Boxes, badge: lowStockCount || undefined },
    { id: 'store_stock', label: 'Individual Store Stock', icon: Store },
    { id: 'transfers', label: 'Transfers & In-Transit', icon: Truck, badge: inTransitCount || undefined },
    { id: 'purchases', label: 'Purchases & Suppliers', icon: FileSpreadsheet, badge: overdueBillsCount || undefined },
    { id: 'locations', label: 'Warehouses & Stores', icon: Building2 },
    { id: 'adjustments', label: 'Adjustments & Scrap', icon: AlertTriangle, badge: nearExpiryCount || undefined },
    { id: 'audit_trail', label: 'Movement Audit Trail', icon: History },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  ];

  const roleLabels: Record<WarehouseSubRole, { title: string; color: string }> = {
    admin: { title: 'Master Admin (Full Access)', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    warehouse_manager: { title: 'Warehouse Manager', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
    store_manager: { title: 'Store Outlet Manager', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
    purchase_manager: { title: 'Purchase & Procurement', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
    accountant: { title: 'Chief Accountant', color: 'bg-violet-500/10 text-violet-300 border-violet-500/30' },
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-white rounded-2xl shadow-xl overflow-hidden mb-6">
      {/* Top Banner with Role Switcher & Live Quick Actions */}
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Warehouse & Supply Chain</span>
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-amber-400/10 border border-amber-400/20 text-amber-300">
                Live FIFO Tracking
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ahmedabad Central Master Logistics • Multi-Store Replenishment & GRN
            </p>
          </div>
        </div>

        {/* Role Switcher & Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
          {/* Sub-Role Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1.5 rounded-xl text-xs">
            <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-slate-400 text-[11px] hidden sm:inline">Role:</span>
            <select
              value={subRole}
              onChange={(e) => onChangeSubRole(e.target.value as WarehouseSubRole)}
              className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer pr-2"
            >
              <option value="admin" className="bg-slate-900 text-white">Master Admin (Full)</option>
              <option value="warehouse_manager" className="bg-slate-900 text-white">Warehouse Manager</option>
              <option value="store_manager" className="bg-slate-900 text-white">Store Manager</option>
              <option value="purchase_manager" className="bg-slate-900 text-white">Purchase Manager</option>
              <option value="accountant" className="bg-slate-900 text-white">Accountant</option>
            </select>
          </div>

          {/* Quick Action Trigger Buttons */}
          {(subRole === 'admin' || subRole === 'purchase_manager') && (
            <button
              onClick={onOpenNewPO}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New PO</span>
            </button>
          )}

          {(subRole === 'admin' || subRole === 'warehouse_manager') && (
            <button
              onClick={onOpenInwardBill}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>GRN Inward</span>
            </button>
          )}

          {(subRole === 'admin' || subRole === 'warehouse_manager') && (
            <button
              onClick={onOpenTransfer}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Dispatch Transfer</span>
            </button>
          )}

          {(subRole === 'admin' || subRole === 'store_manager') && (
            <button
              onClick={onOpenIndent}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>Store Indent</span>
            </button>
          )}

          {(subRole === 'admin' || subRole === 'warehouse_manager') && (
            <button
              onClick={onOpenAdjustment}
              className="px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-800/60 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Scrap / Adj</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Navigation Sub-Bar */}
      <div className="px-4 py-2.5 bg-slate-950/60 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto py-1 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                    isActive ? 'bg-amber-400 text-slate-950' : 'bg-rose-500 text-white'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
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
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-slate-800 font-mono transition-all"
          />
        </div>
      </div>
    </div>
  );
};
