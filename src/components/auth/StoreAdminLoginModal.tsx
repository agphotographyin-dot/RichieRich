import React, { useState } from 'react';
import {
  Building2,
  Store,
  KeyRound,
  User,
  Lock,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  X,
  Sparkles,
} from 'lucide-react';
import { StoreLocation } from '../../types';
import { storage } from '../../services/storage';
import { authService } from '../../services/auth';
import { soundEffects } from '../../services/audio';

interface StoreAdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (storeId: string) => void;
}

export const StoreAdminLoginModal: React.FC<StoreAdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const stores = storage.getStores();
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || 'bopal');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const auth = authService.loginStoreAdmin(selectedStoreId, username, password);
      setIsLoading(false);

      if (auth.success && auth.session?.storeId) {
        soundEffects.playSuccessChime();
        onSuccess(auth.session.storeId);
      } else {
        soundEffects.playErrorBuzzer();
        setError(auth.error || 'Invalid Store, Username, or Password. Please check your credentials.');
      }
    }, 250);
  };

  const selectedStoreObj = stores.find((s) => s.id === selectedStoreId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-[#1E293B] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                Store Portal
              </span>
              <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
                Store Admin Login
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Select your assigned store branch and log in to manage store finances, sales credits, and expenses.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Select Store */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
              <span>1. Select Store Outlet</span>
              <span className="text-[10px] text-amber-600 font-bold lowercase">Required</span>
            </label>
            <div className="relative">
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-900 font-bold focus:outline-hidden focus:bg-white focus:border-amber-500 shadow-2xs"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} ({store.area})
                  </option>
                ))}
              </select>
            </div>
            {selectedStoreObj && (
              <p className="text-[11px] text-slate-500 mt-1">
                📍 {selectedStoreObj.address} • {selectedStoreObj.phone}
              </p>
            )}
          </div>

          {/* STEP 2: Username */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
              2. Store Admin Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                placeholder="e.g. admin_bopal or admin_gota"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-hidden focus:bg-white focus:border-amber-500 shadow-2xs"
              />
            </div>
          </div>

          {/* STEP 3: Password */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
              3. Store Admin Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                placeholder="Enter password (e.g. RRbopal)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-hidden focus:bg-white focus:border-amber-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Quick Demo Help Badge */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Default Store Logins (Managed in Admin Dashboard):</span>
            </div>
            <div className="font-mono text-[10px] text-slate-600 space-y-0.5">
              <div>• Bopal: <strong className="text-amber-600">admin_bopal</strong> / <strong className="text-slate-900">RRbopal</strong></div>
              <div>• Gota: <strong className="text-amber-600">admin_gota</strong> / <strong className="text-slate-900">RRgota</strong></div>
              <div>• Sindhu Bhavan: <strong className="text-amber-600">admin_sindhubhavan</strong> / <strong className="text-slate-900">RRsindhubhavan</strong></div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-200" />
                  <span>Access Store Admin Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
