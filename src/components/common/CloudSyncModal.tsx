import React, { useState, useEffect } from 'react';
import {
  Cloud,
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
        setPushMessage('✅ Full catalog, stores, and warehouse records successfully synced to Cloud Firestore!');
      } else {
        setPushMessage('⚠️ Could not complete full cloud push. Check network connection.');
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
            Live Cloud Connected (Real-Time)
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
            Establishing Cloud Channel...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            Offline Storage Mode
          </span>
        );
    }
  };

  const syncChannels = [
    { name: 'Multi-Store Product Catalog', icon: Package, count: 'Live Inventory & Pricing', status: 'Active' },
    { name: 'Store Outlet Locations', icon: Store, count: 'Bopal, Gota, Sindhu Bhavan, SG Highway', status: 'Active' },
    { name: 'POS Counter Billing & Orders', icon: Receipt, count: 'Instant Sale Invoices & Stock Deductions', status: 'Active' },
    { name: 'Warehouse Purchase Orders', icon: Truck, count: 'Vendor POs & Direct-to-Store Deliveries', status: 'Active' },
    { name: 'Stock Transfers & Indents', icon: ArrowUpDown, count: 'Inter-Branch Stock Movement', status: 'Active' },
    { name: 'Enterprise Safety & Khata', icon: ShieldCheck, count: 'Offline Cashier Resiliency & Auto-Sync', status: 'Active' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                Cloud Firestore Real-Time Sync
                <Zap className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-xs text-slate-400">
                Multi-outlet synchronized live database powered by Google Cloud Firestore
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Status Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">Connection State:</span>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-slate-500">
                Project ID: <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-800 font-mono text-[11px]">{syncState.projectId}</code>
                {syncState.databaseId && (
                  <span className="ml-2">
                    Database: <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-800 font-mono text-[11px]">{syncState.databaseId}</code>
                  </span>
                )}
              </p>
              {syncState.lastSyncedAt && (
                <p className="text-[11px] text-slate-500">
                  Last Real-Time Stream Event: <span className="font-medium text-slate-700">{syncState.lastSyncedAt.toLocaleTimeString()}</span>
                </p>
              )}
            </div>

            <button
              onClick={handleForceUpload}
              disabled={isPushing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPushing ? 'animate-spin' : ''}`} />
              <span>{isPushing ? 'Syncing...' : 'Force Sync All'}</span>
            </button>
          </div>

          {pushMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 animate-in fade-in">
              {pushMessage}
            </div>
          )}

          {/* Active Realtime Channels */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              Synchronized Real-Time Channels
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {syncChannels.map((ch, idx) => {
                const Icon = ch.icon;
                return (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-start gap-3 hover:border-indigo-200 transition-all"
                  >
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 text-xs truncate">{ch.name}</span>
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Live
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{ch.count}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Offline Resilience & Architecture Info */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 text-xs text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Offline-First Guarantee for Retail Stores
            </div>
            <p className="text-amber-900/90 leading-relaxed text-[12px]">
              If a store’s broadband or mobile hotspot drops, cashiers can continue generating bills and scanning items without interruption. Invoices and stock deductions are securely preserved in the local database and automatically pushed to the cloud in real time the moment connectivity is restored.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Protocol: Firestore WebSocket Duplex Stream</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
