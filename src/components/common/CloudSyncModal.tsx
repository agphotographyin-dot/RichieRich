import React, { useState, useEffect } from 'react';
import {
  Server,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Database,
  Wifi,
  ShieldCheck,
  Building2,
  Package,
  Receipt,
  Store,
  Truck,
  ArrowUpDown,
  X,
  Zap,
} from 'lucide-react';
import { cloudSync, CloudSyncState } from '../../services/cloudSync';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const [syncState, setSyncState] = useState<CloudSyncState>(cloudSync.getState());
  const [isPushing, setIsPushing] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = cloudSync.subscribe((state) => {
      setSyncState(state);
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

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
              ? 'Cloud Real-Time Active (Automatic)'
              : syncState.engine === 'hybrid'
              ? 'Dual Cloud Live (Firestore + VPS)'
              : 'VPS PocketBase Live'}
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
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Cloud Real-Time Sync Center</h2>
              <p className="text-xs text-slate-300">Automatic Zero-Push Multi-Store Live Sync</p>
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
        <div className="p-6 space-y-5">
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

          {/* Sync Stats */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Instant Automatic Real-Time Active
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
          <div className="space-y-2 pt-2">
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
