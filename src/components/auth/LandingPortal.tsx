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
} from 'lucide-react';
import { authService } from '../../services/auth';

interface LandingPortalProps {
  onSelectAdmin: () => void;
  onSelectPOS: () => void;
  onSelectCustomer: () => void;
  onSelectWarehouse: () => void;
  isAdminAuthenticated: boolean;
  isPOSAuthenticated: boolean;
  isWarehouseAuthenticated: boolean;
}

export const LandingPortal: React.FC<LandingPortalProps> = ({
  onSelectAdmin,
  onSelectPOS,
  onSelectCustomer,
  onSelectWarehouse,
  isAdminAuthenticated,
  isPOSAuthenticated,
  isWarehouseAuthenticated,
}) => {
  return (
    <div className="min-h-[88vh] flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Brand Hero Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-amber-400 border border-slate-700 shadow-sm text-xs font-bold uppercase tracking-widest">
          <Crown className="w-4 h-4 text-amber-400" />
          <span>Richie Rich Pan House & Luxury Lounge</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          Enterprise Management, Warehouse & Billing System
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-3xl mx-auto">
          Select your authorized terminal below to access Central Warehouse Supply Chain, Master Admin Management, or Counter POS Billing.
        </p>
      </div>

      {/* 3 Core Operational Portals: Warehouse, Admin, and POS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-6 w-full mb-8">
        {/* ========================================================================= */}
        {/* OPTION 1: WAREHOUSE & SUPPLY CHAIN DASHBOARD */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 hover:border-indigo-500/60 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col justify-between group">
          <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="relative z-10 flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-indigo-900/60 border border-indigo-700/60 text-amber-400 flex items-center justify-center shadow-md">
                <Boxes className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-900/80 border border-indigo-700/80 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                Supply Chain & POs
              </span>
            </div>
            <div className="mt-4">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Warehouse Portal</span>
              </h2>
              <p className="text-xs text-indigo-200 mt-1 leading-relaxed">
                Central stock, POs, GRN bills, supplier ledgers, batch expiry, and store dispatch transfers.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between bg-white">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50/60 border border-indigo-100 text-indigo-950 font-semibold">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">Multi-Warehouse</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50/60 border border-indigo-100 text-indigo-950 font-semibold">
                  <Truck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">Stock In Transit</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50/60 border border-indigo-100 text-indigo-950 font-semibold">
                  <PackageCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">Batch Expiry</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50/60 border border-indigo-100 text-indigo-950 font-semibold">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">Supplier Ledger</span>
                </div>
              </div>

              {/* Login Credentials reminder */}
              <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Warehouse Login:</span>
                  <span className="text-[10px] font-mono text-indigo-600">/warehouse</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-700">
                  <span>ID: <strong className="text-slate-900">ADMIN</strong></span>
                  <span>•</span>
                  <span>Pass: <strong className="text-slate-900">RRwarehouse</strong></span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              {isWarehouseAuthenticated ? (
                <button
                  type="button"
                  onClick={onSelectWarehouse}
                  className="w-full py-3 px-4 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Enter Warehouse (Active)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSelectWarehouse}
                  className="w-full py-3 px-4 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:bg-indigo-950"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Login to Warehouse</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OPTION 2: ADMIN DASHBOARD */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 hover:border-slate-400 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col justify-between group">
          <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
            <div className="relative z-10 flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/90 border border-slate-700 text-amber-400 flex items-center justify-center shadow-md">
                <Shield className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                Executive Control
              </span>
            </div>
            <div className="mt-4">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Admin Dashboard</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Staff & counter PINs, revenue & GST tax analytics, customer orders, promotions & automated backups.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between bg-white">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 font-semibold">
                  <Boxes className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Store Catalog</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 font-semibold">
                  <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Multi-Store Setup</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 font-semibold">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Staff PINs</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 font-semibold">
                  <Receipt className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">GST Analytics</span>
                </div>
              </div>

              {/* Login Credentials reminder */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Admin Credentials:</span>
                  <span className="text-[10px] font-mono text-slate-500">/admin</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-700">
                  <span>User: <strong className="text-slate-900">ADMIN</strong></span>
                  <span>•</span>
                  <span>Pass: <strong className="text-slate-900">RRadmin</strong></span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              {isAdminAuthenticated ? (
                <button
                  type="button"
                  onClick={onSelectAdmin}
                  className="w-full py-3 px-4 bg-[#1E293B] hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Enter Admin (Active)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSelectAdmin}
                  className="w-full py-3 px-4 bg-[#1E293B] hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:bg-slate-900"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Login to Admin</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OPTION 3: POS DASHBOARD (POINT OF SALE TERMINAL) */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 hover:border-emerald-500/60 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col justify-between group">
          <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />
            <div className="relative z-10 flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/90 border border-emerald-700/70 text-emerald-300 flex items-center justify-center shadow-md">
                <CreditCard className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-700/70 text-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                Counter Desk
              </span>
            </div>
            <div className="mt-4">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>POS Dashboard</span>
              </h2>
              <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
                Fast counter billing registers, quick-touch pan menu, barcode scanner sync, split cash/UPI & thermal receipts.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between bg-white">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-900 font-semibold">
                  <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Rapid Billing</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-900 font-semibold">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Cash & UPI QR</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-900 font-semibold">
                  <Store className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Store Selection</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-900 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Custom Paan Bar</span>
                </div>
              </div>

              {/* Login Credentials reminder */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 text-xs text-emerald-900 space-y-1">
                <div className="flex items-center justify-between font-bold text-emerald-950">
                  <span>POS Credentials:</span>
                  <span className="text-[10px] font-mono text-emerald-700">/pos</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-950">
                  <span>User: <strong className="text-emerald-950">ADMIN</strong></span>
                  <span>•</span>
                  <span>Pass: <strong className="text-emerald-950">RRPOSadmin</strong></span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              {isPOSAuthenticated ? (
                <button
                  type="button"
                  onClick={onSelectPOS}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Enter POS Terminal (Active)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSelectPOS}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:bg-emerald-700"
                >
                  <KeyRound className="w-4 h-4 text-emerald-200" />
                  <span>Login to POS</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Distinct & Separate Customer Portal Section */}
      <div className="max-w-4xl mx-auto w-full">
        <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-50 via-slate-50 to-purple-50 rounded-2xl border border-purple-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <ShoppingBag className="w-6 h-6 text-purple-100" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h3 className="text-sm font-bold text-purple-950">Customer Ordering & Loyalty Portal</h3>
                <span className="text-[10px] font-mono bg-purple-200/80 text-purple-800 px-2 py-0.5 rounded-md font-bold">
                  /customer
                </span>
              </div>
              <p className="text-xs text-purple-900/80 mt-0.5">
                Kept strictly separate from staff management. Customers order from the luxury menu using their 10-digit mobile number.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSelectCustomer}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <span>Open Customer Page</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
