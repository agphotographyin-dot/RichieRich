// Google Workspace / Cloud Backup Service (Removed as requested)
// Safe no-op stubs maintained for backwards compatibility with any pending git merges

export const WORKSPACE_SCOPES: string[] = [];

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

export interface WorkspaceUser {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

export const initWorkspaceAuth = () => () => {};
export const googleSignIn = async () => null;
export const googleSignOut = async () => {};
export const getAccessToken = async () => null;
export const getWorkspaceUser = () => null;
export const getWorkspaceBackupSettings = (): WorkspaceBackupSettings => ({
  autoDriveUpload: false,
  autoEmailPush: false,
  recipientEmail: '',
  lastDriveUploadAt: null,
  lastEmailPushAt: null,
  lastDriveFileId: null,
});
export const saveWorkspaceBackupSettings = (s: Partial<WorkspaceBackupSettings>) => ({
  ...getWorkspaceBackupSettings(),
  ...s,
});
export const uploadBackupToGoogleDrive = async () => ({ success: false });
export const listGoogleDriveBackups = async (): Promise<DriveBackupFile[]> => [];
export const sendBackupEmailViaGmail = async () => ({ success: false });
export const executeDailyCloudBackup = async () => ({});
export const signInWithGoogleIdentityServices = async () => null;
export const connectSimulatedWorkspace = async () => null;
export const connectWithManualToken = async () => null;

export const googleWorkspaceBackupService = {
  WORKSPACE_SCOPES,
  initWorkspaceAuth,
  googleSignIn,
  googleSignOut,
  getAccessToken,
  getWorkspaceUser,
  getWorkspaceBackupSettings,
  saveWorkspaceBackupSettings,
  uploadBackupToGoogleDrive,
  listGoogleDriveBackups,
  sendBackupEmailViaGmail,
  executeDailyCloudBackup,
  signInWithGoogleIdentityServices,
  connectSimulatedWorkspace,
  connectWithManualToken,
};

export default googleWorkspaceBackupService;
