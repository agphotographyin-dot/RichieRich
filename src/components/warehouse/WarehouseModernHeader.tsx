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
  FileSpreadsheet,
  PackagePlus,
  ArrowDownLeft,
  X,
  Scan,
} from 'lucide-react';
import { Warehouse, WarehouseSubRole } from '../../types/warehouse';
import { RichieRichLogo } from '../common/RichieRichLogo';
import { authService } from '../../services/auth';

interface WarehouseModernHeaderProps {
  warehouses: Warehouse[];
  selectedWarehouseId?: string;
  onSelectWarehouse?: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  lowStockCount: number;
  inTransitCount: number;
  nearExpiryCount: number;
  overdueBillsCount: number;
  layoutMode: 'modern' | 'classic';
  onToggleLayoutMode: () => void;
  onOpenNewPO: () => void;
  onOpenInwardBill: () => void;
  onOpenTransfer: () => void;
  onOpenIndent: () => void;
  onOpenScanner?: () => void;
}

export const WarehouseModernHeader: React.FC<WarehouseModernHeaderProps> = ({
  warehouses,
  selectedWarehouseId,
  onSelectWarehouse,
  searchQuery,
  onSearchChange,
  lowStockCount,
  inTransitCount,
  nearExpiryCount,
  overdueBillsCount,
  layoutMode,
  onToggleLayoutMode,
  onOpenNewPO,
  onOpenInwardBill,
  onOpenTransfer,
  onOpenIndent,
  onOpenScanner,
}) => {
  const [isPortalMenuOpen, setIsPortalMenuOpen] = useState(false);
  const [isWarehouseMenuOpen, setIsWarehouseMenuOpen] = useState(false);
  const portalMenuRef = useRef<HTMLDivElement>(null);
  const warehouseMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (portalMenuRef.current && !portalMenuRef.current.contains(e.target as Node)) {
        setIsPortalMenuOpen(false);
      }
      if (warehouseMenuRef.current && !warehouseMenuRef.current.contains(e.target as Node)) {
        setIsWarehouseMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeWarehouse =
    warehouses.find((w) => w.id === selectedWarehouseId) ||
    warehouses[0] || {
      id: 'wh-central-amd',
      name: 'Central Warehouse Hub',
      code: 'WH-AMD-01',
      city: 'Ahmedabad',
    };

  const handleNavigatePortal = (path: string) => {
    setIsPortalMenuOpen(false);
    window.location.href = path;
  };

  const handleLogout = () => {
    authService.logoutWarehouse();
    window.location.href = '/';
  };

  return (
    <header className="bg-[#1E293B] border-b border-slate-700/80 text-white sticky top-0 z-40 shadow-xs">
      <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Brand Identifier & Central Warehouse Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            onClick={() => (window.location.href = '/')}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="Go to Home / Portal Selection"
          >
            <RichieRichLogo size="sm" />
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-wider uppercase text-white group-hover:text-amber-400 transition-colors">
                  RICHIE RICH
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase font-mono">
                  SUPPLY HUB
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono -mt-0.5">Central Logistics 24x7</p>
            </div>
          </div>

          {/* Centralized Warehouse Facility Switcher Dropdown */}
          <div className="relative" ref={warehouseMenuRef}>
            <button
              type="button"
              onClick={() => setIsWarehouseMenuOpen(!isWarehouseMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="max-w-[120px] sm:max-w-[180px] truncate">{activeWarehouse.name}</span>
              <span className="text-[10px] font-mono text-slate-400 hidden md:inline">({activeWarehouse.code})</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {isWarehouseMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-[#1E293B] border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-xs animate-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Active Facilities & Hubs
                </div>
                <div className="space-y-1 mt-1">
                  {warehouses.map((wh) => (
                    <button
                      type="button"
                      key={wh.id}
                      onClick={() => {
                        if (onSelectWarehouse) onSelectWarehouse(wh.id);
                        setIsWarehouseMenuOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-colors flex items-center justify-between cursor-pointer ${
                        wh.id === activeWarehouse.id
                          ? 'bg-amber-600 text-white font-bold'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{wh.name}</div>
                        <div className="text-[10px] text-slate-300/80 font-mono">
                          {wh.code} • {wh.city}
                        </div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900/50 border border-slate-700">
                        {wh.type === 'central_hub' ? 'Master Hub' : 'Depot'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Universal Fast Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search SKU, item name, batch code, transfer..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Status Badges, Layout Switcher, Portals & Profile Logout */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Status Badges: Low Stock */}
          {lowStockCount > 0 && (
            <div
              title={`${lowStockCount} items below replenishment threshold`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold shrink-0"
            >
              <div className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              <span className="hidden sm:inline">{lowStockCount} Low Stock</span>
              <span className="sm:hidden">{lowStockCount}</span>
            </div>
          )}

          {/* In-Transit Count Chip */}
          {inTransitCount > 0 && (
            <div
              title={`${inTransitCount} stock dispatches currently in transit`}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-bold shrink-0"
            >
              <Truck className="w-3 h-3 text-amber-400" />
              <span>{inTransitCount} In-Transit</span>
            </div>
          )}

          {/* Barcode Scanner Shortcut */}
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              title="Scan Barcode / QR Code"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Scan className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Scanner</span>
            </button>
          )}

          {/* Layout Mode Switcher Toggle (Modern / Classic) */}
          <button
            type="button"
            onClick={onToggleLayoutMode}
            title={`Switch to ${layoutMode === 'modern' ? 'Classic UI' : 'Modern Workspace UI'}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{layoutMode === 'modern' ? 'Modern UI' : 'Classic UI'}</span>
          </button>

          {/* Portal Shortcuts Dropdown */}
          <div className="relative" ref={portalMenuRef}>
            <button
              type="button"
              onClick={() => setIsPortalMenuOpen(!isPortalMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Portals</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isPortalMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#1E293B] border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-xs animate-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Switch Operational Portal
                </div>
                <div className="space-y-1 mt-1">
                  <button
                    type="button"
                    onClick={() => handleNavigatePortal('/admin')}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 font-medium cursor-pointer transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>Master Admin Dashboard</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigatePortal('/store-admin')}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 font-medium cursor-pointer transition-colors"
                  >
                    <Store className="w-3.5 h-3.5 text-amber-400" />
                    <span>Store Admin Portal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigatePortal('/pos')}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 font-medium cursor-pointer transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                    <span>POS Counter Terminal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigatePortal('/customer')}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 font-medium cursor-pointer transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Customer Ordering App</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Logout */}
          <button
            type="button"
            onClick={handleLogout}
            title="Log Out of Central Warehouse"
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
