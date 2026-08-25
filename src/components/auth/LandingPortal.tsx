import React, { useState } from 'react';
import {
  Crown,
  Shield,
  CreditCard,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Receipt,
  Store,
  Boxes,
  Zap,
} from 'lucide-react';
import { authService } from '../../services/auth';

interface LandingPortalProps {
  onSelectAdmin: () => void;
  onSelectPOS: () => void;
  onSelectCustomer: () => void;
  isAdminAuthenticated: boolean;
  isPOSAuthenticated: boolean;
}

export const LandingPortal: React.FC<LandingPortalProps> = ({
  onSelectAdmin,
  onSelectPOS,
  onSelectCustomer,
  isAdminAuthenticated,
  isPOSAuthenticated,
}) => {
  // Direct inline login states if user wants to log in right from the landing card
  const [selectedPortal, setSelectedPortal] = useState<'admin' | 'pos' | null>(null);

  // Admin inline form state
  const [adminUserId, setAdminUserId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminShowPass, setAdminShowPass] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  // POS inline form state
  const [posUserId, setPosUserId] = useState('');
  const [posPassword, setPosPassword] = useState('');
  const [posShowPass, setPosShowPass] = useState(false);
  const [posError, setPosError] = useState<string | null>(null);
  const [posLoading, setPosLoading] = useState(false);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminLoading(true);

    setTimeout(() => {
      const res = authService.loginAdmin(adminUserId, adminPassword);
      setAdminLoading(false);
      if (res.success) {
        onSelectAdmin();
      } else {
        setAdminError(res.error || 'Invalid Admin credentials.');
      }
    }, 200);
  };

  const handlePOSSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPosError(null);
    setPosLoading(true);

    setTimeout(() => {
      const res = authService.loginPOS(posUserId, posPassword);
      setPosLoading(false);
      if (res.success) {
        onSelectPOS();
      } else {
        setPosError(res.error || 'Invalid POS credentials.');
      }
    }, 200);
  };

  return (
    <div className="min-h-[88vh] flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Brand Hero Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-amber-400 border border-slate-700 shadow-sm text-xs font-bold uppercase tracking-widest">
          <Crown className="w-4 h-4 text-amber-400" />
          <span>Richie Rich Pan House</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          Management & Billing Portal Login
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
          Select your authorized terminal below to authenticate and access live billing registers or store management.
        </p>
      </div>

      {/* Two Primary Options: Admin Dashboard & POS Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* OPTION 1: ADMIN DASHBOARD */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 hover:border-slate-400 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col justify-between group">
          {/* Card Top Header Banner */}
          <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] p-6 sm:p-7 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
            <div className="relative z-10 flex items-start justify-between">
              <div className="w-13 h-13 rounded-2xl bg-slate-800/90 border border-slate-700 text-amber-400 flex items-center justify-center shadow-md">
                <Shield className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                Management Portal
              </span>
            </div>
            <div className="mt-4">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Admin Dashboard</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                Master inventory control, staff & counter PINs, sales analytics, orders, loyalty programs & automated backups.
              </p>
            </div>
          </div>

          {/* Card Body & Action */}
          <div className="p-6 sm:p-7 space-y-5 flex-1 flex flex-col justify-between bg-white">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 font-semibold">
                  <Boxes className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Master Inventory</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 font-semibold">
                  <Store className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Multi-Outlet Setup</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 font-semibold">
                  <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Staff & POS PINs</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 font-semibold">
                  <Receipt className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Revenue & Tax (GST)</span>
                </div>
              </div>

              {/* Login Credentials reminder */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Admin Credentials:</span>
                  <span className="text-[11px] font-mono text-slate-500">Route: /admin</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span>User: <strong className="text-slate-900">ADMIN</strong></span>
                  <span>•</span>
                  <span>Pass: <strong className="text-slate-900">RRadmin</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Button / Action */}
            <div className="pt-2">
              {isAdminAuthenticated ? (
                <button
                  type="button"
                  onClick={onSelectAdmin}
                  className="w-full py-3 px-4 bg-[#1E293B] hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Enter Admin Dashboard (Active)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSelectAdmin}
                  className="w-full py-3.5 px-4 bg-[#1E293B] hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:bg-slate-900"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Login to Admin Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OPTION 2: POS DASHBOARD (POINT OF SALE TERMINAL) */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 hover:border-emerald-500/60 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col justify-between group">
          {/* Card Top Header Banner */}
          <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 p-6 sm:p-7 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />
            <div className="relative z-10 flex items-start justify-between">
              <div className="w-13 h-13 rounded-2xl bg-emerald-950/90 border border-emerald-700/70 text-emerald-300 flex items-center justify-center shadow-md">
                <CreditCard className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-700/70 text-emerald-200 text-[11px] font-bold uppercase tracking-wider">
                Counter Terminal
              </span>
            </div>
            <div className="mt-4">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>POS Dashboard</span>
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 mt-1.5 leading-relaxed">
                Fast counter billing registers, quick-touch pan menu, barcode scanner sync, split cash/UPI & instant thermal receipts.
              </p>
            </div>
          </div>

          {/* Card Body & Action */}
          <div className="p-6 sm:p-7 space-y-5 flex-1 flex flex-col justify-between bg-white">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-900 font-semibold">
                  <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Rapid Billing Desk</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-900 font-semibold">
                  <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cash & UPI QR</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-900 font-semibold">
                  <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Counter Selection</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-900 font-semibold">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Custom Paan Bar</span>
                </div>
              </div>

              {/* Login Credentials reminder */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 text-xs text-emerald-900 space-y-1">
                <div className="flex items-center justify-between font-bold text-emerald-950">
                  <span>POS Credentials:</span>
                  <span className="text-[11px] font-mono text-emerald-700">Route: /pos</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span>User: <strong className="text-emerald-950">ADMIN</strong></span>
                  <span>•</span>
                  <span>Pass: <strong className="text-emerald-950">RRPOSadmin</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Button / Action */}
            <div className="pt-2">
              {isPOSAuthenticated ? (
                <button
                  type="button"
                  onClick={onSelectPOS}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Enter POS Terminal (Active)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSelectPOS}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:bg-emerald-700"
                >
                  <KeyRound className="w-4 h-4 text-emerald-200" />
                  <span>Login to POS Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Distinct & Separate Customer Portal Section */}
      <div className="mt-10 max-w-4xl mx-auto w-full">
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
