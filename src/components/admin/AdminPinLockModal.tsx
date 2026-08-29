import React, { useState, useEffect } from 'react';
import { Shield, KeyRound, Lock, ArrowRight, RefreshCw, X, AlertCircle, Clock } from 'lucide-react';
import { soundEffects } from '../../services/audio';

interface AdminPinLockModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const MAX_FAILED_ATTEMPTS = 4;
const LOCKOUT_DURATION_SECONDS = 30;

export const AdminPinLockModal: React.FC<AdminPinLockModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Progressive Lockout Countdown Timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  if (!isOpen) return null;

  const isLockedOut = lockoutSeconds > 0;

  const handleKeypadPress = (digit: string) => {
    if (isLockedOut) return;
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setErrorMsg(null);
      soundEffects.playScanBeep();
    }
  };

  const handleBackspace = () => {
    if (isLockedOut) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    if (isLockedOut) return;
    setPin('');
    setErrorMsg(null);
  };

  const handleFillDemo = () => {
    if (isLockedOut) return;
    setPin('8899');
    setErrorMsg(null);
  };

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLockedOut) return;

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
        setFailedAttempts(0);
        setLockoutSeconds(0);
        onSuccess();
      } else {
        soundEffects.playWarningChime();
        setIsVerifying(false);
        const newFailCount = failedAttempts + 1;
        setFailedAttempts(newFailCount);

        if (newFailCount >= MAX_FAILED_ATTEMPTS) {
          setLockoutSeconds(LOCKOUT_DURATION_SECONDS);
          setErrorMsg(`Too many failed attempts! PIN entry locked for ${LOCKOUT_DURATION_SECONDS}s.`);
          setPin('');
        } else {
          setErrorMsg(`Invalid Master PIN (${MAX_FAILED_ATTEMPTS - newFailCount} attempts remaining).`);
        }
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
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-md border ${
            isLockedOut
              ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse'
              : 'bg-slate-900 text-amber-400 border-slate-700'
          }`}>
            {isLockedOut ? <Clock className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {isLockedOut ? 'Security Lockout Active' : 'Admin Portal Authorization'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isLockedOut
              ? `Temporary brute-force prevention delay: ${lockoutSeconds} seconds remaining.`
              : 'Enter Owner / Master PIN to manage chain stores, inventory & security.'}
          </p>
        </div>

        {/* Demo button */}
        {!isLockedOut && (
          <div className="flex justify-center mb-4">
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-full border border-amber-200 transition-colors cursor-pointer"
            >
              Use Master Demo PIN: 8899
            </button>
          </div>
        )}

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
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </p>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isLockedOut}
              onClick={() => handleKeypadPress(digit)}
              className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-lg transition-colors cursor-pointer flex items-center justify-center shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={isLockedOut}
            onClick={handleClear}
            className="h-11 rounded-xl bg-slate-100 hover:bg-red-50 text-red-600 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            CLR
          </button>
          <button
            type="button"
            disabled={isLockedOut}
            onClick={() => handleKeypadPress('0')}
            className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-lg transition-colors cursor-pointer flex items-center justify-center shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            0
          </button>
          <button
            type="button"
            disabled={isLockedOut}
            onClick={handleBackspace}
            className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ⌫
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleVerify()}
          disabled={isVerifying || isLockedOut}
          className="w-full py-3 px-4 rounded-xl bg-[#1E293B] hover:bg-slate-900 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isVerifying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Verifying PIN...</span>
            </>
          ) : isLockedOut ? (
            <>
              <Clock className="w-4 h-4 text-rose-400" />
              <span>Locked ({lockoutSeconds}s)</span>
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
