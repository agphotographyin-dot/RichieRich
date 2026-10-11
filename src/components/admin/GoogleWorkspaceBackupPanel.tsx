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
  Copy,
  Sparkles,
  Key,
  HelpCircle,
  ChevronDown,
  ChevronUp,
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
  connectSimulatedWorkspace,
  connectWithManualToken,
  signInWithGoogleIdentityServices,
  WorkspaceUser,
  DriveBackupFile,
  WorkspaceBackupSettings,
} from '../../services/googleWorkspaceBackupService';
import rawConfig from '../../../firebase-applet-config.json';

interface GoogleWorkspaceBackupPanelProps {
  latestBackup: BackupSnapshot | null;
  onRefreshBackups?: () => void;
}

export const GoogleWorkspaceBackupPanel: React.FC<GoogleWorkspaceBackupPanelProps> = ({
  latestBackup,
}) => {
  const [user, setUser] = useState<User | WorkspaceUser | null>(getWorkspaceUser());
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
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Manual token modal / section
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [manualEmail, setManualEmail] = useState('admin@richierich.com');

  // Confirmation modals
  const [showDriveConfirm, setShowDriveConfirm] = useState(false);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [emailNotes, setEmailNotes] = useState('');

  // Recipient input
  const [recipientInput, setRecipientInput] = useState(settings.recipientEmail || (user?.email || ''));

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const projectId = (rawConfig as any)?.projectId || 'gen-lang-client-0055802576';
  const firebaseAuthSettingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

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
    setIsUnauthorizedDomain(false);

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

      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('auth/unauthorized-domain')) {
        setIsUnauthorizedDomain(true);
        setActionError(`Firebase Authentication: Domain "${currentHostname}" is not authorized.`);
        return;
      }

      setActionError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Try direct Google Identity Services
  const handleTryGIS = async () => {
    setIsSigningIn(true);
    setActionError(null);
    try {
      const result = await signInWithGoogleIdentityServices();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        if (!recipientInput && result.user.email) {
          setRecipientInput(result.user.email);
        }
        setIsUnauthorizedDomain(false);
        setActionSuccess(`Connected via Google Identity Services as ${result.user.displayName || result.user.email}!`);
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (err: any) {
      setActionError(err.message || 'Google Identity Services sign in failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Enable simulated cloud mode for immediate testing
  const handleEnableSimulatedMode = () => {
    const simEmail = recipientInput.trim() || 'agphotography.in@gmail.com';
    const { user: simUser, accessToken } = connectSimulatedWorkspace(simEmail);
    setUser(simUser);
    setToken(accessToken);
    setRecipientInput(simEmail);
    setIsUnauthorizedDomain(false);
    setActionError(null);
    setActionSuccess('Cloud Simulation Mode enabled! You can now test Drive and Gmail backup operations.');
    setTimeout(() => setActionSuccess(null), 5000);
  };

  // Connect with manual token
  const handleConnectManualToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    try {
      const { user: manualUser, accessToken } = await connectWithManualToken(manualToken, manualEmail);
      setUser(manualUser);
      setToken(accessToken);
      setShowTokenInput(false);
      setIsUnauthorizedDomain(false);
      setActionError(null);
      setActionSuccess('Connected successfully with OAuth Access Token!');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to connect with token.');
    }
  };

  const handleCopyHostname = () => {
    navigator.clipboard?.writeText(currentHostname);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 3000);
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
      setActionSuccess(`Backup file "${result.name}" successfully uploaded to Google Drive!`);
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
      setActionSuccess(`Backup archive email dispatched successfully to ${targetEmail}!`);
      setSettings(getWorkspaceBackupSettings());
      setTimeout(() => setActionSuccess(null), 6000);
    } else {
      setActionError(result.error || 'Failed to send backup email via Gmail');
    }
  };

  const handleToggleSetting = (key: 'autoDriveUpload' | 'autoEmailPush') => {
    const updated = saveWorkspaceBackupSettings({ [key]: !settings[key] });
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
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                Google Drive & Gmail Daily Cloud Backup
              </h3>
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
              <img
                src={user.photoURL}
                alt={user.displayName || 'Google User'}
                className="w-8 h-8 rounded-full border border-slate-300"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                {(user.email || 'G')[0].toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <div className="text-xs font-bold text-slate-800 line-clamp-1">
                {user.displayName || user.email}
              </div>
              <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {user.uid?.startsWith('sim-') ? 'Simulated Cloud Active' : 'Drive & Gmail Connected'}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors ml-1 cursor-pointer"
              title="Sign out of Google"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Official Google Sign-In Button */}
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
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>Connect Google Account</span>
                </>
              )}
            </button>

            {/* Quick Simulation Mode Shortcut */}
            <button
              type="button"
              onClick={handleEnableSimulatedMode}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Test Drive & Gmail backups in Simulated Mode without Google account"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Test Mode</span>
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

      {/* SPECIALIZED DIAGNOSTIC & RESOLUTION CARD FOR auth/unauthorized-domain */}
      {isUnauthorizedDomain && (
        <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-2xl text-slate-800 text-xs space-y-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 shadow-xs">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-amber-950 flex items-center gap-2">
                Firebase: Domain Not Authorized (auth/unauthorized-domain)
              </h4>
              <p className="text-xs text-amber-900 leading-relaxed">
                Firebase Authentication restricts Google sign-in popups to verified domains. To allow sign-in from this environment, add this domain to your Firebase project's <strong>Authorized Domains</strong>.
              </p>
            </div>
          </div>

          {/* Copyable Domain Box */}
          <div className="p-3 bg-white/90 border border-amber-200 rounded-xl space-y-2">
            <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
              <span>Domain to Authorize:</span>
              <span className="text-[10px] text-amber-700 font-mono">Firebase Project: {projectId}</span>
            </div>
            <div className="flex items-center justify-between gap-2 p-2 bg-slate-900 text-amber-300 font-mono text-xs rounded-lg overflow-x-auto">
              <span className="truncate select-all">{currentHostname}</span>
              <button
                type="button"
                onClick={handleCopyHostname}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded text-[11px] shrink-0 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              >
                {copiedDomain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDomain ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* 3-Step Setup Instructions */}
          <div className="bg-amber-100/60 p-3 rounded-xl border border-amber-200/80 space-y-2 text-[11px] text-amber-950">
            <div className="font-bold text-slate-900">How to authorize in 30 seconds:</div>
            <ol className="list-decimal pl-4 space-y-1 text-slate-700">
              <li>
                Click <strong>"Open Firebase Settings"</strong> below (or go to Firebase Console → Authentication → Settings).
              </li>
              <li>
                Scroll to the <strong>Authorized domains</strong> table and click <strong>Add domain</strong>.
              </li>
              <li>
                Paste <code className="bg-white px-1.5 py-0.5 rounded font-mono text-amber-800">{currentHostname}</code> and click <strong>Add</strong>.
              </li>
            </ol>
          </div>

          {/* Resolution Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href={firebaseAuthSettingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Firebase Settings</span>
            </a>

            <button
              type="button"
              onClick={handleTryGIS}
              disabled={isSigningIn}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5 text-blue-600" />
              <span>Try Direct OAuth (GIS)</span>
            </button>

            <button
              type="button"
              onClick={handleEnableSimulatedMode}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enable Test/Simulated Mode</span>
            </button>
          </div>
        </div>
      )}

      {actionError && !isUnauthorizedDomain && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="truncate">{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-700 hover:text-rose-950 font-bold shrink-0 text-[11px] cursor-pointer"
          >
            Dismiss
          </button>
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
              Every database snapshot is exported into an encrypted JSON file and archived inside your connected Google Drive storage under the <code>Richie_Rich_Backup_*.json</code> naming convention.
            </p>

            {/* Auto-upload setting toggle */}
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200/80 rounded-xl">
              <div>
                <div className="text-xs font-semibold text-slate-800">Auto-Upload on Snapshot</div>
                <div className="text-[10px] text-slate-400">Trigger automatic upload when creating backups</div>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSetting('autoDriveUpload')}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.autoDriveUpload ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    settings.autoDriveUpload ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowDriveConfirm(true)}
              disabled={isUploadingToDrive || !latestBackup || !token}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isUploadingToDrive ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading to Google Drive...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload Latest Backup to Drive</span>
                </>
              )}
            </button>
            {!token && (
              <p className="text-[10px] text-amber-600 text-center mt-1.5 font-medium">
                Connect your Google Account above or use Test Mode to upload.
              </p>
            )}
          </div>
        </div>

        {/* COLUMN 2: GMAIL BACKUP PUSH */}
        <div className="border border-slate-200 rounded-xl p-5 bg-gradient-to-b from-white to-slate-50/50 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Gmail Dispatch Service</h4>
                  <p className="text-[11px] text-slate-500">Send backup JSON file straight to email</p>
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
              Dispatches an executive HTML email report with operation metrics, verification checksums, and the raw JSON database file securely attached.
            </p>

            {/* Recipient Email Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Recipient Email
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  placeholder="admin@richierich.com"
                  className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSaveRecipient}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Auto-email setting toggle */}
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200/80 rounded-xl">
              <div>
                <div className="text-xs font-semibold text-slate-800">Auto-Email on Snapshot</div>
                <div className="text-[10px] text-slate-400">Send email automatically upon backup generation</div>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSetting('autoEmailPush')}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.autoEmailPush ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    settings.autoEmailPush ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowEmailConfirm(true)}
              disabled={isSendingEmail || !latestBackup || !token}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching Email via Gmail...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Latest Backup to Email</span>
                </>
              )}
            </button>
            {!token && (
              <p className="text-[10px] text-amber-600 text-center mt-1.5 font-medium">
                Connect your Google Account above or use Test Mode to send.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Google Drive Files History Table */}
      {token && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-800">Backups Stored in Google Drive</h4>
              <span className="text-[10px] text-slate-500 font-mono">({driveBackups.length} archives)</span>
            </div>
            <button
              type="button"
              onClick={loadDriveBackups}
              disabled={isLoadingDriveFiles}
              className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Refresh Google Drive files"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDriveFiles ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {isLoadingDriveFiles ? (
              <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking Google Drive files...</span>
              </div>
            ) : driveBackups.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No backup files found in this Google Drive yet. Click "Upload Latest Backup" to create one.
              </div>
            ) : (
              driveBackups.map((file) => (
                <div key={file.id} className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileJson className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="truncate">
                      <div className="font-semibold text-slate-800 truncate">{file.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {file.createdTime ? new Date(file.createdTime).toLocaleString() : 'Uploaded'} • {file.size ? `${Math.round(Number(file.size) / 1024)} KB` : 'JSON file'}
                      </div>
                    </div>
                  </div>
                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 shrink-0 ml-2"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal: Upload to Drive */}
      {showDriveConfirm && latestBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Upload to Google Drive?</h4>
                <p className="text-xs text-slate-500">This will store the database snapshot in your Drive account.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Items:</span>
                <span className="font-mono font-bold text-slate-800">{latestBackup.itemCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Orders:</span>
                <span className="font-mono font-bold text-slate-800">{latestBackup.orderCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Checksum:</span>
                <span className="font-mono text-[11px] text-slate-600 truncate max-w-[200px]">{latestBackup.checksum}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDriveConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUploadDrive}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Upload Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Send Email via Gmail */}
      {showEmailConfirm && latestBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Send Backup via Gmail?</h4>
                <p className="text-xs text-slate-500">An email with the snapshot attached will be sent.</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-slate-600">
                Recipient: <strong className="text-slate-900">{recipientInput || user?.email}</strong>
              </div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Optional Admin Note
              </label>
              <textarea
                value={emailNotes}
                onChange={(e) => setEmailNotes(e.target.value)}
                placeholder="e.g. End of day store collection archive..."
                rows={2}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEmailConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSendEmail}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Send Email Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
