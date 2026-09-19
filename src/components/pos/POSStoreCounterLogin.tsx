import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
  ShieldCheck,
  KeyRound,
  User,
  Clock,
  Sparkles,
  MapPin,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  Info,
  Eye,
  EyeOff,
  Keyboard,
} from 'lucide-react';
import { StoreLocation, CounterInfo, POSSession } from '../../types';
import { INITIAL_STORES, storage } from '../../services/storage';
import { soundEffects } from '../../services/audio';

interface POSStoreCounterLoginProps {
  onLoginSuccess: (session: POSSession) => void;
}

export const POSStoreCounterLogin: React.FC<POSStoreCounterLoginProps> = ({ onLoginSuccess }) => {
  const [stores, setStores] = useState<StoreLocation[]>(() => storage.getStores());
  const [selectedStoreId, setSelectedStoreId] = useState<string>('gota');
  const [selectedCounterId, setSelectedCounterId] = useState<number>(1);
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const unsub = storage.subscribe(() => {
      setStores(storage.getStores());
    });
    return unsub;
  }, []);

  const selectedStore = stores.find((s) => s.id === selectedStoreId) || stores[0] || {
    id: 'gota',
    name: 'Gota 24x7 Royal Lounge',
    shortName: 'Gota (24x7)',
    area: 'Gota SG Highway',
    address: 'Opp. Silver Square, Gota, Ahmedabad',
    phone: '+91 98250 11002',
    is24Hours: true,
    countersCount: 1,
    counters: [
      {
        id: 1,
        name: 'Counter 1 (Main Cashier)',
        cashierName: 'Bhavesh Patel',
        defaultPin: '1001',
        shift: '24x7 Active (Shift A)',
      },
    ],
  };

  const selectedCounter =
    selectedStore.counters.find((c) => c.id === selectedCounterId) ||
    selectedStore.counters[0] || {
      id: 1,
      name: 'Counter 1 (Main Cashier)',
      cashierName: 'Bhavesh Patel',
      defaultPin: '1001',
      shift: '24x7 Active (Shift A)',
    };

  const handleStoreSelect = (storeId: string) => {
    setSelectedStoreId(storeId);
    const store = stores.find((s) => s.id === storeId);
    if (store && store.counters.length > 0) {
      setSelectedCounterId(store.counters[0].id);
    }
    setPin('');
    setErrorMsg(null);
  };

  const handleCounterSelect = (counterId: number) => {
    setSelectedCounterId(counterId);
    setPin('');
    setErrorMsg(null);
  };

  const verifyAndLogin = (pinToVerify: string) => {
    if (isVerifying) return;
    if (!pinToVerify) {
      setErrorMsg('Please enter counter PIN or password.');
      soundEffects.playWarningChime();
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    setTimeout(() => {
      // Valid if matching counter default pin, or universal staff pin '1234' / '0000' / '8899'
      const isValid =
        pinToVerify === selectedCounter.defaultPin ||
        pinToVerify === '1234' ||
        pinToVerify === '0000' ||
        pinToVerify === '8899';

      if (isValid) {
        soundEffects.playSuccessChime();
        const session: POSSession = {
          storeId: selectedStore.id,
          storeName: selectedStore.name,
          counterNumber: selectedCounter.id,
          counterName: selectedCounter.name,
          cashierName: selectedCounter.cashierName,
          shift: selectedCounter.shift,
          loggedInAt: new Date().toISOString(),
        };
        storage.setActivePOSSession(session);
        onLoginSuccess(session);
      } else {
        soundEffects.playWarningChime();
        setErrorMsg('Invalid salesperson access PIN. Please check your credentials or contact store manager.');
        setIsVerifying(false);
      }
    }, 250);
  };

  const handleKeypadPress = (digit: string) => {
    if (isVerifying) return;
    if (pin.length < 8) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg(null);
      soundEffects.playScanBeep();

      // Auto-validate if matching known valid PIN
      if (
        nextPin === selectedCounter.defaultPin ||
        nextPin === '1234' ||
        nextPin === '0000' ||
        nextPin === '8899'
      ) {
        verifyAndLogin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (isVerifying) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    if (isVerifying) return;
    setPin('');
    setErrorMsg(null);
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    verifyAndLogin(pin);
  };

  // Keyboard & Numpad listener so physical keyboards and POS keypads work seamlessly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isVerifying) return;

      // Handle number keys (0-9 and Numpad 0-9)
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        verifyAndLogin(pin);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pin, isVerifying, selectedCounter, selectedStore]);

  // Keep input focused so mobile soft-keyboards and POS scanner devices can feed into it
  useEffect(() => {
    inputRef.current?.focus();
  }, [selectedCounterId, selectedStoreId]);

  return (
    <div className="w-full max-w-5xl 2xl:max-w-6xl mx-auto py-4 sm:py-8 px-3 sm:px-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 sm:p-7 shadow-lg border border-slate-700 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  POS Counter Sign-in
                </h2>
                <span className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  24x7 Live
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mt-0.5">
                Select your branch location, counter number, and enter access PIN.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>24x7 Multi-Store Network</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Store & Counter Selection */}
        <div className="lg:col-span-7 space-y-5">
          {/* Step 1: Store Branch Selector */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                Select Store Branch ({stores.length} Outlets)
              </label>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All Branches Open 24x7
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {stores.map((store) => {
                const isSelected = store.id === selectedStoreId;
                return (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => handleStoreSelect(store.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{store.shortName} Branch</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{store.area}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        store.id === 'gota'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {store.countersCount} Counters
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {store.landmark}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Sales Counter Selector */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                Select Sales Counter ({selectedStore.shortName})
              </label>
              <span className="text-[11px] text-slate-500">
                {selectedStore.counters.length} active terminals
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {selectedStore.counters.map((counter) => {
                const isSelected = counter.id === selectedCounterId;
                return (
                  <button
                    key={counter.id}
                    type="button"
                    onClick={() => handleCounterSelect(counter.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          C{counter.id}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900">{counter.name}</h4>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-700 font-semibold flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {counter.cashierName}
                      </span>
                      <span className="text-slate-500 text-[10px] flex items-center gap-1 font-medium">
                        <Lock className="w-3 h-3 text-slate-400" />
                        Secure POS
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: PIN Authorization Keypad */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleLogin}
            className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col h-full justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-sm text-slate-900">Security PIN Authorization</h3>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Confidential Login</span>
                </div>
              </div>

              {/* Active Terminal Preview Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-xs">
                <div className="flex justify-between items-center text-slate-500 mb-1.5">
                  <span>Selected Station:</span>
                  <span className="font-bold text-slate-800">
                    {selectedStore.shortName} • Counter {selectedCounter.id}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500 mb-2">
                  <span>Cashier in Charge:</span>
                  <span className="font-semibold text-emerald-700">{selectedCounter.cashierName}</span>
                </div>
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-amber-600" />
                    Default PIN: <strong className="font-mono text-slate-800 font-bold">{selectedCounter.defaultPin}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPin(selectedCounter.defaultPin);
                      setErrorMsg(null);
                      soundEffects.playScanBeep();
                      verifyAndLogin(selectedCounter.defaultPin);
                    }}
                    className="px-2 py-0.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] transition-colors cursor-pointer"
                    title="Quick sign in using station default PIN"
                  >
                    Auto Fill PIN
                  </button>
                </div>
              </div>

              {/* PIN Display Field with Focus & Show/Hide */}
              <div className="mb-3">
                <div
                  onClick={() => inputRef.current?.focus()}
                  className="relative flex items-center justify-center bg-slate-950 text-white rounded-xl py-3.5 px-4 shadow-inner border border-slate-800 cursor-text group focus-within:ring-2 focus-within:ring-amber-400/50"
                >
                  {/* Invisible input to catch mobile keyboard and barcode/RFID input */}
                  <input
                    ref={inputRef}
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    value={pin}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 8);
                      setPin(clean);
                      setErrorMsg(null);
                      soundEffects.playScanBeep();
                      if (
                        clean === selectedCounter.defaultPin ||
                        clean === '1234' ||
                        clean === '0000' ||
                        clean === '8899'
                      ) {
                        verifyAndLogin(clean);
                      }
                    }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-text"
                    autoComplete="off"
                    aria-label="Enter Security PIN"
                  />

                  {/* Visual Display */}
                  {showPin ? (
                    <span className="font-mono text-xl tracking-[0.35em] text-amber-400 font-bold">
                      {pin ? pin : <span className="text-slate-600 tracking-normal text-sm font-sans font-normal">Enter PIN...</span>}
                    </span>
                  ) : (
                    <div className="flex gap-3 items-center">
                      {[...Array(Math.max(4, pin.length))].map((_, index) => (
                        <div
                          key={index}
                          className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                            pin.length > index
                              ? 'bg-amber-400 scale-110 shadow-sm shadow-amber-400/50'
                              : 'bg-slate-700 border border-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Toggle Show/Hide PIN */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPin(!showPin);
                      inputRef.current?.focus();
                    }}
                    className="absolute right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title={showPin ? 'Hide PIN dots' : 'Reveal PIN digits'}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Keypad status bar */}
                <div className="flex items-center justify-between text-[10.5px] text-slate-500 mt-1.5 px-1">
                  <span className="flex items-center gap-1">
                    <Keyboard className="w-3 h-3 text-amber-600" />
                    Keypad & Numpad enabled
                  </span>
                  <span className="text-slate-400">
                    Press <strong className="font-mono text-slate-600">Enter ↵</strong> or tap digits
                  </span>
                </div>

                {errorMsg && (
                  <p className="text-xs text-red-600 font-semibold text-center mt-2 animate-shake">
                    {errorMsg}
                  </p>
                )}
              </div>

              {/* On-Screen Keypad */}
              <div className="grid grid-cols-3 gap-2 mb-4 select-none">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeypadPress(digit)}
                    className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 active:scale-95 text-slate-800 font-bold text-lg transition-all cursor-pointer flex items-center justify-center shadow-xs border border-slate-200/60"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-12 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 active:bg-rose-100 active:scale-95 text-slate-600 font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center border border-slate-200/60"
                >
                  CLEAR
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 active:scale-95 text-slate-800 font-bold text-lg transition-all cursor-pointer flex items-center justify-center shadow-xs border border-slate-200/60"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-12 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-700 active:bg-amber-100 active:scale-95 text-slate-700 font-bold text-sm transition-all cursor-pointer flex items-center justify-center border border-slate-200/60"
                  title="Backspace"
                >
                  ⌫
                </button>
              </div>
            </div>

            {/* Unlock Button */}
            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authenticating Station...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Unlock POS Terminal</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
