import React, { useState } from 'react';
import { ShoppingBag, Phone, User, Crown, ArrowRight, AlertCircle, Sparkles, Gift, ShieldCheck } from 'lucide-react';
import { authService } from '../../services/auth';
import { Customer } from '../../types';
import { RichieRichLogo } from '../common/RichieRichLogo';

interface CustomerLoginProps {
  onLoginSuccess: (customer: Customer) => void;
}

export const CustomerLogin: React.FC<CustomerLoginProps> = ({ onLoginSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= 10) {
      setPhoneNumber(raw);
      if (error) setError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = authService.loginCustomer(cleanPhone, customerName);
      setIsLoading(false);

      if (result.success && result.customer) {
        onLoginSuccess(result.customer);
      } else {
        setError(result.error || 'Unable to log in with this mobile number. Please try again.');
      }
    }, 200);
  };

  const handleQuickSelect = (phone: string, name: string) => {
    setPhoneNumber(phone);
    setCustomerName(name);
    setError(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] p-7 text-white text-center relative overflow-hidden">
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
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Customer Ordering Portal</span>
            </div>
            <p className="text-xs text-slate-300 mt-2 font-medium">
              Log in with your 10-digit mobile number to access luxury paans, cafe brews, and earn loyalty rewards.
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

          {/* 10-Digit Mobile Number Field (Customer User ID) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Customer Mobile Number (User ID)
              </label>
              <span className="text-[11px] font-mono font-bold text-amber-600">
                {phoneNumber.length}/10
              </span>
            </div>

            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-xs">
                🇮🇳 +91
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="Enter 10-digit number (e.g. 9820199882)"
                autoFocus
                required
                pattern="[0-9]{10}"
                maxLength={10}
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl pl-16 pr-4 py-2.5 text-sm font-semibold font-mono text-slate-900 placeholder:text-slate-400 placeholder:font-sans transition-colors focus:outline-hidden"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Your 10-digit mobile number serves as your unique customer account ID.
            </p>
          </div>

          {/* Optional Name for First Time Visitors */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Your Name <span className="text-slate-400 font-normal normal-case">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Rajesh Sharma"
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-hidden"
              />
            </div>
          </div>

          {/* Welcome Bonus Callout */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2.5">
            <Gift className="w-5 h-5 text-amber-700 shrink-0" />
            <p className="text-[11px] text-amber-900 leading-tight">
              <strong className="font-bold">Instant Reward:</strong> New customers automatically receive <strong className="font-bold">100 Welcome Points (₹100 value)</strong>!
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || phoneNumber.length !== 10}
            className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ShoppingBag className="w-4 h-4 text-amber-200" />
                <span>Start Ordering</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Quick Demo Customer Profiles */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
              Quick Test Accounts (Click to autofill)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSelect('9820199882', 'Rajesh Sharma')}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-amber-50 hover:border-amber-200 border border-slate-200 text-xs transition-colors cursor-pointer"
              >
                <div className="font-bold text-slate-800">Rajesh Sharma</div>
                <div className="text-[10px] text-amber-700 font-mono">9820199882 (Platinum)</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('9876543210', 'Pooja Mehta')}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-amber-50 hover:border-amber-200 border border-slate-200 text-xs transition-colors cursor-pointer"
              >
                <div className="font-bold text-slate-800">Pooja Mehta</div>
                <div className="text-[10px] text-amber-700 font-mono">9876543210 (Gold)</div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
