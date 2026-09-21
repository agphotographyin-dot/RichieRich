import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldAlert, X, CheckCircle2 } from 'lucide-react';
import { authService } from '../../services/auth';
import { soundEffects } from '../../services/audio';

interface WarehousePasswordConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorized: () => void;
  title?: string;
  description?: string;
  actionButtonText?: string;
  actionButtonVariant?: 'emerald' | 'rose' | 'amber';
}

export const WarehousePasswordConfirmModal: React.FC<WarehousePasswordConfirmModalProps> = ({
  isOpen,
  onClose,
  onAuthorized,
  title = 'Warehouse Authorization Required',
  description = 'Please enter your Warehouse Manager or Admin password to authorize this action.',
  actionButtonText = 'Verify & Proceed',
  actionButtonVariant = 'emerald',
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isValid = authService.validateWarehousePassword(password);
    if (!isValid) {
      soundEffects.playScanBeep();
      setError('Invalid Warehouse Password. Access Denied. (Default: RRwarehouse)');
      return;
    }

    soundEffects.playClick();
    setPassword('');
    setError(null);
    onAuthorized();
  };

  const buttonColors = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    rose: 'bg-rose-600 hover:bg-rose-700 text-white',
    amber: 'bg-amber-600 hover:bg-amber-700 text-white',
  }[actionButtonVariant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500">Security verification check</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{description}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Warehouse Login Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter warehouse password"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-[11px] font-semibold text-rose-600 animate-in fade-in duration-150">
                {error}
              </p>
            )}
            <p className="text-[10px] text-slate-400">
              Authorized roles: Warehouse Manager or System Administrator (Default: <code className="font-mono text-slate-600 bg-slate-100 px-1 py-0.5 rounded">RRwarehouse</code>)
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer ${buttonColors}`}
            >
              {actionButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
