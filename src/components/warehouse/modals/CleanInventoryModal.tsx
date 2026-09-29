import React, { useState } from 'react';
import {
  Trash2,
  AlertTriangle,
  Download,
  X,
  CheckCircle2,
  RefreshCw,
  Database,
  ShieldAlert,
} from 'lucide-react';
import { InventoryItem } from '../../../types';
import { storage } from '../../../services/storage';
import { soundEffects } from '../../../services/audio';

interface CleanInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onCleanSuccess: () => void;
}

export const CleanInventoryModal: React.FC<CleanInventoryModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onCleanSuccess,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(inventory, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `richie_rich_inventory_backup_${new Date().toISOString().split('T')[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setBackupDownloaded(true);
      soundEffects.playClick();
    } catch {
      setError('Could not download backup file.');
    }
  };

  const handleExecutePurge = async () => {
    if (confirmText.trim().toUpperCase() !== 'DELETE' && confirmText.trim().toUpperCase() !== 'CLEAN') {
      return;
    }

    setIsPurging(true);
    setError(null);
    try {
      await storage.clearAllInventory();
      soundEffects.playSuccessJingle();
      onCleanSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to purge inventory from database.');
    } finally {
      setIsPurging(false);
    }
  };

  const isConfirmed = confirmText.trim().toUpperCase() === 'DELETE' || confirmText.trim().toUpperCase() === 'CLEAN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-rose-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-rose-900 via-rose-800 to-red-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
              <Trash2 className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                <span>Clean & Purge Master SKUs</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/30 text-rose-200 border border-rose-400/40">
                  Database Reset
                </span>
              </h2>
              <p className="text-xs text-rose-200">Prepare catalog for brand-new Excel/CSV product import</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPurging}
            className="w-8 h-8 rounded-full bg-rose-950/60 hover:bg-rose-900 text-rose-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Warning Banner */}
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 space-y-1">
              <p className="font-bold">You are about to purge {inventory.length} Master SKUs.</p>
              <p className="text-rose-700 leading-relaxed">
                This will delete all current inventory products from both your <strong>local browser storage</strong> and the <strong>PocketBase cloud database</strong>. Sales orders and receipts will remain untouched.
              </p>
            </div>
          </div>

          {/* Safety Backup Option */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span>Save Catalog Backup First</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Download a JSON copy of all {inventory.length} SKUs before cleaning.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                backupDownloaded
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs'
              }`}
            >
              {backupDownloaded ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Download Backup</span>
                </>
              )}
            </button>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Type <span className="font-mono text-rose-600 font-black">DELETE</span> to confirm purge:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to enable button"
              disabled={isPurging}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-sm font-mono tracking-wider transition-all uppercase"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPurging}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
            >
              Cancel & Keep SKUs
            </button>
            <button
              type="button"
              onClick={handleExecutePurge}
              disabled={!isConfirmed || isPurging}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
                isConfirmed && !isPurging
                  ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95 shadow-rose-600/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
            >
              {isPurging ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Purging Database ({inventory.length} SKUs)...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Purge All {inventory.length} SKUs</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
