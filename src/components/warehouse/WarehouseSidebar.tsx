import React, { useState } from 'react';
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
  Shield,
  UserCheck,
  Sparkles,
  Layers,
  FlaskConical,
} from 'lucide-react';
import { WarehouseTab, WarehouseSubRole } from '../../types/warehouse';
import { RichieRichLogo } from '../common/RichieRichLogo';

interface WarehouseSidebarProps {
  activeTab: WarehouseTab;
  onSelectTab: (tab: WarehouseTab) => void;
  subRole: WarehouseSubRole;
  onChangeSubRole: (role: WarehouseSubRole) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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
  layoutMode: 'modern' | 'classic';
  onToggleLayoutMode: () => void;
}

export const WarehouseSidebar: React.FC<WarehouseSidebarProps> = ({
  activeTab,
  onSelectTab,
  subRole,
  onChangeSubRole,
  isCollapsed,
  onToggleCollapse,
  onOpenNewPO,
  onOpenInwardBill,
  onOpenTransfer,
  onOpenIndent,
  onOpenAdjustment,
  onOpenAddItem,
  onOpenPipelineTester,
  nearExpiryCount,
  inTransitCount,
  lowStockCount,
  overdueBillsCount,
  layoutMode,
  onToggleLayoutMode,
}) => {
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  const navGroups: Array<{
    groupTitle?: string;
    items: Array<{
      id: WarehouseTab;
      label: string;
      icon: React.FC<{ className?: string }>;
      badge?: number;
      badgeVariant?: 'red' | 'amber' | 'purple' | 'slate';
    }>;
  }> = [
    {
      groupTitle: 'Core Operations',
      items: [
        {
          id: 'dashboard',
          label: 'Overview',
          icon: LayoutDashboard,
        },
        {
          id: 'inventory',
          label: 'Master Inventory',
          icon: Boxes,
          badge: lowStockCount || undefined,
          badgeVariant: 'red',
        },
        {
          id: 'transfers',
          label: 'Transfers & Indents',
          icon: Truck,
          badge: inTransitCount || undefined,
          badgeVariant: 'amber',
        },
        {
          id: 'purchases',
          label: 'Purchases & Bills',
          icon: FileSpreadsheet,
          badge: overdueBillsCount || undefined,
          badgeVariant: 'purple',
        },
      ],
    },
    {
      groupTitle: 'Replenishment & Storage',
      items: [
        {
          id: 'store_stock',
          label: 'Store Stock Allocation',
          icon: Store,
        },
        {
          id: 'adjustments',
          label: 'Adjustments & Scrap',
          icon: AlertTriangle,
          badge: nearExpiryCount || undefined,
          badgeVariant: 'amber',
        },
      ],
    },
    {
      groupTitle: 'Auditing & Intelligence',
      items: [
        {
          id: 'audit_trail',
          label: 'Movement Audit Trail',
          icon: History,
        },
        {
          id: 'reports',
          label: 'Reports & Analytics',
          icon: BarChart3,
        },
      ],
    },
  ];

  return (
    <aside
      className={`bg-[#0F172A] border-r border-slate-800/90 text-white flex flex-col justify-between transition-all duration-300 select-none z-30 shrink-0 sticky top-0 h-[calc(100vh-4rem)] overflow-hidden ${
        isCollapsed ? 'w-16 sm:w-18' : 'w-64 sm:w-68'
      }`}
    >
      {/* Top Section: Branding + Quick Action Launcher */}
      <div className={`border-b border-slate-800/80 transition-all ${isCollapsed ? 'p-2.5 flex flex-col items-center' : 'p-3 sm:p-4'}`}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2 w-full">
            <div
              className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0 shadow-xs"
              title="Central Logistics Hub - Active"
            >
              <Boxes className="w-4 h-4" />
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
                <Boxes className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm text-white tracking-tight truncate">
                    Central Logistics
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                  <span className="text-[10px] text-slate-400 font-mono tracking-tight truncate">Hub Active</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleCollapse}
              title="Collapse Sidebar"
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Action Button & Popover */}
        <div className={`relative ${isCollapsed ? 'mt-2 w-full' : 'mt-3'}`}>
          <button
            type="button"
            onClick={() => setIsQuickActionOpen((prev) => !prev)}
            title="Create New Transaction / Action"
            className={`w-full py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
              isCollapsed ? 'px-1' : 'px-2.5'
            } ${
              isQuickActionOpen
                ? 'bg-amber-500 text-slate-950'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Quick Action</span>}
          </button>

          {isQuickActionOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsQuickActionOpen(false)}
              />
              <div
                className={`absolute left-0 top-full mt-2 w-56 bg-[#1E293B] border border-slate-700/90 rounded-2xl shadow-xl p-1.5 z-50 text-xs animate-in zoom-in-95 duration-150 ${
                  isCollapsed ? 'left-full ml-2 top-0' : ''
                }`}
              >
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  New Transaction
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionOpen(false);
                    onOpenNewPO();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 font-medium cursor-pointer transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                  <span>Issue Purchase Order</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionOpen(false);
                    onOpenInwardBill();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 font-medium cursor-pointer transition-colors"
                >
                  <PackagePlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>GRN Inward Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionOpen(false);
                    onOpenTransfer();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 font-medium cursor-pointer transition-colors"
                >
                  <Truck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Dispatch Stock Transfer</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionOpen(false);
                    onOpenIndent();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 font-medium cursor-pointer transition-colors"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span>Store Replenishment Indent</span>
                </button>
                {onOpenAddItem && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionOpen(false);
                      onOpenAddItem();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 font-medium cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Add New SKU Item</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionOpen(false);
                    onOpenAdjustment();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 font-medium cursor-pointer transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Scrap & Stock Adjustment</span>
                </button>
                {onOpenPipelineTester && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionOpen(false);
                      onOpenPipelineTester();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-amber-300 hover:bg-amber-950/40 border-t border-slate-800 mt-1 flex items-center gap-2 font-medium cursor-pointer transition-colors"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pipeline Tester Demo</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Middle Section: Scrollable Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!isCollapsed && group.groupTitle && (
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                {group.groupTitle}
              </div>
            )}
            {group.items.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  title={isCollapsed ? tab.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 relative cursor-pointer ${
                    isActive
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!isCollapsed && <span className="truncate">{tab.label}</span>}

                  {Boolean(tab.badge && tab.badge > 0) && (
                    <span
                      className={`text-[10px] font-bold rounded-full px-1.5 py-0.2 shrink-0 ${
                        isCollapsed ? 'absolute -top-1 -right-1 ring-2 ring-[#0F172A]' : 'ml-auto'
                      } ${
                        isActive
                          ? 'bg-slate-900 text-amber-300'
                          : tab.badgeVariant === 'red'
                          ? 'bg-rose-500 text-white'
                          : tab.badgeVariant === 'amber'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-indigo-500 text-white'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Section: Role Selector & Mode Toggle */}
      <div className="p-2.5 sm:p-3 border-t border-slate-800/80 bg-slate-900/60 space-y-2">
        {/* Role Selector */}
        {!isCollapsed ? (
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
              <span className="flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-amber-400" /> Active Role
              </span>
            </div>
            <select
              value={subRole}
              onChange={(e) => onChangeSubRole(e.target.value as WarehouseSubRole)}
              className="w-full bg-[#0F172A] border border-slate-700 text-white rounded-lg p-1 text-[11px] font-bold focus:outline-none cursor-pointer"
            >
              <option value="admin">Master Admin</option>
              <option value="warehouse_manager">Warehouse Manager</option>
              <option value="store_manager">Store Manager</option>
              <option value="purchase_manager">Purchase Manager</option>
              <option value="accountant">Accountant</option>
            </select>
          </div>
        ) : (
          <div
            title={`Role: ${subRole}`}
            className="flex justify-center p-2 rounded-xl bg-slate-800 text-amber-400"
          >
            <UserCheck className="w-4 h-4" />
          </div>
        )}

        {/* Layout Switcher Toggle */}
        <button
          type="button"
          onClick={onToggleLayoutMode}
          title="Toggle between Modern Workspace and Classic UI"
          className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            layoutMode === 'modern'
              ? 'bg-slate-800/90 text-amber-300 border-amber-500/40 hover:bg-slate-800'
              : 'bg-amber-600 text-white border-amber-500 hover:bg-amber-500'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          {!isCollapsed && <span>{layoutMode === 'modern' ? 'Modern Layout' : 'Classic Layout'}</span>}
        </button>
      </div>
    </aside>
  );
};
