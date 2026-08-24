import React, { useState } from 'react';
import { CreditCard, Lock, User, KeyRound, Eye, EyeOff, Crown, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { authService } from '../../services/auth';

interface POSLoginProps {
  onLoginSuccess: () => void;
}

export const POSLogin: React.FC<POSLoginProps> = ({ onLoginSuccess }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const result = authService.loginPOS(userId, password);
      setIsLoading(false);

      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.error || 'Invalid credentials. Please try again.');
      }
    }, 250);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 p-7 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 text-amber-400 flex items-center justify-center mb-3 shadow-lg">
              <Crown className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">Richie Rich Pan House</h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-emerald-950/90 border border-emerald-700/60 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Point of Sale (POS) Terminal</span>
            </div>
            <p className="text-xs text-emerald-100 mt-2 font-medium">
              Enter authorized POS Terminal credentials to initialize counter desk billing registers.
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

          {/* User ID Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              POS Terminal User ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="ADMIN"
                autoFocus
                required
                className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-hidden uppercase"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              POS Terminal Password
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
                placeholder="••••••••"
                required
                className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl pl-10 pr-11 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !userId || !password}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <KeyRound className="w-4 h-4 text-emerald-200" />
                <span>Log In to POS Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Security Notice */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 font-medium">
              Direct access route: <code className="font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-md font-bold">/pos</code>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
