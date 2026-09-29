import React, { useState, useEffect } from 'react';
import {
  Server,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Database,
  Wifi,
  Clock,
  ArrowUpDown,
  X,
  Zap,
  HardDrive,
  ShieldCheck,
} from 'lucide-react';
import { cloudSync, CloudSyncState, VpsBackupInfo } from '../../services/cloudSync';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const [syncState, setSyncState] = useState<CloudSyncState>(cloudSync.getState());
  const [isVpsBackingUp, setIsVpsBackingUp] = useState(false);
  const [vpsMessage, setVpsMessage] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<number>(
    syncState.vpsBackup?.intervalMinutes || 5
  );

  useEffect(() => {
    if (!isOpen) return;
    const unsub = cloudSync.subscribe((state) => {
      setSyncState(state);
      if (state.vpsBackup?.intervalMinutes) {
        setSelectedInterval(state.vpsBackup.intervalMinutes);
      }
    });
    // Immediately fetch fresh VPS status
    cloudSync.fetchVpsBackupStatus();
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTriggerVpsBackup = async () => {
    setIsVpsBackingUp(true);
    setVpsMessage(null);
    try {
      const res = await cloudSync.triggerVpsBackup();
      if (res.success) {
        const count = res.status?.totalItemsBackedUp ?? 0;
        setVpsMessage(`✅ Backup snapshot completed! ${count} records backed up to VPS PocketBase.`);
      } else {
        setVpsMessage(`⚠️ Backup error: ${res.error || 'Check VPS connectivity.'}`);
      }
    } catch (err: any) {
      setVpsMessage(`⚠️ Request failed: ${err.message}`);
    } finally {
      setIsVpsBackingUp(false);
      setTimeout(() => setVpsMessage(null), 6000);
    }
  };

  const handleIntervalChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10);
    setSelectedInterval(val);
    await cloudSync.setVpsBackupInterval(val);
  };

  const vps: VpsBackupInfo | undefined = syncState.vpsBackup;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Database & VPS Backup Center</h2>
              <p className="text-xs text-slate-300">Dual-Tier: Real-Time Firestore + Automatic VPS Backups</p>
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
          {/* SECTION 1: PRIMARY DATABASE (FIRESTORE) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Primary Real-Time Engine (Active)
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3" />
                Zero-Push Instant Live
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-100">
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">Cloud Database</span>
                <span className="font-mono text-slate-800 text-[11px] font-bold truncate block">
                  {syncState.projectId || 'Google Cloud Firestore'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-100">
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">Live WebSocket Stream</span>
                <span className="font-mono text-emerald-700 text-[11px] font-bold block">
                  {syncState.activeListenersCount} Channels Synced
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
              Every checkout, stock deduction, and menu update broadcasts in milliseconds to all branches and counters without pressing any button.
            </p>
          </div>

          {/* SECTION 2: AUTOMATIC BACKEND VPS BACKUP (POCKETBASE) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <HardDrive className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Automated VPS PocketBase Backup
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3 h-3" />
                Auto-Interval Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">Target VPS Endpoint</span>
                <span className="font-mono text-slate-800 text-[11px] font-semibold truncate block" title={vps?.targetUrl || 'http://187.126.115.40:8090'}>
                  {vps?.targetUrl || 'http://187.126.115.40:8090'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">Backup Schedule</span>
                </div>
                <select
                  value={selectedInterval}
                  onChange={handleIntervalChange}
                  className="mt-0.5 w-full text-[11px] font-semibold text-slate-800 bg-transparent border-0 p-0 focus:ring-0 cursor-pointer"
                >
                  <option value={2}>Every 2 minutes</option>
                  <option value={5}>Every 5 minutes (Default)</option>
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every 1 hour</option>
                </select>
              </div>
            </div>

            {/* VPS Backup Status Box */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-[11px]">Last Backup Execution:</span>
                <span className="font-semibold text-slate-800 text-[11px]">
                  {vps?.lastRunAt ? new Date(vps.lastRunAt).toLocaleTimeString() : 'Pending initial cycle'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="text-[11px]">Next Automatic Run:</span>
                <span className="font-semibold text-indigo-600 text-[11px]">
                  {vps?.nextRunAt ? new Date(vps.nextRunAt).toLocaleTimeString() : 'Running...'}
                </span>
              </div>

              {vps?.totalItemsBackedUp !== undefined && (
                <div className="flex items-center justify-between text-slate-600 border-t border-slate-100 pt-1.5">
                  <span className="text-[11px]">Records Synced to VPS:</span>
                  <span className="font-mono font-bold text-emerald-600 text-[11px]">
                    {vps.totalItemsBackedUp} records ({(vps.lastDurationMs / 1000).toFixed(1)}s)
                  </span>
                </div>
              )}
            </div>

            {/* Feedback notification message */}
            {vpsMessage && (
              <div className="p-3 rounded-xl bg-slate-900 text-white text-xs font-medium animate-in fade-in duration-200">
                {vpsMessage}
              </div>
            )}

            {/* Trigger Button */}
            <button
              type="button"
              onClick={handleTriggerVpsBackup}
              disabled={isVpsBackingUp || vps?.status === 'running'}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isVpsBackingUp || vps?.status === 'running' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>Backing Up to VPS PocketBase...</span>
                </>
              ) : (
                <>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-950" />
                  <span>Trigger VPS Backup Now</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-slate-400">
              The backend runs this automatically in the background. Trigger manually anytime to create an immediate offsite snapshot.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
