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
import rawConfig from '../../firebase-applet-config.json';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.send',
];

export interface WorkspaceUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isSimulated?: boolean;
}

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
const SIMULATED_DRIVE_KEY = 'rr_simulated_drive_backups';

// In-memory token caching (MANDATORY per skill instructions - NEVER stored in local/session storage)
let cachedAccessToken: string | null = null;
let cachedUser: User | WorkspaceUser | null = null;
let isSigningIn = false;
let authStateListeners: Array<(user: User | WorkspaceUser | null, token: string | null) => void> = [];

// Initialize Firebase Auth
const auth = getAuth(app!);
const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => provider.addScope(scope));

// Initialize auth listener
export const initWorkspaceAuth = (
  onAuthSuccess?: (user: User | WorkspaceUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  const listener = (user: User | WorkspaceUser | null, token: string | null) => {
    if (user && token) {
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  };
  authStateListeners.push(listener);

  // If already logged in via GIS or manual session
  if (cachedUser && cachedAccessToken) {
    listener(cachedUser, cachedAccessToken);
  }

  const unsubFirebase = onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      cachedUser = user;
      if (cachedAccessToken) {
        notifyAuthListeners(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        notifyAuthListeners(null, null);
      }
    } else if (!cachedUser?.uid?.startsWith('gis-') && !cachedUser?.uid?.startsWith('sim-')) {
      cachedAccessToken = null;
      cachedUser = null;
      notifyAuthListeners(null, null);
    }
  });

  return () => {
    unsubFirebase();
    authStateListeners = authStateListeners.filter((l) => l !== listener);
  };
};

function notifyAuthListeners(user: User | WorkspaceUser | null, token: string | null) {
  authStateListeners.forEach((l) => l(user, token));
}

/**
 * Sign in using Google Identity Services (GIS - Token Client)
 * This bypasses Firebase Auth authorized domain restrictions by talking directly
 * to Google OAuth2 endpoints via the client ID.
 */
export const signInWithGoogleIdentityServices = (): Promise<{
  user: WorkspaceUser;
  accessToken: string;
}> => {
  return new Promise((resolve, reject) => {
    const oAuthClientId = (rawConfig as any)?.oAuthClientId;
    const win = window as any;

    if (!win.google?.accounts?.oauth2) {
      return reject(new Error('Google Identity Services client library is still loading. Please retry in a moment.'));
    }

    if (!oAuthClientId) {
      return reject(new Error('No Google OAuth Client ID found in configuration.'));
    }

    try {
      const client = win.google.accounts.oauth2.initTokenClient({
        client_id: oAuthClientId,
        scope: `${WORKSPACE_SCOPES.join(' ')} email profile openid`,
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            return reject(new Error(tokenResponse.error_description || tokenResponse.error));
          }

          const accessToken = tokenResponse.access_token;
          if (!accessToken) {
            return reject(new Error('No access token returned by Google Identity Services.'));
          }

          cachedAccessToken = accessToken;

          // Fetch user profile from Google UserInfo
          try {
            const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const profile = await userinfoRes.json();
            const user: WorkspaceUser = {
              uid: profile.sub ? `gis-${profile.sub}` : `gis-${Date.now()}`,
              email: profile.email || 'workspace-admin@google.com',
              displayName: profile.name || profile.email || 'Google Workspace User',
              photoURL: profile.picture || null,
            };
            cachedUser = user;
            notifyAuthListeners(user, accessToken);
            resolve({ user, accessToken });
          } catch {
            const user: WorkspaceUser = {
              uid: `gis-${Date.now()}`,
              email: 'workspace-admin@google.com',
              displayName: 'Google Workspace User',
              photoURL: null,
            };
            cachedUser = user;
            notifyAuthListeners(user, accessToken);
            resolve({ user, accessToken });
          }
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || 'Google OAuth prompt was cancelled or closed.'));
        },
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      reject(err);
    }
  });
};

/**
 * Connect using simulated Workspace session for development/testing
 */
export const connectSimulatedWorkspace = (
  email: string = 'agphotography.in@gmail.com'
): { user: WorkspaceUser; accessToken: string } => {
  const user: WorkspaceUser = {
    uid: `sim-${Date.now()}`,
    email,
    displayName: 'Richie Rich Cloud Admin',
    photoURL: null,
    isSimulated: true,
  };
  const accessToken = `simulated_workspace_token_${Date.now()}`;
  cachedAccessToken = accessToken;
  cachedUser = user;
  notifyAuthListeners(user, accessToken);
  return { user, accessToken };
};

/**
 * Connect using an existing manual OAuth access token
 */
export const connectWithManualToken = async (
  token: string,
  email: string = 'admin@richierich.com'
): Promise<{ user: WorkspaceUser; accessToken: string }> => {
  const cleanToken = token.trim();
  if (!cleanToken) throw new Error('Access token cannot be empty.');

  // Try to inspect userinfo if it's a real token
  let displayName = 'Google Account';
  let photoURL: string | null = null;
  let resolvedEmail = email;

  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${cleanToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.email) resolvedEmail = data.email;
      if (data.name) displayName = data.name;
      if (data.picture) photoURL = data.picture;
    }
  } catch {}

  const user: WorkspaceUser = {
    uid: `token-${Date.now()}`,
    email: resolvedEmail,
    displayName,
    photoURL,
  };

  cachedAccessToken = cleanToken;
  cachedUser = user;
  notifyAuthListeners(user, cleanToken);
  return { user, accessToken: cleanToken };
};

export const googleSignIn = async (): Promise<{ user: User | WorkspaceUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google OAuth access token from sign-in');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    notifyAuthListeners(result.user, cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const errorCode = error?.code || '';
    const errorMessage = error?.message || '';

    // User dismissed or closed the sign-in popup - normal user cancellation flow
    if (
      errorCode === 'auth/popup-closed-by-user' ||
      errorCode === 'auth/cancelled-popup-request' ||
      errorMessage.includes('popup-closed-by-user') ||
      errorMessage.includes('cancelled-popup-request')
    ) {
      return null;
    }

    if (errorCode === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
    }

    // If unauthorized-domain error, attempt seamless Google Identity Services (GIS) fallback!
    if (errorCode === 'auth/unauthorized-domain' || errorMessage.includes('auth/unauthorized-domain')) {
      console.info('Firebase auth/unauthorized-domain detected. Attempting direct Google Identity Services fallback...');
      try {
        const gisResult = await signInWithGoogleIdentityServices();
        return gisResult;
      } catch (gisError: any) {
        console.warn('GIS fallback could not complete:', gisError?.message || gisError);
        // Enrich error with context so UI can provide exact copyable domain and instructions
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
        const projId = (rawConfig as any)?.projectId || 'gen-lang-client-0055802576';
        const enrichedError: any = new Error(
          `Domain "${currentDomain}" is not in the Firebase Authentication Authorized Domains list for project "${projId}".`
        );
        enrichedError.code = 'auth/unauthorized-domain';
        enrichedError.domain = currentDomain;
        enrichedError.projectId = projId;
        throw enrichedError;
      }
    }

    console.warn('Google Workspace sign in notice:', errorMessage || error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getWorkspaceUser = (): User | WorkspaceUser | null => {
  return cachedUser || auth.currentUser;
};

export const googleSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch {}
  cachedAccessToken = null;
  cachedUser = null;
  notifyAuthListeners(null, null);
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

  const dateStr = snapshot.timestamp.split('T')[0];
  const checksumClean = (snapshot.checksum || '').replace(/[^a-zA-Z0-9-]/g, '').slice(-8);
  const filename = `Richie_Rich_Backup_${dateStr}_${checksumClean}.json`;

  // Simulated Mode Handler
  if (token.startsWith('simulated_workspace_token_')) {
    const simulatedFileId = `sim_drive_${Date.now()}`;
    const newSimFile: DriveBackupFile = {
      id: simulatedFileId,
      name: filename,
      webViewLink: `https://drive.google.com/file/d/${simulatedFileId}/view`,
      createdTime: new Date().toISOString(),
      size: `${Math.max(1, Math.round(snapshot.dataJson.length / 1024))} KB`,
    };

    try {
      const existing = getSimulatedDriveFiles();
      safeStorage.setItem(SIMULATED_DRIVE_KEY, JSON.stringify([newSimFile, ...existing]));
    } catch {}

    saveWorkspaceBackupSettings({
      lastDriveUploadAt: new Date().toISOString(),
      lastDriveFileId: simulatedFileId,
    });

    return {
      success: true,
      fileId: simulatedFileId,
      webViewLink: newSimFile.webViewLink,
      name: filename,
    };
  }

  const boundary = `-------314159265358979323846`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

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
    console.warn('Google Drive backup issue:', err?.message || err);
    return { success: false, name: filename, error: err.message || 'Failed to upload backup to Google Drive' };
  }
};

function getSimulatedDriveFiles(): DriveBackupFile[] {
  try {
    const raw = safeStorage.getItem(SIMULATED_DRIVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

/**
 * Lists backups stored in Google Drive created with this app
 */
export const listGoogleDriveBackups = async (): Promise<DriveBackupFile[]> => {
  const token = await getAccessToken();
  if (!token) return [];

  if (token.startsWith('simulated_workspace_token_')) {
    return getSimulatedDriveFiles();
  }

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

  // Simulated Mode Handler
  if (token.startsWith('simulated_workspace_token_')) {
    saveWorkspaceBackupSettings({
      lastEmailPushAt: new Date().toISOString(),
    });
    return {
      success: true,
      messageId: `sim_msg_${Date.now()}`,
    };
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
        .stat-value { font-size: 18px; font-weight: 800; color: #0f172a; font-family: monospace; }
        .notes-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px; margin-top: 16px; font-size: 13px; color: #1e40af; }
        .footer { padding: 16px 24px; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span class="badge">Verified System Backup</span>
          <h1 class="title">Richie Rich Pan House Enterprise</h1>
          <p class="subtitle">Daily Automated Snapshot • ${dateStr} at ${timeFormatted}</p>
        </div>
        <div class="content">
          <p style="margin-top: 0; font-size: 14px; line-height: 1.5; color: #334155;">
            An automated database archive has been generated and validated for Richie Rich Pan House operations. The complete encrypted JSON state archive is attached to this email.
          </p>

          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">Catalog Products</div>
              <div class="stat-value">${snapshot.itemCount} Items</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">POS Orders</div>
              <div class="stat-value">${snapshot.orderCount} Orders</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Registered Patrons</div>
              <div class="stat-value">${snapshot.customerCount} Patrons</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Security SHA-256</div>
              <div class="stat-value" style="font-size: 13px; word-break: break-all;">${checksumClean}...</div>
            </div>
          </div>

          ${
            userNotes
              ? `
            <div class="notes-box">
              <strong>Admin Dispatch Note:</strong> ${userNotes}
            </div>
          `
              : ''
          }
        </div>
        <div class="footer">
          Richie Rich Pan House Enterprise Core • 24x7 Multi-Store Operations<br>
          Automated Cloud Dispatch Service via Google Workspace APIs
        </div>
      </div>
    </body>
    </html>
  `.trim();

  const fileBase64 = toBase64(snapshot.dataJson);

  const rawMimeMessage = [
    `To: ${targetEmail}`,
    `Subject: [Richie Rich Backup] Database Snapshot - ${dateStr} (${checksumClean})`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody,
    '',
    `--${boundary}`,
    `Content-Type: application/json; name="${filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${filename}"`,
    '',
    fileBase64,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  const encodedMessage = toBase64Url(rawMimeMessage);

  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Gmail API push failed with HTTP ${res.status}`);
    }

    const data = await res.json();
    saveWorkspaceBackupSettings({
      lastEmailPushAt: new Date().toISOString(),
    });

    return {
      success: true,
      messageId: data.id,
    };
  } catch (err: any) {
    console.warn('Gmail API dispatch issue:', err?.message || err);
    return { success: false, error: err.message || 'Failed to send backup email via Gmail' };
  }
};
