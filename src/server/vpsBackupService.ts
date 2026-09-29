import PocketBase from 'pocketbase';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, getDocs, Firestore } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

export interface CollectionBackupStats {
  collection: string;
  count: number;
  status: 'ok' | 'skipped' | 'error';
  error?: string;
}

export interface BackupStatus {
  status: 'idle' | 'running' | 'success' | 'error';
  lastRunAt: string | null;
  lastDurationMs: number;
  totalItemsBackedUp: number;
  collections: Record<string, number>;
  nextRunAt: string | null;
  intervalMinutes: number;
  targetUrl: string;
  error?: string;
}

const DEFAULT_POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://187.126.115.40:8090';

// Operational collections to back up from Firestore to VPS PocketBase
export const BACKUP_COLLECTIONS = [
  'inventory',
  'orders',
  'stores',
  'customers',
  'store_expenses',
  'purchase_orders',
  'inward_bills',
  'stock_transfers',
  'store_indents',
  'suppliers',
  'system_metadata',
];

export function sanitizePocketBaseUrl(url: string): string {
  if (!url) return '';
  let clean = url.trim().replace(/\/+$/, '');
  clean = clean.replace(/\/api\/health\/?$/, '');
  clean = clean.replace(/\/api\/?$/, '');
  clean = clean.replace(/\/_\/?$/, '');
  return clean;
}

export class VPSBackupService {
  private pb: PocketBase;
  private db: Firestore | null = null;
  private firebaseApp: FirebaseApp | null = null;
  private targetUrl: string;
  private intervalMinutes = 5;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private pbIdCache = new Map<string, string>(); // key: `${collection}:${recordId}` -> pb internal id

  private status: BackupStatus = {
    status: 'idle',
    lastRunAt: null,
    lastDurationMs: 0,
    totalItemsBackedUp: 0,
    collections: {},
    nextRunAt: null,
    intervalMinutes: 5,
    targetUrl: sanitizePocketBaseUrl(DEFAULT_POCKETBASE_URL),
  };

  constructor(targetUrl = DEFAULT_POCKETBASE_URL) {
    this.targetUrl = sanitizePocketBaseUrl(targetUrl);
    this.pb = new PocketBase(this.targetUrl);
    this.pb.autoCancellation(false);
    this.initFirebase();
  }

  private initFirebase() {
    try {
      const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(raw);
        if (config.apiKey && config.projectId) {
          const apps = getApps();
          this.firebaseApp = apps.length > 0 ? apps[0] : initializeApp(config);
          this.db = getFirestore(this.firebaseApp, config.firestoreDatabaseId || undefined);
          console.log(`[VPSBackup] Connected to Firestore (${config.projectId})`);
        }
      }
    } catch (err: any) {
      console.warn('[VPSBackup] Warning: Could not initialize server-side Firestore:', err.message);
    }
  }

  public getStatus(): BackupStatus {
    return { ...this.status };
  }

  public setTargetUrl(newUrl: string) {
    if (!newUrl || !newUrl.trim()) return;
    const cleanUrl = sanitizePocketBaseUrl(newUrl);
    this.targetUrl = cleanUrl;
    this.status.targetUrl = cleanUrl;
    this.pb = new PocketBase(cleanUrl);
    this.pb.autoCancellation(false);
    console.log(`[VPSBackup] Target VPS URL updated to: ${cleanUrl}`);
  }

  public async testConnection(candidateUrl?: string): Promise<{
    reachable: boolean;
    code?: number;
    latencyMs?: number;
    error?: string;
    url: string;
  }> {
    const urlToTest = candidateUrl ? sanitizePocketBaseUrl(candidateUrl) : this.targetUrl;
    const startTime = Date.now();
    try {
      const testPb = new PocketBase(urlToTest);
      testPb.autoCancellation(false);
      const health = await testPb.health.check().catch((e: any) => {
        throw new Error(e?.message || 'Health check rejected');
      });
      const latencyMs = Date.now() - startTime;
      if (health && health.code === 200) {
        return { reachable: true, code: 200, latencyMs, url: urlToTest };
      }
      return { reachable: false, code: health?.code, latencyMs, error: 'Unexpected response code', url: urlToTest };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        reachable: false,
        latencyMs,
        error: err?.message || 'Connection refused or timed out',
        url: urlToTest,
      };
    }
  }

  /**
   * Backs up a complete payload sent from client (ideal when Firestore daily quota is rate-limited)
   */
  public async pushAllLocalPayload(payload: Record<string, any[]>): Promise<{
    success: boolean;
    totalSynced: number;
    collections: Record<string, number>;
    durationMs: number;
    error?: string;
  }> {
    const startTime = Date.now();
    let totalSynced = 0;
    const collectionsSummary: Record<string, number> = {};

    try {
      // 1. Verify VPS is online
      const test = await this.testConnection();
      if (!test.reachable) {
        throw new Error(`VPS PocketBase is unreachable at ${this.targetUrl} (${test.error})`);
      }

      for (const [colName, items] of Object.entries(payload)) {
        if (Array.isArray(items) && items.length > 0) {
          const res = await this.pushBatch(colName, items);
          collectionsSummary[colName] = res.synced;
          totalSynced += res.synced;
        } else {
          collectionsSummary[colName] = 0;
        }
      }

      const durationMs = Date.now() - startTime;
      await this.saveBackupManifest(totalSynced, collectionsSummary);

      this.status.status = 'success';
      this.status.lastRunAt = new Date().toISOString();
      this.status.lastDurationMs = durationMs;
      this.status.totalItemsBackedUp = totalSynced;
      this.status.collections = collectionsSummary;

      return {
        success: true,
        totalSynced,
        collections: collectionsSummary,
        durationMs,
      };
    } catch (err: any) {
      console.error('[VPSBackup] pushAllLocalPayload error:', err.message);
      return {
        success: false,
        totalSynced,
        collections: collectionsSummary,
        durationMs: Date.now() - startTime,
        error: err.message,
      };
    }
  }

  public setIntervalMinutes(minutes: number) {
    const validMinutes = Math.max(1, Math.min(1440, minutes));
    this.intervalMinutes = validMinutes;
    this.status.intervalMinutes = validMinutes;
    console.log(`[VPSBackup] Interval changed to every ${validMinutes} minute(s)`);
    this.scheduleNextRun();
  }

  public startScheduler(intervalMinutes = 5) {
    this.setIntervalMinutes(intervalMinutes);

    // Initial delayed run after 8 seconds so server boots cleanly
    setTimeout(() => {
      console.log('[VPSBackup] Executing initial automatic startup backup to VPS PocketBase...');
      this.runBackupCycle().catch((err) => {
        console.warn('[VPSBackup] Initial backup warning:', err.message);
      });
    }, 8000);
  }

  public stopScheduler() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNextRun() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    const delayMs = this.intervalMinutes * 60 * 1000;
    const nextDate = new Date(Date.now() + delayMs);
    this.status.nextRunAt = nextDate.toISOString();

    this.timer = setTimeout(async () => {
      try {
        console.log(`[VPSBackup] Scheduled automatic interval triggered (${this.intervalMinutes}m interval)...`);
        await this.runBackupCycle();
      } catch (err: any) {
        console.error('[VPSBackup] Interval backup error:', err.message);
      } finally {
        this.scheduleNextRun();
      }
    }, delayMs);
  }

  /**
   * Performs a complete backup cycle:
   * 1. Reads current state of each collection from Firestore (Primary Database).
   * 2. Pushes records to VPS PocketBase.
   * 3. Updates backup metadata on PocketBase and in memory.
   */
  public async runBackupCycle(): Promise<BackupStatus> {
    if (this.isRunning) {
      console.log('[VPSBackup] Backup already in progress, skipping overlapping run.');
      return this.getStatus();
    }

    this.isRunning = true;
    const startTime = Date.now();
    this.status.status = 'running';
    this.status.error = undefined;

    let grandTotalSynced = 0;
    const collectionSummary: Record<string, number> = {};

    try {
      // 1. Verify PocketBase VPS is reachable
      const health = await this.pb.health.check().catch(() => null);
      if (!health || health.code !== 200) {
        throw new Error(`PocketBase VPS at ${this.targetUrl} is unreachable (Health check failed).`);
      }

      // 2. Iterate through collections
      for (const colName of BACKUP_COLLECTIONS) {
        try {
          const syncedCount = await this.backupCollection(colName);
          collectionSummary[colName] = syncedCount;
          grandTotalSynced += syncedCount;
        } catch (colErr: any) {
          console.warn(`[VPSBackup] Warning backing up collection "${colName}":`, colErr.message);
          collectionSummary[colName] = 0;
        }
      }

      // 3. Write backup timestamp manifest to PocketBase system_metadata
      await this.saveBackupManifest(grandTotalSynced, collectionSummary);

      const durationMs = Date.now() - startTime;
      this.status.status = 'success';
      this.status.lastRunAt = new Date().toISOString();
      this.status.lastDurationMs = durationMs;
      this.status.totalItemsBackedUp = grandTotalSynced;
      this.status.collections = collectionSummary;

      console.log(
        `[VPSBackup] ✅ Backup cycle completed in ${(durationMs / 1000).toFixed(1)}s. Total records synced: ${grandTotalSynced}`
      );
    } catch (err: any) {
      console.error('[VPSBackup] Backup cycle failed:', err.message);
      this.status.status = 'error';
      this.status.error = err.message;
    } finally {
      this.isRunning = false;
    }

    return this.getStatus();
  }

  /**
   * Backs up a single collection from Firestore to PocketBase
   */
  private async backupCollection(colName: string): Promise<number> {
    if (!this.db) {
      return 0;
    }

    // 1. Fetch documents from Firestore
    const colRef = collection(this.db, colName);
    const snapshot = await getDocs(colRef).catch(() => null);

    if (!snapshot || snapshot.empty) {
      return 0;
    }

    const docs = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        ...data,
        id: data.id || docSnap.id,
      };
    });

    // 2. Pre-fetch existing PocketBase records in this collection to build the ID lookup cache
    await this.populatePbIdCache(colName);

    // 3. Push to PocketBase in sequential chunks of 15 to avoid SQLite locking
    let synced = 0;
    const chunkSize = 15;

    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (item) => {
          if (!item || !item.id) return;
          const cleanId = String(item.id).trim().replace(/\//g, '_');
          const cacheKey = `${colName}:${cleanId}`;
          const existingPbId = this.pbIdCache.get(cacheKey);

          const payload = {
            recordId: cleanId,
            data: item,
            updatedAt: new Date().toISOString(),
          };

          try {
            if (existingPbId) {
              await this.pb.collection(colName).update(existingPbId, payload, { requestKey: null });
            } else {
              const created = await this.pb.collection(colName).create(payload, { requestKey: null });
              this.pbIdCache.set(cacheKey, created.id);
            }
            synced++;
          } catch (itemErr: any) {
            // If update failed (e.g. record not found), attempt create
            try {
              const created = await this.pb.collection(colName).create(payload, { requestKey: null });
              this.pbIdCache.set(cacheKey, created.id);
              synced++;
            } catch {
              // PocketBase schema might require specific field structure or table doesn't exist
            }
          }
        })
      );
    }

    return synced;
  }

  /**
   * Pre-fetches PocketBase collection records to populate `recordId -> pbId` cache
   */
  private async populatePbIdCache(colName: string) {
    try {
      const list = await this.pb.collection(colName).getFullList({
        fields: 'id,recordId',
        requestKey: null,
      }).catch(() => []);

      for (const rec of list) {
        if (rec.recordId) {
          this.pbIdCache.set(`${colName}:${rec.recordId}`, rec.id);
        }
      }
    } catch {
      // Table may not exist yet on PocketBase
    }
  }

  /**
   * Writes backup execution record to PocketBase
   */
  private async saveBackupManifest(totalRecords: number, collections: Record<string, number>) {
    try {
      const manifest = {
        recordId: 'vps_latest_backup_manifest',
        data: {
          backedUpAt: new Date().toISOString(),
          totalRecords,
          collections,
          source: 'Google Cloud Firestore',
          type: 'automatic_interval_backup',
        },
        updatedAt: new Date().toISOString(),
      };

      const existingId = this.pbIdCache.get('system_metadata:vps_latest_backup_manifest');
      if (existingId) {
        await this.pb.collection('system_metadata').update(existingId, manifest).catch(() => {});
      } else {
        const created = await this.pb.collection('system_metadata').create(manifest).catch(() => null);
        if (created) {
          this.pbIdCache.set('system_metadata:vps_latest_backup_manifest', created.id);
        }
      }
    } catch {
      // Manifest writing failure is non-fatal
    }
  }

  /**
   * Push custom batch payload from client to PocketBase through backend
   */
  public async pushBatch(colName: string, items: any[]): Promise<{ success: boolean; synced: number }> {
    if (!items || items.length === 0) return { success: true, synced: 0 };
    await this.populatePbIdCache(colName);

    let synced = 0;
    const chunkSize = 15;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (item) => {
          if (!item || !item.id) return;
          const cleanId = String(item.id).trim().replace(/\//g, '_');
          const cacheKey = `${colName}:${cleanId}`;
          const existingPbId = this.pbIdCache.get(cacheKey);

          const payload = {
            recordId: cleanId,
            data: item,
            updatedAt: new Date().toISOString(),
          };

          try {
            if (existingPbId) {
              await this.pb.collection(colName).update(existingPbId, payload, { requestKey: null });
            } else {
              const created = await this.pb.collection(colName).create(payload, { requestKey: null });
              this.pbIdCache.set(cacheKey, created.id);
            }
            synced++;
          } catch {
            try {
              const created = await this.pb.collection(colName).create(payload, { requestKey: null });
              this.pbIdCache.set(cacheKey, created.id);
              synced++;
            } catch {}
          }
        })
      );
    }

    return { success: true, synced };
  }
}

export const vpsBackupService = new VPSBackupService();
