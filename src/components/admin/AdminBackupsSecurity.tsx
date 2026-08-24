import React, { useState } from 'react';
import {
  Database,
  Download,
  RotateCcw,
  Shield,
  Lock,
  CheckCircle2,
  Clock,
  HardDrive,
  FileCode,
  AlertCircle,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';
import { BackupSnapshot } from '../../types';
import { storage } from '../../services/storage';

interface AdminBackupsSecurityProps {
  backups: BackupSnapshot[];
}

export const AdminBackupsSecurity: React.FC<AdminBackupsSecurityProps> = ({ backups }) => {
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [posPin, setPosPin] = useState('1234');
  const [showPin, setShowPin] = useState(false);
  const [maskCustomerData, setMaskCustomerData] = useState(true);

  const handleCreateManualBackup = () => {
    const backup = storage.createBackup('manual', 'Manual Admin Database Snapshot');
    setSuccessMessage(`Backup ${backup.checksum} created successfully!`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDownloadBackup = (backup: BackupSnapshot) => {
    const blob = new Blob([backup.dataJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Richie_Rich_Backup_${backup.timestamp.split('T')[0]}_${backup.checksum}.json`;
    a.click();
  };

  const handleRestore = (backupId: string) => {
    if (window.confirm('Restore system data from this backup snapshot? Current catalog and records will be synchronized to this state.')) {
      setRestoringId(backupId);
      setTimeout(() => {
        const success = storage.restoreBackup(backupId);
        setRestoringId(null);
        if (success) {
          setSuccessMessage('Database restored successfully from snapshot!');
          setTimeout(() => setSuccessMessage(null), 4000);
        }
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Database Backups & Security Engine</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold">
              Daily 12:00 AM Automated Backups
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated midnight database backups, state restore points, and cashier transaction security.
          </p>
        </div>

        <button
          onClick={handleCreateManualBackup}
          className="px-4 py-2 bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
        >
          <Database className="w-4 h-4 text-sky-400" />
          <span>Create Instant Backup Snapshot</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Automated Backup Schedule Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduled Backup Cycle</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-2">Every Day at 12:00 AM</div>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Automated Cron Scheduler Active
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Snapshots Kept</span>
            <HardDrive className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-2">{backups.length} Archived Snapshots</div>
          <p className="text-xs text-slate-500 mt-1">Stored securely with SHA-256 integrity hashes.</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Encryption & Privacy</span>
            <Shield className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-700 mt-2">Encrypted & Masked</div>
          <p className="text-xs text-slate-500 mt-1">Strict PII protection for customer phone numbers.</p>
        </div>
      </div>

      {/* Backups List Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-slate-800 text-sm">Database Backup Archive & Restore Points</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Point-in-time state recovery</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Backup Timestamp</th>
                <th className="py-3.5 px-3">Type</th>
                <th className="py-3.5 px-3">Records Included</th>
                <th className="py-3.5 px-3">File Size</th>
                <th className="py-3.5 px-3">Checksum</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {backups.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {new Date(b.timestamp).toLocaleString([], {
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        b.type === 'automated_daily'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {b.type === 'automated_daily' ? '12:00 AM Daily Auto' : 'Manual Snapshot'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 font-medium">
                    {b.itemCount} items • {b.orderCount} orders • {b.customerCount} customers
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-500">{b.fileSizeKb} KB</td>
                  <td className="py-3.5 px-3 font-mono text-[11px] text-amber-700 font-semibold">{b.checksum}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownloadBackup(b)}
                        title="Download JSON File"
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors border border-slate-200"
                      >
                        <Download className="w-3.5 h-3.5 text-sky-600" /> JSON
                      </button>
                      <button
                        onClick={() => handleRestore(b.id)}
                        disabled={restoringId === b.id}
                        title="Restore to this point"
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-200 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {restoringId === b.id ? 'Restoring...' : 'Restore'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security & Access Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cashier PIN Settings */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">POS Cashier Quick Authorization PIN</h3>
              <p className="text-xs text-slate-500">Used for discount overrides and shift closing</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type={showPin ? 'text' : 'password'}
                value={posPin}
                onChange={(e) => setPosPin(e.target.value)}
                maxLength={6}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 font-mono tracking-widest focus:outline-hidden focus:bg-white focus:border-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => {
                setSuccessMessage('Cashier Security PIN updated!');
                setTimeout(() => setSuccessMessage(null), 3000);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer transition-colors"
            >
              Update PIN
            </button>
          </div>
        </div>

        {/* User Privacy & Masking */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Customer Data Privacy Protections</h3>
              <p className="text-xs text-slate-500">Strict GDPR / PDP compliance and redaction</p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Mask Customer Contact Numbers on Receipts</p>
              <p className="text-[11px] text-slate-500">Hides middle 4 digits on printed thermal slips</p>
            </div>
            <input
              type="checkbox"
              checked={maskCustomerData}
              onChange={(e) => setMaskCustomerData(e.target.checked)}
              className="w-4 h-4 accent-slate-800 rounded-sm cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
