import React, { useState, useEffect } from 'react';
import {
  Server,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Database,
  Wifi,
  ShieldCheck,
  ArrowUpDown,
  X,
  Zap,
  ExternalLink,
  Save,
  Check,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import { cloudSync, CloudSyncState } from '../../services/cloudSync';
import {
  getPocketBaseUrl,
  checkPocketBaseHealth,
  setCustomPocketBaseUrl,
  PocketBaseHealthResult,
  DEFAULT_VPS_IP,
} from '../../services/pocketbaseClient';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const [syncState, setSyncState] = useState<CloudSyncState>(cloudSync.getState());
  const [isPushing, setIsPushing] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  // Server address configuration
  const [serverUrlInput, setServerUrlInput] = useState<string>(getPocketBaseUrl() || DEFAULT_VPS_IP);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<PocketBaseHealthResult | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setServerUrlInput(getPocketBaseUrl() || DEFAULT_VPS_IP);
    setTestResult(null);
    setSaveSuccess(false);

    const unsub = cloudSync.subscribe((state) => {
      setSyncState(state);
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await checkPocketBaseHealth(serverUrlInput.trim());
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndConnect = async () => {
    setIsTesting(true);
    try {
      const cleaned = serverUrlInput.trim().replace(/\/+$/, '');
      setCustomPocketBaseUrl(cleaned);
      await cloudSync.reconnectWithServerUrl(cleaned);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsTesting(false);
    }
  };

  const handleForceUpload = async () => {
    setIsPushing(true);
    setPushMessage(null);
    try {
      const ok = await cloudSync.uploadAllLocalData();
      if (ok) {
        setPushMessage('✅ Full catalog, stores, and warehouse records successfully synchronized with PocketBase VPS!');
      } else {
        setPushMessage('⚠️ Could not complete full sync. Check VPS connection.');
      }
    } finally {
      setIsPushing(false);
      setTimeout(() => setPushMessage(null), 5000);
    }
  };

  const getStatusBadge = () => {
    switch (syncState.status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {syncState.engine === 'firebase'
              ? 'Cloud Real-Time Active (Firestore)'
              : syncState.engine === 'hybrid'
              ? 'Dual Cloud Live (Firestore + PocketBase VPS)'
              : 'VPS PocketBase Live (Unlimited Credits)'}
          </span>
        );
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Syncing Changes...
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            Connecting to Cloud Database...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 border border-slate-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            Local Browser Cache (Offline Safe)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Real-Time Sync & Server Center</h2>
              <p className="text-xs text-slate-300">Unlimited Credits VPS Server & Multi-Store Live Sync</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Status Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-600 font-medium">Real-Time Sync Engine:</div>
            {getStatusBadge()}
          </div>

          {/* Database Specs Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-slate-500 font-medium flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span>Active Database</span>
              </div>
              <div className="font-mono text-slate-800 font-semibold truncate text-[11px]" title={syncState.serverUrl}>
                {syncState.serverUrl}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-slate-500 font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live Channels</span>
              </div>
              <div className="font-mono text-slate-800 font-semibold text-[11px]">
                {syncState.activeListenersCount} Live Streams Active
              </div>
            </div>
          </div>

          {/* VPS PocketBase Server Address Card */}
          <div className="p-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-xs text-slate-800">VPS Server Address (Unlimited Credits)</h3>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                0 Quota / $0 Fees
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Your self-hosted server runs PocketBase with zero credit consumption. Every store counter, POS order, and stock update syncs without limits.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700">PocketBase Server Address:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={serverUrlInput}
                  onChange={(e) => setServerUrlInput(e.target.value)}
                  placeholder="http://187.126.115.40"
                  className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5 text-indigo-600" />}
                  Test
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndConnect}
                  disabled={isTesting}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  {saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-[10px] text-slate-400 font-medium">Quick Presets:</span>
              <button
                type="button"
                onClick={() => setServerUrlInput('http://187.126.115.40')}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 cursor-pointer"
              >
                http://187.126.115.40 (Port 80)
              </button>
              <button
                type="button"
                onClick={() => setServerUrlInput('http://187.126.115.40:8090')}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 cursor-pointer"
              >
                http://187.126.115.40:8090 (Direct)
              </button>
            </div>

            {/* Test Connection Output */}
            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs leading-relaxed ${
                  testResult.status === 'online'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : testResult.status === 'mixed_content'
                    ? 'bg-amber-50 border border-amber-200 text-amber-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5 mb-1">
                  {testResult.status === 'online' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  )}
                  <span>
                    {testResult.status === 'online'
                      ? 'Server Reachable & Online!'
                      : testResult.status === 'mixed_content'
                      ? 'Mixed Content Note (HTTPS Preview)'
                      : 'Connection Failed'}
                  </span>
                </div>
                <p className="text-[11px]">{testResult.message}</p>
              </div>
            )}

            {/* Admin Dashboard & VPS Help */}
            <div className="pt-1 flex items-center justify-between text-[11px] border-t border-slate-200/80">
              <span className="text-slate-500">PocketBase Admin Dashboard:</span>
              <a
                href="http://187.126.115.40/_/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                <span>http://187.126.115.40/_/</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Sync Stats */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Automatic Real-Time Sync Active
              </span>
              <span className="text-[11px] text-slate-500">
                {syncState.lastSyncedAt
                  ? `Last synced at ${syncState.lastSyncedAt.toLocaleTimeString()}`
                  : 'Ready to sync'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Every POS order, invoice, stock deduction, and warehouse transfer syncs automatically across all store counters in real time. <strong>Manual pushing is never required.</strong>
            </p>
          </div>

          {pushMessage && (
            <div className="p-3 rounded-xl bg-slate-900 text-white text-xs font-medium animate-in fade-in duration-200">
              {pushMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleForceUpload}
                disabled={isPushing}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isPushing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Syncing Cloud Database...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpDown className="w-4 h-4 text-amber-400" />
                    <span>Force Full Re-Sync (Optional)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400">
              Changes sync automatically in the background. Use the re-sync button only to re-upload all local historical records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

