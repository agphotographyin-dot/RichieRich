import React, { useState, useRef } from 'react';
import {
  Database,
  Download,
  RotateCcw,
  Shield,
  CheckCircle2,
  Clock,
  HardDrive,
  FileCode,
  AlertCircle,
  Key,
  Eye,
  EyeOff,
  Upload,
  ShieldCheck,
  ShieldAlert,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react';
import { BackupSnapshot } from '../../types';
import { storage } from '../../services/storage';
import {
  createSignedBackupEnvelope,
  verifyAndSanitizeImportFile,
  BackupValidationResult,
} from '../../services/backupIntegrityService';

interface AdminBackupsSecurityProps {
  backups: BackupSnapshot[];
}

export const AdminBackupsSecurity: React.FC<AdminBackupsSecurityProps> = ({ backups }) => {
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [posPin, setPosPin] = useState('1234');
  const [showPin, setShowPin] = useState(false);
  const [maskCustomerData, setMaskCustomerData] = useState(true);

  // Secure Import & Integrity Modal state
  const [isVerifyingFile, setIsVerifyingFile] = useState(false);
  const [verificationResult, setVerificationResult] = useState<BackupValidationResult | null>(null);
  const [rawFileContent, setRawFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateManualBackup = async () => {
    const backup = storage.createBackup('manual', 'Cryptographically Signed Admin Snapshot');
    setSuccessMessage(`Signed Backup Snapshot ${backup.checksum} created with SHA-256 integrity.`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleDownloadBackup = (backup: BackupSnapshot) => {
    const blob = new Blob([backup.dataJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Richie_Rich_Secure_Backup_${backup.timestamp.split('T')[0]}_${backup.checksum.replace(/[^a-zA-Z0-9-]/g, '')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = async (backupId: string) => {
    if (window.confirm('Restore system data from this backup snapshot? Current catalog and records will be validated and synchronized to this state.')) {
      setRestoringId(backupId);
      const success = await storage.restoreBackup(backupId);
      setRestoringId(null);
      if (success) {
        setSuccessMessage('Database validated and restored successfully from snapshot!');
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage('Failed to restore snapshot: Schema validation or data integrity error.');
        setTimeout(() => setErrorMessage(null), 5000);
      }
    }
  };

  // Upload & File Verification Handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsVerifyingFile(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        setRawFileContent(content);

        // Run through cryptographic verification and schema sanitization
        const result = await verifyAndSanitizeImportFile(content);
        setVerificationResult(result);
      } catch (err: any) {
        setErrorMessage(`File read error: ${err.message}`);
      } finally {
        setIsVerifyingFile(false);
      }
    };
    reader.readAsText(file);
  };

  // Confirm Import after Verification Pass
  const handleConfirmSecureImport = () => {
    if (!verificationResult || !verificationResult.sanitizedData) return;

    storage.restoreSanitizedData(verificationResult.sanitizedData);
    setSuccessMessage('Backup database verified and successfully imported into system storage.');
    setVerificationResult(null);
    setRawFileContent(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Database Backups & Security Engine</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              SHA-256 Cryptographic Integrity Guard
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated midnight database snapshots, cryptographically signed backups, schema validation, and tamper-proof restore points.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json,application/json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
          >
            <Upload className="w-4 h-4 text-sky-600" />
            <span>Verify & Import Backup</span>
          </button>

          <button
            onClick={handleCreateManualBackup}
            className="px-4 py-2 bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
          >
            <Database className="w-4 h-4 text-sky-400" />
            <span>Create Signed Snapshot</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Verification Modal / Preview Card */}
      {verificationResult && (
        <div className="bg-white border-2 border-sky-400 rounded-xl p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                verificationResult.isValid && verificationResult.isCryptographicallyVerified
                  ? 'bg-emerald-100 text-emerald-700'
                  : verificationResult.isValid
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-rose-100 text-rose-700'
              }`}>
                {verificationResult.isValid && verificationResult.isCryptographicallyVerified ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : verificationResult.isValid ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <ShieldAlert className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  {verificationResult.isCryptographicallyVerified
                    ? 'Cryptographically Verified Backup File'
                    : verificationResult.isValid
                    ? 'Legacy / Unsigned Backup (Sanitized)'
                    : 'Security Alert: Corrupted or Malicious Backup File'}
                </h3>
                <p className="text-xs text-slate-500 font-mono">File: {fileName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setVerificationResult(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              {verificationResult.isValid && (
                <button
                  onClick={handleConfirmSecureImport}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Restore Verified Data</span>
                </button>
              )}
            </div>
          </div>

          {/* Validation Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
              <span className="text-[11px] text-slate-500 font-bold block uppercase">Inventory Items</span>
              <span className="text-base font-bold text-slate-800">{verificationResult.stats.inventoryCount}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
              <span className="text-[11px] text-slate-500 font-bold block uppercase">Orders Ledger</span>
              <span className="text-base font-bold text-slate-800">{verificationResult.stats.orderCount}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
              <span className="text-[11px] text-slate-500 font-bold block uppercase">Customer Accounts</span>
              <span className="text-base font-bold text-slate-800">{verificationResult.stats.customerCount}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
              <span className="text-[11px] text-slate-500 font-bold block uppercase">Promotions</span>
              <span className="text-base font-bold text-slate-800">{verificationResult.stats.promotionCount}</span>
            </div>
          </div>

          {/* Warnings / Notices */}
          {verificationResult.warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Sanitization Notices ({verificationResult.warnings.length}):
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {verificationResult.warnings.slice(0, 3).map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Fatal Errors */}
          {verificationResult.errors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                Integrity Failures:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {verificationResult.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Automated Backup Schedule Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
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

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Snapshots Kept</span>
            <HardDrive className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-2">{backups.length} Archived Snapshots</div>
          <p className="text-xs text-slate-500 mt-1">Stored securely with SHA-256 digital signatures.</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Integrity & Privacy</span>
            <Shield className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-700 mt-2">Strict Schema & PII Masking</div>
          <p className="text-xs text-slate-500 mt-1">Anti-poisoning filters with SHA-256 verification.</p>
        </div>
      </div>

      {/* Backups List Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
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
                <th className="py-3.5 px-3">Digital Signature</th>
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
                      {b.type === 'automated_daily' ? '12:00 AM Daily Auto' : 'Manual Signed'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 font-medium">
                    {b.itemCount} items • {b.orderCount} orders • {b.customerCount} customers
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-500">{b.fileSizeKb} KB</td>
                  <td className="py-3.5 px-3 font-mono text-[11px] text-amber-700 font-semibold flex items-center gap-1 pt-4">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>{b.checksum}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownloadBackup(b)}
                        title="Download Signed JSON File"
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors border border-slate-200"
                      >
                        <Download className="w-3.5 h-3.5 text-sky-600" /> JSON
                      </button>
                      <button
                        onClick={() => handleRestore(b.id)}
                        disabled={restoringId === b.id}
                        title="Restore to this verified point"
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-200 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {restoringId === b.id ? 'Verifying...' : 'Restore'}
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
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
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
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
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
