import React, { useState } from 'react';
import { CreditCard, Lock, User, KeyRound, Eye, EyeOff, Crown, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/auth';
import { RichieRichLogo } from '../common/RichieRichLogo';

interface POSLoginProps {
  onLoginSuccess: () => void;
  onBackToLanding?: () => void;
}

export const POSLogin: React.FC<POSLoginProps> = ({ onLoginSuccess, onBackToLanding }) => {
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
              <CreditCard className="w-3.5 h-3.5" />
              <span>POS Terminal & Billing Registers</span>
            </div>
            <p className="text-xs text-slate-300 mt-2 font-medium">
              Enter authorized POS credentials to access counter desk billing registers.
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
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-hidden uppercase"
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
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl pl-10 pr-11 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-hidden"
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
            className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <KeyRound className="w-4 h-4 text-amber-200" />
                <span>Log In to POS Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Security Notice */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            {onBackToLanding ? (
              <button
                type="button"
                onClick={onBackToLanding}
                className="text-amber-700 hover:text-amber-900 font-semibold underline cursor-pointer"
              >
                Switch to Admin Dashboard
              </button>
            ) : (
              <span />
            )}
            <p className="text-[11px] font-medium">
              Direct route: <code className="font-mono bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-0.5 rounded-md font-bold">/pos</code>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
