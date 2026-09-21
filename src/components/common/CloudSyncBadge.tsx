import React, { useState, useEffect } from 'react';
import { Cloud, RefreshCw, AlertCircle, Zap } from 'lucide-react';
import { cloudSync, CloudSyncState } from '../../services/cloudSync';
import { CloudSyncModal } from './CloudSyncModal';

export const CloudSyncBadge: React.FC = () => {
  const [syncState, setSyncState] = useState<CloudSyncState>(cloudSync.getState());
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsub = cloudSync.subscribe((state) => {
      setSyncState(state);
    });
    return unsub;
  }, []);

  const renderBadgeContent = () => {
    switch (syncState.status) {
      case 'connected':
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline">Cloud Live</span>
          </div>
        );
      case 'syncing':
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span className="hidden sm:inline">Syncing</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
            <Cloud className="w-3 h-3 animate-pulse" />
            <span className="hidden sm:inline">Connecting</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <AlertCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Local Only</span>
          </div>
        );
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        title={`Cloud Sync: ${syncState.status.toUpperCase()} (Click to inspect or force sync)`}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 transition-all cursor-pointer shadow-xs"
      >
        <Cloud className="w-3.5 h-3.5 text-indigo-400" />
        {renderBadgeContent()}
      </button>

      <CloudSyncModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
