import React, { useState } from 'react';
import {
  Store,
  Building2,
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  MapPin,
  Phone,
} from 'lucide-react';
import { storage } from '../../services/storage';
import { authService } from '../../services/auth';
import { soundEffects } from '../../services/audio';
import { RichieRichLogo } from '../common/RichieRichLogo';

interface StoreAdminLoginProps {
  onLoginSuccess: (storeId?: string) => void;
  onBackToLanding?: () => void;
}

export const StoreAdminLogin: React.FC<StoreAdminLoginProps> = ({
  onLoginSuccess,
  onBackToLanding,
}) => {
  const stores = storage.getStores();
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || 'bopal');
  const [username, setUsername] = useState('admin_bopal');
  const [password, setPassword] = useState('RRbopal');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedStoreObj = stores.find((s) => s.id === selectedStoreId);

  const handleStoreChange = (newStoreId: string) => {
    setSelectedStoreId(newStoreId);
    setError(null);
    // Autofill default credential suggestions for smooth admin access
    if (newStoreId === 'bopal') {
      setUsername('admin_bopal');
      setPassword('RRbopal');
    } else if (newStoreId === 'gota') {
      setUsername('admin_gota');
      setPassword('RRgota');
    } else if (newStoreId === 'sindhubhavan') {
      setUsername('admin_sindhubhavan');
      setPassword('RRsindhubhavan');
    } else {
      setUsername(`admin_${newStoreId}`);
      setPassword(`RR${newStoreId}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const auth = authService.loginStoreAdmin(selectedStoreId, username, password);
      setIsLoading(false);

      if (auth.success && auth.session?.storeId) {
        soundEffects.playSuccessChime();
        onLoginSuccess(auth.session.storeId);
      } else {
        soundEffects.playErrorBuzzer();
        setError(auth.error || 'Invalid Store, Username, or Password. Please check your credentials.');
      }
    }, 250);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] p-7 text-white text-center relative overflow-hidden">
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1 border border-slate-700"
              title="Return to Portal Selection"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-3">
              <RichieRichLogo size="lg" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-wider text-white">RICHIE RICH</h2>
            <p className="text-xs text-amber-300 font-semibold mt-0.5 tracking-tight">
              Pan | Coffee | Essentials | 24x7
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2.5 rounded-full bg-slate-800 border border-slate-700 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5" />
              <span>Store Admin Outlet Finance</span>
            </div>
            <p className="text-xs text-slate-300 mt-2 font-medium">
              Select your store branch and enter manager credentials to access sales credits, expenses, and ledger statements.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Step 1: Store Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>1. Select Store Outlet</span>
              <span className="text-[10px] text-amber-600 font-bold lowercase">Required</span>
            </label>
            <div className="relative">
              <select
                value={selectedStoreId}
                onChange={(e) => handleStoreChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-xs font-bold text-slate-900 transition-colors focus:outline-hidden shadow-2xs cursor-pointer"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} — {store.area}
                  </option>
                ))}
              </select>
            </div>
            {selectedStoreObj && (
              <div className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="truncate">{selectedStoreObj.address}</span>
                </span>
                <span className="font-mono text-amber-800 shrink-0 font-semibold">{selectedStoreObj.phone}</span>
              </div>
            )}
          </div>

          {/* Step 2: Username */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Store Admin Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. admin_bopal"
                required
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-hidden"
              />
            </div>
          </div>

          {/* Step 3: Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              3. Store Admin Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter password"
                required
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl pl-10 pr-10 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Demo Credentials helper */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Default Store Credentials:</span>
            </div>
            <div className="font-mono text-[10px] text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => handleStoreChange('bopal')}
                className="text-left p-1 rounded-md bg-white border border-slate-200 hover:border-amber-400 cursor-pointer"
              >
                <div className="font-bold text-amber-700">Bopal</div>
                <div>admin_bopal</div>
              </button>
              <button
                type="button"
                onClick={() => handleStoreChange('gota')}
                className="text-left p-1 rounded-md bg-white border border-slate-200 hover:border-amber-400 cursor-pointer"
              >
                <div className="font-bold text-amber-700">Gota</div>
                <div>admin_gota</div>
              </button>
              <button
                type="button"
                onClick={() => handleStoreChange('sindhubhavan')}
                className="text-left p-1 rounded-md bg-white border border-slate-200 hover:border-amber-400 cursor-pointer"
              >
                <div className="font-bold text-amber-700">Sindhu Bh.</div>
                <div>admin_sindhubhavan</div>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating Store...</span>
              </span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-amber-200" />
                <span>Access Store Admin Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
