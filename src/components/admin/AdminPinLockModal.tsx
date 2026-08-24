import React, { useState } from 'react';
import { Shield, KeyRound, Lock, ArrowRight, RefreshCw, X, AlertCircle } from 'lucide-react';
import { soundEffects } from '../../services/audio';

interface AdminPinLockModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminPinLockModal: React.FC<AdminPinLockModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setErrorMsg(null);
      soundEffects.playScanBeep();
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg(null);
  };

  const handleFillDemo = () => {
    setPin('8899');
    setErrorMsg(null);
  };

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) {
      setErrorMsg('Please enter Admin Master PIN.');
      soundEffects.playWarningChime();
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      // Master admin PINs: 8899, 1234, 0000
      if (pin === '8899' || pin === '1234' || pin === '0000') {
        soundEffects.playSuccessChime();
        setIsVerifying(false);
        setPin('');
        setErrorMsg(null);
        onSuccess();
      } else {
        soundEffects.playWarningChime();
        setIsVerifying(false);
        setErrorMsg('Invalid Master PIN. (Default: 8899 or 1234)');
      }
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-slate-800 relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center mb-3 shadow-md border border-slate-700">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Admin Portal Authorization</h3>
          <p className="text-xs text-slate-500 mt-1">
            Enter Owner / Master PIN to manage chain stores, inventory & security.
          </p>
        </div>

        {/* Demo button */}
        <div className="flex justify-center mb-4">
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-full border border-amber-200 transition-colors cursor-pointer"
          >
            Use Master Demo PIN: 8899
          </button>
        </div>

        {/* PIN Display */}
        <div className="mb-4">
          <div className="flex items-center justify-center bg-slate-950 rounded-xl py-3 px-4 shadow-inner border border-slate-800">
            <div className="flex gap-3 items-center">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-3.5 h-3.5 rounded-full transition-all ${
                    pin.length > index
                      ? 'bg-amber-400 scale-110 shadow-sm shadow-amber-400/50'
                      : 'bg-slate-700 border border-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 font-semibold text-center mt-2 flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errorMsg}
            </p>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeypadPress(digit)}
              className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-lg transition-colors cursor-pointer flex items-center justify-center shadow-xs"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-11 rounded-xl bg-slate-100 hover:bg-red-50 text-red-600 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center"
          >
            CLR
          </button>
          <button
            type="button"
            onClick={() => handleKeypadPress('0')}
            className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-lg transition-colors cursor-pointer flex items-center justify-center shadow-xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center"
          >
            ⌫
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleVerify()}
          disabled={isVerifying}
          className="w-full py-3 px-4 rounded-xl bg-[#1E293B] hover:bg-slate-900 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isVerifying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Verifying PIN...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Unlock Admin Panel</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
