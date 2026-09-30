import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Globe,
  Radio,
  SlidersHorizontal,
  Layers,
  Save,
  Check,
  ArrowLeftRight,
} from 'lucide-react';
import { cloudSync, CloudSyncState, COLLECTIONS } from '../../services/cloudSync';
import {
  getPocketBaseUrl,
  checkPocketBaseHealth,
  PocketBaseHealthResult,
  DEFAULT_POCKETBASE_URL,
} from '../../services/pocketbaseClient';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const [syncState, setSyncState] = useState<CloudSyncState>(cloudSync.getState());
  const [isPushing, setIsPushing] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  // Server Config State
  const [serverUrlInput, setServerUrlInput] = useState<string>(getPocketBaseUrl() || DEFAULT_POCKETBASE_URL);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<PocketBaseHealthResult | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setServerUrlInput(getPocketBaseUrl() || DEFAULT_POCKETBASE_URL);
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
      const result = await checkPocketBaseHealth(serverUrlInput.trim());
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndReconnect = async () => {
    const cleaned = serverUrlInput.trim();
    setSaveSuccess(true);
    await cloudSync.reconnectWithServerUrl(cleaned);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleForceTwoWaySync = async () => {
    setIsPushing(true);
    setPushMessage(null);
    try {
      const success = await cloudSync.uploadAllLocalData();
      if (success) {
        setPushMessage('✅ Two-way sync complete: All local and server data are in perfect sync!');
      } else {
        setPushMessage('⚠️ Could not complete sync. Please verify PocketBase server is reachable.');
      }
    } catch (err: any) {
      setPushMessage(`❌ Error: ${err?.message || 'Sync failed'}`);
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 shadow-sm">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Two-Way Realtime Sync</h2>
              <p className="text-xs text-slate-500 font-medium">
                Live bidirectional sync between Server & Counter Terminals
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              syncState.isLive
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-900'
            }`}
          >
            {syncState.isLive ? (
              <Radio className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-bold flex items-center gap-2">
                <span>{syncState.isLive ? 'Two-Way Live Stream Active' : 'Operating in Local Mode'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-white/70">
                  {syncState.status.toUpperCase()}
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {syncState.isLive
                  ? 'All changes stream automatically: Any order, stock adjustment, or transfer updates in real-time across all counters and the PocketBase server.'
                  : 'Operating locally. Changes will automatically stream to PocketBase once connected.'}
              </p>
            </div>
          </div>

          {/* Server Endpoint Configuration */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-700" />
                <h3 className="font-bold text-xs text-slate-800">PocketBase Server Endpoint</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">Port 8090</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={serverUrlInput}
                onChange={(e) => setServerUrlInput(e.target.value)}
                placeholder="http://187.126.115.40:8090"
                className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                Test
              </button>
              <button
                type="button"
                onClick={handleSaveAndReconnect}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                {saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-950" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : testResult.status === 'mixed_content'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span className="leading-snug">{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Sync Telemetry */}
          <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-slate-500">Connected Server:</span>
              <span className="font-mono font-medium truncate max-w-[240px]">{syncState.serverUrl}</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-slate-500">Sync Mode:</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <ArrowLeftRight className="w-3 h-3 text-emerald-600" />
                Two-Way Realtime (Inbound SSE + Outbound Push)
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-slate-500">Live Channels:</span>
              <span className="font-medium text-emerald-600 font-mono">
                {syncState.activeListenersCount} / 11 collections streaming
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-slate-500">Last Synced:</span>
              <span className="font-medium">
                {syncState.lastSyncedAt ? syncState.lastSyncedAt.toLocaleTimeString() : 'Streaming...'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-slate-500">Live Packets Synced:</span>
              <span className="font-mono font-bold text-slate-900">{syncState.itemsSynced}</span>
            </div>
          </div>

          {/* Two-Way Manual Reconciliation Button */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleForceTwoWaySync}
              disabled={isPushing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              {isPushing ? (
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <ArrowLeftRight className="w-4 h-4 text-amber-400" />
              )}
              <span>{isPushing ? 'Synchronizing Both Ways...' : 'Sync All Data Now (Two-Way Reconciliation)'}</span>
            </button>
            {pushMessage && (
              <p className="text-[11px] font-medium text-center text-slate-700 animate-in fade-in duration-150">
                {pushMessage}
              </p>
            )}
          </div>

          {/* Collections List */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Two-Way Synchronized Collections</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(COLLECTIONS).map((c) => (
                <span key={c} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[10px] text-slate-700">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
