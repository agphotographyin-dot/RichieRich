import React, { useState } from 'react';
import {
  Boxes,
  Lock,
  UserCheck,
  Building2,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  Truck,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { authService } from '../../services/auth';
import { warehouseStorage } from '../../services/warehouseStorage';
import { WarehouseSubRole } from '../../types/warehouse';

interface WarehouseLoginProps {
  onLoginSuccess: () => void;
  onBackToLanding: () => void;
}

export const WarehouseLogin: React.FC<WarehouseLoginProps> = ({
  onLoginSuccess,
  onBackToLanding,
}) => {
  const [userId, setUserId] = useState('ADMIN');
  const [password, setPassword] = useState('RRwarehouse');
  const [subRole, setSubRole] = useState<WarehouseSubRole>(warehouseStorage.getActiveSubRole());
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = authService.loginWarehouse(userId, password, subRole);
      if (res.success) {
        warehouseStorage.setActiveSubRole(subRole);
        onLoginSuccess();
      } else {
        setError(res.error || 'Authentication failed. Please verify credentials.');
        setIsLoading(false);
      }
    }, 250);
  };

  const handleFillCredentials = (id: string, pass: string, role: WarehouseSubRole) => {
    setUserId(id);
    setPassword(pass);
    setSubRole(role);
    setError(null);
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl">
        {/* Back Button */}
        <button
          onClick={onBackToLanding}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portal Selection
        </button>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-8 py-7 text-white relative">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-amber-400 shadow-inner">
                <Boxes className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                    Central Supply Chain & Logistics
                  </span>
                  <span className="text-xs text-slate-400 font-mono">v4.2 PRO</span>
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
                  Warehouse & Inventory Portal
                </h1>
                <p className="text-xs text-slate-300 mt-0.5">
                  Multi-warehouse stock, POs, batch expiry tracking, and store transfers
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Authentication Error</p>
                  <p className="text-xs text-rose-700 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Sub-Role Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Operational Access Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { key: 'admin', label: 'Admin (Full Access)', desc: 'All privileges' },
                  { key: 'warehouse_manager', label: 'WH Manager', desc: 'Inward & Trans' },
                  { key: 'store_manager', label: 'Store Mgr', desc: 'Indents & Recv' },
                  { key: 'purchase_manager', label: 'Purchase Mgr', desc: 'POs & Bills' },
                  { key: 'accountant', label: 'Accountant', desc: 'Ledger & Outst' },
                ].map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setSubRole(r.key as WarehouseSubRole)}
                    className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                      subRole === r.key
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                    }`}
                  >
                    <div className="font-medium text-slate-900">{r.label}</div>
                    <div className="text-[10px] text-slate-500">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  User ID / Manager Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter ADMIN or WAREHOUSE"
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Secure Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-11 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Demo Credentials Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Default Warehouse Access Credentials:</span>
                <span className="text-[10px] text-indigo-600 font-semibold uppercase">Click to fill</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFillCredentials('ADMIN', 'RRwarehouse', 'admin')}
                  className="p-2 rounded-lg bg-white border border-slate-200/80 hover:border-indigo-400 text-left text-xs transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="font-semibold text-slate-800">Master Admin</div>
                    <div className="text-[11px] font-mono text-slate-500">ID: ADMIN • Pass: RRwarehouse</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFillCredentials('WAREHOUSE', 'RRwarehouse', 'warehouse_manager')}
                  className="p-2 rounded-lg bg-white border border-slate-200/80 hover:border-indigo-400 text-left text-xs transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="font-semibold text-slate-800">Warehouse Manager</div>
                    <div className="text-[11px] font-mono text-slate-500">ID: WAREHOUSE • Pass: RRwarehouse</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-md hover:shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Boxes className="w-5 h-5 text-amber-400" />
                  <span>Access Warehouse Management System</span>
                </>
              )}
            </button>
          </form>

          {/* Security Footer */}
          <div className="px-8 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>FIFO Batch Traceability & Audit Engine Active</span>
            </div>
            <span className="font-mono text-[11px]">Port 3000 SSL</span>
          </div>
        </div>
      </div>
    </div>
  );
};
