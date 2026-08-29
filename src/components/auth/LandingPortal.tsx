import React, { useState } from 'react';
import {
  Crown,
  Shield,
  CreditCard,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Lock,
  Boxes,
  Store,
  Receipt,
  Truck,
  CheckCircle2,
  KeyRound,
  PackageCheck,
  Building2,
  FileSpreadsheet,
  AlertTriangle,
  IndianRupee,
  TrendingDown,
  Layers,
  CircleDot,
} from 'lucide-react';
import { RichieRichLogo } from '../common/RichieRichLogo';

interface LandingPortalProps {
  onSelectAdmin: () => void;
  onSelectStoreAdmin: (storeId?: string) => void;
  onSelectPOS: () => void;
  onSelectCustomer: () => void;
  onSelectWarehouse: () => void;
  isAdminAuthenticated: boolean;
  isStoreAdminAuthenticated: boolean;
  isPOSAuthenticated: boolean;
  isWarehouseAuthenticated: boolean;
}

export const LandingPortal: React.FC<LandingPortalProps> = ({
  onSelectAdmin,
  onSelectStoreAdmin,
  onSelectPOS,
  onSelectCustomer,
  onSelectWarehouse,
  isAdminAuthenticated,
  isStoreAdminAuthenticated,
  isPOSAuthenticated,
  isWarehouseAuthenticated,
}) => {
  const handleStoreAdminClick = () => {
    onSelectStoreAdmin();
  };

  return (
    <div className="relative min-h-[90vh] flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-80 bg-gradient-to-b from-amber-500/10 via-slate-800/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Brand Hero Header */}
      <div className="text-center space-y-4 mb-8 pt-2">
        {/* Brand Crest Pill Badge */}
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/95 backdrop-blur-xs text-slate-900 border border-slate-200 shadow-sm">
          <RichieRichLogo size="sm" />
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-black tracking-wider text-xs uppercase text-slate-900">RICHIE RICH</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
            </div>
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">
              Pan | Coffee | Essentials | 24x7
            </p>
          </div>
        </div>

        {/* Hero Title */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900">
          Enterprise Management, <span className="text-amber-600">Warehouse</span> & <span className="text-slate-900 underline decoration-amber-500 decoration-4 underline-offset-4">POS Billing</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-3xl mx-auto font-medium">
          Unified operations across central multi-hub inventory, store-level financial accounting, real-time counter POS billing, and executive analytics.
        </p>
      </div>

      {/* 4 Core Unified Portals Grid: Warehouse, Admin, Store Admin, and POS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 w-full mb-8">
        {/* ========================================================================= */}
        {/* OPTION 1: WAREHOUSE & SUPPLY CHAIN */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 hover:border-amber-500 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group">
          <div className="bg-[#1E293B] p-5 text-white relative">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center shadow-xs">
                <Boxes className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                Supply Chain
              </span>
            </div>
            <div className="mt-3">
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>Warehouse Portal</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                Central stock, POs, supplier ledgers, batch expiry, and store dispatches.
              </p>
            </div>
          </div>

          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between bg-white">
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-semibold">
                  <Building2 className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">Multi-Hub</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-semibold">
                  <Truck className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">Dispatches</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Warehouse Login:</span>
                  <span className="text-[10px] font-mono text-slate-500">/warehouse</span>
                </div>
                <div className="font-mono text-[10px] text-slate-700 mt-0.5">
                  ID: <strong className="text-amber-600">ADMIN</strong> • Pass: <strong className="text-slate-900">RRwarehouse</strong>
                </div>
              </div>
            </div>

            <div className="pt-2">
              {isWarehouseAuthenticated ? (
                <button
                  type="button"
                  onClick={onSelectWarehouse}
                  className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Enter Warehouse (Active)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSelectWarehouse}
                  className="w-full py-2.5 px-3 bg-[#1E293B] hover:bg-slate-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Login to Warehouse</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OPTION 2: MASTER ADMIN DASHBOARD */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 hover:border-amber-500 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group">
          <div className="bg-[#1E293B] p-5 text-white relative">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center shadow-xs">
                <Shield className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                Executive
              </span>
            </div>
            <div className="mt-3">
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>Master Admin</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                Store Admin logins, staff PINs, revenue analytics, catalog & backups.
              </p>
            </div>
          </div>

          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between bg-white">
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-semibold">
                  <Store className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">Multi-Store</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-semibold">
                  <Receipt className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">GST Analytics</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Admin Credentials:</span>
                  <span className="text-[10px] font-mono text-slate-500">/admin</span>
                </div>
                <div className="font-mono text-[10px] text-slate-700 mt-0.5">
                  User: <strong className="text-amber-600">ADMIN</strong> • Pass: <strong className="text-slate-900">RRadmin</strong>
                </div>
              </div>
            </div>

            <div className="pt-2">
              {isAdminAuthenticated ? (
                <button
                  type="button"
                  onClick={onSelectAdmin}
                  className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Enter Admin (Active)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSelectAdmin}
                  className="w-full py-2.5 px-3 bg-[#1E293B] hover:bg-slate-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Login to Admin</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OPTION 3: STORE ADMIN */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 hover:border-amber-500 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group">
          <div className="bg-[#1E293B] p-5 text-white relative">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center shadow-xs">
                <Store className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                Store Outlet
              </span>
            </div>
            <div className="mt-3">
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>Store Admin</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                Select Store &gt; User & Pass. Sales credits, store expenses & financial totals.
              </p>
            </div>
          </div>

          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between bg-white">
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-semibold">
                  <IndianRupee className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">Sales Credits</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-semibold">
                  <TrendingDown className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">Store Expenses</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Store Branch Login:</span>
                  <span className="text-[10px] font-mono text-slate-500">/store-admin</span>
                </div>
                <div className="font-mono text-[10px] text-slate-700 mt-0.5">
                  ID: <strong className="text-amber-600">admin_bopal</strong> • Pass: <strong className="text-slate-900">RRbopal</strong>
                </div>
              </div>
            </div>

            <div className="pt-2">
              {isStoreAdminAuthenticated ? (
                <button
                  type="button"
                  onClick={handleStoreAdminClick}
                  className="w-full py-2.5 px-3 bg-[#e17100] hover:bg-[#c66400] text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-200" />
                  <span>Enter Store Admin (Active)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStoreAdminClick}
                  className="w-full py-2.5 px-3 bg-[#e17100] hover:bg-[#c66400] text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-200" />
                  <span>Login to Store Admin</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OPTION 4: POS DESK BILLING */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 hover:border-amber-500 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group">
          <div className="bg-[#1E293B] p-5 text-white relative">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center shadow-xs">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                Counter Desk
              </span>
            </div>
            <div className="mt-3">
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>POS Dashboard</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                Rapid counter billing, pan menu, barcode scan, split cash/UPI & receipts.
              </p>
            </div>
          </div>

          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between bg-white">
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-semibold">
                  <Receipt className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">Rapid Bills</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-semibold">
                  <CreditCard className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">Cash & UPI</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>POS Credentials:</span>
                  <span className="text-[10px] font-mono text-slate-500">/pos</span>
                </div>
                <div className="font-mono text-[10px] text-slate-700 mt-0.5">
                  User: <strong className="text-amber-600">ADMIN</strong> • Pass: <strong className="text-slate-900">RRPOSadmin</strong>
                </div>
              </div>
            </div>

            <div className="pt-2">
              {isPOSAuthenticated ? (
                <button
                  type="button"
                  onClick={onSelectPOS}
                  className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Enter POS (Active)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSelectPOS}
                  className="w-full py-2.5 px-3 bg-[#1E293B] hover:bg-slate-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Login to POS</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Ordering & Loyalty Portal Card */}
      <div className="max-w-4xl mx-auto w-full">
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs hover:border-amber-500 transition-colors">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-[#1E293B] text-amber-400 flex items-center justify-center shrink-0 shadow-xs border border-slate-700">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Customer Ordering & Loyalty Portal</h3>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-md font-bold">
                  /customer
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Customers order luxury paans and check rewards using their 10-digit mobile number.
              </p>
            </div>
          </div>

          {/* Styled Pill Button */}
          <button
            type="button"
            onClick={onSelectCustomer}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#1E293B] hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <span>Open Customer Page</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
          </button>
        </div>
      </div>
    </div>
  );
};
