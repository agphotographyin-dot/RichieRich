import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Mail,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Upload,
  Send,
  Loader2,
  Calendar,
  FileJson,
  LogOut,
  RefreshCw,
  Clock,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { BackupSnapshot } from '../../types';
import {
  initWorkspaceAuth,
  googleSignIn,
  googleSignOut,
  getAccessToken,
  getWorkspaceUser,
  uploadBackupToGoogleDrive,
  sendBackupEmailViaGmail,
  listGoogleDriveBackups,
  getWorkspaceBackupSettings,
  saveWorkspaceBackupSettings,
  DriveBackupFile,
  WorkspaceBackupSettings,
} from '../../services/googleWorkspaceBackupService';

interface GoogleWorkspaceBackupPanelProps {
  latestBackup: BackupSnapshot | null;
  onRefreshBackups?: () => void;
}

export const GoogleWorkspaceBackupPanel: React.FC<GoogleWorkspaceBackupPanelProps> = ({
  latestBackup,
}) => {
  const [user, setUser] = useState<User | null>(getWorkspaceUser());
  const [token, setToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [settings, setSettings] = useState<WorkspaceBackupSettings>(getWorkspaceBackupSettings());

  // Action states
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [driveBackups, setDriveBackups] = useState<DriveBackupFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);

  // Status banners
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Confirmation modals
  const [showDriveConfirm, setShowDriveConfirm] = useState(false);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [emailNotes, setEmailNotes] = useState('');

  // Recipient input
  const [recipientInput, setRecipientInput] = useState(settings.recipientEmail || (user?.email || ''));

  useEffect(() => {
    const unsub = initWorkspaceAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        if (!recipientInput && currentUser.email) {
          setRecipientInput(currentUser.email);
        }
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsub();
  }, []);

  // Fetch Drive backups when authenticated
  useEffect(() => {
    if (token) {
      loadDriveBackups();
    }
  }, [token]);

  const loadDriveBackups = async () => {
    setIsLoadingDriveFiles(true);
    try {
      const files = await listGoogleDriveBackups();
      setDriveBackups(files);
    } catch {}
    finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setActionError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        if (!recipientInput && result.user.email) {
          setRecipientInput(result.user.email);
        }
        setActionSuccess(`Connected successfully as ${result.user.displayName || result.user.email}!`);
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user') ||
        err?.message?.includes('cancelled-popup-request')
      ) {
        return;
      }
      setActionError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await googleSignOut();
    setUser(null);
    setToken(null);
    setDriveBackups([]);
  };

  const handleConfirmUploadDrive = async () => {
    if (!latestBackup) {
      setActionError('No backup snapshot available to upload. Create a backup first.');
      return;
    }
    setShowDriveConfirm(false);
    setIsUploadingToDrive(true);
    setActionError(null);
    setActionSuccess(null);

    const result = await uploadBackupToGoogleDrive(latestBackup);
    setIsUploadingToDrive(false);

    if (result.success) {
      setActionSuccess(`✅ Backup file "${result.name}" successfully uploaded to your Google Drive!`);
      setSettings(getWorkspaceBackupSettings());
      loadDriveBackups();
      setTimeout(() => setActionSuccess(null), 6000);
    } else {
      setActionError(result.error || 'Failed to upload backup to Google Drive');
    }
  };

  const handleConfirmSendEmail = async () => {
    if (!latestBackup) {
      setActionError('No backup snapshot available to send. Create a backup first.');
      return;
    }
    const targetEmail = recipientInput.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setActionError('Please specify a valid recipient email address.');
      return;
    }

    setShowEmailConfirm(false);
    setIsSendingEmail(true);
    setActionError(null);
    setActionSuccess(null);

    const result = await sendBackupEmailViaGmail(latestBackup, targetEmail, emailNotes);
    setIsSendingEmail(false);

    if (result.success) {
      setActionSuccess(`📧 Daily backup file dispatched successfully via Gmail to ${targetEmail}!`);
      setSettings(getWorkspaceBackupSettings());
      setTimeout(() => setActionSuccess(null), 6000);
    } else {
      setActionError(result.error || 'Failed to send backup email via Gmail');
    }
  };

  const handleToggleAutoDrive = (enabled: boolean) => {
    const updated = saveWorkspaceBackupSettings({ autoDriveUpload: enabled });
    setSettings(updated);
  };

  const handleToggleAutoEmail = (enabled: boolean) => {
    const updated = saveWorkspaceBackupSettings({
      autoEmailPush: enabled,
      recipientEmail: recipientInput.trim(),
    });
    setSettings(updated);
  };

  const handleSaveRecipient = () => {
    const target = recipientInput.trim();
    const updated = saveWorkspaceBackupSettings({ recipientEmail: target });
    setSettings(updated);
    setActionSuccess(`Recipient email saved as: ${target}`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-800">Google Drive & Gmail Daily Cloud Backup</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                1-Click Push
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated daily database snapshots uploaded directly to your Google Drive and pushed to your Gmail.
            </p>
          </div>
        </div>

        {/* Authentication State */}
        {user ? (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2 px-3 self-start sm:self-auto">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'Google User'} className="w-8 h-8 rounded-full border border-slate-300" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                {(user.email || 'G')[0].toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <div className="text-xs font-bold text-slate-800 line-clamp-1">{user.displayName || user.email}</div>
              <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Drive & Gmail Connected
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors ml-1"
              title="Sign out of Google"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="self-start sm:self-auto">
            {/* Official Google Sign-In Button format */}
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="relative inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Connecting Google Account...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>Connect Google Account</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Two Columns: Google Drive & Gmail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COLUMN 1: GOOGLE DRIVE */}
        <div className="border border-slate-200 rounded-xl p-5 bg-gradient-to-b from-white to-slate-50/50 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Google Drive Vault</h4>
                  <p className="text-[11px] text-slate-500">Secure cloud storage for JSON snapshots</p>
                </div>
              </div>
              {settings.lastDriveUploadAt && (
                <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {new Date(settings.lastDriveUploadAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Uploads immutable database snapshots to your personal Google Drive account. Each backup includes full inventory catalogs, completed sales orders, customer loyalty profiles, and supplier ledgers.
            </p>

            {/* Auto-upload switch */}
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-xs">
                <span className="font-semibold text-slate-700 block">Automatic Midnight Upload</span>
                <span className="text-[11px] text-slate-500">Upload to Drive during daily 12:00 AM auto-backup</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoDriveUpload}
                  onChange={(e) => handleToggleAutoDrive(e.target.checked)}
                  disabled={!user}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 disabled:opacity-40"></div>
              </label>
            </div>

            {/* Recent Drive Backups List */}
            {user && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Recent Files on Google Drive ({driveBackups.length})</span>
                  <button
                    onClick={loadDriveBackups}
                    disabled={isLoadingDriveFiles}
                    className="text-blue-600 hover:text-blue-800 text-[11px] flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingDriveFiles ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {driveBackups.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 bg-white border border-dashed border-slate-200 rounded-lg text-xs">
                      {isLoadingDriveFiles ? 'Querying Google Drive files...' : 'No Richie Rich backups uploaded yet.'}
                    </div>
                  ) : (
                    driveBackups.slice(0, 5).map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg hover:border-blue-200 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileJson className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate font-mono text-[11px] text-slate-700">{f.name}</span>
                        </div>
                        {f.webViewLink && (
                          <a
                            href={f.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-blue-600 ml-2"
                            title="Open in Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <button
            type="button"
            onClick={() => setShowDriveConfirm(true)}
            disabled={!user || !latestBackup || isUploadingToDrive}
            className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isUploadingToDrive ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading Snapshot to Google Drive...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Latest Backup to Google Drive</span>
              </>
            )}
          </button>
        </div>

        {/* COLUMN 2: GMAIL BACKUP PUSH */}
        <div className="border border-slate-200 rounded-xl p-5 bg-gradient-to-b from-white to-slate-50/50 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Gmail Backup Dispatch</h4>
                  <p className="text-[11px] text-slate-500">Automated email report with attached JSON</p>
                </div>
              </div>
              {settings.lastEmailPushAt && (
                <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {new Date(settings.lastEmailPushAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Sends an executive snapshot summary directly to your inbox via Gmail, with the full cryptographic JSON backup attached.
            </p>

            {/* Recipient Email Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Recipient Email Address
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  placeholder="admin@example.com"
                  className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={handleSaveRecipient}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Auto-email switch */}
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-xs">
                <span className="font-semibold text-slate-700 block">Automatic Midnight Email Push</span>
                <span className="text-[11px] text-slate-500">Dispatch email attachment during daily 12:00 AM auto-backup</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoEmailPush}
                  onChange={(e) => handleToggleAutoEmail(e.target.checked)}
                  disabled={!user}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600 disabled:opacity-40"></div>
              </label>
            </div>

            {/* Latest Snapshot details */}
            {latestBackup && (
              <div className="p-2.5 bg-slate-100 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                <span>Active Snapshot: <strong className="text-slate-800">{latestBackup.fileSizeKb} KB</strong></span>
                <span className="font-mono text-[10px] text-slate-500">{latestBackup.checksum}</span>
              </div>
            )}
          </div>

          {/* Send Email Button */}
          <button
            type="button"
            onClick={() => setShowEmailConfirm(true)}
            disabled={!user || !latestBackup || isSendingEmail || !recipientInput.trim()}
            className="w-full mt-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSendingEmail ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Dispatching Email via Gmail...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Backup File via Email Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODAL: GOOGLE DRIVE UPLOAD */}
      {showDriveConfirm && latestBackup && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-base">Upload Backup to Google Drive?</h4>
                <p className="text-xs text-slate-500">Confirm file transmission to your personal storage</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will upload the latest verified database snapshot (<strong>{latestBackup.fileSizeKb} KB</strong>) with SHA-256 signature <code className="text-slate-800 font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">{latestBackup.checksum}</code> to your connected Google Drive account.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDriveConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUploadDrive}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Upload</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: GMAIL DISPATCH */}
      {showEmailConfirm && latestBackup && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Mail className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-base">Send Backup via Gmail?</h4>
                <p className="text-xs text-slate-500">Confirm email dispatch with attached snapshot</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              The backup file (<strong>{latestBackup.fileSizeKb} KB</strong>) containing {latestBackup.itemCount} items and {latestBackup.orderCount} orders will be sent to:
            </p>

            <div className="p-2.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="truncate">{recipientInput.trim()}</span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Optional Note for Recipient</label>
              <textarea
                value={emailNotes}
                onChange={(e) => setEmailNotes(e.target.value)}
                placeholder="e.g. Daily end-of-day register backup"
                rows={2}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEmailConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSendEmail}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Send Email</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
