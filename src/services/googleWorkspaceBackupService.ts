import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import { app } from './firebaseClient';
import { BackupSnapshot } from '../types';
import { safeStorage } from '../utils/safeStorage';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.send',
];

export interface DriveBackupFile {
  id: string;
  name: string;
  webViewLink?: string;
  createdTime?: string;
  size?: string;
}

export interface WorkspaceBackupSettings {
  autoDriveUpload: boolean;
  autoEmailPush: boolean;
  recipientEmail: string;
  lastDriveUploadAt: string | null;
  lastEmailPushAt: string | null;
  lastDriveFileId: string | null;
}

const SETTINGS_KEY = 'rr_workspace_backup_settings';

// In-memory token caching (MANDATORY per skill instructions - NEVER stored in local/session storage)
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;
let isSigningIn = false;

// Initialize Firebase Auth
const auth = getAuth(app!);
const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => provider.addScope(scope));

// Initialize auth listener
export const initWorkspaceAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google OAuth access token from sign-in');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Workspace sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getWorkspaceUser = (): User | null => {
  return cachedUser || auth.currentUser;
};

export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedUser = null;
};

// Settings persistence
export const getWorkspaceBackupSettings = (): WorkspaceBackupSettings => {
  try {
    const raw = safeStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {
    autoDriveUpload: true,
    autoEmailPush: false,
    recipientEmail: '',
    lastDriveUploadAt: null,
    lastEmailPushAt: null,
    lastDriveFileId: null,
  };
};

export const saveWorkspaceBackupSettings = (settings: Partial<WorkspaceBackupSettings>): WorkspaceBackupSettings => {
  const current = getWorkspaceBackupSettings();
  const updated = { ...current, ...settings };
  try {
    safeStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
};

// Base64 helper for email MIME construction
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function toBase64Url(str: string): string {
  return toBase64(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Uploads a backup snapshot file to Google Drive under the user's account
 */
export const uploadBackupToGoogleDrive = async (
  snapshot: BackupSnapshot
): Promise<{ success: boolean; fileId?: string; webViewLink?: string; name: string; error?: string }> => {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, name: '', error: 'Google account not connected. Please sign in with Google first.' };
  }

  const boundary = `-------314159265358979323846`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const dateStr = snapshot.timestamp.split('T')[0];
  const checksumClean = (snapshot.checksum || '').replace(/[^a-zA-Z0-9-]/g, '').slice(-8);
  const filename = `Richie_Rich_Backup_${dateStr}_${checksumClean}.json`;

  const metadata = {
    name: filename,
    mimeType: 'application/json',
    description: `Richie Rich Pan House Enterprise Backup. Generated: ${snapshot.timestamp}. Items: ${snapshot.itemCount}, Orders: ${snapshot.orderCount}, Customers: ${snapshot.customerCount}. SHA-256 Checksum: ${snapshot.checksum}.`,
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    snapshot.dataJson +
    closeDelimiter;

  try {
    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,createdTime,size',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Google Drive upload failed with HTTP ${res.status}`);
    }

    const file = await res.json();
    saveWorkspaceBackupSettings({
      lastDriveUploadAt: new Date().toISOString(),
      lastDriveFileId: file.id,
    });

    return {
      success: true,
      fileId: file.id,
      webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      name: file.name || filename,
    };
  } catch (err: any) {
    console.error('Google Drive backup error:', err);
    return { success: false, name: filename, error: err.message || 'Failed to upload backup to Google Drive' };
  }
};

/**
 * Lists backups stored in Google Drive created with this app
 */
export const listGoogleDriveBackups = async (): Promise<DriveBackupFile[]> => {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    const query = encodeURIComponent("name contains 'Richie_Rich_Backup' and trashed = false");
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&pageSize=15&fields=files(id,name,webViewLink,createdTime,size)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.files) ? data.files : [];
  } catch (err) {
    console.warn('Error fetching Google Drive backup files:', err);
    return [];
  }
};

/**
 * Pushes a daily backup file as an email attachment via Gmail API
 */
export const sendBackupEmailViaGmail = async (
  snapshot: BackupSnapshot,
  recipientEmail: string,
  userNotes?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Google account not connected. Please sign in with Google first.' };
  }

  const targetEmail = recipientEmail.trim();
  if (!targetEmail || !targetEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid recipient email address.' };
  }

  const dateStr = snapshot.timestamp.split('T')[0];
  const timeFormatted = new Date(snapshot.timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const checksumClean = (snapshot.checksum || '').replace(/[^a-zA-Z0-9-]/g, '').slice(-8);
  const filename = `Richie_Rich_Backup_${dateStr}_${checksumClean}.json`;
  const boundary = `====_RR_Backup_Boundary_${Date.now()}_====`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #0f172a; padding: 24px; color: #ffffff; }
        .badge { display: inline-block; padding: 4px 10px; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #34d399; text-transform: uppercase; letter-spacing: 0.05em; }
        .title { margin: 12px 0 4px 0; font-size: 20px; font-weight: 800; color: #f8fafc; }
        .subtitle { margin: 0; font-size: 13px; color: #94a3b8; }
        .content { padding: 24px; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
        .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
        .stat-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
        .stat-value { font-size: 18px; font-weight: 800; color: #0f172a; }
        .checksum-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 12px; margin: 16px 0; font-family: monospace; font-size: 12px; color: #1e40af; word-break: break-all; }
        .footer { padding: 16px 24px; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span class="badge">Verified Cryptographic Snapshot</span>
          <h1 class="title">Richie Rich Pan House Enterprise</h1>
          <p class="subtitle">Daily Automated Cloud Backup • ${dateStr} at ${timeFormatted}</p>
        </div>
        <div class="content">
          <p style="margin-top:0; font-size:14px; line-height: 1.5;">
            Your full database backup file has been successfully generated and is attached to this email.
            ${userNotes ? `<br><br><strong>Admin Notes:</strong> ${userNotes}` : ''}
          </p>

          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">Active SKUs</div>
              <div class="stat-value">${snapshot.itemCount.toLocaleString()} Items</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Recorded Orders</div>
              <div class="stat-value">${snapshot.orderCount.toLocaleString()} Orders</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Customer Profiles</div>
              <div class="stat-value">${snapshot.customerCount.toLocaleString()} Guests</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Snapshot Archive Size</div>
              <div class="stat-value">${snapshot.fileSizeKb} KB</div>
            </div>
          </div>

          <div class="checksum-box">
            <strong>SHA-256 Envelope:</strong> ${snapshot.checksum}
          </div>

          <p style="font-size: 12px; color: #64748b; margin-bottom:0;">
            To restore this backup, download the attached JSON file and use the <strong>Import & Verify Backup</strong> feature in the Master Admin Portal.
          </p>
        </div>
        <div class="footer">
          Automated Backup Dispatch • AG Photography / Richie Rich Pan House Cloud Node
        </div>
      </div>
    </body>
    </html>
  `.trim();

  try {
    const jsonBase64 = toBase64(snapshot.dataJson);
    const subject = `🛡️ Richie Rich Pan House - Daily Database Backup [${dateStr}]`;

    const mimeMessage = [
      `From: me`,
      `To: ${targetEmail}`,
      `Subject: =?UTF-8?B?${toBase64(subject)}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      htmlBody,
      ``,
      `--${boundary}`,
      `Content-Type: application/json; name="${filename}"`,
      `Content-Disposition: attachment; filename="${filename}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      jsonBase64,
      ``,
      `--${boundary}--`,
    ].join('\r\n');

    const raw = toBase64Url(mimeMessage);

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Gmail send failed with HTTP ${res.status}`);
    }

    const sentData = await res.json();
    saveWorkspaceBackupSettings({
      lastEmailPushAt: new Date().toISOString(),
      recipientEmail: targetEmail,
    });

    return { success: true, messageId: sentData.id };
  } catch (err: any) {
    console.error('Gmail backup dispatch error:', err);
    return { success: false, error: err.message || 'Failed to send backup email via Gmail' };
  }
};

/**
 * Handles automated daily cloud backup execution (Drive & Gmail)
 * Triggered automatically when daily midnight backup scheduler executes.
 */
export const executeDailyCloudBackup = async (
  snapshot: BackupSnapshot
): Promise<{ driveResult?: any; emailResult?: any }> => {
  const settings = getWorkspaceBackupSettings();
  const token = await getAccessToken();
  if (!token) return {};

  const results: { driveResult?: any; emailResult?: any } = {};

  if (settings.autoDriveUpload) {
    try {
      results.driveResult = await uploadBackupToGoogleDrive(snapshot);
    } catch (e) {
      console.warn('Auto Google Drive upload error:', e);
    }
  }

  if (settings.autoEmailPush && settings.recipientEmail) {
    try {
      results.emailResult = await sendBackupEmailViaGmail(
        snapshot,
        settings.recipientEmail,
        'Scheduled midnight automated daily backup dispatch.'
      );
    } catch (e) {
      console.warn('Auto Gmail backup push error:', e);
    }
  }

  return results;
};
